import { validateContractDocument, type ContractDocument } from "../contract/markdown.js";
import { ContractError } from "../contract/errors.js";
import { ConnectorFailure, type ConnectorResult, type JiraProjectionIntent, type ReadBackState } from "../connectors/types.js";
import type { CanonicalEvent } from "../domain/model.js";
import { validateCanonicalEvent } from "../events/envelope.js";
import { OutboxStore, type SyncResult } from "../events/outbox.js";
import { evaluateTransition } from "../lifecycle/transitions.js";
import type { ProjectProfile } from "../lifecycle/profile.js";
import { assertAllowlistedOperation, AllowlistValidationError, type CapabilityProof } from "./allowlist.js";
import { assertSafeEvidenceRefs, EvidenceValidationError, safeEvidenceRefs } from "./evidence.js";
import type { ResolvedTarget } from "./identity.js";

export interface JiraProjectionGateway {
  readonly targetTenantUrl: string;
  applyProjection(intent: JiraProjectionIntent): Promise<ConnectorResult>;
  readBack(canonicalId: string): Promise<ReadBackState>;
}

export interface SyncOrchestratorOptions {
  contract: ContractDocument;
  projectProfile: ProjectProfile;
  target: ResolvedTarget;
  allowlistRegistry: unknown[];
  outbox: OutboxStore;
  jira: JiraProjectionGateway;
  actorScope: string;
  capability: CapabilityProof;
}

export class SyncOrchestrator {
  public constructor(private readonly options: SyncOrchestratorOptions) {}

  public async handle(event: CanonicalEvent, mode: "dry_run" | "sandbox"): Promise<SyncResult> {
    let validatedEvent: CanonicalEvent | null = null;
    try {
      validatedEvent = validateEvent(event);
      assertSafeEvidenceRefs(validatedEvent.evidenceRefs);
      if (this.options.jira.targetTenantUrl !== this.options.target.tenantUrl) {
        return stopped(validatedEvent, "CONNECTOR_TENANT_MISMATCH");
      }
      if (validatedEvent.source.targetIdentity !== resolvedTargetIdentity(this.options.target)) {
        return stopped(validatedEvent, "TARGET_IDENTITY_MISMATCH");
      }
      validateContractDocument(this.options.contract, `contract:${this.options.contract.contractId}`);
      const transition = evaluateTransition({
        projectProfile: this.options.projectProfile,
        expectedBoardIdentity: {
          jiraProjectKey: this.options.target.jiraProject.key,
          jiraBoardId: this.options.projectProfile.jiraBoardId,
        },
        fromStatus: validatedEvent.beforeState,
        toStatus: validatedEvent.afterState,
        attentionState: "none",
        evidenceRefs: validatedEvent.evidenceRefs,
      });
      if (!transition.passed) return stopped(validatedEvent, "TRANSITION_INVALID");

      const decision = evaluateAllowlist(validatedEvent, this.options);
      if (!decision.allowed) return stopped(validatedEvent, "ALLOWLIST_DENIED");
    } catch (error) {
      if (error instanceof EvidenceValidationError) return stopped(validatedEvent ?? event, "EVIDENCE_UNSAFE");
      if (error instanceof EventValidationError || error instanceof ContractError || error instanceof AllowlistValidationError) return stoppedFromUnknown(event, "VALIDATION_FAILED");
      throw error;
    }

    if (validatedEvent === null) throw new Error("Validated event is missing after successful validation.");
    const intent = projectionIntent(validatedEvent);
    if (mode === "dry_run") {
      await this.options.outbox.append(validatedEvent);
      return {
        state: "planned",
        correlationId: validatedEvent.correlationId,
        evidenceRefs: [...validatedEvent.evidenceRefs, `planned:${validatedEvent.source.requestedOperation}:${intent.canonicalId}`, `target:${this.options.target.jiraProject.key}`],
        errorCode: null,
      };
    }

    const claim = await this.options.outbox.withDurableClaim(validatedEvent, async () => this.applySandbox(validatedEvent, intent));
    if (claim.state === "executed") return claim.value;
    if (claim.state === "recorded") return claim.result;
    if (!claim.eventRecorded) return unknownResult(validatedEvent, "ACTIVE_CLAIM_INITIALIZING");
    return this.recoverPendingClaim(validatedEvent, intent);
  }

  private async applySandbox(validatedEvent: CanonicalEvent, intent: JiraProjectionIntent): Promise<SyncResult> {
    try {
      const result = await this.options.jira.applyProjection(intent);
      if (result.state !== "applied") {
        const unknown = unknownResult(validatedEvent, "READ_BACK_UNVERIFIED");
        await this.options.outbox.markApplied(validatedEvent.idempotencyKey, unknown);
        return unknown;
      }
      const readBack = await this.options.jira.readBack(intent.canonicalId);
      if (!matchesReadBack(readBack, intent, result.externalId, this.options.target)) {
        const mismatch = stopped(validatedEvent, "READ_BACK_MISMATCH");
        await this.options.outbox.markApplied(validatedEvent.idempotencyKey, mismatch);
        return mismatch;
      }
      const applied: SyncResult = {
        state: "applied",
        correlationId: validatedEvent.correlationId,
        evidenceRefs: [...validatedEvent.evidenceRefs, `read-back:jira:${result.externalId}`],
        errorCode: null,
      };
      await this.options.outbox.markApplied(validatedEvent.idempotencyKey, applied);
      return applied;
    } catch (error) {
      if (!(error instanceof ConnectorFailure)) throw error;
      const result = error.code === "TIMEOUT"
        ? unknownResult(validatedEvent, error.code)
        : stopped(validatedEvent, error.code);
      await this.options.outbox.markApplied(validatedEvent.idempotencyKey, result);
      return result;
    }
  }

  private async recoverPendingClaim(event: CanonicalEvent, intent: JiraProjectionIntent): Promise<SyncResult> {
    try {
      const readBack = await this.options.jira.readBack(intent.canonicalId);
      if (matchesPendingReadBack(readBack, intent, this.options.target)) {
        const applied: SyncResult = {
          state: "applied",
          correlationId: event.correlationId,
          evidenceRefs: [...event.evidenceRefs, `read-back:jira:${readBack.externalId}`],
          errorCode: null,
        };
        await this.options.outbox.markApplied(event.idempotencyKey, applied);
        return applied;
      }
      const unknown = unknownResult(event, "ACTIVE_CLAIM_READ_BACK_UNVERIFIED");
      await this.options.outbox.markApplied(event.idempotencyKey, unknown);
      return unknown;
    } catch (error) {
      if (!(error instanceof ConnectorFailure)) throw error;
      const result = error.code === "TIMEOUT"
        ? unknownResult(event, "ACTIVE_CLAIM_READ_BACK_TIMEOUT")
        : stopped(event, error.code);
      await this.options.outbox.markApplied(event.idempotencyKey, result);
      return result;
    }
  }
}

export function resolvedTargetIdentity(target: ResolvedTarget): string {
  return JSON.stringify({
    version: 1,
    tenantUrl: target.tenantUrl,
    jiraTenantId: target.jiraTenantId,
    jiraProject: { key: target.jiraProject.key, id: target.jiraProject.id },
    confluenceSpace: { key: target.confluenceSpace.key, id: target.confluenceSpace.id },
    githubRepository: { owner: target.githubRepository.owner, name: target.githubRepository.name, id: target.githubRepository.id },
    environment: target.environment,
    allowlistPolicyId: target.allowlistPolicyId,
    mutationsAllowed: target.policyMutation.mutationsAllowed,
  });
}

function matchesReadBack(readBack: ReadBackState, intent: JiraProjectionIntent, externalId: string, target: ResolvedTarget): boolean {
  return readBack.target === resolvedTargetIdentity(target) &&
    readBack.canonicalId === intent.canonicalId &&
    readBack.externalId === externalId &&
    readBack.status === intent.requestedTransition?.to &&
    sameFields(readBack.fields, intent.fields) &&
    sameTransition(readBack.requestedTransition, intent.requestedTransition);
}

function matchesPendingReadBack(readBack: ReadBackState, intent: JiraProjectionIntent, target: ResolvedTarget): boolean {
  return readBack.target === resolvedTargetIdentity(target) &&
    readBack.canonicalId === intent.canonicalId &&
    readBack.status === intent.requestedTransition?.to &&
    sameFields(readBack.fields, intent.fields) &&
    sameTransition(readBack.requestedTransition, intent.requestedTransition);
}

function sameFields(first: Record<string, string | string[]>, second: Record<string, string | string[]>): boolean { return JSON.stringify(first) === JSON.stringify(second); }
function sameTransition(first: { from: string; to: string } | null, second: { from: string; to: string } | null): boolean { return first?.from === second?.from && first?.to === second?.to; }

function projectionIntent(event: CanonicalEvent): JiraProjectionIntent {
  return {
    canonicalId: event.source.canonicalId,
    workItemType: "Story",
    parentCanonicalId: null,
    fields: { status: event.afterState },
    attachmentPaths: [],
    requestedTransition: { from: event.beforeState, to: event.afterState },
  };
}

function stopped(event: CanonicalEvent | unknown, errorCode: string): SyncResult {
  if (!isCanonicalEvent(event)) return stoppedFromUnknown(event, errorCode);
  return { state: "stopped", correlationId: event.correlationId, evidenceRefs: [...safeEvidenceRefs(event.evidenceRefs), `audit:${errorCode.toLowerCase()}`], errorCode };
}

function unknownResult(event: CanonicalEvent, errorCode: string): SyncResult {
  return { state: "unknown", correlationId: event.correlationId, evidenceRefs: [...event.evidenceRefs, `audit:${errorCode.toLowerCase()}`], errorCode };
}

function stoppedFromUnknown(event: unknown, errorCode: string): SyncResult {
  const candidate = event !== null && typeof event === "object" && !Array.isArray(event) ? event as Record<string, unknown> : {};
  const correlationId = typeof candidate.correlationId === "string" && candidate.correlationId.trim() !== "" ? candidate.correlationId : "invalid-event";
  return { state: "stopped", correlationId, evidenceRefs: ["audit:validation_failed"], errorCode };
}

function isCanonicalEvent(value: unknown): value is CanonicalEvent { return value !== null && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).correlationId === "string" && Array.isArray((value as Record<string, unknown>).evidenceRefs); }

class EventValidationError extends Error { public constructor() { super("Canonical event validation failed."); } }

function validateEvent(event: CanonicalEvent): CanonicalEvent {
  try { return validateCanonicalEvent(event); } catch (error) {
    if (error instanceof Error) throw new EventValidationError();
    throw error;
  }
}

function evaluateAllowlist(event: CanonicalEvent, options: SyncOrchestratorOptions) {
  return assertAllowlistedOperation({
    operation: event.source.requestedOperation,
    target: options.target,
    fields: ["status"],
    transition: { from: event.beforeState, to: event.afterState },
    actorScope: options.actorScope,
    capability: options.capability,
    policyRegistry: options.allowlistRegistry,
  });
}

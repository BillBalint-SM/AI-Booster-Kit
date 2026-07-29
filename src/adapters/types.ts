import type { ContractDocument, NativeAdapterProjection } from "../contract/markdown.js";
import type { CanonicalEvent } from "../events/envelope.js";
import { createCanonicalEvent } from "../events/envelope.js";
import type { AgentHost, CapabilityState } from "../contract/markdown.js";
import { runImplementationStartCheck, type StartCheckInput } from "../lifecycle/start-check.js";

export interface ImplementationStartContext {
  startCheck: StartCheckInput;
  executionSetId: string;
}

export interface HostEventInput {
  host: AgentHost;
  eventType: string;
  artifactId: string;
  executionSetId: string;
  sourceRevision: string;
  actor: string;
  evidenceRefs: string[];
  milestoneId?: string;
  implementationStart?: ImplementationStartContext;
}

export interface HostCapabilityReport {
  host: AgentHost;
  versionContext: string;
  capabilities: Record<"localEventEmission" | "externalWrite" | "nativeProjection", CapabilityState>;
  limitations: string[];
  sourceContractRevision: string;
  nativeProjectionLocation: string;
}

export interface HostAdapter {
  compile(contract: ContractDocument): NativeAdapterProjection;
  emitEvent(input: HostEventInput): CanonicalEvent;
  capabilityReport(): HostCapabilityReport;
}

export class AdapterSafetyError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "AdapterSafetyError";
    this.code = code;
  }
}

export interface AdapterDefinition {
  host: AgentHost;
  versionContext: string;
  localEventEmission: CapabilityState;
  limitations: string[];
  nativeProjectionLocation: string;
}

const approvedImplementationStartEvidence = new Set([
  "milestone-finalization-record",
  "accepted-scope-record",
  "implementation-start-check-passed",
  "implementation-started",
]);

export function createLocalHostAdapter(
  definition: AdapterDefinition,
  compile: (contract: ContractDocument, host: AgentHost) => NativeAdapterProjection,
): HostAdapter {
  return {
    compile: (contract) => compile(contract, definition.host),
    emitEvent: (input) => emitLocalEvent(definition.host, input),
    capabilityReport: () => ({
      host: definition.host,
      versionContext: definition.versionContext,
      capabilities: {
        localEventEmission: definition.localEventEmission,
        externalWrite: "unsupported",
        nativeProjection: "supported_with_limits",
      },
      limitations: definition.limitations,
      sourceContractRevision: "bootstrap",
      nativeProjectionLocation: definition.nativeProjectionLocation,
    }),
  };
}

function emitLocalEvent(host: AgentHost, input: HostEventInput): CanonicalEvent {
  if (input.host !== host) {
    throw new AdapterSafetyError("HOST_MISMATCH", `Adapter '${host}' cannot emit an event for host '${input.host}'.`);
  }
  if (input.eventType === "implementation_started") {
    assertImplementationStartContext(input);
  }

  const states = eventStates(input.eventType);
  return createCanonicalEvent({
    executionSetId: input.executionSetId,
    artifactId: input.artifactId,
    correlationId: `${input.executionSetId}:${input.artifactId}:${input.eventType}`,
    source: {
      authority: host,
      canonicalId: input.artifactId,
      targetIdentity: "local:canonical-contract",
      requestedOperation: input.eventType,
    },
    actor: input.actor,
    eventType: input.eventType,
    sourceRevision: input.sourceRevision,
    beforeState: states.beforeState,
    afterState: states.afterState,
    evidenceRefs: input.evidenceRefs,
  });
}

function assertImplementationStartContext(input: HostEventInput): void {
  const context = input.implementationStart;
  if (!isImplementationStartContext(context)) {
    throw new AdapterSafetyError(
      "IMPLEMENTATION_START_CONTEXT_INVALID",
      "implementation_started requires a complete StartCheckInput and explicit Execution Set context.",
    );
  }
  if (context.executionSetId !== input.executionSetId || input.milestoneId !== context.startCheck.milestoneId) {
    throw new AdapterSafetyError(
      "IMPLEMENTATION_START_CONTEXT_MISMATCH",
      "implementation_started requires matching HostEventInput Milestone and Execution Set identifiers.",
    );
  }
  const result = runImplementationStartCheck(context.startCheck);
  if (!result.passed || context.startCheck.finalization.state !== "finalized" || context.startCheck.finalization.acceptanceDecision !== "accepted") {
    throw new AdapterSafetyError(
      "IMPLEMENTATION_START_CHECK_FAILED",
      "implementation_started requires a passing accepted and finalized implementation start check.",
    );
  }
  if (
    !hasOnlyApprovedImplementationStartEvidence(input.evidenceRefs) ||
    !hasOnlyApprovedImplementationStartEvidence(context.startCheck.finalization.evidenceRefs) ||
    !hasOnlyApprovedImplementationStartEvidence(context.startCheck.acceptedScope.evidenceRefs) ||
    [...approvedImplementationStartEvidence].some((reference) => !input.evidenceRefs.includes(reference))
  ) {
    throw new AdapterSafetyError(
      "IMPLEMENTATION_START_EVIDENCE_REQUIRED",
      "implementation_started requires matching verified start-check, finalization, and accepted-scope evidence.",
    );
  }
}

function isImplementationStartContext(value: unknown): value is ImplementationStartContext {
  if (!isRecord(value, ["startCheck", "executionSetId"]) || !isNonEmptyString(value.executionSetId)) return false;
  return isStartCheckInput(value.startCheck);
}

function isStartCheckInput(value: unknown): value is StartCheckInput {
  if (!isRecord(value, ["milestoneId", "epicId", "workItemIds", "acceptanceCriteria", "dependencyIds", "repository", "branchName", "worktreePath", "baseRevision", "actor", "roadmapRevision", "finalization", "acceptedScope", "hierarchy"])) return false;
  if (!["milestoneId", "epicId", "repository", "branchName", "worktreePath", "baseRevision", "actor", "roadmapRevision"].every((key) => isNonEmptyString(value[key]))) return false;
  if (!["workItemIds", "acceptanceCriteria", "dependencyIds"].every((key) => isStringArray(value[key]))) return false;
  if (!isRecord(value.finalization, ["state", "acceptanceDecision", "evidenceRefs"]) || !isStringArray(value.finalization.evidenceRefs)) return false;
  if (!isRecord(value.acceptedScope, ["workItemIds", "acceptanceCriteria", "evidenceRefs"]) || !isStringArray(value.acceptedScope.workItemIds) || !isStringArray(value.acceptedScope.acceptanceCriteria) || !isStringArray(value.acceptedScope.evidenceRefs)) return false;
  if (!isRecord(value.hierarchy, ["epicParentMilestoneId", "workItemParentEpicIds"]) || !isNonEmptyString(value.hierarchy.epicParentMilestoneId) || !isStringRecord(value.hierarchy.workItemParentEpicIds)) return false;
  return true;
}

function isRecord(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.values(value).every(isNonEmptyString);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function hasOnlyApprovedImplementationStartEvidence(evidenceRefs: string[]): boolean {
  return evidenceRefs.every((reference) => approvedImplementationStartEvidence.has(reference));
}

function eventStates(eventType: string): { beforeState: string; afterState: string } {
  if (eventType === "implementation_started") return { beforeState: "To Do", afterState: "In Progress" };
  if (eventType === "review_failed") return { beforeState: "Review", afterState: "To Do" };
  if (eventType === "milestone_finalized" || eventType === "child_scope_created") return { beforeState: "To Do", afterState: "To Do" };
  return { beforeState: "In Progress", afterState: "In Progress" };
}

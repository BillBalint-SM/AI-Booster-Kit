import { executionDigest } from "./identity.js";
import { createExecutionEvent } from "./ledger.js";
import { assertSafeExecutionContent } from "./validation.js";
import { ExecutionContractError } from "./types.js";
import type { ExecutionClaim, ExecutionEvent, ExecutionFinalState, FinalExecutionHandoff, LoadedExecutionRun } from "./types.js";

const handoffCode = "EXECUTION_FINAL_HANDOFF_INVALID";
const acceptanceCode = "EXECUTION_ACCEPTANCE_INCOMPLETE";
const hashPattern = /^[a-f0-9]{64}$/;
const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/;
const handoffKeys = ["handoffVersion", "runId", "envelopeHash", "graphHash", "state", "summary", "claims", "evidenceRefs", "unknowns", "limits", "metrics", "nextAction"] as const;

export function validateFinalExecutionHandoff(value: unknown, run: LoadedExecutionRun): FinalExecutionHandoff {
  const record = plainRecord(value, handoffCode, "final execution handoff must be a plain object");
  exactKeys(record, handoffKeys, handoffCode, "final execution handoff fields are invalid");
  const handoff = {
    handoffVersion: literal(record.handoffVersion, ["2.0"], handoffCode, "final execution handoff version is invalid"),
    runId: identifier(record.runId, handoffCode, "final execution handoff run identifier is invalid"),
    envelopeHash: hash(record.envelopeHash, handoffCode, "final execution handoff envelope identity is invalid"),
    graphHash: hash(record.graphHash, handoffCode, "final execution handoff graph identity is invalid"),
    state: literal(record.state, ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"], handoffCode, "final execution handoff state is invalid"),
    summary: nonEmptyString(record.summary, handoffCode, "final execution handoff summary is invalid"),
    claims: claims(record.claims),
    evidenceRefs: identifiers(record.evidenceRefs, handoffCode, "final execution handoff evidence references are invalid"),
    unknowns: strings(record.unknowns, handoffCode, "final execution handoff unknowns are invalid"),
    limits: strings(record.limits, handoffCode, "final execution handoff limits are invalid"),
    metrics: metrics(record.metrics),
    nextAction: nonEmptyString(record.nextAction, handoffCode, "final execution handoff next action is invalid"),
  };
  assertSafeExecutionContent(handoff);
  if (handoff.runId !== run.envelope.runId || handoff.envelopeHash !== run.envelope.envelopeHash || handoff.graphHash !== run.graph.graphHash) {
    throw new ExecutionContractError(handoffCode, "final execution handoff does not match the loaded run");
  }
  if (!run.envelope.allowedFinalStates.includes(handoff.state)) throw new ExecutionContractError(handoffCode, "final execution handoff state is not allowed");
  validateAcceptance(handoff, run);
  return handoff;
}

export function renderFinalExecutionHandoffMarkdown(handoff: FinalExecutionHandoff): string {
  const claims = [...handoff.claims].sort((left, right) => left.claimId.localeCompare(right.claimId));
  const evidenceRefs = [...handoff.evidenceRefs].sort();
  const unknowns = [...handoff.unknowns].sort();
  const limits = [...handoff.limits].sort();
  const lines = [
    "# Execution Final Handoff",
    "",
    `- Run: ${handoff.runId}`,
    `- State: ${handoff.state}`,
    `- Envelope: ${handoff.envelopeHash}`,
    `- Graph: ${handoff.graphHash}`,
    "",
    "## Summary",
    "",
    handoff.summary,
    "",
    "## Claims",
    "",
    ...claims.map((claim) => `- ${claim.claimId} | ${claim.criterionId} | ${claim.state} | evidence: ${[...claim.evidenceRefs].sort().join(", ") || "none"}`),
    "",
    "## Evidence",
    "",
    ...evidenceRefs.map((reference) => `- ${reference}`),
    "",
    "## Unknowns",
    "",
    ...(unknowns.length === 0 ? ["- none"] : unknowns.map((unknown) => `- ${unknown}`)),
    "",
    "## Limits",
    "",
    ...(limits.length === 0 ? ["- none"] : limits.map((limit) => `- ${limit}`)),
    "",
    "## Metrics",
    "",
    `- elapsedMs: ${handoff.metrics.elapsedMs.state === "MEASURED" ? handoff.metrics.elapsedMs.value : "UNKNOWN"}`,
    `- tokenUsage: ${handoff.metrics.tokenUsage.state === "MEASURED" ? handoff.metrics.tokenUsage.value : "UNKNOWN"}`,
    "",
    "## Next Action",
    "",
    handoff.nextAction,
    "",
  ];
  return lines.join("\n");
}

export function finalizeExecutionRun(
  run: LoadedExecutionRun,
  handoff: FinalExecutionHandoff,
  recordedAt: string,
): { state: ExecutionFinalState; handoffHash: string; event: ExecutionEvent } {
  const accepted = validateFinalExecutionHandoff(handoff, run);
  const eventType = accepted.state === "STOPPED" ? "RUN_STOPPED" : accepted.state === "UNKNOWN" ? "RUN_UNKNOWN" : "RUN_FINALIZED";
  const event = createExecutionEvent(
    {
      runId: run.envelope.runId,
      eventType,
      nodeId: null,
      beforeState: run.checkpoint.runState,
      afterState: accepted.state,
      graphRevision: run.graph.graphRevision,
      evidenceRefs: accepted.evidenceRefs,
      taskId: null,
      threadRef: null,
      reasonCode: null,
    },
    run.events.length + 1,
    run.checkpoint.lastEventHash,
    recordedAt,
  );
  return { state: accepted.state, handoffHash: executionDigest(accepted), event };
}

function validateAcceptance(handoff: FinalExecutionHandoff, run: LoadedExecutionRun): void {
  const knownEvidence = new Set(run.evidenceRefs.map((evidence) => evidence.evidenceId));
  if (handoff.evidenceRefs.some((reference) => !knownEvidence.has(reference))) {
    throw new ExecutionContractError(acceptanceCode, "final execution handoff cites unaccepted evidence");
  }
  const criterionIds = new Set(run.envelope.acceptanceCriteria.map((criterion) => criterion.criterionId));
  if (handoff.claims.some((claim) => !criterionIds.has(claim.criterionId) || claim.state !== "SUPPORTED" || claim.evidenceRefs.length === 0 || claim.evidenceRefs.some((reference) => !knownEvidence.has(reference) || !handoff.evidenceRefs.includes(reference)))) {
    throw new ExecutionContractError(acceptanceCode, "final execution handoff claim is not supported by accepted evidence");
  }
  for (const criterionId of criterionIds) {
    if (handoff.claims.filter((claim) => claim.criterionId === criterionId).length !== 1) {
      throw new ExecutionContractError(acceptanceCode, "final execution handoff does not cover every acceptance criterion exactly once");
    }
  }
  if (["COMPLETE", "COMPLETE_WITH_LIMIT"].includes(handoff.state) && run.graph.nodes.some((node) => node.required && node.state !== "SUCCEEDED")) {
    throw new ExecutionContractError(acceptanceCode, "final execution handoff completes before required nodes succeed");
  }
  if (handoff.state === "COMPLETE" && (handoff.unknowns.length > 0 || handoff.limits.length > 0)) {
    throw new ExecutionContractError(acceptanceCode, "complete execution handoff cannot contain unknowns or limits");
  }
  if (handoff.state === "COMPLETE_WITH_LIMIT" && handoff.limits.length === 0) {
    throw new ExecutionContractError(acceptanceCode, "limited completion requires a declared limit");
  }
}

function claims(value: unknown): readonly ExecutionClaim[] {
  if (!Array.isArray(value)) throw new ExecutionContractError(handoffCode, "final execution handoff claims must be a list");
  const claimIds = new Set<string>();
  return value.map((entry) => {
    const record = plainRecord(entry, handoffCode, "final execution handoff claim is invalid");
    exactKeys(record, ["claimId", "criterionId", "statement", "state", "evidenceRefs"], handoffCode, "final execution handoff claim fields are invalid");
    const claim = {
      claimId: identifier(record.claimId, handoffCode, "final execution handoff claim identifier is invalid"),
      criterionId: identifier(record.criterionId, handoffCode, "final execution handoff criterion identifier is invalid"),
      statement: nonEmptyString(record.statement, handoffCode, "final execution handoff claim statement is invalid"),
      state: literal(record.state, ["SUPPORTED", "CONFLICTED", "UNKNOWN"], handoffCode, "final execution handoff claim state is invalid"),
      evidenceRefs: identifiers(record.evidenceRefs, handoffCode, "final execution handoff claim evidence references are invalid"),
    };
    if (claimIds.has(claim.claimId)) throw new ExecutionContractError(handoffCode, "final execution handoff claim identifiers must be unique");
    claimIds.add(claim.claimId);
    return claim;
  });
}

function metrics(value: unknown): FinalExecutionHandoff["metrics"] {
  const record = plainRecord(value, handoffCode, "final execution handoff metrics are invalid");
  exactKeys(record, ["elapsedMs", "tokenUsage"], handoffCode, "final execution handoff metrics fields are invalid");
  return { elapsedMs: metric(record.elapsedMs), tokenUsage: metric(record.tokenUsage) };
}

function metric(value: unknown): { state: "MEASURED" | "UNKNOWN"; value: number | null } {
  const record = plainRecord(value, handoffCode, "final execution metric is invalid");
  exactKeys(record, ["state", "value"], handoffCode, "final execution metric fields are invalid");
  const state = literal(record.state, ["MEASURED", "UNKNOWN"], handoffCode, "final execution metric state is invalid");
  if (state === "UNKNOWN" && record.value !== null) throw new ExecutionContractError(handoffCode, "unknown execution metric must be null");
  if (state === "MEASURED" && (typeof record.value !== "number" || !Number.isFinite(record.value) || record.value < 0)) {
    throw new ExecutionContractError(handoffCode, "measured execution metric is invalid");
  }
  return { state, value: record.value as number | null };
}

function plainRecord(value: unknown, code: string, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ExecutionContractError(code, message);
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], code: string, message: string): void {
  const keys = Reflect.ownKeys(record);
  if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) throw new ExecutionContractError(code, message);
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) throw new ExecutionContractError(code, message);
  }
}

function literal<T extends string>(value: unknown, values: readonly T[], code: string, message: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new ExecutionContractError(code, message);
  return value as T;
}

function identifier(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !identifierPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function hash(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !hashPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function identifiers(value: unknown, code: string, message: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !identifierPattern.test(entry)) || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

function strings(value: unknown, code: string, message: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

function nonEmptyString(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ExecutionContractError(code, message);
  return value;
}

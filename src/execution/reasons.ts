import { ExecutionContractError } from "./types.js";
import type { ExecutionNodeState, ExecutionRunState } from "./types.js";

export const executionReasonCodes = [
  "COMMAND_ARGUMENTS_INVALID",
  "INPUT_JSON_INVALID",
  "COMMAND_INPUT_TOO_LARGE",
  "ENVELOPE_INVALID",
  "GRAPH_INVALID",
  "TARGET_ALREADY_EXISTS",
  "SOURCE_REVISION_MISMATCH",
  "WORKTREE_DIRTY_IN_SCOPE",
  "WORKSPACE_IDENTITY_MISMATCH",
  "SOURCE_UNREADABLE",
  "HOST_PROFILE_UNSUPPORTED",
  "HOST_CAPABILITY_UNSUPPORTED",
  "HOST_CAPABILITY_UNKNOWN",
  "HOST_INSTRUCTION_STATE_UNKNOWN",
  "AUTHORITY_NOT_PROVEN",
  "AUTHORITY_STATE_UNKNOWN",
  "HOST_SESSION_IDENTITY_MISMATCH",
  "HOST_SESSION_IDENTITY_UNKNOWN",
  "SPAWN_REJECTED",
  "SPAWN_FAILED_CONFIRMED",
  "SPAWN_OUTCOME_UNKNOWN",
  "AGENT_ID_MISSING",
  "AGENT_ID_MISMATCH",
  "WRONG_AGENT_ROUTE",
  "UNAUTHORIZED_DELEGATION",
  "DISPATCH_BUDGET_EXHAUSTED",
  "PARALLELISM_EXHAUSTED",
  "DISPATCH_IDENTITY_CONFLICT",
  "DISPATCH_OUTCOME_UNKNOWN",
  "DUPLICATE_DISPATCH",
  "LATE_RESULT",
  "DUPLICATE_RESULT",
  "RESULT_TOO_LARGE",
  "ARTIFACT_TOO_LARGE",
  "STORAGE_QUOTA_EXCEEDED",
  "RESULT_JSON_INVALID",
  "RESULT_FIELDS_INVALID",
  "RESULT_FOREIGN",
  "RESULT_STALE",
  "RESULT_STATUS_STOPPED",
  "RESULT_STATUS_UNKNOWN",
  "RESULT_IDENTITY_UNRESOLVED",
  "RESULT_CONFLICT",
  "EVIDENCE_MISSING",
  "EVIDENCE_HASH_MISMATCH",
  "EVIDENCE_PATH_MISSING",
  "EVIDENCE_LINE_INVALID",
  "EVIDENCE_SCOPE_VIOLATION",
  "CLAIM_UNSUPPORTED",
  "CONTENT_FORBIDDEN",
  "WALL_CLOCK_EXPIRED",
  "WAIT_TIMEOUT_CONFIRMED_ACTIVE",
  "WAIT_TIMEOUT_THREAD_UNKNOWN",
  "REPAIR_BUDGET_EXHAUSTED",
  "NODE_BUDGET_EXHAUSTED",
  "REPAIR_SCOPE_VIOLATION",
  "USER_CANCEL_REQUESTED",
  "USER_CANCELLED_BEFORE_DISPATCH",
  "INTERRUPT_CONFIRMED",
  "INTERRUPT_FAILED",
  "INTERRUPT_OUTCOME_UNKNOWN",
  "LATE_RESULT_AFTER_CANCEL",
  "WRITER_CONFLICT",
  "STALE_FENCING_TOKEN",
  "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED",
  "PARTIAL_MUTATION",
  "LEDGER_CORRUPT",
  "SNAPSHOT_DIVERGED",
  "MANIFEST_DIVERGED",
  "PENDING_REPLACEMENT",
  "STORAGE_UNAVAILABLE",
  "PROJECTION_REBUILD_REQUIRED",
  "PENDING_EFFECT_RECONCILIATION_REQUIRED",
  "STORAGE_CORRUPT",
  "BACKUP_INVALID",
  "MIGRATION_FAILED",
  "LEGACY_IMPORT_INVALID",
  "PARTIAL_FINALIZATION",
  "TERMINAL_RUN",
  "ACTIVE_THREAD_MISSING",
  "RUNTIME_EVIDENCE_STALE",
  "RECOVERY_IDENTITY_MISMATCH",
  "NO_RESUMABLE_WORK",
  "CROSS_SESSION_THREAD_UNPROVEN",
  "FINALIZATION_PRECONDITION_FAILED",
  "FINALIZATION_ALREADY_EXISTS",
  "RUNS_NOT_COMPARABLE",
  "TERMINAL_LEDGER_MISSING",
  "PATH_ESCAPE",
  "SYMLINK_BOUNDARY",
  "SENSITIVE_CONTENT",
  "AUTHORITY_EXCEEDED",
  "PERMISSION_DENIED",
  "UNTRUSTED_INSTRUCTION",
  "UNSUPPORTED_SCHEMA_VERSION",
  "UNSUPPORTED_RUNTIME_VERSION",
  "OPERATOR_PROTOCOL_VIOLATION",
  "CLOCK_INVALID",
  "UNCLASSIFIED_PREPARATION_OUTCOME",
  "UNCLASSIFIED_DISPATCH_OUTCOME",
  "UNCLASSIFIED_RESULT_OUTCOME",
  "UNCLASSIFIED_FINALIZATION_OUTCOME",
] as const;

export type ExecutionReasonCode = typeof executionReasonCodes[number];
export type ExecutionPhase =
  | "PREPARATION"
  | "SOURCE"
  | "HOST"
  | "DISPATCH"
  | "RESULT"
  | "EVIDENCE"
  | "DEADLINE"
  | "CANCELLATION"
  | "PERSISTENCE"
  | "RESUME"
  | "FINALIZATION"
  | "SECURITY"
  | "OPERATOR";
export type ExecutionReasonSubject = "COMMAND" | "RUN" | "NODE" | "HOST" | "STORAGE";
export type ExecutionDeterminacy = "KNOWN_ABSENT" | "KNOWN_PRESENT" | "AMBIGUOUS";
export type ExecutionDisposition = "REJECT_INPUT" | "STOP_KNOWN" | "MARK_UNKNOWN" | "REJECT_NODE" | "IDEMPOTENT_NOOP" | "WAIT_NOOP" | "ACCEPT_LIMIT";
export type ExecutionRetryPolicy = "NEVER" | "CORRECT_AND_RESUBMIT" | "WAIT_FOR_OBSERVATION" | "RECONCILE_ONLY" | "RETURN_PRIOR_RECEIPT";
export type ExecutionOperatorAction = "NONE" | "CORRECT_INPUT" | "SELECT_NEW_RUN" | "WAIT_FOR_OBSERVATION" | "RECONCILE" | "PROVIDE_AUTHORITY" | "INSPECT_STORAGE";

export interface ExecutionReasonDefinition {
  code: ExecutionReasonCode;
  phase: ExecutionPhase;
  subject: ExecutionReasonSubject;
  determinacy: ExecutionDeterminacy;
  disposition: ExecutionDisposition;
  retryPolicy: ExecutionRetryPolicy;
  requiredEvidenceFields: readonly string[];
  forbiddenEvidenceFields: readonly string[];
  allowedNodeStates: readonly (ExecutionNodeState | null)[];
  allowedRunStates: readonly (ExecutionRunState | null)[];
  requiredNodeResult: ExecutionNodeState | null;
  optionalNodeResult: ExecutionNodeState | null;
  requiredRunResult: ExecutionRunState | null;
  optionalRunResult: ExecutionRunState | null;
  operatorAction: ExecutionOperatorAction;
  finalizationAllowed: boolean;
  comparisonAllowed: boolean;
}

const allNodeStates: readonly (ExecutionNodeState | null)[] = [null, "PENDING", "READY", "DISPATCHING", "RUNNING", "RESULT_RECEIVED", "SUCCEEDED", "REJECTED", "STOPPED", "UNKNOWN"];
const allRunStates: readonly (ExecutionRunState | null)[] = [null, "PREPARED", "READY", "RUNNING", "WAITING_FOR_HUMAN", "COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"];
const activeNodeStates: readonly (ExecutionNodeState | null)[] = [null, "PENDING", "READY", "DISPATCHING", "RUNNING", "RESULT_RECEIVED"];
const activeRunStates: readonly (ExecutionRunState | null)[] = [null, "PREPARED", "READY", "RUNNING", "WAITING_FOR_HUMAN"];
const forbiddenEvidenceFields = ["prompt", "transcript", "reasoning", "credential", "token", "cookie", "authorization", "personalPath"] as const;

export function parseExecutionReasonCode(value: unknown): ExecutionReasonCode {
  if (typeof value !== "string" || !Object.hasOwn(executionReasonRegistry, value)) {
    throw new ExecutionContractError("EXECUTION_REASON_CODE_INVALID", "execution reason code is not registered");
  }
  return value as ExecutionReasonCode;
}

export function executionReason(code: ExecutionReasonCode): ExecutionReasonDefinition {
  return executionReasonRegistry[code];
}

function defineExecutionReasonRegistry(): Readonly<Record<ExecutionReasonCode, ExecutionReasonDefinition>> {
  const entries = executionReasonCodes.map((code) => [code, definitionFor(code)] as const);
  const registry = Object.fromEntries(entries) as Record<ExecutionReasonCode, ExecutionReasonDefinition>;
  if (Object.keys(registry).length !== executionReasonCodes.length) {
    throw new Error("execution reason registry contains duplicate codes");
  }
  for (const code of executionReasonCodes) {
    if (registry[code].code !== code) throw new Error("execution reason registry key does not match its definition");
  }
  return Object.freeze(registry);
}

function definitionFor(code: ExecutionReasonCode): ExecutionReasonDefinition {
  if (preparationCodes.has(code)) return definition(code, "PREPARATION", "COMMAND", "KNOWN_ABSENT", "REJECT_INPUT", "CORRECT_AND_RESUBMIT", "CORRECT_INPUT", []);
  if (sourceCodes.has(code)) {
    const unknown = code === "SOURCE_UNREADABLE";
    return definition(code, "SOURCE", "HOST", unknown ? "AMBIGUOUS" : "KNOWN_PRESENT", unknown ? "MARK_UNKNOWN" : "STOP_KNOWN", unknown ? "RECONCILE_ONLY" : "NEVER", unknown ? "RECONCILE" : "SELECT_NEW_RUN", ["workspaceIdentity", "expectedSourceRevision", "observedSourceRevision"]);
  }
  if (hostCodes.has(code)) {
    const known = code === "HOST_PROFILE_UNSUPPORTED"
      || code === "HOST_CAPABILITY_UNSUPPORTED"
      || code === "AUTHORITY_NOT_PROVEN"
      || code === "HOST_SESSION_IDENTITY_MISMATCH";
    const selectNewRun = code === "HOST_CAPABILITY_UNSUPPORTED" || code === "HOST_SESSION_IDENTITY_MISMATCH";
    return definition(code, "HOST", "HOST", known ? "KNOWN_PRESENT" : "AMBIGUOUS", known ? "STOP_KNOWN" : "MARK_UNKNOWN", known ? "NEVER" : "RECONCILE_ONLY", selectNewRun ? "SELECT_NEW_RUN" : known ? "PROVIDE_AUTHORITY" : "RECONCILE", ["hostProfileId", "observedAt"]);
  }
  if (spawnCodes.has(code)) {
    const knownAbsent = code === "SPAWN_REJECTED" || code === "SPAWN_FAILED_CONFIRMED";
    return definition(code, "DISPATCH", "HOST", knownAbsent ? "KNOWN_ABSENT" : "AMBIGUOUS", knownAbsent ? "STOP_KNOWN" : "MARK_UNKNOWN", knownAbsent ? "NEVER" : "RECONCILE_ONLY", knownAbsent ? "SELECT_NEW_RUN" : "RECONCILE", ["dispatchCorrelationId", "spawnOutcome"]);
  }
  if (dispatchCodes.has(code)) return dispatchDefinition(code);
  if (code === "ARTIFACT_TOO_LARGE") {
    return definition(
      code,
      "PERSISTENCE",
      "COMMAND",
      "KNOWN_ABSENT",
      "REJECT_INPUT",
      "CORRECT_AND_RESUBMIT",
      "CORRECT_INPUT",
      ["runId", "artifactId", "observedBytes", "limitBytes"],
    );
  }
  if (code === "STORAGE_QUOTA_EXCEEDED") {
    return definition(
      code,
      "PERSISTENCE",
      "RUN",
      "KNOWN_PRESENT",
      "REJECT_INPUT",
      "NEVER",
      "INSPECT_STORAGE",
      ["runId", "observedBytes", "limitBytes"],
    );
  }
  if (resultCodes.has(code)) return resultDefinition(code);
  if (evidenceCodes.has(code)) return definition(code, "EVIDENCE", "NODE", "KNOWN_PRESENT", "REJECT_NODE", "CORRECT_AND_RESUBMIT", "CORRECT_INPUT", ["evidenceId"]);
  if (deadlineCodes.has(code)) {
    const active = code === "WAIT_TIMEOUT_CONFIRMED_ACTIVE";
    const unknown = code === "WAIT_TIMEOUT_THREAD_UNKNOWN";
    return definition(code, "DEADLINE", active ? "HOST" : "RUN", unknown ? "AMBIGUOUS" : "KNOWN_PRESENT", active ? "WAIT_NOOP" : unknown ? "MARK_UNKNOWN" : "STOP_KNOWN", active ? "WAIT_FOR_OBSERVATION" : unknown ? "RECONCILE_ONLY" : "NEVER", active ? "WAIT_FOR_OBSERVATION" : unknown ? "RECONCILE" : "SELECT_NEW_RUN", ["observedAt"]);
  }
  if (cancellationCodes.has(code)) {
    const confirmed = code === "USER_CANCELLED_BEFORE_DISPATCH" || code === "INTERRUPT_CONFIRMED";
    return definition(code, "CANCELLATION", code === "USER_CANCEL_REQUESTED" ? "COMMAND" : "HOST", confirmed ? "KNOWN_ABSENT" : "AMBIGUOUS", confirmed ? "STOP_KNOWN" : "MARK_UNKNOWN", confirmed ? "NEVER" : "RECONCILE_ONLY", confirmed ? "NONE" : "RECONCILE", ["dispatchCorrelationId", "observedAt"]);
  }
  if (code === "STALE_FENCING_TOKEN") {
    return definition(
      code,
      "PERSISTENCE",
      "RUN",
      "KNOWN_PRESENT",
      "REJECT_INPUT",
      "NEVER",
      "RECONCILE",
      ["runId", "controllerId", "expectedFencingToken", "observedFencingToken"],
    );
  }
  if (code === "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED") {
    return definition(
      code,
      "PERSISTENCE",
      "RUN",
      "KNOWN_PRESENT",
      "REJECT_INPUT",
      "RECONCILE_ONLY",
      "RECONCILE",
      ["runId", "controllerId", "fencingToken", "runtimeReceiptId"],
    );
  }
  if (code === "PROJECTION_REBUILD_REQUIRED") {
    return definition(code, "PERSISTENCE", "STORAGE", "KNOWN_PRESENT", "REJECT_INPUT", "RECONCILE_ONLY", "RECONCILE", ["auditId", "runId", "ledgerHead"]);
  }
  if (code === "PENDING_EFFECT_RECONCILIATION_REQUIRED") {
    return definition(code, "PERSISTENCE", "RUN", "AMBIGUOUS", "MARK_UNKNOWN", "RECONCILE_ONLY", "RECONCILE", ["auditId", "runId", "operationId"]);
  }
  if (code === "STORAGE_CORRUPT") {
    return definition(code, "PERSISTENCE", "STORAGE", "KNOWN_PRESENT", "MARK_UNKNOWN", "NEVER", "INSPECT_STORAGE", ["auditId", "databaseSha256"]);
  }
  if (code === "BACKUP_INVALID") {
    return definition(code, "PERSISTENCE", "STORAGE", "KNOWN_PRESENT", "REJECT_INPUT", "NEVER", "INSPECT_STORAGE", ["backupId", "databaseSha256"]);
  }
  if (code === "MIGRATION_FAILED") {
    return definition(code, "PERSISTENCE", "STORAGE", "KNOWN_PRESENT", "REJECT_INPUT", "NEVER", "INSPECT_STORAGE", ["migrationId", "fromVersion", "toVersion"]);
  }
  if (code === "LEGACY_IMPORT_INVALID") {
    return definition(code, "PERSISTENCE", "STORAGE", "KNOWN_PRESENT", "REJECT_INPUT", "NEVER", "INSPECT_STORAGE", ["sourceIdentitySha256", "sourceRunId"]);
  }
  if (persistenceCodes.has(code)) return definition(code, "PERSISTENCE", "STORAGE", "AMBIGUOUS", "MARK_UNKNOWN", "RECONCILE_ONLY", "INSPECT_STORAGE", ["runId", "lastCommittedSequence"]);
  if (resumeCodes.has(code)) return resumeDefinition(code);
  if (finalizationCodes.has(code)) {
    const ambiguous = code === "TERMINAL_LEDGER_MISSING";
    return definition(code, "FINALIZATION", "RUN", ambiguous ? "AMBIGUOUS" : "KNOWN_PRESENT", ambiguous ? "MARK_UNKNOWN" : "REJECT_INPUT", ambiguous ? "RECONCILE_ONLY" : "NEVER", ambiguous ? "RECONCILE" : "CORRECT_INPUT", ["runId"]);
  }
  if (securityCodes.has(code)) return definition(code, "SECURITY", code === "PERMISSION_DENIED" ? "HOST" : "COMMAND", "KNOWN_PRESENT", "REJECT_INPUT", "NEVER", code === "AUTHORITY_EXCEEDED" || code === "PERMISSION_DENIED" ? "PROVIDE_AUTHORITY" : "CORRECT_INPUT", []);
  if (operatorCodes.has(code)) {
    const unknown = code === "CLOCK_INVALID";
    return definition(code, "OPERATOR", "COMMAND", unknown ? "AMBIGUOUS" : "KNOWN_PRESENT", unknown ? "MARK_UNKNOWN" : "REJECT_INPUT", unknown ? "RECONCILE_ONLY" : "CORRECT_AND_RESUBMIT", unknown ? "RECONCILE" : "CORRECT_INPUT", []);
  }
  return unclassifiedDefinition(code);
}

function dispatchDefinition(code: ExecutionReasonCode): ExecutionReasonDefinition {
  const duplicate = code === "DUPLICATE_DISPATCH" || code === "DUPLICATE_RESULT" || code === "LATE_RESULT";
  const unknown = code === "DISPATCH_IDENTITY_CONFLICT" || code === "DISPATCH_OUTCOME_UNKNOWN";
  return definition(code, "DISPATCH", code === "PARALLELISM_EXHAUSTED" ? "RUN" : "NODE", unknown ? "AMBIGUOUS" : "KNOWN_PRESENT", duplicate ? "IDEMPOTENT_NOOP" : unknown ? "MARK_UNKNOWN" : "STOP_KNOWN", duplicate ? "RETURN_PRIOR_RECEIPT" : unknown ? "RECONCILE_ONLY" : "NEVER", unknown ? "RECONCILE" : "NONE", ["dispatchCorrelationId"]);
}

function resultDefinition(code: ExecutionReasonCode): ExecutionReasonDefinition {
  if (code === "RESULT_STATUS_STOPPED") return definition(code, "RESULT", "NODE", "KNOWN_PRESENT", "STOP_KNOWN", "NEVER", "NONE", ["taskId", "nodeId"]);
  if (code === "RESULT_STATUS_UNKNOWN" || code === "RESULT_IDENTITY_UNRESOLVED" || code === "RESULT_CONFLICT") return definition(code, "RESULT", "NODE", "AMBIGUOUS", "MARK_UNKNOWN", "RECONCILE_ONLY", "RECONCILE", ["taskId", "nodeId"]);
  return definition(code, "RESULT", "NODE", "KNOWN_PRESENT", "REJECT_NODE", "CORRECT_AND_RESUBMIT", "CORRECT_INPUT", ["taskId", "nodeId"]);
}

function resumeDefinition(code: ExecutionReasonCode): ExecutionReasonDefinition {
  if (code === "TERMINAL_RUN") return definition(code, "RESUME", "RUN", "KNOWN_PRESENT", "REJECT_INPUT", "NEVER", "NONE", ["runId"]);
  if (code === "NO_RESUMABLE_WORK") return definition(code, "RESUME", "RUN", "KNOWN_ABSENT", "STOP_KNOWN", "NEVER", "SELECT_NEW_RUN", ["runId"]);
  return definition(code, "RESUME", "HOST", "AMBIGUOUS", "MARK_UNKNOWN", "RECONCILE_ONLY", "RECONCILE", ["runId", "observedAt"]);
}

function unclassifiedDefinition(code: ExecutionReasonCode): ExecutionReasonDefinition {
  const phase: ExecutionPhase = code === "UNCLASSIFIED_DISPATCH_OUTCOME" ? "DISPATCH" : code === "UNCLASSIFIED_RESULT_OUTCOME" ? "RESULT" : code === "UNCLASSIFIED_FINALIZATION_OUTCOME" ? "FINALIZATION" : "PREPARATION";
  return definition(code, phase, phase === "PREPARATION" ? "COMMAND" : "RUN", "AMBIGUOUS", "MARK_UNKNOWN", "RECONCILE_ONLY", "RECONCILE", []);
}

function definition(
  code: ExecutionReasonCode,
  phase: ExecutionPhase,
  subject: ExecutionReasonSubject,
  determinacy: ExecutionDeterminacy,
  disposition: ExecutionDisposition,
  retryPolicy: ExecutionRetryPolicy,
  operatorAction: ExecutionOperatorAction,
  requiredEvidenceFields: readonly string[],
): ExecutionReasonDefinition {
  const results = dispositionResults(disposition);
  return {
    code,
    phase,
    subject,
    determinacy,
    disposition,
    retryPolicy,
    requiredEvidenceFields,
    forbiddenEvidenceFields,
    allowedNodeStates: disposition === "REJECT_INPUT" ? allNodeStates : activeNodeStates,
    allowedRunStates: disposition === "REJECT_INPUT" ? allRunStates : activeRunStates,
    ...results,
    operatorAction,
    finalizationAllowed: disposition === "ACCEPT_LIMIT",
    comparisonAllowed: false,
  };
}

function dispositionResults(disposition: ExecutionDisposition): Pick<ExecutionReasonDefinition, "requiredNodeResult" | "optionalNodeResult" | "requiredRunResult" | "optionalRunResult"> {
  if (disposition === "STOP_KNOWN") return { requiredNodeResult: "STOPPED", optionalNodeResult: "STOPPED", requiredRunResult: "STOPPED", optionalRunResult: null };
  if (disposition === "MARK_UNKNOWN") return { requiredNodeResult: "UNKNOWN", optionalNodeResult: "UNKNOWN", requiredRunResult: "UNKNOWN", optionalRunResult: "UNKNOWN" };
  if (disposition === "REJECT_NODE") return { requiredNodeResult: "REJECTED", optionalNodeResult: "REJECTED", requiredRunResult: "STOPPED", optionalRunResult: null };
  if (disposition === "ACCEPT_LIMIT") return { requiredNodeResult: null, optionalNodeResult: null, requiredRunResult: "COMPLETE_WITH_LIMIT", optionalRunResult: "COMPLETE_WITH_LIMIT" };
  return { requiredNodeResult: null, optionalNodeResult: null, requiredRunResult: null, optionalRunResult: null };
}

const preparationCodes = new Set<ExecutionReasonCode>(["COMMAND_ARGUMENTS_INVALID", "INPUT_JSON_INVALID", "COMMAND_INPUT_TOO_LARGE", "ENVELOPE_INVALID", "GRAPH_INVALID", "TARGET_ALREADY_EXISTS"]);
const sourceCodes = new Set<ExecutionReasonCode>(["SOURCE_REVISION_MISMATCH", "WORKTREE_DIRTY_IN_SCOPE", "WORKSPACE_IDENTITY_MISMATCH", "SOURCE_UNREADABLE"]);
const hostCodes = new Set<ExecutionReasonCode>(["HOST_PROFILE_UNSUPPORTED", "HOST_CAPABILITY_UNSUPPORTED", "HOST_CAPABILITY_UNKNOWN", "HOST_INSTRUCTION_STATE_UNKNOWN", "AUTHORITY_NOT_PROVEN", "AUTHORITY_STATE_UNKNOWN", "HOST_SESSION_IDENTITY_MISMATCH", "HOST_SESSION_IDENTITY_UNKNOWN"]);
const spawnCodes = new Set<ExecutionReasonCode>(["SPAWN_REJECTED", "SPAWN_FAILED_CONFIRMED", "SPAWN_OUTCOME_UNKNOWN", "AGENT_ID_MISSING", "AGENT_ID_MISMATCH", "WRONG_AGENT_ROUTE", "UNAUTHORIZED_DELEGATION"]);
const dispatchCodes = new Set<ExecutionReasonCode>(["DISPATCH_BUDGET_EXHAUSTED", "PARALLELISM_EXHAUSTED", "DISPATCH_IDENTITY_CONFLICT", "DISPATCH_OUTCOME_UNKNOWN", "DUPLICATE_DISPATCH", "LATE_RESULT", "DUPLICATE_RESULT"]);
const resultCodes = new Set<ExecutionReasonCode>(["RESULT_TOO_LARGE", "RESULT_JSON_INVALID", "RESULT_FIELDS_INVALID", "RESULT_FOREIGN", "RESULT_STALE", "RESULT_STATUS_STOPPED", "RESULT_STATUS_UNKNOWN", "RESULT_IDENTITY_UNRESOLVED", "RESULT_CONFLICT"]);
const evidenceCodes = new Set<ExecutionReasonCode>(["EVIDENCE_MISSING", "EVIDENCE_HASH_MISMATCH", "EVIDENCE_PATH_MISSING", "EVIDENCE_LINE_INVALID", "EVIDENCE_SCOPE_VIOLATION", "CLAIM_UNSUPPORTED", "CONTENT_FORBIDDEN"]);
const deadlineCodes = new Set<ExecutionReasonCode>(["WALL_CLOCK_EXPIRED", "WAIT_TIMEOUT_CONFIRMED_ACTIVE", "WAIT_TIMEOUT_THREAD_UNKNOWN", "REPAIR_BUDGET_EXHAUSTED", "NODE_BUDGET_EXHAUSTED", "REPAIR_SCOPE_VIOLATION"]);
const cancellationCodes = new Set<ExecutionReasonCode>(["USER_CANCEL_REQUESTED", "USER_CANCELLED_BEFORE_DISPATCH", "INTERRUPT_CONFIRMED", "INTERRUPT_FAILED", "INTERRUPT_OUTCOME_UNKNOWN", "LATE_RESULT_AFTER_CANCEL"]);
const persistenceCodes = new Set<ExecutionReasonCode>(["WRITER_CONFLICT", "PARTIAL_MUTATION", "LEDGER_CORRUPT", "SNAPSHOT_DIVERGED", "MANIFEST_DIVERGED", "PENDING_REPLACEMENT", "STORAGE_UNAVAILABLE", "PARTIAL_FINALIZATION"]);
const resumeCodes = new Set<ExecutionReasonCode>(["TERMINAL_RUN", "ACTIVE_THREAD_MISSING", "RUNTIME_EVIDENCE_STALE", "RECOVERY_IDENTITY_MISMATCH", "NO_RESUMABLE_WORK", "CROSS_SESSION_THREAD_UNPROVEN"]);
const finalizationCodes = new Set<ExecutionReasonCode>(["FINALIZATION_PRECONDITION_FAILED", "FINALIZATION_ALREADY_EXISTS", "RUNS_NOT_COMPARABLE", "TERMINAL_LEDGER_MISSING"]);
const securityCodes = new Set<ExecutionReasonCode>(["PATH_ESCAPE", "SYMLINK_BOUNDARY", "SENSITIVE_CONTENT", "AUTHORITY_EXCEEDED", "PERMISSION_DENIED", "UNTRUSTED_INSTRUCTION"]);
const operatorCodes = new Set<ExecutionReasonCode>(["UNSUPPORTED_SCHEMA_VERSION", "UNSUPPORTED_RUNTIME_VERSION", "OPERATOR_PROTOCOL_VIOLATION", "CLOCK_INVALID"]);

export const executionReasonRegistry: Readonly<Record<ExecutionReasonCode, ExecutionReasonDefinition>> = defineExecutionReasonRegistry();

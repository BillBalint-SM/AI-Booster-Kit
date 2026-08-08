import { executionReasonRegistry } from "./reasons.js";
import type { ExecutionReasonCode } from "./reasons.js";
import type { ExecutionRunState } from "./types.js";

export interface RejectedExecutionCommand {
  operation: "REJECTED";
  mutation: "NONE";
  error: { code: ExecutionReasonCode };
}

export function rejectedExecutionCommand(code: ExecutionReasonCode): RejectedExecutionCommand {
  return { operation: "REJECTED", mutation: "NONE", error: { code } };
}

export function operationalReasonForContractError(code: string): ExecutionReasonCode {
  if (Object.hasOwn(executionReasonRegistry, code)) return code as ExecutionReasonCode;
  const exact: Readonly<Record<string, ExecutionReasonCode>> = {
    EXECUTION_COMMAND_CONFIGURATION_INVALID: "COMMAND_ARGUMENTS_INVALID",
    EXECUTION_INPUT_JSON_INVALID: "INPUT_JSON_INVALID",
    EXECUTION_RUN_TARGET_CONFLICT: "TARGET_ALREADY_EXISTS",
    EXECUTION_RESULT_FIELDS_INVALID: "RESULT_FIELDS_INVALID",
    EXECUTION_RESULT_TOO_LARGE: "RESULT_TOO_LARGE",
    EXECUTION_RESULT_FOREIGN: "RESULT_FOREIGN",
    EXECUTION_RESULT_STALE: "RESULT_STALE",
    EXECUTION_RESULT_EVIDENCE_INVALID: "EVIDENCE_MISSING",
    EXECUTION_RESULT_SCOPE_VIOLATION: "EVIDENCE_SCOPE_VIOLATION",
    EXECUTION_RESULT_CONTENT_FORBIDDEN: "CONTENT_FORBIDDEN",
    EXECUTION_RUNS_NOT_COMPARABLE: "RUNS_NOT_COMPARABLE",
  };
  const mapped = exact[code];
  if (mapped !== undefined) return mapped;
  if (code.startsWith("EXECUTION_ENVELOPE_") || code === "EXECUTION_PREPARE_INPUT_INVALID") return "ENVELOPE_INVALID";
  if (code.startsWith("EXECUTION_GRAPH_") || code === "EXECUTION_NODE_TRANSITION_INVALID") return "GRAPH_INVALID";
  if (code.startsWith("EXECUTION_STORAGE_") || code === "EXECUTION_PERSONAL_ROOT_INVALID") return "STORAGE_UNAVAILABLE";
  if (code === "EXECUTION_LEDGER_INVALID" || code === "EXECUTION_CHECKPOINT_INVALID") return "LEDGER_CORRUPT";
  if (code === "EXECUTION_ACCEPTANCE_INCOMPLETE" || code === "EXECUTION_FINAL_HANDOFF_INVALID") return "FINALIZATION_PRECONDITION_FAILED";
  return "UNCLASSIFIED_PREPARATION_OUTCOME";
}

export function acceptedExecutionCommand(
  state: ExecutionRunState,
  details: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return { ...details, operation: "ACCEPTED", state };
}

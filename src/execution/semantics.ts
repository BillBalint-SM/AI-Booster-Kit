import { executionReason } from "./reasons.js";
import { ExecutionContractError } from "./types.js";
import type { ExecutionReasonCode } from "./reasons.js";
import type { ExecutionNodeState, ExecutionRunState } from "./types.js";

export const executionNodeStates = ["PENDING", "READY", "DISPATCHING", "RUNNING", "RESULT_RECEIVED", "SUCCEEDED", "REJECTED", "STOPPED", "UNKNOWN"] as const satisfies readonly ExecutionNodeState[];
export const executionRunStates = ["PREPARED", "READY", "RUNNING", "WAITING_FOR_HUMAN", "COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"] as const satisfies readonly ExecutionRunState[];

export interface ExecutionTransitionInput {
  reasonCode: ExecutionReasonCode;
  nodeRequired: boolean | null;
  nodeState: ExecutionNodeState | null;
  runState: ExecutionRunState | null;
}

export interface ExecutionTransitionDecision {
  outcome: "REJECTED_INPUT" | "STOPPED" | "UNKNOWN" | "REJECTED" | "UNCHANGED" | "COMPLETE_WITH_LIMIT";
  nextNodeState: ExecutionNodeState | null;
  nextRunState: ExecutionRunState | null;
  mutation: "NONE" | "NODE" | "RUN" | "NODE_AND_RUN";
  reconciliationRequired: boolean;
}

const nodeTransitions: Readonly<Record<ExecutionNodeState, readonly ExecutionNodeState[]>> = {
  PENDING: ["READY"],
  READY: ["DISPATCHING"],
  DISPATCHING: ["RUNNING", "STOPPED", "UNKNOWN"],
  RUNNING: ["RESULT_RECEIVED", "REJECTED", "STOPPED", "UNKNOWN"],
  RESULT_RECEIVED: ["SUCCEEDED", "REJECTED", "STOPPED", "UNKNOWN"],
  SUCCEEDED: [],
  REJECTED: [],
  STOPPED: [],
  UNKNOWN: [],
};

const terminalRunStates = new Set<ExecutionRunState>(["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"]);

export function decideExecutionTransition(input: ExecutionTransitionInput): ExecutionTransitionDecision {
  if (input.runState !== null) assertExecutionRunMutable(input.runState);
  const reason = executionReason(input.reasonCode);
  if (!reason.allowedNodeStates.includes(input.nodeState) || !reason.allowedRunStates.includes(input.runState)) {
    throw protocolViolation("execution reason is invalid for the current node or run state");
  }

  const nodeResult = input.nodeRequired === false ? reason.optionalNodeResult : reason.requiredNodeResult;
  const runResult = input.nodeRequired === false ? reason.optionalRunResult : reason.requiredRunResult;
  if ((nodeResult !== null || runResult !== null) && input.nodeRequired === null) {
    throw protocolViolation("execution reason requires a classified node");
  }

  const nextNodeState = nodeResult ?? input.nodeState;
  const nextRunState = runResult ?? input.runState;
  if (input.nodeState !== null && nodeResult !== null) assertExecutionNodeTransition(input.nodeState, nodeResult);
  const nodeChanged = input.nodeState !== null && nextNodeState !== input.nodeState;
  const runChanged = input.runState !== null && nextRunState !== input.runState;

  return {
    outcome: outcomeFor(reason.disposition),
    nextNodeState,
    nextRunState,
    mutation: nodeChanged && runChanged ? "NODE_AND_RUN" : nodeChanged ? "NODE" : runChanged ? "RUN" : "NONE",
    reconciliationRequired: reason.retryPolicy === "RECONCILE_ONLY",
  };
}

export function assertExecutionRunMutable(runState: ExecutionRunState): void {
  if (terminalRunStates.has(runState)) {
    throw new ExecutionContractError("TERMINAL_RUN", "terminal execution run rejects mutation");
  }
}

export function assertExecutionNodeTransition(from: ExecutionNodeState, to: ExecutionNodeState): void {
  if (!nodeTransitions[from].includes(to)) {
    throw protocolViolation("execution node transition is not allowed");
  }
}

function outcomeFor(disposition: import("./reasons.js").ExecutionDisposition): ExecutionTransitionDecision["outcome"] {
  if (disposition === "REJECT_INPUT") return "REJECTED_INPUT";
  if (disposition === "STOP_KNOWN") return "STOPPED";
  if (disposition === "MARK_UNKNOWN") return "UNKNOWN";
  if (disposition === "REJECT_NODE") return "REJECTED";
  if (disposition === "ACCEPT_LIMIT") return "COMPLETE_WITH_LIMIT";
  return "UNCHANGED";
}

function protocolViolation(message: string): ExecutionContractError {
  return new ExecutionContractError("OPERATOR_PROTOCOL_VIOLATION", message);
}

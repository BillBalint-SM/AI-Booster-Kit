import { readyExecutionNodes } from "./graph.js";
import { ExecutionContractError } from "./types.js";
import type { ExecutionResumeDecision, ExecutionResumeRuntime, ExecutionRunView } from "./types.js";

const runtimeCode = "EXECUTION_RESUME_RUNTIME_INVALID";
const revisionPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;

export function evaluateExecutionResume(run: ExecutionRunView, runtime: ExecutionResumeRuntime): ExecutionResumeDecision {
  const current = parseRuntime(runtime);
  if (current.sourceRevision !== run.envelope.sourceRevision) {
    return stopped(run.envelope.runId, "source revision does not match the immutable envelope");
  }
  if (["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"].includes(run.checkpoint.runState)) {
    return stopped(run.envelope.runId, "run already has a terminal checkpoint state");
  }
  if (run.checkpoint.dispatchCount > run.envelope.budget.maxDispatches || run.checkpoint.repairCount > run.envelope.graphLimits.maxCheckerRepairCycles) {
    return stopped(run.envelope.runId, "run budget is exhausted or inconsistent");
  }

  const visibleThreadRefs = new Set([...current.availableThreadRefs, ...current.activeThreadRefs]);
  const missingThreadRefs = run.checkpoint.activeThreadRefs.filter((threadRef) => !visibleThreadRefs.has(threadRef));
  if (missingThreadRefs.length > 0) {
    return { decision: "UNKNOWN", runId: run.envelope.runId, reasons: ["an active Codex thread is unavailable in current host evidence"], preservedState: true };
  }

  const readyNodeIds = readyExecutionNodes(run.graph).map((node) => node.nodeId).sort();
  const completedNodeIds = run.graph.nodes.filter((node) => node.state === "SUCCEEDED").map((node) => node.nodeId).sort();
  if (readyNodeIds.length === 0 && run.checkpoint.activeThreadRefs.length === 0) {
    return stopped(run.envelope.runId, "run has neither ready work nor a visible active thread");
  }
  return { decision: "RESUME", runId: run.envelope.runId, readyNodeIds, completedNodeIds };
}

function parseRuntime(value: ExecutionResumeRuntime): ExecutionResumeRuntime {
  if (!revisionPattern.test(value.sourceRevision) || !validTimestamp(value.observedAt) || !stringList(value.availableThreadRefs) || !stringList(value.activeThreadRefs)) {
    throw new ExecutionContractError(runtimeCode, "execution resume runtime evidence is invalid");
  }
  return {
    sourceRevision: value.sourceRevision,
    availableThreadRefs: [...value.availableThreadRefs],
    activeThreadRefs: [...value.activeThreadRefs],
    observedAt: value.observedAt,
  };
}

function stopped(runId: string, reason: string): ExecutionResumeDecision {
  return { decision: "STOPPED", runId, reasons: [reason], preservedState: true };
}

function validTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function stringList(value: readonly string[]): boolean {
  return new Set(value).size === value.length && value.every((entry) => entry.trim() !== "");
}

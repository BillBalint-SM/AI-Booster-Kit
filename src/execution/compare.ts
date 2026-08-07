import { executionDigest } from "./identity.js";
import { ExecutionContractError } from "./types.js";
import type { ExecutionComparisonReport, ExecutionHostMetrics, LoadedExecutionRun } from "./types.js";

const comparisonCode = "EXECUTION_RUNS_NOT_COMPARABLE";

export function compareExecutionRuns(singleRun: LoadedExecutionRun, multiRun: LoadedExecutionRun): ExecutionComparisonReport {
  if (comparisonIdentity(singleRun) !== comparisonIdentity(multiRun)) {
    throw new ExecutionContractError(comparisonCode, "execution runs do not share the same immutable comparison identity");
  }
  if (singleRun.finalHandoff === null || multiRun.finalHandoff === null) {
    throw new ExecutionContractError(comparisonCode, "execution runs require validated final handoffs before comparison");
  }
  return {
    comparisonVersion: "1.0",
    comparable: true,
    singleRunId: singleRun.envelope.runId,
    multiRunId: multiRun.envelope.runId,
    goalIdentityMatch: true,
    metrics: {
      supportedClaimCount: { single: supportedClaimCount(singleRun), multi: supportedClaimCount(multiRun) },
      conflictCount: { single: conflictCount(singleRun), multi: conflictCount(multiRun) },
      unknownCount: { single: unknownCount(singleRun), multi: unknownCount(multiRun) },
      dispatchCount: { single: agentDispatchCount(singleRun), multi: agentDispatchCount(multiRun) },
      repairCount: { single: repairCount(singleRun), multi: repairCount(multiRun) },
      elapsedMs: sharedMetric(singleRun.finalHandoff.metrics, multiRun.finalHandoff.metrics, "elapsedMs"),
      tokenUsage: sharedMetric(singleRun.finalHandoff.metrics, multiRun.finalHandoff.metrics, "tokenUsage"),
    },
  };
}

function comparisonIdentity(run: LoadedExecutionRun): string {
  return executionDigest({
    goal: run.envelope.goal,
    scope: run.envelope.scope,
    nonGoals: run.envelope.nonGoals,
    acceptanceCriteria: run.envelope.acceptanceCriteria,
    sourceRevision: run.envelope.sourceRevision,
    sources: run.envelope.sources,
    authority: run.envelope.authority,
    requiredEvidenceKinds: run.envelope.requiredEvidenceKinds,
  });
}

function supportedClaimCount(run: LoadedExecutionRun): number {
  return run.finalHandoff?.claims.filter((claim) => claim.state === "SUPPORTED").length ?? 0;
}

function conflictCount(run: LoadedExecutionRun): number {
  return run.acceptedResults.flatMap((result) => result.claims).filter((claim) => claim.state === "CONFLICTED").length;
}

function unknownCount(run: LoadedExecutionRun): number {
  return (run.finalHandoff?.unknowns.length ?? 0) + run.acceptedResults.reduce((count, result) => count + result.unknowns.length, 0);
}

function agentDispatchCount(run: LoadedExecutionRun): number {
  return run.events.filter((event) => event.eventType === "NODE_DISPATCHED" && event.nodeId !== null && run.graph.nodes.find((node) => node.nodeId === event.nodeId)?.type === "AGENT_TASK").length;
}

function repairCount(run: LoadedExecutionRun): number {
  return run.events.filter((event) => event.eventType === "GRAPH_MUTATION_ACCEPTED").length;
}

function sharedMetric(
  single: ExecutionHostMetrics,
  multi: ExecutionHostMetrics,
  metric: "elapsedMs" | "tokenUsage",
): { single: number | null; multi: number | null; state: "MEASURED" | "UNKNOWN" } {
  const singleValue = single[metric];
  const multiValue = multi[metric];
  if (singleValue.state !== "MEASURED" || multiValue.state !== "MEASURED" || singleValue.value === null || multiValue.value === null) {
    return { single: null, multi: null, state: "UNKNOWN" };
  }
  return { single: singleValue.value, multi: multiValue.value, state: "MEASURED" };
}

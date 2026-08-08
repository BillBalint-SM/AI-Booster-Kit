import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { buildExecutionTaskPacket, parseExecutionResult } from "../../src/execution/handoff.js";
import { createExecutionGraph } from "../../src/execution/graph.js";
import { commitFinalExecutionHandoff } from "../../src/execution/persistence/finalization.js";
import { commitExecutionGraphTransition } from "../../src/execution/persistence/mutations.js";
import type { ExecutionMutationAuthority } from "../../src/execution/persistence/mutations.js";
import { commitAcceptedExecutionResult } from "../../src/execution/persistence/results.js";
import { closeExecutionStoreSession, openExecutionStoreSession } from "../../src/execution/persistence/session.js";
import { createTransactionalExecutionRun, loadTransactionalExecutionRun } from "../../src/execution/persistence/store.js";
import { currentExecutionProcessRuntimeObservation } from "../../src/execution/runtime-receipt.js";
import type {
  ExecutionEnvelope,
  ExecutionEnvelopeInput,
  ExecutionGraphDraft,
  ExecutionNode,
  ExecutionResultEnvelope,
  FinalExecutionHandoff,
  LoadedExecutionRun,
  TransactionalLoadedExecutionRun,
} from "../../src/execution/types.js";
import { createExecutionEnvelope } from "../../src/execution/validation.js";

const controllerId = "test-controller-001";

export async function createCompletedExecutionRun(
  root: string,
  envelopeInput: ExecutionEnvelopeInput,
  graphDraft: ExecutionGraphDraft,
): Promise<TransactionalLoadedExecutionRun> {
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "app-data");
  await mkdir(workspaceRoot, { recursive: true });
  await mkdir(appDataRoot, { recursive: true });
  const envelope = createExecutionEnvelope(envelopeInput);
  const session = await openExecutionStoreSession({
    workspaceRoot,
    appDataRoot,
    runtime: currentExecutionProcessRuntimeObservation(),
    kernelRevision: envelope.sourceRevision.slice(0, 40),
    dependencyLockPath: resolve("package-lock.json"),
    sessionId: `session-${envelope.runId}`,
    hostSessionId: `host-${envelope.runId}`,
    observedAt: "2026-08-08T19:00:00.000Z",
  });
  try {
    const graph = createExecutionGraph(graphDraft, envelope);
    createTransactionalExecutionRun(session, { controllerId, envelope, graph, recordedAt: "2026-08-08T19:00:00.000Z" });
    let run = loadTransactionalExecutionRun(session, envelope.runId);
    let counter = 1;
    while (run.graph.nodes.some((node) => node.state !== "SUCCEEDED")) {
      const node = run.graph.nodes.find((candidate) => candidate.state === "READY");
      if (node === undefined) throw new Error("test graph must have a ready node until completion");
      run = completeNode(session, run, envelope, node, counter);
      counter += 1;
    }
    run = commitFinalExecutionHandoff(session, {
      runId: run.runId,
      authority: authority(run),
      handoff: completeHandoff(run),
      recordedAt: "2026-08-08T19:31:00.000Z",
    });
    return run;
  } finally {
    closeExecutionStoreSession(session);
  }
}

function completeNode(
  session: Parameters<typeof commitExecutionGraphTransition>[0],
  initial: TransactionalLoadedExecutionRun,
  envelope: ExecutionEnvelope,
  node: ExecutionNode,
  counter: number,
): TransactionalLoadedExecutionRun {
  const predecessorIds = new Set(initial.graph.edges.filter((edge) => edge.toNodeId === node.nodeId).map((edge) => edge.fromNodeId));
  const contextRefs = initial.artifacts.filter((artifact) => artifact.nodeId !== null && predecessorIds.has(artifact.nodeId));
  const packet = buildExecutionTaskPacket(envelope, initial.graph, node.nodeId, contextRefs);
  let run = commitExecutionGraphTransition(session, {
    runId: initial.runId,
    authority: authority(initial),
    transition: { nodeId: node.nodeId, from: "READY", to: "DISPATCHING" },
    evidenceRefs: [], taskId: packet.taskId, threadRef: null, reasonCode: null,
    recordedAt: timestamp(counter, 0),
  });
  run = commitExecutionGraphTransition(session, {
    runId: run.runId,
    authority: authority(run),
    transition: { nodeId: node.nodeId, from: "DISPATCHING", to: "RUNNING" },
    evidenceRefs: [], taskId: packet.taskId, threadRef: `codex-agent:${node.nodeId}`, reasonCode: null,
    recordedAt: timestamp(counter, 1),
  });
  return commitAcceptedExecutionResult(session, {
    runId: run.runId,
    authority: authority(run),
    result: resultFor(packet, envelope, node),
    threadRef: `codex-agent:${node.nodeId}`,
    recordedAt: timestamp(counter, 2),
  }).run;
}

function authority(run: LoadedExecutionRun): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId,
    fencingToken: run.fencingToken,
    runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash,
    expectedGraphRevision: run.graph.graphRevision,
  };
}

function resultFor(
  packet: ReturnType<typeof buildExecutionTaskPacket>,
  envelope: ExecutionEnvelope,
  node: ExecutionNode,
): ExecutionResultEnvelope {
  return parseExecutionResult({
    resultVersion: "2.0", runId: packet.runId, taskId: packet.taskId, nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash, graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION", reasonCode: null,
    summary: `Validated ${node.nodeId} evidence.`,
    claims: node.acceptanceCriterionIds.map((criterionId) => ({
      claimId: `claim-${node.nodeId}-${criterionId.replace("criterion-", "")}`,
      criterionId,
      statement: `Evidence supports ${criterionId}.`,
      state: "SUPPORTED",
      evidenceRefs: [`evidence-${node.nodeId}-${criterionId.replace("criterion-", "")}`],
    })),
    artifactRefs: [],
    evidenceRefs: node.acceptanceCriterionIds.map((criterionId) => ({
      evidenceId: `evidence-${node.nodeId}-${criterionId.replace("criterion-", "")}`,
      kind: "REPOSITORY_FILE", sourceId: "repo", sourceRevision: envelope.sourceRevision,
      locator: { path: `${node.scope[0] ?? "src/controller"}/types.ts`, lineStart: 1, lineEnd: 1 }, sha256: null,
    })),
    unknowns: [], conflicts: [], followupRequest: null, observedLimits: [],
  }, envelope.budget.maxResultBytes);
}

function completeHandoff(run: LoadedExecutionRun): FinalExecutionHandoff {
  return {
    handoffVersion: "2.0", runId: run.runId, envelopeHash: run.envelope.envelopeHash,
    graphHash: run.graph.graphHash, state: "COMPLETE",
    summary: "The synthetic execution completed with supported repository evidence.",
    claims: run.envelope.acceptanceCriteria.map((criterion) => ({
      claimId: `final-${criterion.criterionId.replace("criterion-", "")}`,
      criterionId: criterion.criterionId, statement: criterion.statement, state: "SUPPORTED",
      evidenceRefs: [evidenceForCriterion(run, criterion.criterionId)],
    })),
    evidenceRefs: run.evidenceRefs.map((evidence) => evidence.evidenceId),
    unknowns: [], limits: [],
    metrics: { elapsedMs: { state: "UNKNOWN", value: null }, tokenUsage: { state: "UNKNOWN", value: null } },
    nextAction: "Review the final handoff.",
  };
}

function evidenceForCriterion(run: LoadedExecutionRun, criterionId: string): string {
  const evidence = run.acceptedResults.flatMap((result) => result.claims).find((claim) => claim.criterionId === criterionId)?.evidenceRefs[0];
  if (evidence === undefined) throw new Error("test final handoff requires accepted evidence");
  return evidence;
}

function timestamp(counter: number, second: number): string {
  return `2026-08-08T19:${String(counter).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`;
}

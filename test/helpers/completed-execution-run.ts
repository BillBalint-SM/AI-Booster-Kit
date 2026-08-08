import { buildExecutionTaskPacket, parseExecutionResult } from "../../src/execution/handoff.js";
import { createExecutionGraph, transitionExecutionNode } from "../../src/execution/graph.js";
import { createExecutionEvent } from "../../src/execution/ledger.js";
import { renderFinalExecutionHandoffMarkdown } from "../../src/execution/finalize.js";
import { appendRunEvent, createPersonalExecutionRun, loadExecutionRun, saveAcceptedResult, saveFinalExecutionHandoff, saveGraphSnapshot } from "../../src/execution/storage.js";
import { createExecutionEnvelope } from "../../src/execution/validation.js";
import type { ExecutionArtifactRef, ExecutionEnvelope, ExecutionEnvelopeInput, ExecutionGraph, ExecutionGraphDraft, ExecutionNode, ExecutionResultEnvelope, FinalExecutionHandoff, LoadedExecutionRun } from "../../src/execution/types.js";

export async function createCompletedExecutionRun(
  root: string,
  envelopeInput: ExecutionEnvelopeInput,
  graphDraft: ExecutionGraphDraft,
): Promise<LoadedExecutionRun> {
  const envelope = createExecutionEnvelope(envelopeInput);
  let graph = createExecutionGraph(graphDraft, envelope);
  const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
  let counter = 1;
  while (graph.nodes.some((node) => node.state !== "SUCCEEDED")) {
    const next = graph.nodes.find((node) => node.state === "READY");
    if (next === undefined) throw new Error("test graph must have a ready node until completion");
    const loaded = await loadExecutionRun(created.runDirectory);
    const predecessorIds = new Set(graph.edges.filter((edge) => edge.toNodeId === next.nodeId).map((edge) => edge.fromNodeId));
    const contextRefs = loaded.artifacts.filter((artifact) => artifact.nodeId !== null && predecessorIds.has(artifact.nodeId));
    graph = await completeNode(created.runDirectory, envelope, graph, next, contextRefs, counter);
    counter += 1;
  }
  const run = await loadExecutionRun(created.runDirectory);
  const handoff = completeHandoff(run);
  await saveFinalExecutionHandoff(run.runDirectory, handoff, renderFinalExecutionHandoffMarkdown(handoff));
  return loadExecutionRun(created.runDirectory);
}

async function completeNode(
  runDirectory: string,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  node: ExecutionNode,
  contextRefs: readonly ExecutionArtifactRef[],
  counter: number,
): Promise<ExecutionGraph> {
  const packet = buildExecutionTaskPacket(envelope, graph, node.nodeId, contextRefs);
  const dispatchIntendedAt = timestamp(counter, 0);
  await appendTransition(runDirectory, envelope, graph, {
    eventType: "DISPATCH_INTENDED",
    nodeId: node.nodeId,
    beforeState: "READY",
    afterState: "DISPATCHING",
    taskId: packet.taskId,
    threadRef: null,
    evidenceRefs: [],
  }, dispatchIntendedAt);
  let nextGraph = transitionExecutionNode(graph, { nodeId: node.nodeId, from: "READY", to: "DISPATCHING" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);

  const dispatchConfirmedAt = timestamp(counter, 1);
  await appendTransition(runDirectory, envelope, nextGraph, {
    eventType: "DISPATCH_CONFIRMED",
    nodeId: node.nodeId,
    beforeState: "DISPATCHING",
    afterState: "RUNNING",
    taskId: packet.taskId,
    threadRef: `codex-agent:${node.nodeId}`,
    evidenceRefs: [],
  }, dispatchConfirmedAt);
  nextGraph = transitionExecutionNode(nextGraph, { nodeId: node.nodeId, from: "DISPATCHING", to: "RUNNING" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);

  const receivedAt = timestamp(counter, 2);
  await appendTransition(runDirectory, envelope, nextGraph, {
    eventType: "NODE_RESULT_RECEIVED",
    nodeId: node.nodeId,
    beforeState: "RUNNING",
    afterState: "RESULT_RECEIVED",
    taskId: packet.taskId,
    threadRef: `codex-agent:${node.nodeId}`,
    evidenceRefs: [],
  }, receivedAt);
  nextGraph = transitionExecutionNode(nextGraph, { nodeId: node.nodeId, from: "RUNNING", to: "RESULT_RECEIVED" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);

  const artifact = await saveAcceptedResult(runDirectory, resultFor(packet, envelope, node));
  const acceptedAt = timestamp(counter, 3);
  await appendTransition(runDirectory, envelope, nextGraph, {
    eventType: "NODE_RESULT_ACCEPTED",
    nodeId: node.nodeId,
    beforeState: "RESULT_RECEIVED",
    afterState: "SUCCEEDED",
    taskId: packet.taskId,
    threadRef: null,
    evidenceRefs: [artifact.artifactId],
  }, acceptedAt);
  nextGraph = transitionExecutionNode(nextGraph, { nodeId: node.nodeId, from: "RESULT_RECEIVED", to: "SUCCEEDED" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);
  return nextGraph;
}

async function appendTransition(
  runDirectory: string,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  input: {
    eventType: "DISPATCH_INTENDED" | "DISPATCH_CONFIRMED" | "NODE_RESULT_RECEIVED" | "NODE_RESULT_ACCEPTED";
    nodeId: string;
    beforeState: "READY" | "DISPATCHING" | "RUNNING" | "RESULT_RECEIVED";
    afterState: "DISPATCHING" | "RUNNING" | "RESULT_RECEIVED" | "SUCCEEDED";
    taskId: string;
    threadRef: string | null;
    evidenceRefs: readonly string[];
  },
  recordedAt: string,
): Promise<void> {
  const run = await loadExecutionRun(runDirectory);
  await appendRunEvent(
    runDirectory,
    createExecutionEvent(
      {
        runId: envelope.runId,
        eventType: input.eventType,
        nodeId: input.nodeId,
        beforeState: input.beforeState,
        afterState: input.afterState,
        graphRevision: graph.graphRevision,
        evidenceRefs: input.evidenceRefs,
        taskId: input.taskId,
        threadRef: input.threadRef,
        reasonCode: null,
      },
      run.events.length + 1,
      run.checkpoint.lastEventHash,
      recordedAt,
    ),
  );
}

function resultFor(packet: ReturnType<typeof buildExecutionTaskPacket>, envelope: ExecutionEnvelope, node: ExecutionNode): ExecutionResultEnvelope {
  const claims = node.acceptanceCriterionIds.map((criterionId) => ({
    claimId: `claim-${node.nodeId}-${criterionId.replace("criterion-", "")}`,
    criterionId,
    statement: `Evidence supports ${criterionId}.`,
    state: "SUPPORTED" as const,
    evidenceRefs: [`evidence-${node.nodeId}-${criterionId.replace("criterion-", "")}`],
  }));
  const evidenceRefs = node.acceptanceCriterionIds.map((criterionId) => ({
    evidenceId: `evidence-${node.nodeId}-${criterionId.replace("criterion-", "")}`,
    kind: "REPOSITORY_FILE" as const,
    sourceId: "repo",
    sourceRevision: envelope.sourceRevision,
    locator: { path: `${node.scope[0] ?? "src/controller"}/types.ts`, lineStart: 1, lineEnd: 1 },
    sha256: null,
  }));
  return parseExecutionResult(
    {
      resultVersion: "2.0",
      runId: packet.runId,
      taskId: packet.taskId,
      nodeId: packet.nodeId,
      envelopeHash: packet.envelopeHash,
      graphRevision: packet.graphRevision,
      status: "READY_FOR_VALIDATION",
      reasonCode: null,
      summary: `Validated ${node.nodeId} evidence.`,
      claims,
      artifactRefs: [],
      evidenceRefs,
      unknowns: [],
      conflicts: [],
      followupRequest: null,
      observedLimits: [],
    },
    envelope.budget.maxResultBytes,
  );
}

function completeHandoff(run: LoadedExecutionRun): FinalExecutionHandoff {
  return {
    handoffVersion: "2.0",
    runId: run.envelope.runId,
    envelopeHash: run.envelope.envelopeHash,
    graphHash: run.graph.graphHash,
    state: "COMPLETE",
    summary: "The synthetic execution completed with supported repository evidence.",
    claims: run.envelope.acceptanceCriteria.map((criterion) => ({
      claimId: `final-${criterion.criterionId.replace("criterion-", "")}`,
      criterionId: criterion.criterionId,
      statement: criterion.statement,
      state: "SUPPORTED",
      evidenceRefs: [evidenceForCriterion(run, criterion.criterionId)],
    })),
    evidenceRefs: run.evidenceRefs.map((evidence) => evidence.evidenceId),
    unknowns: [],
    limits: [],
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
  return `2026-08-07T15:${String(counter).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`;
}

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { finalizeExecutionRun, renderFinalExecutionHandoffMarkdown } from "../src/execution/finalize.js";
import { buildExecutionTaskPacket, parseExecutionResult } from "../src/execution/handoff.js";
import { transitionExecutionNode } from "../src/execution/graph.js";
import { createExecutionEvent } from "../src/execution/ledger.js";
import { evaluateExecutionResume } from "../src/execution/resume.js";
import { appendRunEvent, createPersonalExecutionRun, loadExecutionRun, saveAcceptedResult, saveFinalExecutionHandoff, saveGraphSnapshot } from "../src/execution/storage.js";
import type { ExecutionArtifactRef, ExecutionEnvelope, ExecutionGraph, ExecutionNode, ExecutionResultEnvelope, FinalExecutionHandoff, LoadedExecutionRun } from "../src/execution/types.js";
import { createExecutionGraph } from "../src/execution/graph.js";
import { createExecutionEnvelope } from "../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

test("execution resume resumes only a matching source and preserves an unknown active Codex thread", async () => {
  await withTemporaryDirectory(async (root) => {
    const envelope = createExecutionEnvelope(referenceEnvelopeInput);
    const graph = createExecutionGraph(referenceGraphDraft, envelope);
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    const intended = createExecutionEvent(
      { runId: envelope.runId, eventType: "DISPATCH_INTENDED", nodeId: "audit-controller", beforeState: "READY", afterState: "DISPATCHING", graphRevision: graph.graphRevision, evidenceRefs: [], taskId: "task-controller", threadRef: null, reasonCode: null },
      3,
      created.lastEventHash,
      "2026-08-07T15:00:01.000Z",
    );
    await appendRunEvent(created.runDirectory, intended);
    const dispatchingGraph = transitionExecutionNode(graph, { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" }, envelope);
    await saveGraphSnapshot(created.runDirectory, dispatchingGraph);
    const confirmed = createExecutionEvent(
      { runId: envelope.runId, eventType: "DISPATCH_CONFIRMED", nodeId: "audit-controller", beforeState: "DISPATCHING", afterState: "RUNNING", graphRevision: graph.graphRevision, evidenceRefs: [], taskId: "task-controller", threadRef: "codex-agent:controller", reasonCode: null },
      4,
      intended.eventHash,
      "2026-08-07T15:00:02.000Z",
    );
    await appendRunEvent(created.runDirectory, confirmed);
    await saveGraphSnapshot(created.runDirectory, transitionExecutionNode(dispatchingGraph, { nodeId: "audit-controller", from: "DISPATCHING", to: "RUNNING" }, envelope));
    const running = await loadExecutionRun(created.runDirectory);

    assert.equal(evaluateExecutionResume(running, runtimeFor(running, [])).decision, "UNKNOWN");
    assert.equal(evaluateExecutionResume(running, runtimeFor(running, ["codex-agent:controller"])).decision, "RESUME");
    assert.equal(evaluateExecutionResume(running, { ...runtimeFor(running, []), sourceRevision: "b".repeat(40) }).decision, "STOPPED");
  });
});

test("execution finalization requires one supported claim per acceptance criterion", async () => {
  await withTemporaryDirectory(async (root) => {
    const completed = await createCompletedReferenceRun(root);
    const handoff = completeHandoff(completed);

    const finalized = finalizeExecutionRun(completed, handoff, "2026-08-07T15:31:00.000Z");
    const persisted = await saveFinalExecutionHandoff(completed.runDirectory, handoff, renderFinalExecutionHandoffMarkdown(handoff));
    const reloaded = await loadExecutionRun(completed.runDirectory);

    assert.equal(finalized.state, "COMPLETE");
    assert.equal(finalized.event.eventType, "RUN_FINALIZED");
    assert.deepEqual(reloaded.finalHandoff, handoff);
    assert.equal(persisted.canonicalRef.nodeId, null);
    assert.throws(() => finalizeExecutionRun(completed, { ...handoff, claims: handoff.claims.slice(1) }, "2026-08-07T15:31:00.000Z"), /EXECUTION_ACCEPTANCE_INCOMPLETE/);
  });
});

function runtimeFor(run: LoadedExecutionRun, availableThreadRefs: readonly string[]) {
  return { sourceRevision: run.envelope.sourceRevision, availableThreadRefs, activeThreadRefs: [], observedAt: "2026-08-07T15:30:00.000Z" };
}

async function createCompletedReferenceRun(root: string): Promise<LoadedExecutionRun> {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  let graph = createExecutionGraph(referenceGraphDraft, envelope);
  const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
  const controller = await completeNode(created.runDirectory, envelope, graph, "audit-controller", "2026-08-07T15:01:00.000Z", []);
  graph = controller.graph;
  const context = await completeNode(created.runDirectory, envelope, graph, "audit-context", "2026-08-07T15:02:00.000Z", []);
  graph = context.graph;
  const checker = await completeNode(created.runDirectory, envelope, graph, "checker", "2026-08-07T15:03:00.000Z", [controller.artifact, context.artifact]);
  graph = checker.graph;
  await completeNode(created.runDirectory, envelope, graph, "synthesis", "2026-08-07T15:04:00.000Z", [checker.artifact]);
  return loadExecutionRun(created.runDirectory);
}

async function completeNode(
  runDirectory: string,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  nodeId: string,
  recordedAt: string,
  contextRefs: readonly ExecutionArtifactRef[],
): Promise<{ graph: ExecutionGraph; artifact: ExecutionArtifactRef }> {
  const node = graph.nodes.find((entry) => entry.nodeId === nodeId);
  if (node === undefined || node.state !== "READY") throw new Error("test node must be ready");
  const packet = buildExecutionTaskPacket(envelope, graph, nodeId, contextRefs);
  const intended = createExecutionEvent(
    { runId: envelope.runId, eventType: "DISPATCH_INTENDED", nodeId, beforeState: "READY", afterState: "DISPATCHING", graphRevision: graph.graphRevision, evidenceRefs: [], taskId: packet.taskId, threadRef: null, reasonCode: null },
    (await loadExecutionRun(runDirectory)).events.length + 1,
    (await loadExecutionRun(runDirectory)).checkpoint.lastEventHash,
    recordedAt,
  );
  await appendRunEvent(runDirectory, intended);
  let nextGraph = transitionExecutionNode(graph, { nodeId, from: "READY", to: "DISPATCHING" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);
  const confirmed = createExecutionEvent(
    { runId: envelope.runId, eventType: "DISPATCH_CONFIRMED", nodeId, beforeState: "DISPATCHING", afterState: "RUNNING", graphRevision: graph.graphRevision, evidenceRefs: [], taskId: packet.taskId, threadRef: `codex-agent:${nodeId}`, reasonCode: null },
    (await loadExecutionRun(runDirectory)).events.length + 1,
    (await loadExecutionRun(runDirectory)).checkpoint.lastEventHash,
    recordedAt,
  );
  await appendRunEvent(runDirectory, confirmed);
  nextGraph = transitionExecutionNode(nextGraph, { nodeId, from: "DISPATCHING", to: "RUNNING" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);

  const received = createExecutionEvent(
    { runId: envelope.runId, eventType: "NODE_RESULT_RECEIVED", nodeId, beforeState: "RUNNING", afterState: "RESULT_RECEIVED", graphRevision: graph.graphRevision, evidenceRefs: [], taskId: packet.taskId, threadRef: `codex-agent:${nodeId}`, reasonCode: null },
    (await loadExecutionRun(runDirectory)).events.length + 1,
    (await loadExecutionRun(runDirectory)).checkpoint.lastEventHash,
    recordedAt,
  );
  await appendRunEvent(runDirectory, received);
  nextGraph = transitionExecutionNode(nextGraph, { nodeId, from: "RUNNING", to: "RESULT_RECEIVED" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);

  const result = resultFor(packet, envelope, node);
  const artifact = await saveAcceptedResult(runDirectory, result);
  const accepted = createExecutionEvent(
    { runId: envelope.runId, eventType: "NODE_RESULT_ACCEPTED", nodeId, beforeState: "RESULT_RECEIVED", afterState: "SUCCEEDED", graphRevision: graph.graphRevision, evidenceRefs: [artifact.artifactId], taskId: packet.taskId, threadRef: null, reasonCode: null },
    (await loadExecutionRun(runDirectory)).events.length + 1,
    (await loadExecutionRun(runDirectory)).checkpoint.lastEventHash,
    recordedAt,
  );
  await appendRunEvent(runDirectory, accepted);
  nextGraph = transitionExecutionNode(nextGraph, { nodeId, from: "RESULT_RECEIVED", to: "SUCCEEDED" }, envelope);
  await saveGraphSnapshot(runDirectory, nextGraph);
  return { graph: nextGraph, artifact };
}

function resultFor(packet: ReturnType<typeof buildExecutionTaskPacket>, envelope: ExecutionEnvelope, node: ExecutionNode): ExecutionResultEnvelope {
  const claims = node.acceptanceCriterionIds.map((criterionId) => ({ claimId: `claim-${node.nodeId}-${criterionId.replace("criterion-", "")}`, criterionId, statement: `Evidence supports ${criterionId}.`, state: "SUPPORTED" as const, evidenceRefs: [`evidence-${node.nodeId}-${criterionId.replace("criterion-", "")}`] }));
  const evidenceRefs = node.acceptanceCriterionIds.map((criterionId) => ({ evidenceId: `evidence-${node.nodeId}-${criterionId.replace("criterion-", "")}`, kind: "REPOSITORY_FILE" as const, sourceId: "repo", sourceRevision: envelope.sourceRevision, locator: { path: node.scope[0] === undefined ? "src/controller/types.ts" : `${node.scope[0]}/types.ts`, lineStart: 1, lineEnd: 1 }, sha256: null }));
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
    summary: "The reference execution completed with supported repository evidence.",
    claims: run.envelope.acceptanceCriteria.map((criterion) => ({ claimId: `final-${criterion.criterionId.replace("criterion-", "")}`, criterionId: criterion.criterionId, statement: criterion.statement, state: "SUPPORTED", evidenceRefs: [evidenceForCriterion(run, criterion.criterionId)] })),
    evidenceRefs: run.evidenceRefs.map((evidence) => evidence.evidenceId),
    unknowns: [],
    limits: [],
    metrics: { elapsedMs: { state: "UNKNOWN", value: null }, tokenUsage: { state: "UNKNOWN", value: null } },
    nextAction: "Review the final handoff.",
  };
}

function evidenceForCriterion(run: LoadedExecutionRun, criterionId: string): string {
  const evidence = run.acceptedResults.flatMap((result) => result.claims).find((claim) => claim.criterionId === criterionId)?.evidenceRefs[0];
  if (evidence === undefined) throw new Error("test handoff requires accepted evidence");
  return evidence;
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-execution-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

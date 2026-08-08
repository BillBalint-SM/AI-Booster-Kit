import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderFinalExecutionHandoffMarkdown } from "../../src/execution/finalize.js";
import { createExecutionGraph, transitionExecutionNode } from "../../src/execution/graph.js";
import { buildExecutionTaskPacket, parseExecutionResult } from "../../src/execution/handoff.js";
import { canonicalExecutionJson } from "../../src/execution/identity.js";
import { createExecutionEvent, replayExecutionLedger } from "../../src/execution/ledger.js";
import type {
  ExecutionArtifactRef,
  ExecutionEnvelope,
  ExecutionEnvelopeInput,
  ExecutionEvent,
  ExecutionGraph,
  ExecutionGraphDraft,
  ExecutionNode,
  ExecutionResultEnvelope,
  ExecutionRunView,
  FinalExecutionHandoff,
} from "../../src/execution/types.js";
import { createExecutionEnvelope } from "../../src/execution/validation.js";

export async function createMinimalLegacyExecutionRun(
  root: string,
  envelopeInput: ExecutionEnvelopeInput,
  graphDraft: ExecutionGraphDraft,
): Promise<{ runDirectory: string }> {
  const envelope = createExecutionEnvelope(envelopeInput);
  const graph = createExecutionGraph(graphDraft, envelope);
  const events = initialEvents(envelope, graph);
  return writeLegacyRun(root, envelope, graph, events, [], null);
}

export async function createCompletedLegacyExecutionRun(
  root: string,
  envelopeInput: ExecutionEnvelopeInput,
  graphDraft: ExecutionGraphDraft,
): Promise<{ runDirectory: string }> {
  const envelope = createExecutionEnvelope(envelopeInput);
  let graph = createExecutionGraph(graphDraft, envelope);
  const events: ExecutionEvent[] = [...initialEvents(envelope, graph)];
  const artifacts: { reference: ExecutionArtifactRef; body: string }[] = [];
  let counter = 1;
  while (graph.nodes.some((node) => node.state !== "SUCCEEDED")) {
    const node = graph.nodes.find((candidate) => candidate.state === "READY");
    if (node === undefined) throw new Error("legacy fixture graph has no ready node");
    const predecessorIds = new Set(graph.edges.filter((edge) => edge.toNodeId === node.nodeId).map((edge) => edge.fromNodeId));
    const context = artifacts.map((artifact) => artifact.reference).filter((artifact) => artifact.nodeId !== null && predecessorIds.has(artifact.nodeId));
    const packet = buildExecutionTaskPacket(envelope, graph, node.nodeId, context);
    events.push(nextEvent(events, graph, {
      eventType: "DISPATCH_INTENDED", nodeId: node.nodeId, beforeState: "READY", afterState: "DISPATCHING",
      taskId: packet.taskId, threadRef: null, evidenceRefs: [],
    }, timestamp(counter, 0)));
    graph = transitionExecutionNode(graph, { nodeId: node.nodeId, from: "READY", to: "DISPATCHING" }, envelope);
    events.push(nextEvent(events, graph, {
      eventType: "DISPATCH_CONFIRMED", nodeId: node.nodeId, beforeState: "DISPATCHING", afterState: "RUNNING",
      taskId: packet.taskId, threadRef: `codex-agent:${node.nodeId}`, evidenceRefs: [],
    }, timestamp(counter, 1)));
    graph = transitionExecutionNode(graph, { nodeId: node.nodeId, from: "DISPATCHING", to: "RUNNING" }, envelope);
    events.push(nextEvent(events, graph, {
      eventType: "NODE_RESULT_RECEIVED", nodeId: node.nodeId, beforeState: "RUNNING", afterState: "RESULT_RECEIVED",
      taskId: packet.taskId, threadRef: `codex-agent:${node.nodeId}`, evidenceRefs: [],
    }, timestamp(counter, 2)));
    graph = transitionExecutionNode(graph, { nodeId: node.nodeId, from: "RUNNING", to: "RESULT_RECEIVED" }, envelope);
    const result = resultFor(packet, envelope, node);
    const body = canonicalExecutionJson(result);
    const reference = {
      artifactId: `task-${node.nodeId}-result`,
      nodeId: node.nodeId,
      sha256: createHash("sha256").update(body, "utf8").digest("hex"),
    };
    artifacts.push({ reference, body });
    events.push(nextEvent(events, graph, {
      eventType: "NODE_RESULT_ACCEPTED", nodeId: node.nodeId, beforeState: "RESULT_RECEIVED", afterState: "SUCCEEDED",
      taskId: packet.taskId, threadRef: null, evidenceRefs: [reference.artifactId],
    }, timestamp(counter, 3)));
    graph = transitionExecutionNode(graph, { nodeId: node.nodeId, from: "RESULT_RECEIVED", to: "SUCCEEDED" }, envelope);
    counter += 1;
  }
  const acceptedResults = artifacts.map((artifact) => JSON.parse(artifact.body) as ExecutionResultEnvelope);
  const checkpoint = replayExecutionLedger(events, envelope, graph);
  const base: ExecutionRunView = {
    envelope,
    graph,
    events,
    checkpoint,
    artifacts: artifacts.map((artifact) => artifact.reference),
    evidenceRefs: acceptedResults.flatMap((result) => result.evidenceRefs),
    acceptedResults,
    finalHandoff: null,
  };
  const handoff = completeHandoff(base);
  const handoffJson = canonicalExecutionJson(handoff);
  const handoffMarkdown = renderFinalExecutionHandoffMarkdown(handoff);
  artifacts.push(
    { reference: artifactRef("final-handoff-json", handoffJson), body: handoffJson },
    { reference: artifactRef("final-handoff-markdown", handoffMarkdown), body: handoffMarkdown },
  );
  return writeLegacyRun(root, envelope, graph, events, artifacts, handoff);
}

function initialEvents(envelope: ExecutionEnvelope, graph: ExecutionGraph): readonly ExecutionEvent[] {
  const created = createExecutionEvent({
    runId: envelope.runId, eventType: "RUN_CREATED", nodeId: null, beforeState: null, afterState: "PREPARED",
    graphRevision: graph.graphRevision, evidenceRefs: [], taskId: null, threadRef: null, reasonCode: null,
  }, 1, null, "2026-08-08T18:19:00.000Z");
  const accepted = createExecutionEvent({
    runId: envelope.runId, eventType: "GRAPH_ACCEPTED", nodeId: null, beforeState: "PREPARED", afterState: "READY",
    graphRevision: graph.graphRevision, evidenceRefs: [], taskId: null, threadRef: null, reasonCode: null,
  }, 2, created.eventHash, "2026-08-08T18:19:00.000Z");
  return [created, accepted];
}

function nextEvent(
  events: readonly ExecutionEvent[],
  graph: ExecutionGraph,
  input: Pick<ExecutionEvent, "eventType" | "nodeId" | "beforeState" | "afterState" | "taskId" | "threadRef" | "evidenceRefs">,
  recordedAt: string,
): ExecutionEvent {
  const previous = events.at(-1);
  if (previous === undefined) throw new Error("legacy fixture ledger is empty");
  return createExecutionEvent({
    runId: graph.runId,
    graphRevision: graph.graphRevision,
    reasonCode: null,
    ...input,
  }, events.length + 1, previous.eventHash, recordedAt);
}

function resultFor(
  packet: ReturnType<typeof buildExecutionTaskPacket>,
  envelope: ExecutionEnvelope,
  node: ExecutionNode,
): ExecutionResultEnvelope {
  return parseExecutionResult({
    resultVersion: "2.0",
    runId: packet.runId,
    taskId: packet.taskId,
    nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash,
    graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION",
    reasonCode: null,
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
      kind: "REPOSITORY_FILE",
      sourceId: "repo",
      sourceRevision: envelope.sourceRevision,
      locator: { path: `${node.scope[0] ?? "src/controller"}/types.ts`, lineStart: 1, lineEnd: 1 },
      sha256: null,
    })),
    unknowns: [], conflicts: [], followupRequest: null, observedLimits: [],
  }, envelope.budget.maxResultBytes);
}

function completeHandoff(run: ExecutionRunView): FinalExecutionHandoff {
  return {
    handoffVersion: "2.0",
    runId: run.envelope.runId,
    envelopeHash: run.envelope.envelopeHash,
    graphHash: run.graph.graphHash,
    state: "COMPLETE",
    summary: "The synthetic legacy execution completed with supported evidence.",
    claims: run.envelope.acceptanceCriteria.map((criterion) => ({
      claimId: `final-${criterion.criterionId.replace("criterion-", "")}`,
      criterionId: criterion.criterionId,
      statement: criterion.statement,
      state: "SUPPORTED",
      evidenceRefs: [requiredEvidence(run, criterion.criterionId)],
    })),
    evidenceRefs: run.evidenceRefs.map((evidence) => evidence.evidenceId),
    unknowns: [], limits: [],
    metrics: { elapsedMs: { state: "UNKNOWN", value: null }, tokenUsage: { state: "UNKNOWN", value: null } },
    nextAction: "Review the imported legacy handoff.",
  };
}

function requiredEvidence(run: ExecutionRunView, criterionId: string): string {
  const evidence = run.acceptedResults.flatMap((result) => result.claims).find((claim) => claim.criterionId === criterionId)?.evidenceRefs[0];
  if (evidence === undefined) throw new Error("legacy fixture criterion has no evidence");
  return evidence;
}

function artifactRef(artifactId: string, body: string): ExecutionArtifactRef {
  return { artifactId, nodeId: null, sha256: createHash("sha256").update(body, "utf8").digest("hex") };
}

async function writeLegacyRun(
  root: string,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  events: readonly ExecutionEvent[],
  artifacts: readonly { reference: ExecutionArtifactRef; body: string }[],
  _handoff: FinalExecutionHandoff | null,
): Promise<{ runDirectory: string }> {
  const runDirectory = join(root, envelope.runId);
  const artifactDirectory = join(runDirectory, "artifacts");
  await mkdir(artifactDirectory, { recursive: true });
  const checkpoint = replayExecutionLedger(events, envelope, graph);
  await writeFile(join(runDirectory, "envelope.json"), `${canonicalExecutionJson(envelope)}\n`, { flag: "wx" });
  await writeFile(join(runDirectory, "graph.json"), `${canonicalExecutionJson(graph)}\n`, { flag: "wx" });
  await writeFile(join(runDirectory, "events.jsonl"), `${events.map(canonicalExecutionJson).join("\n")}\n`, { flag: "wx" });
  await writeFile(join(runDirectory, "checkpoint.json"), `${canonicalExecutionJson(checkpoint)}\n`, { flag: "wx" });
  await writeFile(join(runDirectory, "evidence-index.json"), "[]\n", { flag: "wx" });
  for (const artifact of artifacts) {
    const name = artifact.reference.artifactId === "final-handoff-json"
      ? "final-handoff.json"
      : artifact.reference.artifactId === "final-handoff-markdown"
        ? "final-handoff.md"
        : `${artifact.reference.artifactId}.json`;
    await writeFile(join(artifactDirectory, name), artifact.body, { flag: "wx" });
  }
  await writeFile(join(artifactDirectory, "manifest.json"), `${canonicalExecutionJson({ manifestVersion: "1.0", artifacts: artifacts.map((artifact) => artifact.reference) })}\n`, { flag: "wx" });
  return { runDirectory };
}

function timestamp(counter: number, second: number): string {
  return `2026-08-08T18:${String(counter).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`;
}

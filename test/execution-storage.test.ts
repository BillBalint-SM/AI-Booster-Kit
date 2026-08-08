import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createExecutionGraph, transitionExecutionNode } from "../src/execution/graph.js";
import { buildExecutionTaskPacket, parseExecutionResult } from "../src/execution/handoff.js";
import { createExecutionEvent } from "../src/execution/ledger.js";
import { appendRunEvent, createPersonalExecutionRun, loadExecutionRun, saveAcceptedResult, saveGraphSnapshot } from "../src/execution/storage.js";
import { createExecutionEnvelope } from "../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

test("execution storage creates a Personal run and replays its hash-chained ledger", async () => {
  await withTemporaryDirectory(async (root) => {
    const legacyFixturePath = "test/fixtures/execution/legacy-v1-envelope.json";
    const legacyFixtureBefore = await readFile(legacyFixturePath, "utf8");
    const envelope = createExecutionEnvelope(referenceEnvelopeInput);
    const graph = createExecutionGraph(referenceGraphDraft, envelope);
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    const dispatched = await dispatchController(created.runDirectory, envelope, graph, created.lastEventHash);
    const loaded = await loadExecutionRun(created.runDirectory);

    assert.equal(loaded.events.length, 4);
    assert.equal(loaded.envelope.envelopeHash, envelope.envelopeHash);
    assert.equal(loaded.checkpoint.lastEventHash, dispatched.eventHash);
    const storedEnvelope = JSON.parse(await readFile(join(created.runDirectory, "envelope.json"), "utf8")) as { contractVersion: unknown };
    const storedEvents = (await readFile(join(created.runDirectory, "events.jsonl"), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as { eventVersion: unknown });
    const storedCheckpoint = JSON.parse(await readFile(join(created.runDirectory, "checkpoint.json"), "utf8")) as { checkpointVersion: unknown };
    assert.equal(storedEnvelope.contractVersion, "2.0");
    assert.equal(storedEvents.length, 4);
    assert.ok(storedEvents.every((event) => event.eventVersion === "2.0"));
    assert.equal(storedCheckpoint.checkpointVersion, "2.0");
    assert.equal(await readFile(legacyFixturePath, "utf8"), legacyFixtureBefore);
  });
});

test("execution storage rejects a conflicting run target and duplicate event", async () => {
  await withTemporaryDirectory(async (root) => {
    const envelope = createExecutionEnvelope(referenceEnvelopeInput);
    const graph = createExecutionGraph(referenceGraphDraft, envelope);
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    const dispatched = await dispatchController(created.runDirectory, envelope, graph, created.lastEventHash);

    await assert.rejects(() => createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:02.000Z"), /EXECUTION_RUN_TARGET_CONFLICT/);
    await assert.rejects(() => appendRunEvent(created.runDirectory, dispatched), /EXECUTION_STORAGE_CONFLICT/);
  });
});

test("execution storage creates one content-hashed result artifact and preserves it on reload", async () => {
  await withTemporaryDirectory(async (root) => {
    const envelope = createExecutionEnvelope(referenceEnvelopeInput);
    const graph = createExecutionGraph(referenceGraphDraft, envelope);
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    const packet = buildExecutionTaskPacket(envelope, graph, "audit-controller", []);
    const result = parseExecutionResult(
      {
        resultVersion: "2.0",
        runId: packet.runId,
        taskId: packet.taskId,
        nodeId: packet.nodeId,
        envelopeHash: packet.envelopeHash,
        graphRevision: packet.graphRevision,
        status: "READY_FOR_VALIDATION",
        reasonCode: null,
        summary: "Controller evidence was inspected.",
        claims: [{ claimId: "claim-controller", criterionId: "criterion-controller", statement: "Controller evidence is present.", state: "SUPPORTED", evidenceRefs: ["evidence-controller"] }],
        artifactRefs: [],
        evidenceRefs: [{ evidenceId: "evidence-controller", kind: "REPOSITORY_FILE", sourceId: "repo", sourceRevision: envelope.sourceRevision, locator: { path: "src/controller/types.ts", lineStart: 1, lineEnd: 2 }, sha256: null }],
        unknowns: [],
        conflicts: [],
        followupRequest: null,
        observedLimits: [],
      },
      envelope.budget.maxResultBytes,
    );

    const reference = await saveAcceptedResult(created.runDirectory, result);
    const loaded = await loadExecutionRun(created.runDirectory);

    assert.match(reference.sha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(loaded.artifacts, [reference]);
    await assert.rejects(() => saveAcceptedResult(created.runDirectory, result), /EXECUTION_STORAGE_CONFLICT/);
  });
});

async function dispatchController(runDirectory: string, envelope: ReturnType<typeof createExecutionEnvelope>, graph: ReturnType<typeof createExecutionGraph>, previousEventHash: string) {
  const intended = createExecutionEvent(
    {
      runId: envelope.runId,
      eventType: "DISPATCH_INTENDED",
      nodeId: "audit-controller",
      beforeState: "READY",
      afterState: "DISPATCHING",
      graphRevision: graph.graphRevision,
      evidenceRefs: [],
      taskId: "task-controller",
      threadRef: null,
      reasonCode: null,
    },
    3,
    previousEventHash,
    "2026-08-07T15:00:01.000Z",
  );
  await appendRunEvent(runDirectory, intended);
  const dispatchingGraph = transitionExecutionNode(graph, { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" }, envelope);
  await saveGraphSnapshot(runDirectory, dispatchingGraph);
  const confirmed = createExecutionEvent(
    {
      runId: envelope.runId,
      eventType: "DISPATCH_CONFIRMED",
      nodeId: "audit-controller",
      beforeState: "DISPATCHING",
      afterState: "RUNNING",
      graphRevision: graph.graphRevision,
      evidenceRefs: [],
      taskId: "task-controller",
      threadRef: "codex-agent:controller",
      reasonCode: null,
    },
    4,
    intended.eventHash,
    "2026-08-07T15:00:02.000Z",
  );
  await appendRunEvent(runDirectory, confirmed);
  await saveGraphSnapshot(runDirectory, transitionExecutionNode(dispatchingGraph, { nodeId: "audit-controller", from: "DISPATCHING", to: "RUNNING" }, envelope));
  return confirmed;
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-execution-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

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
    const envelope = createExecutionEnvelope(referenceEnvelopeInput);
    const graph = createExecutionGraph(referenceGraphDraft, envelope);
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    const dispatched = createExecutionEvent(
      {
        runId: envelope.runId,
        eventType: "NODE_DISPATCHED",
        nodeId: "audit-controller",
        beforeState: "READY",
        afterState: "RUNNING",
        graphRevision: 1,
        evidenceRefs: [],
        taskId: "task-controller",
        threadRef: "codex-agent:controller",
        reasonCode: null,
      },
      3,
      created.lastEventHash,
      "2026-08-07T15:00:01.000Z",
    );

    await appendRunEvent(created.runDirectory, dispatched);
    const runningGraph = transitionExecutionNode(graph, { nodeId: "audit-controller", from: "READY", to: "RUNNING" }, envelope);
    await saveGraphSnapshot(created.runDirectory, runningGraph);
    const loaded = await loadExecutionRun(created.runDirectory);

    assert.equal(loaded.events.length, 3);
    assert.equal(loaded.envelope.envelopeHash, envelope.envelopeHash);
    assert.equal(loaded.checkpoint.lastEventHash, dispatched.eventHash);
    assert.equal((await readFile(join(created.runDirectory, "events.jsonl"), "utf8")).split("\n").filter(Boolean).length, 3);
  });
});

test("execution storage rejects a conflicting run target and duplicate event", async () => {
  await withTemporaryDirectory(async (root) => {
    const envelope = createExecutionEnvelope(referenceEnvelopeInput);
    const graph = createExecutionGraph(referenceGraphDraft, envelope);
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    const dispatched = createExecutionEvent(
      {
        runId: envelope.runId,
        eventType: "NODE_DISPATCHED",
        nodeId: "audit-controller",
        beforeState: "READY",
        afterState: "RUNNING",
        graphRevision: 1,
        evidenceRefs: [],
        taskId: "task-controller",
        threadRef: "codex-agent:controller",
        reasonCode: null,
      },
      3,
      created.lastEventHash,
      "2026-08-07T15:00:01.000Z",
    );

    await appendRunEvent(created.runDirectory, dispatched);
    const runningGraph = transitionExecutionNode(graph, { nodeId: "audit-controller", from: "READY", to: "RUNNING" }, envelope);
    await saveGraphSnapshot(created.runDirectory, runningGraph);

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
        resultVersion: "1.0",
        runId: packet.runId,
        taskId: packet.taskId,
        nodeId: packet.nodeId,
        envelopeHash: packet.envelopeHash,
        graphRevision: packet.graphRevision,
        status: "READY_FOR_VALIDATION",
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

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-execution-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

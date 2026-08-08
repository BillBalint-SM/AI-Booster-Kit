import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";

import { transitionExecutionNode } from "../src/execution/graph.js";
import { createExecutionEvent } from "../src/execution/ledger.js";
import { appendRunEvent, loadExecutionRun, saveGraphSnapshot } from "../src/execution/storage.js";
import type { ExecutionReasonCode } from "../src/execution/reasons.js";
import type { ExecutionResultEnvelope, ExecutionTaskPacket } from "../src/execution/types.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";
import { createCompletedExecutionRun } from "./helpers/completed-execution-run.js";

test("built execution CLI accepts one Personal read-only result from a synthetic running node", async () => {
  await withTemporaryDirectory(async (root) => {
    const { runDirectory, packet } = await prepareSyntheticRunningExecution(root);
    assert.equal(packet.packetVersion, "2.0");

    const accepted = await runBuiltCli(
      ["accept-execution-result", "--run", runDirectory],
      JSON.stringify(readyWorkerResult(packet)),
    );
    assert.equal(accepted.code, 0);
    assert.deepEqual(JSON.parse(accepted.stdout), { state: "SUCCEEDED", nodeId: "audit-controller" });
  });
});

test("built execution CLI exposes a correlated Result Envelope template in every prepared node", async () => {
  await withTemporaryDirectory(async (root) => {
    const prepared = await runBuiltCli(["prepare-execution", "--personal-root", root], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
    assert.equal(prepared.code, 0);

    const runDirectory = join(root, referenceEnvelopeInput.runId);
    const response = await runBuiltCli(["prepare-execution-node", "--run", runDirectory, "--node", "audit-controller"], null);
    assert.equal(response.code, 0);
    const node = JSON.parse(response.stdout) as { taskPacket: ExecutionTaskPacket; resultTemplate: Record<string, unknown> };

    assert.deepEqual(node.resultTemplate, {
      resultVersion: "2.0",
      runId: node.taskPacket.runId,
      taskId: node.taskPacket.taskId,
      nodeId: node.taskPacket.nodeId,
      envelopeHash: node.taskPacket.envelopeHash,
      graphRevision: node.taskPacket.graphRevision,
      status: "READY_FOR_VALIDATION",
      reasonCode: null,
      summary: "Replace this template text with a non-empty scoped summary.",
      claims: [],
      artifactRefs: [],
      evidenceRefs: [],
      unknowns: [],
      conflicts: [],
      followupRequest: null,
      observedLimits: [],
    });
  });
});

test("built execution CLI rejects a malformed worker result without mutating the run", async () => {
  await withTemporaryDirectory(async (root) => {
    const { runDirectory, packet } = await prepareSyntheticRunningExecution(root);
    const beforeMalformed = await mutableRunFiles(runDirectory);

    const malformed = await runBuiltCli(["accept-execution-result", "--run", runDirectory], JSON.stringify({ resultEnvelopeVersion: "2.0" }));
    assert.equal(malformed.code, 3);
    assert.deepEqual(JSON.parse(malformed.stdout), { operation: "REJECTED", mutation: "NONE", error: { code: "RESULT_FIELDS_INVALID" } });
    assert.deepEqual(await mutableRunFiles(runDirectory), beforeMalformed);

    const rejected = await runBuiltCli(
      ["reject-execution-result", "--run", runDirectory, "--node", "audit-controller", "--task", packet.taskId, "--code", "EXECUTION_RESULT_FIELDS_INVALID"],
      null,
    );
    assert.equal(rejected.code, 0, `${rejected.stdout}${rejected.stderr}`);
    assert.deepEqual(JSON.parse(rejected.stdout), { state: "STOPPED", nodeId: "audit-controller", code: "RESULT_FIELDS_INVALID" });

    const graph = JSON.parse(await readFile(join(runDirectory, "graph.json"), "utf8")) as { nodes: readonly { nodeId: string; state: string }[] };
    const checkpoint = JSON.parse(await readFile(join(runDirectory, "checkpoint.json"), "utf8")) as { runState: string; activeThreadRefs: readonly string[] };
    const manifest = JSON.parse(await readFile(join(runDirectory, "artifacts", "manifest.json"), "utf8")) as { artifacts: readonly unknown[] };
    const events = (await readFile(join(runDirectory, "events.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { eventType: string; reasonCode: string | null });

    assert.equal(graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "REJECTED");
    assert.equal(checkpoint.runState, "STOPPED");
    assert.deepEqual(checkpoint.activeThreadRefs, []);
    assert.deepEqual(manifest.artifacts, []);
    assert.deepEqual(events.slice(-2).map((event) => ({
      eventType: event.eventType,
      reasonCode: event.reasonCode,
    })), [
      { eventType: "NODE_RESULT_REJECTED", reasonCode: "RESULT_FIELDS_INVALID" },
      { eventType: "RUN_STOPPED", reasonCode: "RESULT_FIELDS_INVALID" },
    ]);
  });
});

test("built execution CLI rejects terminal-run mutation and preserves every mutable run file", async () => {
  await withTemporaryDirectory(async (root) => {
    const completed = await createCompletedExecutionRun(root, referenceEnvelopeInput, referenceGraphDraft);
    if (completed.finalHandoff === null) throw new Error("test run requires a final handoff");
    const finalized = createExecutionEvent(
      {
        runId: completed.envelope.runId,
        eventType: "RUN_FINALIZED",
        nodeId: null,
        beforeState: completed.checkpoint.runState,
        afterState: "COMPLETE",
        graphRevision: completed.graph.graphRevision,
        evidenceRefs: [],
        taskId: null,
        threadRef: null,
        reasonCode: null,
      },
      completed.events.length + 1,
      completed.checkpoint.lastEventHash,
      "2026-08-08T10:30:00.000Z",
    );
    await appendRunEvent(completed.runDirectory, finalized);
    const before = await mutableRunFiles(completed.runDirectory);

    const response = await runBuiltCli(
      ["record-execution-dispatch", "--run", completed.runDirectory, "--node", "audit-controller", "--task", "a".repeat(64), "--thread-ref", "codex-agent:controller"],
      null,
    );

    assert.equal(response.code, 3);
    assert.deepEqual(JSON.parse(response.stdout), { operation: "REJECTED", mutation: "NONE", error: { code: "TERMINAL_RUN" } });
    assert.deepEqual(await mutableRunFiles(completed.runDirectory), before);
  });
});

test("built execution CLI rejects the legacy unverified stop protocol without mutating an active run", async () => {
  await withTemporaryDirectory(async (root) => {
    const prepared = await runBuiltCli(["prepare-execution", "--personal-root", root], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
    assert.equal(prepared.code, 0, `${prepared.stdout}${prepared.stderr}`);
    const runDirectory = join(root, referenceEnvelopeInput.runId);
    const before = await mutableRunFiles(runDirectory);

    const response = await runBuiltCli(["stop-execution", "--run", runDirectory, "--code", "USER_CANCELLED"], null);

    assert.equal(response.code, 3);
    assert.deepEqual(JSON.parse(response.stdout), { operation: "REJECTED", mutation: "NONE", error: { code: "OPERATOR_PROTOCOL_VIOLATION" } });
    assert.deepEqual(await mutableRunFiles(runDirectory), before);
  });
});

test("built execution CLI routes a required worker STOPPED result without creating a success artifact", async () => {
  await withTemporaryDirectory(async (root) => {
    const { runDirectory, packet } = await prepareSyntheticRunningExecution(root);
    const response = await runBuiltCli(
      ["accept-execution-result", "--run", runDirectory],
      JSON.stringify(terminalWorkerResult(packet, "STOPPED", "RESULT_STATUS_STOPPED")),
    );

    assert.equal(response.code, 0, `${response.stdout}${response.stderr}`);
    assert.notEqual(JSON.parse(response.stdout).state, "SUCCEEDED");
    const state = await readExecutionState(runDirectory);
    assert.equal(state.nodeState, "STOPPED");
    assert.equal(state.runState, "STOPPED");
    assert.deepEqual(state.artifacts, []);
    assert.deepEqual(state.lastEvents, [
      { eventType: "NODE_STOPPED", reasonCode: "RESULT_STATUS_STOPPED" },
      { eventType: "RUN_STOPPED", reasonCode: "RESULT_STATUS_STOPPED" },
    ]);
    assert.equal(state.dependentState, "PENDING");
  });
});

test("built execution CLI routes a required worker UNKNOWN result without creating a success artifact", async () => {
  await withTemporaryDirectory(async (root) => {
    const { runDirectory, packet } = await prepareSyntheticRunningExecution(root);
    const response = await runBuiltCli(
      ["accept-execution-result", "--run", runDirectory],
      JSON.stringify(terminalWorkerResult(packet, "UNKNOWN", "RESULT_STATUS_UNKNOWN")),
    );

    assert.equal(response.code, 2, `${response.stdout}${response.stderr}`);
    assert.notEqual(JSON.parse(response.stdout).state, "SUCCEEDED");
    const state = await readExecutionState(runDirectory);
    assert.equal(state.nodeState, "UNKNOWN");
    assert.equal(state.runState, "UNKNOWN");
    assert.deepEqual(state.artifacts, []);
    assert.deepEqual(state.lastEvents, [
      { eventType: "NODE_UNKNOWN", reasonCode: "RESULT_STATUS_UNKNOWN" },
      { eventType: "RUN_UNKNOWN", reasonCode: "RESULT_STATUS_UNKNOWN" },
    ]);
    assert.equal(state.dependentState, "PENDING");
  });
});

async function prepareSyntheticRunningExecution(root: string): Promise<{ runDirectory: string; packet: ExecutionTaskPacket }> {
  const prepared = await runBuiltCli(["prepare-execution", "--personal-root", root], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
  assert.equal(prepared.code, 0, `${prepared.stdout}${prepared.stderr}`);
  assert.deepEqual(JSON.parse(prepared.stdout), { state: "READY", runId: referenceEnvelopeInput.runId });
  const runDirectory = join(root, referenceEnvelopeInput.runId);
  const packetResponse = await runBuiltCli(["prepare-execution-node", "--run", runDirectory, "--node", "audit-controller"], null);
  assert.equal(packetResponse.code, 0, `${packetResponse.stdout}${packetResponse.stderr}`);
  const packet = (JSON.parse(packetResponse.stdout) as { taskPacket: ExecutionTaskPacket }).taskPacket;
  const run = await loadExecutionRun(runDirectory);
  const intended = createExecutionEvent(
    {
      runId: run.envelope.runId,
      eventType: "DISPATCH_INTENDED",
      nodeId: packet.nodeId,
      beforeState: "READY",
      afterState: "DISPATCHING",
      graphRevision: run.graph.graphRevision,
      evidenceRefs: [],
      taskId: packet.taskId,
      threadRef: null,
      reasonCode: null,
    },
    run.events.length + 1,
    run.checkpoint.lastEventHash,
    "2026-08-08T10:00:00.000Z",
  );
  await appendRunEvent(runDirectory, intended);
  const dispatchingGraph = transitionExecutionNode(run.graph, { nodeId: packet.nodeId, from: "READY", to: "DISPATCHING" }, run.envelope);
  await saveGraphSnapshot(runDirectory, dispatchingGraph);
  const dispatchingRun = await loadExecutionRun(runDirectory);
  const confirmed = createExecutionEvent(
    {
      runId: run.envelope.runId,
      eventType: "DISPATCH_CONFIRMED",
      nodeId: packet.nodeId,
      beforeState: "DISPATCHING",
      afterState: "RUNNING",
      graphRevision: run.graph.graphRevision,
      evidenceRefs: [],
      taskId: packet.taskId,
      threadRef: "codex-agent:controller",
      reasonCode: null,
    },
    dispatchingRun.events.length + 1,
    dispatchingRun.checkpoint.lastEventHash,
    "2026-08-08T10:00:01.000Z",
  );
  await appendRunEvent(runDirectory, confirmed);
  await saveGraphSnapshot(runDirectory, transitionExecutionNode(dispatchingGraph, { nodeId: packet.nodeId, from: "DISPATCHING", to: "RUNNING" }, run.envelope));
  return { runDirectory, packet };
}

function readyWorkerResult(packet: ExecutionTaskPacket): ExecutionResultEnvelope {
  return {
    ...terminalWorkerResult(packet, "READY_FOR_VALIDATION", null),
    claims: [{ claimId: "claim-controller", criterionId: "criterion-controller", statement: "Controller assets are traceable to repository evidence.", state: "SUPPORTED", evidenceRefs: ["evidence-controller"] }],
    evidenceRefs: [{ evidenceId: "evidence-controller", kind: "REPOSITORY_FILE", sourceId: "repo", sourceRevision: "a".repeat(40), locator: { path: "src/controller/types.ts", lineStart: 20, lineEnd: 30 }, sha256: null }],
  };
}

function terminalWorkerResult(
  packet: ExecutionTaskPacket,
  status: ExecutionResultEnvelope["status"],
  reasonCode: ExecutionReasonCode | null,
): ExecutionResultEnvelope {
  return {
    resultVersion: "2.0",
    runId: packet.runId,
    taskId: packet.taskId,
    nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash,
    graphRevision: packet.graphRevision,
    status,
    reasonCode,
    summary: `Worker returned ${status}.`,
    claims: [],
    artifactRefs: [],
    evidenceRefs: [],
    unknowns: status === "UNKNOWN" ? ["Worker completion could not be determined."] : [],
    conflicts: [],
    followupRequest: null,
    observedLimits: [],
  };
}

async function readExecutionState(runDirectory: string) {
  const graph = JSON.parse(await readFile(join(runDirectory, "graph.json"), "utf8")) as { nodes: readonly { nodeId: string; state: string }[] };
  const checkpoint = JSON.parse(await readFile(join(runDirectory, "checkpoint.json"), "utf8")) as { runState: string };
  const manifest = JSON.parse(await readFile(join(runDirectory, "artifacts", "manifest.json"), "utf8")) as { artifacts: readonly unknown[] };
  const events = (await readFile(join(runDirectory, "events.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { eventType: string; reasonCode: string | null });
  return {
    nodeState: graph.nodes.find((node) => node.nodeId === "audit-controller")?.state,
    dependentState: graph.nodes.find((node) => node.nodeId === "checker")?.state,
    runState: checkpoint.runState,
    artifacts: manifest.artifacts,
    lastEvents: events.slice(-2).map((event) => ({ eventType: event.eventType, reasonCode: event.reasonCode })),
  };
}

async function mutableRunFiles(runDirectory: string): Promise<Readonly<Record<string, string>>> {
  const paths = ["events.jsonl", "graph.json", "checkpoint.json", join("artifacts", "manifest.json")];
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await readFile(join(runDirectory, path), "utf8")] as const)));
}

function runBuiltCli(argv: readonly string[], stdin: string | null): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", rejectResult);
    child.once("close", (code) => resolveResult({ code, stdout, stderr }));
    if (stdin === null) child.stdin.end(); else child.stdin.end(`${stdin}\n`);
  });
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-execution-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

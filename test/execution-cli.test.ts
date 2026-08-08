import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { commitExecutionGraphTransition } from "../src/execution/persistence/mutations.js";
import type { ExecutionMutationAuthority } from "../src/execution/persistence/mutations.js";
import {
  closeExecutionStoreSession,
  openMutableExecutionStoreSessionForRun,
  openReadOnlyExecutionStoreSessionForRun,
} from "../src/execution/persistence/session.js";
import { loadTransactionalExecutionRun } from "../src/execution/persistence/store.js";
import { currentExecutionProcessRuntimeObservation } from "../src/execution/runtime-receipt.js";
import type { ExecutionReasonCode } from "../src/execution/reasons.js";
import type { ExecutionResultEnvelope, ExecutionTaskPacket, LoadedExecutionRun } from "../src/execution/types.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

interface CliLocator {
  databasePath: string;
  runId: string;
  workspaceId: string;
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  lane: "AUTHORITATIVE" | "CONFORMANCE_ONLY";
}

const cliThreadId = "11111111-2222-4333-8444-555555555555";
const cliHostSessionDigest = "a3c84fa3b1ac6935d23090caa53a392f6c4d858fc28595a49c88001215ca2c24";

test("prepare-execution returns the transactional locator, controller fence, runtime receipt, and observed lane", async () => {
  await withTemporaryDirectory(async (root) => {
    const prepared = await prepareExecution(root);
    assert.equal(prepared.runId, referenceEnvelopeInput.runId);
    assert.match(prepared.workspaceId, /^[a-f0-9]{32}$/u);
    assert.match(prepared.runtimeReceiptId, /^[a-f0-9]{64}$/u);
    assert.equal(prepared.controllerId, "cli-controller-001");
    assert.equal(prepared.fencingToken, 1);
    assert.ok(["AUTHORITATIVE", "CONFORMANCE_ONLY"].includes(prepared.lane));
    assert.match(prepared.databasePath, /execution\.sqlite$/u);
    assert.equal(readRuntimeHostSession(prepared), cliHostSessionDigest);

    const packet = await prepareNode(prepared, "audit-controller");
    assert.equal(packet.nodeId, "audit-controller");
  });
});

test("prepare-execution rejects absent or malformed Codex task identity before database creation", async () => {
  for (const invalidThreadId of [undefined, "not-a-uuid"]) {
    await withTemporaryDirectory(async (root) => {
      const workspace = join(root, "workspace");
      const appData = join(root, "app-data");
      await mkdir(workspace);
      await mkdir(appData);
      const response = await runBuiltCliWithThreadId([
        "prepare-execution", "--workspace", workspace, "--app-data-root", appData, "--controller-id", "cli-controller-001",
      ], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }), invalidThreadId);

      assert.equal(response.code, 3, `${response.stdout}${response.stderr}`);
      assert.equal(response.stdout.includes(invalidThreadId ?? "CODEX_THREAD_ID"), false);
      assert.deepEqual(await readdir(appData), []);
    });
  }
});

test("accept-execution-result performs one transactional result commit and malformed input changes nothing", async () => {
  await withTemporaryDirectory(async (root) => {
    const { locator, packet } = await prepareSyntheticRunningExecution(root);
    const before = readRun(locator);
    const malformed = await runBuiltCli(["accept-execution-result", ...mutableFlags(locator)], JSON.stringify({ resultEnvelopeVersion: "2.0" }));
    assert.equal(malformed.code, 3, `${malformed.stdout}${malformed.stderr}`);
    assert.deepEqual(runIdentity(readRun(locator)), runIdentity(before));

    const accepted = await runBuiltCli(["accept-execution-result", ...mutableFlags(locator)], JSON.stringify(readyWorkerResult(packet)));
    assert.equal(accepted.code, 0, `${accepted.stdout}${accepted.stderr}`);
    const state = readRun(locator);
    assert.equal(state.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "SUCCEEDED");
    assert.equal(state.artifacts.length, 1);
    assert.deepEqual(state.events.slice(-2).map((event) => event.eventType), ["NODE_RESULT_RECEIVED", "NODE_RESULT_ACCEPTED"]);
  });
});

test("reject-execution-result and terminal worker results each commit one complete terminal state", async (context) => {
  await context.test("rejection", async () => {
    await withTemporaryDirectory(async (root) => {
      const { locator, packet } = await prepareSyntheticRunningExecution(root);
      const response = await runBuiltCli([
        "reject-execution-result", ...mutableFlags(locator),
        "--node", "audit-controller", "--task", packet.taskId, "--code", "EXECUTION_RESULT_FIELDS_INVALID",
      ], null);
      assert.equal(response.code, 0, `${response.stdout}${response.stderr}`);
      const run = readRun(locator);
      assert.equal(run.checkpoint.runState, "STOPPED");
      assert.deepEqual(run.events.slice(-2).map((event) => event.eventType), ["NODE_RESULT_REJECTED", "RUN_STOPPED"]);
      assert.equal(run.artifacts.length, 0);
    });
  });
  for (const terminal of [
    { status: "STOPPED" as const, reason: "RESULT_STATUS_STOPPED" as const, code: 0 },
    { status: "UNKNOWN" as const, reason: "RESULT_STATUS_UNKNOWN" as const, code: 2 },
  ]) {
    await context.test(terminal.status, async () => {
      await withTemporaryDirectory(async (root) => {
        const { locator, packet } = await prepareSyntheticRunningExecution(root);
        const response = await runBuiltCli(
          ["accept-execution-result", ...mutableFlags(locator)],
          JSON.stringify(terminalWorkerResult(packet, terminal.status, terminal.reason)),
        );
        assert.equal(response.code, terminal.code, `${response.stdout}${response.stderr}`);
        const run = readRun(locator);
        assert.equal(run.checkpoint.runState, terminal.status);
        assert.equal(run.artifacts.length, 1);
        assert.deepEqual(run.events.slice(-2).map((event) => event.eventType), [terminal.status === "STOPPED" ? "NODE_STOPPED" : "NODE_UNKNOWN", terminal.status === "STOPPED" ? "RUN_STOPPED" : "RUN_UNKNOWN"]);
      });
    });
  }
});

test("single-phase dispatch and unverified stop remain protocol violations without mutation", async () => {
  await withTemporaryDirectory(async (root) => {
    const locator = await prepareExecution(root);
    const packet = await prepareNode(locator, "audit-controller");
    const before = runIdentity(readRun(locator));
    const dispatch = await runBuiltCli([
      "record-execution-dispatch", ...mutableFlags(locator),
      "--node", "audit-controller", "--task", packet.taskId, "--thread-ref", "codex-agent:controller",
    ], null);
    assert.equal(dispatch.code, 3);
    assert.equal(JSON.parse(dispatch.stdout).error.code, "OPERATOR_PROTOCOL_VIOLATION");
    assert.deepEqual(runIdentity(readRun(locator)), before);
    const stop = await runBuiltCli(["stop-execution", ...mutableFlags(locator), "--code", "USER_CANCELLED"], null);
    assert.equal(stop.code, 3);
    assert.deepEqual(runIdentity(readRun(locator)), before);
  });
});

async function prepareExecution(root: string): Promise<CliLocator> {
  const workspace = join(root, "workspace");
  const appData = join(root, "app-data");
  await mkdir(workspace);
  await mkdir(appData);
  const response = await runBuiltCli([
    "prepare-execution", "--workspace", workspace, "--app-data-root", appData, "--controller-id", "cli-controller-001",
  ], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
  assert.equal(response.code, 0, `${response.stdout}${response.stderr}`);
  return JSON.parse(response.stdout) as CliLocator;
}

async function prepareNode(locator: CliLocator, nodeId: string): Promise<ExecutionTaskPacket> {
  const response = await runBuiltCli([
    "prepare-execution-node", "--database", locator.databasePath, "--run", locator.runId, "--node", nodeId,
  ], null);
  assert.equal(response.code, 0, `${response.stdout}${response.stderr}`);
  return (JSON.parse(response.stdout) as { taskPacket: ExecutionTaskPacket }).taskPacket;
}

async function prepareSyntheticRunningExecution(root: string): Promise<{ locator: CliLocator; packet: ExecutionTaskPacket }> {
  const locator = await prepareExecution(root);
  const packet = await prepareNode(locator, "audit-controller");
  const session = openMutableExecutionStoreSessionForRun({
    databasePath: locator.databasePath, runId: locator.runId, runtime: currentExecutionProcessRuntimeObservation(),
  });
  try {
    let run = loadTransactionalExecutionRun(session, locator.runId);
    run = commitExecutionGraphTransition(session, {
      runId: run.runId, authority: authority(run), transition: { nodeId: packet.nodeId, from: "READY", to: "DISPATCHING" },
      evidenceRefs: [], taskId: packet.taskId, threadRef: null, reasonCode: null, recordedAt: "2026-08-08T21:00:00.000Z",
    });
    commitExecutionGraphTransition(session, {
      runId: run.runId, authority: authority(run), transition: { nodeId: packet.nodeId, from: "DISPATCHING", to: "RUNNING" },
      evidenceRefs: [], taskId: packet.taskId, threadRef: "codex-agent:controller", reasonCode: null, recordedAt: "2026-08-08T21:00:01.000Z",
    });
  } finally {
    closeExecutionStoreSession(session);
  }
  return { locator, packet };
}

function readRun(locator: CliLocator): LoadedExecutionRun {
  const session = openReadOnlyExecutionStoreSessionForRun({
    databasePath: locator.databasePath, runId: locator.runId, runtime: currentExecutionProcessRuntimeObservation(),
  });
  try {
    return loadTransactionalExecutionRun(session, locator.runId);
  } finally {
    closeExecutionStoreSession(session);
  }
}

function readRuntimeHostSession(locator: CliLocator): string {
  const session = openReadOnlyExecutionStoreSessionForRun({
    databasePath: locator.databasePath, runId: locator.runId, runtime: currentExecutionProcessRuntimeObservation(),
  });
  try {
    return session.runtimeReceipt.hostSessionId;
  } finally {
    closeExecutionStoreSession(session);
  }
}

function authority(run: LoadedExecutionRun): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId, fencingToken: run.fencingToken, runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash, expectedGraphRevision: run.graph.graphRevision,
  };
}

function mutableFlags(locator: CliLocator): readonly string[] {
  return ["--database", locator.databasePath, "--run", locator.runId, "--controller-id", locator.controllerId, "--fencing-token", String(locator.fencingToken)];
}

function runIdentity(run: LoadedExecutionRun) {
  return { graph: run.graph.graphHash, checkpoint: run.checkpoint, events: run.events.map((event) => event.eventHash), artifacts: run.artifacts };
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
    resultVersion: "2.0", runId: packet.runId, taskId: packet.taskId, nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash, graphRevision: packet.graphRevision, status, reasonCode,
    summary: `Worker returned ${status}.`, claims: [], artifactRefs: [], evidenceRefs: [],
    unknowns: status === "UNKNOWN" ? ["Worker completion could not be determined."] : [],
    conflicts: [], followupRequest: null, observedLimits: [],
  };
}

function runBuiltCli(argv: readonly string[], stdin: string | null): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return runBuiltCliWithThreadId(argv, stdin, cliThreadId);
}

function runBuiltCliWithThreadId(argv: readonly string[], stdin: string | null, threadId: string | undefined): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, rejectResult) => {
    const env = { ...process.env };
    if (threadId === undefined) delete env.CODEX_THREAD_ID;
    else env.CODEX_THREAD_ID = threadId;
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], { cwd: process.cwd(), env, stdio: ["pipe", "pipe", "pipe"] });
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

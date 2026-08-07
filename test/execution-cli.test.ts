import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";

import type { ExecutionTaskPacket } from "../src/execution/types.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

test("built execution CLI prepares, dispatches, and accepts one Personal read-only result", async () => {
  await withTemporaryDirectory(async (root) => {
    const prepared = await runBuiltCli(["prepare-execution", "--personal-root", root], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
    assert.equal(prepared.code, 0);
    assert.deepEqual(JSON.parse(prepared.stdout), { state: "READY", runId: referenceEnvelopeInput.runId });

    const runDirectory = join(root, referenceEnvelopeInput.runId);
    const packetResponse = await runBuiltCli(["prepare-execution-node", "--run", runDirectory, "--node", "audit-controller"], null);
    assert.equal(packetResponse.code, 0);
    const packet = JSON.parse(packetResponse.stdout) as { taskPacket: ExecutionTaskPacket };
    assert.equal(packet.taskPacket.packetVersion, "1.0");

    const dispatched = await runBuiltCli(["record-execution-dispatch", "--run", runDirectory, "--node", "audit-controller", "--task", packet.taskPacket.taskId, "--thread-ref", "codex-agent:controller"], null);
    assert.equal(dispatched.code, 0);
    assert.deepEqual(JSON.parse(dispatched.stdout), { state: "RUNNING", nodeId: "audit-controller" });

    const accepted = await runBuiltCli(
      ["accept-execution-result", "--run", runDirectory],
      JSON.stringify({
        resultVersion: "1.0",
        runId: packet.taskPacket.runId,
        taskId: packet.taskPacket.taskId,
        nodeId: packet.taskPacket.nodeId,
        envelopeHash: packet.taskPacket.envelopeHash,
        graphRevision: packet.taskPacket.graphRevision,
        status: "READY_FOR_VALIDATION",
        summary: "Controller contract evidence is available.",
        claims: [{ claimId: "claim-controller", criterionId: "criterion-controller", statement: "Controller assets are traceable to repository evidence.", state: "SUPPORTED", evidenceRefs: ["evidence-controller"] }],
        artifactRefs: [],
        evidenceRefs: [{ evidenceId: "evidence-controller", kind: "REPOSITORY_FILE", sourceId: "repo", sourceRevision: "a".repeat(40), locator: { path: "src/controller/types.ts", lineStart: 20, lineEnd: 30 }, sha256: null }],
        unknowns: [],
        conflicts: [],
        followupRequest: null,
        observedLimits: [],
      }),
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
      resultVersion: "1.0",
      runId: node.taskPacket.runId,
      taskId: node.taskPacket.taskId,
      nodeId: node.taskPacket.nodeId,
      envelopeHash: node.taskPacket.envelopeHash,
      graphRevision: node.taskPacket.graphRevision,
      status: "READY_FOR_VALIDATION",
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

test("built execution CLI rejects a malformed worker result without persisting it and stops the run", async () => {
  await withTemporaryDirectory(async (root) => {
    const prepared = await runBuiltCli(["prepare-execution", "--personal-root", root], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
    assert.equal(prepared.code, 0);

    const runDirectory = join(root, referenceEnvelopeInput.runId);
    const packetResponse = await runBuiltCli(["prepare-execution-node", "--run", runDirectory, "--node", "audit-controller"], null);
    const packet = JSON.parse(packetResponse.stdout) as { taskPacket: ExecutionTaskPacket };
    const dispatched = await runBuiltCli(["record-execution-dispatch", "--run", runDirectory, "--node", "audit-controller", "--task", packet.taskPacket.taskId, "--thread-ref", "codex-agent:controller"], null);
    assert.equal(dispatched.code, 0);

    const malformed = await runBuiltCli(["accept-execution-result", "--run", runDirectory], JSON.stringify({ resultEnvelopeVersion: "1.0" }));
    assert.equal(malformed.code, 3);
    assert.deepEqual(JSON.parse(malformed.stdout), { state: "STOPPED", error: { code: "EXECUTION_RESULT_FIELDS_INVALID" } });

    const rejected = await runBuiltCli(
      ["reject-execution-result", "--run", runDirectory, "--node", "audit-controller", "--task", packet.taskPacket.taskId, "--code", "EXECUTION_RESULT_FIELDS_INVALID"],
      null,
    );
    assert.equal(rejected.code, 0, `${rejected.stdout}${rejected.stderr}`);
    assert.deepEqual(JSON.parse(rejected.stdout), { state: "STOPPED", nodeId: "audit-controller", code: "EXECUTION_RESULT_FIELDS_INVALID" });

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
      { eventType: "NODE_RESULT_REJECTED", reasonCode: "EXECUTION_RESULT_FIELDS_INVALID" },
      { eventType: "RUN_STOPPED", reasonCode: "EXECUTION_RESULT_FIELDS_INVALID" },
    ]);
  });
});

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

import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { transitionExecutionNode } from "../src/execution/graph.js";
import { canonicalExecutionJson, executionDigest } from "../src/execution/identity.js";
import { createExecutionEvent, replayExecutionLedger } from "../src/execution/ledger.js";
import {
  auditExecutionStorage,
  closeExecutionRecoverySession,
  openExecutionRecoverySession,
} from "../src/execution/persistence/recovery.js";
import { currentExecutionProcessRuntimeObservation } from "../src/execution/runtime-receipt.js";
import {
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("process death at every mutation boundary yields only the previous or next committed prefix", async (context) => {
  const stages = ["EVENT_INSERT", "PROJECTION_UPDATE", "ARTIFACT_INSERT", "QUOTA_UPDATE", "COMMIT"] as const;
  for (const stage of stages) {
    await context.test(stage, async (subcontext) => {
      const fixture = await createTransactionalExecutionStoreFixture();
      subcontext.after(fixture.cleanup);
      createTransactionalExecutionRun(fixture.session, {
        controllerId: "controller-primary-001",
        envelope: fixture.envelope,
        graph: fixture.graph,
        recordedAt: "2026-08-08T17:30:00.000Z",
      });
      const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
      const payload = crashPayload(fixture, before, stage);
      await runCrashWorker(payload);

      const recovery = await openExecutionRecoverySession({
        workspaceRoot: fixture.workspaceRoot,
        appDataRoot: fixture.appDataRoot,
        runtime: currentExecutionProcessRuntimeObservation(),
        controllerId: before.controllerId,
        hostSessionId: fixture.session.runtimeReceipt.hostSessionId,
        observedAt: "2026-08-08T17:31:00.000Z",
      });
      try {
        assert.equal(auditExecutionStorage(recovery).disposition, "HEALTHY");
      } finally {
        closeExecutionRecoverySession(recovery);
      }
      const reopened = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
      if (stage === "COMMIT") {
        assert.equal(reopened.events.length, 3);
        assert.equal(reopened.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "DISPATCHING");
        assert.equal(reopened.artifacts.some((artifact) => artifact.artifactId === "crash-boundary-artifact"), true);
      } else {
        assert.equal(reopened.events.length, 2);
        assert.equal(reopened.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "READY");
        assert.deepEqual(reopened.artifacts, []);
      }
    });
  }
});

type CrashStage = "EVENT_INSERT" | "PROJECTION_UPDATE" | "ARTIFACT_INSERT" | "QUOTA_UPDATE" | "COMMIT";

function crashPayload(
  fixture: Awaited<ReturnType<typeof createTransactionalExecutionStoreFixture>>,
  before: ReturnType<typeof loadTransactionalExecutionRun>,
  stage: CrashStage,
) {
  const graph = transitionExecutionNode(
    before.graph,
    { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
    before.envelope,
  );
  const event = createExecutionEvent({
    runId: before.runId,
    eventType: "DISPATCH_INTENDED",
    nodeId: "audit-controller",
    beforeState: "READY",
    afterState: "DISPATCHING",
    graphRevision: graph.graphRevision,
    evidenceRefs: [],
    taskId: "task-audit-controller",
    threadRef: null,
    reasonCode: null,
  }, 3, before.checkpoint.lastEventHash, "2026-08-08T17:30:01.000Z");
  const events = [...before.events, event];
  const checkpoint = replayExecutionLedger(events, before.envelope, graph);
  const eventJson = canonicalExecutionJson(event);
  const graphJson = canonicalExecutionJson(graph);
  const checkpointJson = canonicalExecutionJson(checkpoint);
  const artifactBody = Buffer.from("synthetic crash boundary artifact", "utf8");
  const quota = withSqliteTestDatabase(fixture.session.databasePath, (database) => database.prepare<
    [string],
    { ledger_bytes: number; artifact_bytes: number }
  >("SELECT ledger_bytes, artifact_bytes FROM quota_usage WHERE run_id = ?").get(before.runId));
  if (quota === undefined) throw new Error("crash fixture quota is missing");
  return {
    stage,
    databasePath: fixture.session.databasePath,
    runId: before.runId,
    runtimeReceiptId: fixture.session.runtimeReceipt.receiptId,
    controllerId: before.controllerId,
    fencingToken: before.fencingToken,
    event: { ...event, canonicalJson: eventJson, byteLength: Buffer.byteLength(eventJson, "utf8") },
    graphJson,
    graphSha256: executionDigest(graph),
    checkpointJson,
    checkpointSha256: executionDigest(checkpoint),
    runState: checkpoint.runState,
    graphRevision: graph.graphRevision,
    artifactBodyBase64: artifactBody.toString("base64"),
    artifactSha256: createHash("sha256").update(artifactBody).digest("hex"),
    priorLedgerBytes: quota.ledger_bytes,
    priorArtifactBytes: quota.artifact_bytes,
  };
}

async function runCrashWorker(payload: ReturnType<typeof crashPayload>): Promise<void> {
  const workerPath = fileURLToPath(new URL("./fixtures/execution/sqlite-crash-worker.js", import.meta.url));
  const child = fork(workerPath, [], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.on("message", (message) => {
      if (message !== null && typeof message === "object" && "type" in message && message.type === "READY") {
        child.send({ type: "START", payload });
      }
    });
    child.once("exit", (code, signal) => {
      if (code === 0 && signal === null) reject(new Error("crash worker exited normally"));
      else resolve();
    });
  });
  assert.equal(stderr, "");
}

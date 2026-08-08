import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { currentExecutionProcessRuntimeObservation } from "../src/execution/runtime-receipt.js";
import {
  closeExecutionStoreSession,
  openExecutionStoreSession,
} from "../src/execution/persistence/session.js";
import {
  commitExecutionGraphTransition,
  readExecutionControllerLease,
} from "../src/execution/persistence/mutations.js";
import type {
  CommitExecutionGraphTransitionRequest,
  ExecutionMutationAuthority,
} from "../src/execution/persistence/mutations.js";
import {
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("fenced graph transition commits event, graph, checkpoint, quota, and lease together", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const request = transitionRequest(fixture.envelope.runId, authorityFor(before), "2026-08-08T14:01:00.000Z");

  const committed = commitExecutionGraphTransition(fixture.session, request);
  const lease = readExecutionControllerLease(fixture.session, fixture.envelope.runId);

  assert.equal(committed.events.length, 3);
  assert.equal(committed.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "DISPATCHING");
  assert.equal(committed.checkpoint.lastEventHash, committed.events.at(-1)?.eventHash);
  assert.equal(lease.controllerId, request.authority.controllerId);
  assert.equal(lease.fencingToken, request.authority.fencingToken);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    const event = database.prepare<[string, number], { runtime_receipt_id: string; fencing_token: number }>(
      "SELECT runtime_receipt_id, fencing_token FROM execution_events WHERE run_id = ? AND sequence = ?",
    ).get(fixture.envelope.runId, 3);
    assert.deepEqual(event, {
      runtime_receipt_id: request.authority.runtimeReceiptId,
      fencing_token: request.authority.fencingToken,
    });
  });
});

test("stale ledger head and graph revision commit no mutation", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);

  assert.throws(
    () => commitExecutionGraphTransition(fixture.session, transitionRequest(fixture.envelope.runId, {
      ...authorityFor(before),
      expectedLedgerHead: "f".repeat(64),
    }, "2026-08-08T14:02:00.000Z")),
    /SNAPSHOT_DIVERGED/u,
  );
  assert.throws(
    () => commitExecutionGraphTransition(fixture.session, transitionRequest(fixture.envelope.runId, {
      ...authorityFor(before),
      expectedGraphRevision: before.graph.graphRevision + 1,
    }, "2026-08-08T14:02:01.000Z")),
    /SNAPSHOT_DIVERGED/u,
  );
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, 2);
});

test("wrong controller, stale fencing token, and unreconciled session are rejected", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const authority = authorityFor(before);

  assert.throws(
    () => commitExecutionGraphTransition(fixture.session, transitionRequest(fixture.envelope.runId, {
      ...authority,
      controllerId: "controller-secondary-001",
    }, "2026-08-08T14:03:00.000Z")),
    /CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED/u,
  );
  assert.throws(
    () => commitExecutionGraphTransition(fixture.session, transitionRequest(fixture.envelope.runId, {
      ...authority,
      fencingToken: authority.fencingToken + 1,
    }, "2026-08-08T14:03:01.000Z")),
    /STALE_FENCING_TOKEN/u,
  );

  const secondSession = await openExecutionStoreSession({
    workspaceRoot: fixture.workspaceRoot,
    appDataRoot: fixture.appDataRoot,
    runtime: currentExecutionProcessRuntimeObservation(),
    kernelRevision: "d".repeat(40),
    dependencyLockPath: fileURLToPath(new URL("../../package-lock.json", import.meta.url)),
    sessionId: "session-concurrent-second-001",
    hostSessionId: "codex-session-concurrent-second-001",
    observedAt: "2026-08-08T14:03:02.000Z",
  });
  try {
    assert.throws(
      () => commitExecutionGraphTransition(secondSession, transitionRequest(fixture.envelope.runId, {
        ...authority,
        controllerId: "controller-secondary-001",
        runtimeReceiptId: secondSession.runtimeReceipt.receiptId,
      }, "2026-08-08T14:03:03.000Z")),
      /CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED/u,
    );
  } finally {
    closeExecutionStoreSession(secondSession);
  }
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, 2);
});

test("SQLite abort after event insert rolls back the complete graph transition", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.exec(`
      CREATE TRIGGER test_projection_abort
      BEFORE UPDATE ON run_projections
      BEGIN
        SELECT RAISE(ABORT, 'forced projection failure');
      END;
    `);
  });

  assert.throws(
    () => commitExecutionGraphTransition(
      fixture.session,
      transitionRequest(fixture.envelope.runId, authorityFor(before), "2026-08-08T14:04:00.000Z"),
    ),
    /EXECUTION_SQLITE_ERROR/u,
  );
  const preserved = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(preserved.events.length, 2);
  assert.equal(preserved.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "READY");
});

test("two processes racing on one ledger head commit exactly one next prefix", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const request = transitionRequest(fixture.envelope.runId, authorityFor(before), "2026-08-08T14:05:00.000Z");
  const payload = {
    session: {
      workspaceId: fixture.session.workspaceId,
      workspaceIdentityDigest: fixture.session.workspaceIdentityDigest,
      databasePath: fixture.session.databasePath,
      runtimeReceipt: fixture.session.runtimeReceipt,
      storagePolicy: fixture.session.storagePolicy,
    },
    request,
  };
  const workerPath = fileURLToPath(new URL("./fixtures/execution/sqlite-writer-worker.js", import.meta.url));
  const first = startWriter(workerPath);
  const second = startWriter(workerPath);
  await Promise.all([first.ready, second.ready]);
  first.child.send({ type: "START", payload });
  second.child.send({ type: "START", payload });
  const outcomes = await Promise.all([first.outcome, second.outcome]);

  assert.equal(outcomes.filter((outcome) => outcome.ok).length, 1);
  const rejected = outcomes.find((outcome) => !outcome.ok);
  assert.ok(rejected !== undefined && ["WRITER_CONFLICT", "SNAPSHOT_DIVERGED"].includes(rejected.code ?? ""));
  const loaded = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(loaded.events.length, 3);
  assert.deepEqual(loaded.events.map((event) => event.sequence), [1, 2, 3]);
});

async function createdRunFixture() {
  const fixture = await createTransactionalExecutionStoreFixture();
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T14:00:00.000Z",
  });
  return fixture;
}

function authorityFor(run: ReturnType<typeof loadTransactionalExecutionRun>): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId,
    fencingToken: run.fencingToken,
    runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash,
    expectedGraphRevision: run.graph.graphRevision,
  };
}

function transitionRequest(
  runId: string,
  authority: ExecutionMutationAuthority,
  recordedAt: string,
): CommitExecutionGraphTransitionRequest {
  return {
    runId,
    authority,
    transition: { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
    evidenceRefs: [],
    taskId: "task-audit-controller",
    threadRef: null,
    reasonCode: null,
    recordedAt,
  };
}

interface WriterOutcome {
  ok: boolean;
  code?: string;
}

function startWriter(workerPath: string) {
  const child = fork(workerPath, [], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
  const ready = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.on("message", (message) => {
      if (isMessage(message, "READY")) resolve();
    });
  });
  const outcome = new Promise<WriterOutcome>((resolve, reject) => {
    child.once("error", reject);
    child.on("message", (message) => {
      if (isMessage(message, "RESULT")) {
        const code = typeof message.code === "string" ? message.code : undefined;
        resolve(code === undefined ? { ok: message.ok === true } : { ok: message.ok === true, code });
      }
    });
    child.once("exit", (code) => {
      if (code !== 0) reject(new Error(`writer exited with ${code}: ${stderr}`));
    });
  });
  return { child, ready, outcome };
}

function isMessage(value: unknown, type: string): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && "type" in value && value.type === type;
}

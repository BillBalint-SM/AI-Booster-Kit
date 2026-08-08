import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { currentExecutionProcessRuntimeObservation } from "../src/execution/runtime-receipt.js";
import { canonicalExecutionJson, executionDigest } from "../src/execution/identity.js";
import {
  closeExecutionStoreSession,
  openExecutionStoreSession,
} from "../src/execution/persistence/session.js";
import {
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";
import type { ExecutionEvent } from "../src/execution/types.js";

type SqliteTestDatabase = Parameters<Parameters<typeof withSqliteTestDatabase>[1]>[0];

function countRows(database: SqliteTestDatabase, tableName: string): number {
  return database.prepare<[], { count: number }>(`SELECT count(*) AS count FROM ${tableName}`).get()?.count ?? 0;
}

test("unsupported runtime creates no application data directory or database", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "transactional-runtime-reject-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "absent-app-data");
  await mkdir(workspaceRoot);
  const runtime = currentExecutionProcessRuntimeObservation();
  runtime.nodeVersion = "25.9.0";
  runtime.ltsName = false;

  await assert.rejects(
    () => openExecutionStoreSession({
      workspaceRoot,
      appDataRoot,
      runtime,
      kernelRevision: "d".repeat(40),
      dependencyLockPath: resolve("package-lock.json"),
      sessionId: "session-runtime-rejected-001",
      hostSessionId: "codex-session-runtime-rejected-001",
      observedAt: "2026-08-08T13:50:00.000Z",
    }),
    /UNSUPPORTED_RUNTIME_VERSION/u,
  );
  await assert.rejects(() => access(appDataRoot));
});

test("admitted session creates one workspace database and one canonical run transaction", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  const created = createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  });
  const loaded = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);

  assert.equal(created.workspaceId, fixture.session.workspaceId);
  assert.equal(created.databasePath, fixture.session.databasePath);
  assert.equal(created.runId, fixture.envelope.runId);
  assert.equal(created.controllerId, "controller-primary-001");
  assert.equal(created.fencingToken, 1);
  assert.equal(created.runtimeReceiptId, fixture.session.runtimeReceipt.receiptId);
  assert.equal(loaded.events.length, 2);
  assert.deepEqual(loaded.events.map((event: ExecutionEvent) => event.eventType), ["RUN_CREATED", "GRAPH_ACCEPTED"]);
  assert.equal(loaded.graph.graphHash, fixture.graph.graphHash);
  assert.equal(loaded.checkpoint.runState, "READY");
  assert.equal(loaded.checkpoint.lastEventHash, created.lastEventHash);
  assert.deepEqual(loaded.artifacts, []);
  assert.deepEqual(loaded.acceptedResults, []);
  assert.equal(loaded.finalHandoff, null);

  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(countRows(database, "runtime_receipts"), 1);
    assert.equal(countRows(database, "runs"), 1);
    assert.equal(countRows(database, "controller_leases"), 1);
    assert.equal(countRows(database, "execution_events"), 2);
    assert.equal(countRows(database, "run_projections"), 1);
    assert.equal(countRows(database, "quota_usage"), 1);
  });
});

test("duplicate run creation commits no second prefix", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  const request = {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  };
  createTransactionalExecutionRun(fixture.session, request);
  assert.throws(() => createTransactionalExecutionRun(fixture.session, request), /TARGET_ALREADY_EXISTS/u);
  const loaded = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(loaded.events.length, 2);
});

test("session reopen preserves the canonical run and appends only a new immutable session receipt", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  const created = createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  });
  closeExecutionStoreSession(fixture.session);
  const reopened = await openExecutionStoreSession({
    workspaceRoot: fixture.workspaceRoot,
    appDataRoot: fixture.appDataRoot,
    runtime: currentExecutionProcessRuntimeObservation(),
    kernelRevision: "d".repeat(40),
    dependencyLockPath: resolve("package-lock.json"),
    sessionId: "session-transactional-store-002",
    hostSessionId: "codex-session-transactional-store-002",
    observedAt: "2026-08-08T13:52:00.000Z",
  });
  context.after(async () => {
    closeExecutionStoreSession(reopened);
    await rm(fixture.root, { recursive: true, force: true });
  });

  const loaded = loadTransactionalExecutionRun(reopened, fixture.envelope.runId);
  assert.equal(loaded.checkpoint.lastEventHash, created.lastEventHash);
  assert.equal(loaded.runtimeReceiptId, created.runtimeReceiptId);
  withSqliteTestDatabase(reopened.databasePath, (database) => {
    assert.equal(countRows(database, "runtime_receipts"), 2);
    assert.equal(countRows(database, "execution_events"), 2);
  });
});

test("canonical loader rejects projection digest divergence", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  });
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.prepare("UPDATE run_projections SET graph_sha256 = ? WHERE run_id = ?").run("f".repeat(64), fixture.envelope.runId);
  });

  assert.throws(
    () => loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId),
    /SNAPSHOT_DIVERGED/u,
  );
});

test("canonical loader rejects a run whose immutable runtime receipt is missing", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  });
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.pragma("foreign_keys = OFF");
    database.prepare("UPDATE runs SET created_receipt_id = ? WHERE run_id = ?").run(
      "f".repeat(64),
      fixture.envelope.runId,
    );
  });

  assert.throws(
    () => loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId),
    /SNAPSHOT_DIVERGED/u,
  );
});

test("canonical loader rejects a foreign workspace identity after session admission", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  });
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.prepare("UPDATE storage_metadata SET workspace_id = ? WHERE singleton = 1").run("0".repeat(32));
  });

  assert.throws(
    () => loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId),
    /SNAPSHOT_DIVERGED/u,
  );
});

test("canonical loader rejects a self-consistent checkpoint that the ledger cannot reproduce", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T13:51:00.000Z",
  });
  const loaded = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const impossibleCheckpoint = { ...loaded.checkpoint, runState: "COMPLETE" as const };
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.prepare(`
      UPDATE run_projections
      SET checkpoint_json = ?, checkpoint_sha256 = ?
      WHERE run_id = ?
    `).run(
      canonicalExecutionJson(impossibleCheckpoint),
      executionDigest(impossibleCheckpoint),
      fixture.envelope.runId,
    );
  });

  assert.throws(
    () => loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId),
    /SNAPSHOT_DIVERGED/u,
  );
});

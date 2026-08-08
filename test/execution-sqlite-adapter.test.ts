import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  closeExecutionSqliteDatabase,
  createExecutionSqliteDatabase,
  inspectExecutionSqliteConfiguration,
  observeExecutionSqliteDriver,
  openExistingExecutionSqliteDatabase,
  openReadOnlyExecutionSqliteDatabase,
  runImmediateExecutionTransaction,
} from "../src/execution/persistence/sqlite-adapter.js";
import { requiredExecutionTables } from "../src/execution/persistence/schema.js";
import { parseExecutionPersistencePolicy, executionPersistencePolicy } from "../src/execution/runtime-policy.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("SQLite driver observation binds the packaged platform prebuild and engine", async () => {
  const observation = await observeExecutionSqliteDriver();

  assert.deepEqual({ name: observation.name, version: observation.version }, { name: "better-sqlite3", version: "13.0.3" });
  assert.match(observation.bindingSha256, /^[a-f0-9]{64}$/u);
  assert.match(observation.sqliteVersion, /^3\.\d+\.\d+$/u);
});

test("SQLite adapter creates schema version 1 with exact durability configuration", async (context) => {
  const fixture = await databaseFixture();
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const database = createExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  context.after(async () => {
    closeIfOpen(database);
    await rm(fixture.root, { recursive: true, force: true });
  });

  const inspection = inspectExecutionSqliteConfiguration(database);
  assert.equal(inspection.journalMode, "delete");
  assert.equal(inspection.synchronous, 2);
  assert.equal(inspection.foreignKeys, 1);
  assert.equal(inspection.trustedSchema, 0);
  assert.equal(inspection.busyTimeout, 0);
  assert.equal(inspection.userVersion, 1);
  assert.equal(inspection.maxPageCount, Math.floor(policy.limits.maxWorkspaceBytes / inspection.pageSize));
  assert.deepEqual(inspection.tables, [...requiredExecutionTables].sort());
  assert.deepEqual(inspection.triggers, [
    "execution_events_no_delete",
    "execution_events_no_update",
    "runtime_receipts_no_delete",
    "runtime_receipts_no_update",
  ]);
  assert.ok(inspection.compileMaxLength >= policy.limits.maxCanonicalBlobBytes);
  assert.ok(inspection.compileMaxSqlLength >= policy.limits.maxPreparedSqlBytes);
});

test("SQLite adapter supports existing and read-only opens and closes deterministically", async (context) => {
  const fixture = await databaseFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const created = createExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  closeExecutionSqliteDatabase(created);

  const existing = openExistingExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  assert.equal(inspectExecutionSqliteConfiguration(existing).userVersion, 1);
  closeExecutionSqliteDatabase(existing);

  const readonly = openReadOnlyExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  assert.equal(inspectExecutionSqliteConfiguration(readonly).userVersion, 1);
  closeExecutionSqliteDatabase(readonly);
  assert.throws(() => closeExecutionSqliteDatabase(readonly), /EXECUTION_SQLITE_CLOSED/u);
});

test("SQLite append-only triggers reject event and runtime receipt mutation", async (context) => {
  const fixture = await databaseFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const database = createExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  closeExecutionSqliteDatabase(database);

  withSqliteTestDatabase(fixture.databasePath, (native) => {
    native.pragma("foreign_keys = OFF");
    native.prepare("INSERT INTO runtime_receipts (receipt_id, session_id, lane, canonical_json, receipt_sha256, observed_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run("r".repeat(64), "session-test", "CONFORMANCE_ONLY", "{}", "r".repeat(64), "2026-08-08T13:40:00.000Z");
    native.prepare("INSERT INTO execution_events (run_id, sequence, event_hash, previous_event_hash, event_type, node_id, canonical_json, byte_length, runtime_receipt_id, fencing_token, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("run-test", 1, "e".repeat(64), null, "RUN_CREATED", null, "{}", 2, "r".repeat(64), 1, "2026-08-08T13:40:00.000Z");

    assert.throws(() => native.prepare("UPDATE execution_events SET canonical_json = ? WHERE run_id = ? AND sequence = ?").run("{\"changed\":true}", "run-test", 1), /append-only/u);
    assert.throws(() => native.prepare("DELETE FROM execution_events WHERE run_id = ? AND sequence = ?").run("run-test", 1), /append-only/u);
    assert.throws(() => native.prepare("UPDATE runtime_receipts SET canonical_json = ? WHERE receipt_id = ?").run("{\"changed\":true}", "r".repeat(64)), /immutable/u);
    assert.throws(() => native.prepare("DELETE FROM runtime_receipts WHERE receipt_id = ?").run("r".repeat(64)), /immutable/u);
  });
});

test("SQLite adapter rejects unsupported newer schema", async (context) => {
  const fixture = await databaseFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const database = createExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  closeExecutionSqliteDatabase(database);
  withSqliteTestDatabase(fixture.databasePath, (native) => native.pragma("user_version = 2"));

  assert.throws(
    () => openExistingExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy }),
    /UNSUPPORTED_SCHEMA_VERSION/u,
  );
});

test("SQLite adapter normalizes an immediate writer race without waiting", async (context) => {
  const fixture = await databaseFixture();
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const first = createExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  const second = openExistingExecutionSqliteDatabase({ databasePath: fixture.databasePath, storagePolicy: policy });
  context.after(async () => {
    closeIfOpen(first);
    closeIfOpen(second);
    await rm(fixture.root, { recursive: true, force: true });
  });

  runImmediateExecutionTransaction(first, () => {
    assert.throws(
      () => runImmediateExecutionTransaction(second, () => undefined),
      /WRITER_CONFLICT/u,
    );
  });
});

async function databaseFixture() {
  const root = await mkdtemp(join(tmpdir(), "execution-sqlite-adapter-"));
  const databaseDirectory = join(root, "database");
  await mkdir(databaseDirectory);
  return { root, databasePath: join(databaseDirectory, "execution.sqlite") };
}

function closeIfOpen(database: Parameters<typeof closeExecutionSqliteDatabase>[0]): void {
  try {
    closeExecutionSqliteDatabase(database);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("EXECUTION_SQLITE_CLOSED")) throw error;
  }
}

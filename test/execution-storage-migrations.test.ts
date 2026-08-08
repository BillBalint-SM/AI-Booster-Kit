import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { executionDigest } from "../src/execution/identity.js";
import { migrateExecutionStorage } from "../src/execution/persistence/migrations.js";
import type { ExecutionMigrationStep } from "../src/execution/persistence/migrations.js";
import { createTransactionalExecutionRun } from "../src/execution/persistence/store.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("additive migration runs only after a verified backup and commits version, SQL, and receipt together", async (context) => {
  const fixture = await runFixture();
  context.after(fixture.cleanup);
  const backupDirectory = join(fixture.root, "migration-backups");
  await mkdir(backupDirectory);
  const step = migrationStep(1, 2, "ADDITIVE", ["CREATE TABLE migration_probe (id INTEGER PRIMARY KEY) STRICT"]);
  const receipt = await migrateExecutionStorage(fixture.session, {
    targetVersion: 2,
    registry: [step],
    backupDirectory,
    destructiveApproval: false,
    recordedAt: "2026-08-08T18:10:00.000Z",
  });
  assert.equal(receipt.disposition, "SUCCEEDED");
  assert.equal(receipt.fromVersion, 1);
  assert.equal(receipt.toVersion, 2);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(database.pragma("user_version", { simple: true }), 2);
    assert.equal(database.prepare("SELECT count(*) FROM migration_probe").pluck().get(), 0);
    assert.equal(database.prepare("SELECT count(*) FROM migration_receipts").pluck().get(), 1);
    assert.equal(database.prepare("SELECT count(*) FROM backup_receipts").pluck().get(), 1);
  });
});

test("backup failure and SQL failure cannot expose a migrated schema or partial rows", async (context) => {
  const backupFailure = await runFixture();
  context.after(backupFailure.cleanup);
  const parentFile = join(backupFailure.root, "not-directory");
  await writeFile(parentFile, "blocker", { flag: "wx" });
  const validStep = migrationStep(1, 2, "ADDITIVE", ["CREATE TABLE migration_probe (id INTEGER PRIMARY KEY) STRICT"]);
  await assert.rejects(
    () => migrateExecutionStorage(backupFailure.session, {
      targetVersion: 2,
      registry: [validStep],
      backupDirectory: parentFile,
      destructiveApproval: false,
      recordedAt: "2026-08-08T18:11:00.000Z",
    }),
    /BACKUP_INVALID/u,
  );
  withSqliteTestDatabase(backupFailure.session.databasePath, (database) => {
    assert.equal(database.pragma("user_version", { simple: true }), 1);
    assert.equal(database.prepare("SELECT count(*) FROM sqlite_schema WHERE name = 'migration_probe'").pluck().get(), 0);
  });

  const sqlFailure = await runFixture();
  context.after(sqlFailure.cleanup);
  const backupDirectory = join(sqlFailure.root, "sql-failure-backups");
  await mkdir(backupDirectory);
  const brokenStep = migrationStep(1, 2, "ADDITIVE", [
    "CREATE TABLE migration_probe (id INTEGER PRIMARY KEY) STRICT",
    "INSERT INTO table_that_does_not_exist VALUES (1)",
  ]);
  await assert.rejects(
    () => migrateExecutionStorage(sqlFailure.session, {
      targetVersion: 2,
      registry: [brokenStep],
      backupDirectory,
      destructiveApproval: false,
      recordedAt: "2026-08-08T18:11:01.000Z",
    }),
    /MIGRATION_FAILED/u,
  );
  withSqliteTestDatabase(sqlFailure.session.databasePath, (database) => {
    assert.equal(database.pragma("user_version", { simple: true }), 1);
    assert.equal(database.prepare("SELECT count(*) FROM sqlite_schema WHERE name = 'migration_probe'").pluck().get(), 0);
    assert.equal(database.prepare("SELECT count(*) FROM migration_receipts").pluck().get(), 0);
  });
});

test("migration rejects newer schemas, gaps, changed digests, and destructive steps without approval", async (context) => {
  const cases = [
    { name: "gap", registry: [] as ExecutionMigrationStep[], target: 3, approval: false, setup: (_path: string) => undefined },
    { name: "digest", registry: [{ ...migrationStep(1, 2, "ADDITIVE", ["CREATE TABLE x (id INTEGER) STRICT"]), digest: "f".repeat(64) }], target: 2, approval: false, setup: (_path: string) => undefined },
    { name: "destructive", registry: [migrationStep(1, 2, "DESTRUCTIVE", ["DROP TABLE operation_intents"])], target: 2, approval: false, setup: (_path: string) => undefined },
    { name: "newer", registry: [] as ExecutionMigrationStep[], target: 2, approval: false, setup: (path: string) => withSqliteTestDatabase(path, (database) => { database.pragma("user_version = 99"); }) },
  ];
  for (const migrationCase of cases) {
    await context.test(migrationCase.name, async (subcontext) => {
      const fixture = await runFixture();
      subcontext.after(fixture.cleanup);
      migrationCase.setup(fixture.session.databasePath);
      const backupDirectory = join(fixture.root, `backup-${migrationCase.name}`);
      await mkdir(backupDirectory);
      await assert.rejects(
        () => migrateExecutionStorage(fixture.session, {
          targetVersion: migrationCase.target,
          registry: migrationCase.registry,
          backupDirectory,
          destructiveApproval: migrationCase.approval,
          recordedAt: "2026-08-08T18:12:00.000Z",
        }),
        /MIGRATION_FAILED|UNSUPPORTED_SCHEMA_VERSION/u,
      );
    });
  }
});

function migrationStep(
  fromVersion: number,
  toVersion: number,
  risk: "ADDITIVE" | "DESTRUCTIVE",
  statements: readonly string[],
): ExecutionMigrationStep {
  const body = { fromVersion, toVersion, risk, statements };
  return { ...body, digest: executionDigest(body) };
}

async function runFixture() {
  const fixture = await createTransactionalExecutionStoreFixture();
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T18:09:00.000Z",
  });
  return fixture;
}

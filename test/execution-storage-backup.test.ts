import assert from "node:assert/strict";
import { mkdir, readFile, truncate, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import {
  createVerifiedExecutionBackup,
  stageExecutionRestore,
} from "../src/execution/persistence/backup.js";
import {
  createTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import type { ExecutionStoreSession } from "../src/execution/persistence/session.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("real SQLite backup is independently verified, registered, and stage-restorable", async (context) => {
  const fixture = await runFixture();
  context.after(fixture.cleanup);
  const backupDirectory = join(fixture.root, "backups");
  await mkdir(backupDirectory);
  const backupPath = join(backupDirectory, "execution-backup.sqlite");
  const receipt = await createVerifiedExecutionBackup(fixture.session, {
    destinationDatabasePath: backupPath,
    observedAt: "2026-08-08T18:00:00.000Z",
  });

  assert.equal(receipt.disposition, "VALID");
  assert.equal(receipt.workspaceId, fixture.session.workspaceId);
  assert.ok(receipt.fileBytes > 0);
  withSqliteTestDatabase(backupPath, (database) => {
    assert.deepEqual(database.pragma("integrity_check"), [{ integrity_check: "ok" }]);
    assert.equal(database.pragma("user_version", { simple: true }), 1);
    assert.equal(database.prepare("SELECT workspace_id FROM storage_metadata").pluck().get(), fixture.session.workspaceId);
  });
  const sidecar = JSON.parse(await readFile(`${backupPath}.receipt.json`, "utf8")) as { receiptId: string };
  assert.equal(sidecar.receiptId, receipt.receiptId);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(database.prepare("SELECT count(*) FROM backup_receipts").pluck().get(), 1);
  });

  const stagingPath = join(backupDirectory, "restore-staging.sqlite");
  const staged = await stageExecutionRestore({
    sourceBackupPath: backupPath,
    sourceReceiptPath: `${backupPath}.receipt.json`,
    stagingDatabasePath: stagingPath,
    expectedWorkspaceId: fixture.session.workspaceId,
    expectedStoragePolicySha256: fixture.session.storagePolicy.policyDigest,
    observedAt: "2026-08-08T18:01:00.000Z",
  });
  assert.equal(staged.disposition, "STAGED_VALID");
  assert.notEqual(staged.stagingSha256, "");
  withSqliteTestDatabase(stagingPath, (database) => {
    assert.deepEqual(database.pragma("integrity_check"), [{ integrity_check: "ok" }]);
  });
});

test("backup rejects quota, existing/unwritable targets, and sidecar failure without registration", async (context) => {
  const fixture = await runFixture();
  context.after(fixture.cleanup);
  const directory = join(fixture.root, "backup-errors");
  await mkdir(directory);
  const existing = join(directory, "existing.sqlite");
  await writeFile(existing, "occupied", { flag: "wx" });
  await assert.rejects(
    () => createVerifiedExecutionBackup(fixture.session, { destinationDatabasePath: existing, observedAt: "2026-08-08T18:02:00.000Z" }),
    /TARGET_ALREADY_EXISTS/u,
  );
  const quotaSession: ExecutionStoreSession = {
    ...fixture.session,
    storagePolicy: { ...fixture.session.storagePolicy, limits: { ...fixture.session.storagePolicy.limits, maxBackupAggregateBytes: 1 } },
  };
  await assert.rejects(
    () => createVerifiedExecutionBackup(quotaSession, { destinationDatabasePath: join(directory, "quota.sqlite"), observedAt: "2026-08-08T18:02:01.000Z" }),
    /STORAGE_QUOTA_EXCEEDED/u,
  );
  const blocker = join(directory, "parent-file");
  await writeFile(blocker, "blocker", { flag: "wx" });
  await assert.rejects(
    () => createVerifiedExecutionBackup(fixture.session, { destinationDatabasePath: join(blocker, "backup.sqlite"), observedAt: "2026-08-08T18:02:02.000Z" }),
    /BACKUP_INVALID/u,
  );
  const sidecarFailure = join(directory, "sidecar.sqlite");
  await writeFile(`${sidecarFailure}.receipt.json`, "occupied", { flag: "wx" });
  await assert.rejects(
    () => createVerifiedExecutionBackup(fixture.session, { destinationDatabasePath: sidecarFailure, observedAt: "2026-08-08T18:02:03.000Z" }),
    /TARGET_ALREADY_EXISTS|BACKUP_INVALID/u,
  );
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(database.prepare("SELECT count(*) FROM backup_receipts").pluck().get(), 0);
  });
});

test("restore staging rejects truncated and foreign-workspace backups without activating anything", async (context) => {
  const fixture = await runFixture();
  context.after(fixture.cleanup);
  const directory = join(fixture.root, "restore-errors");
  await mkdir(directory);
  const backupPath = join(directory, "source.sqlite");
  await createVerifiedExecutionBackup(fixture.session, { destinationDatabasePath: backupPath, observedAt: "2026-08-08T18:03:00.000Z" });
  const truncated = join(directory, "truncated.sqlite");
  await writeFile(truncated, await readFile(backupPath), { flag: "wx" });
  await truncate(truncated, 128);
  await writeFile(`${truncated}.receipt.json`, await readFile(`${backupPath}.receipt.json`), { flag: "wx" });
  await assert.rejects(
    () => stageExecutionRestore({
      sourceBackupPath: truncated,
      sourceReceiptPath: `${truncated}.receipt.json`,
      stagingDatabasePath: join(directory, "truncated-staging.sqlite"),
      expectedWorkspaceId: fixture.session.workspaceId,
      expectedStoragePolicySha256: fixture.session.storagePolicy.policyDigest,
      observedAt: "2026-08-08T18:03:01.000Z",
    }),
    /BACKUP_INVALID/u,
  );
  withSqliteTestDatabase(backupPath, (database) => {
    database.prepare("UPDATE storage_metadata SET workspace_id = ? WHERE singleton = 1").run("0".repeat(32));
  });
  await assert.rejects(
    () => stageExecutionRestore({
      sourceBackupPath: backupPath,
      sourceReceiptPath: `${backupPath}.receipt.json`,
      stagingDatabasePath: join(directory, "foreign-staging.sqlite"),
      expectedWorkspaceId: fixture.session.workspaceId,
      expectedStoragePolicySha256: fixture.session.storagePolicy.policyDigest,
      observedAt: "2026-08-08T18:03:02.000Z",
    }),
    /BACKUP_INVALID/u,
  );
});

async function runFixture() {
  const fixture = await createTransactionalExecutionStoreFixture();
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T17:59:00.000Z",
  });
  return fixture;
}

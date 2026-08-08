import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";

import { canonicalExecutionJson, executionDigest } from "../identity.js";
import { executionPersistencePolicy, parseExecutionPersistencePolicy } from "../runtime-policy.js";
import { ExecutionContractError } from "../types.js";
import type { ExecutionStoreSession } from "./session.js";
import {
  backupExecutionSqliteDatabase,
  executionSqliteFileBytes,
  executionSqliteFileSha256,
  inspectExecutionSqliteIntegrity,
  openReadOnlyExecutionSqliteDatabase,
  readExecutionRecoverySnapshot,
  registerVerifiedExecutionBackup,
} from "./sqlite-adapter.js";
import type { ExecutionSqliteDatabase } from "./sqlite-adapter.js";

export interface CreateExecutionBackupRequest {
  destinationDatabasePath: string;
  observedAt: string;
}

export interface ExecutionBackupReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  backupId: string;
  disposition: "VALID";
  workspaceId: string;
  schemaVersion: number;
  storagePolicySha256: string;
  databaseSha256: string;
  fileBytes: number;
  runtimeReceiptId: string;
  observedAt: string;
}

export interface StageExecutionRestoreRequest {
  sourceBackupPath: string;
  sourceReceiptPath: string;
  stagingDatabasePath: string;
  expectedWorkspaceId: string;
  expectedStoragePolicySha256: string;
  observedAt: string;
}

export interface ExecutionRestoreStagingReceipt {
  receiptVersion: "1.0";
  restoreId: string;
  disposition: "STAGED_VALID";
  workspaceId: string;
  schemaVersion: number;
  storagePolicySha256: string;
  sourceBackupSha256: string;
  stagingSha256: string;
  observedAt: string;
}

export async function createVerifiedExecutionBackup(
  session: ExecutionStoreSession,
  request: CreateExecutionBackupRequest,
): Promise<ExecutionBackupReceipt> {
  assertCanonicalInstant(request.observedAt);
  await assertNewBackupTargets(request.destinationDatabasePath, `${request.destinationDatabasePath}.receipt.json`);
  await backupExecutionSqliteDatabase(session.database, request.destinationDatabasePath);

  const observation = inspectIndependentBackup(
    request.destinationDatabasePath,
    session.storagePolicy,
    session.workspaceId,
    session.storagePolicy.policyDigest,
  );
  if (observation.fileBytes > session.storagePolicy.limits.maxBackupAggregateBytes) {
    throw new ExecutionContractError("STORAGE_QUOTA_EXCEEDED", "verified execution backup exceeds the admitted aggregate backup quota");
  }

  const backupBody = {
    workspaceId: session.workspaceId,
    schemaVersion: observation.schemaVersion,
    storagePolicySha256: session.storagePolicy.policyDigest,
    databaseSha256: observation.databaseSha256,
    fileBytes: observation.fileBytes,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    observedAt: request.observedAt,
  };
  const receiptBody = {
    receiptVersion: "1.0" as const,
    backupId: executionDigest(backupBody),
    disposition: "VALID" as const,
    ...backupBody,
  };
  const receipt: ExecutionBackupReceipt = {
    ...receiptBody,
    receiptId: executionDigest(receiptBody),
  };
  const canonicalReceipt = canonicalExecutionJson(receipt);
  const sidecarPath = `${request.destinationDatabasePath}.receipt.json`;
  const sidecarDocument = `${canonicalReceipt}\n`;
  try {
    await writeFile(sidecarPath, sidecarDocument, { encoding: "utf8", flag: "wx" });
    if (await readFile(sidecarPath, "utf8") !== sidecarDocument) backupInvalid("execution backup sidecar read-back differs from its canonical receipt");
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    backupInvalid("execution backup sidecar could not be written and verified");
  }

  registerVerifiedExecutionBackup(session.database, {
    backupId: receipt.backupId,
    destinationSha256: receipt.databaseSha256,
    canonicalJson: canonicalReceipt,
    receiptSha256: executionDigest(receipt),
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    createdAt: request.observedAt,
  });
  return receipt;
}

export async function stageExecutionRestore(
  request: StageExecutionRestoreRequest,
): Promise<ExecutionRestoreStagingReceipt> {
  assertCanonicalInstant(request.observedAt);
  await assertRegularSource(request.sourceBackupPath);
  await assertRegularSource(request.sourceReceiptPath);
  await assertNewBackupTargets(request.stagingDatabasePath, null);

  const sourceReceipt = await readBackupReceipt(request.sourceReceiptPath);
  const sourceBytes = await readFile(request.sourceBackupPath);
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  if (
    sourceReceipt.databaseSha256 !== sourceSha256
    || sourceReceipt.fileBytes !== sourceBytes.byteLength
    || sourceReceipt.workspaceId !== request.expectedWorkspaceId
    || sourceReceipt.storagePolicySha256 !== request.expectedStoragePolicySha256
  ) {
    backupInvalid("execution restore source does not match its verified backup receipt");
  }

  const storagePolicy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  if (storagePolicy.policyDigest !== request.expectedStoragePolicySha256) {
    backupInvalid("execution restore storage policy is not supported by this kernel");
  }

  const source = openVerifiedBackup(
    request.sourceBackupPath,
    request.expectedWorkspaceId,
    request.expectedStoragePolicySha256,
    storagePolicy,
  );
  try {
    await backupExecutionSqliteDatabase(source, request.stagingDatabasePath);
  } catch (error) {
    if (error instanceof ExecutionContractError && error.code === "TARGET_ALREADY_EXISTS") throw error;
    backupInvalid("execution restore staging copy failed");
  } finally {
    source.close();
  }

  const staged = inspectIndependentBackup(
    request.stagingDatabasePath,
    storagePolicy,
    request.expectedWorkspaceId,
    request.expectedStoragePolicySha256,
  );
  if (staged.databaseSha256 !== sourceSha256) {
    backupInvalid("execution restore staging copy differs from its verified source");
  }
  const receiptBody = {
    receiptVersion: "1.0" as const,
    disposition: "STAGED_VALID" as const,
    workspaceId: request.expectedWorkspaceId,
    schemaVersion: staged.schemaVersion,
    storagePolicySha256: request.expectedStoragePolicySha256,
    sourceBackupSha256: sourceSha256,
    stagingSha256: staged.databaseSha256,
    observedAt: request.observedAt,
  };
  return { ...receiptBody, restoreId: executionDigest(receiptBody) };
}

function inspectIndependentBackup(
  databasePath: string,
  storagePolicy: ExecutionStoreSession["storagePolicy"],
  expectedWorkspaceId: string,
  expectedStoragePolicySha256: string,
): { databaseSha256: string; fileBytes: number; schemaVersion: number } {
  const database = openVerifiedBackup(databasePath, expectedWorkspaceId, expectedStoragePolicySha256, storagePolicy);
  try {
    return {
      databaseSha256: executionSqliteFileSha256(database),
      fileBytes: executionSqliteFileBytes(database),
      schemaVersion: database.schemaVersion,
    };
  } finally {
    database.close();
  }
}

function openVerifiedBackup(
  databasePath: string,
  expectedWorkspaceId: string,
  expectedStoragePolicySha256: string,
  storagePolicy: ExecutionStoreSession["storagePolicy"],
): ExecutionSqliteDatabase {
  let database: ExecutionSqliteDatabase | undefined;
  try {
    database = openReadOnlyExecutionSqliteDatabase({ databasePath, storagePolicy });
    if (canonicalExecutionJson(inspectExecutionSqliteIntegrity(database)) !== canonicalExecutionJson(["ok"])) {
      backupInvalid("execution backup failed SQLite integrity verification");
    }
    const metadata = readExecutionRecoverySnapshot(database).metadata;
    if (
      metadata === undefined
      || metadata.workspace_id !== expectedWorkspaceId
      || metadata.storage_policy_sha256 !== expectedStoragePolicySha256
      || metadata.schema_version !== database.schemaVersion
    ) {
      backupInvalid("execution backup identity differs from the expected workspace and storage policy");
    }
    return database;
  } catch (error) {
    if (database !== undefined) database.close();
    if (error instanceof ExecutionContractError && error.code === "BACKUP_INVALID") throw error;
    backupInvalid("execution backup could not be opened for independent verification");
  }
}

async function readBackupReceipt(path: string): Promise<ExecutionBackupReceipt> {
  let text: string;
  let value: unknown;
  try {
    text = await readFile(path, "utf8");
    value = JSON.parse(text) as unknown;
  } catch {
    backupInvalid("execution backup receipt is not readable JSON");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) backupInvalid("execution backup receipt is not an object");
  const record = value as unknown as ExecutionBackupReceipt;
  if (
    record.receiptVersion !== "1.0"
    || record.disposition !== "VALID"
    || !sha256(record.receiptId)
    || !sha256(record.backupId)
    || !sha256(record.databaseSha256)
    || !sha256(record.storagePolicySha256)
    || !workspaceId(record.workspaceId)
    || !sha256(record.runtimeReceiptId)
    || !Number.isSafeInteger(record.schemaVersion)
    || record.schemaVersion < 1
    || !Number.isSafeInteger(record.fileBytes)
    || record.fileBytes <= 0
    || canonicalExecutionJson(record) + "\n" !== text
  ) {
    backupInvalid("execution backup receipt fields or canonical form are invalid");
  }
  const { receiptId, ...body } = record;
  if (executionDigest(body) !== receiptId) backupInvalid("execution backup receipt identity is invalid");
  assertCanonicalInstant(record.observedAt);
  return record;
}

async function assertNewBackupTargets(databasePath: string, sidecarPath: string | null): Promise<void> {
  if (!isAbsolute(databasePath)) backupInvalid("execution backup target must be absolute");
  let parent;
  try {
    parent = await lstat(dirname(databasePath));
  } catch {
    backupInvalid("execution backup parent is unavailable");
  }
  if (!parent.isDirectory() || parent.isSymbolicLink()) backupInvalid("execution backup parent must be a regular directory");
  await assertMissingTarget(databasePath);
  if (sidecarPath !== null) await assertMissingTarget(sidecarPath);
}

async function assertMissingTarget(path: string): Promise<void> {
  try {
    await lstat(path);
    throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution backup target already exists");
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    if (!isMissingPath(error)) backupInvalid("execution backup target cannot be inspected");
  }
}

async function assertRegularSource(path: string): Promise<void> {
  if (!isAbsolute(path)) backupInvalid("execution backup source must be absolute");
  try {
    const details = await lstat(path);
    if (!details.isFile() || details.isSymbolicLink()) backupInvalid("execution backup source must be a regular file");
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    backupInvalid("execution backup source is unavailable");
  }
}

function assertCanonicalInstant(value: string): void {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new ExecutionContractError("CLOCK_INVALID", "execution backup timestamp is invalid");
  }
}

function sha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function workspaceId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/u.test(value);
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function backupInvalid(message: string): never {
  throw new ExecutionContractError("BACKUP_INVALID", message);
}

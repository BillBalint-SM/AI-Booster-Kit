import { join } from "node:path";

import { canonicalExecutionJson, executionDigest } from "../identity.js";
import { ExecutionContractError } from "../types.js";
import { createVerifiedExecutionBackup } from "./backup.js";
import type { ExecutionStoreSession } from "./session.js";
import { CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION } from "./schema.js";
import {
  applyExecutionSqliteMigrations,
  executionSqliteUserVersion,
} from "./sqlite-adapter.js";

export interface ExecutionMigrationStep {
  fromVersion: number;
  toVersion: number;
  risk: "ADDITIVE" | "DESTRUCTIVE";
  digest: string;
  statements: readonly string[];
}

export interface MigrateExecutionStorageRequest {
  targetVersion: number;
  registry: readonly ExecutionMigrationStep[];
  backupDirectory: string;
  destructiveApproval: boolean;
  recordedAt: string;
}

export interface ExecutionMigrationReceipt {
  receiptVersion: "1.0";
  migrationId: string;
  fromVersion: number;
  toVersion: number;
  backupId: string;
  registryDigest: string;
  disposition: "SUCCEEDED";
  runtimeReceiptId: string;
  recordedAt: string;
}

export async function migrateExecutionStorage(
  session: ExecutionStoreSession,
  request: MigrateExecutionStorageRequest,
): Promise<ExecutionMigrationReceipt> {
  assertCanonicalInstant(request.recordedAt);
  const fromVersion = executionSqliteUserVersion(session.database);
  if (fromVersion > CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION) {
    throw new ExecutionContractError("UNSUPPORTED_SCHEMA_VERSION", "execution storage is newer than this kernel's migration baseline");
  }
  if (fromVersion !== CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION) {
    migrationFailed("execution storage does not match this kernel's migration baseline");
  }
  const steps = validateMigrationRegistry(session, fromVersion, request);
  const registryDigest = executionDigest(steps);
  const backupName = `migration-${executionDigest({
    workspaceId: session.workspaceId,
    fromVersion,
    toVersion: request.targetVersion,
    registryDigest,
    recordedAt: request.recordedAt,
  }).slice(0, 32)}.sqlite`;
  const backup = await createVerifiedExecutionBackup(session, {
    destinationDatabasePath: join(request.backupDirectory, backupName),
    observedAt: request.recordedAt,
  });

  const receiptBody = {
    receiptVersion: "1.0" as const,
    fromVersion,
    toVersion: request.targetVersion,
    backupId: backup.backupId,
    registryDigest,
    disposition: "SUCCEEDED" as const,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    recordedAt: request.recordedAt,
  };
  const receipt: ExecutionMigrationReceipt = {
    ...receiptBody,
    migrationId: executionDigest(receiptBody),
  };
  applyExecutionSqliteMigrations(session.database, {
    migrationId: receipt.migrationId,
    fromVersion,
    toVersion: request.targetVersion,
    backupId: backup.backupId,
    backupDestinationSha256: backup.databaseSha256,
    canonicalJson: canonicalExecutionJson(receipt),
    receiptSha256: executionDigest(receipt),
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    createdAt: request.recordedAt,
    steps,
  });
  return receipt;
}

function validateMigrationRegistry(
  session: ExecutionStoreSession,
  fromVersion: number,
  request: MigrateExecutionStorageRequest,
): readonly ExecutionMigrationStep[] {
  if (!Number.isSafeInteger(request.targetVersion) || request.targetVersion <= fromVersion) {
    migrationFailed("execution migration target must be a newer safe schema version");
  }
  let expectedVersion = fromVersion;
  for (const step of request.registry) {
    if (
      !Number.isSafeInteger(step.fromVersion)
      || !Number.isSafeInteger(step.toVersion)
      || step.fromVersion !== expectedVersion
      || step.toVersion !== expectedVersion + 1
      || (step.risk !== "ADDITIVE" && step.risk !== "DESTRUCTIVE")
      || !/^[a-f0-9]{64}$/u.test(step.digest)
      || !Array.isArray(step.statements)
      || step.statements.length === 0
    ) {
      migrationFailed("execution migration registry is not a contiguous ordered chain");
    }
    const identity = {
      fromVersion: step.fromVersion,
      toVersion: step.toVersion,
      risk: step.risk,
      statements: step.statements,
    };
    if (executionDigest(identity) !== step.digest) migrationFailed("execution migration step digest does not match its statements");
    if (step.risk === "DESTRUCTIVE" && !request.destructiveApproval) {
      migrationFailed("destructive execution migration requires explicit approval");
    }
    for (const statement of step.statements) validateMigrationStatement(session, statement);
    expectedVersion = step.toVersion;
  }
  if (expectedVersion !== request.targetVersion) migrationFailed("execution migration registry does not reach the requested target version");
  return request.registry;
}

function validateMigrationStatement(session: ExecutionStoreSession, statement: string): void {
  if (
    typeof statement !== "string"
    || statement.trim() !== statement
    || statement.length === 0
    || Buffer.byteLength(statement, "utf8") > session.storagePolicy.limits.maxPreparedSqlBytes
    || /\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/iu.test(statement)
    || /\bPRAGMA\s+USER_VERSION\b/iu.test(statement)
  ) {
    migrationFailed("execution migration statement is empty, oversized, or controls its own transaction or schema version");
  }
}

function assertCanonicalInstant(value: string): void {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new ExecutionContractError("CLOCK_INVALID", "execution migration timestamp is invalid");
  }
}

function migrationFailed(message: string): never {
  throw new ExecutionContractError("MIGRATION_FAILED", message);
}

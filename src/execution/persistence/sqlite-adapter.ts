import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

import type Database from "better-sqlite3";

import type { ExecutionStorageDriverObservation } from "../runtime-receipt.js";
import type { ExecutionStoragePolicy } from "../runtime-policy.js";
import { ExecutionContractError } from "../types.js";
import { CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION, executionSchemaSql } from "./schema.js";

type NativeDatabase = Database.Database;
type NativeDatabaseConstructor = typeof Database;

export interface ExecutionSqliteDatabase {
  databasePath: string;
  sqliteVersion: string;
  schemaVersion: number;
  readonly: boolean;
  close(): void;
}

export interface ExecutionSqliteOpenRequest {
  databasePath: string;
  storagePolicy: ExecutionStoragePolicy;
}

export interface ExecutionSqliteInspection {
  journalMode: string;
  synchronous: number;
  foreignKeys: number;
  trustedSchema: number;
  busyTimeout: number;
  userVersion: number;
  pageSize: number;
  maxPageCount: number;
  compileMaxLength: number;
  compileMaxSqlLength: number;
  tables: readonly string[];
  triggers: readonly string[];
}

export interface ExecutionStorageIdentityWrite {
  databaseWasCreated: boolean;
  workspaceId: string;
  workspaceIdentitySha256: string;
  runtimePolicyId: string;
  runtimePolicySha256: string;
  storagePolicyId: string;
  storagePolicySha256: string;
  createdAt: string;
  runtimeReceipt: {
    receiptId: string;
    sessionId: string;
    lane: "AUTHORITATIVE" | "CONFORMANCE_ONLY";
    canonicalJson: string;
    receiptSha256: string;
    observedAt: string;
  };
}

export interface ExecutionCanonicalRunWrite {
  runId: string;
  envelopeJson: string;
  envelopeSha256: string;
  createdReceiptId: string;
  runState: string;
  ledgerHeadSequence: number;
  ledgerHeadHash: string;
  graphRevision: number;
  createdAt: string;
  controller: {
    controllerId: string;
    fencingToken: number;
    runtimeReceiptId: string;
  };
  events: readonly {
    sequence: number;
    eventHash: string;
    previousEventHash: string | null;
    eventType: string;
    nodeId: string | null;
    canonicalJson: string;
    byteLength: number;
    recordedAt: string;
  }[];
  projection: {
    graphJson: string;
    graphSha256: string;
    checkpointJson: string;
    checkpointSha256: string;
    derivedThroughSequence: number;
    derivedThroughHash: string;
  };
  quota: {
    eventCount: number;
    ledgerBytes: number;
    artifactBytes: number;
    lastTransactionBytes: number;
  };
}

export interface ExecutionImportedRunWrite {
  run: ExecutionCanonicalRunWrite;
  artifacts: readonly {
    artifactId: string;
    nodeId: string | null;
    mediaType: string;
    body: Buffer;
    sha256: string;
    byteLength: number;
    sourceEventSequence: number;
    createdAt: string;
  }[];
  receipt: {
    importId: string;
    sourceIdentitySha256: string;
    canonicalJson: string;
    receiptSha256: string;
    runtimeReceiptId: string;
    createdAt: string;
  };
}

export interface ExecutionCanonicalRunRows {
  metadata: StorageMetadataRow | undefined;
  run: RunRow | undefined;
  controller: ControllerLeaseRow | undefined;
  receipt: RuntimeReceiptRow | undefined;
  events: readonly ExecutionEventRow[];
  projection: RunProjectionRow | undefined;
  artifacts: readonly ArtifactRow[];
  quota: QuotaUsageRow | undefined;
}

export interface ExecutionGraphTransitionWrite {
  expected: {
    ledgerHeadSequence: number;
    ledgerHeadHash: string;
    graphRevision: number;
    controllerId: string;
    fencingToken: number;
    runtimeReceiptId: string;
  };
  event: {
    sequence: number;
    eventHash: string;
    previousEventHash: string;
    eventType: string;
    nodeId: string | null;
    canonicalJson: string;
    byteLength: number;
    recordedAt: string;
  };
  runState: string;
  graphRevision: number;
  projection: {
    graphJson: string;
    graphSha256: string;
    checkpointJson: string;
    checkpointSha256: string;
    derivedThroughSequence: number;
    derivedThroughHash: string;
  };
  quota: {
    eventCount: number;
    ledgerBytes: number;
    artifactBytes: number;
    lastTransactionBytes: number;
  };
}

export interface ExecutionGraphTransitionDecision<T> {
  write: ExecutionGraphTransitionWrite;
  result: T;
}

export interface ExecutionArtifactMutationWrite {
  expected: ExecutionGraphTransitionWrite["expected"];
  events: readonly {
    sequence: number;
    eventHash: string;
    previousEventHash: string;
    eventType: string;
    nodeId: string | null;
    canonicalJson: string;
    byteLength: number;
    recordedAt: string;
  }[];
  artifacts: readonly {
    artifactId: string;
    nodeId: string | null;
    mediaType: string;
    body: Buffer;
    sha256: string;
    byteLength: number;
    sourceEventSequence: number;
    createdAt: string;
  }[];
  runState: string;
  graphRevision: number;
  projection: ExecutionGraphTransitionWrite["projection"];
  quota: ExecutionGraphTransitionWrite["quota"];
}

export interface ExecutionArtifactMutationDecision<T> {
  write: ExecutionArtifactMutationWrite;
  result: T;
}

export interface StorageMetadataRow {
  singleton: number;
  schema_version: number;
  workspace_id: string;
  workspace_identity_sha256: string;
  runtime_policy_id: string;
  runtime_policy_sha256: string;
  storage_policy_id: string;
  storage_policy_sha256: string;
  created_at: string;
}

export interface RuntimeReceiptRow {
  receipt_id: string;
  session_id: string;
  lane: string;
  canonical_json: string;
  receipt_sha256: string;
  observed_at: string;
}

export interface RunRow {
  run_id: string;
  envelope_json: string;
  envelope_sha256: string;
  created_receipt_id: string;
  run_state: string;
  ledger_head_sequence: number;
  ledger_head_hash: string | null;
  graph_revision: number;
  created_at: string;
  updated_at: string;
}

export interface ControllerLeaseRow {
  run_id: string;
  controller_id: string;
  fencing_token: number;
  runtime_receipt_id: string;
  state: string;
  acquired_at: string;
  last_mutation_at: string;
}

export interface ExecutionEventRow {
  run_id: string;
  sequence: number;
  event_hash: string;
  previous_event_hash: string | null;
  event_type: string;
  node_id: string | null;
  canonical_json: string;
  byte_length: number;
  runtime_receipt_id: string;
  fencing_token: number;
  recorded_at: string;
}

export interface RunProjectionRow {
  run_id: string;
  graph_json: string;
  graph_sha256: string;
  checkpoint_json: string;
  checkpoint_sha256: string;
  derived_through_sequence: number;
  derived_through_hash: string;
  runtime_receipt_id: string;
  fencing_token: number;
  updated_at: string;
}

export interface ArtifactRow {
  run_id: string;
  artifact_id: string;
  node_id: string | null;
  media_type: string;
  body: Buffer;
  sha256: string;
  byte_length: number;
  source_event_sequence: number;
  runtime_receipt_id: string;
  fencing_token: number;
  created_at: string;
}

export interface QuotaUsageRow {
  run_id: string;
  event_count: number;
  ledger_bytes: number;
  artifact_bytes: number;
  last_transaction_bytes: number;
  updated_at: string;
}

export interface OperationIntentRow {
  operation_id: string;
  run_id: string;
  operation_type: string;
  disposition: string;
  intent_event_sequence: number;
  receipt_json: string | null;
  receipt_sha256: string | null;
  runtime_receipt_id: string;
  fencing_token: number;
  created_at: string;
  updated_at: string;
}

export interface ExecutionRecoverySnapshot {
  metadata: StorageMetadataRow | undefined;
  runtimeReceipts: readonly RuntimeReceiptRow[];
  runs: readonly ExecutionCanonicalRunRows[];
  operationIntents: readonly OperationIntentRow[];
}

export interface ExecutionProjectionRebuildWrite {
  auditId: string;
  runId: string;
  expectedLedgerHeadSequence: number;
  expectedLedgerHeadHash: string;
  graphJson: string;
  graphSha256: string;
  checkpointJson: string;
  checkpointSha256: string;
  runState: string;
  graphRevision: number;
  runtimeReceiptId: string;
  fencingToken: number;
  receiptCanonicalJson: string;
  receiptSha256: string;
  databaseSha256: string;
  logicalSha256: string;
  recordedAt: string;
}

export interface ExecutionOwnershipReconciliationWrite {
  auditId: string;
  runId: string;
  expectedControllerId: string;
  expectedFencingToken: number;
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  receiptCanonicalJson: string;
  receiptSha256: string;
  databaseSha256: string;
  logicalSha256: string;
  recordedAt: string;
}

export interface ExecutionBackupRegistrationWrite {
  backupId: string;
  destinationSha256: string;
  canonicalJson: string;
  receiptSha256: string;
  runtimeReceiptId: string;
  createdAt: string;
}

export interface ExecutionMigrationApplyWrite {
  migrationId: string;
  fromVersion: number;
  toVersion: number;
  backupId: string;
  backupDestinationSha256: string;
  canonicalJson: string;
  receiptSha256: string;
  runtimeReceiptId: string;
  createdAt: string;
  steps: readonly {
    fromVersion: number;
    toVersion: number;
    statements: readonly string[];
  }[];
}

const nativeDatabases = new WeakMap<ExecutionSqliteDatabase, NativeDatabase>();
const require = createRequire(import.meta.url);

export async function observeExecutionSqliteDriver(): Promise<ExecutionStorageDriverObservation> {
  const loaded = loadPlatformDriver();
  const details = lstatSync(loaded.bindingPath);
  if (!details.isFile() || details.isSymbolicLink()) unsupportedHost("SQLite prebuild is not a regular file");
  const bindingSha256 = createHash("sha256").update(readFileSync(loaded.bindingPath)).digest("hex");
  const database = new loaded.Driver(":memory:", { timeout: 0 });
  try {
    const row = database.prepare<[], { version: string }>("SELECT sqlite_version() AS version").get();
    if (row === undefined || !/^3\.\d+\.\d+$/u.test(row.version)) storageError("SQLite engine version is unavailable");
    return {
      name: "better-sqlite3",
      version: "13.0.3",
      bindingSha256,
      sqliteVersion: row.version,
    };
  } finally {
    database.close();
  }
}

export function createExecutionSqliteDatabase(request: ExecutionSqliteOpenRequest): ExecutionSqliteDatabase {
  validateDatabaseTarget(request.databasePath, false);
  return openConfiguredDatabase(request, false, false);
}

export function openExistingExecutionSqliteDatabase(request: ExecutionSqliteOpenRequest): ExecutionSqliteDatabase {
  validateDatabaseTarget(request.databasePath, true);
  return openConfiguredDatabase(request, true, false);
}

export function openReadOnlyExecutionSqliteDatabase(request: ExecutionSqliteOpenRequest): ExecutionSqliteDatabase {
  validateDatabaseTarget(request.databasePath, true);
  return openConfiguredDatabase(request, true, true);
}

export function openExecutionSqliteInspectionDatabase(request: ExecutionSqliteOpenRequest): ExecutionSqliteDatabase {
  validateDatabaseTarget(request.databasePath, true);
  const { Driver } = loadPlatformDriver();
  let native: NativeDatabase;
  try {
    native = new Driver(request.databasePath, { fileMustExist: true, readonly: false, timeout: 0 });
  } catch (error) {
    throw normalizedStorageError(error, "execution SQLite inspection database could not be opened");
  }
  try {
    native.pragma("foreign_keys = ON");
    native.pragma("trusted_schema = OFF");
    native.pragma("busy_timeout = 0");
    const wrapper: ExecutionSqliteDatabase = {
      databasePath: request.databasePath,
      sqliteVersion: sqliteVersion(native),
      schemaVersion: numberPragma(native, "user_version"),
      readonly: true,
      close() {
        closeExecutionSqliteDatabase(wrapper);
      },
    };
    nativeDatabases.set(wrapper, native);
    return wrapper;
  } catch (error) {
    native.close();
    if (error instanceof ExecutionContractError) throw error;
    throw normalizedStorageError(error, "execution SQLite inspection configuration failed");
  }
}

export function closeExecutionSqliteDatabase(database: ExecutionSqliteDatabase): void {
  const native = nativeDatabases.get(database);
  if (native === undefined) throw new ExecutionContractError("EXECUTION_SQLITE_CLOSED", "execution SQLite database is already closed");
  native.close();
  nativeDatabases.delete(database);
}

export function inspectExecutionSqliteConfiguration(database: ExecutionSqliteDatabase): ExecutionSqliteInspection {
  const native = nativeDatabase(database);
  const compileOptions = native.pragma("compile_options") as readonly { compile_options: string }[];
  return {
    journalMode: stringPragma(native, "journal_mode"),
    synchronous: numberPragma(native, "synchronous"),
    foreignKeys: numberPragma(native, "foreign_keys"),
    trustedSchema: numberPragma(native, "trusted_schema"),
    busyTimeout: numberPragma(native, "busy_timeout"),
    userVersion: numberPragma(native, "user_version"),
    pageSize: numberPragma(native, "page_size"),
    maxPageCount: numberPragma(native, "max_page_count"),
    compileMaxLength: compileLimit(compileOptions, "MAX_LENGTH"),
    compileMaxSqlLength: compileLimit(compileOptions, "MAX_SQL_LENGTH"),
    tables: schemaNames(native, "table"),
    triggers: schemaNames(native, "trigger"),
  };
}

export function executionSqliteFileBytes(database: ExecutionSqliteDatabase): number {
  nativeDatabase(database);
  const details = lstatSync(database.databasePath);
  if (!details.isFile() || details.isSymbolicLink()) storageError("execution SQLite file observation is unavailable");
  return details.size;
}

export function executionSqliteFileSha256(database: ExecutionSqliteDatabase): string {
  nativeDatabase(database);
  return createHash("sha256").update(readFileSync(database.databasePath)).digest("hex");
}

export function inspectExecutionSqliteIntegrity(database: ExecutionSqliteDatabase): readonly string[] {
  const native = nativeDatabase(database);
  return (native.pragma("integrity_check") as readonly Record<string, unknown>[])
    .map((row) => {
      if (row === null || typeof row !== "object") storageError("execution SQLite integrity result is invalid");
      const value = Object.values(row)[0];
      if (typeof value !== "string") storageError("execution SQLite integrity result is invalid");
      return value;
    });
}

export function executionSqliteUserVersion(database: ExecutionSqliteDatabase): number {
  return numberPragma(nativeDatabase(database), "user_version");
}

export async function backupExecutionSqliteDatabase(
  database: ExecutionSqliteDatabase,
  destinationPath: string,
): Promise<void> {
  validateDatabaseTarget(destinationPath, false);
  const native = nativeDatabase(database);
  if (native.inTransaction) {
    throw new ExecutionContractError("BACKUP_INVALID", "execution SQLite backup cannot start inside a transaction");
  }
  try {
    await native.backup(destinationPath);
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError("BACKUP_INVALID", "execution SQLite backup failed before independent verification");
  }
}

export function registerVerifiedExecutionBackup(
  database: ExecutionSqliteDatabase,
  write: ExecutionBackupRegistrationWrite,
): void {
  runImmediateExecutionTransaction(database, () => {
    nativeDatabase(database).prepare(`
      INSERT INTO backup_receipts (
        backup_id, destination_sha256, canonical_json, receipt_sha256,
        disposition, runtime_receipt_id, created_at
      ) VALUES (?, ?, ?, ?, 'VALID', ?, ?)
    `).run(
      write.backupId,
      write.destinationSha256,
      write.canonicalJson,
      write.receiptSha256,
      write.runtimeReceiptId,
      write.createdAt,
    );
  });
}

export function applyExecutionSqliteMigrations(
  database: ExecutionSqliteDatabase,
  write: ExecutionMigrationApplyWrite,
): void {
  const native = nativeDatabase(database);
  try {
    native.transaction(() => {
      const backup = native.prepare<[string], { destination_sha256: string; disposition: string }>(`
        SELECT destination_sha256, disposition
        FROM backup_receipts
        WHERE backup_id = ?
      `).get(write.backupId);
      if (
        backup === undefined
        || backup.disposition !== "VALID"
        || backup.destination_sha256 !== write.backupDestinationSha256
      ) {
        throw new ExecutionContractError("MIGRATION_FAILED", "execution migration has no matching verified backup receipt");
      }
      if (numberPragma(native, "user_version") !== write.fromVersion) {
        throw new ExecutionContractError("MIGRATION_FAILED", "execution schema changed after migration preflight");
      }
      let version = write.fromVersion;
      for (const step of write.steps) {
        if (step.fromVersion !== version || step.toVersion !== version + 1) {
          throw new ExecutionContractError("MIGRATION_FAILED", "execution migration step order changed after preflight");
        }
        for (const statement of step.statements) native.exec(statement);
        native.prepare("UPDATE storage_metadata SET schema_version = ? WHERE singleton = 1").run(step.toVersion);
        native.pragma(`user_version = ${step.toVersion}`);
        version = step.toVersion;
      }
      if (version !== write.toVersion) {
        throw new ExecutionContractError("MIGRATION_FAILED", "execution migration did not reach its requested schema version");
      }
      native.prepare(`
        INSERT INTO migration_receipts (
          migration_id, from_version, to_version, backup_id, canonical_json,
          receipt_sha256, disposition, runtime_receipt_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'SUCCEEDED', ?, ?)
      `).run(
        write.migrationId,
        write.fromVersion,
        write.toVersion,
        write.backupId,
        write.canonicalJson,
        write.receiptSha256,
        write.runtimeReceiptId,
        write.createdAt,
      );
    }).exclusive();
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError("MIGRATION_FAILED", "execution migration transaction failed and was rolled back");
  }
}

export function readExecutionRecoverySnapshot(database: ExecutionSqliteDatabase): ExecutionRecoverySnapshot {
  const native = nativeDatabase(database);
  return native.transaction(() => {
    const metadata = native.prepare<[], StorageMetadataRow>("SELECT * FROM storage_metadata WHERE singleton = 1").get();
    const runtimeReceipts = native.prepare<[], RuntimeReceiptRow>("SELECT * FROM runtime_receipts ORDER BY receipt_id").all();
    const runIds = native.prepare<[], { run_id: string }>("SELECT run_id FROM runs ORDER BY run_id").all();
    return {
      metadata,
      runtimeReceipts,
      runs: runIds.map((row) => readCanonicalExecutionRunRowsNative(native, row.run_id)),
      operationIntents: native.prepare<[], OperationIntentRow>("SELECT * FROM operation_intents ORDER BY operation_id").all(),
    };
  }).deferred();
}

export function runImmediateExecutionTransaction<T>(
  database: ExecutionSqliteDatabase,
  operation: () => T,
): T {
  const native = nativeDatabase(database);
  try {
    return native.transaction(operation).immediate();
  } catch (error) {
    if (sqliteCode(error) === "SQLITE_BUSY" || sqliteCode(error) === "SQLITE_LOCKED") {
      throw new ExecutionContractError("WRITER_CONFLICT", "execution SQLite writer is already active");
    }
    if (sqliteCode(error)?.startsWith("SQLITE_") === true) {
      throw new ExecutionContractError("EXECUTION_SQLITE_ERROR", "execution SQLite transaction failed and was rolled back");
    }
    throw error;
  }
}

export function bootstrapExecutionStorageIdentity(
  database: ExecutionSqliteDatabase,
  request: ExecutionStorageIdentityWrite,
): void {
  runImmediateExecutionTransaction(database, () => {
    const native = nativeDatabase(database);
    const metadata = native.prepare<[], StorageMetadataRow>("SELECT * FROM storage_metadata WHERE singleton = 1").get();
    if (request.databaseWasCreated) {
      if (metadata !== undefined) snapshotDiverged("new execution storage already contains metadata");
      native.prepare(`
        INSERT INTO storage_metadata (
          singleton, schema_version, workspace_id, workspace_identity_sha256,
          runtime_policy_id, runtime_policy_sha256, storage_policy_id,
          storage_policy_sha256, created_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION,
        request.workspaceId,
        request.workspaceIdentitySha256,
        request.runtimePolicyId,
        request.runtimePolicySha256,
        request.storagePolicyId,
        request.storagePolicySha256,
        request.createdAt,
      );
    } else {
      if (metadata === undefined) snapshotDiverged("existing execution storage is missing metadata");
      assertStorageMetadata(metadata, request);
    }

    const receiptById = native.prepare<[string], RuntimeReceiptRow>(
      "SELECT * FROM runtime_receipts WHERE receipt_id = ?",
    ).get(request.runtimeReceipt.receiptId);
    const receiptBySession = native.prepare<[string], RuntimeReceiptRow>(
      "SELECT * FROM runtime_receipts WHERE session_id = ?",
    ).get(request.runtimeReceipt.sessionId);
    if (receiptById !== undefined || receiptBySession !== undefined) {
      if (receiptById === undefined || receiptBySession === undefined || receiptById.receipt_id !== receiptBySession.receipt_id) {
        snapshotDiverged("runtime receipt identity collides with stored history");
      }
      assertRuntimeReceipt(receiptById, request.runtimeReceipt);
      return;
    }
    native.prepare(`
      INSERT INTO runtime_receipts (
        receipt_id, session_id, lane, canonical_json, receipt_sha256, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      request.runtimeReceipt.receiptId,
      request.runtimeReceipt.sessionId,
      request.runtimeReceipt.lane,
      request.runtimeReceipt.canonicalJson,
      request.runtimeReceipt.receiptSha256,
      request.runtimeReceipt.observedAt,
    );
  });
}

export function insertCanonicalExecutionRun(
  database: ExecutionSqliteDatabase,
  request: ExecutionCanonicalRunWrite,
): void {
  runImmediateExecutionTransaction(database, () => {
    insertCanonicalExecutionRunNative(nativeDatabase(database), request, "TARGET_ALREADY_EXISTS");
  });
}

export function insertImportedExecutionRun(
  database: ExecutionSqliteDatabase,
  write: ExecutionImportedRunWrite,
): void {
  try {
    runImmediateExecutionTransaction(database, () => {
      const native = nativeDatabase(database);
      insertCanonicalExecutionRunNative(native, write.run, "LEGACY_IMPORT_INVALID");
      const insertArtifact = native.prepare(`
        INSERT INTO artifacts (
          run_id, artifact_id, node_id, media_type, body, sha256, byte_length,
          source_event_sequence, runtime_receipt_id, fencing_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const artifact of write.artifacts) {
        insertArtifact.run(
          write.run.runId,
          artifact.artifactId,
          artifact.nodeId,
          artifact.mediaType,
          artifact.body,
          artifact.sha256,
          artifact.byteLength,
          artifact.sourceEventSequence,
          write.run.controller.runtimeReceiptId,
          write.run.controller.fencingToken,
          artifact.createdAt,
        );
      }
      native.prepare(`
        INSERT INTO import_receipts (
          import_id, run_id, source_identity_sha256, canonical_json,
          receipt_sha256, runtime_receipt_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        write.receipt.importId,
        write.run.runId,
        write.receipt.sourceIdentitySha256,
        write.receipt.canonicalJson,
        write.receipt.receiptSha256,
        write.receipt.runtimeReceiptId,
        write.receipt.createdAt,
      );
    });
  } catch (error) {
    if (error instanceof ExecutionContractError && error.code === "WRITER_CONFLICT") throw error;
    throw new ExecutionContractError("LEGACY_IMPORT_INVALID", "legacy execution import transaction failed and was rolled back");
  }
}

function insertCanonicalExecutionRunNative(
  native: NativeDatabase,
  request: ExecutionCanonicalRunWrite,
  duplicateCode: "TARGET_ALREADY_EXISTS" | "LEGACY_IMPORT_INVALID",
): void {
  const existing = native.prepare<[string], { run_id: string }>("SELECT run_id FROM runs WHERE run_id = ?").get(request.runId);
  if (existing !== undefined) throw new ExecutionContractError(duplicateCode, "execution run already exists");
  native.prepare(`
    INSERT INTO runs (
      run_id, envelope_json, envelope_sha256, created_receipt_id, run_state,
      ledger_head_sequence, ledger_head_hash, graph_revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    request.runId,
    request.envelopeJson,
    request.envelopeSha256,
    request.createdReceiptId,
    request.runState,
    request.ledgerHeadSequence,
    request.ledgerHeadHash,
    request.graphRevision,
    request.createdAt,
    request.createdAt,
  );
  native.prepare(`
    INSERT INTO controller_leases (
      run_id, controller_id, fencing_token, runtime_receipt_id, state,
      acquired_at, last_mutation_at
    ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(
    request.runId,
    request.controller.controllerId,
    request.controller.fencingToken,
    request.controller.runtimeReceiptId,
    request.createdAt,
    request.createdAt,
  );
  const insertEvent = native.prepare(`
    INSERT INTO execution_events (
      run_id, sequence, event_hash, previous_event_hash, event_type, node_id,
      canonical_json, byte_length, runtime_receipt_id, fencing_token, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const event of request.events) {
    insertEvent.run(
      request.runId,
      event.sequence,
      event.eventHash,
      event.previousEventHash,
      event.eventType,
      event.nodeId,
      event.canonicalJson,
      event.byteLength,
      request.controller.runtimeReceiptId,
      request.controller.fencingToken,
      event.recordedAt,
    );
  }
  native.prepare(`
    INSERT INTO run_projections (
      run_id, graph_json, graph_sha256, checkpoint_json, checkpoint_sha256,
      derived_through_sequence, derived_through_hash, runtime_receipt_id,
      fencing_token, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    request.runId,
    request.projection.graphJson,
    request.projection.graphSha256,
    request.projection.checkpointJson,
    request.projection.checkpointSha256,
    request.projection.derivedThroughSequence,
    request.projection.derivedThroughHash,
    request.controller.runtimeReceiptId,
    request.controller.fencingToken,
    request.createdAt,
  );
  native.prepare(`
    INSERT INTO quota_usage (
      run_id, event_count, ledger_bytes, artifact_bytes,
      last_transaction_bytes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    request.runId,
    request.quota.eventCount,
    request.quota.ledgerBytes,
    request.quota.artifactBytes,
    request.quota.lastTransactionBytes,
    request.createdAt,
  );
}

export function readCanonicalExecutionRunRows(
  database: ExecutionSqliteDatabase,
  runId: string,
): ExecutionCanonicalRunRows {
  const native = nativeDatabase(database);
  return native.transaction(() => readCanonicalExecutionRunRowsNative(native, runId)).deferred();
}

export function executionRunHasImportReceipt(
  database: ExecutionSqliteDatabase,
  runId: string,
): boolean {
  return nativeDatabase(database).prepare<[string], { import_id: string }>(
    "SELECT import_id FROM import_receipts WHERE run_id = ?",
  ).get(runId) !== undefined;
}

export function transactCanonicalExecutionGraphTransition<T>(
  database: ExecutionSqliteDatabase,
  runId: string,
  decide: (rows: ExecutionCanonicalRunRows) => ExecutionGraphTransitionDecision<T>,
): T {
  return runImmediateExecutionTransaction(database, () => {
    const native = nativeDatabase(database);
    const decision = decide(readCanonicalExecutionRunRowsNative(native, runId));
    const { write } = decision;
    native.prepare(`
      INSERT INTO execution_events (
        run_id, sequence, event_hash, previous_event_hash, event_type, node_id,
        canonical_json, byte_length, runtime_receipt_id, fencing_token, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      write.event.sequence,
      write.event.eventHash,
      write.event.previousEventHash,
      write.event.eventType,
      write.event.nodeId,
      write.event.canonicalJson,
      write.event.byteLength,
      write.expected.runtimeReceiptId,
      write.expected.fencingToken,
      write.event.recordedAt,
    );
    const runUpdate = native.prepare(`
      UPDATE runs
      SET run_state = ?, ledger_head_sequence = ?, ledger_head_hash = ?,
          graph_revision = ?, updated_at = ?
      WHERE run_id = ? AND ledger_head_sequence = ? AND ledger_head_hash = ?
        AND graph_revision = ?
    `).run(
      write.runState,
      write.event.sequence,
      write.event.eventHash,
      write.graphRevision,
      write.event.recordedAt,
      runId,
      write.expected.ledgerHeadSequence,
      write.expected.ledgerHeadHash,
      write.expected.graphRevision,
    );
    if (runUpdate.changes !== 1) snapshotDiverged("execution run changed during its fenced mutation");
    const projectionUpdate = native.prepare(`
      UPDATE run_projections
      SET graph_json = ?, graph_sha256 = ?, checkpoint_json = ?, checkpoint_sha256 = ?,
          derived_through_sequence = ?, derived_through_hash = ?, runtime_receipt_id = ?,
          fencing_token = ?, updated_at = ?
      WHERE run_id = ? AND derived_through_sequence = ? AND derived_through_hash = ?
    `).run(
      write.projection.graphJson,
      write.projection.graphSha256,
      write.projection.checkpointJson,
      write.projection.checkpointSha256,
      write.projection.derivedThroughSequence,
      write.projection.derivedThroughHash,
      write.expected.runtimeReceiptId,
      write.expected.fencingToken,
      write.event.recordedAt,
      runId,
      write.expected.ledgerHeadSequence,
      write.expected.ledgerHeadHash,
    );
    if (projectionUpdate.changes !== 1) snapshotDiverged("execution projection changed during its fenced mutation");
    const quotaUpdate = native.prepare(`
      UPDATE quota_usage
      SET event_count = ?, ledger_bytes = ?, artifact_bytes = ?,
          last_transaction_bytes = ?, updated_at = ?
      WHERE run_id = ? AND event_count = ?
    `).run(
      write.quota.eventCount,
      write.quota.ledgerBytes,
      write.quota.artifactBytes,
      write.quota.lastTransactionBytes,
      write.event.recordedAt,
      runId,
      write.expected.ledgerHeadSequence,
    );
    if (quotaUpdate.changes !== 1) snapshotDiverged("execution quota changed during its fenced mutation");
    const leaseUpdate = native.prepare(`
      UPDATE controller_leases
      SET last_mutation_at = ?
      WHERE run_id = ? AND controller_id = ? AND fencing_token = ?
        AND runtime_receipt_id = ? AND state = 'ACTIVE'
    `).run(
      write.event.recordedAt,
      runId,
      write.expected.controllerId,
      write.expected.fencingToken,
      write.expected.runtimeReceiptId,
    );
    if (leaseUpdate.changes !== 1) {
      throw new ExecutionContractError(
        "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED",
        "execution controller ownership changed during its fenced mutation",
      );
    }
    return decision.result;
  });
}

export function transactCanonicalExecutionArtifactMutation<T>(
  database: ExecutionSqliteDatabase,
  runId: string,
  decide: (rows: ExecutionCanonicalRunRows) => ExecutionArtifactMutationDecision<T>,
): T {
  return runImmediateExecutionTransaction(database, () => {
    const native = nativeDatabase(database);
    const decision = decide(readCanonicalExecutionRunRowsNative(native, runId));
    const { write } = decision;
    if (new Set(write.artifacts.map((artifact) => artifact.artifactId)).size !== write.artifacts.length) {
      throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution artifact identities are duplicated in one mutation");
    }
    for (const artifact of write.artifacts) {
      const existingArtifact = native.prepare<[string, string], { artifact_id: string }>(
        "SELECT artifact_id FROM artifacts WHERE run_id = ? AND artifact_id = ?",
      ).get(runId, artifact.artifactId);
      if (existingArtifact !== undefined) {
        throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution artifact already exists");
      }
    }
    const insertEvent = native.prepare(`
      INSERT INTO execution_events (
        run_id, sequence, event_hash, previous_event_hash, event_type, node_id,
        canonical_json, byte_length, runtime_receipt_id, fencing_token, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const event of write.events) {
      insertEvent.run(
        runId,
        event.sequence,
        event.eventHash,
        event.previousEventHash,
        event.eventType,
        event.nodeId,
        event.canonicalJson,
        event.byteLength,
        write.expected.runtimeReceiptId,
        write.expected.fencingToken,
        event.recordedAt,
      );
    }
    for (const artifact of write.artifacts) {
      native.prepare(`
        INSERT INTO artifacts (
          run_id, artifact_id, node_id, media_type, body, sha256, byte_length,
          source_event_sequence, runtime_receipt_id, fencing_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        runId,
        artifact.artifactId,
        artifact.nodeId,
        artifact.mediaType,
        artifact.body,
        artifact.sha256,
        artifact.byteLength,
        artifact.sourceEventSequence,
        write.expected.runtimeReceiptId,
        write.expected.fencingToken,
        artifact.createdAt,
      );
    }
    const lastEvent = write.events.at(-1);
    if (lastEvent === undefined) snapshotDiverged("execution result mutation has no ledger event");
    const runUpdate = native.prepare(`
      UPDATE runs
      SET run_state = ?, ledger_head_sequence = ?, ledger_head_hash = ?,
          graph_revision = ?, updated_at = ?
      WHERE run_id = ? AND ledger_head_sequence = ? AND ledger_head_hash = ?
        AND graph_revision = ?
    `).run(
      write.runState,
      lastEvent.sequence,
      lastEvent.eventHash,
      write.graphRevision,
      lastEvent.recordedAt,
      runId,
      write.expected.ledgerHeadSequence,
      write.expected.ledgerHeadHash,
      write.expected.graphRevision,
    );
    if (runUpdate.changes !== 1) snapshotDiverged("execution run changed during result admission");
    const projectionUpdate = native.prepare(`
      UPDATE run_projections
      SET graph_json = ?, graph_sha256 = ?, checkpoint_json = ?, checkpoint_sha256 = ?,
          derived_through_sequence = ?, derived_through_hash = ?, runtime_receipt_id = ?,
          fencing_token = ?, updated_at = ?
      WHERE run_id = ? AND derived_through_sequence = ? AND derived_through_hash = ?
    `).run(
      write.projection.graphJson,
      write.projection.graphSha256,
      write.projection.checkpointJson,
      write.projection.checkpointSha256,
      write.projection.derivedThroughSequence,
      write.projection.derivedThroughHash,
      write.expected.runtimeReceiptId,
      write.expected.fencingToken,
      lastEvent.recordedAt,
      runId,
      write.expected.ledgerHeadSequence,
      write.expected.ledgerHeadHash,
    );
    if (projectionUpdate.changes !== 1) snapshotDiverged("execution projection changed during result admission");
    const quotaUpdate = native.prepare(`
      UPDATE quota_usage
      SET event_count = ?, ledger_bytes = ?, artifact_bytes = ?,
          last_transaction_bytes = ?, updated_at = ?
      WHERE run_id = ? AND event_count = ?
    `).run(
      write.quota.eventCount,
      write.quota.ledgerBytes,
      write.quota.artifactBytes,
      write.quota.lastTransactionBytes,
      lastEvent.recordedAt,
      runId,
      write.expected.ledgerHeadSequence,
    );
    if (quotaUpdate.changes !== 1) snapshotDiverged("execution quota changed during result admission");
    const leaseUpdate = native.prepare(`
      UPDATE controller_leases
      SET last_mutation_at = ?
      WHERE run_id = ? AND controller_id = ? AND fencing_token = ?
        AND runtime_receipt_id = ? AND state = 'ACTIVE'
    `).run(
      lastEvent.recordedAt,
      runId,
      write.expected.controllerId,
      write.expected.fencingToken,
      write.expected.runtimeReceiptId,
    );
    if (leaseUpdate.changes !== 1) {
      throw new ExecutionContractError(
        "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED",
        "execution controller ownership changed during result admission",
      );
    }
    return decision.result;
  });
}

export function rebuildCanonicalExecutionProjection(
  database: ExecutionSqliteDatabase,
  write: ExecutionProjectionRebuildWrite,
): void {
  runImmediateExecutionTransaction(database, () => {
    const native = nativeDatabase(database);
    const existing = native.prepare<[string], { audit_id: string }>(
      "SELECT audit_id FROM recovery_audits WHERE audit_id = ?",
    ).get(write.auditId);
    if (existing !== undefined) {
      throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution recovery audit was already consumed");
    }
    const projection = native.prepare(`
      UPDATE run_projections
      SET graph_json = ?, graph_sha256 = ?, checkpoint_json = ?, checkpoint_sha256 = ?,
          derived_through_sequence = ?, derived_through_hash = ?, runtime_receipt_id = ?,
          fencing_token = ?, updated_at = ?
      WHERE run_id = ?
    `).run(
      write.graphJson,
      write.graphSha256,
      write.checkpointJson,
      write.checkpointSha256,
      write.expectedLedgerHeadSequence,
      write.expectedLedgerHeadHash,
      write.runtimeReceiptId,
      write.fencingToken,
      write.recordedAt,
      write.runId,
    );
    if (projection.changes !== 1) snapshotDiverged("execution projection rebuild target is missing");
    const run = native.prepare(`
      UPDATE runs
      SET run_state = ?, ledger_head_sequence = ?, ledger_head_hash = ?,
          graph_revision = ?, updated_at = ?
      WHERE run_id = ? AND ledger_head_sequence = ? AND ledger_head_hash = ?
    `).run(
      write.runState,
      write.expectedLedgerHeadSequence,
      write.expectedLedgerHeadHash,
      write.graphRevision,
      write.recordedAt,
      write.runId,
      write.expectedLedgerHeadSequence,
      write.expectedLedgerHeadHash,
    );
    if (run.changes !== 1) snapshotDiverged("execution run changed before projection rebuild");
    insertRecoveryReceipt(native, {
      auditId: write.auditId,
      disposition: "PROJECTION_REBUILT",
      databaseSha256: write.databaseSha256,
      logicalSha256: write.logicalSha256,
      canonicalJson: write.receiptCanonicalJson,
      receiptSha256: write.receiptSha256,
      runtimeReceiptId: write.runtimeReceiptId,
      recordedAt: write.recordedAt,
    });
  });
}

export function reconcileCanonicalExecutionController(
  database: ExecutionSqliteDatabase,
  write: ExecutionOwnershipReconciliationWrite,
): void {
  runImmediateExecutionTransaction(database, () => {
    const native = nativeDatabase(database);
    const existing = native.prepare<[string], { audit_id: string }>(
      "SELECT audit_id FROM recovery_audits WHERE audit_id = ?",
    ).get(write.auditId);
    if (existing !== undefined) {
      throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution recovery audit was already consumed");
    }
    const lease = native.prepare(`
      UPDATE controller_leases
      SET controller_id = ?, fencing_token = ?, runtime_receipt_id = ?,
          state = 'ACTIVE', acquired_at = ?, last_mutation_at = ?
      WHERE run_id = ? AND controller_id = ? AND fencing_token = ?
    `).run(
      write.controllerId,
      write.fencingToken,
      write.runtimeReceiptId,
      write.recordedAt,
      write.recordedAt,
      write.runId,
      write.expectedControllerId,
      write.expectedFencingToken,
    );
    if (lease.changes !== 1) {
      throw new ExecutionContractError("RECOVERY_IDENTITY_MISMATCH", "execution controller changed after its recovery audit");
    }
    insertRecoveryReceipt(native, {
      auditId: write.auditId,
      disposition: "OWNERSHIP_RECONCILED",
      databaseSha256: write.databaseSha256,
      logicalSha256: write.logicalSha256,
      canonicalJson: write.receiptCanonicalJson,
      receiptSha256: write.receiptSha256,
      runtimeReceiptId: write.runtimeReceiptId,
      recordedAt: write.recordedAt,
    });
  });
}

function openConfiguredDatabase(
  request: ExecutionSqliteOpenRequest,
  fileMustExist: boolean,
  readonly: boolean,
): ExecutionSqliteDatabase {
  const { Driver } = loadPlatformDriver();
  let native: NativeDatabase;
  try {
    native = new Driver(request.databasePath, { fileMustExist, readonly, timeout: 0 });
  } catch (error) {
    throw normalizedStorageError(error, "execution SQLite database could not be opened");
  }
  try {
    configureConnection(native, request.storagePolicy, readonly);
    if (!fileMustExist) native.exec(executionSchemaSql);
    const inspection = inspectNativeConfiguration(native);
    if (inspection.userVersion !== CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION) {
      throw new ExecutionContractError("UNSUPPORTED_SCHEMA_VERSION", "execution SQLite schema version is unsupported");
    }
    assertPolicyCompatibility(inspection, request.storagePolicy, readonly);
    const wrapper: ExecutionSqliteDatabase = {
      databasePath: request.databasePath,
      sqliteVersion: sqliteVersion(native),
      schemaVersion: inspection.userVersion,
      readonly,
      close() {
        closeExecutionSqliteDatabase(wrapper);
      },
    };
    nativeDatabases.set(wrapper, native);
    return wrapper;
  } catch (error) {
    native.close();
    if (error instanceof ExecutionContractError) throw error;
    throw normalizedStorageError(error, "execution SQLite configuration failed");
  }
}

function readCanonicalExecutionRunRowsNative(
  native: NativeDatabase,
  runId: string,
): ExecutionCanonicalRunRows {
  const metadata = native.prepare<[], StorageMetadataRow>("SELECT * FROM storage_metadata WHERE singleton = 1").get();
  const run = native.prepare<[string], RunRow>("SELECT * FROM runs WHERE run_id = ?").get(runId);
  if (run === undefined) {
    return {
      metadata,
      run,
      controller: undefined,
      receipt: undefined,
      events: [],
      projection: undefined,
      artifacts: [],
      quota: undefined,
    };
  }
  return {
    metadata,
    run,
    controller: native.prepare<[string], ControllerLeaseRow>("SELECT * FROM controller_leases WHERE run_id = ?").get(runId),
    receipt: native.prepare<[string], RuntimeReceiptRow>("SELECT * FROM runtime_receipts WHERE receipt_id = ?").get(run.created_receipt_id),
    events: native.prepare<[string], ExecutionEventRow>("SELECT * FROM execution_events WHERE run_id = ? ORDER BY sequence").all(runId),
    projection: native.prepare<[string], RunProjectionRow>("SELECT * FROM run_projections WHERE run_id = ?").get(runId),
    artifacts: native.prepare<[string], ArtifactRow>("SELECT * FROM artifacts WHERE run_id = ? ORDER BY artifact_id").all(runId),
    quota: native.prepare<[string], QuotaUsageRow>("SELECT * FROM quota_usage WHERE run_id = ?").get(runId),
  };
}

function insertRecoveryReceipt(
  native: NativeDatabase,
  receipt: {
    auditId: string;
    disposition: string;
    databaseSha256: string;
    logicalSha256: string;
    canonicalJson: string;
    receiptSha256: string;
    runtimeReceiptId: string;
    recordedAt: string;
  },
): void {
  native.prepare(`
    INSERT INTO recovery_audits (
      audit_id, disposition, database_sha256, logical_sha256, canonical_json,
      receipt_sha256, runtime_receipt_id, observed_at, consumed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    receipt.auditId,
    receipt.disposition,
    receipt.databaseSha256,
    receipt.logicalSha256,
    receipt.canonicalJson,
    receipt.receiptSha256,
    receipt.runtimeReceiptId,
    receipt.recordedAt,
    receipt.recordedAt,
  );
}

function configureConnection(native: NativeDatabase, policy: ExecutionStoragePolicy, readonly: boolean): void {
  native.pragma("foreign_keys = ON");
  native.pragma("trusted_schema = OFF");
  native.pragma("busy_timeout = 0");
  if (!readonly) {
    native.pragma("journal_mode = DELETE");
    native.pragma("synchronous = FULL");
    const pageSize = numberPragma(native, "page_size");
    const maxPages = Math.floor(policy.limits.maxWorkspaceBytes / pageSize);
    native.pragma(`max_page_count = ${maxPages}`);
  }
}

function inspectNativeConfiguration(native: NativeDatabase): ExecutionSqliteInspection {
  const compileOptions = native.pragma("compile_options") as readonly { compile_options: string }[];
  return {
    journalMode: stringPragma(native, "journal_mode"),
    synchronous: numberPragma(native, "synchronous"),
    foreignKeys: numberPragma(native, "foreign_keys"),
    trustedSchema: numberPragma(native, "trusted_schema"),
    busyTimeout: numberPragma(native, "busy_timeout"),
    userVersion: numberPragma(native, "user_version"),
    pageSize: numberPragma(native, "page_size"),
    maxPageCount: numberPragma(native, "max_page_count"),
    compileMaxLength: compileLimit(compileOptions, "MAX_LENGTH"),
    compileMaxSqlLength: compileLimit(compileOptions, "MAX_SQL_LENGTH"),
    tables: schemaNames(native, "table"),
    triggers: schemaNames(native, "trigger"),
  };
}

function assertPolicyCompatibility(
  inspection: ExecutionSqliteInspection,
  policy: ExecutionStoragePolicy,
  readonly: boolean,
): void {
  if (
    inspection.journalMode !== "delete"
    || inspection.synchronous !== 2
    || inspection.foreignKeys !== 1
    || inspection.trustedSchema !== 0
    || inspection.busyTimeout !== 0
  ) {
    storageError("execution SQLite durability configuration does not match policy");
  }
  if (
    inspection.compileMaxLength < policy.limits.maxCanonicalBlobBytes
    || inspection.compileMaxSqlLength < policy.limits.maxPreparedSqlBytes
  ) {
    storageError("execution SQLite compile limits are below storage policy");
  }
  const expectedMaxPages = Math.floor(policy.limits.maxWorkspaceBytes / inspection.pageSize);
  if (!readonly && inspection.maxPageCount !== expectedMaxPages) storageError("execution SQLite page ceiling does not match storage policy");
}

function loadPlatformDriver(): { Driver: NativeDatabaseConstructor; bindingPath: string } {
  const target = platformTarget();
  let packagePath: string;
  try {
    packagePath = require.resolve("better-sqlite3/package.json");
  } catch {
    storageError("better-sqlite3 package identity is unavailable");
  }
  const bindingPath = join(dirname(packagePath), "prebuilds", `${target}.node`);
  try {
    const Driver = require(`better-sqlite3/${target}`) as NativeDatabaseConstructor;
    return { Driver, bindingPath };
  } catch {
    unsupportedHost("better-sqlite3 platform prebuild is unavailable");
  }
}

function platformTarget(): string {
  if (!["x64", "arm64"].includes(process.arch)) unsupportedHost("SQLite architecture is unsupported");
  if (process.platform === "win32" || process.platform === "darwin") return `${process.platform}-${process.arch}`;
  if (process.platform === "linux") return `${isLinuxMusl() ? "linuxmusl" : "linux"}-${process.arch}`;
  unsupportedHost("SQLite platform is unsupported");
}

function isLinuxMusl(): boolean {
  const report = process.report?.getReport() as { header?: unknown } | undefined;
  const header = report?.header as Record<string, unknown> | undefined;
  if (header === undefined) unsupportedHost("Linux runtime report is unavailable");
  return typeof header.glibcVersionRuntime !== "string";
}

function validateDatabaseTarget(databasePath: string, mustExist: boolean): void {
  if (!isAbsolute(databasePath)) storageError("execution SQLite database path must be absolute");
  try {
    const parent = lstatSync(dirname(databasePath));
    if (!parent.isDirectory() || parent.isSymbolicLink()) storageError("execution SQLite parent must be a regular directory");
    const database = lstatSync(databasePath, { throwIfNoEntry: false });
    if (mustExist && (database === undefined || !database.isFile() || database.isSymbolicLink())) storageError("execution SQLite database is unavailable");
    if (!mustExist && database !== undefined) throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution SQLite database already exists");
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    storageError("execution SQLite target cannot be inspected");
  }
}

function nativeDatabase(database: ExecutionSqliteDatabase): NativeDatabase {
  const native = nativeDatabases.get(database);
  if (native === undefined) throw new ExecutionContractError("EXECUTION_SQLITE_CLOSED", "execution SQLite database is closed");
  return native;
}

function schemaNames(native: NativeDatabase, type: "table" | "trigger"): readonly string[] {
  return native.prepare<[string], { name: string }>("SELECT name FROM sqlite_schema WHERE type = ? AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all(type)
    .map((row) => row.name);
}

function sqliteVersion(native: NativeDatabase): string {
  const row = native.prepare<[], { version: string }>("SELECT sqlite_version() AS version").get();
  if (row === undefined) storageError("SQLite version is unavailable");
  return row.version;
}

function stringPragma(native: NativeDatabase, pragma: string): string {
  const value = native.pragma(pragma, { simple: true });
  if (typeof value !== "string") storageError("SQLite text pragma is unavailable");
  return value.toLowerCase();
}

function numberPragma(native: NativeDatabase, pragma: string): number {
  const value = native.pragma(pragma, { simple: true });
  if (typeof value !== "number" || !Number.isSafeInteger(value)) storageError("SQLite numeric pragma is unavailable");
  return value;
}

function compileLimit(options: readonly { compile_options: string }[], name: string): number {
  const prefix = `${name}=`;
  const value = options.find((entry) => entry.compile_options.startsWith(prefix))?.compile_options.slice(prefix.length);
  if (value === undefined || !/^\d+$/u.test(value)) storageError("SQLite compile limit is unavailable");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) storageError("SQLite compile limit is invalid");
  return parsed;
}

function assertStorageMetadata(
  actual: StorageMetadataRow,
  expected: ExecutionStorageIdentityWrite,
): void {
  if (
    actual.singleton !== 1
    || actual.schema_version !== CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION
    || actual.workspace_id !== expected.workspaceId
    || actual.workspace_identity_sha256 !== expected.workspaceIdentitySha256
    || actual.runtime_policy_id !== expected.runtimePolicyId
    || actual.runtime_policy_sha256 !== expected.runtimePolicySha256
    || actual.storage_policy_id !== expected.storagePolicyId
    || actual.storage_policy_sha256 !== expected.storagePolicySha256
  ) {
    snapshotDiverged("execution storage metadata does not match the admitted workspace and policies");
  }
}

function assertRuntimeReceipt(
  actual: RuntimeReceiptRow,
  expected: ExecutionStorageIdentityWrite["runtimeReceipt"],
): void {
  if (
    actual.receipt_id !== expected.receiptId
    || actual.session_id !== expected.sessionId
    || actual.lane !== expected.lane
    || actual.canonical_json !== expected.canonicalJson
    || actual.receipt_sha256 !== expected.receiptSha256
    || actual.observed_at !== expected.observedAt
  ) {
    snapshotDiverged("stored runtime receipt does not match its canonical identity");
  }
}

function normalizedStorageError(error: unknown, message: string): ExecutionContractError {
  const code = sqliteCode(error);
  if (code === "SQLITE_BUSY" || code === "SQLITE_LOCKED") return new ExecutionContractError("WRITER_CONFLICT", "execution SQLite writer is already active");
  return new ExecutionContractError("EXECUTION_SQLITE_ERROR", message);
}

function sqliteCode(error: unknown): string | null {
  if (error === null || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function storageError(message: string): never {
  throw new ExecutionContractError("EXECUTION_SQLITE_ERROR", message);
}

function snapshotDiverged(message: string): never {
  throw new ExecutionContractError("SNAPSHOT_DIVERGED", message);
}

function unsupportedHost(message: string): never {
  throw new ExecutionContractError("HOST_PROFILE_UNSUPPORTED", message);
}

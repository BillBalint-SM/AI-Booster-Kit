import { createHash } from "node:crypto";
import { lstat, mkdir, readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

import { canonicalExecutionJson, executionDigest } from "../identity.js";
import {
  createExecutionRuntimeReceipt,
} from "../runtime-receipt.js";
import type {
  ExecutionProcessRuntimeObservation,
  ExecutionRuntimeReceipt,
} from "../runtime-receipt.js";
import {
  admitExecutionRuntime,
  executionPersistencePolicy,
  parseExecutionPersistencePolicy,
} from "../runtime-policy.js";
import type { ExecutionStoragePolicy } from "../runtime-policy.js";
import { ExecutionContractError } from "../types.js";
import { resolveExecutionWorkspaceStorage } from "../workspace-storage.js";
import {
  bootstrapExecutionStorageIdentity,
  createExecutionSqliteDatabase,
  observeExecutionSqliteDriver,
  openExistingExecutionSqliteDatabase,
  openReadOnlyExecutionSqliteDatabase,
  readCanonicalExecutionRunRows,
} from "./sqlite-adapter.js";
import type { ExecutionSqliteDatabase } from "./sqlite-adapter.js";

export interface ExecutionStoreSessionRequest {
  workspaceRoot: string;
  appDataRoot: string;
  runtime: ExecutionProcessRuntimeObservation;
  kernelRevision: string;
  dependencyLockPath: string;
  sessionId: string;
  hostSessionId: string;
  observedAt: string;
}

export interface ExecutionStoreSession {
  workspaceId: string;
  workspaceIdentityDigest: string;
  databasePath: string;
  runtimeReceipt: ExecutionRuntimeReceipt;
  storagePolicy: ExecutionStoragePolicy;
  database: ExecutionSqliteDatabase;
}

export interface ExistingExecutionStoreSessionRequest {
  databasePath: string;
  runId: string;
  runtime: ExecutionProcessRuntimeObservation;
}

export async function openExecutionStoreSession(
  request: ExecutionStoreSessionRequest,
): Promise<ExecutionStoreSession> {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy);
  const admission = admitExecutionRuntime(policy.runtimePolicy, request.runtime);
  if (!admission.accepted) {
    throw new ExecutionContractError(
      admission.code,
      "execution runtime is outside the admitted authoritative and conformance lanes",
    );
  }

  const location = await resolveExecutionWorkspaceStorage({
    platform: request.runtime.platform,
    workspaceRoot: request.workspaceRoot,
    appDataRoot: request.appDataRoot,
  });
  const driver = await observeExecutionSqliteDriver();
  const dependencyLockSha256 = await digestRegularFile(request.dependencyLockPath);
  const receipt = createExecutionRuntimeReceipt({
    admission,
    runtimePolicy: policy.runtimePolicy,
    runtime: request.runtime,
    driver,
    kernelRevision: request.kernelRevision,
    dependencyLockSha256,
    runtimePolicyId: policy.runtimePolicy.policyId,
    runtimePolicySha256: policy.runtimePolicy.policyDigest,
    storagePolicyId: policy.storagePolicy.policyId,
    storagePolicySha256: policy.storagePolicy.policyDigest,
    sessionId: request.sessionId,
    hostSessionId: request.hostSessionId,
    observedAt: request.observedAt,
  });
  const databaseWasCreated = !(await pathExists(location.databasePath));

  await mkdir(location.storageDirectory, { recursive: true });
  let database: ExecutionSqliteDatabase | undefined;
  try {
    database = databaseWasCreated
      ? createExecutionSqliteDatabase({ databasePath: location.databasePath, storagePolicy: policy.storagePolicy })
      : openExistingExecutionSqliteDatabase({ databasePath: location.databasePath, storagePolicy: policy.storagePolicy });
    bootstrapExecutionStorageIdentity(database, {
      databaseWasCreated,
      workspaceId: location.workspaceId,
      workspaceIdentitySha256: location.workspaceIdentityDigest,
      runtimePolicyId: policy.runtimePolicy.policyId,
      runtimePolicySha256: policy.runtimePolicy.policyDigest,
      storagePolicyId: policy.storagePolicy.policyId,
      storagePolicySha256: policy.storagePolicy.policyDigest,
      createdAt: request.observedAt,
      runtimeReceipt: {
        receiptId: receipt.receiptId,
        sessionId: receipt.sessionId,
        lane: receipt.lane,
        canonicalJson: canonicalExecutionJson(receipt),
        receiptSha256: executionDigest(receipt),
        observedAt: receipt.observedAt,
      },
    });
    return {
      workspaceId: location.workspaceId,
      workspaceIdentityDigest: location.workspaceIdentityDigest,
      databasePath: location.databasePath,
      runtimeReceipt: receipt,
      storagePolicy: policy.storagePolicy,
      database,
    };
  } catch (error) {
    if (database !== undefined) database.close();
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError("STORAGE_UNAVAILABLE", "execution storage bootstrap failed after its evidence path was created");
  }
}

export function closeExecutionStoreSession(session: ExecutionStoreSession): void {
  session.database.close();
}

export function openMutableExecutionStoreSessionForRun(
  request: ExistingExecutionStoreSessionRequest,
): ExecutionStoreSession {
  return openBoundExecutionStoreSession(request, openExistingExecutionSqliteDatabase);
}

export function openReadOnlyExecutionStoreSessionForRun(
  request: ExistingExecutionStoreSessionRequest,
): ExecutionStoreSession {
  return openBoundExecutionStoreSession(request, openReadOnlyExecutionSqliteDatabase);
}

function openBoundExecutionStoreSession(
  request: ExistingExecutionStoreSessionRequest,
  openDatabase: typeof openExistingExecutionSqliteDatabase,
): ExecutionStoreSession {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy);
  const admission = admitExecutionRuntime(policy.runtimePolicy, request.runtime);
  if (!admission.accepted) {
    throw new ExecutionContractError(admission.code, "execution runtime is outside the admitted persistence lanes");
  }
  let database: ExecutionSqliteDatabase | undefined;
  try {
    database = openDatabase({ databasePath: request.databasePath, storagePolicy: policy.storagePolicy });
    const rows = readCanonicalExecutionRunRows(database, request.runId);
    if (rows.metadata === undefined || rows.run === undefined || rows.receipt === undefined) {
      throw new ExecutionContractError("EXECUTION_RUN_NOT_FOUND", "execution database does not contain the requested run and runtime receipt");
    }
    if (
      rows.metadata.storage_policy_id !== policy.storagePolicy.policyId
      || rows.metadata.storage_policy_sha256 !== policy.storagePolicy.policyDigest
      || rows.metadata.runtime_policy_id !== policy.runtimePolicy.policyId
      || rows.metadata.runtime_policy_sha256 !== policy.runtimePolicy.policyDigest
    ) {
      throw new ExecutionContractError("SNAPSHOT_DIVERGED", "execution database policy identity differs from this kernel");
    }
    const runtimeReceipt = parseStoredRuntimeReceipt(rows.receipt.canonical_json);
    if (
      runtimeReceipt.receiptId !== rows.receipt.receipt_id
      || runtimeReceipt.sessionId !== rows.receipt.session_id
      || runtimeReceipt.lane !== rows.receipt.lane
      || runtimeReceipt.observedAt !== rows.receipt.observed_at
      || executionDigest(runtimeReceipt) !== rows.receipt.receipt_sha256
      || rows.run.created_receipt_id !== runtimeReceipt.receiptId
    ) {
      throw new ExecutionContractError("SNAPSHOT_DIVERGED", "execution database runtime receipt identity is invalid");
    }
    return {
      workspaceId: rows.metadata.workspace_id,
      workspaceIdentityDigest: rows.metadata.workspace_identity_sha256,
      databasePath: request.databasePath,
      runtimeReceipt,
      storagePolicy: policy.storagePolicy,
      database,
    };
  } catch (error) {
    if (database !== undefined) database.close();
    throw error;
  }
}

function parseStoredRuntimeReceipt(canonicalJson: string): ExecutionRuntimeReceipt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(canonicalJson) as unknown;
  } catch {
    throw new ExecutionContractError("SNAPSHOT_DIVERGED", "execution database runtime receipt is malformed");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || canonicalExecutionJson(parsed) !== canonicalJson) {
    throw new ExecutionContractError("SNAPSHOT_DIVERGED", "execution database runtime receipt is not canonical");
  }
  const record = parsed as Record<string, unknown>;
  const { receiptId, ...body } = record;
  if (typeof receiptId !== "string" || executionDigest(body) !== receiptId) {
    throw new ExecutionContractError("SNAPSHOT_DIVERGED", "execution database runtime receipt digest is invalid");
  }
  return parsed as ExecutionRuntimeReceipt;
}

async function digestRegularFile(path: string): Promise<string> {
  if (!isAbsolute(path)) {
    throw new ExecutionContractError("EXECUTION_DEPENDENCY_LOCK_INVALID", "dependency lock path must be absolute");
  }
  let details;
  try {
    details = await lstat(path);
  } catch {
    throw new ExecutionContractError("EXECUTION_DEPENDENCY_LOCK_INVALID", "dependency lock file is unavailable");
  }
  if (!details.isFile() || details.isSymbolicLink()) {
    throw new ExecutionContractError("EXECUTION_DEPENDENCY_LOCK_INVALID", "dependency lock must be a regular file");
  }
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissingPath(error)) return false;
    throw new ExecutionContractError("STORAGE_UNAVAILABLE", "execution storage target cannot be inspected");
  }
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

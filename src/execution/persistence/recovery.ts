import { createHash } from "node:crypto";

import { validateExecutionGraph } from "../graph.js";
import { canonicalExecutionJson, executionDigest } from "../identity.js";
import {
  executionCheckpointMatches,
  parseExecutionCheckpoint,
  parseExecutionEvent,
  replayExecutionLedger,
} from "../ledger.js";
import type { ExecutionProcessRuntimeObservation, ExecutionRuntimeReceipt } from "../runtime-receipt.js";
import {
  admitExecutionRuntime,
  executionPersistencePolicy,
  parseExecutionPersistencePolicy,
} from "../runtime-policy.js";
import type { ExecutionPersistencePolicy } from "../runtime-policy.js";
import { ExecutionContractError } from "../types.js";
import type { ExecutionCheckpoint, ExecutionGraph } from "../types.js";
import { parseExecutionEnvelope } from "../validation.js";
import { resolveExecutionWorkspaceStorage } from "../workspace-storage.js";
import {
  executionSqliteFileSha256,
  inspectExecutionSqliteIntegrity,
  openExecutionSqliteInspectionDatabase,
  readExecutionRecoverySnapshot,
  rebuildCanonicalExecutionProjection,
  reconcileCanonicalExecutionController,
} from "./sqlite-adapter.js";
import type {
  ExecutionCanonicalRunRows,
  ExecutionRecoverySnapshot,
  ExecutionSqliteDatabase,
  RuntimeReceiptRow,
} from "./sqlite-adapter.js";
import type { ExecutionStoreSession } from "./session.js";
import { materializeTransactionalExecutionRunRows } from "./store.js";

export type ExecutionRecoveryDisposition =
  | "HEALTHY"
  | "PROJECTION_REBUILD_REQUIRED"
  | "PENDING_EFFECT_RECONCILIATION_REQUIRED"
  | "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED"
  | "STORAGE_CORRUPT"
  | "UNSUPPORTED_SCHEMA_OR_RUNTIME";

export interface ExecutionRecoverySessionRequest {
  workspaceRoot: string;
  appDataRoot: string;
  runtime: ExecutionProcessRuntimeObservation;
  controllerId: string;
  hostSessionId: string;
  observedAt: string;
}

export interface ExecutionRecoverySession {
  workspaceId: string;
  workspaceIdentityDigest: string;
  databasePath: string;
  database: ExecutionSqliteDatabase;
  policy: ExecutionPersistencePolicy;
  controllerId: string;
  hostSessionId: string;
  observedAt: string;
}

export interface ExecutionRecoveryAudit {
  auditVersion: "1.0";
  auditId: string;
  disposition: ExecutionRecoveryDisposition;
  workspaceId: string;
  databaseSha256Before: string;
  databaseSha256After: string;
  logicalSha256Before: string;
  logicalSha256After: string;
  runIds: readonly string[];
  controllerId: string;
  hostSessionId: string;
  observedAt: string;
  mutation: "NONE";
}

export interface RebuildExecutionProjectionsRequest {
  runId: string;
  audit: ExecutionRecoveryAudit;
  recordedAt: string;
}

export interface ExecutionReconciliationReceipt {
  receiptVersion: "1.0";
  reconciliationReceiptId: string;
  auditId: string;
  runId: string;
  disposition: "PROJECTION_REBUILT";
  runtimeReceiptId: string;
  recordedAt: string;
}

export interface ReconcileExecutionControllerRequest {
  runId: string;
  audit: ExecutionRecoveryAudit;
  controllerId: string;
  recordedAt: string;
}

export async function openExecutionRecoverySession(
  request: ExecutionRecoverySessionRequest,
): Promise<ExecutionRecoverySession> {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy);
  const admission = admitExecutionRuntime(policy.runtimePolicy, request.runtime);
  if (!admission.accepted) {
    throw new ExecutionContractError("UNSUPPORTED_RUNTIME_VERSION", "recovery runtime is outside the admitted inspection lanes");
  }
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/u.test(request.controllerId)) {
    throw new ExecutionContractError("EXECUTION_CONTROLLER_INVALID", "recovery controller identifier is invalid");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(request.hostSessionId)) {
    throw new ExecutionContractError("HOST_PROFILE_UNSUPPORTED", "recovery host session identifier is invalid");
  }
  assertCanonicalInstant(request.observedAt);
  const location = await resolveExecutionWorkspaceStorage({
    platform: request.runtime.platform,
    workspaceRoot: request.workspaceRoot,
    appDataRoot: request.appDataRoot,
  });
  const database = openExecutionSqliteInspectionDatabase({
    databasePath: location.databasePath,
    storagePolicy: policy.storagePolicy,
  });
  return {
    workspaceId: location.workspaceId,
    workspaceIdentityDigest: location.workspaceIdentityDigest,
    databasePath: location.databasePath,
    database,
    policy,
    controllerId: request.controllerId,
    hostSessionId: request.hostSessionId,
    observedAt: request.observedAt,
  };
}

export function closeExecutionRecoverySession(session: ExecutionRecoverySession): void {
  session.database.close();
}

export function auditExecutionStorage(session: ExecutionRecoverySession): ExecutionRecoveryAudit {
  const databaseSha256Before = executionSqliteFileSha256(session.database);
  let snapshot: ExecutionRecoverySnapshot | null = null;
  let logicalSha256Before: string;
  let disposition: ExecutionRecoveryDisposition;
  let runIds: readonly string[] = [];
  if (session.database.schemaVersion !== 1) {
    logicalSha256Before = executionDigest({ schemaVersion: session.database.schemaVersion });
    disposition = "UNSUPPORTED_SCHEMA_OR_RUNTIME";
  } else {
    try {
      snapshot = readExecutionRecoverySnapshot(session.database);
      logicalSha256Before = recoveryLogicalDigest(snapshot);
      runIds = snapshot.runs.flatMap((rows) => rows.run === undefined ? [] : [rows.run.run_id]);
      disposition = classifyRecoverySnapshot(session, snapshot);
    } catch {
      logicalSha256Before = executionDigest({ databaseSha256Before, classification: "UNREADABLE" });
      disposition = "STORAGE_CORRUPT";
    }
  }
  const databaseSha256After = executionSqliteFileSha256(session.database);
  let logicalSha256After = logicalSha256Before;
  if (snapshot !== null) {
    try {
      logicalSha256After = recoveryLogicalDigest(readExecutionRecoverySnapshot(session.database));
    } catch {
      logicalSha256After = executionDigest({ databaseSha256After, classification: "UNREADABLE" });
    }
  }
  if (databaseSha256Before !== databaseSha256After || logicalSha256Before !== logicalSha256After) {
    disposition = "STORAGE_CORRUPT";
  }
  const body = {
    auditVersion: "1.0" as const,
    disposition,
    workspaceId: session.workspaceId,
    databaseSha256Before,
    databaseSha256After,
    logicalSha256Before,
    logicalSha256After,
    runIds,
    controllerId: session.controllerId,
    hostSessionId: session.hostSessionId,
    observedAt: session.observedAt,
    mutation: "NONE" as const,
  };
  return { ...body, auditId: executionDigest(body) };
}

export function rebuildExecutionProjections(
  session: ExecutionStoreSession,
  request: RebuildExecutionProjectionsRequest,
): ExecutionReconciliationReceipt {
  if (request.audit.disposition !== "PROJECTION_REBUILD_REQUIRED" || !request.audit.runIds.includes(request.runId)) {
    recoveryMismatch("projection rebuild requires a matching recovery audit");
  }
  assertAuditStillMatches(session.database, request.audit);
  const rows = readExecutionRecoverySnapshot(session.database).runs.find((candidate) => candidate.run?.run_id === request.runId);
  if (rows === undefined) recoveryMismatch("projection rebuild run is missing");
  const replay = replayableProjection(rows);
  if (replay === null) recoveryMismatch("projection rebuild source is not a valid ledger prefix");
  const controller = rows.controller;
  if (controller === undefined || controller.runtime_receipt_id !== session.runtimeReceipt.receiptId) {
    recoveryMismatch("projection rebuild session does not own the run");
  }
  const receiptBody = {
    receiptVersion: "1.0" as const,
    auditId: request.audit.auditId,
    runId: request.runId,
    disposition: "PROJECTION_REBUILT" as const,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    recordedAt: request.recordedAt,
  };
  const receiptSha256 = executionDigest(receiptBody);
  rebuildCanonicalExecutionProjection(session.database, {
    auditId: request.audit.auditId,
    runId: request.runId,
    expectedLedgerHeadSequence: replay.checkpoint.lastEventSequence,
    expectedLedgerHeadHash: replay.checkpoint.lastEventHash,
    graphJson: canonicalExecutionJson(replay.graph),
    graphSha256: executionDigest(replay.graph),
    checkpointJson: canonicalExecutionJson(replay.checkpoint),
    checkpointSha256: executionDigest(replay.checkpoint),
    runState: replay.checkpoint.runState,
    graphRevision: replay.graph.graphRevision,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    fencingToken: controller.fencing_token,
    receiptCanonicalJson: canonicalExecutionJson(receiptBody),
    receiptSha256,
    databaseSha256: request.audit.databaseSha256Before,
    logicalSha256: request.audit.logicalSha256Before,
    recordedAt: request.recordedAt,
  });
  return {
    ...receiptBody,
    reconciliationReceiptId: request.audit.auditId,
  };
}

export function reconcileExecutionControllerOwnership(
  session: ExecutionStoreSession,
  request: ReconcileExecutionControllerRequest,
): { controllerId: string; fencingToken: number; reconciliationReceiptId: string } {
  if (
    request.audit.disposition !== "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED"
    || !request.audit.runIds.includes(request.runId)
    || request.audit.controllerId !== request.controllerId
  ) {
    recoveryMismatch("controller reconciliation requires a matching recovery audit and controller");
  }
  assertAuditStillMatches(session.database, request.audit);
  const rows = readExecutionRecoverySnapshot(session.database).runs.find((candidate) => candidate.run?.run_id === request.runId);
  const controller = rows?.controller;
  if (controller === undefined) recoveryMismatch("controller reconciliation lease is missing");
  const fencingToken = controller.fencing_token + 1;
  const receiptBody = {
    receiptVersion: "1.0" as const,
    auditId: request.audit.auditId,
    runId: request.runId,
    disposition: "OWNERSHIP_RECONCILED" as const,
    controllerId: request.controllerId,
    fencingToken,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    recordedAt: request.recordedAt,
  };
  reconcileCanonicalExecutionController(session.database, {
    auditId: request.audit.auditId,
    runId: request.runId,
    expectedControllerId: controller.controller_id,
    expectedFencingToken: controller.fencing_token,
    controllerId: request.controllerId,
    fencingToken,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    receiptCanonicalJson: canonicalExecutionJson(receiptBody),
    receiptSha256: executionDigest(receiptBody),
    databaseSha256: request.audit.databaseSha256Before,
    logicalSha256: request.audit.logicalSha256Before,
    recordedAt: request.recordedAt,
  });
  return { controllerId: request.controllerId, fencingToken, reconciliationReceiptId: request.audit.auditId };
}

function classifyRecoverySnapshot(
  session: ExecutionRecoverySession,
  snapshot: ExecutionRecoverySnapshot,
): ExecutionRecoveryDisposition {
  const integrity = inspectExecutionSqliteIntegrity(session.database);
  if (integrity.length !== 1 || integrity[0]?.toLowerCase() !== "ok") return "STORAGE_CORRUPT";
  if (
    snapshot.metadata === undefined
    || snapshot.metadata.workspace_id !== session.workspaceId
    || snapshot.metadata.workspace_identity_sha256 !== session.workspaceIdentityDigest
    || snapshot.metadata.runtime_policy_sha256 !== session.policy.runtimePolicy.policyDigest
    || snapshot.metadata.storage_policy_sha256 !== session.policy.storagePolicy.policyDigest
  ) {
    return "STORAGE_CORRUPT";
  }
  const receipts = new Map<string, ExecutionRuntimeReceipt>();
  for (const row of snapshot.runtimeReceipts) {
    const parsed = parseStoredRuntimeReceipt(row);
    const node = parsed.node;
    const admission = admitExecutionRuntime(session.policy.runtimePolicy, {
      nodeVersion: node.version,
      ltsName: node.lts,
    });
    if (!admission.accepted) return "UNSUPPORTED_SCHEMA_OR_RUNTIME";
    const { receiptId, ...body } = parsed;
    if (receiptId !== row.receipt_id || executionDigest(body) !== receiptId || executionDigest(parsed) !== row.receipt_sha256) {
      return "STORAGE_CORRUPT";
    }
    receipts.set(row.receipt_id, parsed);
  }
  let projectionMismatch = false;
  for (const rows of snapshot.runs) {
    if (rows.run === undefined) return "STORAGE_CORRUPT";
    const receipt = receipts.get(rows.run.created_receipt_id);
    if (receipt === undefined) return "STORAGE_CORRUPT";
    const storeSession = recoveryAsStoreSession(session, receipt);
    try {
      materializeTransactionalExecutionRunRows(storeSession, rows.run.run_id, rows);
    } catch (error) {
      if (contractCode(error) === "SNAPSHOT_DIVERGED" && replayableProjection(rows) !== null) {
        projectionMismatch = true;
      } else {
        return "STORAGE_CORRUPT";
      }
    }
  }
  if (snapshot.operationIntents.some((intent) => intent.disposition !== "RECEIPTED")) {
    return "PENDING_EFFECT_RECONCILIATION_REQUIRED";
  }
  if (projectionMismatch) return "PROJECTION_REBUILD_REQUIRED";
  for (const rows of snapshot.runs) {
    const controller = rows.controller;
    if (controller === undefined) return "STORAGE_CORRUPT";
    const receipt = receipts.get(controller.runtime_receipt_id);
    if (
      controller.state !== "ACTIVE"
      || controller.controller_id !== session.controllerId
      || receipt?.hostSessionId !== session.hostSessionId
    ) {
      return "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED";
    }
  }
  return "HEALTHY";
}

function replayableProjection(
  rows: ExecutionCanonicalRunRows,
): { graph: ExecutionGraph; checkpoint: ExecutionCheckpoint } | null {
  try {
    if (rows.run === undefined || rows.projection === undefined || rows.quota === undefined) return null;
    const envelopeValue = parseCanonicalJson(rows.run.envelope_json);
    const envelope = parseExecutionEnvelope(envelopeValue);
    if (executionDigest(envelope) !== rows.run.envelope_sha256) return null;
    const graphValue = parseCanonicalJson(rows.projection.graph_json);
    const graph = validateExecutionGraph(graphValue, envelope);
    if (executionDigest(graph) !== rows.projection.graph_sha256) return null;
    const events = rows.events.map((row) => {
      const event = parseExecutionEvent(parseCanonicalJson(row.canonical_json));
      if (
        event.eventHash !== row.event_hash
        || event.sequence !== row.sequence
        || event.previousEventHash !== row.previous_event_hash
        || Buffer.byteLength(row.canonical_json, "utf8") !== row.byte_length
      ) return invalidProjectionSource();
      return event;
    });
    const checkpoint = replayExecutionLedger(events, envelope, graph);
    if (
      rows.run.ledger_head_sequence !== checkpoint.lastEventSequence
      || rows.run.ledger_head_hash !== checkpoint.lastEventHash
      || rows.quota.event_count !== checkpoint.lastEventSequence
      || rows.quota.ledger_bytes !== rows.events.reduce((sum, event) => sum + event.byte_length, 0)
    ) return null;
    for (const artifact of rows.artifacts) {
      if (
        artifact.body.byteLength !== artifact.byte_length
        || createHash("sha256").update(artifact.body).digest("hex") !== artifact.sha256
        || !events.some((event) => event.sequence === artifact.source_event_sequence)
      ) return null;
    }
    if (rows.quota.artifact_bytes !== rows.artifacts.reduce((sum, artifact) => sum + artifact.byte_length, 0)) return null;
    const storedCheckpoint = parseExecutionCheckpoint(parseCanonicalJson(rows.projection.checkpoint_json));
    if (
      executionDigest(storedCheckpoint) === rows.projection.checkpoint_sha256
      && executionCheckpointMatches(storedCheckpoint, checkpoint)
      && rows.projection.derived_through_sequence === checkpoint.lastEventSequence
      && rows.projection.derived_through_hash === checkpoint.lastEventHash
      && rows.run.run_state === checkpoint.runState
    ) return null;
    return { graph, checkpoint };
  } catch {
    return null;
  }
}

function parseStoredRuntimeReceipt(row: RuntimeReceiptRow): ExecutionRuntimeReceipt {
  const value = parseCanonicalJson(row.canonical_json);
  if (value === null || typeof value !== "object" || Array.isArray(value)) recoveryMismatch("runtime receipt is not an object");
  const record = value as unknown as ExecutionRuntimeReceipt;
  if (
    typeof record.receiptId !== "string"
    || typeof record.hostSessionId !== "string"
    || typeof record.node?.version !== "string"
    || (typeof record.node?.lts !== "string" && record.node?.lts !== false)
  ) recoveryMismatch("runtime receipt fields are invalid");
  return record;
}

function recoveryAsStoreSession(
  session: ExecutionRecoverySession,
  runtimeReceipt: ExecutionRuntimeReceipt,
): ExecutionStoreSession {
  return {
    workspaceId: session.workspaceId,
    workspaceIdentityDigest: session.workspaceIdentityDigest,
    databasePath: session.databasePath,
    runtimeReceipt,
    storagePolicy: session.policy.storagePolicy,
    database: session.database,
  };
}

function recoveryLogicalDigest(snapshot: ExecutionRecoverySnapshot): string {
  return executionDigest(normalizeLogicalValue(snapshot));
}

function normalizeLogicalValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return { byteLength: value.byteLength, sha256: createHash("sha256").update(value).digest("hex") };
  }
  if (Array.isArray(value)) return value.map(normalizeLogicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeLogicalValue(entry)]));
  }
  return value;
}

function assertAuditStillMatches(database: ExecutionSqliteDatabase, audit: ExecutionRecoveryAudit): void {
  if (executionSqliteFileSha256(database) !== audit.databaseSha256After) {
    recoveryMismatch("execution storage changed after its recovery audit");
  }
  const logical = recoveryLogicalDigest(readExecutionRecoverySnapshot(database));
  if (logical !== audit.logicalSha256After) recoveryMismatch("execution logical state changed after its recovery audit");
}

function parseCanonicalJson(value: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    if (canonicalExecutionJson(parsed) !== value) recoveryMismatch("recovery JSON is not canonical");
    return parsed;
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    recoveryMismatch("recovery JSON is invalid");
  }
}

function contractCode(error: unknown): string | null {
  return error instanceof ExecutionContractError ? error.code : null;
}

function invalidProjectionSource(): never {
  throw new ExecutionContractError("STORAGE_CORRUPT", "execution projection source is invalid");
}

function assertCanonicalInstant(value: string): void {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new ExecutionContractError("CLOCK_INVALID", "recovery timestamp is invalid");
  }
}

function recoveryMismatch(message: string): never {
  throw new ExecutionContractError("RECOVERY_IDENTITY_MISMATCH", message);
}

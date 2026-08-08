import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

import {
  finalizeExecutionRun,
  renderFinalExecutionHandoffMarkdown,
  validateFinalExecutionHandoff,
} from "../finalize.js";
import { canonicalExecutionJson, executionDigest } from "../identity.js";
import { assertLedgerMatchesGraph, replayExecutionLedger } from "../ledger.js";
import { ExecutionContractError } from "../types.js";
import type {
  ExecutionArtifactRef,
  ExecutionEvent,
  FinalExecutionHandoff,
  TransactionalLoadedExecutionRun,
} from "../types.js";
import type { ExecutionMutationAuthority } from "./mutations.js";
import {
  executionSqliteFileBytes,
  readCanonicalExecutionRunRows,
  transactCanonicalExecutionArtifactMutation,
} from "./sqlite-adapter.js";
import type {
  ControllerLeaseRow,
  ExecutionArtifactMutationWrite,
  ExecutionCanonicalRunRows,
  QuotaUsageRow,
} from "./sqlite-adapter.js";
import type { ExecutionStoreSession } from "./session.js";
import { materializeTransactionalExecutionRunRows } from "./store.js";

export const finalHandoffJsonMediaType = "application/vnd.ai-booster-kit.execution-final+json";
export const finalHandoffMarkdownMediaType = "text/markdown;charset=utf-8";

export interface CommitFinalExecutionHandoffRequest {
  runId: string;
  authority: ExecutionMutationAuthority;
  handoff: FinalExecutionHandoff;
  recordedAt: string;
}

export interface ExportExecutionRunSnapshotRequest {
  runId: string;
  destinationDirectory: string;
  exportedAt: string;
}

export interface ExecutionRunExportReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  authority: "EXPORT_ONLY";
  workspaceId: string;
  databaseIdentitySha256: string;
  schemaVersion: number;
  runId: string;
  ledgerHeadSequence: number;
  ledgerHeadHash: string;
  snapshotSha256: string;
  files: readonly { name: string; sha256: string; byteLength: number }[];
  exportedAt: string;
}

export function commitFinalExecutionHandoff(
  session: ExecutionStoreSession,
  request: CommitFinalExecutionHandoffRequest,
): TransactionalLoadedExecutionRun {
  const preliminaryRows = readCanonicalExecutionRunRows(session.database, request.runId);
  const preliminary = materializeTransactionalExecutionRunRows(session, request.runId, preliminaryRows);
  if (preliminary.finalHandoff !== null) {
    throw new ExecutionContractError("FINALIZATION_ALREADY_EXISTS", "execution run already has a final handoff");
  }
  const handoff = validateFinalExecutionHandoff(request.handoff, preliminary);
  const json = canonicalExecutionJson(handoff);
  const markdown = renderFinalExecutionHandoffMarkdown(handoff);
  const jsonBody = Buffer.from(json, "utf8");
  const markdownBody = Buffer.from(markdown, "utf8");
  assertFinalStaticLimits(session, jsonBody, markdownBody);

  return transactCanonicalExecutionArtifactMutation(session.database, request.runId, (rows) => {
    const loaded = materializeTransactionalExecutionRunRows(session, request.runId, rows);
    if (loaded.finalHandoff !== null) {
      throw new ExecutionContractError("FINALIZATION_ALREADY_EXISTS", "execution run already has a final handoff");
    }
    const controller = requiredController(rows);
    const quota = requiredQuota(rows);
    assertFinalAuthority(session, loaded, controller, request.authority);
    const finalized = finalizeExecutionRun(loaded, handoff, request.recordedAt);
    const events = [...loaded.events, finalized.event];
    const checkpoint = replayExecutionLedger(events, loaded.envelope, loaded.graph);
    assertLedgerMatchesGraph(events, loaded.graph);
    const artifacts = [
      finalArtifactWrite(
        "final-handoff-json",
        finalHandoffJsonMediaType,
        jsonBody,
        finalized.event.sequence,
        request.recordedAt,
      ),
      finalArtifactWrite(
        "final-handoff-markdown",
        finalHandoffMarkdownMediaType,
        markdownBody,
        finalized.event.sequence,
        request.recordedAt,
      ),
    ];
    const write = prepareFinalWrite(session, request.authority, loaded, quota, finalized.event, checkpoint, artifacts);
    const artifactRefs = artifacts.map((artifact): ExecutionArtifactRef => ({
      artifactId: artifact.artifactId,
      nodeId: null,
      sha256: artifact.sha256,
    }));
    return {
      write,
      result: {
        ...loaded,
        events,
        checkpoint,
        artifacts: [...loaded.artifacts, ...artifactRefs],
        finalHandoff: handoff,
      },
    };
  });
}

export async function exportExecutionRunSnapshot(
  session: ExecutionStoreSession,
  request: ExportExecutionRunSnapshotRequest,
): Promise<ExecutionRunExportReceipt> {
  assertCanonicalInstant(request.exportedAt);
  const destination = await validateNewExportDestination(request.destinationDirectory);
  const run = materializeTransactionalExecutionRunRows(
    session,
    request.runId,
    readCanonicalExecutionRunRows(session.database, request.runId),
  );
  if (run.finalHandoff === null) {
    throw new ExecutionContractError("FINALIZATION_PRECONDITION_FAILED", "execution export requires a final handoff");
  }
  const databaseIdentitySha256 = executionDigest({
    workspaceId: session.workspaceId,
    workspaceIdentityDigest: session.workspaceIdentityDigest,
    schemaVersion: session.database.schemaVersion,
    storagePolicyId: session.storagePolicy.policyId,
    storagePolicySha256: session.storagePolicy.policyDigest,
  });
  const snapshot = {
    snapshotVersion: "1.0" as const,
    authority: "EXPORT_ONLY" as const,
    workspaceId: session.workspaceId,
    databaseIdentitySha256,
    schemaVersion: session.database.schemaVersion,
    runId: run.runId,
    controller: {
      controllerId: run.controllerId,
      fencingToken: run.fencingToken,
      runtimeReceiptId: run.runtimeReceiptId,
    },
    envelope: run.envelope,
    graph: run.graph,
    events: run.events,
    checkpoint: run.checkpoint,
    artifacts: run.artifacts,
    evidenceRefs: run.evidenceRefs,
    acceptedResults: run.acceptedResults,
    finalHandoff: run.finalHandoff,
  };
  const snapshotJson = `${canonicalExecutionJson(snapshot)}\n`;
  const finalJson = `${canonicalExecutionJson(run.finalHandoff)}\n`;
  const finalMarkdown = renderFinalExecutionHandoffMarkdown(run.finalHandoff);
  const documents = [
    exportDocument("execution-run.json", snapshotJson),
    exportDocument("final-handoff.json", finalJson),
    exportDocument("final-handoff.md", finalMarkdown),
  ];
  const receiptBody = {
    receiptVersion: "1.0" as const,
    authority: "EXPORT_ONLY" as const,
    workspaceId: session.workspaceId,
    databaseIdentitySha256,
    schemaVersion: session.database.schemaVersion,
    runId: run.runId,
    ledgerHeadSequence: run.checkpoint.lastEventSequence,
    ledgerHeadHash: run.checkpoint.lastEventHash,
    snapshotSha256: documents[0]?.sha256 ?? exportFailed("execution snapshot document is missing"),
    files: documents.map(({ name, sha256, byteLength }) => ({ name, sha256, byteLength })),
    exportedAt: request.exportedAt,
  };
  const receipt: ExecutionRunExportReceipt = {
    ...receiptBody,
    receiptId: executionDigest(receiptBody),
  };
  const staging = `${destination}.staging-${receipt.receiptId.slice(0, 16)}`;
  try {
    await mkdir(staging);
  } catch (error) {
    if (isAlreadyExists(error)) {
      throw new ExecutionContractError("PENDING_REPLACEMENT", "execution export staging directory already exists");
    }
    exportFailed("execution export staging directory could not be created");
  }
  try {
    for (const document of documents) {
      await writeFile(join(staging, document.name), document.body, { flag: "wx" });
      const observed = await readFile(join(staging, document.name));
      if (createHash("sha256").update(observed).digest("hex") !== document.sha256) {
        exportFailed("execution export document verification failed");
      }
    }
    const receiptDocument = Buffer.from(`${canonicalExecutionJson(receipt)}\n`, "utf8");
    const receiptPath = join(staging, "export-receipt.json");
    await writeFile(receiptPath, receiptDocument, { flag: "wx" });
    if (!(await readFile(receiptPath)).equals(receiptDocument)) {
      exportFailed("execution export receipt verification failed");
    }
    await rename(staging, destination);
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    if (isAlreadyExists(error)) {
      throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution export destination already exists");
    }
    exportFailed("execution export filesystem operation failed; staging evidence was preserved");
  }
  return receipt;
}

function prepareFinalWrite(
  session: ExecutionStoreSession,
  authority: ExecutionMutationAuthority,
  loaded: TransactionalLoadedExecutionRun,
  quota: QuotaUsageRow,
  event: ExecutionEvent,
  checkpoint: TransactionalLoadedExecutionRun["checkpoint"],
  artifacts: ExecutionArtifactMutationWrite["artifacts"],
): ExecutionArtifactMutationWrite {
  const eventJson = canonicalExecutionJson(event);
  const graphJson = canonicalExecutionJson(loaded.graph);
  const checkpointJson = canonicalExecutionJson(checkpoint);
  const eventBytes = Buffer.byteLength(eventJson, "utf8");
  const artifactBytes = artifacts.reduce((total, artifact) => total + artifact.byteLength, 0);
  const transactionBytes = eventBytes
    + artifactBytes
    + Buffer.byteLength(graphJson, "utf8")
    + Buffer.byteLength(checkpointJson, "utf8");
  const limits = session.storagePolicy.limits;
  if (
    quota.event_count + 1 > limits.maxEventsPerRun
    || quota.ledger_bytes + eventBytes > limits.maxLedgerBytes
    || quota.artifact_bytes + artifactBytes > limits.maxRunArtifactBytes
    || transactionBytes > limits.maxTransactionPayloadBytes
    || executionSqliteFileBytes(session.database) + transactionBytes > limits.maxWorkspaceBytes
  ) {
    throw new ExecutionContractError("STORAGE_QUOTA_EXCEEDED", "execution finalization exceeds storage limits");
  }
  if (event.previousEventHash === null) snapshotDiverged("execution finalization event predecessor is missing");
  return {
    expected: {
      ledgerHeadSequence: loaded.checkpoint.lastEventSequence,
      ledgerHeadHash: loaded.checkpoint.lastEventHash,
      graphRevision: loaded.graph.graphRevision,
      controllerId: authority.controllerId,
      fencingToken: authority.fencingToken,
      runtimeReceiptId: authority.runtimeReceiptId,
    },
    events: [{
      sequence: event.sequence,
      eventHash: event.eventHash,
      previousEventHash: event.previousEventHash,
      eventType: event.eventType,
      nodeId: event.nodeId,
      canonicalJson: eventJson,
      byteLength: eventBytes,
      recordedAt: event.recordedAt,
    }],
    artifacts,
    runState: checkpoint.runState,
    graphRevision: loaded.graph.graphRevision,
    projection: {
      graphJson,
      graphSha256: executionDigest(loaded.graph),
      checkpointJson,
      checkpointSha256: executionDigest(checkpoint),
      derivedThroughSequence: checkpoint.lastEventSequence,
      derivedThroughHash: checkpoint.lastEventHash,
    },
    quota: {
      eventCount: quota.event_count + 1,
      ledgerBytes: quota.ledger_bytes + eventBytes,
      artifactBytes: quota.artifact_bytes + artifactBytes,
      lastTransactionBytes: transactionBytes,
    },
  };
}

function assertFinalAuthority(
  session: ExecutionStoreSession,
  loaded: TransactionalLoadedExecutionRun,
  controller: ControllerLeaseRow,
  authority: ExecutionMutationAuthority,
): void {
  if (
    controller.state !== "ACTIVE"
    || controller.controller_id !== authority.controllerId
    || controller.runtime_receipt_id !== authority.runtimeReceiptId
    || authority.runtimeReceiptId !== session.runtimeReceipt.receiptId
  ) {
    throw new ExecutionContractError(
      "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED",
      "execution finalization controller or runtime receipt does not own the run",
    );
  }
  if (controller.fencing_token !== authority.fencingToken) {
    throw new ExecutionContractError("STALE_FENCING_TOKEN", "execution finalization fencing token is stale");
  }
  if (loaded.checkpoint.lastEventHash !== authority.expectedLedgerHead) snapshotDiverged("execution finalization ledger head is stale");
  if (loaded.graph.graphRevision !== authority.expectedGraphRevision) snapshotDiverged("execution finalization graph revision is stale");
}

function assertFinalStaticLimits(session: ExecutionStoreSession, jsonBody: Buffer, markdownBody: Buffer): void {
  const limits = session.storagePolicy.limits;
  for (const body of [jsonBody, markdownBody]) {
    if (body.byteLength > limits.maxArtifactBytes || body.byteLength > limits.maxCanonicalBlobBytes) {
      throw new ExecutionContractError("ARTIFACT_TOO_LARGE", "execution final artifact exceeds its byte ceiling");
    }
    if (body.byteLength > limits.maxCanonicalTextBytes) {
      throw new ExecutionContractError("STORAGE_QUOTA_EXCEEDED", "execution final text exceeds its byte ceiling");
    }
  }
}

function finalArtifactWrite(
  artifactId: string,
  mediaType: string,
  body: Buffer,
  sourceEventSequence: number,
  createdAt: string,
): ExecutionArtifactMutationWrite["artifacts"][number] {
  return {
    artifactId,
    nodeId: null,
    mediaType,
    body,
    sha256: createHash("sha256").update(body).digest("hex"),
    byteLength: body.byteLength,
    sourceEventSequence,
    createdAt,
  };
}

function exportDocument(name: string, text: string) {
  const body = Buffer.from(text, "utf8");
  return {
    name,
    body,
    sha256: createHash("sha256").update(body).digest("hex"),
    byteLength: body.byteLength,
  };
}

async function validateNewExportDestination(path: string): Promise<string> {
  if (!isAbsolute(path)) exportFailed("execution export destination must be absolute");
  const parent = dirname(path);
  let parentDetails;
  try {
    parentDetails = await lstat(parent);
  } catch {
    exportFailed("execution export parent is unavailable");
  }
  if (!parentDetails.isDirectory() || parentDetails.isSymbolicLink()) {
    exportFailed("execution export parent must be a regular directory");
  }
  try {
    await lstat(path);
    throw new ExecutionContractError("TARGET_ALREADY_EXISTS", "execution export destination already exists");
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    if (!isMissingPath(error)) exportFailed("execution export destination cannot be inspected");
  }
  return path;
}

function assertCanonicalInstant(value: string): void {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new ExecutionContractError("CLOCK_INVALID", "execution export timestamp is invalid");
  }
}

function requiredController(rows: ExecutionCanonicalRunRows): ControllerLeaseRow {
  if (rows.controller === undefined) snapshotDiverged("execution controller lease is missing");
  return rows.controller;
}

function requiredQuota(rows: ExecutionCanonicalRunRows): QuotaUsageRow {
  if (rows.quota === undefined) snapshotDiverged("execution quota projection is missing");
  return rows.quota;
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function exportFailed(message: string): never {
  throw new ExecutionContractError("EXPORT_FAILED", message);
}

function snapshotDiverged(message: string): never {
  throw new ExecutionContractError("SNAPSHOT_DIVERGED", message);
}

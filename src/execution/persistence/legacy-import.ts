import { createHash } from "node:crypto";

import { canonicalExecutionJson, executionDigest } from "../identity.js";
import { readLegacyExecutionRun } from "../legacy-storage.js";
import type { LegacyLoadedExecutionRun } from "../legacy-storage.js";
import { ExecutionContractError } from "../types.js";
import type { ExecutionStoreSession } from "./session.js";
import {
  executionSqliteFileBytes,
  insertImportedExecutionRun,
  readCanonicalExecutionRunRows,
} from "./sqlite-adapter.js";

export interface ImportLegacyExecutionRunRequest {
  runDirectory: string;
  expectedSourceIdentitySha256: string;
  controllerId: string;
  observedAt: string;
}

export interface ExecutionImportReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  receiptSha256: string;
  disposition: "IMPORTED";
  sourceIdentitySha256: string;
  sourceFiles: readonly { relativePath: string; sha256: string; byteLength: number }[];
  sourceRunId: string;
  sourceEnvelopeHash: string;
  sourceEnvelopeSha256: string;
  sourceGraphHash: string;
  sourceGraphSha256: string;
  sourceLedgerHeadSha256: string;
  destinationWorkspaceId: string;
  destinationSchemaVersion: number;
  destinationStoragePolicySha256: string;
  runtimeReceiptId: string;
  importedByteCount: number;
  importedEventCount: number;
  importedArtifactCount: number;
  observedAt: string;
}

const controllerPattern = /^[a-z0-9][a-z0-9-]{2,79}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;

export async function importLegacyExecutionRun(
  session: ExecutionStoreSession,
  request: ImportLegacyExecutionRunRequest,
): Promise<ExecutionImportReceipt> {
  assertCanonicalInstant(request.observedAt);
  if (!shaPattern.test(request.expectedSourceIdentitySha256) || !controllerPattern.test(request.controllerId)) {
    invalid("legacy execution import identity or controller is invalid");
  }
  if (Buffer.byteLength(canonicalExecutionJson(request), "utf8") > session.storagePolicy.limits.maxCommandInputBytes) {
    invalid("legacy execution import command exceeds its admitted input ceiling");
  }

  const source = await readSource(request.runDirectory);
  if (source.sourceIdentitySha256 !== request.expectedSourceIdentitySha256) {
    invalid("legacy execution source identity differs from the approved source");
  }
  if (readCanonicalExecutionRunRows(session.database, source.envelope.runId).run !== undefined) {
    invalid("legacy execution destination run already exists");
  }
  const prepared = prepareImport(session, source, request);
  const confirmed = await readSource(request.runDirectory);
  if (sourceSnapshotDigest(source) !== sourceSnapshotDigest(confirmed)) {
    invalid("legacy execution source changed during import preflight");
  }

  insertImportedExecutionRun(session.database, prepared.write);
  return prepared.receipt;
}

function prepareImport(
  session: ExecutionStoreSession,
  source: LegacyLoadedExecutionRun,
  request: ImportLegacyExecutionRunRequest,
): { receipt: ExecutionImportReceipt; write: Parameters<typeof insertImportedExecutionRun>[1] } {
  const envelopeJson = canonicalExecutionJson(source.envelope);
  const graphJson = canonicalExecutionJson(source.graph);
  const checkpointJson = canonicalExecutionJson(source.checkpoint);
  const events = source.events.map((event) => {
    const canonicalJson = canonicalExecutionJson(event);
    return {
      sequence: event.sequence,
      eventHash: event.eventHash,
      previousEventHash: event.previousEventHash,
      eventType: event.eventType,
      nodeId: event.nodeId,
      canonicalJson,
      byteLength: Buffer.byteLength(canonicalJson, "utf8"),
      recordedAt: event.recordedAt,
    };
  });
  const artifacts = source.sourceArtifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    nodeId: artifact.nodeId,
    mediaType: artifact.mediaType,
    body: Buffer.from(artifact.body),
    sha256: createHash("sha256").update(artifact.body).digest("hex"),
    byteLength: artifact.body.byteLength,
    sourceEventSequence: artifact.sourceEventSequence,
    createdAt: request.observedAt,
  }));
  const ledgerBytes = events.reduce((sum, event) => sum + event.byteLength, 0);
  const artifactBytes = artifacts.reduce((sum, artifact) => sum + artifact.byteLength, 0);
  const importedByteCount = source.sourceFiles.reduce((sum, file) => sum + file.byteLength, 0);

  const receiptBase = {
    receiptVersion: "1.0" as const,
    disposition: "IMPORTED" as const,
    sourceIdentitySha256: source.sourceIdentitySha256,
    sourceFiles: source.sourceFiles.map((file) => ({ ...file })),
    sourceRunId: source.envelope.runId,
    sourceEnvelopeHash: source.envelope.envelopeHash,
    sourceEnvelopeSha256: executionDigest(source.envelope),
    sourceGraphHash: source.graph.graphHash,
    sourceGraphSha256: executionDigest(source.graph),
    sourceLedgerHeadSha256: source.checkpoint.lastEventHash,
    destinationWorkspaceId: session.workspaceId,
    destinationSchemaVersion: session.database.schemaVersion,
    destinationStoragePolicySha256: session.storagePolicy.policyDigest,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    importedByteCount,
    importedEventCount: events.length,
    importedArtifactCount: artifacts.length,
    observedAt: request.observedAt,
  };
  const receiptWithId = { ...receiptBase, receiptId: executionDigest(receiptBase) };
  const receipt: ExecutionImportReceipt = { ...receiptWithId, receiptSha256: executionDigest(receiptWithId) };
  const receiptJson = canonicalExecutionJson(receipt);
  const transactionBytes = Buffer.byteLength(envelopeJson, "utf8")
    + Buffer.byteLength(graphJson, "utf8")
    + Buffer.byteLength(checkpointJson, "utf8")
    + ledgerBytes
    + artifactBytes
    + Buffer.byteLength(receiptJson, "utf8");
  assertImportLimits(session, source, {
    envelopeBytes: Buffer.byteLength(envelopeJson, "utf8"),
    graphBytes: Buffer.byteLength(graphJson, "utf8"),
    checkpointBytes: Buffer.byteLength(checkpointJson, "utf8"),
    eventCount: events.length,
    ledgerBytes,
    artifactBytes,
    transactionBytes,
    workspaceBytes: executionSqliteFileBytes(session.database) + transactionBytes,
  });
  return {
    receipt,
    write: {
      run: {
        runId: source.envelope.runId,
        envelopeJson,
        envelopeSha256: executionDigest(source.envelope),
        createdReceiptId: session.runtimeReceipt.receiptId,
        runState: source.checkpoint.runState,
        ledgerHeadSequence: source.checkpoint.lastEventSequence,
        ledgerHeadHash: source.checkpoint.lastEventHash,
        graphRevision: source.graph.graphRevision,
        createdAt: request.observedAt,
        controller: {
          controllerId: request.controllerId,
          fencingToken: 1,
          runtimeReceiptId: session.runtimeReceipt.receiptId,
        },
        events,
        projection: {
          graphJson,
          graphSha256: executionDigest(source.graph),
          checkpointJson,
          checkpointSha256: executionDigest(source.checkpoint),
          derivedThroughSequence: source.checkpoint.lastEventSequence,
          derivedThroughHash: source.checkpoint.lastEventHash,
        },
        quota: {
          eventCount: events.length,
          ledgerBytes,
          artifactBytes,
          lastTransactionBytes: transactionBytes,
        },
      },
      artifacts,
      receipt: {
        importId: receipt.receiptId,
        sourceIdentitySha256: source.sourceIdentitySha256,
        canonicalJson: receiptJson,
        receiptSha256: receipt.receiptSha256,
        runtimeReceiptId: session.runtimeReceipt.receiptId,
        createdAt: request.observedAt,
      },
    },
  };
}

function assertImportLimits(
  session: ExecutionStoreSession,
  source: LegacyLoadedExecutionRun,
  usage: {
    envelopeBytes: number;
    graphBytes: number;
    checkpointBytes: number;
    eventCount: number;
    ledgerBytes: number;
    artifactBytes: number;
    transactionBytes: number;
    workspaceBytes: number;
  },
): void {
  const limits = session.storagePolicy.limits;
  if (
    usage.envelopeBytes > limits.maxCanonicalTextBytes
    || usage.graphBytes > limits.maxCanonicalTextBytes
    || usage.checkpointBytes > limits.maxCanonicalTextBytes
    || usage.eventCount > limits.maxEventsPerRun
    || usage.ledgerBytes > limits.maxLedgerBytes
    || usage.artifactBytes > limits.maxRunArtifactBytes
    || usage.transactionBytes > limits.maxTransactionPayloadBytes
    || usage.workspaceBytes > limits.maxWorkspaceBytes
    || source.sourceArtifacts.some((artifact) => artifact.body.byteLength > limits.maxArtifactBytes || artifact.body.byteLength > limits.maxCanonicalBlobBytes)
  ) {
    invalid("legacy execution import exceeds its admitted destination quota");
  }
}

async function readSource(runDirectory: string): Promise<LegacyLoadedExecutionRun> {
  try {
    return await readLegacyExecutionRun(runDirectory);
  } catch {
    invalid("legacy execution source failed immutable validation");
  }
}

function sourceSnapshotDigest(source: LegacyLoadedExecutionRun): string {
  return executionDigest({
    sourceIdentitySha256: source.sourceIdentitySha256,
    sourceFiles: source.sourceFiles,
    runId: source.envelope.runId,
    envelopeHash: source.envelope.envelopeHash,
    graphHash: source.graph.graphHash,
    ledgerHead: source.checkpoint.lastEventHash,
  });
}

function assertCanonicalInstant(value: string): void {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new ExecutionContractError("CLOCK_INVALID", "legacy execution import timestamp is invalid");
  }
}

function invalid(message: string): never {
  throw new ExecutionContractError("LEGACY_IMPORT_INVALID", message);
}

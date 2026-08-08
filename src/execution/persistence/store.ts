import { createHash } from "node:crypto";

import { validateExecutionGraph } from "../graph.js";
import { parseExecutionResult, validateResultForNode } from "../handoff.js";
import { renderFinalExecutionHandoffMarkdown, validateFinalExecutionHandoff } from "../finalize.js";
import { canonicalExecutionJson, executionDigest } from "../identity.js";
import {
  assertLedgerMatchesGraph,
  createExecutionEvent,
  executionCheckpointMatches,
  parseExecutionCheckpoint,
  parseExecutionEvent,
  replayExecutionLedger,
} from "../ledger.js";
import { ExecutionContractError } from "../types.js";
import type {
  ExecutionArtifactRef,
  ExecutionCheckpoint,
  ExecutionEnvelope,
  ExecutionEvent,
  ExecutionEvidenceRef,
  ExecutionGraph,
  ExecutionResultEnvelope,
  TransactionalLoadedExecutionRun,
} from "../types.js";
import { parseExecutionEnvelope } from "../validation.js";
import {
  executionRunHasImportReceipt,
  insertCanonicalExecutionRun,
  readCanonicalExecutionRunRows,
} from "./sqlite-adapter.js";
import type { ExecutionCanonicalRunRows } from "./sqlite-adapter.js";
import type { ExecutionStoreSession } from "./session.js";

export interface CreateExecutionRunRequest {
  controllerId: string;
  envelope: ExecutionEnvelope;
  graph: ExecutionGraph;
  recordedAt: string;
}

export interface TransactionalExecutionRun {
  workspaceId: string;
  databasePath: string;
  runId: string;
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  checkpoint: ExecutionCheckpoint;
  lastEventHash: string;
}

const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/u;

export function createTransactionalExecutionRun(
  session: ExecutionStoreSession,
  request: CreateExecutionRunRequest,
): TransactionalExecutionRun {
  if (!identifierPattern.test(request.controllerId)) {
    throw new ExecutionContractError("EXECUTION_CONTROLLER_INVALID", "execution controller identifier is invalid");
  }
  const envelope = parseExecutionEnvelope(request.envelope);
  if (envelope.retention !== "PERSONAL") {
    throw new ExecutionContractError("EXECUTION_RETENTION_UNSUPPORTED", "transactional execution storage requires PERSONAL retention");
  }
  const graph = validateExecutionGraph(request.graph, envelope);
  const events = createInitialEvents(envelope, graph, request.recordedAt);
  const checkpoint = replayExecutionLedger(events, envelope, graph);
  assertLedgerMatchesGraph(events, graph);

  const envelopeJson = canonicalExecutionJson(envelope);
  const graphJson = canonicalExecutionJson(graph);
  const checkpointJson = canonicalExecutionJson(checkpoint);
  const eventWrites = events.map((event) => {
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
  const ledgerBytes = eventWrites.reduce((total, event) => total + event.byteLength, 0);
  const transactionBytes = [envelopeJson, graphJson, checkpointJson]
    .reduce((total, value) => total + Buffer.byteLength(value, "utf8"), ledgerBytes);
  assertInitialRunLimits(session, {
    envelopeBytes: Buffer.byteLength(envelopeJson, "utf8"),
    graphBytes: Buffer.byteLength(graphJson, "utf8"),
    checkpointBytes: Buffer.byteLength(checkpointJson, "utf8"),
    eventCount: events.length,
    ledgerBytes,
    transactionBytes,
  });

  insertCanonicalExecutionRun(session.database, {
    runId: envelope.runId,
    envelopeJson,
    envelopeSha256: executionDigest(envelope),
    createdReceiptId: session.runtimeReceipt.receiptId,
    runState: checkpoint.runState,
    ledgerHeadSequence: checkpoint.lastEventSequence,
    ledgerHeadHash: checkpoint.lastEventHash,
    graphRevision: graph.graphRevision,
    createdAt: request.recordedAt,
    controller: {
      controllerId: request.controllerId,
      fencingToken: 1,
      runtimeReceiptId: session.runtimeReceipt.receiptId,
    },
    events: eventWrites,
    projection: {
      graphJson,
      graphSha256: executionDigest(graph),
      checkpointJson,
      checkpointSha256: executionDigest(checkpoint),
      derivedThroughSequence: checkpoint.lastEventSequence,
      derivedThroughHash: checkpoint.lastEventHash,
    },
    quota: {
      eventCount: events.length,
      ledgerBytes,
      artifactBytes: 0,
      lastTransactionBytes: transactionBytes,
    },
  });

  return {
    workspaceId: session.workspaceId,
    databasePath: session.databasePath,
    runId: envelope.runId,
    controllerId: request.controllerId,
    fencingToken: 1,
    runtimeReceiptId: session.runtimeReceipt.receiptId,
    checkpoint,
    lastEventHash: checkpoint.lastEventHash,
  };
}

export function loadTransactionalExecutionRun(
  session: ExecutionStoreSession,
  runId: string,
): TransactionalLoadedExecutionRun {
  if (!identifierPattern.test(runId)) {
    throw new ExecutionContractError("EXECUTION_RUN_INVALID", "execution run identifier is invalid");
  }
  const rows = readCanonicalExecutionRunRows(session.database, runId);
  return materializeTransactionalExecutionRunRows(session, runId, rows);
}

export function materializeTransactionalExecutionRunRows(
  session: ExecutionStoreSession,
  runId: string,
  rows: ExecutionCanonicalRunRows,
): TransactionalLoadedExecutionRun {
  assertWorkspaceIdentity(rows, session);
  if (rows.run === undefined) {
    throw new ExecutionContractError("EXECUTION_RUN_NOT_FOUND", "execution run does not exist in workspace storage");
  }
  if (
    rows.controller === undefined
    || rows.receipt === undefined
    || rows.projection === undefined
    || rows.quota === undefined
  ) {
    snapshotDiverged("execution run is missing a required canonical record");
  }
  const envelope = parseExecutionEnvelope(parseCanonicalJson(rows.run.envelope_json, "execution envelope"));
  if (
    executionDigest(envelope) !== rows.run.envelope_sha256
    || envelope.runId !== rows.run.run_id
    || rows.run.run_id !== runId
  ) {
    snapshotDiverged("execution envelope identity does not match its run row");
  }
  assertStoredRuntimeReceipt(rows);
  const graph = validateExecutionGraph(
    parseCanonicalJson(rows.projection.graph_json, "execution graph"),
    envelope,
  );
  if (executionDigest(graph) !== rows.projection.graph_sha256) {
    snapshotDiverged("execution graph digest does not match its projection row");
  }
  const events = rows.events.map((row) => {
    const event = parseExecutionEvent(parseCanonicalJson(row.canonical_json, "execution event"));
    if (
      event.eventHash !== row.event_hash
      || event.sequence !== row.sequence
      || event.previousEventHash !== row.previous_event_hash
      || event.eventType !== row.event_type
      || event.nodeId !== row.node_id
      || Buffer.byteLength(row.canonical_json, "utf8") !== row.byte_length
      || event.recordedAt !== row.recorded_at
    ) {
      snapshotDiverged("execution event row does not match its canonical event");
    }
    return event;
  });
  const replayed = replayExecutionLedger(events, envelope, graph);
  assertLedgerMatchesGraph(events, graph);
  const storedCheckpoint = parseExecutionCheckpoint(
    parseCanonicalJson(rows.projection.checkpoint_json, "execution checkpoint"),
  );
  if (
    executionDigest(storedCheckpoint) !== rows.projection.checkpoint_sha256
    || !executionCheckpointMatches(storedCheckpoint, replayed)
    || rows.run.run_state !== replayed.runState
    || rows.run.ledger_head_sequence !== replayed.lastEventSequence
    || rows.run.ledger_head_hash !== replayed.lastEventHash
    || rows.run.graph_revision !== graph.graphRevision
    || rows.projection.derived_through_sequence !== replayed.lastEventSequence
    || rows.projection.derived_through_hash !== replayed.lastEventHash
  ) {
    snapshotDiverged("execution projection does not reproduce from its ledger");
  }
  assertControllerAndQuota(rows, replayed);
  const storedArtifacts = loadCanonicalArtifacts(rows, events, envelope, graph, session);

  const base: TransactionalLoadedExecutionRun = {
    workspaceId: session.workspaceId,
    databasePath: session.databasePath,
    runId,
    controllerId: rows.controller.controller_id,
    fencingToken: rows.controller.fencing_token,
    runtimeReceiptId: rows.run.created_receipt_id,
    envelope,
    graph,
    events,
    checkpoint: replayed,
    artifacts: storedArtifacts.artifacts,
    evidenceRefs: storedArtifacts.evidenceRefs,
    acceptedResults: storedArtifacts.acceptedResults,
    finalHandoff: null,
  };
  return {
    ...base,
    finalHandoff: loadStoredFinalHandoff(storedArtifacts, base),
  };
}

function createInitialEvents(
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  recordedAt: string,
): readonly ExecutionEvent[] {
  const created = createExecutionEvent({
    runId: envelope.runId,
    eventType: "RUN_CREATED",
    nodeId: null,
    beforeState: null,
    afterState: "PREPARED",
    graphRevision: graph.graphRevision,
    evidenceRefs: [],
    taskId: null,
    threadRef: null,
    reasonCode: null,
  }, 1, null, recordedAt);
  const accepted = createExecutionEvent({
    runId: envelope.runId,
    eventType: "GRAPH_ACCEPTED",
    nodeId: null,
    beforeState: "PREPARED",
    afterState: "READY",
    graphRevision: graph.graphRevision,
    evidenceRefs: [],
    taskId: null,
    threadRef: null,
    reasonCode: null,
  }, 2, created.eventHash, recordedAt);
  return [created, accepted];
}

function assertInitialRunLimits(
  session: ExecutionStoreSession,
  sizes: {
    envelopeBytes: number;
    graphBytes: number;
    checkpointBytes: number;
    eventCount: number;
    ledgerBytes: number;
    transactionBytes: number;
  },
): void {
  const limits = session.storagePolicy.limits;
  if (
    sizes.envelopeBytes > limits.maxCanonicalTextBytes
    || sizes.graphBytes > limits.maxCanonicalTextBytes
    || sizes.checkpointBytes > limits.maxCanonicalTextBytes
    || sizes.eventCount > limits.maxEventsPerRun
    || sizes.ledgerBytes > limits.maxLedgerBytes
    || sizes.transactionBytes > limits.maxTransactionPayloadBytes
  ) {
    throw new ExecutionContractError("STORAGE_QUOTA_EXCEEDED", "initial execution run exceeds its admitted storage limits");
  }
}

function assertWorkspaceIdentity(rows: ExecutionCanonicalRunRows, session: ExecutionStoreSession): void {
  if (
    rows.metadata === undefined
    || rows.metadata.workspace_id !== session.workspaceId
    || rows.metadata.workspace_identity_sha256 !== session.workspaceIdentityDigest
    || rows.metadata.storage_policy_id !== session.storagePolicy.policyId
    || rows.metadata.storage_policy_sha256 !== session.storagePolicy.policyDigest
  ) {
    snapshotDiverged("execution storage identity changed after session admission");
  }
}

function assertStoredRuntimeReceipt(rows: ExecutionCanonicalRunRows): void {
  if (rows.run === undefined || rows.receipt === undefined) snapshotDiverged("execution runtime receipt is missing");
  const parsed = parseCanonicalJson(rows.receipt.canonical_json, "execution runtime receipt");
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    snapshotDiverged("execution runtime receipt is not a canonical object");
  }
  const record = parsed as Record<string, unknown>;
  const { receiptId, ...body } = record;
  if (
    receiptId !== rows.receipt.receipt_id
    || rows.run.created_receipt_id !== rows.receipt.receipt_id
    || executionDigest(body) !== receiptId
    || executionDigest(parsed) !== rows.receipt.receipt_sha256
    || record.sessionId !== rows.receipt.session_id
    || record.lane !== rows.receipt.lane
    || record.observedAt !== rows.receipt.observed_at
  ) {
    snapshotDiverged("execution runtime receipt does not match its stored identity");
  }
}

function assertControllerAndQuota(
  rows: ExecutionCanonicalRunRows,
  checkpoint: ExecutionCheckpoint,
): void {
  if (rows.run === undefined || rows.controller === undefined || rows.projection === undefined || rows.quota === undefined) {
    snapshotDiverged("execution run control records are incomplete");
  }
  const ledgerBytes = rows.events.reduce((total, event) => total + event.byte_length, 0);
  const artifactBytes = rows.artifacts.reduce((total, artifact) => total + artifact.byte_length, 0);
  if (
    rows.controller.run_id !== rows.run.run_id
    || !["ACTIVE", "RECONCILIATION_REQUIRED"].includes(rows.controller.state)
    || !Number.isSafeInteger(rows.controller.fencing_token)
    || rows.controller.fencing_token < 1
    || rows.projection.run_id !== rows.run.run_id
    || rows.quota.run_id !== rows.run.run_id
    || rows.quota.event_count !== checkpoint.lastEventSequence
    || rows.quota.ledger_bytes !== ledgerBytes
    || rows.quota.artifact_bytes !== artifactBytes
  ) {
    snapshotDiverged("execution ownership or quota projection is inconsistent");
  }
}

function loadCanonicalArtifacts(
  rows: ExecutionCanonicalRunRows,
  events: readonly ExecutionEvent[],
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  session: ExecutionStoreSession,
): {
  artifacts: readonly ExecutionArtifactRef[];
  evidenceRefs: readonly ExecutionEvidenceRef[];
  acceptedResults: readonly ExecutionResultEnvelope[];
  finalHandoffJson: unknown | null;
  finalHandoffMarkdown: string | null;
  imported: boolean;
} {
  const sequences = new Set(events.map((event) => event.sequence));
  const imported = rows.run !== undefined && executionRunHasImportReceipt(session.database, rows.run.run_id);
  const acceptedResults: ExecutionResultEnvelope[] = [];
  const evidenceRefs: ExecutionEvidenceRef[] = [];
  let finalHandoffJson: unknown | null = null;
  let finalHandoffMarkdown: string | null = null;
  const artifacts = rows.artifacts.map((artifact) => {
    if (
      artifact.run_id !== rows.run?.run_id
      || artifact.byte_length !== artifact.body.byteLength
      || createHash("sha256").update(artifact.body).digest("hex") !== artifact.sha256
      || !sequences.has(artifact.source_event_sequence)
    ) {
      snapshotDiverged("execution artifact does not match its canonical metadata");
    }
    const sourceEvent = events.find((event) => event.sequence === artifact.source_event_sequence);
    if (artifact.media_type === "application/vnd.ai-booster-kit.execution-result+json") {
      const body = artifact.body.toString("utf8");
      const result = parseExecutionResult(
        parseCanonicalJson(body, "execution result artifact"),
        Math.min(envelope.budget.maxResultBytes, session.storagePolicy.limits.maxResultEnvelopeBytes),
      );
      validateResultForNode(result, envelope, graph, result.nodeId);
      if (
        (artifact.artifact_id !== `result-${result.nodeId}` && (!imported || artifact.artifact_id !== `task-${result.nodeId}-result`))
        || artifact.node_id !== result.nodeId
        || sourceEvent?.nodeId !== result.nodeId
        || !["NODE_RESULT_ACCEPTED", "NODE_STOPPED", "NODE_UNKNOWN"].includes(sourceEvent.eventType)
      ) {
        snapshotDiverged("execution result artifact ownership is invalid");
      }
      if (sourceEvent.eventType === "NODE_RESULT_ACCEPTED") {
        if (result.status !== "READY_FOR_VALIDATION") snapshotDiverged("accepted result artifact has a terminal status");
        acceptedResults.push(result);
        evidenceRefs.push(...result.evidenceRefs);
      } else if (
        (sourceEvent.eventType === "NODE_STOPPED" && result.status !== "STOPPED")
        || (sourceEvent.eventType === "NODE_UNKNOWN" && result.status !== "UNKNOWN")
      ) {
        snapshotDiverged("terminal result artifact status does not match its event");
      }
    }
    if (artifact.artifact_id === "final-handoff-json") {
      if (
        artifact.media_type !== "application/vnd.ai-booster-kit.execution-final+json"
        || artifact.node_id !== null
        || (
          !["RUN_FINALIZED", "RUN_STOPPED", "RUN_UNKNOWN"].includes(sourceEvent?.eventType ?? "")
          && (!imported || sourceEvent?.sequence !== events.at(-1)?.sequence)
        )
      ) {
        snapshotDiverged("final handoff JSON artifact ownership is invalid");
      }
      finalHandoffJson = parseCanonicalJson(artifact.body.toString("utf8"), "final handoff JSON artifact");
    }
    if (artifact.artifact_id === "final-handoff-markdown") {
      if (
        artifact.media_type !== "text/markdown;charset=utf-8"
        || artifact.node_id !== null
        || (
          !["RUN_FINALIZED", "RUN_STOPPED", "RUN_UNKNOWN"].includes(sourceEvent?.eventType ?? "")
          && (!imported || sourceEvent?.sequence !== events.at(-1)?.sequence)
        )
      ) {
        snapshotDiverged("final handoff Markdown artifact ownership is invalid");
      }
      const markdown = artifact.body.toString("utf8");
      if (!Buffer.from(markdown, "utf8").equals(artifact.body)) {
        snapshotDiverged("final handoff Markdown artifact is not valid UTF-8");
      }
      finalHandoffMarkdown = markdown;
    }
    return { artifactId: artifact.artifact_id, nodeId: artifact.node_id, sha256: artifact.sha256 };
  });
  if (new Set(evidenceRefs.map((evidence) => evidence.evidenceId)).size !== evidenceRefs.length) {
    snapshotDiverged("accepted execution evidence identifiers are not unique across results");
  }
  return { artifacts, evidenceRefs, acceptedResults, finalHandoffJson, finalHandoffMarkdown, imported };
}

function loadStoredFinalHandoff(
  artifacts: ReturnType<typeof loadCanonicalArtifacts>,
  run: TransactionalLoadedExecutionRun,
): TransactionalLoadedExecutionRun["finalHandoff"] {
  if (artifacts.finalHandoffJson === null && artifacts.finalHandoffMarkdown === null) return null;
  if (artifacts.finalHandoffJson === null || artifacts.finalHandoffMarkdown === null) {
    snapshotDiverged("execution final handoff artifact pair is incomplete");
  }
  const handoff = validateFinalExecutionHandoff(artifacts.finalHandoffJson, run);
  if (
    renderFinalExecutionHandoffMarkdown(handoff) !== artifacts.finalHandoffMarkdown
    || (!artifacts.imported && handoff.state !== run.checkpoint.runState)
  ) {
    snapshotDiverged("execution final handoff artifacts do not match the terminal ledger");
  }
  return handoff;
}

function parseCanonicalJson(value: string, label: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    if (canonicalExecutionJson(parsed) !== value) snapshotDiverged(`${label} is not canonical JSON`);
    return parsed;
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    snapshotDiverged(`${label} is not valid JSON`);
  }
}

function snapshotDiverged(message: string): never {
  throw new ExecutionContractError("SNAPSHOT_DIVERGED", message);
}

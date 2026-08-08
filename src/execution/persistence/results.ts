import { createHash } from "node:crypto";

import { transitionExecutionNode } from "../graph.js";
import { parseExecutionResult, routeExecutionResultStatus, validateResultForNode } from "../handoff.js";
import { canonicalExecutionJson, executionDigest } from "../identity.js";
import {
  assertLedgerMatchesGraph,
  createExecutionEvent,
  replayExecutionLedger,
} from "../ledger.js";
import { parseExecutionReasonCode } from "../reasons.js";
import type { ExecutionReasonCode } from "../reasons.js";
import { ExecutionContractError } from "../types.js";
import type {
  ExecutionArtifactRef,
  ExecutionEvent,
  ExecutionResultEnvelope,
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
  ExecutionCanonicalRunRows,
  ExecutionArtifactMutationWrite,
  QuotaUsageRow,
} from "./sqlite-adapter.js";
import type { ExecutionStoreSession } from "./session.js";
import {
  materializeTransactionalExecutionRunRows,
} from "./store.js";

export const executionResultArtifactMediaType = "application/vnd.ai-booster-kit.execution-result+json";

export interface CommitAcceptedExecutionResultRequest {
  runId: string;
  authority: ExecutionMutationAuthority;
  result: ExecutionResultEnvelope;
  threadRef: string;
  recordedAt: string;
}

export interface CommitTerminalExecutionResultRequest {
  runId: string;
  authority: ExecutionMutationAuthority;
  result: ExecutionResultEnvelope;
  threadRef: string;
  recordedAt: string;
}

export interface CommitRejectedExecutionResultRequest {
  runId: string;
  authority: ExecutionMutationAuthority;
  nodeId: string;
  taskId: string;
  threadRef: string;
  reasonCode: ExecutionReasonCode;
  recordedAt: string;
}

interface ParsedResultPreflight {
  result: ExecutionResultEnvelope;
  body: Buffer;
  sha256: string;
}

export function commitAcceptedExecutionResult(
  session: ExecutionStoreSession,
  request: CommitAcceptedExecutionResultRequest,
): { run: TransactionalLoadedExecutionRun; artifact: ExecutionArtifactRef } {
  const preflight = preflightResult(session, request);
  if (preflight.result.status !== "READY_FOR_VALIDATION") {
    throw new ExecutionContractError("EXECUTION_RESULT_FIELDS_INVALID", "accepted result command requires READY_FOR_VALIDATION status");
  }
  return transactCanonicalExecutionArtifactMutation(session.database, request.runId, (rows) => {
    const loaded = materializeTransactionalExecutionRunRows(session, request.runId, rows);
    const controller = requiredController(rows);
    const quota = requiredQuota(rows);
    assertResultAuthority(session, loaded, controller, request.authority);
    const result = validateResultForNode(preflight.result, loaded.envelope, loaded.graph, preflight.result.nodeId);
    const receivedGraph = transitionExecutionNode(
      loaded.graph,
      { nodeId: result.nodeId, from: "RUNNING", to: "RESULT_RECEIVED" },
      loaded.envelope,
    );
    const received = createExecutionEvent({
      runId: request.runId,
      eventType: "NODE_RESULT_RECEIVED",
      nodeId: result.nodeId,
      beforeState: "RUNNING",
      afterState: "RESULT_RECEIVED",
      graphRevision: receivedGraph.graphRevision,
      evidenceRefs: [],
      taskId: result.taskId,
      threadRef: request.threadRef,
      reasonCode: null,
    }, loaded.events.length + 1, loaded.checkpoint.lastEventHash, request.recordedAt);
    const graph = transitionExecutionNode(
      receivedGraph,
      { nodeId: result.nodeId, from: "RESULT_RECEIVED", to: "SUCCEEDED" },
      loaded.envelope,
    );
    const evidenceRefs = result.evidenceRefs.map((evidence) => evidence.evidenceId);
    const accepted = createExecutionEvent({
      runId: request.runId,
      eventType: "NODE_RESULT_ACCEPTED",
      nodeId: result.nodeId,
      beforeState: "RESULT_RECEIVED",
      afterState: "SUCCEEDED",
      graphRevision: graph.graphRevision,
      evidenceRefs,
      taskId: result.taskId,
      threadRef: request.threadRef,
      reasonCode: null,
    }, received.sequence + 1, received.eventHash, request.recordedAt);
    const events = [...loaded.events, received, accepted];
    const checkpoint = replayExecutionLedger(events, loaded.envelope, graph);
    assertLedgerMatchesGraph(events, graph);
    const artifact = resultArtifactRef(result, preflight.sha256);
    const prepared = prepareResultWrite(session, request.authority, loaded, {
      graph,
      checkpoint,
      newEvents: [received, accepted],
      artifacts: [artifactWrite(result, preflight, accepted.sequence, request.recordedAt)],
      quota,
      workspaceBytes: executionSqliteFileBytes(session.database),
    });
    return {
      write: prepared,
      result: {
        run: {
          ...loaded,
          graph,
          events,
          checkpoint,
          artifacts: [...loaded.artifacts, artifact],
          evidenceRefs: [...loaded.evidenceRefs, ...result.evidenceRefs],
          acceptedResults: [...loaded.acceptedResults, result],
        },
        artifact,
      },
    };
  });
}

export function commitTerminalExecutionResult(
  session: ExecutionStoreSession,
  request: CommitTerminalExecutionResultRequest,
): TransactionalLoadedExecutionRun {
  const preflight = preflightResult(session, request);
  if (preflight.result.status !== "STOPPED" && preflight.result.status !== "UNKNOWN") {
    throw new ExecutionContractError("EXECUTION_RESULT_FIELDS_INVALID", "terminal result command requires STOPPED or UNKNOWN status");
  }
  return transactCanonicalExecutionArtifactMutation(session.database, request.runId, (rows) => {
    const loaded = materializeTransactionalExecutionRunRows(session, request.runId, rows);
    const controller = requiredController(rows);
    const quota = requiredQuota(rows);
    assertResultAuthority(session, loaded, controller, request.authority);
    const result = validateResultForNode(preflight.result, loaded.envelope, loaded.graph, preflight.result.nodeId);
    const target = result.status;
    if (target !== "STOPPED" && target !== "UNKNOWN") {
      throw new ExecutionContractError("EXECUTION_RESULT_FIELDS_INVALID", "terminal result status changed during admission");
    }
    const graph = transitionExecutionNode(
      loaded.graph,
      { nodeId: result.nodeId, from: "RUNNING", to: target },
      loaded.envelope,
    );
    const event = createExecutionEvent({
      runId: request.runId,
      eventType: target === "STOPPED" ? "NODE_STOPPED" : "NODE_UNKNOWN",
      nodeId: result.nodeId,
      beforeState: "RUNNING",
      afterState: target,
      graphRevision: graph.graphRevision,
      evidenceRefs: [],
      taskId: result.taskId,
      threadRef: request.threadRef,
      reasonCode: result.reasonCode,
    }, loaded.events.length + 1, loaded.checkpoint.lastEventHash, request.recordedAt);
    const node = loaded.graph.nodes.find((entry) => entry.nodeId === result.nodeId);
    if (node === undefined) snapshotDiverged("terminal result node disappeared during admission");
    const decision = routeExecutionResultStatus(target, node.required, node.state, loaded.checkpoint.runState);
    if (decision.nextRunState === null) snapshotDiverged("terminal result has no run-state decision");
    const terminalEvents: ExecutionEvent[] = [event];
    if (decision.nextRunState !== loaded.checkpoint.runState) {
      if (decision.nextRunState !== "STOPPED" && decision.nextRunState !== "UNKNOWN") {
        snapshotDiverged("terminal result produced an invalid run state");
      }
      terminalEvents.push(createExecutionEvent({
        runId: request.runId,
        eventType: decision.nextRunState === "STOPPED" ? "RUN_STOPPED" : "RUN_UNKNOWN",
        nodeId: null,
        beforeState: loaded.checkpoint.runState,
        afterState: decision.nextRunState,
        graphRevision: graph.graphRevision,
        evidenceRefs: [],
        taskId: null,
        threadRef: null,
        reasonCode: result.reasonCode,
      }, event.sequence + 1, event.eventHash, request.recordedAt));
    }
    const events = [...loaded.events, ...terminalEvents];
    const checkpoint = replayExecutionLedger(events, loaded.envelope, graph);
    assertLedgerMatchesGraph(events, graph);
    const artifact = resultArtifactRef(result, preflight.sha256);
    const prepared = prepareResultWrite(session, request.authority, loaded, {
      graph,
      checkpoint,
      newEvents: terminalEvents,
      artifacts: [artifactWrite(result, preflight, event.sequence, request.recordedAt)],
      quota,
      workspaceBytes: executionSqliteFileBytes(session.database),
    });
    return {
      write: prepared,
      result: {
        ...loaded,
        graph,
        events,
        checkpoint,
        artifacts: [...loaded.artifacts, artifact],
      },
    };
  });
}

export function commitRejectedExecutionResult(
  session: ExecutionStoreSession,
  request: CommitRejectedExecutionResultRequest,
): TransactionalLoadedExecutionRun {
  const reasonCode = parseExecutionReasonCode(request.reasonCode);
  const commandBytes = Buffer.byteLength(canonicalExecutionJson(request), "utf8");
  if (commandBytes > session.storagePolicy.limits.maxCommandInputBytes) {
    quotaExceeded("rejected result command exceeds its input ceiling");
  }
  return transactCanonicalExecutionArtifactMutation(session.database, request.runId, (rows) => {
    const loaded = materializeTransactionalExecutionRunRows(session, request.runId, rows);
    const controller = requiredController(rows);
    const quota = requiredQuota(rows);
    assertResultAuthority(session, loaded, controller, request.authority);
    const graph = transitionExecutionNode(
      loaded.graph,
      { nodeId: request.nodeId, from: "RUNNING", to: "REJECTED" },
      loaded.envelope,
    );
    const event = createExecutionEvent({
      runId: request.runId,
      eventType: "NODE_RESULT_REJECTED",
      nodeId: request.nodeId,
      beforeState: "RUNNING",
      afterState: "REJECTED",
      graphRevision: graph.graphRevision,
      evidenceRefs: [],
      taskId: request.taskId,
      threadRef: request.threadRef,
      reasonCode,
    }, loaded.events.length + 1, loaded.checkpoint.lastEventHash, request.recordedAt);
    const runEvent = createExecutionEvent({
      runId: request.runId,
      eventType: "RUN_STOPPED",
      nodeId: null,
      beforeState: loaded.checkpoint.runState,
      afterState: "STOPPED",
      graphRevision: graph.graphRevision,
      evidenceRefs: [],
      taskId: null,
      threadRef: null,
      reasonCode,
    }, event.sequence + 1, event.eventHash, request.recordedAt);
    const events = [...loaded.events, event, runEvent];
    const checkpoint = replayExecutionLedger(events, loaded.envelope, graph);
    assertLedgerMatchesGraph(events, graph);
    const prepared = prepareResultWrite(session, request.authority, loaded, {
      graph,
      checkpoint,
      newEvents: [event, runEvent],
      artifacts: [],
      quota,
      workspaceBytes: executionSqliteFileBytes(session.database),
    });
    return {
      write: prepared,
      result: { ...loaded, graph, events, checkpoint },
    };
  });
}

function preflightResult(
  session: ExecutionStoreSession,
  request: CommitAcceptedExecutionResultRequest | CommitTerminalExecutionResultRequest,
): ParsedResultPreflight {
  const preliminaryRows = readCanonicalExecutionRunRows(session.database, request.runId);
  const preliminary = materializeTransactionalExecutionRunRows(session, request.runId, preliminaryRows);
  const commandBytes = Buffer.byteLength(canonicalExecutionJson(request), "utf8");
  if (commandBytes > session.storagePolicy.limits.maxCommandInputBytes) {
    quotaExceeded("execution result command exceeds its input ceiling");
  }
  const result = parseExecutionResult(
    request.result,
    Math.min(preliminary.envelope.budget.maxResultBytes, session.storagePolicy.limits.maxResultEnvelopeBytes),
  );
  validateResultForNode(result, preliminary.envelope, preliminary.graph, result.nodeId);
  const canonicalJson = canonicalExecutionJson(result);
  const body = Buffer.from(canonicalJson, "utf8");
  const limits = session.storagePolicy.limits;
  if (body.byteLength > limits.maxArtifactBytes || body.byteLength > limits.maxCanonicalBlobBytes) {
    throw new ExecutionContractError("ARTIFACT_TOO_LARGE", "execution result artifact exceeds its byte ceiling");
  }
  if (body.byteLength > limits.maxCanonicalTextBytes) {
    quotaExceeded("execution result canonical text exceeds its byte ceiling");
  }
  return {
    result,
    body,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
}

function prepareResultWrite(
  session: ExecutionStoreSession,
  authority: ExecutionMutationAuthority,
  loaded: TransactionalLoadedExecutionRun,
  mutation: {
    graph: TransactionalLoadedExecutionRun["graph"];
    checkpoint: TransactionalLoadedExecutionRun["checkpoint"];
    newEvents: readonly ExecutionEvent[];
    artifacts: ExecutionArtifactMutationWrite["artifacts"];
    quota: QuotaUsageRow;
    workspaceBytes: number;
  },
): ExecutionArtifactMutationWrite {
  const graphJson = canonicalExecutionJson(mutation.graph);
  const checkpointJson = canonicalExecutionJson(mutation.checkpoint);
  const eventWrites = mutation.newEvents.map(eventWrite);
  const eventBytes = eventWrites.reduce((total, event) => total + event.byteLength, 0);
  const artifactBytes = mutation.artifacts.reduce((total, artifact) => total + artifact.byteLength, 0);
  const transactionBytes = eventBytes
    + artifactBytes
    + Buffer.byteLength(graphJson, "utf8")
    + Buffer.byteLength(checkpointJson, "utf8");
  const usage = {
    eventCount: mutation.quota.event_count + eventWrites.length,
    ledgerBytes: mutation.quota.ledger_bytes + eventBytes,
    artifactBytes: mutation.quota.artifact_bytes + artifactBytes,
    transactionBytes,
    workspaceBytes: mutation.workspaceBytes + transactionBytes,
  };
  assertMutableLimits(session, usage);
  const last = eventWrites.at(-1);
  if (last === undefined) snapshotDiverged("execution result mutation has no event");
  return {
    expected: {
      ledgerHeadSequence: loaded.checkpoint.lastEventSequence,
      ledgerHeadHash: loaded.checkpoint.lastEventHash,
      graphRevision: loaded.graph.graphRevision,
      controllerId: authority.controllerId,
      fencingToken: authority.fencingToken,
      runtimeReceiptId: authority.runtimeReceiptId,
    },
    events: eventWrites,
    artifacts: mutation.artifacts,
    runState: mutation.checkpoint.runState,
    graphRevision: mutation.graph.graphRevision,
    projection: {
      graphJson,
      graphSha256: executionDigest(mutation.graph),
      checkpointJson,
      checkpointSha256: executionDigest(mutation.checkpoint),
      derivedThroughSequence: last.sequence,
      derivedThroughHash: last.eventHash,
    },
    quota: {
      eventCount: usage.eventCount,
      ledgerBytes: usage.ledgerBytes,
      artifactBytes: usage.artifactBytes,
      lastTransactionBytes: usage.transactionBytes,
    },
  };
}

function assertResultAuthority(
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
      "execution result controller or runtime receipt does not own the run",
    );
  }
  if (controller.fencing_token !== authority.fencingToken) {
    throw new ExecutionContractError("STALE_FENCING_TOKEN", "execution result fencing token is stale");
  }
  if (loaded.checkpoint.lastEventHash !== authority.expectedLedgerHead) {
    snapshotDiverged("execution result ledger head is stale");
  }
  if (loaded.graph.graphRevision !== authority.expectedGraphRevision) {
    snapshotDiverged("execution result graph revision is stale");
  }
}

function artifactWrite(
  result: ExecutionResultEnvelope,
  preflight: ParsedResultPreflight,
  sourceEventSequence: number,
  createdAt: string,
): ExecutionArtifactMutationWrite["artifacts"][number] {
  return {
    artifactId: resultArtifactId(result.nodeId),
    nodeId: result.nodeId,
    mediaType: executionResultArtifactMediaType,
    body: preflight.body,
    sha256: preflight.sha256,
    byteLength: preflight.body.byteLength,
    sourceEventSequence,
    createdAt,
  };
}

function resultArtifactRef(result: ExecutionResultEnvelope, sha256: string): ExecutionArtifactRef {
  return { artifactId: resultArtifactId(result.nodeId), nodeId: result.nodeId, sha256 };
}

function resultArtifactId(nodeId: string): string {
  return `result-${nodeId}`;
}

function eventWrite(event: ExecutionEvent): ExecutionArtifactMutationWrite["events"][number] {
  const canonicalJson = canonicalExecutionJson(event);
  if (event.previousEventHash === null) {
    snapshotDiverged("execution result event identity is incomplete");
  }
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
}

function assertMutableLimits(
  session: ExecutionStoreSession,
  usage: {
    eventCount: number;
    ledgerBytes: number;
    artifactBytes: number;
    transactionBytes: number;
    workspaceBytes: number;
  },
): void {
  const limits = session.storagePolicy.limits;
  if (
    usage.eventCount > limits.maxEventsPerRun
    || usage.ledgerBytes > limits.maxLedgerBytes
    || usage.artifactBytes > limits.maxRunArtifactBytes
    || usage.transactionBytes > limits.maxTransactionPayloadBytes
    || usage.workspaceBytes > limits.maxWorkspaceBytes
  ) {
    quotaExceeded("execution result mutation exceeds its storage quota");
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

function quotaExceeded(message: string): never {
  throw new ExecutionContractError("STORAGE_QUOTA_EXCEEDED", message);
}

function snapshotDiverged(message: string): never {
  throw new ExecutionContractError("SNAPSHOT_DIVERGED", message);
}

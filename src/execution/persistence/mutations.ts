import { applyExecutionGraphMutation, transitionExecutionNode } from "../graph.js";
import { canonicalExecutionJson, executionDigest } from "../identity.js";
import {
  assertLedgerMatchesGraph,
  createExecutionEvent,
  replayExecutionLedger,
} from "../ledger.js";
import type { ExecutionReasonCode } from "../reasons.js";
import { ExecutionContractError } from "../types.js";
import type {
  ExecutionEventType,
  GraphMutationProposal,
  NodeTransition,
  TransactionalLoadedExecutionRun,
} from "../types.js";
import {
  readCanonicalExecutionRunRows,
  transactCanonicalExecutionGraphTransition,
} from "./sqlite-adapter.js";
import type {
  ControllerLeaseRow,
  ExecutionCanonicalRunRows,
} from "./sqlite-adapter.js";
import type { ExecutionStoreSession } from "./session.js";
import { materializeTransactionalExecutionRunRows } from "./store.js";

export interface ExecutionMutationAuthority {
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  expectedLedgerHead: string;
  expectedGraphRevision: number;
}

export interface CommitExecutionGraphTransitionRequest {
  runId: string;
  authority: ExecutionMutationAuthority;
  transition: NodeTransition;
  evidenceRefs: readonly string[];
  taskId: string | null;
  threadRef: string | null;
  reasonCode: ExecutionReasonCode | null;
  recordedAt: string;
}

export interface ExecutionControllerLease {
  runId: string;
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  state: "ACTIVE" | "RECONCILIATION_REQUIRED";
  acquiredAt: string;
  lastMutationAt: string;
}

export interface CommitExecutionGraphMutationRequest {
  runId: string;
  authority: ExecutionMutationAuthority;
  proposal: GraphMutationProposal;
  recordedAt: string;
}

export function commitExecutionGraphTransition(
  session: ExecutionStoreSession,
  request: CommitExecutionGraphTransitionRequest,
): TransactionalLoadedExecutionRun {
  const runId = transitionRunId(request);
  return transactCanonicalExecutionGraphTransition(session.database, runId, (rows) => {
    const loaded = materializeTransactionalExecutionRunRows(session, runId, rows);
    const controller = requiredController(rows);
    assertMutationAuthority(session, loaded, controller, request.authority);

    const graph = transitionExecutionNode(loaded.graph, request.transition, loaded.envelope);
    const event = createExecutionEvent({
      runId,
      eventType: eventTypeForTransition(request.transition),
      nodeId: request.transition.nodeId,
      beforeState: request.transition.from,
      afterState: request.transition.to,
      graphRevision: graph.graphRevision,
      evidenceRefs: request.evidenceRefs,
      taskId: request.taskId,
      threadRef: request.threadRef,
      reasonCode: request.reasonCode,
    }, loaded.events.length + 1, loaded.checkpoint.lastEventHash, request.recordedAt);
    const events = [...loaded.events, event];
    const checkpoint = replayExecutionLedger(events, loaded.envelope, graph);
    assertLedgerMatchesGraph(events, graph);
    const graphJson = canonicalExecutionJson(graph);
    const checkpointJson = canonicalExecutionJson(checkpoint);
    const eventJson = canonicalExecutionJson(event);
    const eventBytes = Buffer.byteLength(eventJson, "utf8");
    const transactionBytes = eventBytes
      + Buffer.byteLength(graphJson, "utf8")
      + Buffer.byteLength(checkpointJson, "utf8");
    const quota = requiredQuota(rows);
    assertMutationLimits(session, {
      eventCount: quota.event_count + 1,
      ledgerBytes: quota.ledger_bytes + eventBytes,
      transactionBytes,
    });
    const result: TransactionalLoadedExecutionRun = {
      ...loaded,
      graph,
      events,
      checkpoint,
    };
    return {
      write: {
        expected: {
          ledgerHeadSequence: loaded.checkpoint.lastEventSequence,
          ledgerHeadHash: loaded.checkpoint.lastEventHash,
          graphRevision: loaded.graph.graphRevision,
          controllerId: request.authority.controllerId,
          fencingToken: request.authority.fencingToken,
          runtimeReceiptId: request.authority.runtimeReceiptId,
        },
        event: {
          sequence: event.sequence,
          eventHash: event.eventHash,
          previousEventHash: event.previousEventHash ?? snapshotDiverged("execution mutation event is missing its predecessor"),
          eventType: event.eventType,
          nodeId: event.nodeId ?? snapshotDiverged("execution mutation event is missing its node"),
          canonicalJson: eventJson,
          byteLength: eventBytes,
          recordedAt: event.recordedAt,
        },
        runState: checkpoint.runState,
        graphRevision: graph.graphRevision,
        projection: {
          graphJson,
          graphSha256: executionDigest(graph),
          checkpointJson,
          checkpointSha256: executionDigest(checkpoint),
          derivedThroughSequence: checkpoint.lastEventSequence,
          derivedThroughHash: checkpoint.lastEventHash,
        },
        quota: {
          eventCount: quota.event_count + 1,
          ledgerBytes: quota.ledger_bytes + eventBytes,
          artifactBytes: quota.artifact_bytes,
          lastTransactionBytes: transactionBytes,
        },
      },
      result,
    };
  });
}

export function readExecutionControllerLease(
  session: ExecutionStoreSession,
  runId: string,
): ExecutionControllerLease {
  const rows = readCanonicalExecutionRunRows(session.database, runId);
  materializeTransactionalExecutionRunRows(session, runId, rows);
  const controller = requiredController(rows);
  if (controller.state !== "ACTIVE" && controller.state !== "RECONCILIATION_REQUIRED") {
    snapshotDiverged("execution controller lease state is invalid");
  }
  return {
    runId: controller.run_id,
    controllerId: controller.controller_id,
    fencingToken: controller.fencing_token,
    runtimeReceiptId: controller.runtime_receipt_id,
    state: controller.state,
    acquiredAt: controller.acquired_at,
    lastMutationAt: controller.last_mutation_at,
  };
}

export function commitExecutionGraphMutation(
  session: ExecutionStoreSession,
  request: CommitExecutionGraphMutationRequest,
): TransactionalLoadedExecutionRun {
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/u.test(request.runId)) {
    throw new ExecutionContractError("EXECUTION_RUN_INVALID", "execution graph mutation run identifier is invalid");
  }
  return transactCanonicalExecutionGraphTransition(session.database, request.runId, (rows) => {
    const loaded = materializeTransactionalExecutionRunRows(session, request.runId, rows);
    const controller = requiredController(rows);
    assertMutationAuthority(session, loaded, controller, request.authority);
    const acceptedEvidenceRefs = loaded.evidenceRefs.map((evidence) => evidence.evidenceId);
    const graph = applyExecutionGraphMutation(loaded.graph, request.proposal, loaded.envelope, acceptedEvidenceRefs);
    const event = createExecutionEvent({
      runId: request.runId,
      eventType: "GRAPH_MUTATION_ACCEPTED",
      nodeId: null,
      beforeState: loaded.checkpoint.runState,
      afterState: loaded.checkpoint.runState,
      graphRevision: loaded.graph.graphRevision,
      evidenceRefs: [...request.proposal.evidenceRefs],
      taskId: null,
      threadRef: null,
      reasonCode: null,
    }, loaded.events.length + 1, loaded.checkpoint.lastEventHash, request.recordedAt);
    const events = [...loaded.events, event];
    const checkpoint = replayExecutionLedger(events, loaded.envelope, graph);
    assertLedgerMatchesGraph(events, graph);
    const graphJson = canonicalExecutionJson(graph);
    const checkpointJson = canonicalExecutionJson(checkpoint);
    const eventJson = canonicalExecutionJson(event);
    const eventBytes = Buffer.byteLength(eventJson, "utf8");
    const transactionBytes = eventBytes + Buffer.byteLength(graphJson, "utf8") + Buffer.byteLength(checkpointJson, "utf8");
    const quota = requiredQuota(rows);
    assertMutationLimits(session, {
      eventCount: quota.event_count + 1,
      ledgerBytes: quota.ledger_bytes + eventBytes,
      transactionBytes,
    });
    return {
      write: {
        expected: {
          ledgerHeadSequence: loaded.checkpoint.lastEventSequence,
          ledgerHeadHash: loaded.checkpoint.lastEventHash,
          graphRevision: loaded.graph.graphRevision,
          controllerId: request.authority.controllerId,
          fencingToken: request.authority.fencingToken,
          runtimeReceiptId: request.authority.runtimeReceiptId,
        },
        event: {
          sequence: event.sequence,
          eventHash: event.eventHash,
          previousEventHash: event.previousEventHash ?? snapshotDiverged("execution graph mutation event has no predecessor"),
          eventType: event.eventType,
          nodeId: null,
          canonicalJson: eventJson,
          byteLength: eventBytes,
          recordedAt: event.recordedAt,
        },
        runState: checkpoint.runState,
        graphRevision: graph.graphRevision,
        projection: {
          graphJson,
          graphSha256: executionDigest(graph),
          checkpointJson,
          checkpointSha256: executionDigest(checkpoint),
          derivedThroughSequence: checkpoint.lastEventSequence,
          derivedThroughHash: checkpoint.lastEventHash,
        },
        quota: {
          eventCount: quota.event_count + 1,
          ledgerBytes: quota.ledger_bytes + eventBytes,
          artifactBytes: quota.artifact_bytes,
          lastTransactionBytes: transactionBytes,
        },
      },
      result: { ...loaded, graph, events, checkpoint },
    };
  });
}

function transitionRunId(
  request: CommitExecutionGraphTransitionRequest,
): string {
  if (!Number.isSafeInteger(request.authority.fencingToken) || request.authority.fencingToken < 1) {
    throw new ExecutionContractError("STALE_FENCING_TOKEN", "execution mutation fencing token is invalid or stale");
  }
  if (!Number.isSafeInteger(request.authority.expectedGraphRevision) || request.authority.expectedGraphRevision < 1) {
    snapshotDiverged("execution mutation graph revision is invalid");
  }
  if (!/^[a-f0-9]{64}$/u.test(request.authority.expectedLedgerHead)) {
    snapshotDiverged("execution mutation ledger head is invalid");
  }
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/u.test(request.runId)) {
    throw new ExecutionContractError("EXECUTION_RUN_INVALID", "execution graph transition run identifier is invalid");
  }
  return request.runId;
}

function assertMutationAuthority(
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
      "execution controller or runtime receipt does not own the run",
    );
  }
  if (controller.fencing_token !== authority.fencingToken) {
    throw new ExecutionContractError("STALE_FENCING_TOKEN", "execution mutation fencing token is stale");
  }
  if (loaded.checkpoint.lastEventHash !== authority.expectedLedgerHead) {
    snapshotDiverged("execution mutation ledger head is stale");
  }
  if (loaded.graph.graphRevision !== authority.expectedGraphRevision) {
    snapshotDiverged("execution mutation graph revision is stale");
  }
}

function eventTypeForTransition(transition: NodeTransition): ExecutionEventType {
  const key = `${transition.from}->${transition.to}`;
  const types: Readonly<Record<string, ExecutionEventType>> = {
    "PENDING->READY": "NODE_READY",
    "READY->DISPATCHING": "DISPATCH_INTENDED",
    "DISPATCHING->RUNNING": "DISPATCH_CONFIRMED",
    "RUNNING->RESULT_RECEIVED": "NODE_RESULT_RECEIVED",
    "RESULT_RECEIVED->SUCCEEDED": "NODE_RESULT_ACCEPTED",
    "RUNNING->REJECTED": "NODE_RESULT_REJECTED",
    "RUNNING->STOPPED": "NODE_STOPPED",
    "RUNNING->UNKNOWN": "NODE_UNKNOWN",
  };
  const eventType = types[key];
  if (eventType === undefined) {
    throw new ExecutionContractError("EXECUTION_NODE_TRANSITION_INVALID", "execution node transition has no ledger event mapping");
  }
  return eventType;
}

function requiredController(rows: ExecutionCanonicalRunRows): ControllerLeaseRow {
  if (rows.controller === undefined) snapshotDiverged("execution controller lease is missing");
  return rows.controller;
}

function requiredQuota(rows: ExecutionCanonicalRunRows): NonNullable<ExecutionCanonicalRunRows["quota"]> {
  if (rows.quota === undefined) snapshotDiverged("execution quota projection is missing");
  return rows.quota;
}

function assertMutationLimits(
  session: ExecutionStoreSession,
  usage: { eventCount: number; ledgerBytes: number; transactionBytes: number },
): void {
  const limits = session.storagePolicy.limits;
  if (
    usage.eventCount > limits.maxEventsPerRun
    || usage.ledgerBytes > limits.maxLedgerBytes
    || usage.transactionBytes > limits.maxTransactionPayloadBytes
  ) {
    throw new ExecutionContractError("STORAGE_QUOTA_EXCEEDED", "execution graph transition exceeds storage limits");
  }
}

function snapshotDiverged(message: string): never {
  throw new ExecutionContractError("SNAPSHOT_DIVERGED", message);
}

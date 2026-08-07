import { canonicalExecutionJson, executionDigest } from "./identity.js";
import { assertSafeExecutionContent } from "./validation.js";
import { ExecutionContractError } from "./types.js";
import type {
  ExecutionCheckpoint,
  ExecutionEnvelope,
  ExecutionEvent,
  ExecutionEventInput,
  ExecutionEventType,
  ExecutionGraph,
  ExecutionNodeState,
  ExecutionRunState,
} from "./types.js";

const ledgerCode = "EXECUTION_LEDGER_INVALID";
const checkpointCode = "EXECUTION_CHECKPOINT_INVALID";
const hashPattern = /^[a-f0-9]{64}$/;
const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/;
const eventTypes = [
  "RUN_CREATED",
  "GRAPH_ACCEPTED",
  "NODE_READY",
  "NODE_DISPATCHED",
  "NODE_RESULT_RECEIVED",
  "NODE_RESULT_ACCEPTED",
  "NODE_RESULT_REJECTED",
  "NODE_STOPPED",
  "GRAPH_MUTATION_ACCEPTED",
  "CHECKPOINT_WRITTEN",
  "RUN_FINALIZED",
  "RUN_STOPPED",
  "RUN_UNKNOWN",
] as const satisfies readonly ExecutionEventType[];
const nodeStates = ["PENDING", "READY", "RUNNING", "RESULT_RECEIVED", "SUCCEEDED", "REJECTED", "STOPPED", "UNKNOWN"] as const satisfies readonly ExecutionNodeState[];
const runStates = ["PREPARED", "READY", "RUNNING", "WAITING_FOR_HUMAN", "COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"] as const satisfies readonly ExecutionRunState[];
const reasonCodePattern = /^[A-Z][A-Z0-9_]{2,79}$/;
const eventInputKeys = ["runId", "eventType", "nodeId", "beforeState", "afterState", "graphRevision", "evidenceRefs", "taskId", "threadRef", "reasonCode"] as const;
const eventKeys = ["eventVersion", "sequence", "recordedAt", "previousEventHash", ...eventInputKeys, "eventHash"] as const;
const checkpointKeys = [
  "checkpointVersion",
  "runId",
  "envelopeHash",
  "graphHash",
  "graphRevision",
  "runState",
  "dispatchCount",
  "repairCount",
  "acceptedEvidenceRefs",
  "activeThreadRefs",
  "lastEventSequence",
  "lastEventHash",
] as const;

export function createExecutionEvent(
  input: ExecutionEventInput,
  sequence: number,
  previousEventHash: string | null,
  recordedAt: string,
): ExecutionEvent {
  const parsedInput = parseExecutionEventInput(input);
  const event = {
    eventVersion: "1.0" as const,
    sequence: positiveInteger(sequence, ledgerCode, "execution event sequence is invalid"),
    recordedAt: isoTimestamp(recordedAt, ledgerCode, "execution event timestamp is invalid"),
    previousEventHash: nullableHash(previousEventHash, ledgerCode, "execution event predecessor hash is invalid"),
    ...parsedInput,
  };
  if ((event.sequence === 1) !== (event.previousEventHash === null)) {
    throw new ExecutionContractError(ledgerCode, "execution event chain origin is invalid");
  }
  return { ...event, eventHash: executionDigest(event) };
}

export function parseExecutionEvent(value: unknown): ExecutionEvent {
  const record = plainRecord(value, ledgerCode, "execution event must be a plain object");
  exactKeys(record, eventKeys, ledgerCode, "execution event fields are invalid");
  const eventHash = hashValue(record.eventHash, ledgerCode, "execution event hash is invalid");
  const event = createExecutionEvent(
    eventInputFromRecord(record),
    positiveInteger(record.sequence, ledgerCode, "execution event sequence is invalid"),
    nullableHash(record.previousEventHash, ledgerCode, "execution event predecessor hash is invalid"),
    isoTimestamp(record.recordedAt, ledgerCode, "execution event timestamp is invalid"),
  );
  if (eventHash !== event.eventHash) throw new ExecutionContractError(ledgerCode, "execution event hash does not match its content");
  return { ...event, eventHash };
}

export function replayExecutionLedger(events: readonly ExecutionEvent[], envelope: ExecutionEnvelope, graph: ExecutionGraph): ExecutionCheckpoint {
  if (events.length < 2) throw new ExecutionContractError(ledgerCode, "execution ledger is missing its creation records");

  const nodeStatesById = new Map<string, ExecutionNodeState>();
  const activeThreadRefs = new Set<string>();
  const acceptedEvidenceRefs = new Set<string>();
  let runState: ExecutionRunState = "PREPARED";
  let dispatchCount = 0;
  let repairCount = 0;
  let previousHash: string | null = null;

  for (const [index, rawEvent] of events.entries()) {
    const event = parseExecutionEvent(rawEvent);
    if (event.sequence !== index + 1 || event.previousEventHash !== previousHash || event.runId !== envelope.runId || event.graphRevision > graph.graphRevision) {
      throw new ExecutionContractError(ledgerCode, "execution ledger sequence, identity, or revision is invalid");
    }
    if (index === 0 && (event.eventType !== "RUN_CREATED" || event.beforeState !== null || event.afterState !== "PREPARED" || event.nodeId !== null)) {
      throw new ExecutionContractError(ledgerCode, "execution ledger creation record is invalid");
    }
    if (index === 1 && (event.eventType !== "GRAPH_ACCEPTED" || event.beforeState !== "PREPARED" || event.afterState !== "READY" || event.nodeId !== null)) {
      throw new ExecutionContractError(ledgerCode, "execution ledger graph record is invalid");
    }
    if (index > 1) applyEvent(event, nodeStatesById, activeThreadRefs, acceptedEvidenceRefs);
    if (isRunState(event.afterState)) runState = event.afterState;
    if (event.eventType === "NODE_DISPATCHED") dispatchCount += 1;
    if (event.eventType === "GRAPH_MUTATION_ACCEPTED") repairCount += 1;
    previousHash = event.eventHash;
  }

  if (runState === "PREPARED") runState = "READY";
  if (runState === "READY" && dispatchCount > 0) runState = "RUNNING";
  const lastEvent = events.at(-1);
  if (lastEvent === undefined || previousHash === null) throw new ExecutionContractError(ledgerCode, "execution ledger is empty");

  return {
    checkpointVersion: "1.0",
    runId: envelope.runId,
    envelopeHash: envelope.envelopeHash,
    graphHash: graph.graphHash,
    graphRevision: graph.graphRevision,
    runState,
    dispatchCount,
    repairCount,
    acceptedEvidenceRefs: [...acceptedEvidenceRefs].sort(),
    activeThreadRefs: [...activeThreadRefs].sort(),
    lastEventSequence: lastEvent.sequence,
    lastEventHash: previousHash,
  };
}

export function replayExecutionEvents(events: readonly ExecutionEvent[], envelope: ExecutionEnvelope, graph: ExecutionGraph): ExecutionCheckpoint {
  return replayExecutionLedger(events, envelope, graph);
}

export function assertLedgerMatchesGraph(events: readonly ExecutionEvent[], graph: ExecutionGraph): void {
  const nodeStatesById = new Map<string, ExecutionNodeState>();
  for (const rawEvent of events) {
    const event = parseExecutionEvent(rawEvent);
    if (event.nodeId !== null && isNodeState(event.afterState)) nodeStatesById.set(event.nodeId, event.afterState);
  }
  for (const [nodeId, state] of nodeStatesById) {
    const node = graph.nodes.find((entry) => entry.nodeId === nodeId);
    if (node === undefined || node.state !== state) {
      throw new ExecutionContractError(ledgerCode, "execution graph snapshot disagrees with its ledger");
    }
  }
}

export function parseExecutionCheckpoint(value: unknown): ExecutionCheckpoint {
  const record = plainRecord(value, checkpointCode, "execution checkpoint must be a plain object");
  exactKeys(record, checkpointKeys, checkpointCode, "execution checkpoint fields are invalid");
  return {
    checkpointVersion: literal(record.checkpointVersion, ["1.0"], checkpointCode, "execution checkpoint version is invalid"),
    runId: identifierValue(record.runId, checkpointCode, "execution checkpoint run identifier is invalid"),
    envelopeHash: hashValue(record.envelopeHash, checkpointCode, "execution checkpoint envelope hash is invalid"),
    graphHash: hashValue(record.graphHash, checkpointCode, "execution checkpoint graph hash is invalid"),
    graphRevision: positiveInteger(record.graphRevision, checkpointCode, "execution checkpoint graph revision is invalid"),
    runState: literal(record.runState, runStates, checkpointCode, "execution checkpoint state is invalid"),
    dispatchCount: nonNegativeInteger(record.dispatchCount, checkpointCode, "execution checkpoint dispatch count is invalid"),
    repairCount: nonNegativeInteger(record.repairCount, checkpointCode, "execution checkpoint repair count is invalid"),
    acceptedEvidenceRefs: identifierList(record.acceptedEvidenceRefs, checkpointCode, "execution checkpoint evidence references are invalid"),
    activeThreadRefs: stringList(record.activeThreadRefs, checkpointCode, "execution checkpoint thread references are invalid"),
    lastEventSequence: positiveInteger(record.lastEventSequence, checkpointCode, "execution checkpoint last sequence is invalid"),
    lastEventHash: hashValue(record.lastEventHash, checkpointCode, "execution checkpoint last hash is invalid"),
  };
}

export function executionCheckpointMatches(left: ExecutionCheckpoint, right: ExecutionCheckpoint): boolean {
  return canonicalExecutionJson(left) === canonicalExecutionJson(right);
}

function parseExecutionEventInput(value: unknown): ExecutionEventInput {
  const record = plainRecord(value, ledgerCode, "execution event input must be a plain object");
  exactKeys(record, eventInputKeys, ledgerCode, "execution event input fields are invalid");
  return eventInputFromRecord(record);
}

function eventInputFromRecord(record: Record<string, unknown>): ExecutionEventInput {
  const parsed = {
    runId: identifierValue(record.runId, ledgerCode, "execution event run identifier is invalid"),
    eventType: literal(record.eventType, eventTypes, ledgerCode, "execution event type is invalid"),
    nodeId: nullableIdentifier(record.nodeId, ledgerCode, "execution event node identifier is invalid"),
    beforeState: nullableState(record.beforeState, ledgerCode, "execution event prior state is invalid"),
    afterState: nullableState(record.afterState, ledgerCode, "execution event next state is invalid"),
    graphRevision: positiveInteger(record.graphRevision, ledgerCode, "execution event graph revision is invalid"),
    evidenceRefs: identifierList(record.evidenceRefs, ledgerCode, "execution event evidence references are invalid"),
    taskId: nullableIdentifier(record.taskId, ledgerCode, "execution event task identifier is invalid"),
    threadRef: nullableString(record.threadRef, ledgerCode, "execution event thread reference is invalid"),
    reasonCode: nullableReasonCode(record.reasonCode, ledgerCode, "execution event reason code is invalid"),
  };
  assertSafeExecutionContent(parsed);
  assertEventSemantics(parsed);
  return parsed;
}

function applyEvent(
  event: ExecutionEvent,
  nodeStatesById: Map<string, ExecutionNodeState>,
  activeThreadRefs: Set<string>,
  acceptedEvidenceRefs: Set<string>,
): void {
  if (event.nodeId !== null && isNodeState(event.beforeState) && isNodeState(event.afterState)) {
    const previous = nodeStatesById.get(event.nodeId);
    if (previous !== undefined && previous !== event.beforeState) {
      throw new ExecutionContractError(ledgerCode, "execution ledger node transition is discontinuous");
    }
    nodeStatesById.set(event.nodeId, event.afterState);
  }
  if (event.eventType === "NODE_DISPATCHED" && event.threadRef !== null) activeThreadRefs.add(event.threadRef);
  if (["NODE_RESULT_RECEIVED", "NODE_RESULT_ACCEPTED", "NODE_RESULT_REJECTED", "NODE_STOPPED"].includes(event.eventType) && event.threadRef !== null) {
    activeThreadRefs.delete(event.threadRef);
  }
  if (["NODE_RESULT_ACCEPTED", "GRAPH_MUTATION_ACCEPTED"].includes(event.eventType)) {
    for (const evidenceRef of event.evidenceRefs) acceptedEvidenceRefs.add(evidenceRef);
  }
}

function assertEventSemantics(event: ExecutionEventInput): void {
  const nodeTransitionTypes: Readonly<Record<string, readonly [ExecutionNodeState, ExecutionNodeState]>> = {
    NODE_READY: ["PENDING", "READY"],
    NODE_DISPATCHED: ["READY", "RUNNING"],
    NODE_RESULT_RECEIVED: ["RUNNING", "RESULT_RECEIVED"],
    NODE_RESULT_ACCEPTED: ["RESULT_RECEIVED", "SUCCEEDED"],
    NODE_RESULT_REJECTED: ["RUNNING", "REJECTED"],
    NODE_STOPPED: ["RUNNING", "STOPPED"],
  };
  const expectedNodeTransition = nodeTransitionTypes[event.eventType];
  if (expectedNodeTransition !== undefined) {
    if (event.nodeId === null || event.beforeState !== expectedNodeTransition[0] || event.afterState !== expectedNodeTransition[1]) {
      throw new ExecutionContractError(ledgerCode, "execution event node transition is invalid");
    }
    return;
  }
  if (event.eventType === "RUN_CREATED" && (event.nodeId !== null || event.beforeState !== null || event.afterState !== "PREPARED")) {
    throw new ExecutionContractError(ledgerCode, "execution creation event is invalid");
  }
  if (event.eventType === "GRAPH_ACCEPTED" && (event.nodeId !== null || event.beforeState !== "PREPARED" || event.afterState !== "READY")) {
    throw new ExecutionContractError(ledgerCode, "execution graph acceptance event is invalid");
  }
  if (event.eventType === "RUN_FINALIZED" && (event.nodeId !== null || !["COMPLETE", "COMPLETE_WITH_LIMIT"].includes(event.afterState ?? ""))) {
    throw new ExecutionContractError(ledgerCode, "execution finalization event is invalid");
  }
  if (event.eventType === "RUN_STOPPED" && (event.nodeId !== null || event.afterState !== "STOPPED")) {
    throw new ExecutionContractError(ledgerCode, "execution stop event is invalid");
  }
  if (event.eventType === "RUN_UNKNOWN" && (event.nodeId !== null || event.afterState !== "UNKNOWN")) {
    throw new ExecutionContractError(ledgerCode, "execution unknown event is invalid");
  }
}

function plainRecord(value: unknown, code: string, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ExecutionContractError(code, message);
  }
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], code: string, message: string): void {
  const keys = Reflect.ownKeys(record);
  if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) {
    throw new ExecutionContractError(code, message);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) throw new ExecutionContractError(code, message);
  }
}

function literal<T extends string>(value: unknown, values: readonly T[], code: string, message: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new ExecutionContractError(code, message);
  return value as T;
}

function identifierValue(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !identifierPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function nullableIdentifier(value: unknown, code: string, message: string): string | null {
  return value === null ? null : identifierValue(value, code, message);
}

function nullableReasonCode(value: unknown, code: string, message: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !reasonCodePattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function nullableString(value: unknown, code: string, message: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") throw new ExecutionContractError(code, message);
  return value;
}

function hashValue(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !hashPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function nullableHash(value: unknown, code: string, message: string): string | null {
  return value === null ? null : hashValue(value, code, message);
}

function positiveInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new ExecutionContractError(code, message);
  return value;
}

function nonNegativeInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ExecutionContractError(code, message);
  return value;
}

function stringList(value: unknown, code: string, message: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

function identifierList(value: unknown, code: string, message: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !identifierPattern.test(entry)) || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

function nullableState(value: unknown, code: string, message: string): ExecutionNodeState | ExecutionRunState | null {
  if (value === null) return null;
  if (typeof value !== "string" || ![...nodeStates, ...runStates].includes(value as never)) throw new ExecutionContractError(code, message);
  return value as ExecutionNodeState | ExecutionRunState;
}

function isNodeState(value: ExecutionNodeState | ExecutionRunState | null): value is ExecutionNodeState {
  return typeof value === "string" && nodeStates.includes(value as ExecutionNodeState);
}

function isRunState(value: ExecutionNodeState | ExecutionRunState | null): value is ExecutionRunState {
  return typeof value === "string" && runStates.includes(value as ExecutionRunState);
}

function isoTimestamp(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

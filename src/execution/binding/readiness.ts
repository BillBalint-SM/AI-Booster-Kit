import { buildExecutionTaskPacket } from "../handoff.js";
import { canonicalExecutionJson, executionDigest } from "../identity.js";
import { executionReason, parseExecutionReasonCode } from "../reasons.js";
import type { ExecutionReasonCode } from "../reasons.js";
import { ExecutionContractError } from "../types.js";
import type { ExecutionArtifactRef, TransactionalLoadedExecutionRun } from "../types.js";
import { parseExecutionHostReceipt } from "./host-receipt.js";
import type {
  AssembleExecutionDispatchReadinessRequest,
  DispatchReadinessReceipt,
  ExecutionBindingPolicy,
  HostEvidenceReceipt,
  SourceBindingObservation,
} from "./types.js";

const invalidCode = "EXECUTION_DISPATCH_READINESS_INVALID";
const receiptKeys = [
  "receiptVersion",
  "receiptId",
  "state",
  "runId",
  "nodeId",
  "taskId",
  "envelopeHash",
  "graphRevision",
  "controllerId",
  "runtimeReceiptId",
  "hostEvidenceReceiptId",
  "hostSessionId",
  "sourceObservationIds",
  "sourceStateDigests",
  "reasonCodes",
  "observedAt",
  "evidenceDigest",
] as const;

export function assembleExecutionDispatchReadiness(
  request: AssembleExecutionDispatchReadinessRequest,
  policy: ExecutionBindingPolicy,
): DispatchReadinessReceipt {
  const observedAt = canonicalInstant(request.observedAt);
  const run = validateRunPreconditions(request.run, request.runtimeReceipt, request.nodeId);
  if (
    request.hostReceipt.controllerId !== run.controllerId
    || request.hostReceipt.runtimeReceiptId !== run.runtimeReceiptId
  ) {
    invalid("host receipt does not belong to the canonical run controller");
  }
  const hostReceipt = parseExecutionHostReceipt(request.hostReceipt, policy);
  const node = run.graph.nodes.find((candidate) => candidate.nodeId === request.nodeId);
  if (node === undefined || node.state !== "READY" || (node.type !== "AGENT_TASK" && node.type !== "SYNTHESIS")) {
    invalid("selected execution node is not dispatch-ready");
  }
  const contextRefs = contextArtifactRefs(run, node.nodeId);
  const taskPacket = buildExecutionTaskPacket(run.envelope, run.graph, node.nodeId, contextRefs);
  const sources = validateSources(request.sourceObservations, node.sourceIds, run);
  const reasons = readinessReasons(hostReceipt, request.runtimeReceipt.hostSessionId, sources, policy);
  const state = readinessState(reasons);
  const orderedSources = [...sources].sort((left, right) => asciiCompare(left.sourceId, right.sourceId));
  return createReceipt({
    state,
    runId: run.runId,
    nodeId: node.nodeId,
    taskId: taskPacket.taskId,
    envelopeHash: run.envelope.envelopeHash,
    graphRevision: run.graph.graphRevision,
    controllerId: run.controllerId,
    runtimeReceiptId: run.runtimeReceiptId,
    hostEvidenceReceiptId: hostReceipt.receiptId,
    hostSessionId: hostReceipt.hostSessionId,
    sourceObservationIds: orderedSources.map((source) => source.observationId),
    sourceStateDigests: orderedSources.map((source) => source.sourceStateDigest),
    reasonCodes: reasons,
    observedAt,
  }, policy);
}

export function parseExecutionDispatchReadinessReceipt(
  value: unknown,
  policy: ExecutionBindingPolicy,
): DispatchReadinessReceipt {
  let canonical: string;
  try {
    canonical = canonicalExecutionJson(value);
  } catch {
    invalid("readiness receipt cannot be canonicalized");
  }
  if (Buffer.byteLength(canonical, "utf8") > policy.maxReadinessInputBytes) {
    throw new ExecutionContractError("COMMAND_INPUT_TOO_LARGE", "readiness receipt exceeds its input byte limit");
  }
  const record = plainRecord(value, receiptKeys);
  if (record.receiptVersion !== "1.0") invalid("readiness receipt version is unsupported");
  const reasonCodes = reasonList(record.reasonCodes);
  const expected = createReceipt({
    state: enumValue(record.state, ["READY", "STOPPED", "UNKNOWN"], "readiness state") as DispatchReadinessReceipt["state"],
    runId: identifier(record.runId, "run identity"),
    nodeId: identifier(record.nodeId, "node identity"),
    taskId: digest(record.taskId, "task identity"),
    envelopeHash: digest(record.envelopeHash, "envelope identity"),
    graphRevision: positiveInteger(record.graphRevision, "graph revision"),
    controllerId: identifier(record.controllerId, "controller identity"),
    runtimeReceiptId: digest(record.runtimeReceiptId, "runtime receipt identity"),
    hostEvidenceReceiptId: digest(record.hostEvidenceReceiptId, "host evidence receipt identity"),
    hostSessionId: nullableDigest(record.hostSessionId, "host session identity"),
    sourceObservationIds: digestList(record.sourceObservationIds, "source observation identities"),
    sourceStateDigests: digestList(record.sourceStateDigests, "source state identities"),
    reasonCodes,
    observedAt: canonicalInstant(record.observedAt),
  }, policy);
  if (
    digest(record.evidenceDigest, "readiness evidence identity") !== expected.evidenceDigest
    || digest(record.receiptId, "readiness receipt identity") !== expected.receiptId
    || canonicalExecutionJson(record) !== canonicalExecutionJson(expected)
  ) {
    invalid("readiness receipt identity is invalid");
  }
  return expected;
}

interface ReadinessReceiptBodyInput {
  state: DispatchReadinessReceipt["state"];
  runId: string;
  nodeId: string;
  taskId: string;
  envelopeHash: string;
  graphRevision: number;
  controllerId: string;
  runtimeReceiptId: string;
  hostEvidenceReceiptId: string;
  hostSessionId: string | null;
  sourceObservationIds: readonly string[];
  sourceStateDigests: readonly string[];
  reasonCodes: readonly ExecutionReasonCode[];
  observedAt: string;
}

function createReceipt(input: ReadinessReceiptBodyInput, policy: ExecutionBindingPolicy): DispatchReadinessReceipt {
  if (input.sourceObservationIds.length === 0 || input.sourceObservationIds.length !== input.sourceStateDigests.length) {
    invalid("readiness source identity sets are invalid");
  }
  if (readinessState(input.reasonCodes) !== input.state) invalid("readiness state disagrees with its reasons");
  const bodyWithoutEvidence = {
    receiptVersion: "1.0" as const,
    state: input.state,
    runId: input.runId,
    nodeId: input.nodeId,
    taskId: input.taskId,
    envelopeHash: input.envelopeHash,
    graphRevision: input.graphRevision,
    controllerId: input.controllerId,
    runtimeReceiptId: input.runtimeReceiptId,
    hostEvidenceReceiptId: input.hostEvidenceReceiptId,
    hostSessionId: input.hostSessionId,
    sourceObservationIds: [...input.sourceObservationIds],
    sourceStateDigests: [...input.sourceStateDigests],
    reasonCodes: [...input.reasonCodes],
    observedAt: input.observedAt,
  };
  const evidenceDigest = executionDigest({
    domain: "execution-dispatch-readiness-v1",
    policyDigest: policy.policyDigest,
    ...bodyWithoutEvidence,
  });
  const body = { ...bodyWithoutEvidence, evidenceDigest };
  return { ...body, receiptId: executionDigest(body) };
}

function validateRunPreconditions(
  run: TransactionalLoadedExecutionRun,
  runtimeReceipt: AssembleExecutionDispatchReadinessRequest["runtimeReceipt"],
  nodeId: string,
): TransactionalLoadedExecutionRun {
  if (!["READY", "RUNNING", "WAITING_FOR_HUMAN"].includes(run.checkpoint.runState)) {
    invalid("terminal or unprepared execution run cannot produce readiness");
  }
  if (
    runtimeReceipt.receiptId !== run.runtimeReceiptId
    || executionDigest(withoutReceiptId(runtimeReceipt)) !== runtimeReceipt.receiptId
    || !/^[a-f0-9]{64}$/u.test(run.workspaceIdentityDigest)
  ) {
    invalid("runtime or workspace binding does not match the canonical run");
  }
  if (!run.graph.nodes.some((node) => node.nodeId === nodeId)) invalid("selected execution node does not exist");
  return run;
}

function validateSources(
  values: readonly SourceBindingObservation[],
  expectedSourceIds: readonly string[],
  run: TransactionalLoadedExecutionRun,
): SourceBindingObservation[] {
  if (
    values.length !== expectedSourceIds.length
    || new Set(values.map((value) => value.sourceId)).size !== values.length
    || new Set(expectedSourceIds).size !== expectedSourceIds.length
  ) {
    invalid("readiness source observation set is incomplete or duplicated");
  }
  const expected = [...expectedSourceIds].sort(asciiCompare);
  const sources = values.map((value) => validateSourceObservation(value, run));
  const actual = sources.map((value) => value.sourceId).sort(asciiCompare);
  if (actual.some((sourceId, index) => sourceId !== expected[index])) invalid("readiness source observation set is foreign");
  return sources;
}

function validateSourceObservation(
  value: SourceBindingObservation,
  run: TransactionalLoadedExecutionRun,
): SourceBindingObservation {
  const keys = [
    "observationVersion", "observationId", "sourceId", "repositoryIdentityDigest", "worktreeIdentityDigest",
    "workspaceIdentityDigest", "expectedSourceRevision", "observedSourceRevision", "auditedPaths", "dirtyState",
    "sourceStateDigest", "observedAt", "reasonCodes", "evidenceDigest",
  ] as const;
  const record = plainRecord(value, keys);
  const source = run.envelope.sources.find((candidate) => candidate.sourceId === record.sourceId);
  if (
    source === undefined
    || record.observationVersion !== "1.0"
    || record.expectedSourceRevision !== source.sourceRevision
    || record.expectedSourceRevision !== run.envelope.sourceRevision
    || digest(record.sourceStateDigest, "source state identity") === ""
    || digest(record.evidenceDigest, "source evidence identity") === ""
  ) {
    invalid("source observation does not match the canonical envelope source");
  }
  const { observationId, ...body } = record;
  if (digest(observationId, "source observation identity") !== executionDigest(body)) {
    invalid("source observation identity is invalid");
  }
  const workspaceIdentity = record.workspaceIdentityDigest === null
    ? null
    : digest(record.workspaceIdentityDigest, "source workspace identity");
  const reasons = sourceReasonList(record.reasonCodes);
  const dirtyState = enumValue(record.dirtyState, ["CLEAN", "DIRTY", "UNKNOWN"], "source dirty state");
  if (
    (dirtyState === "DIRTY") !== reasons.includes("WORKTREE_DIRTY_IN_SCOPE")
    || (dirtyState === "UNKNOWN") !== reasons.includes("SOURCE_UNREADABLE")
    || (workspaceIdentity !== null && workspaceIdentity !== run.workspaceIdentityDigest) !== reasons.includes("WORKSPACE_IDENTITY_MISMATCH")
  ) {
    invalid("source observation state disagrees with its reasons");
  }
  return value;
}

function readinessReasons(
  host: HostEvidenceReceipt,
  runtimeHostSessionId: string,
  sources: readonly SourceBindingObservation[],
  policy: ExecutionBindingPolicy,
): ExecutionReasonCode[] {
  const reasons: ExecutionReasonCode[] = [];
  if (!policy.admittedHostProfiles.includes(host.hostProfileId as "CODEX_APP_NATIVE_V1")) reasons.push("HOST_PROFILE_UNSUPPORTED");
  for (const capability of host.capabilities) {
    if (capability.state === "UNSUPPORTED") reasons.push("HOST_CAPABILITY_UNSUPPORTED");
    if (capability.state === "UNKNOWN") reasons.push("HOST_CAPABILITY_UNKNOWN");
    if (capability.authorityState === "DENIED") reasons.push("AUTHORITY_NOT_PROVEN");
    if (capability.authorityState === "UNKNOWN") reasons.push("AUTHORITY_STATE_UNKNOWN");
    if (capability.instructionState === "UNKNOWN") reasons.push("HOST_INSTRUCTION_STATE_UNKNOWN");
  }
  if (host.hostSessionId === null || !/^[a-f0-9]{64}$/u.test(runtimeHostSessionId)) {
    reasons.push("HOST_SESSION_IDENTITY_UNKNOWN");
  } else if (host.hostSessionId !== runtimeHostSessionId) {
    reasons.push("HOST_SESSION_IDENTITY_MISMATCH");
  }
  for (const source of sources) reasons.push(...source.reasonCodes);
  return uniqueSorted(reasons);
}

function readinessState(reasons: readonly ExecutionReasonCode[]): DispatchReadinessReceipt["state"] {
  if (reasons.some((reason) => executionReason(reason).disposition === "STOP_KNOWN")) return "STOPPED";
  if (reasons.some((reason) => executionReason(reason).disposition === "MARK_UNKNOWN")) return "UNKNOWN";
  if (reasons.length !== 0) invalid("readiness contains a reason without a total disposition");
  return "READY";
}

function contextArtifactRefs(run: TransactionalLoadedExecutionRun, nodeId: string): readonly ExecutionArtifactRef[] {
  const predecessorIds = new Set(run.graph.edges.filter((edge) => edge.toNodeId === nodeId).map((edge) => edge.fromNodeId));
  return run.artifacts.filter((artifact) => artifact.nodeId !== null
    && predecessorIds.has(artifact.nodeId)
    && run.acceptedResults.some((result) => result.nodeId === artifact.nodeId));
}

function withoutReceiptId(receipt: AssembleExecutionDispatchReadinessRequest["runtimeReceipt"]): Omit<AssembleExecutionDispatchReadinessRequest["runtimeReceipt"], "receiptId"> {
  const { receiptId: _receiptId, ...body } = receipt;
  return body;
}

function reasonList(value: unknown): ExecutionReasonCode[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) invalid("readiness reasons are invalid");
  const reasons = value.map((entry) => parseExecutionReasonCode(entry));
  const sorted = uniqueSorted(reasons);
  if (sorted.length !== reasons.length || sorted.some((entry, index) => entry !== reasons[index])) invalid("readiness reasons must be sorted and unique");
  return reasons;
}

function sourceReasonList(value: unknown): SourceBindingObservation["reasonCodes"] {
  const allowed = ["SOURCE_REVISION_MISMATCH", "WORKTREE_DIRTY_IN_SCOPE", "WORKSPACE_IDENTITY_MISMATCH", "SOURCE_UNREADABLE"] as const;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !allowed.includes(entry as typeof allowed[number]))) {
    invalid("source observation reasons are invalid");
  }
  const reasons = value as SourceBindingObservation["reasonCodes"];
  const sorted = [...new Set(reasons)].sort(asciiCompare);
  if (sorted.length !== reasons.length || sorted.some((entry, index) => entry !== reasons[index])) invalid("source observation reasons must be sorted and unique");
  return reasons;
}

function uniqueSorted(values: readonly ExecutionReasonCode[]): ExecutionReasonCode[] {
  return [...new Set(values)].sort(asciiCompare);
}

function digestList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) invalid(`${label} are invalid`);
  return value.map((entry) => digest(entry, label));
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) invalid(`${label} is invalid`);
  return value;
}

function nullableDigest(value: unknown, label: string): string | null {
  return value === null ? null : digest(value, label);
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(value)) invalid(`${label} is invalid`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) invalid(`${label} is invalid`);
  return value as number;
}

function enumValue(value: unknown, allowed: readonly string[], label: string): string {
  if (typeof value !== "string" || !allowed.includes(value)) invalid(`${label} is invalid`);
  return value;
}

function canonicalInstant(value: unknown): string {
  if (typeof value !== "string") invalid("readiness observation time is invalid");
  const time = Date.parse(value as string);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) invalid("readiness observation time is invalid");
  return value as string;
}

function plainRecord(value: unknown, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    invalid("readiness value must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort(asciiCompare);
  const expected = [...expectedKeys].sort(asciiCompare);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) invalid("readiness fields are invalid");
  return record;
}

function asciiCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function invalid(message: string): never {
  throw new ExecutionContractError(invalidCode, message);
}

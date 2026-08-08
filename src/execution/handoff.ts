import { canonicalExecutionJson, executionDigest } from "./identity.js";
import { validateExecutionGraph } from "./graph.js";
import { parseExecutionReasonCode } from "./reasons.js";
import { decideExecutionTransition } from "./semantics.js";
import { ExecutionContractError } from "./types.js";
import type { ExecutionTransitionDecision } from "./semantics.js";
import type {
  ExecutionArtifactRef,
  ExecutionClaim,
  ExecutionEnvelope,
  ExecutionEvidenceRef,
  ExecutionFollowupRequest,
  ExecutionGraph,
  ExecutionNode,
  ExecutionResultEnvelope,
  ExecutionTaskPacket,
  ExecutionNodeState,
  ExecutionRunState,
} from "./types.js";

const taskCode = "EXECUTION_TASK_INVALID";
const resultFieldsCode = "EXECUTION_RESULT_FIELDS_INVALID";
const resultSizeCode = "EXECUTION_RESULT_TOO_LARGE";
const resultForeignCode = "EXECUTION_RESULT_FOREIGN";
const resultStaleCode = "EXECUTION_RESULT_STALE";
const resultEvidenceCode = "EXECUTION_RESULT_EVIDENCE_INVALID";
const resultScopeCode = "EXECUTION_RESULT_SCOPE_VIOLATION";
const resultContentCode = "EXECUTION_RESULT_CONTENT_FORBIDDEN";
const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const revisionPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const forbiddenContentPattern = /(?:^|[\s:=])(?:transcript|prompt|secret|access[_-]?token|refresh[_-]?token|credential|cookie|password|api[_-]?key|authorization|reasoning|token)(?:$|[\s:=])/i;
const forbiddenResultValuePatterns = [
  forbiddenContentPattern,
  /(?:^|\s)[A-Za-z]:[\\/]/u,
  /(?:^|\s)\\\\[^\\\s]+\\/u,
  /(?:^|\s)\/(?:Users|home|etc|var|tmp)\//u,
  /(?:^|[;\s])(?:PATH|HOME|USERPROFILE|AWS_[A-Z0-9_]+|AZURE_[A-Z0-9_]+)=/u,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /"(?:connector|headers|request|response|payload)"\s*:/iu,
  /https?:\/\//iu,
] as const;

export function buildExecutionTaskPacket(
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  nodeId: string,
  contextRefs: readonly ExecutionArtifactRef[],
): ExecutionTaskPacket {
  const current = validateExecutionGraph(graph, envelope);
  const node = current.nodes.find((entry) => entry.nodeId === nodeId);
  if (node === undefined || node.state !== "READY" || (node.type !== "AGENT_TASK" && node.type !== "SYNTHESIS")) {
    throw new ExecutionContractError(taskCode, "execution task node is not ready for a packet");
  }
  validateContextArtifacts(contextRefs, current, node);

  return {
    packetVersion: "2.0",
    runId: envelope.runId,
    taskId: executionDigest({ runId: envelope.runId, nodeId, graphRevision: current.graphRevision }),
    nodeId,
    envelopeHash: envelope.envelopeHash,
    graphRevision: current.graphRevision,
    objective: node.objective,
    scope: [...node.scope],
    prohibitedActions: [...node.prohibitedActions],
    contextRefs: structuredClone(contextRefs),
    sourceIds: [...node.sourceIds],
    toolScope: [...node.toolScope],
    expectedOutput: "RESULT_ENVELOPE_V2",
    acceptanceCriterionIds: [...node.acceptanceCriterionIds],
    budget: structuredClone(envelope.budget),
    stopConditions: [...envelope.stopConditions],
  };
}

export function buildExecutionResultTemplate(packet: ExecutionTaskPacket): ExecutionResultEnvelope {
  return {
    resultVersion: "2.0",
    runId: packet.runId,
    taskId: packet.taskId,
    nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash,
    graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION",
    reasonCode: null,
    summary: "Replace this template text with a non-empty scoped summary.",
    claims: [],
    artifactRefs: [],
    evidenceRefs: [],
    unknowns: [],
    conflicts: [],
    followupRequest: null,
    observedLimits: [],
  };
}

export function parseExecutionResult(value: unknown, maxResultBytes: number): ExecutionResultEnvelope {
  const record = plainRecord(value, resultFieldsCode, "execution result must be a plain object");
  exactKeys(record, ["resultVersion", "runId", "taskId", "nodeId", "envelopeHash", "graphRevision", "status", "reasonCode", "summary", "claims", "artifactRefs", "evidenceRefs", "unknowns", "conflicts", "followupRequest", "observedLimits"], resultFieldsCode, "execution result fields are invalid");
  const status = literal(record.status, ["READY_FOR_VALIDATION", "STOPPED", "UNKNOWN"], resultFieldsCode, "execution result status is invalid");
  const parsed = {
    resultVersion: literal(record.resultVersion, ["2.0"], resultFieldsCode, "execution result version is invalid"),
    runId: identifierValue(record.runId, resultFieldsCode, "execution result run identifier is invalid"),
    taskId: hashValue(record.taskId, resultFieldsCode, "execution result task identity is invalid"),
    nodeId: identifierValue(record.nodeId, resultFieldsCode, "execution result node identifier is invalid"),
    envelopeHash: hashValue(record.envelopeHash, resultFieldsCode, "execution result envelope identity is invalid"),
    graphRevision: positiveInteger(record.graphRevision, resultFieldsCode, "execution result graph revision is invalid"),
    status,
    reasonCode: resultReasonCode(status, record.reasonCode),
    summary: nonEmptyString(record.summary, resultFieldsCode, "execution result summary is invalid"),
    claims: claimsValue(record.claims),
    artifactRefs: artifactRefsValue(record.artifactRefs),
    evidenceRefs: evidenceRefsValue(record.evidenceRefs),
    unknowns: stringList(record.unknowns, resultFieldsCode, "execution result unknowns are invalid", false),
    conflicts: stringList(record.conflicts, resultFieldsCode, "execution result conflicts are invalid", false),
    followupRequest: followupValue(record.followupRequest),
    observedLimits: stringList(record.observedLimits, resultFieldsCode, "execution result observed limits are invalid", false),
  };
  assertSafeResultContent(parsed);
  const byteLength = Buffer.byteLength(canonicalExecutionJson(parsed), "utf8");
  if (!Number.isSafeInteger(maxResultBytes) || maxResultBytes <= 0 || byteLength > maxResultBytes) {
    throw new ExecutionContractError(resultSizeCode, "execution result exceeds its byte budget");
  }
  return parsed;
}

export function routeExecutionResultStatus(
  status: ExecutionResultEnvelope["status"],
  nodeRequired: boolean,
  nodeState: ExecutionNodeState,
  runState: ExecutionRunState,
): ExecutionTransitionDecision {
  if (status === "READY_FOR_VALIDATION") {
    throw new ExecutionContractError("OPERATOR_PROTOCOL_VIOLATION", "ready-for-validation results use the evidence admission path");
  }
  return decideExecutionTransition({
    reasonCode: status === "STOPPED" ? "RESULT_STATUS_STOPPED" : "RESULT_STATUS_UNKNOWN",
    nodeRequired,
    nodeState,
    runState,
  });
}

function resultReasonCode(
  status: ExecutionResultEnvelope["status"],
  value: unknown,
): ExecutionResultEnvelope["reasonCode"] {
  if (status === "READY_FOR_VALIDATION") {
    if (value !== null) throw new ExecutionContractError(resultFieldsCode, "READY_FOR_VALIDATION execution result requires a null reason code");
    return null;
  }
  const expected = status === "STOPPED" ? "RESULT_STATUS_STOPPED" : "RESULT_STATUS_UNKNOWN";
  if (value === null) throw new ExecutionContractError(resultFieldsCode, `${expected} is required for the execution result status`);
  const parsed = parseExecutionReasonCode(value);
  if (parsed !== expected) throw new ExecutionContractError(resultFieldsCode, `${expected} is required for the execution result status`);
  return parsed;
}

export function validateResultForNode(
  result: ExecutionResultEnvelope,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  nodeId: string,
): ExecutionResultEnvelope {
  const current = validateExecutionGraph(graph, envelope);
  const node = current.nodes.find((entry) => entry.nodeId === nodeId);
  if (node === undefined) throw new ExecutionContractError(resultForeignCode, "execution result node is unknown");
  const expectedTaskId = executionDigest({ runId: envelope.runId, nodeId, graphRevision: current.graphRevision });
  if (result.runId !== envelope.runId || result.nodeId !== nodeId || result.envelopeHash !== envelope.envelopeHash || result.taskId !== expectedTaskId) {
    throw new ExecutionContractError(resultForeignCode, "execution result does not belong to this node");
  }
  if (result.graphRevision !== current.graphRevision) throw new ExecutionContractError(resultStaleCode, "execution result graph revision is stale");
  validateEvidence(result.evidenceRefs, envelope, node);
  validateClaims(result.claims, result.evidenceRefs, result.conflicts, envelope, node);
  validateFollowup(result.followupRequest, node);
  return result;
}

function validateContextArtifacts(contextRefs: readonly ExecutionArtifactRef[], graph: ExecutionGraph, node: ExecutionNode): void {
  const predecessors = new Set(graph.edges.filter((edge) => edge.toNodeId === node.nodeId).map((edge) => edge.fromNodeId));
  const artifactIds = new Set<string>();
  for (const artifact of contextRefs) {
    if (artifact.nodeId === null || !predecessors.has(artifact.nodeId) || graph.nodes.find((entry) => entry.nodeId === artifact.nodeId)?.state !== "SUCCEEDED" || artifactIds.has(artifact.artifactId)) {
      throw new ExecutionContractError(taskCode, "execution task context artifact is invalid");
    }
    validateArtifactRef(artifact, taskCode, "execution task context artifact is invalid");
    artifactIds.add(artifact.artifactId);
  }
}

function validateEvidence(evidenceRefs: readonly ExecutionEvidenceRef[], envelope: ExecutionEnvelope, node: ExecutionNode): void {
  const evidenceIds = new Set<string>();
  for (const evidence of evidenceRefs) {
    if (evidenceIds.has(evidence.evidenceId)) throw new ExecutionContractError(resultEvidenceCode, "execution evidence identifiers must be unique");
    evidenceIds.add(evidence.evidenceId);
    if (!envelope.sources.some((source) => source.sourceId === evidence.sourceId && source.sourceRevision === evidence.sourceRevision) || !envelope.requiredEvidenceKinds.includes(evidence.kind)) {
      throw new ExecutionContractError(resultEvidenceCode, "execution evidence source is invalid");
    }
    if (evidence.kind === "REPOSITORY_FILE") {
      if (!node.scope.some((scope) => withinScope(evidence.locator.path, scope))) {
        throw new ExecutionContractError(resultScopeCode, "repository evidence path exceeds node scope");
      }
      continue;
    }
    if (evidence.kind === "ARTIFACT" && evidence.locator.artifactId.trim() === "") {
      throw new ExecutionContractError(resultEvidenceCode, "artifact evidence locator is invalid");
    }
    if (evidence.kind === "COMMAND_OUTPUT" && evidence.locator.commandId.trim() === "") {
      throw new ExecutionContractError(resultEvidenceCode, "command evidence locator is invalid");
    }
  }
}

function validateClaims(
  claims: readonly ExecutionClaim[],
  evidenceRefs: readonly ExecutionEvidenceRef[],
  conflicts: readonly string[],
  envelope: ExecutionEnvelope,
  node: ExecutionNode,
): void {
  const claimIds = new Set<string>();
  const evidenceIds = new Set(evidenceRefs.map((evidence) => evidence.evidenceId));
  for (const claim of claims) {
    if (claimIds.has(claim.claimId)) throw new ExecutionContractError(resultEvidenceCode, "execution claim identifiers must be unique");
    claimIds.add(claim.claimId);
    if (!node.acceptanceCriterionIds.includes(claim.criterionId) || !envelope.acceptanceCriteria.some((criterion) => criterion.criterionId === claim.criterionId)) {
      throw new ExecutionContractError(resultEvidenceCode, "execution claim criterion is invalid");
    }
    if (claim.state === "SUPPORTED" && (claim.evidenceRefs.length === 0 || claim.evidenceRefs.some((reference) => !evidenceIds.has(reference)))) {
      throw new ExecutionContractError(resultEvidenceCode, "supported execution claim lacks accepted evidence");
    }
    if (claim.state === "UNKNOWN" && claim.evidenceRefs.length > 0) throw new ExecutionContractError(resultEvidenceCode, "unknown execution claim cannot cite evidence as proof");
    if (claim.state === "CONFLICTED" && conflicts.length === 0) throw new ExecutionContractError(resultEvidenceCode, "conflicted execution claim lacks a conflict record");
  }
}

function validateFollowup(value: ExecutionFollowupRequest | null, node: ExecutionNode): void {
  if (value === null) return;
  if (value.proposedScope.some((scope) => !node.scope.some((nodeScope) => withinScope(scope, nodeScope)))) {
    throw new ExecutionContractError(resultScopeCode, "execution follow-up scope exceeds node scope");
  }
}

function claimsValue(value: unknown): readonly ExecutionClaim[] {
  if (!Array.isArray(value)) throw new ExecutionContractError(resultFieldsCode, "execution result claims must be a list");
  return value.map((entry) => {
    const record = plainRecord(entry, resultFieldsCode, "execution claim must be a plain object");
    exactKeys(record, ["claimId", "criterionId", "statement", "state", "evidenceRefs"], resultFieldsCode, "execution claim fields are invalid");
    return {
      claimId: identifierValue(record.claimId, resultFieldsCode, "execution claim identifier is invalid"),
      criterionId: identifierValue(record.criterionId, resultFieldsCode, "execution claim criterion is invalid"),
      statement: nonEmptyString(record.statement, resultFieldsCode, "execution claim statement is invalid"),
      state: literal(record.state, ["SUPPORTED", "CONFLICTED", "UNKNOWN"], resultFieldsCode, "execution claim state is invalid"),
      evidenceRefs: stringList(record.evidenceRefs, resultFieldsCode, "execution claim evidence references are invalid", false),
    };
  });
}

function artifactRefsValue(value: unknown): readonly ExecutionArtifactRef[] {
  if (!Array.isArray(value)) throw new ExecutionContractError(resultFieldsCode, "execution result artifact references must be a list");
  const artifactIds = new Set<string>();
  return value.map((entry) => {
    const artifact = artifactRefValue(entry, resultFieldsCode, "execution artifact reference is invalid");
    if (artifactIds.has(artifact.artifactId)) throw new ExecutionContractError(resultFieldsCode, "execution artifact identifiers must be unique");
    artifactIds.add(artifact.artifactId);
    return artifact;
  });
}

function evidenceRefsValue(value: unknown): readonly ExecutionEvidenceRef[] {
  if (!Array.isArray(value)) throw new ExecutionContractError(resultFieldsCode, "execution evidence references must be a list");
  return value.map((entry) => evidenceRefValue(entry));
}

function evidenceRefValue(value: unknown): ExecutionEvidenceRef {
  const record = plainRecord(value, resultFieldsCode, "execution evidence must be a plain object");
  exactKeys(record, ["evidenceId", "kind", "sourceId", "sourceRevision", "locator", "sha256"], resultFieldsCode, "execution evidence fields are invalid");
  const kind = literal(record.kind, ["REPOSITORY_FILE", "COMMAND_OUTPUT", "ARTIFACT"], resultFieldsCode, "execution evidence kind is invalid");
  const common = {
    evidenceId: identifierValue(record.evidenceId, resultFieldsCode, "execution evidence identifier is invalid"),
    kind,
    sourceId: identifierValue(record.sourceId, resultFieldsCode, "execution evidence source identifier is invalid"),
    sourceRevision: revisionValue(record.sourceRevision, resultFieldsCode, "execution evidence source revision is invalid"),
  };
  if (kind === "REPOSITORY_FILE") {
    const locator = repositoryLocator(record.locator);
    const sha256 = nullableHash(record.sha256, resultFieldsCode, "repository evidence hash is invalid");
    return { ...common, kind, locator, sha256 };
  }
  if (kind === "COMMAND_OUTPUT") {
    return { ...common, kind, locator: commandLocator(record.locator), sha256: hashValue(record.sha256, resultFieldsCode, "command evidence hash is invalid") };
  }
  return { ...common, kind, locator: artifactLocator(record.locator), sha256: hashValue(record.sha256, resultFieldsCode, "artifact evidence hash is invalid") };
}

function repositoryLocator(value: unknown): { path: string; lineStart: number; lineEnd: number } {
  const record = plainRecord(value, resultFieldsCode, "repository evidence locator must be a plain object");
  exactKeys(record, ["path", "lineStart", "lineEnd"], resultFieldsCode, "repository evidence locator fields are invalid");
  const path = relativePath(record.path, resultFieldsCode, "repository evidence path is invalid");
  const lineStart = positiveInteger(record.lineStart, resultFieldsCode, "repository evidence line start is invalid");
  const lineEnd = positiveInteger(record.lineEnd, resultFieldsCode, "repository evidence line end is invalid");
  if (lineEnd < lineStart) throw new ExecutionContractError(resultFieldsCode, "repository evidence line range is invalid");
  return { path, lineStart, lineEnd };
}

function commandLocator(value: unknown): { commandId: string; outputArtifactId: string } {
  const record = plainRecord(value, resultFieldsCode, "command evidence locator must be a plain object");
  exactKeys(record, ["commandId", "outputArtifactId"], resultFieldsCode, "command evidence locator fields are invalid");
  return {
    commandId: identifierValue(record.commandId, resultFieldsCode, "command evidence identifier is invalid"),
    outputArtifactId: identifierValue(record.outputArtifactId, resultFieldsCode, "command evidence artifact identifier is invalid"),
  };
}

function artifactLocator(value: unknown): { artifactId: string } {
  const record = plainRecord(value, resultFieldsCode, "artifact evidence locator must be a plain object");
  exactKeys(record, ["artifactId"], resultFieldsCode, "artifact evidence locator fields are invalid");
  return { artifactId: identifierValue(record.artifactId, resultFieldsCode, "artifact evidence identifier is invalid") };
}

function followupValue(value: unknown): ExecutionFollowupRequest | null {
  if (value === null) return null;
  const record = plainRecord(value, resultFieldsCode, "execution follow-up must be a plain object");
  exactKeys(record, ["reason", "objective", "requiredEvidence", "proposedScope"], resultFieldsCode, "execution follow-up fields are invalid");
  return {
    reason: nonEmptyString(record.reason, resultFieldsCode, "execution follow-up reason is invalid"),
    objective: nonEmptyString(record.objective, resultFieldsCode, "execution follow-up objective is invalid"),
    requiredEvidence: stringList(record.requiredEvidence, resultFieldsCode, "execution follow-up evidence is invalid", true),
    proposedScope: stringList(record.proposedScope, resultFieldsCode, "execution follow-up scope is invalid", true),
  };
}

function artifactRefValue(value: unknown, code: string, message: string): ExecutionArtifactRef {
  const record = plainRecord(value, code, message);
  exactKeys(record, ["artifactId", "nodeId", "sha256"], code, message);
  return {
    artifactId: identifierValue(record.artifactId, code, message),
    nodeId: record.nodeId === null ? null : identifierValue(record.nodeId, code, message),
    sha256: hashValue(record.sha256, code, message),
  };
}

function validateArtifactRef(value: ExecutionArtifactRef, code: string, message: string): void {
  artifactRefValue(value, code, message);
}

function assertSafeResultContent(value: unknown): void {
  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      if (forbiddenResultValuePatterns.some((pattern) => pattern.test(current))) {
        throw new ExecutionContractError(resultContentCode, "execution result contains forbidden content");
      }
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (current !== null && typeof current === "object") {
      for (const item of Object.values(current)) visit(item);
    }
  };
  visit(value);
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

function revisionValue(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !revisionPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function hashValue(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !hashPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function nullableHash(value: unknown, code: string, message: string): string | null {
  if (value === null) return null;
  return hashValue(value, code, message);
}

function nonEmptyString(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ExecutionContractError(code, message);
  return value;
}

function positiveInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new ExecutionContractError(code, message);
  return value;
}

function stringList(value: unknown, code: string, message: string, required: boolean): readonly string[] {
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

function relativePath(value: unknown, code: string, message: string): string {
  const path = nonEmptyString(value, code, message);
  if (path.includes("\\") || path.startsWith("/") || path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new ExecutionContractError(code, message);
  }
  return path;
}

function withinScope(path: string, scope: string): boolean {
  return path === scope || path.startsWith(`${scope}/`);
}

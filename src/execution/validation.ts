import { executionDigest } from "./identity.js";
import { ExecutionContractError } from "./types.js";
import type {
  AcceptanceCriterion,
  EvidenceKind,
  ExecutionAuthority,
  ExecutionBudget,
  ExecutionEnvelope,
  ExecutionEnvelopeInput,
  ExecutionFinalState,
  ExecutionGraphLimits,
  ExecutionNodeType,
  ExecutionRetention,
  ExecutionSource,
  ExecutionToolCapability,
} from "./types.js";

const inputKeys = [
  "contractVersion",
  "runId",
  "goal",
  "scope",
  "nonGoals",
  "acceptanceCriteria",
  "sourceRevision",
  "retention",
  "allowedNodeTypes",
  "authority",
  "toolScope",
  "sources",
  "graphLimits",
  "budget",
  "stopConditions",
  "requiredEvidenceKinds",
  "allowedFinalStates",
] as const;
const envelopeKeys = [...inputKeys, "envelopeHash"] as const;
const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/;
const revisionPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const hashPattern = /^[a-f0-9]{64}$/;
const forbiddenContentPattern = /(?:^|[\s:=])(?:transcript|prompt|secret|access[_-]?token|refresh[_-]?token|credential|cookie|password|api[_-]?key|authorization|reasoning|token)(?:$|[\s:=])/i;

const codes = {
  fields: "EXECUTION_ENVELOPE_FIELDS_INVALID",
  content: "EXECUTION_CONTENT_FORBIDDEN",
  authority: "EXECUTION_AUTHORITY_INVALID",
  source: "EXECUTION_SOURCE_INVALID",
  limits: "EXECUTION_LIMITS_INVALID",
  hash: "EXECUTION_ENVELOPE_HASH_MISMATCH",
} as const;

export function createExecutionEnvelope(input: ExecutionEnvelopeInput): ExecutionEnvelope {
  const validated = parseEnvelopeInput(input);
  const copied = structuredClone(validated);

  return {
    ...copied,
    envelopeHash: executionDigest(copied),
  };
}

export function parseExecutionEnvelope(value: unknown): ExecutionEnvelope {
  const record = plainRecord(value, codes.fields, "execution envelope must be a plain object");
  exactKeys(record, envelopeKeys, codes.fields, "execution envelope fields are invalid");
  const envelopeHash = hashValue(record.envelopeHash, codes.hash, "execution envelope hash is invalid");
  const input = omitEnvelopeHash(record);
  const validated = parseEnvelopeInput(input);
  const expectedHash = executionDigest(validated);
  if (envelopeHash !== expectedHash) throw new ExecutionContractError(codes.hash, "execution envelope hash does not match its content");

  return {
    ...structuredClone(validated),
    envelopeHash,
  };
}

export function assertSafeExecutionContent(value: unknown): void {
  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      if (forbiddenContentPattern.test(current)) throw new ExecutionContractError(codes.content, "execution content contains forbidden material");
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (current !== null && typeof current === "object") {
      for (const key of Reflect.ownKeys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor === undefined || !("value" in descriptor)) {
          throw new ExecutionContractError(codes.content, "execution content cannot contain accessors");
        }
        visit(descriptor.value);
      }
    }
  };

  visit(value);
}

function parseEnvelopeInput(value: unknown): ExecutionEnvelopeInput {
  const record = plainRecord(value, codes.fields, "execution envelope input must be a plain object");
  exactKeys(record, inputKeys, codes.fields, "execution envelope input fields are invalid");
  assertSafeExecutionContent(record);

  const sourceRevision = revisionValue(record.sourceRevision, codes.source, "source revision is invalid");
  const sources = sourcesValue(record.sources, sourceRevision);
  const authority = authorityValue(record.authority);
  const graphLimits = graphLimitsValue(record.graphLimits);
  const budget = budgetValue(record.budget, graphLimits);

  return {
    contractVersion: literal(record.contractVersion, ["1.0"], codes.fields, "contract version is invalid"),
    runId: identifierValue(record.runId, codes.fields, "run identifier is invalid"),
    goal: nonEmptyString(record.goal, codes.fields, "goal is invalid"),
    scope: stringList(record.scope, codes.fields, "scope is invalid", true),
    nonGoals: stringList(record.nonGoals, codes.fields, "non-goals are invalid", false),
    acceptanceCriteria: acceptanceCriteriaValue(record.acceptanceCriteria),
    sourceRevision,
    retention: literal(record.retention, ["EPHEMERAL", "PERSONAL", "TEAM"], codes.fields, "retention is invalid"),
    allowedNodeTypes: literalList(record.allowedNodeTypes, ["AGENT_TASK", "DETERMINISTIC_CHECK", "HUMAN_CHECKPOINT", "SYNTHESIS"], codes.fields, "allowed node types are invalid"),
    authority,
    toolScope: literalList(record.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"], codes.fields, "tool scope is invalid"),
    sources,
    graphLimits,
    budget,
    stopConditions: stringList(record.stopConditions, codes.fields, "stop conditions are invalid", true),
    requiredEvidenceKinds: literalList(record.requiredEvidenceKinds, ["REPOSITORY_FILE", "COMMAND_OUTPUT", "ARTIFACT"], codes.fields, "required evidence kinds are invalid"),
    allowedFinalStates: literalList(record.allowedFinalStates, ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"], codes.fields, "allowed final states are invalid"),
  };
}

function omitEnvelopeHash(record: Record<string, unknown>): Record<string, unknown> {
  const { envelopeHash: _envelopeHash, ...input } = record;
  return input;
}

function authorityValue(value: unknown): ExecutionAuthority {
  const record = plainRecord(value, codes.authority, "execution authority must be a plain object");
  exactKeys(record, ["repositoryWrite", "externalWrite", "agentExecution"], codes.authority, "execution authority fields are invalid");
  if (record.repositoryWrite !== "NONE" || record.externalWrite !== "NONE" || record.agentExecution !== "CODEX_NATIVE_ONLY") {
    throw new ExecutionContractError(codes.authority, "execution authority exceeds the read-only contract");
  }
  return { repositoryWrite: "NONE", externalWrite: "NONE", agentExecution: "CODEX_NATIVE_ONLY" };
}

function sourcesValue(value: unknown, sourceRevision: string): readonly ExecutionSource[] {
  if (!Array.isArray(value) || value.length === 0) throw new ExecutionContractError(codes.source, "sources must be a non-empty list");
  const sourceIds = new Set<string>();
  return value.map((entry) => {
    const record = plainRecord(entry, codes.source, "source must be a plain object");
    exactKeys(record, ["sourceId", "kind", "locator", "sourceRevision"], codes.source, "source fields are invalid");
    const sourceId = identifierValue(record.sourceId, codes.source, "source identifier is invalid");
    if (sourceIds.has(sourceId)) throw new ExecutionContractError(codes.source, "source identifiers must be unique");
    sourceIds.add(sourceId);
    const entryRevision = revisionValue(record.sourceRevision, codes.source, "source revision is invalid");
    if (entryRevision !== sourceRevision) throw new ExecutionContractError(codes.source, "source revision does not match the envelope");
    if (record.kind !== "REPOSITORY") throw new ExecutionContractError(codes.source, "source kind is invalid");
    return {
      sourceId,
      kind: "REPOSITORY",
      locator: nonEmptyString(record.locator, codes.source, "source locator is invalid"),
      sourceRevision: entryRevision,
    };
  });
}

function acceptanceCriteriaValue(value: unknown): readonly AcceptanceCriterion[] {
  if (!Array.isArray(value) || value.length === 0) throw new ExecutionContractError(codes.fields, "acceptance criteria must be a non-empty list");
  const identifiers = new Set<string>();
  return value.map((entry) => {
    const record = plainRecord(entry, codes.fields, "acceptance criterion must be a plain object");
    exactKeys(record, ["criterionId", "statement"], codes.fields, "acceptance criterion fields are invalid");
    const criterionId = identifierValue(record.criterionId, codes.fields, "acceptance criterion identifier is invalid");
    if (identifiers.has(criterionId)) throw new ExecutionContractError(codes.fields, "acceptance criterion identifiers must be unique");
    identifiers.add(criterionId);
    return { criterionId, statement: nonEmptyString(record.statement, codes.fields, "acceptance criterion statement is invalid") };
  });
}

function graphLimitsValue(value: unknown): ExecutionGraphLimits {
  const record = plainRecord(value, codes.limits, "graph limits must be a plain object");
  exactKeys(record, ["maxNodes", "maxParallel", "maxDepth", "maxRepairNodes", "maxCheckerRepairCycles"], codes.limits, "graph limit fields are invalid");
  const maxNodes = positiveInteger(record.maxNodes, codes.limits, "maximum node count is invalid");
  const maxParallel = positiveInteger(record.maxParallel, codes.limits, "maximum parallel count is invalid");
  const maxDepth = positiveInteger(record.maxDepth, codes.limits, "maximum depth is invalid");
  const maxRepairNodes = nonNegativeInteger(record.maxRepairNodes, codes.limits, "maximum repair count is invalid");
  const maxCheckerRepairCycles = nonNegativeInteger(record.maxCheckerRepairCycles, codes.limits, "maximum checker repair cycle count is invalid");
  if (maxParallel > maxNodes || maxDepth > maxNodes || maxRepairNodes > maxNodes || maxCheckerRepairCycles > maxRepairNodes) {
    throw new ExecutionContractError(codes.limits, "graph limits are internally inconsistent");
  }
  return { maxNodes, maxParallel, maxDepth, maxRepairNodes, maxCheckerRepairCycles };
}

function budgetValue(value: unknown, graphLimits: ExecutionGraphLimits): ExecutionBudget {
  const record = plainRecord(value, codes.limits, "execution budget must be a plain object");
  exactKeys(record, ["maxDispatches", "maxResultBytes", "maxWallClockMs"], codes.limits, "execution budget fields are invalid");
  const maxDispatches = nonNegativeInteger(record.maxDispatches, codes.limits, "maximum dispatch count is invalid");
  if (maxDispatches > graphLimits.maxNodes) throw new ExecutionContractError(codes.limits, "maximum dispatch count exceeds maximum node count");
  return {
    maxDispatches,
    maxResultBytes: positiveInteger(record.maxResultBytes, codes.limits, "maximum result size is invalid"),
    maxWallClockMs: positiveInteger(record.maxWallClockMs, codes.limits, "maximum wall-clock time is invalid"),
  };
}

function literal<T extends string>(value: unknown, values: readonly T[], code: string, message: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new ExecutionContractError(code, message);
  return value as T;
}

function literalList<T extends string>(value: unknown, values: readonly T[], code: string, message: string): readonly T[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || !values.includes(entry as T)) || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value as readonly T[];
}

function stringList(value: unknown, code: string, message: string, required: boolean): readonly string[] {
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
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

function nonEmptyString(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ExecutionContractError(code, message);
  return value;
}

function positiveInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new ExecutionContractError(code, message);
  return value;
}

function nonNegativeInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ExecutionContractError(code, message);
  return value;
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

import { assertAllowlistedOperation } from "./allowlist.js";
import { parseResolvedTarget, type ResolvedTarget } from "./identity.js";

const problemKinds = ["wrong_tenant", "wrong_project", "wrong_space", "wrong_repository", "wrong_target", "unverifiable_authority", "unverifiable_scope", "ambiguous_mapping", "deletion", "permission_change", "workflow_change", "capability_proof_failure", "unknown_external_completion", "stale_read_back", "over_broad_field", "backward_transition", "forbidden_operation", "bounded_validation"] as const;
const hardStopProblemKinds = new Set<string>(["wrong_tenant", "wrong_project", "wrong_space", "wrong_repository", "wrong_target", "unverifiable_authority", "unverifiable_scope", "ambiguous_mapping", "deletion", "permission_change", "workflow_change", "capability_proof_failure", "unknown_external_completion", "forbidden_operation"]);
const authorizationRecords = new WeakMap<object, AuthorizationRecord>();

export type SyncProblemKind = typeof problemKinds[number];

export interface BoundedScope {
  target: { jiraTenantId: string; jiraProjectId: string; confluenceSpaceId: string; githubRepositoryId: string };
  operation: string;
  fields: string[];
  transition: { from: string; to: string } | null;
}

export interface SyncStop {
  kind: "SYNC STOP";
  situation: string;
  target: ResolvedTarget;
  detectedProblem: string;
  evidence: string[];
  expectedImpact: string;
  remainsUnchanged: string;
  risk: string;
  recommendation: string;
  problemKind: SyncProblemKind;
  operationAllowed: boolean;
  nonDestructive: boolean;
  authorityVerified: boolean;
  scopeVerified: boolean;
  allowlistVerified: boolean;
  decisionOptions: ("Continue" | "Stop")[];
  hardStop: boolean;
  permittedScope: BoundedScope;
  readBackPlan: string;
}

export interface ContinueDecision {
  scope: BoundedScope;
  compensatingControl: string;
  expiresAt: string;
  actor: string;
}

export interface BoundedContinuation extends ContinueDecision {
  readBackPlan: string;
}

interface AuthorizationRecord {
  boundary: BoundarySnapshot;
  actorScope: string;
  capabilityName: string;
}

interface BoundarySnapshot {
  problemKind: SyncProblemKind;
  operationAllowed: boolean;
  nonDestructive: boolean;
  authorityVerified: boolean;
  scopeVerified: boolean;
  allowlistVerified: boolean;
  hardStop: boolean;
  decisionOptions: ("Continue" | "Stop")[];
  target: ResolvedTarget;
  permittedScope: BoundedScope;
  readBackPlan: string;
}

interface StopInput {
  situation: string;
  target: ResolvedTarget;
  detectedProblem: string;
  evidence: string[];
  expectedImpact: string;
  remainsUnchanged: string;
  risk: string;
  recommendation: string;
  problemKind: SyncProblemKind;
  nonDestructive: boolean;
  authorityVerified: boolean;
  scopeVerified: boolean;
  permittedScope: BoundedScope;
  readBackPlan: string;
  allowlist: AllowlistAuthorization;
}

interface AllowlistAuthorization {
  input: Record<string, unknown>;
  target: ResolvedTarget;
  scope: BoundedScope;
  actorScope: string;
  capabilityName: string;
}

export function createSyncStop(input: unknown): SyncStop {
  const parsed = parseStopInput(input);
  const decision = assertAllowlistedOperation(parsed.allowlist.input);
  const allowlistVerified = decision.allowed && sameTarget(parsed.target, parsed.allowlist.target) && sameScope(parsed.permittedScope, parsed.allowlist.scope);
  const { allowlist, ...safeStopInput } = parsed;
  const stop = buildStop({
    ...safeStopInput,
    operationAllowed: decision.allowed,
    allowlistVerified,
  });
  if (allowlistVerified) {
    authorizationRecords.set(stop, {
      boundary: snapshotBoundary(stop),
      actorScope: parsed.allowlist.actorScope,
      capabilityName: parsed.allowlist.capabilityName,
    });
  }
  return stop;
}

export function applyContinueDecision(stop: unknown, decision: unknown): BoundedContinuation {
  const parsedStop = parseSyncStop(stop);
  if (parsedStop.hardStop) {
    throw new Error("Continue is unavailable for a hard stop.");
  }
  if (stop === null || typeof stop !== "object" || authorizationRecords.get(stop) === undefined) {
    throw new Error("Continue requires an internally retained allowlist authorization.");
  }
  const authorization = authorizationRecords.get(stop)!;
  if (!sameBoundary(parsedStop, authorization.boundary)) {
    throw new Error("Continue authorization boundary does not match the retained stop.");
  }
  const parsedDecision = parseContinueDecision(decision);
  if (!sameScope(parsedStop.permittedScope, parsedDecision.scope)) {
    throw new Error("Continue decision scope must exactly match the permitted scope.");
  }
  return { ...parsedDecision, readBackPlan: parsedStop.readBackPlan };
}

function buildStop(input: Omit<SyncStop, "kind" | "decisionOptions" | "hardStop">): SyncStop {
  const hardStop = computeHardStop(input);
  return { ...input, kind: "SYNC STOP", decisionOptions: hardStop ? ["Stop"] : ["Continue", "Stop"], hardStop };
}

function computeHardStop(stop: Pick<SyncStop, "problemKind" | "operationAllowed" | "nonDestructive" | "authorityVerified" | "scopeVerified" | "allowlistVerified">): boolean {
  return hardStopProblemKinds.has(stop.problemKind) || !stop.operationAllowed || !stop.nonDestructive || !stop.authorityVerified || !stop.scopeVerified || !stop.allowlistVerified;
}

function parseStopInput(value: unknown): StopInput {
  const record = assertRecord(value, "Sync stop input", ["situation", "target", "detectedProblem", "evidence", "expectedImpact", "remainsUnchanged", "risk", "recommendation", "problemKind", "nonDestructive", "authorityVerified", "scopeVerified", "permittedScope", "readBackPlan", "allowlist"]);
  const target = parseTarget(record.target, "Sync stop input target");
  const permittedScope = parseScope(record.permittedScope, "Sync stop input permittedScope");
  if (!scopeMatchesTarget(permittedScope, target)) {
    throw new Error("Sync stop input permittedScope must bind exactly to the target stable IDs.");
  }
  return {
    situation: stringField(record, "situation", "Sync stop input"),
    target,
    detectedProblem: stringField(record, "detectedProblem", "Sync stop input"),
    evidence: parseEvidence(record.evidence, "Sync stop input evidence"),
    expectedImpact: stringField(record, "expectedImpact", "Sync stop input"),
    remainsUnchanged: stringField(record, "remainsUnchanged", "Sync stop input"),
    risk: stringField(record, "risk", "Sync stop input"),
    recommendation: stringField(record, "recommendation", "Sync stop input"),
    problemKind: parseProblemKind(record.problemKind, "Sync stop input"),
    nonDestructive: booleanField(record, "nonDestructive", "Sync stop input"),
    authorityVerified: booleanField(record, "authorityVerified", "Sync stop input"),
    scopeVerified: booleanField(record, "scopeVerified", "Sync stop input"),
    permittedScope,
    readBackPlan: stringField(record, "readBackPlan", "Sync stop input"),
    allowlist: parseAllowlistAuthorization(record.allowlist),
  };
}

function parseSyncStop(value: unknown): SyncStop {
  const record = assertRecord(value, "Sync stop", ["kind", "situation", "target", "detectedProblem", "evidence", "expectedImpact", "remainsUnchanged", "risk", "recommendation", "problemKind", "operationAllowed", "nonDestructive", "authorityVerified", "scopeVerified", "allowlistVerified", "decisionOptions", "hardStop", "permittedScope", "readBackPlan"]);
  if (record.kind !== "SYNC STOP" || typeof record.hardStop !== "boolean" || !Array.isArray(record.decisionOptions) || record.decisionOptions.some((option) => option !== "Continue" && option !== "Stop")) {
    throw new Error("Sync stop must contain valid structured stop fields.");
  }
  const stop = buildStop({
    situation: stringField(record, "situation", "Sync stop"),
    target: parseTarget(record.target, "Sync stop target"),
    detectedProblem: stringField(record, "detectedProblem", "Sync stop"),
    evidence: parseEvidence(record.evidence, "Sync stop evidence"),
    expectedImpact: stringField(record, "expectedImpact", "Sync stop"),
    remainsUnchanged: stringField(record, "remainsUnchanged", "Sync stop"),
    risk: stringField(record, "risk", "Sync stop"),
    recommendation: stringField(record, "recommendation", "Sync stop"),
    problemKind: parseProblemKind(record.problemKind, "Sync stop"),
    operationAllowed: booleanField(record, "operationAllowed", "Sync stop"),
    nonDestructive: booleanField(record, "nonDestructive", "Sync stop"),
    authorityVerified: booleanField(record, "authorityVerified", "Sync stop"),
    scopeVerified: booleanField(record, "scopeVerified", "Sync stop"),
    allowlistVerified: booleanField(record, "allowlistVerified", "Sync stop"),
    permittedScope: parseScope(record.permittedScope, "Sync stop permittedScope"),
    readBackPlan: stringField(record, "readBackPlan", "Sync stop"),
  });
  if (!scopeMatchesTarget(stop.permittedScope, stop.target) || record.hardStop !== stop.hardStop || !sameOptions(record.decisionOptions, stop.decisionOptions)) {
    throw new Error("Sync stop hard-stop boundary does not match its retained safety facts.");
  }
  return stop;
}

function parseAllowlistAuthorization(value: unknown): AllowlistAuthorization {
  const record = assertRecord(value, "Sync stop allowlist", ["operation", "target", "fields", "transition", "actorScope", "capability", "policyRegistry"]);
  const target = parseTarget(record.target, "Sync stop allowlist target");
  const scope = parseScope({ target: stableScopeTarget(target), operation: record.operation, fields: record.fields, transition: record.transition }, "Sync stop allowlist scope");
  const actorScope = exactString(record.actorScope, "Sync stop allowlist actorScope");
  const capability = assertRecord(record.capability, "Sync stop allowlist capability", ["name", "proof"]);
  const capabilityName = exactString(capability.name, "Sync stop allowlist capability name");
  exactString(capability.proof, "Sync stop allowlist capability proof");
  if (!Array.isArray(record.policyRegistry)) {
    throw new Error("Sync stop allowlist policyRegistry must be an explicit configured array.");
  }
  return { input: record, target, scope, actorScope, capabilityName };
}

function parseContinueDecision(value: unknown): ContinueDecision {
  const record = assertRecord(value, "Continue decision", ["scope", "compensatingControl", "expiresAt", "actor"]);
  const scope = parseScope(record.scope, "Continue decision scope");
  const compensatingControl = exactString(record.compensatingControl, "Continue decision compensatingControl");
  const actor = exactString(record.actor, "Continue decision actor");
  const expiresAt = stringField(record, "expiresAt", "Continue decision");
  if (Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
    throw new Error("Continue decision expiresAt must be a future ISO timestamp.");
  }
  return { scope, compensatingControl, expiresAt, actor };
}

function parseScope(value: unknown, label: string): BoundedScope {
  const record = assertRecord(value, label, ["target", "operation", "fields", "transition"]);
  const target = assertRecord(record.target, `${label} target`, ["jiraTenantId", "jiraProjectId", "confluenceSpaceId", "githubRepositoryId"]);
  const scopeTarget = {
    jiraTenantId: exactString(target.jiraTenantId, `${label} target jiraTenantId`),
    jiraProjectId: exactString(target.jiraProjectId, `${label} target jiraProjectId`),
    confluenceSpaceId: exactString(target.confluenceSpaceId, `${label} target confluenceSpaceId`),
    githubRepositoryId: exactString(target.githubRepositoryId, `${label} target githubRepositoryId`),
  };
  const operation = exactString(record.operation, `${label} operation`);
  if (!Array.isArray(record.fields) || record.fields.length === 0) {
    throw new Error(`${label} fields must be a non-empty explicit array.`);
  }
  const fields = record.fields.map((field) => exactString(field, `${label} field`));
  if (new Set(fields).size !== fields.length) {
    throw new Error(`${label} fields must not contain duplicates.`);
  }
  const transition = record.transition === null ? null : parseTransition(record.transition, `${label} transition`);
  return { target: scopeTarget, operation, fields, transition };
}

function parseTransition(value: unknown, label: string): { from: string; to: string } {
  const record = assertRecord(value, label, ["from", "to"]);
  return { from: exactString(record.from, `${label} from`), to: exactString(record.to, `${label} to`) };
}

function parseTarget(value: unknown, label: string): ResolvedTarget {
  try {
    return parseResolvedTarget(value, label);
  } catch {
    throw new Error(`${label} must contain a valid resolved target.`);
  }
}

function parseEvidence(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty string array.`);
  }
  return value.map((evidence) => exactString(evidence, label));
}

function parseProblemKind(value: unknown, label: string): SyncProblemKind {
  if (!problemKinds.includes(value as SyncProblemKind)) {
    throw new Error(`${label} problemKind must use the closed taxonomy.`);
  }
  return value as SyncProblemKind;
}

function stableScopeTarget(target: ResolvedTarget): BoundedScope["target"] {
  return { jiraTenantId: target.jiraTenantId, jiraProjectId: target.jiraProject.id, confluenceSpaceId: target.confluenceSpace.id, githubRepositoryId: target.githubRepository.id };
}

function scopeMatchesTarget(scope: BoundedScope, target: ResolvedTarget): boolean {
  return sameScopeTarget(scope.target, stableScopeTarget(target));
}

function sameScope(first: BoundedScope, second: BoundedScope): boolean {
  return sameScopeTarget(first.target, second.target) && first.operation === second.operation && first.fields.length === second.fields.length && first.fields.every((field, index) => field === second.fields[index]) && first.transition?.from === second.transition?.from && first.transition?.to === second.transition?.to;
}

function sameScopeTarget(first: BoundedScope["target"], second: BoundedScope["target"]): boolean {
  return first.jiraTenantId === second.jiraTenantId && first.jiraProjectId === second.jiraProjectId && first.confluenceSpaceId === second.confluenceSpaceId && first.githubRepositoryId === second.githubRepositoryId;
}

function sameTarget(first: ResolvedTarget, second: ResolvedTarget): boolean {
  return first.tenantUrl === second.tenantUrl && first.jiraTenantId === second.jiraTenantId && first.jiraProject.key === second.jiraProject.key && first.jiraProject.id === second.jiraProject.id && first.confluenceSpace.key === second.confluenceSpace.key && first.confluenceSpace.id === second.confluenceSpace.id && first.githubRepository.owner === second.githubRepository.owner && first.githubRepository.name === second.githubRepository.name && first.githubRepository.id === second.githubRepository.id && first.environment === second.environment && first.allowlistPolicyId === second.allowlistPolicyId && first.policyMutation.mutationsAllowed === second.policyMutation.mutationsAllowed;
}

function sameOptions(value: unknown[], expected: ("Continue" | "Stop")[]): boolean {
  return value.length === expected.length && value.every((option, index) => option === expected[index]);
}

function snapshotBoundary(stop: SyncStop): BoundarySnapshot {
  return {
    problemKind: stop.problemKind,
    operationAllowed: stop.operationAllowed,
    nonDestructive: stop.nonDestructive,
    authorityVerified: stop.authorityVerified,
    scopeVerified: stop.scopeVerified,
    allowlistVerified: stop.allowlistVerified,
    hardStop: stop.hardStop,
    decisionOptions: [...stop.decisionOptions],
    target: cloneTarget(stop.target),
    permittedScope: cloneScope(stop.permittedScope),
    readBackPlan: stop.readBackPlan,
  };
}

function sameBoundary(stop: SyncStop, snapshot: BoundarySnapshot): boolean {
  return stop.problemKind === snapshot.problemKind &&
    stop.operationAllowed === snapshot.operationAllowed &&
    stop.nonDestructive === snapshot.nonDestructive &&
    stop.authorityVerified === snapshot.authorityVerified &&
    stop.scopeVerified === snapshot.scopeVerified &&
    stop.allowlistVerified === snapshot.allowlistVerified &&
    stop.hardStop === snapshot.hardStop &&
    sameOptions(stop.decisionOptions, snapshot.decisionOptions) &&
    sameTarget(stop.target, snapshot.target) &&
    sameScope(stop.permittedScope, snapshot.permittedScope) &&
    stop.readBackPlan === snapshot.readBackPlan;
}

function cloneTarget(target: ResolvedTarget): ResolvedTarget {
  return {
    tenantUrl: target.tenantUrl,
    jiraTenantId: target.jiraTenantId,
    jiraProject: { ...target.jiraProject },
    confluenceSpace: { ...target.confluenceSpace },
    githubRepository: { ...target.githubRepository },
    environment: target.environment,
    allowlistPolicyId: target.allowlistPolicyId,
    policyMutation: { ...target.policyMutation },
  };
}

function cloneScope(scope: BoundedScope): BoundedScope {
  return {
    target: { ...scope.target },
    operation: scope.operation,
    fields: [...scope.fields],
    transition: scope.transition === null ? null : { ...scope.transition },
  };
}

function exactString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (value === "*" || /^global$/i.test(value) || /[?*]/.test(value)) {
    throw new Error(`${label} must not use wildcard or global values.`);
  }
  return value;
}

function stringField(record: Record<string, unknown>, key: string, label: string): string {
  return exactString(record[key], `${label} ${key}`);
}

function booleanField(record: Record<string, unknown>, key: string, label: string): boolean {
  if (typeof record[key] !== "boolean") {
    throw new Error(`${label} ${key} must be boolean.`);
  }
  return record[key] as boolean;
}

function assertRecord(value: unknown, label: string, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actualKeys.length !== expected.length || actualKeys.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} must contain exactly the approved fields.`);
  }
  return value as Record<string, unknown>;
}

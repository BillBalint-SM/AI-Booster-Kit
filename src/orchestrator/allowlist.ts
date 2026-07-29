import { parseResolvedTarget, TargetIdentityValidationError, type ResolvedTarget } from "./identity.js";

const boardLifecycle = ["To Do", "In Progress", "Review", "Ready for Deploy", "Ready for Test", "Testing", "Done"] as const;

export interface CapabilityProof {
  name: string;
  proof: string;
}

interface OperationPolicy {
  name: string;
  mutating: boolean;
}

interface AllowlistPolicy {
  policyId: string;
  target: ResolvedTarget;
  operations: OperationPolicy[];
  allowedFields: string[];
  allowedTransitions: string[];
  allowedActorScopes: string[];
  capabilities: CapabilityProof[];
}

interface AllowlistInput {
  operation: string;
  target: ResolvedTarget;
  fields: string[];
  transition: { from: string; to: string } | null;
  actorScope: string;
  capability: CapabilityProof;
  policyRegistry: AllowlistPolicy[];
}

export interface AllowlistDecision {
  allowed: boolean;
  reasons: string[];
}

export class AllowlistValidationError extends Error {
  public constructor(message: string) { super(message); this.name = "AllowlistValidationError"; }
}

export function assertAllowlistedOperation(input: unknown): AllowlistDecision {
  const request = parseAllowlistInput(input);
  const policy = resolvePolicy(request.target, request.policyRegistry);
  const reasons: string[] = [];
  const operation = policy.operations.find((candidate) => candidate.name === request.operation);

  if (isForbiddenOperation(request.operation)) {
    reasons.push(`forbidden_operation:${request.operation}`);
  }
  if (operation === undefined) {
    reasons.push("undeclared_operation");
  }
  if (operation?.mutating === true && request.target.environment === "production") {
    reasons.push("production_target_mutation");
  }
  if (operation?.mutating === true && !request.target.policyMutation.mutationsAllowed) {
    reasons.push("target_mutation_not_allowed");
  }
  if (!policy.allowedActorScopes.includes(request.actorScope)) {
    reasons.push("actor_scope_not_allowed");
  }
  if (!policy.capabilities.some((candidate) => candidate.name === request.capability.name && candidate.proof === request.capability.proof)) {
    reasons.push("capability_not_proven");
  }
  if (request.fields.length === 0 || request.fields.some((field) => !policy.allowedFields.includes(field))) {
    reasons.push("fields_not_allowlisted");
  }
  if (request.transition !== null && !isAllowedForwardTransition(request.transition, policy.allowedTransitions)) {
    reasons.push("transition_not_allowlisted_forward");
  }
  return { allowed: reasons.length === 0, reasons };
}

function parseAllowlistInput(value: unknown): AllowlistInput {
  const record = assertRecord(value, "Allowlist input", ["operation", "target", "fields", "transition", "actorScope", "capability", "policyRegistry"]);
  assertNonEmptyString(record.operation, "Allowlist input operation");
  assertNonEmptyString(record.actorScope, "Allowlist input actorScope");
  const target = parseTarget(record.target, "Allowlist input target");
  if (!Array.isArray(record.fields) || record.fields.some((field) => typeof field !== "string" || field.trim() === "")) {
    throw new AllowlistValidationError("Allowlist input fields must be a string array.");
  }
  const transition = parseTransition(record.transition, "Allowlist input transition");
  const capability = parseCapability(record.capability, "Allowlist input capability");
  if (!Array.isArray(record.policyRegistry)) {
    throw new AllowlistValidationError("Allowlist input policyRegistry must be an explicit configured array.");
  }
  return {
    operation: record.operation,
    target,
    fields: [...record.fields],
    transition,
    actorScope: record.actorScope,
    capability,
    policyRegistry: record.policyRegistry.map((policy) => parsePolicy(policy)),
  };
}

function resolvePolicy(target: ResolvedTarget, registry: AllowlistPolicy[]): AllowlistPolicy {
  const matches = registry.filter((policy) => policy.policyId === target.allowlistPolicyId);
  if (matches.length === 0) {
    throw new AllowlistValidationError("Allowlist input has a missing configured allowlist policy.");
  }
  if (matches.length !== 1) {
    throw new AllowlistValidationError("Allowlist input has a duplicate configured allowlist policy.");
  }
  const policy = matches[0]!;
  if (!sameTarget(target, policy.target) || policy.target.allowlistPolicyId !== policy.policyId) {
    throw new AllowlistValidationError("Allowlist policy target identity must exactly match the resolved target and policy ID.");
  }
  return policy;
}

function parsePolicy(value: unknown): AllowlistPolicy {
  const record = assertRecord(value, "Allowlist policy", ["policyId", "target", "operations", "allowedFields", "allowedTransitions", "allowedActorScopes", "capabilities"]);
  assertNonEmptyString(record.policyId, "Allowlist policy policyId");
  const target = parseTarget(record.target, "Allowlist policy target");
  if (!Array.isArray(record.operations) || record.operations.length === 0) {
    throw new AllowlistValidationError("Allowlist policy operations must be a non-empty array.");
  }
  const operations = record.operations.map((operation) => parseOperation(operation));
  assertUnique(operations.map((operation) => operation.name), "Allowlist policy operations");
  const allowedFields = parseStringArray(record.allowedFields, "Allowlist policy allowedFields", false);
  const allowedTransitions = parseStringArray(record.allowedTransitions, "Allowlist policy allowedTransitions", false);
  const allowedActorScopes = parseStringArray(record.allowedActorScopes, "Allowlist policy allowedActorScopes", false);
  if (!Array.isArray(record.capabilities) || record.capabilities.length === 0) {
    throw new AllowlistValidationError("Allowlist policy capabilities must be a non-empty array.");
  }
  const capabilities = record.capabilities.map((capability) => parseCapability(capability, "Allowlist policy capability"));
  assertUnique(capabilities.map((capability) => `${capability.name}:${capability.proof}`), "Allowlist policy capabilities");
  return { policyId: record.policyId, target, operations, allowedFields, allowedTransitions, allowedActorScopes, capabilities };
}

function parseOperation(value: unknown): OperationPolicy {
  const record = assertRecord(value, "Allowlist policy operation", ["name", "mutating"]);
  assertNonEmptyString(record.name, "Allowlist policy operation name");
  if (typeof record.mutating !== "boolean") {
    throw new AllowlistValidationError("Allowlist policy operation mutating must be boolean.");
  }
  return { name: record.name, mutating: record.mutating };
}

function parseTarget(value: unknown, label: string): ResolvedTarget {
  try {
    return parseResolvedTarget(value, label);
  } catch (error) {
    if (error instanceof TargetIdentityValidationError) {
      throw new AllowlistValidationError(`${label} must contain a valid resolved target.`);
    }
    throw error;
  }
}

function parseTransition(value: unknown, label: string): { from: string; to: string } | null {
  if (value === null) {
    return null;
  }
  const record = assertRecord(value, label, ["from", "to"]);
  assertNonEmptyString(record.from, label);
  assertNonEmptyString(record.to, label);
  return { from: record.from, to: record.to };
}

function parseCapability(value: unknown, label: string): CapabilityProof {
  const record = assertRecord(value, label, ["name", "proof"]);
  assertNonEmptyString(record.name, label);
  assertNonEmptyString(record.proof, label);
  return { name: record.name, proof: record.proof };
}

function parseStringArray(value: unknown, label: string, allowEmpty: boolean): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw new AllowlistValidationError(`${label} must be a non-empty string array.`);
  }
  assertUnique(value, label);
  return [...value];
}

function isForbiddenOperation(operation: string): boolean {
  const tokens = operation.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token !== "");
  const has = (value: string): boolean => tokens.includes(value);
  const hasAny = (values: readonly string[]): boolean => values.some(has);
  return hasAny(["delete", "deletion", "deletions"]) ||
    (hasAny(["permission", "permissions"]) && hasAny(["change", "changes"])) ||
    (hasAny(["workflow", "workflows"]) && hasAny(["change", "changes"])) ||
    (has("production") && hasAny(["mutation", "mutate", "mutating"])) ||
    (has("raw") && hasAny(["transcript", "transcripts", "publication", "publications", "publish"]));
}

function isAllowedForwardTransition(transition: { from: string; to: string }, allowedTransitions: string[]): boolean {
  const fromIndex = boardLifecycle.indexOf(transition.from as typeof boardLifecycle[number]);
  const toIndex = boardLifecycle.indexOf(transition.to as typeof boardLifecycle[number]);
  return fromIndex !== -1 && toIndex === fromIndex + 1 && allowedTransitions.includes(`${transition.from}->${transition.to}`);
}

function sameTarget(first: ResolvedTarget, second: ResolvedTarget): boolean {
  return first.tenantUrl === second.tenantUrl && first.jiraTenantId === second.jiraTenantId &&
    first.jiraProject.key === second.jiraProject.key && first.jiraProject.id === second.jiraProject.id &&
    first.confluenceSpace.key === second.confluenceSpace.key && first.confluenceSpace.id === second.confluenceSpace.id &&
    first.githubRepository.owner === second.githubRepository.owner && first.githubRepository.name === second.githubRepository.name &&
    first.githubRepository.id === second.githubRepository.id && first.environment === second.environment &&
    first.allowlistPolicyId === second.allowlistPolicyId && first.policyMutation.mutationsAllowed === second.policyMutation.mutationsAllowed;
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new AllowlistValidationError(`${label} must not contain duplicates.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AllowlistValidationError(`${label} must be a non-empty string.`);
  }
}

function assertRecord(value: unknown, label: string, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AllowlistValidationError(`${label} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actualKeys.length !== expected.length || actualKeys.some((key, index) => key !== expected[index])) {
    throw new AllowlistValidationError(`${label} must contain exactly the approved fields.`);
  }
  return value as Record<string, unknown>;
}

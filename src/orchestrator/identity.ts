export type TargetEnvironment = "sandbox" | "test" | "production";

export class TargetIdentityValidationError extends Error {
  public constructor(message: string) { super(message); this.name = "TargetIdentityValidationError"; }
}

export interface PolicyMutationMetadata {
  mutationsAllowed: boolean;
}

export interface ConfiguredTarget {
  tenantUrl: string;
  projectKey: string;
  spaceKey: string;
  repositoryOwner: string;
  repositoryName: string;
  jiraTenantId: string;
  jiraProjectId: string;
  confluenceSpaceId: string;
  githubRepositoryId: string;
  environment: TargetEnvironment;
  allowlistPolicyId: string;
  policyMutation: PolicyMutationMetadata;
}

export interface ResolvedTarget {
  tenantUrl: string;
  jiraTenantId: string;
  jiraProject: { key: string; id: string };
  confluenceSpace: { key: string; id: string };
  githubRepository: { owner: string; name: string; id: string };
  environment: TargetEnvironment;
  allowlistPolicyId: string;
  policyMutation: PolicyMutationMetadata;
}

export function resolveTargetIdentity(input: unknown): ResolvedTarget {
  const candidateInput = parseTargetIdentityInput(input);
  const matches = candidateInput.candidates.filter((candidate) =>
    candidate.tenantUrl === candidateInput.tenantUrl &&
    candidate.projectKey === candidateInput.projectKey &&
    candidate.spaceKey === candidateInput.spaceKey &&
    candidate.repositoryOwner === candidateInput.repositoryOwner &&
    candidate.repositoryName === candidateInput.repositoryName,
  );

  if (matches.length === 0) {
    throw new TargetIdentityValidationError("Target identity has zero configured target matches.");
  }
  if (matches.length !== 1) {
    throw new TargetIdentityValidationError("Target identity has an ambiguous configured target mapping.");
  }

  const target = matches[0]!;
  return {
    tenantUrl: target.tenantUrl,
    jiraTenantId: target.jiraTenantId,
    jiraProject: { key: target.projectKey, id: target.jiraProjectId },
    confluenceSpace: { key: target.spaceKey, id: target.confluenceSpaceId },
    githubRepository: { owner: target.repositoryOwner, name: target.repositoryName, id: target.githubRepositoryId },
    environment: target.environment,
    allowlistPolicyId: target.allowlistPolicyId,
    policyMutation: { mutationsAllowed: target.policyMutation.mutationsAllowed },
  };
}

export function parseResolvedTarget(value: unknown, label: string): ResolvedTarget {
  const record = assertRecord(value, label, [
    "tenantUrl", "jiraTenantId", "jiraProject", "confluenceSpace", "githubRepository", "environment", "allowlistPolicyId", "policyMutation",
  ]);
  assertTenantUrl(record.tenantUrl, label);
  assertNonEmptyString(record.jiraTenantId, label);
  const jiraProject = parseKeyedIdentity(record.jiraProject, label, "jiraProject");
  const confluenceSpace = parseKeyedIdentity(record.confluenceSpace, label, "confluenceSpace");
  const githubRepository = parseRepositoryIdentity(record.githubRepository, label);
  assertEnvironment(record.environment, label);
  assertNonEmptyString(record.allowlistPolicyId, label);
  const policyMutation = parsePolicyMutation(record.policyMutation, label);
  return {
    tenantUrl: record.tenantUrl,
    jiraTenantId: record.jiraTenantId,
    jiraProject,
    confluenceSpace,
    githubRepository,
    environment: record.environment,
    allowlistPolicyId: record.allowlistPolicyId,
    policyMutation,
  };
}

function parseTargetIdentityInput(value: unknown): { tenantUrl: string; projectKey: string; spaceKey: string; repositoryOwner: string; repositoryName: string; candidates: ConfiguredTarget[] } {
  const record = assertRecord(value, "Target identity input", ["tenantUrl", "projectKey", "spaceKey", "repositoryOwner", "repositoryName", "candidates"]);
  assertTenantUrl(record.tenantUrl, "Target identity input");
  if (!Array.isArray(record.candidates)) {
    throw new TargetIdentityValidationError("Target identity input candidates must be an explicit configured array.");
  }
  return {
    tenantUrl: record.tenantUrl,
    projectKey: stringField(record, "projectKey", "Target identity input"),
    spaceKey: stringField(record, "spaceKey", "Target identity input"),
    repositoryOwner: stringField(record, "repositoryOwner", "Target identity input"),
    repositoryName: stringField(record, "repositoryName", "Target identity input"),
    candidates: record.candidates.map((candidate) => parseConfiguredTarget(candidate)),
  };
}

function parseConfiguredTarget(value: unknown): ConfiguredTarget {
  const record = assertRecord(value, "Target identity configured candidate", [
    "tenantUrl", "projectKey", "spaceKey", "repositoryOwner", "repositoryName", "jiraTenantId", "jiraProjectId", "confluenceSpaceId", "githubRepositoryId", "environment", "allowlistPolicyId", "policyMutation",
  ]);
  assertTenantUrl(record.tenantUrl, "Target identity configured candidate");
  assertEnvironment(record.environment, "Target identity configured candidate");
  return {
    tenantUrl: record.tenantUrl,
    projectKey: stringField(record, "projectKey", "Target identity configured candidate"),
    spaceKey: stringField(record, "spaceKey", "Target identity configured candidate"),
    repositoryOwner: stringField(record, "repositoryOwner", "Target identity configured candidate"),
    repositoryName: stringField(record, "repositoryName", "Target identity configured candidate"),
    jiraTenantId: stringField(record, "jiraTenantId", "Target identity configured candidate"),
    jiraProjectId: stringField(record, "jiraProjectId", "Target identity configured candidate"),
    confluenceSpaceId: stringField(record, "confluenceSpaceId", "Target identity configured candidate"),
    githubRepositoryId: stringField(record, "githubRepositoryId", "Target identity configured candidate"),
    environment: record.environment,
    allowlistPolicyId: stringField(record, "allowlistPolicyId", "Target identity configured candidate"),
    policyMutation: parsePolicyMutation(record.policyMutation, "Target identity configured candidate"),
  };
}

function parseKeyedIdentity(value: unknown, label: string, key: string): { key: string; id: string } {
  const record = assertRecord(value, `${label} ${key}`, ["key", "id"]);
  assertNonEmptyString(record.key, `${label} ${key}`);
  assertNonEmptyString(record.id, `${label} ${key}`);
  return { key: record.key, id: record.id };
}

function parseRepositoryIdentity(value: unknown, label: string): { owner: string; name: string; id: string } {
  const record = assertRecord(value, `${label} githubRepository`, ["owner", "name", "id"]);
  assertNonEmptyString(record.owner, `${label} githubRepository`);
  assertNonEmptyString(record.name, `${label} githubRepository`);
  assertNonEmptyString(record.id, `${label} githubRepository`);
  return { owner: record.owner, name: record.name, id: record.id };
}

function parsePolicyMutation(value: unknown, label: string): PolicyMutationMetadata {
  const record = assertRecord(value, `${label} policyMutation`, ["mutationsAllowed"]);
  if (typeof record.mutationsAllowed !== "boolean") {
    throw new TargetIdentityValidationError(`${label} policyMutation must define a boolean mutationsAllowed value.`);
  }
  return { mutationsAllowed: record.mutationsAllowed };
}

function assertTenantUrl(value: unknown, label: string): asserts value is string {
  assertNonEmptyString(value, label);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "" || parsed.search !== "" || parsed.hash !== "") {
      throw new TargetIdentityValidationError("Invalid tenant URL.");
    }
  } catch {
    throw new TargetIdentityValidationError(`${label} tenantUrl must be a credential-free HTTPS URL.`);
  }
}

function assertEnvironment(value: unknown, label: string): asserts value is TargetEnvironment {
  if (value !== "sandbox" && value !== "test" && value !== "production") {
    throw new TargetIdentityValidationError(`${label} environment must be sandbox, test, or production.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TargetIdentityValidationError(`${label} must contain non-empty string values.`);
  }
}

function stringField(record: Record<string, unknown>, key: string, label: string): string {
  assertNonEmptyString(record[key], label);
  return record[key] as string;
}

function assertRecord(value: unknown, label: string, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TargetIdentityValidationError(`${label} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actualKeys.length !== expected.length || actualKeys.some((key, index) => key !== expected[index])) {
    throw new TargetIdentityValidationError(`${label} must contain exactly the approved fields.`);
  }
  return value as Record<string, unknown>;
}

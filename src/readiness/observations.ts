import {
  assertSafeEvidenceRefs,
  EvidenceValidationError,
} from "../orchestrator/evidence.js";
import type {
  CheckState,
  G2asReadinessManifest,
  ReadPath,
  SourceName,
} from "./types.js";
import type { GithubCapabilityEvidence } from "../capabilities/types.js";

export interface ReadinessObservation {
  source: SourceName;
  state: CheckState;
  readPath: ReadPath;
  capabilityState: "verified" | "unknown";
  observedIds: Record<string, string>;
  evidenceRefs: string[];
  capabilityEvidence?: GithubCapabilityEvidence;
  diagnosticCode: "NONE" | "CAPABILITY_UNKNOWN" | "TARGET_MISMATCH" | "TRACEABILITY_MISMATCH" | "TIMEOUT_UNKNOWN" | "SCOPE_UNVERIFIED";
  observedAt: string;
}

export interface ReadinessObservationBundle {
  correlationId: string;
  runAt: string;
  observations: [ReadinessObservation, ReadinessObservation, ReadinessObservation, ReadinessObservation];
}

export interface ReadinessAdapter {
  read(manifest: G2asReadinessManifest): Promise<ReadinessObservationBundle>;
}

const sourceNames = ["jira", "confluence", "github", "traceability"] as const;
const checkStates = ["verified", "unknown", "mismatch"] as const;
const readPaths = ["mcp", "tenant_aware_chrome"] as const;
const capabilityStates = ["verified", "unknown"] as const;
const diagnosticCodes = ["NONE", "CAPABILITY_UNKNOWN", "TARGET_MISMATCH", "TRACEABILITY_MISMATCH", "TIMEOUT_UNKNOWN", "SCOPE_UNVERIFIED"] as const;
const bundleKeys = ["correlationId", "runAt", "observations"];
const observationKeys = ["source", "state", "readPath", "capabilityState", "observedIds", "evidenceRefs", "diagnosticCode", "observedAt", "capabilityEvidence"];
const arrayIndexPattern = /^(0|[1-9]\d*)$/;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const unsafeKeyPattern = /authorization|cookie|credential|password|token|raw[\s_-]*transcript/i;
const unsafeTextPattern = /authorization|cookie|credential|password|token|raw\s*transcript|www\./i;
const uriSchemePrefixPattern = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const nativeEvidenceRefPattern = /^(?:jira|confluence|github|traceability):[A-Za-z0-9][A-Za-z0-9._:-]*$/;

// These source-specific native identifiers are the complete accepted observation vocabulary.
const observedIdFields: Record<SourceName, readonly string[]> = {
  jira: ["tenantOrigin", "projectId", "projectKey", "issueId", "issueKey", "status"],
  confluence: ["tenantOrigin", "spaceId", "spaceKey", "pageId"],
  github: ["repositoryId", "repository", "branch", "commit", "fixturePathOne", "fixturePathTwo"],
  traceability: ["jiraIssueKey", "githubCommit", "confluencePageId", "jiraGitLinkId", "jiraGitLinkedCommit", "confluenceJiraRefId", "confluenceJiraReferencedKey", "confluenceGitRefId", "confluenceGitReferencedCommit", "confluenceGitReferenceKind"],
};
const requiredObservedIdFields: Record<SourceName, readonly string[]> = {
  jira: ["tenantOrigin"],
  confluence: ["tenantOrigin"],
  github: [],
  traceability: ["jiraIssueKey", "githubCommit", "confluencePageId", "jiraGitLinkId", "jiraGitLinkedCommit", "confluenceJiraRefId", "confluenceJiraReferencedKey", "confluenceGitRefId", "confluenceGitReferencedCommit", "confluenceGitReferenceKind"],
};

export function parseReadinessObservationBundle(value: unknown): ReadinessObservationBundle {
  rejectUnsafeKeys(value);
  const bundle = requireRecord(value, "invalid bundle structure");
  requireExactKeys(bundle, bundleKeys);

  requireSafeText(bundle.correlationId, "correlation ID");
  requireIsoTimestamp(bundle.runAt);
  const observations = parseObservations(bundle.observations);

  return {
    correlationId: bundle.correlationId as string,
    runAt: bundle.runAt as string,
    observations,
  };
}

export async function readObservations(
  adapter: ReadinessAdapter,
  manifest: G2asReadinessManifest,
): Promise<ReadinessObservationBundle> {
  return parseReadinessObservationBundle(await adapter.read(manifest));
}

function parseObservations(value: unknown): ReadinessObservationBundle["observations"] {
  if (!Array.isArray(value) || value.length !== sourceNames.length) {
    reject("source set");
  }

  requireArrayKeys(value, "source set");
  const observations = value.map(parseObservation);
  const sources = observations.map((observation) => observation.source);

  if (new Set(sources).size !== sourceNames.length || !sourceNames.every((source) => sources.includes(source))) {
    reject("source set");
  }

  return observations as ReadinessObservationBundle["observations"];
}

function parseObservation(value: unknown): ReadinessObservation {
  const observation = requireRecord(value, "invalid observation structure");
  const source = requireOneOf(observation.source, sourceNames, "source");
  if (source === "github" && !Object.hasOwn(observation, "capabilityEvidence")) reject("capability evidence");
  const expectedKeys = source === "github" ? observationKeys : observationKeys.filter((key) => key !== "capabilityEvidence");
  requireExactKeys(observation, expectedKeys);

  return {
    source,
    state: requireOneOf(observation.state, checkStates, "state"),
    readPath: requireOneOf(observation.readPath, readPaths, "read path"),
    capabilityState: requireOneOf(observation.capabilityState, capabilityStates, "capability state"),
    observedIds: parseObservedIds(observation.observedIds, source),
    evidenceRefs: parseEvidenceRefs(observation.evidenceRefs),
    ...(source === "github" ? { capabilityEvidence: parseCapabilityEvidence(observation.capabilityEvidence) } : {}),
    diagnosticCode: requireOneOf(observation.diagnosticCode, diagnosticCodes, "diagnostic code"),
    observedAt: requireIsoTimestamp(observation.observedAt),
  };
}

function parseCapabilityEvidence(value: unknown): GithubCapabilityEvidence {
  const evidence = requireRecord(value, "capability evidence");
  requireExactKeys(evidence, ["capabilityId", "capabilityVersion", "host", "scopeFingerprint", "state"]);
  if (evidence.capabilityId !== "github-readonly-evidence-v1" || evidence.capabilityVersion !== 1) reject("capability evidence");
  if (typeof evidence.host !== "string" || !["codex", "claude-code", "cursor"].includes(evidence.host)) reject("capability evidence");
  if (typeof evidence.scopeFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(evidence.scopeFingerprint)) reject("capability evidence");
  if (evidence.state !== "verified" && evidence.state !== "unknown") reject("capability evidence");
  return {
    capabilityId: "github-readonly-evidence-v1",
    capabilityVersion: 1,
    host: evidence.host as "codex" | "claude-code" | "cursor",
    scopeFingerprint: evidence.scopeFingerprint as string,
    state: evidence.state,
  };
}

function parseObservedIds(value: unknown, source: SourceName): Record<string, string> {
  const observedIds = requireRecord(value, "observed IDs");
  const allowedFields = observedIdFields[source];
  const requiredFields = requiredObservedIdFields[source];
  const keys = Reflect.ownKeys(observedIds);

  if (
    keys.length === 0 ||
    keys.some((key) => typeof key !== "string" || !allowedFields.includes(key)) ||
    requiredFields.some((field) => !Object.hasOwn(observedIds, field))
  ) {
    reject("observed ID field");
  }

  for (const key of keys) {
    const field = key as string;
    if (field === "tenantOrigin") {
      requireTenantOrigin(observedIds[field]);
    } else {
      requireSafeText(observedIds[field], "observed ID");
    }
  }

  return observedIds as Record<string, string>;
}

function parseEvidenceRefs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    reject("unsafe evidence");
  }

  requireArrayKeys(value, "unsafe field");
  if (!value.every((reference) => typeof reference === "string") || new Set(value).size !== value.length) {
    reject("unsafe evidence");
  }

  try {
    assertSafeEvidenceRefs(value);
  } catch (error: unknown) {
    if (error instanceof EvidenceValidationError) {
      reject("unsafe evidence");
    }

    throw error;
  }

  for (const reference of value) {
    requireSafeEvidenceRef(reference);
  }

  return [...value];
}

function requireRecord(value: unknown, category: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      reject("unsafe field");
    }

    reject(category);
  }

  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expectedKeys: readonly string[]): void {
  const keys = Reflect.ownKeys(record);
  const hasUnexpectedKey = keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key));
  const hasMissingKey = expectedKeys.some((key) => !Object.hasOwn(record, key));

  if (hasUnexpectedKey || hasMissingKey) {
    reject("unknown field");
  }
}

function requireArrayKeys(value: unknown[], category: string): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || (key !== "length" && !arrayIndexPattern.test(key))) {
      reject(category);
    }
  }
}

function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], category: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    reject(category);
  }

  return value as T;
}

function requireSafeText(value: unknown, category: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    unsafeTextPattern.test(value) ||
    uriSchemePrefixPattern.test(value)
  ) {
    reject(category);
  }
}

function requireTenantOrigin(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim() === "" || unsafeTextPattern.test(value)) {
    reject("observed ID");
  }

  let origin: URL;

  try {
    origin = new URL(value);
  } catch {
    reject("observed ID");
  }

  if (
    origin.protocol !== "https:" ||
    origin.username !== "" ||
    origin.password !== "" ||
    value !== origin.origin
  ) {
    reject("observed ID");
  }
}

function requireSafeEvidenceRef(value: string): void {
  if (unsafeTextPattern.test(value) || !nativeEvidenceRefPattern.test(value)) {
    reject("unsafe evidence");
  }
}

function requireIsoTimestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !isoTimestampPattern.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    reject("timestamp");
  }

  return value;
}

function rejectUnsafeKeys(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || unsafeKeyPattern.test(key)) {
      reject("unsafe field");
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      reject("unsafe field");
    }

    rejectUnsafeKeys(descriptor.value);
  }
}

function reject(category: string): never {
  throw new Error(`G2AS readiness observations rejected: ${category}.`);
}

import { createHash } from "node:crypto";

import type {
  ReadinessObservation,
  ReadinessObservationBundle,
} from "./observations.js";
import type {
  CertificateDecision,
  CheckState,
  G2asReadinessManifest,
  ReadPath,
  SourceName,
} from "./types.js";

export interface ReadinessCheck {
  name: SourceName;
  state: CheckState;
  expectedFingerprint: string;
  observedFingerprint: string;
  readPath: ReadPath;
  capabilityState: "verified" | "unknown";
  diagnosticCode: ReadinessObservation["diagnosticCode"];
  evidenceRefs: string[];
  nextAction: string;
}

export interface ReadinessCertificate {
  certificateVersion: 1;
  decision: CertificateDecision;
  correlationId: string;
  runAt: string;
  manifestFingerprint: string;
  externalWriteCount: 0;
  checks: [ReadinessCheck, ReadinessCheck, ReadinessCheck, ReadinessCheck];
  unchangedSystems: ["jira", "confluence", "github"];
  remediation: string[];
  decisionOptions: ["Stop"] | ["Continue", "Stop"];
}

const sourceNames: readonly SourceName[] = ["jira", "confluence", "github", "traceability"];
const permittedReadPaths: readonly ReadPath[] = ["mcp", "tenant_aware_chrome"];

export function evaluateReadiness(
  manifest: G2asReadinessManifest,
  bundle: ReadinessObservationBundle,
): ReadinessCertificate {
  const checks = sourceNames.map((source) => evaluateSource(manifest, bundle, source)) as ReadinessCertificate["checks"];
  const decision = decide(checks);
  const remediation = unique(checks.filter((check) => check.state !== "verified" || check.diagnosticCode !== "NONE").map((check) => check.nextAction));

  return {
    certificateVersion: 1,
    decision,
    correlationId: bundle.correlationId,
    runAt: bundle.runAt,
    manifestFingerprint: fingerprint(manifest),
    externalWriteCount: 0,
    checks,
    unchangedSystems: ["jira", "confluence", "github"],
    remediation,
    decisionOptions: decision === "READY" ? ["Continue", "Stop"] : ["Stop"],
  };
}

function evaluateSource(
  manifest: G2asReadinessManifest,
  bundle: ReadinessObservationBundle,
  source: SourceName,
): ReadinessCheck {
  const observation = bundle.observations.find((candidate) => candidate.source === source);
  const expected = expectedIds(manifest, source);

  if (observation === undefined) {
    return createCheck(source, "unknown", "mcp", "unknown", "SCOPE_UNVERIFIED", [], expected, {});
  }

  const observed = allowedObservedIds(observation, source);
  const evaluation = evaluateObservation(manifest, observation, expected, observed);

  return createCheck(
    source,
    evaluation.state,
    observation.readPath,
    observation.capabilityState,
    evaluation.diagnosticCode,
    observation.evidenceRefs,
    expected,
    observed,
  );
}

function evaluateObservation(
  manifest: G2asReadinessManifest,
  observation: ReadinessObservation,
  expected: Record<string, string>,
  observed: Record<string, string>,
): { state: CheckState; diagnosticCode: ReadinessObservation["diagnosticCode"] } {
  if (!permittedReadPaths.includes(observation.readPath)) {
    return { state: "unknown", diagnosticCode: "SCOPE_UNVERIFIED" };
  }

  if (observation.capabilityState === "unknown") {
    return { state: "unknown", diagnosticCode: "CAPABILITY_UNKNOWN" };
  }

  if (observation.diagnosticCode === "TIMEOUT_UNKNOWN" || observation.diagnosticCode === "SCOPE_UNVERIFIED") {
    return { state: "unknown", diagnosticCode: observation.diagnosticCode };
  }

  if (!matchesExpected(manifest, observation.source, observed)) {
    return {
      state: "mismatch",
      diagnosticCode: observation.source === "traceability" ? "TRACEABILITY_MISMATCH" : "TARGET_MISMATCH",
    };
  }

  if (observation.state !== "verified" || observation.diagnosticCode !== "NONE") {
    return { state: observation.state, diagnosticCode: observation.diagnosticCode };
  }

  return { state: "verified", diagnosticCode: "NONE" };
}

function createCheck(
  name: SourceName,
  state: CheckState,
  readPath: ReadPath,
  capabilityState: "verified" | "unknown",
  diagnosticCode: ReadinessObservation["diagnosticCode"],
  evidenceRefs: string[],
  expected: Record<string, string>,
  observed: Record<string, string>,
): ReadinessCheck {
  return {
    name,
    state,
    expectedFingerprint: fingerprint(expected),
    observedFingerprint: fingerprint(observed),
    readPath,
    capabilityState,
    diagnosticCode,
    evidenceRefs: [...evidenceRefs],
    nextAction: nextAction(state, diagnosticCode),
  };
}

function expectedIds(manifest: G2asReadinessManifest, source: SourceName): Record<string, string> {
  const tenantOrigin = new URL(manifest.tenantUrl).origin;

  if (source === "jira") {
    return { tenantOrigin, projectKey: manifest.jira.projectKey, issueKey: manifest.jira.issueKey, status: manifest.jira.expectedStatus };
  }
  if (source === "confluence") {
    return { tenantOrigin, spaceKey: manifest.confluence.spaceKey, pageId: manifest.confluence.pageId };
  }
  if (source === "github") {
    return { repository: manifest.github.repository, branch: manifest.github.branch, commit: manifest.github.commit, fixturePathOne: manifest.github.fixturePaths[0], fixturePathTwo: manifest.github.fixturePaths[1] };
  }

  return {
    jiraIssueKey: manifest.jira.issueKey,
    githubCommit: manifest.github.commit,
    confluencePageId: manifest.confluence.pageId,
    jiraGitLinkedCommit: manifest.github.commit,
    confluenceJiraReferencedKey: manifest.jira.issueKey,
    confluenceGitReferencedCommit: manifest.github.commit,
  };
}

function allowedObservedIds(observation: ReadinessObservation, source: SourceName): Record<string, string> {
  const allowedFields = fieldsFor(source);
  return Object.fromEntries(
    Object.entries(observation.observedIds).filter(([field]) => allowedFields.includes(field)),
  );
}

function fieldsFor(source: SourceName): readonly string[] {
  if (source === "jira") return ["tenantOrigin", "projectKey", "issueKey", "status"];
  if (source === "confluence") return ["tenantOrigin", "spaceKey", "pageId"];
  if (source === "github") return ["repository", "branch", "commit", "fixturePathOne", "fixturePathTwo"];
  return ["jiraIssueKey", "githubCommit", "confluencePageId", "jiraGitLinkId", "jiraGitLinkedCommit", "confluenceJiraRefId", "confluenceJiraReferencedKey", "confluenceGitRefId", "confluenceGitReferencedCommit"];
}

function matchesExpected(manifest: G2asReadinessManifest, source: SourceName, observed: Record<string, string>): boolean {
  const expected = expectedIds(manifest, source);
  if (!Object.entries(expected).every(([key, value]) => observed[key] === value)) return false;

  if ((source === "jira" || source === "confluence") && observed.tenantOrigin !== new URL(manifest.tenantUrl).origin) {
    return false;
  }

  return source !== "traceability" || ["jiraGitLinkId", "confluenceJiraRefId", "confluenceGitRefId"].every((key) => observed[key]?.trim() !== "");
}

function decide(checks: ReadinessCertificate["checks"]): CertificateDecision {
  if (checks.some((check) => mustStop(check))) return "STOPPED";
  if (checks.every((check) => check.state === "verified")) return "READY";
  return "NOT READY";
}

function mustStop(check: ReadinessCheck): boolean {
  return check.capabilityState === "unknown" || !permittedReadPaths.includes(check.readPath) || ["TARGET_MISMATCH", "SCOPE_UNVERIFIED", "TIMEOUT_UNKNOWN", "CAPABILITY_UNKNOWN", "TRACEABILITY_MISMATCH"].includes(check.diagnosticCode);
}

function nextAction(state: CheckState, diagnosticCode: ReadinessObservation["diagnosticCode"]): string {
  if (diagnosticCode === "TARGET_MISMATCH") return "Re-read the fixed target and verify the exact target identifiers.";
  if (diagnosticCode === "TRACEABILITY_MISMATCH") return "Re-read the native Jira, Git, and Confluence traceability references.";
  if (diagnosticCode === "CAPABILITY_UNKNOWN") return "Verify the required read capability before continuing.";
  if (diagnosticCode === "TIMEOUT_UNKNOWN") return "Repeat the approved read and obtain a completed observation.";
  if (diagnosticCode === "SCOPE_UNVERIFIED") return "Use an approved literal read path and verify its scope.";
  if (state === "verified") return "No action required.";
  return "Complete the required read and verify the expected target.";
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

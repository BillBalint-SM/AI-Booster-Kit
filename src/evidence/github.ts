export type VerificationState = "accepted" | "failed" | "non_authoritative";

export interface CanonicalEvidence {
  source: "github";
  externalId: string;
  url: string;
  observedRevision: string;
  observedAt: string;
  verificationState: VerificationState;
  canonicalWorkItemIds: readonly string[];
}

export interface GitHubEvidenceInput {
  repository: string;
  branch: { id: string; name: string; revision: string; url: string };
  pullRequest: { id: string; number: number; branch: string; baseRevision: string; headRevision: string; canonicalWorkItemIds: string[]; url: string };
  requiredCheckNames: string[];
  reviewRequirements: { minimumApprovals: number };
  baseRevision: string;
  checks: Array<{ id: string; name: string; state: string; revision: string; url: string }>;
  review: { id: string; state: string; approvals: number; revision: string };
  deployment: { id: string; environment: string; state: string; revision: string; url: string } | null;
  observedAt: string;
}

export class EvidenceValidationError extends Error {
  public constructor() {
    super("Evidence input must contain only approved, safe, local fields.");
    this.name = "EvidenceValidationError";
  }
}

const unsafeText = /authorization|bearer|credential|password|raw\s*transcript|secret|token/i;

export async function collectGitHubEvidence(input: GitHubEvidenceInput): Promise<CanonicalEvidence[]> {
  const value = parseGitHubEvidenceInput(input);
  const verificationState = evidenceState(value);
  const workItemIds = [...value.pullRequest.canonicalWorkItemIds];
  const records = [
    evidence(externalId(value.repository, "branch", value.branch.id + "@" + value.branch.revision), value.branch.url, value.branch.revision, value.observedAt, verificationState, workItemIds),
    evidence(externalId(value.repository, "commit", value.pullRequest.headRevision), commitUrl(value.repository, value.pullRequest.headRevision), value.pullRequest.headRevision, value.observedAt, verificationState, workItemIds),
    evidence(externalId(value.repository, "pull_request", value.pullRequest.id), value.pullRequest.url, value.pullRequest.headRevision, value.observedAt, verificationState, workItemIds),
  ];
  for (const check of value.checks.filter((candidate) => value.requiredCheckNames.includes(candidate.name))) {
    records.push(evidence(externalId(value.repository, "check_run", check.id), check.url, check.revision, value.observedAt, verificationState, workItemIds));
  }
  records.push(evidence(externalId(value.repository, "pull_request_review", value.review.id), value.pullRequest.url, value.review.revision, value.observedAt, verificationState, workItemIds));
  if (value.deployment !== null) {
    records.push(evidence(externalId(value.repository, "deployment", value.deployment.id), value.deployment.url, value.deployment.revision, value.observedAt, verificationState, workItemIds));
  }
  return records;
}

function parseGitHubEvidenceInput(input: unknown): GitHubEvidenceInput {
  const record = exactRecord(input, ["repository", "branch", "pullRequest", "requiredCheckNames", "reviewRequirements", "baseRevision", "checks", "review", "deployment", "observedAt"]);
  const repository = repositoryName(record.repository);
  const branchRecord = exactRecord(record.branch, ["id", "name", "revision", "url"]);
  const branch = { id: nativeId(branchRecord.id), name: safeString(branchRecord.name), revision: gitRevision(branchRecord.revision), url: githubUrl(branchRecord.url, "/" + repository + "/tree/" + safeString(branchRecord.name)) };
  const pullRequestRecord = exactRecord(record.pullRequest, ["id", "number", "branch", "baseRevision", "headRevision", "canonicalWorkItemIds", "url"]);
  const pullRequest = {
    id: nativeId(pullRequestRecord.id),
    number: positiveInteger(pullRequestRecord.number),
    branch: safeString(pullRequestRecord.branch),
    baseRevision: gitRevision(pullRequestRecord.baseRevision),
    headRevision: gitRevision(pullRequestRecord.headRevision),
    canonicalWorkItemIds: uniqueStrings(pullRequestRecord.canonicalWorkItemIds),
    url: githubUrl(pullRequestRecord.url, "/" + repository + "/pull/" + String(pullRequestRecord.number)),
  };
  if (branch.url !== "https://github.com/" + repository + "/tree/" + branch.name || pullRequest.branch !== branch.name) throw invalid();
  const requiredCheckNames = uniqueStrings(record.requiredCheckNames);
  if (requiredCheckNames.length === 0) throw invalid();
  const reviewRequirementsRecord = exactRecord(record.reviewRequirements, ["minimumApprovals"]);
  const reviewRequirements = { minimumApprovals: nonNegativeInteger(reviewRequirementsRecord.minimumApprovals) };
  const baseRevision = gitRevision(record.baseRevision);
  const checks = parseChecks(record.checks, repository);
  const reviewRecord = exactRecord(record.review, ["id", "state", "approvals", "revision"]);
  const review = { id: nativeId(reviewRecord.id), state: safeString(reviewRecord.state), approvals: nonNegativeInteger(reviewRecord.approvals), revision: gitRevision(reviewRecord.revision) };
  const deployment = parseDeployment(record.deployment, repository);
  const observedAt = isoTimestamp(record.observedAt);
  return { repository, branch, pullRequest, requiredCheckNames, reviewRequirements, baseRevision, checks, review, deployment, observedAt };
}

function parseChecks(value: unknown, repository: string): Array<{ id: string; name: string; state: string; revision: string; url: string }> {
  if (!Array.isArray(value)) throw invalid();
  const checks = value.map((entry) => {
    const record = exactRecord(entry, ["id", "name", "state", "revision", "url"]);
    const id = nativeId(record.id);
    return { id, name: safeString(record.name), state: safeString(record.state), revision: gitRevision(record.revision), url: githubUrl(record.url, "/" + repository + "/runs/" + id) };
  });
  if (new Set(checks.map((check) => check.name)).size !== checks.length || new Set(checks.map((check) => check.id)).size !== checks.length) throw invalid();
  return checks;
}

function parseDeployment(value: unknown, repository: string): { id: string; environment: string; state: string; revision: string; url: string } | null {
  if (value === null) return null;
  const record = exactRecord(value, ["id", "environment", "state", "revision", "url"]);
  const id = nativeId(record.id);
  return { id, environment: safeString(record.environment), state: safeString(record.state), revision: gitRevision(record.revision), url: githubUrl(record.url, "/" + repository + "/deployments/" + id) };
}

function evidenceState(input: GitHubEvidenceInput): VerificationState {
  const requiredChecks = input.requiredCheckNames.map((name) => input.checks.find((check) => check.name === name));
  const checksPassed = requiredChecks.every((check) => check !== undefined && check.state === "success" && check.revision === input.pullRequest.headRevision);
  const matching = input.repository === repositoryFromUrl(input.pullRequest.url) && input.pullRequest.branch === input.branch.name && input.branch.revision === input.pullRequest.headRevision && input.pullRequest.baseRevision === input.baseRevision && input.pullRequest.canonicalWorkItemIds.length === 1 && checksPassed && input.review.state === "approved" && input.review.approvals >= input.reviewRequirements.minimumApprovals && input.review.revision === input.pullRequest.headRevision;
  const deploymentPassed = input.deployment === null || (input.deployment.state === "success" && input.deployment.revision === input.pullRequest.headRevision);
  return matching && deploymentPassed ? "accepted" : "failed";
}

function evidence(externalId: string, url: string, observedRevision: string, observedAt: string, verificationState: VerificationState, canonicalWorkItemIds: string[]): CanonicalEvidence {
  return Object.freeze({ source: "github", externalId, url, observedRevision, observedAt, verificationState, canonicalWorkItemIds: Object.freeze([...canonicalWorkItemIds]) });
}

function exactRecord(value: unknown, keys: string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) throw invalid();
  return value as Record<string, unknown>;
}

function repositoryName(value: unknown): string {
  const repository = safeString(value);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw invalid();
  return repository;
}

function githubUrl(value: unknown, expectedPath: string): string {
  const url = safeString(value);
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw invalid(); }
  const canonical = "https://github.com" + expectedPath;
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || parsed.username !== "" || parsed.password !== "" || parsed.search !== "" || parsed.hash !== "" || parsed.href !== canonical) throw invalid();
  return canonical;
}

function repositoryFromUrl(value: string): string {
  const segments = new URL(value).pathname.split("/").filter((segment) => segment !== "");
  return segments.slice(0, 2).join("/");
}

function commitUrl(repository: string, revision: string): string { return "https://github.com/" + repository + "/commit/" + revision; }
function externalId(repository: string, objectType: string, objectId: string): string { return "github:" + repository + ":" + objectType + ":" + objectId; }
function safeString(value: unknown): string { if (typeof value !== "string" || value.trim() === "" || unsafeText.test(value)) throw invalid(); return value; }
function nativeId(value: unknown): string { const id = safeString(value); if (!/^[A-Za-z0-9_.=-]+$/.test(id)) throw invalid(); return id; }
function gitRevision(value: unknown): string { const revision = safeString(value); if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision)) throw invalid(); return revision; }
function uniqueStrings(value: unknown): string[] { if (!Array.isArray(value)) throw invalid(); const values = value.map(safeString); if (new Set(values).size !== values.length) throw invalid(); return values; }
function positiveInteger(value: unknown): number { if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw invalid(); return value; }
function nonNegativeInteger(value: unknown): number { if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw invalid(); return value; }
function isoTimestamp(value: unknown): string { const timestamp = safeString(value); if (Number.isNaN(Date.parse(timestamp))) throw invalid(); return timestamp; }
function invalid(): EvidenceValidationError { return new EvidenceValidationError(); }

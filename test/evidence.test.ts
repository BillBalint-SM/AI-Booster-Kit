import assert from "node:assert/strict";
import { test } from "node:test";

import { collectGitHubEvidence, EvidenceValidationError } from "../src/evidence/github.js";
import { assertAuthorityReadBack } from "../src/evidence/readback.js";

const observedAt = "2026-07-29T12:00:00.000Z";
const baseRevision = "0123456789abcdef0123456789abcdef01234567";
const headRevision = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
const staleRevision = "1234567890abcdef1234567890abcdef12345678";

test("evidence: matching GitHub PR produces only accepted immutable canonical evidence", async () => {
  const evidence = await collectGitHubEvidence(githubInput("example/repository"));

  assert.deepEqual(evidence, [
    canonical("github:example/repository:branch:REF_102@" + headRevision, "https://github.com/example/repository/tree/feature/GDEAI-102", headRevision, "accepted"),
    canonical("github:example/repository:commit:" + headRevision, "https://github.com/example/repository/commit/" + headRevision, headRevision, "accepted"),
    canonical("github:example/repository:pull_request:PR_102", "https://github.com/example/repository/pull/101", headRevision, "accepted"),
    canonical("github:example/repository:check_run:CHECK_501", "https://github.com/example/repository/runs/CHECK_501", headRevision, "accepted"),
    canonical("github:example/repository:pull_request_review:REVIEW_601", "https://github.com/example/repository/pull/101", headRevision, "accepted"),
    canonical("github:example/repository:deployment:DEPLOYMENT_701", "https://github.com/example/repository/deployments/DEPLOYMENT_701", headRevision, "accepted"),
  ]);
});

test("evidence: stale, failed, missing, wrong-target, unmapped, and ambiguous GitHub evidence never becomes accepted", async () => {
  const cases = [
    { name: "stale base", changes: { pullRequest: { ...githubInput("example/repository").pullRequest, baseRevision: staleRevision } } },
    { name: "unrelated branch revision", changes: { branch: { ...githubInput("example/repository").branch, revision: staleRevision } } },
    { name: "failed check", changes: { checks: [{ ...githubInput("example/repository").checks[0]!, state: "failure" }] } },
    { name: "missing check", changes: { checks: [] } },
    { name: "unmapped PR", changes: { pullRequest: { ...githubInput("example/repository").pullRequest, canonicalWorkItemIds: [] } } },
    { name: "ambiguous PR", changes: { pullRequest: { ...githubInput("example/repository").pullRequest, canonicalWorkItemIds: ["GDEAI-102", "GDEAI-103"] } } },
  ];

  for (const { name, changes } of cases) {
    const evidence = await collectGitHubEvidence({ ...githubInput("example/repository"), ...changes });
    assert.ok(evidence.every((record) => record.verificationState !== "accepted"), name);
    assert.ok(evidence.some((record) => record.verificationState === "failed"), name);
  }

  await assert.rejects(
    collectGitHubEvidence({ ...githubInput("example/repository"), repository: "other/repository" }),
    (error: unknown) => error instanceof EvidenceValidationError,
  );
});

test("evidence: GitHub URLs are exact native identity URLs and revisions are canonical Git IDs", async () => {
  const invalidUrls = [
    { pullRequest: { ...githubInput("example/repository").pullRequest, url: "https://github.com/example/repository/pull/101/extra" } },
    { checks: [{ ...githubInput("example/repository").checks[0]!, url: "https://github.com/example/repository/runs/CHECK_502" }] },
    { deployment: { ...githubInput("example/repository").deployment!, url: "https://github.com/example/repository/deployments/DEPLOYMENT_702" } },
    { branch: { ...githubInput("example/repository").branch, url: "https://github.com/example/repository/tree/feature/OTHER" } },
  ];
  const invalidRevisions = [
    { baseRevision: "../../base" },
    { pullRequest: { ...githubInput("example/repository").pullRequest, baseRevision: "not-hex" } },
    { pullRequest: { ...githubInput("example/repository").pullRequest, headRevision: "../abcdef1" } },
    { branch: { ...githubInput("example/repository").branch, revision: "abcdef1" } },
    { checks: [{ ...githubInput("example/repository").checks[0]!, revision: "zzzzzzz" }] },
    { review: { ...githubInput("example/repository").review, revision: "abcdef/1" } },
    { deployment: { ...githubInput("example/repository").deployment!, revision: "abcdefg" } },
  ];

  for (const changes of [...invalidUrls, ...invalidRevisions]) {
    await assert.rejects(collectGitHubEvidence({ ...githubInput("example/repository"), ...changes }), EvidenceValidationError);
  }
});

test("evidence: repository-scoped native object IDs prevent cross-repository and repeated-observation collisions", async () => {
  const first = await collectGitHubEvidence(githubInput("example/repository"));
  const repeated = await collectGitHubEvidence(githubInput("example/repository"));
  const other = await collectGitHubEvidence(githubInput("other/repository"));

  assert.deepEqual(first.map((record) => record.externalId), repeated.map((record) => record.externalId));
  assert.notDeepEqual(first.map((record) => record.externalId), other.map((record) => record.externalId));
  assert.ok(first.every((record) => record.externalId.startsWith("github:example/repository:")));
  assert.ok(other.every((record) => record.externalId.startsWith("github:other/repository:")));
});

test("evidence: strict GitHub inputs reject credentials, transcripts, arbitrary URLs, and unknown fields without publishing values", async () => {
  const secret = "credential-value-do-not-publish";
  for (const value of [
    { ...githubInput("example/repository"), authorization: secret },
    { ...githubInput("example/repository"), branch: { ...githubInput("example/repository").branch, rawTranscript: secret } },
    { ...githubInput("example/repository"), pullRequest: { ...githubInput("example/repository").pullRequest, url: "https://example.invalid/pr/101" } },
    { ...githubInput("example/repository"), checks: [{ ...githubInput("example/repository").checks[0]!, authorization: secret }] },
    { ...githubInput("example/repository"), review: { ...githubInput("example/repository").review, id: secret } },
  ]) {
    await assert.rejects(
      collectGitHubEvidence(value),
      (error: unknown) => error instanceof EvidenceValidationError && !error.message.includes(secret) && !JSON.stringify(error).includes(secret),
    );
  }
});

test("evidence: authority read-back verifies exact Jira, Confluence, and GitHub state", () => {
  for (const input of [jiraReadBack(undefined), confluenceReadBack(undefined), githubReadBack(undefined)]) {
    assert.deepEqual(assertAuthorityReadBack(input), { verified: true, differences: [], nextAction: "continue" });
  }
});

test("evidence: Jira read-back accepts matching string-array fields and fingerprints structural array mismatches", () => {
  const matching = assertAuthorityReadBack(jiraReadBack(undefined));
  const mismatch = assertAuthorityReadBack(jiraReadBack({ fields: { summary: "Evidence", description: "Description", labels: ["one", "different"] } }));

  assert.deepEqual(matching, { verified: true, differences: [], nextAction: "continue" });
  assert.deepEqual(mismatch.differences.map((difference) => difference.field), ["fields.labels"]);
  assert.equal(JSON.stringify(mismatch).includes("different"), false);
});

test("evidence: authority read-back exposes every exact mismatch and never normalizes it", () => {
  const cases = [
    { input: jiraReadBack({ project: "OTHER" }), field: "project" },
    { input: jiraReadBack({ issueKey: "GDEAI-103" }), field: "issueKey" },
    { input: jiraReadBack({ parent: "GDEAI-101" }), field: "parent" },
    { input: jiraReadBack({ status: "In Progress" }), field: "status" },
    { input: jiraReadBack({ fields: { summary: "Different", description: "Description", labels: ["one", "two"] } }), field: "fields.summary" },
    { input: jiraReadBack({ fields: { summary: "Evidence", description: "Different", labels: ["one", "two"] } }), field: "fields.description" },
    { input: jiraReadBack({ attachmentRevision: "artifact-old" }), field: "attachmentRevision" },
    { input: confluenceReadBack({ space: "OTHER" }), field: "space" },
    { input: confluenceReadBack({ page: "PAGE-9" }), field: "page" },
    { input: confluenceReadBack({ version: "4" }), field: "version" },
    { input: confluenceReadBack({ artifactRevision: "artifact-old" }), field: "artifactRevision" },
    { input: githubReadBack({ repository: "other/repository" }), field: "repository" },
    { input: githubReadBack({ branch: "feature/OTHER" }), field: "branch" },
    { input: githubReadBack({ pullRequest: 102 }), field: "pullRequest" },
    { input: githubReadBack({ checks: [{ name: "test", state: "failure" }] }), field: "checks" },
    { input: githubReadBack({ review: { state: "changes_requested", approvals: 0 } }), field: "review" },
    { input: githubReadBack({ baseRevision: "base-old" }), field: "baseRevision" },
  ];

  for (const { input, field } of cases) {
    const result = assertAuthorityReadBack(input);
    assert.equal(result.verified, false);
    assert.deepEqual(result.differences.map((difference) => difference.field), [field]);
    assert.equal(result.nextAction, "stop_and_correct");
  }
});

test("evidence: read-back rejects raw transcripts, credentials, arbitrary URLs, and unknown fields without returning them", () => {
  const secret = "token-value-do-not-publish";
  for (const value of [
    { ...jiraReadBack(undefined), unexpected: true },
    jiraReadBack({ fields: { summary: secret } }),
    jiraReadBack({ fields: { summary: "https://example.invalid/private", description: "Description", labels: ["one", "two"] } }),
    jiraReadBack({ fields: { summary: "Evidence", description: "Description", labels: ["one", "https://example.invalid/private"] } }),
    confluenceReadBack({ page: "https://example.invalid/page" }),
    githubReadBack({ review: { state: "approved", rawTranscript: secret } }),
  ]) {
    assert.throws(
      () => assertAuthorityReadBack(value),
      (error: unknown) => error instanceof EvidenceValidationError && !error.message.includes(secret) && !JSON.stringify(error).includes(secret),
    );
  }
});

test("evidence: read-back differences fingerprint keyword-free private values instead of publishing them", () => {
  const privateValue = "m4f2d9Qx7Kp3Lw8N";
  const result = assertAuthorityReadBack(jiraReadBack({ fields: { summary: privateValue, description: "Description" } }));

  assert.equal(JSON.stringify(result).includes(privateValue), false);
  assert.deepEqual(Object.keys(result.differences[0]!).sort(), ["actualFingerprint", "expectedFingerprint", "field"]);
  assert.match(result.differences[0]!.expectedFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.differences[0]!.actualFingerprint, /^sha256:[a-f0-9]{64}$/);
});

function canonical(externalId: string, url: string, observedRevision: string, verificationState: "accepted" | "failed" | "non_authoritative") {
  return { source: "github", externalId, url, observedRevision, observedAt, verificationState, canonicalWorkItemIds: ["GDEAI-102"] };
}

function githubInput(repository: string) {
  return {
    repository,
    branch: { id: "REF_102", name: "feature/GDEAI-102", revision: headRevision, url: "https://github.com/" + repository + "/tree/feature/GDEAI-102" },
    pullRequest: { id: "PR_102", number: 101, branch: "feature/GDEAI-102", baseRevision, headRevision, canonicalWorkItemIds: ["GDEAI-102"], url: "https://github.com/" + repository + "/pull/101" },
    requiredCheckNames: ["test"],
    reviewRequirements: { minimumApprovals: 1 },
    baseRevision,
    checks: [{ id: "CHECK_501", name: "test", state: "success", revision: headRevision, url: "https://github.com/" + repository + "/runs/CHECK_501" }],
    review: { id: "REVIEW_601", state: "approved", approvals: 1, revision: headRevision },
    deployment: { id: "DEPLOYMENT_701", environment: "staging", state: "success", revision: headRevision, url: "https://github.com/" + repository + "/deployments/DEPLOYMENT_701" },
    observedAt,
  };
}

function jiraReadBack(actualChanges: Record<string, unknown> | undefined) {
  const expected = { project: "GDEAI", issueKey: "GDEAI-102", parent: "GDEAI-100", status: "Review", fields: { summary: "Evidence", description: "Description", labels: ["one", "two"] }, attachmentRevision: "artifact-2" };
  return { authority: "jira", expected, actual: { ...expected, ...(actualChanges ?? {}) } };
}

function confluenceReadBack(actualChanges: Record<string, unknown> | undefined) {
  const expected = { space: "ENG", page: "PAGE-8", version: "3", artifactRevision: "artifact-2" };
  return { authority: "confluence", expected, actual: { ...expected, ...(actualChanges ?? {}) } };
}

function githubReadBack(actualChanges: Record<string, unknown> | undefined) {
  const expected = { repository: "example/repository", branch: "feature/GDEAI-102", pullRequest: 101, checks: [{ name: "test", state: "success" }], review: { state: "approved", approvals: 1 }, baseRevision: "base-102" };
  return { authority: "github", expected, actual: { ...expected, ...(actualChanges ?? {}) } };
}

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createCodexMcpReadAdapter,
  mapCodexMcpReadToObservationBundle,
} from "../src/evidence/codex-mcp-adapter.js";
import { ingestCodexReadOnlyEvidence } from "../src/evidence/ingest.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import type { ReadinessObservationBundle } from "../src/readiness/observations.js";
import { readinessCapability } from "./readiness-capability.js";

const manifest = parseG2asReadinessManifest({
  version: 1,
  tenantUrl: "https://pte-politechnika.atlassian.net",
  jira: { projectKey: "G2AS", issueKey: "G2AS-1", expectedStatus: "To Do" },
  confluence: { spaceKey: "G2AS", pageId: "31752193" },
  github: {
    repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
    branch: "main",
    commit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"],
  },
});

test("Codex MCP adapter: maps the exact read contract into normalized MCP observations", () => {
  const bundle: ReadinessObservationBundle = mapCodexMcpReadToObservationBundle(mcpRead());

  assert.equal(bundle.correlationId, "g2as-codex-mcp-001");
  assert.deepEqual(bundle.observations.map((observation) => observation.source).sort(), [
    "confluence", "github", "jira", "traceability",
  ]);
  assert.ok(bundle.observations.every((observation) => observation.readPath === "mcp"));
  assert.equal(bundle.observations.find((observation) => observation.source === "github")?.capabilityEvidence?.host, "codex");
  assert.deepEqual(bundle.observations.find((observation) => observation.source === "traceability")?.observedIds, mcpRead().traceability.observedIds);
});

test("Codex MCP adapter: rejects unknown or secret-bearing source fields without echoing them", () => {
  const secret = "raw-transcript-must-not-escape";
  const unsafe = {
    ...mcpRead(),
    jira: { ...mcpRead().jira, rawTranscript: secret },
  };

  assert.throws(
    () => mapCodexMcpReadToObservationBundle(unsafe),
    (error: unknown) => error instanceof Error && /unknown field/.test(error.message) && !error.message.includes(secret),
  );
});

test("Codex MCP adapter: maps one source read and the ingestion boundary certifies it without writes", async () => {
  let calls = 0;
  const adapter = createCodexMcpReadAdapter({
    async read(receivedManifest: typeof manifest) {
      calls += 1;
      assert.equal(receivedManifest, manifest);
      return mcpRead();
    },
  });

  const result = await ingestCodexReadOnlyEvidence(manifest, adapter, readinessCapability);

  assert.equal(calls, 1);
  assert.equal(result.certificate.decision, "READY");
  assert.equal(result.certificate.externalWriteCount, 0);
});

function mcpRead() {
  const capabilityEvidence = {
    capabilityId: "github-readonly-evidence-v1",
    capabilityVersion: 1,
    host: "codex",
    scopeFingerprint: "695a5559f89ecb1856e699e6a9f3ba182af4ec8d6b7b0c724e7e071bd8741eb7",
    state: "verified",
  } as const;
  return {
    host: "codex",
    correlationId: "g2as-codex-mcp-001",
    runAt: "2026-07-31T10:00:00.000Z",
    jira: {
      tenantOrigin: "https://pte-politechnika.atlassian.net",
      projectId: "10207",
      projectKey: "G2AS",
      issueId: "10561",
      issueKey: "G2AS-1",
      status: "To Do",
      evidenceRef: "jira:issue:10561",
      observedAt: "2026-07-31T10:00:01.000Z",
    },
    confluence: {
      tenantOrigin: "https://pte-politechnika.atlassian.net",
      spaceId: "31490050",
      spaceKey: "G2AS",
      pageId: "31752193",
      evidenceRef: "confluence:page:31752193",
      observedAt: "2026-07-31T10:00:02.000Z",
    },
    github: {
      repositoryId: "1313647896",
      repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
      branch: "main",
      commit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
      fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"],
      evidenceRef: "github:commit:d0971f75c526250f9ee65b8b3b044a4788b31a46",
      capabilityEvidence,
      observedAt: "2026-07-31T10:00:03.000Z",
    },
    traceability: {
      observedIds: {
        jiraIssueKey: "G2AS-1",
        githubCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
        confluencePageId: "31752193",
        jiraGitLinkId: "10099",
        jiraGitLinkedCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
        confluenceJiraRefId: "10066",
        confluenceJiraReferencedKey: "G2AS-1",
        confluenceGitRefId: "g2as-github-commit-link",
        confluenceGitReferencedCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
        confluenceGitReferenceKind: "smart_link",
      },
      evidenceRef: "traceability:chain:10099",
      observedAt: "2026-07-31T10:00:04.000Z",
    },
  };
}

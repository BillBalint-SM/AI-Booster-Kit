import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertCodexMcpToolCaller,
  CodexMcpReadFailure,
  createCodexMcpTransportSource,
} from "../src/evidence/codex-mcp-tool-caller.js";
import {
  assertCodexMcpTransportSource,
  createCodexMcpReadRequest,
} from "../src/evidence/codex-mcp-transport.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";

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

const request = createCodexMcpReadRequest(manifest);
const runAt = "2026-07-31T13:00:00.000Z";

test("Codex MCP tool caller: binds the exact request to the nine read results", async () => {
  const calls: string[] = [];
  const caller = {
    async readJiraIssue(received: typeof request) {
      assert.equal(received, request);
      calls.push("jira.issue");
      return { source: "jira-issue" };
    },
    async readJiraRemoteLinks(received: typeof request) {
      assert.equal(received, request);
      calls.push("jira.remote-links");
      return { source: "jira-remote-links" };
    },
    async readConfluenceSpace(received: typeof request) {
      assert.equal(received, request);
      calls.push("confluence.space");
      return { source: "confluence-space" };
    },
    async readConfluencePage(received: typeof request) {
      assert.equal(received, request);
      calls.push("confluence.page");
      return { source: "confluence-page" };
    },
    async readConfluencePageMetadata(received: typeof request) {
      assert.equal(received, request);
      calls.push("confluence.page-metadata");
      return { source: "confluence-page-metadata" };
    },
    async readGithubRepository(received: typeof request) {
      assert.equal(received, request);
      calls.push("github.repository");
      return { source: "github-repository" };
    },
    async readGithubCommit(received: typeof request) {
      assert.equal(received, request);
      calls.push("github.commit");
      return { source: "github-commit" };
    },
    async readGithubFile(received: typeof request, path: string) {
      assert.equal(received, request);
      calls.push(`github.file:${path}`);
      return { source: path };
    },
  };

  const source = createCodexMcpTransportSource(caller, () => runAt);
  assertCodexMcpTransportSource(source);
  const payload = await source.read(request) as Record<string, unknown>;

  assert.deepEqual(calls.sort(), [
    "confluence.page",
    "confluence.page-metadata",
    "confluence.space",
    "github.commit",
    "github.file:docs/fixtures/G2AS-1.json",
    "github.file:docs/fixtures/G2AS-1.md",
    "github.repository",
    "jira.issue",
    "jira.remote-links",
  ]);
  assert.equal(payload.correlationId, `codex-mcp-${request.target.githubCommit}-2026-07-31T13-00-00.000Z`);
  assert.equal(payload.runAt, runAt);
  assert.deepEqual(payload.jira, { issue: { source: "jira-issue" }, remoteLinks: { source: "jira-remote-links" } });
  assert.deepEqual(payload.confluence, {
    space: { source: "confluence-space" },
    page: { page: { source: "confluence-page" }, metadata: { source: "confluence-page-metadata" } },
  });
  assert.deepEqual(payload.github, {
    repository: { source: "github-repository" },
    commit: { source: "github-commit" },
    files: {
      markdown: { source: "docs/fixtures/G2AS-1.md" },
      json: { source: "docs/fixtures/G2AS-1.json" },
    },
  });
});

test("Codex MCP tool caller: rejects an extra write-shaped method", () => {
  const caller = { ...readCaller(), write: async () => ({}) };

  assert.throws(
    () => assertCodexMcpToolCaller(caller),
    /Codex MCP tool caller rejected: unknown field\./,
  );
});

test("Codex MCP tool caller: propagates a failed read without retry", async () => {
  let attempts = 0;
  const caller = {
    ...readCaller(),
    async readGithubCommit() {
      attempts += 1;
      throw new Error("commit read failed");
    },
  };
  const source = createCodexMcpTransportSource(caller, () => runAt);

  await assert.rejects(
    () => source.read(request),
    (error: unknown) => error instanceof CodexMcpReadFailure && error.diagnosticCode === "SCOPE_UNVERIFIED" && error.source === "github",
  );
  assert.equal(attempts, 1);
});

function readCaller() {
  return {
    async readJiraIssue() { return {}; },
    async readJiraRemoteLinks() { return {}; },
    async readConfluenceSpace() { return {}; },
    async readConfluencePage() { return {}; },
    async readConfluencePageMetadata() { return {}; },
    async readGithubRepository() { return {}; },
    async readGithubCommit() { return {}; },
    async readGithubFile() { return {}; },
  };
}

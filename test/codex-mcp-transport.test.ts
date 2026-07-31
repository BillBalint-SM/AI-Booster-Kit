import assert from "node:assert/strict";
import { test } from "node:test";

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

test("Codex MCP transport: creates one frozen exact read request for the fixed target", () => {
  const request = createCodexMcpReadRequest(manifest);

  assert.deepEqual(request, {
    transport: "mcp",
    operation: "read",
    readOnly: true,
    target: {
      tenantUrl: "https://pte-politechnika.atlassian.net",
      jiraProjectKey: "G2AS",
      jiraIssueKey: "G2AS-1",
      confluenceSpaceKey: "G2AS",
      confluencePageId: "31752193",
      githubRepository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
      githubBranch: "main",
      githubCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
      fixturePathOne: "docs/fixtures/G2AS-1.md",
      fixturePathTwo: "docs/fixtures/G2AS-1.json",
    },
    allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"],
  });
  assert.equal(Object.isFrozen(request), true);
  assert.equal(Object.isFrozen(request.target), true);
  assert.equal(Object.isFrozen(request.allowedOperations), true);
});

test("Codex MCP transport: accepts only the exact read-only source shape", () => {
  const source = {
    host: "codex",
    transport: "mcp",
    readOnly: true,
    read: async () => ({}),
  };

  assert.doesNotThrow(() => assertCodexMcpTransportSource(source));
  assert.throws(
    () => assertCodexMcpTransportSource({ ...source, write: async () => ({}) }),
    /Codex MCP transport source rejected: unknown field\./,
  );
  assert.throws(
    () => assertCodexMcpTransportSource({ ...source, readOnly: false }),
    /Codex MCP transport source rejected: source is not read-only\./,
  );
});

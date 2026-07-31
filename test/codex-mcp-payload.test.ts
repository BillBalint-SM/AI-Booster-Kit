import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createCodexMcpPayloadAdapter,
  normalizeCodexMcpPayload,
} from "../src/evidence/codex-mcp-payload.js";
import { ingestCodexReadOnlyEvidence } from "../src/evidence/ingest.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import { readinessCapability } from "./readiness-capability.js";
import { createSyntheticCodexMcpPayload as rawPayload } from "./helpers/codex-mcp-payload.js";

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

const capabilityEvidence = {
  capabilityId: "github-readonly-evidence-v1",
  capabilityVersion: 1,
  host: "codex",
  scopeFingerprint: "695a5559f89ecb1856e699e6a9f3ba182af4ec8d6b7b0c724e7e071bd8741eb7",
  state: "verified",
} as const;

test("Codex MCP payload: normalizes issue, native links, ADF Smart Links, repository, commit, and fixtures", () => {
  const normalized = normalizeCodexMcpPayload(manifest, rawPayload(), capabilityEvidence);

  assert.equal(normalized.host, "codex");
  assert.equal(normalized.jira.issueKey, "G2AS-1");
  assert.equal(normalized.confluence.pageId, "31752193");
  assert.equal(normalized.github.commit, "d0971f75c526250f9ee65b8b3b044a4788b31a46");
  assert.equal(normalized.traceability.observedIds.confluenceGitReferenceKind, "smart_link");
  assert.equal(normalized.traceability.observedIds.confluenceJiraReferencedKey, "G2AS-1");
});

test("Codex MCP payload: joins the actual Confluence ADF page envelope with version metadata", () => {
  const payload = rawPayload();
  const directPage = payload.confluence.page;
  const compositePage = {
    page: {
      structuredContent: {
        content: {
          totalCount: 1,
          nodes: [{
            id: directPage.id,
            type: "page",
            subtype: "live",
            status: directPage.status,
            title: "[G2AS-1] Synthetic health-status badge projection",
            lastModified: "2026-07-31T10:00:00.000Z",
            summary: {},
            space: { key: "G2AS", name: "Gate 2 AI Sandbox" },
            _links: {},
            author: {},
            body: directPage.body,
            webUrl: "https://pte-politechnika.atlassian.net/wiki/pages/viewpage.action?pageId=31752193",
          }],
        },
      },
    },
    metadata: {
      structuredContent: {
        id: "ari:cloud:confluence:63a5e016-0f41-4b60-84ef-9210bd71a5bb:page/31752193",
        title: "[G2AS-1] Synthetic health-status badge projection",
        text: "G2AS-1 synthetic projection",
        url: "https://pte-politechnika.atlassian.net/wiki/pages/viewpage.action?pageId=31752193",
        type: "page",
        metadata: {
          cloudId: "63a5e016-0f41-4b60-84ef-9210bd71a5bb",
          spaceId: "31490050",
          authorId: "account-id",
          createdAt: "2026-07-29T10:00:00.000Z",
          status: "current",
          version: 2,
        },
      },
    },
  };
  (payload as unknown as { confluence: { page: unknown } }).confluence.page = compositePage;

  const normalized = normalizeCodexMcpPayload(manifest, payload, capabilityEvidence);

  assert.equal(normalized.confluence.pageId, "31752193");
  assert.equal(normalized.traceability.observedIds.confluenceGitReferenceKind, "smart_link");
});

test("Codex MCP payload: permits a harmless fixture prose mention but rejects a sensitive assignment", () => {
  const prosePayload = rawPayload();
  prosePayload.github.files.markdown.content = "No production, customer, personal, or credential data.";
  assert.doesNotThrow(() => normalizeCodexMcpPayload(manifest, prosePayload, capabilityEvidence));

  const unsafePayload = rawPayload();
  unsafePayload.github.files.markdown.content = "token: secret-value";
  assert.throws(
    () => normalizeCodexMcpPayload(manifest, unsafePayload, capabilityEvidence),
    /Codex MCP payload normalization rejected: GitHub fixture content\./,
  );
});

test("Codex MCP payload: fails closed when native Git traceability is missing", () => {
  const withoutSmartLink = rawPayload();
  withoutSmartLink.confluence.page.body.content = withoutSmartLink.confluence.page.body.content.filter(
    (paragraph) => !paragraph.content.some((node) => node.type === "inlineCard" && node.attrs?.url?.includes("github.com")),
  );

  assert.throws(
    () => normalizeCodexMcpPayload(manifest, withoutSmartLink, capabilityEvidence),
    /Codex MCP payload normalization rejected: GitHub native card mapping is not unique\./,
  );
});

test("Codex MCP payload: accepts the actual MCP text envelopes for remote links and Atlassian reads", () => {
  const payload = rawPayload() as unknown as {
    jira: { remoteLinks: unknown };
    confluence: { space: unknown; page: unknown };
  };
  const direct = rawPayload();
  payload.jira.remoteLinks = textEnvelope(direct.jira.remoteLinks);
  payload.confluence.space = textEnvelope(direct.confluence.space);
  payload.confluence.page = textEnvelope(direct.confluence.page);

  const normalized = normalizeCodexMcpPayload(manifest, payload, capabilityEvidence);

  assert.equal(normalized.traceability.observedIds.jiraGitLinkId, "10099");
  assert.equal(normalized.traceability.observedIds.confluenceGitReferenceKind, "smart_link");
});

test("Codex MCP payload: adapter feeds one normalized raw read into the read-only ingestion boundary", async () => {
  let calls = 0;
  const adapter = createCodexMcpPayloadAdapter({
    host: "codex",
    transport: "mcp",
    readOnly: true,
    async read(request) {
      calls += 1;
      assert.equal(request.transport, "mcp");
      assert.equal(request.operation, "read");
      assert.equal(request.readOnly, true);
      assert.equal(request.target.jiraIssueKey, "G2AS-1");
      assert.equal(request.target.githubCommit, "d0971f75c526250f9ee65b8b3b044a4788b31a46");
      return rawPayload();
    },
  }, capabilityEvidence);

  const result = await ingestCodexReadOnlyEvidence(manifest, adapter, readinessCapability);

  assert.equal(calls, 1);
  assert.equal(result.certificate.decision, "READY");
  assert.deepEqual(result.certificate.checks.map((check) => check.state), ["verified", "verified", "verified", "verified"]);
});

function textEnvelope(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], isError: false };
}

import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rm, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import type { CodexMcpToolCaller } from "../src/evidence/codex-mcp-tool-caller.js";
import { runCodexMcpPreflight } from "../src/evidence/codex-mcp-preflight.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import { readinessCapability } from "./readiness-capability.js";
import { createSyntheticCodexMcpPayload } from "./helpers/codex-mcp-payload.js";

const manifest = parseG2asReadinessManifest(JSON.parse(
  await readFile(resolve("contract/readiness/g2as-sandbox-target.json"), "utf8"),
) as unknown);
const capabilityEvidence = {
  capabilityId: "github-readonly-evidence-v1",
  capabilityVersion: 1,
  host: "codex",
  scopeFingerprint: "695a5559f89ecb1856e699e6a9f3ba182af4ec8d6b7b0c724e7e071bd8741eb7",
  state: "verified",
} as const;

test("Codex MCP preflight: performs the nine reads and writes only safe certificates", async () => {
  const root = await mkdtemp(join(tmpdir(), "g2as-codex-mcp-preflight-"));

  try {
    const payload = await readRawPayload();
    const calls: string[] = [];
    const caller = createCaller(payload, calls);
    const result = await runCodexMcpPreflight({
      manifest,
      capability: readinessCapability,
      capabilityEvidence,
      caller,
      getRunTimestamp: () => "2026-07-31T14:00:00.000Z",
      outputDirectory: join(root, "output"),
    });

    assert.equal(result.certificate.decision, "READY");
    assert.equal(result.certificate.externalWriteCount, 0);
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
    assert.deepEqual((await readdir(join(root, "output"))).sort(), [
      "g2as-sandbox-readiness-certificate.json",
      "g2as-sandbox-readiness-certificate.md",
    ]);
    assert.equal(result.outputPaths.json, join(root, "output", "g2as-sandbox-readiness-certificate.json"));
    assert.equal(result.outputPaths.markdown, join(root, "output", "g2as-sandbox-readiness-certificate.md"));
    assert.equal(JSON.parse(await readFile(result.outputPaths.json, "utf8")).decision, "READY");
    assert.match(await readFile(result.outputPaths.markdown, "utf8"), /Decision: READY/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Codex MCP preflight: preserves a safe STOPPED certificate for a mismatched read", async () => {
  const root = await mkdtemp(join(tmpdir(), "g2as-codex-mcp-preflight-"));

  try {
    const payload = await readRawPayload();
    payload.github.commit.structuredContent.commit.sha = "0000000000000000000000000000000000000000";

    const result = await runCodexMcpPreflight({
        manifest,
        capability: readinessCapability,
        capabilityEvidence,
        caller: createCaller(payload, []),
        getRunTimestamp: () => "2026-07-31T14:00:00.000Z",
        outputDirectory: join(root, "output"),
      });
    assert.equal(result.certificate.decision, "STOPPED");
    assert.deepEqual((await readdir(join(root, "output"))).sort(), [
      "g2as-sandbox-readiness-certificate.json",
      "g2as-sandbox-readiness-certificate.md",
    ]);
    assert.equal(JSON.parse(await readFile(result.outputPaths.json, "utf8")).externalWriteCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Codex MCP preflight: does not replace an existing output directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "g2as-codex-mcp-preflight-"));

  try {
    const outputDirectory = join(root, "output");
    const payload = await readRawPayload();
    await mkdir(outputDirectory);
    await writeFile(join(outputDirectory, "sentinel.txt"), "keep", "utf8");

    await assert.rejects(
      () => runCodexMcpPreflight({
        manifest,
        capability: readinessCapability,
        capabilityEvidence,
        caller: createCaller(payload, []),
        getRunTimestamp: () => "2026-07-31T14:00:00.000Z",
        outputDirectory,
      }),
    );
    assert.deepEqual(await readdir(outputDirectory), ["sentinel.txt"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function readRawPayload(): Promise<RawPayload> {
  const payload = createSyntheticCodexMcpPayload();
  return {
    jira: payload.jira,
    confluence: {
      space: payload.confluence.space,
      page: confluencePageEnvelope(payload.confluence.page),
      pageMetadata: confluencePageMetadata(),
    },
    github: {
      repository: payload.github.repository,
      commit: { structuredContent: payload.github.commit },
      markdown: { structuredContent: payload.github.files.markdown },
      json: { structuredContent: payload.github.files.json },
    },
  } as RawPayload;
}

function confluencePageEnvelope(page: ReturnType<typeof createSyntheticCodexMcpPayload>["confluence"]["page"]) {
  return { structuredContent: { content: { totalCount: 1, nodes: [{ id: page.id, type: "page", subtype: "live", status: page.status, title: "[G2AS-1] Synthetic health-status badge projection", lastModified: "2026-07-31T10:00:00.000Z", summary: {}, space: { key: "G2AS", name: "Gate 2 AI Sandbox" }, _links: {}, author: {}, body: page.body, webUrl: "https://pte-politechnika.atlassian.net/wiki/pages/viewpage.action?pageId=31752193" }] } } };
}

function confluencePageMetadata() {
  return { structuredContent: { id: "ari:cloud:confluence:63a5e016-0f41-4b60-84ef-9210bd71a5bb:page/31752193", title: "[G2AS-1] Synthetic health-status badge projection", text: "G2AS-1 synthetic projection", url: "https://pte-politechnika.atlassian.net/wiki/pages/viewpage.action?pageId=31752193", type: "page", metadata: { cloudId: "63a5e016-0f41-4b60-84ef-9210bd71a5bb", spaceId: "31490050", authorId: "account-id", createdAt: "2026-07-29T10:00:00.000Z", status: "current", version: 2 } } };
}

function createCaller(payload: RawPayload, calls: string[]): CodexMcpToolCaller {
  return {
    readJiraIssue: async (request) => { assertRequest(request); calls.push("jira.issue"); return payload.jira.issue; },
    readJiraRemoteLinks: async (request) => { assertRequest(request); calls.push("jira.remote-links"); return payload.jira.remoteLinks; },
    readConfluenceSpace: async (request) => { assertRequest(request); calls.push("confluence.space"); return payload.confluence.space; },
    readConfluencePage: async (request) => { assertRequest(request); calls.push("confluence.page"); return payload.confluence.page; },
    readConfluencePageMetadata: async (request) => { assertRequest(request); calls.push("confluence.page-metadata"); return payload.confluence.pageMetadata; },
    readGithubRepository: async (request) => { assertRequest(request); calls.push("github.repository"); return payload.github.repository; },
    readGithubCommit: async (request) => { assertRequest(request); calls.push("github.commit"); return payload.github.commit; },
    readGithubFile: async (request, path) => {
      assertRequest(request);
      calls.push(`github.file:${path}`);
      return path === "docs/fixtures/G2AS-1.md" ? payload.github.markdown : payload.github.json;
    },
  };
}

function assertRequest(request: { readonly operation: string; readonly readOnly: boolean }): void {
  assert.equal(request.operation, "read");
  assert.equal(request.readOnly, true);
}

interface RawPayload {
  readonly jira: { readonly issue: unknown; readonly remoteLinks: unknown };
  readonly confluence: { readonly space: unknown; readonly page: unknown; readonly pageMetadata: unknown };
  readonly github: {
    readonly repository: unknown;
    readonly commit: { structuredContent: { commit: { sha: string } } };
    readonly markdown: unknown;
    readonly json: unknown;
  };
}

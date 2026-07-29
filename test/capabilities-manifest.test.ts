import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import { githubScopeFingerprint, loadGithubReadOnlyCapability, parseGithubReadOnlyCapability } from "../src/capabilities/manifest.js";

const validManifest = {
  version: 1,
  capabilityId: "github-readonly-evidence-v1",
  allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"],
  prohibitedOperations: ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"],
  requiredHosts: ["codex", "claude-code", "cursor"],
  requiredConfluenceGitReferenceKind: "smart_link",
} as const;

test("capability manifest: parses the canonical read-only scope", async () => {
  const capability = parseGithubReadOnlyCapability(validManifest);
  assert.deepEqual(capability, validManifest);
  assert.equal((await loadGithubReadOnlyCapability(resolve("contract/mcp-capabilities/github-readonly.json"))).capabilityId, capability.capabilityId);
  assert.match(githubScopeFingerprint(capability), /^[a-f0-9]{64}$/);
});

test("capability manifest: rejects unknown, broadened, and unsafe declarations without echoing values", () => {
  for (const value of [
    { ...validManifest, extra: "unexpected" },
    { ...validManifest, allowedOperations: [...validManifest.allowedOperations, "pull_request.read"] },
    { ...validManifest, prohibitedOperations: ["write"] },
    { ...validManifest, capabilityId: "token-secret-value" },
  ]) {
    assert.throws(() => parseGithubReadOnlyCapability(value), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /token-secret-value|pull_request\.read/);
      return true;
    });
  }
});

test("capability manifest: fingerprints are stable for equivalent records", () => {
  const first = parseGithubReadOnlyCapability(validManifest);
  const second = parseGithubReadOnlyCapability(JSON.parse(JSON.stringify(validManifest)) as unknown);
  assert.equal(githubScopeFingerprint(first), githubScopeFingerprint(second));
});

test("capability manifest: checked-in source is valid JSON", async () => {
  assert.deepEqual(JSON.parse(await readFile(resolve("contract/mcp-capabilities/github-readonly.json"), "utf8")), validManifest);
});

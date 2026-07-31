import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import { githubScopeFingerprint, parseGithubReadOnlyCapability } from "../src/capabilities/manifest.js";
import { parseGithubCapabilityTemplate, renderGithubCapabilityTemplate } from "../src/capabilities/projections.js";
import type { AgentHost } from "../src/contract/markdown.js";

const capability = parseGithubReadOnlyCapability({
  version: 1,
  capabilityId: "github-readonly-evidence-v1",
  allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"],
  prohibitedOperations: ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"],
  requiredHosts: ["codex", "claude-code", "cursor"],
  requiredConfluenceGitReferenceKind: "smart_link",
});

test("capability projections: all hosts preserve one semantic contract", async () => {
  const hosts: AgentHost[] = ["codex", "claude-code", "cursor"];
  const parsed = hosts.map((host) => parseGithubCapabilityTemplate(renderGithubCapabilityTemplate(capability, host)));
  assert.deepEqual(parsed.map((template) => template.semanticContract), [parsed[0]?.semanticContract, parsed[0]?.semanticContract, parsed[0]?.semanticContract]);
  assert.deepEqual(parsed.map((template) => template.scopeFingerprint), hosts.map(() => githubScopeFingerprint(capability)));
  assert.deepEqual(parsed.map((template) => template.targetHost), hosts);
  for (const template of parsed) assert.equal(template.semanticContract.requiredConfluenceGitReferenceKind, "smart_link");
});

test("capability projections: checked-in templates are deterministic and declarative", async () => {
  for (const host of ["codex", "claude-code", "cursor"] as const) {
    const path = resolve(`templates/hosts/${host}-github-readonly-capability.md`);
    const actual = (await readFile(path, "utf8")).replaceAll("\r\n", "\n");
    assert.equal(actual, renderGithubCapabilityTemplate(capability, host));
    assert.doesNotMatch(actual, /https?:\/\/|authorization|cookie|password|token|oauth/i);
  }
});

test("capability projections: scope drift is rejected", () => {
  const rendered = renderGithubCapabilityTemplate(capability, "codex");
  assert.throws(() => parseGithubCapabilityTemplate(rendered.replace(githubScopeFingerprint(capability), "0".repeat(64))), /fingerprint/);
  assert.throws(() => parseGithubCapabilityTemplate(rendered.replace("- merge", "- pull_request.read")), /operation|semantic/);
});

import assert from "node:assert/strict";
import { mkdir, realpath, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import {
  executionBindingPolicy,
  parseExecutionBindingPolicy,
} from "../src/execution/binding/policy.js";
import { resolveExecutionSourcePathScope } from "../src/execution/binding/source-path.js";
import { resolveExecutionWorkspaceStorage } from "../src/execution/workspace-storage.js";
import { createExecutionGitFixture } from "./helpers/execution-git-fixture.js";

const policy = parseExecutionBindingPolicy(executionBindingPolicy);

test("source path scope resolves the database-bound whole worktree without an implicit default", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const location = await resolveExecutionWorkspaceStorage({
    platform: process.platform,
    workspaceRoot: fixture.workspaceRoot,
    appDataRoot: fixture.appDataRoot,
  });
  const canonicalWorkspaceRoot = await realpath(fixture.workspaceRoot);

  const resolved = await resolveExecutionSourcePathScope({
    platform: process.platform,
    workspaceRoot: fixture.workspaceRoot,
    expectedWorkspaceIdentityDigest: location.workspaceIdentityDigest,
    auditedPaths: ["."],
  }, policy);

  assert.deepEqual(resolved, {
    state: "RESOLVED",
    workspaceRoot: canonicalWorkspaceRoot,
    workspaceIdentityDigest: location.workspaceIdentityDigest,
    workspaceMatchesExpected: true,
    auditedPaths: ["."],
  });
  await assert.rejects(
    () => resolveExecutionSourcePathScope({
      platform: process.platform,
      workspaceRoot: fixture.workspaceRoot,
      expectedWorkspaceIdentityDigest: location.workspaceIdentityDigest,
      auditedPaths: [],
    }, policy),
    /PATH_ESCAPE/u,
  );
});

test("source path scope sorts explicit literal paths and preserves a known workspace mismatch", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);

  const resolved = await resolveExecutionSourcePathScope({
    platform: process.platform,
    workspaceRoot: fixture.workspaceRoot,
    expectedWorkspaceIdentityDigest: "f".repeat(64),
    auditedPaths: ["src/alpha.txt", "docs/guide.md"],
  }, policy);

  assert.equal(resolved.state, "RESOLVED");
  if (resolved.state === "RESOLVED") {
    assert.deepEqual(resolved.auditedPaths, ["docs/guide.md", "src/alpha.txt"]);
    assert.equal(resolved.workspaceMatchesExpected, false);
    assert.notEqual(resolved.workspaceIdentityDigest, "f".repeat(64));
  }
});

test("source path scope rejects traversal, absolute, wildcard, non-canonical, duplicate, and mixed whole-worktree input", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const invalidScopes = [
    [".", "src"],
    ["../outside"],
    ["src/../outside"],
    ["./src"],
    ["src//alpha.txt"],
    ["src\\alpha.txt"],
    ["/absolute"],
    ["C:/absolute"],
    ["//server/share"],
    ["src/*"],
    ["src/alpha.txt", "src/alpha.txt"],
    ["src/\0alpha.txt"],
  ];

  for (const auditedPaths of invalidScopes) {
    await assert.rejects(
      () => resolveExecutionSourcePathScope({
        platform: process.platform,
        workspaceRoot: fixture.workspaceRoot,
        expectedWorkspaceIdentityDigest: "a".repeat(64),
        auditedPaths,
      }, policy),
      /PATH_ESCAPE/u,
    );
  }
});

test("source path scope enforces exact count and UTF-8 byte limits before filesystem traversal", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const exactCount = Array.from({ length: policy.maxAuditedPaths }, (_, index) => `missing/p${String(index).padStart(3, "0")}`);
  const exactPath = `missing/${"a".repeat(policy.maxAuditedPathBytes - Buffer.byteLength("missing/", "utf8"))}`;

  const countResult = await resolveExecutionSourcePathScope({
    platform: process.platform,
    workspaceRoot: fixture.workspaceRoot,
    expectedWorkspaceIdentityDigest: "a".repeat(64),
    auditedPaths: exactCount,
  }, policy);
  const pathResult = await resolveExecutionSourcePathScope({
    platform: process.platform,
    workspaceRoot: fixture.workspaceRoot,
    expectedWorkspaceIdentityDigest: "a".repeat(64),
    auditedPaths: [exactPath],
  }, policy);
  assert.equal(countResult.state, "RESOLVED");
  assert.equal(pathResult.state, "RESOLVED");

  for (const auditedPaths of [
    [...exactCount, "missing/overflow"],
    [`${exactPath}x`],
    ["é".repeat(Math.floor(policy.maxAuditedPathBytes / 2) + 1)],
  ]) {
    await assert.rejects(
      () => resolveExecutionSourcePathScope({
        platform: process.platform,
        workspaceRoot: fixture.workspaceRoot,
        expectedWorkspaceIdentityDigest: "a".repeat(64),
        auditedPaths,
      }, policy),
      /PATH_ESCAPE/u,
    );
  }
});

test("source path scope returns UNKNOWN for an unavailable well-formed root without exposing it", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const missingRoot = join(fixture.root, "missing-workspace");

  const observation = await resolveExecutionSourcePathScope({
    platform: process.platform,
    workspaceRoot: missingRoot,
    expectedWorkspaceIdentityDigest: "a".repeat(64),
    auditedPaths: ["src/alpha.txt"],
  }, policy);

  assert.deepEqual(observation, {
    state: "UNKNOWN",
    workspaceRoot: null,
    workspaceIdentityDigest: null,
    workspaceMatchesExpected: false,
    auditedPaths: ["src/alpha.txt"],
    reasonCodes: ["SOURCE_UNREADABLE"],
  });
  assert.equal(JSON.stringify(observation).includes(missingRoot), false);
});

test("source path scope rejects linked roots and audited junction ancestors", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const outside = join(fixture.root, "outside");
  const rootLink = join(fixture.root, "workspace-link");
  const nestedLink = join(fixture.workspaceRoot, "linked");
  await mkdir(outside);
  try {
    await symlink(fixture.workspaceRoot, rootLink, process.platform === "win32" ? "junction" : "dir");
    await symlink(outside, nestedLink, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (isPermissionError(error)) {
      context.skip("host cannot create a symlink/junction fixture");
      return;
    }
    throw error;
  }

  for (const [workspaceRoot, auditedPaths] of [
    [rootLink, ["."]],
    [fixture.workspaceRoot, ["linked/file.txt"]],
  ] as const) {
    await assert.rejects(
      () => resolveExecutionSourcePathScope({
        platform: process.platform,
        workspaceRoot,
        expectedWorkspaceIdentityDigest: "a".repeat(64),
        auditedPaths,
      }, policy),
      /SYMLINK_BOUNDARY/u,
    );
  }
});

function isPermissionError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "EPERM" || error.code === "EACCES");
}

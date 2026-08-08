import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { runBoundedProcess } from "../src/execution/binding/bounded-process.js";
import { parseGitPorcelainV2, parseGitRevision } from "../src/execution/binding/git-observer.js";
import { executionBindingPolicy, parseExecutionBindingPolicy } from "../src/execution/binding/policy.js";
import { observeExecutionSource } from "../src/execution/binding/source-observer.js";
import { resolveExecutionWorkspaceStorage } from "../src/execution/workspace-storage.js";
import {
  addDirtySubmodule,
  cloneFixtureRepository,
  createExecutionGitFixture,
  createSiblingWorktree,
  git,
} from "./helpers/execution-git-fixture.js";

const policy = parseExecutionBindingPolicy(executionBindingPolicy);
const observedAt = "2026-08-08T22:10:00.000Z";
const workerPath = fileURLToPath(new URL("./fixtures/execution/bounded-process-worker.js", import.meta.url));

test("bounded process preserves exact binary output through the limit", async () => {
  for (const amount of [63, 64]) {
    const result = await runWorker("stdout", amount, 1000, 64, null);
    assert.equal(result.state, "SUCCEEDED");
    if (result.state === "SUCCEEDED") {
      assert.equal(result.stdout.length, amount);
      assert.equal(result.stderr.length, 0);
    }
  }
  const nul = await runWorker("nul", 0, 1000, 64, null);
  assert.equal(nul.state, "SUCCEEDED");
  if (nul.state === "SUCCEEDED") assert.deepEqual([...nul.stdout], [0x61, 0x00, 0x62]);
});

test("bounded process rejects either stream one byte over and reports confirmed closure", async () => {
  for (const mode of ["stdout", "stderr"] as const) {
    const result = await runWorker(mode, 65, 1000, 64, null);
    assert.deepEqual(result, {
      state: "FAILED",
      failure: "OUTPUT_LIMIT",
      exitCode: null,
      terminated: true,
    });
  }
});

test("bounded process distinguishes timeout, non-zero exit, and spawn failure", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "execution-bounded-process-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const markerPath = join(root, "marker.txt");
  const timedOut = await runWorker("delayed-marker", 250, 30, 64, markerPath);
  assert.deepEqual(timedOut, { state: "FAILED", failure: "TIMEOUT", exitCode: null, terminated: true });
  await new Promise((resolve) => setTimeout(resolve, 300));
  await assert.rejects(() => access(markerPath));

  assert.deepEqual(await runWorker("exit", 7, 1000, 64, null), {
    state: "FAILED",
    failure: "NON_ZERO_EXIT",
    exitCode: 7,
    terminated: true,
  });
  assert.deepEqual(await runBoundedProcess({
    executable: join(root, "missing-executable"),
    args: [],
    environment: {},
    timeoutMs: 1000,
    maxOutputBytes: 64,
  }), {
    state: "FAILED",
    failure: "SPAWN_FAILURE",
    exitCode: null,
    terminated: true,
  });
});

test("source observer creates deterministic clean evidence without raw local paths", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const first = await observeFixture(fixture, fixture.revision, ["."]);
  const second = await observeFixture(fixture, fixture.revision, ["."]);

  assert.deepEqual(second, first);
  assert.equal(first.dirtyState, "CLEAN");
  assert.deepEqual(first.reasonCodes, []);
  assert.equal(first.observedSourceRevision, fixture.revision);
  assert.match(first.repositoryIdentityDigest ?? "", /^[a-f0-9]{64}$/u);
  assert.match(first.worktreeIdentityDigest ?? "", /^[a-f0-9]{64}$/u);
  assert.match(first.workspaceIdentityDigest ?? "", /^[a-f0-9]{64}$/u);
  assert.match(first.sourceStateDigest, /^[a-f0-9]{64}$/u);
  assert.match(first.evidenceDigest, /^[a-f0-9]{64}$/u);
  assert.match(first.observationId, /^[a-f0-9]{64}$/u);
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes(fixture.root), false);
  assert.equal(serialized.includes("src/alpha.txt"), false);
});

test("source observer classifies real Git dirty records and ignores excluded or ignored paths", async (context) => {
  const cases: readonly [string, (root: string) => Promise<void>][] = [
    ["staged", async (root) => { await writeFile(join(root, "src", "alpha.txt"), "staged\n", "utf8"); await git(root, ["add", "src/alpha.txt"]); }],
    ["unstaged", async (root) => { await writeFile(join(root, "src", "alpha.txt"), "unstaged\n", "utf8"); }],
    ["untracked", async (root) => { await writeFile(join(root, "new.txt"), "new\n", "utf8"); }],
    ["rename", async (root) => { await git(root, ["mv", "src/alpha.txt", "src/beta.txt"]); }],
    ["delete", async (root) => { await rm(join(root, "src", "alpha.txt")); }],
    ["type-change", async (root) => { await git(root, ["update-index", "--chmod=+x", "src/alpha.txt"]); }],
  ];
  for (const [name, mutate] of cases) {
    const fixture = await createExecutionGitFixture();
    context.after(fixture.cleanup);
    await mutate(fixture.workspaceRoot);
    const result = await observeFixture(fixture, fixture.revision, ["."]);
    assert.equal(result.dirtyState, "DIRTY", name);
    assert.deepEqual(result.reasonCodes, ["WORKTREE_DIRTY_IN_SCOPE"], name);
  }

  const ignored = await createExecutionGitFixture();
  context.after(ignored.cleanup);
  await writeFile(join(ignored.workspaceRoot, "ignored.log"), "ignored\n", "utf8");
  assert.equal((await observeFixture(ignored, ignored.revision, ["."])).dirtyState, "CLEAN");

  const subset = await createExecutionGitFixture();
  context.after(subset.cleanup);
  await writeFile(join(subset.workspaceRoot, "docs", "guide.md"), "outside scope\n", "utf8");
  assert.equal((await observeFixture(subset, subset.revision, ["src/alpha.txt"])).dirtyState, "CLEAN");
});

test("source observer classifies unmerged and dirty submodule porcelain records", async (context) => {
  const conflict = await createExecutionGitFixture();
  context.after(conflict.cleanup);
  await git(conflict.workspaceRoot, ["checkout", "-b", "side"]);
  await writeFile(join(conflict.workspaceRoot, "src", "alpha.txt"), "side\n", "utf8");
  await git(conflict.workspaceRoot, ["commit", "-am", "side change"]);
  await git(conflict.workspaceRoot, ["checkout", "main"]);
  await writeFile(join(conflict.workspaceRoot, "src", "alpha.txt"), "main\n", "utf8");
  await git(conflict.workspaceRoot, ["commit", "-am", "main change"]);
  await assert.rejects(() => git(conflict.workspaceRoot, ["merge", "side"]));
  assert.equal((await observeFixture(conflict, (await git(conflict.workspaceRoot, ["rev-parse", "HEAD"])).trim(), ["."])).dirtyState, "DIRTY");

  const submodule = await createExecutionGitFixture();
  context.after(submodule.cleanup);
  await addDirtySubmodule(submodule);
  const revision = (await git(submodule.workspaceRoot, ["rev-parse", "HEAD"])).trim();
  assert.equal((await observeFixture(submodule, revision, ["."])).dirtyState, "DIRTY");
});

test("source observer distinguishes revision, workspace, and worktree identities", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const matching = await observeFixture(fixture, fixture.revision, ["."]);
  const mismatched = await observeFixture(fixture, "b".repeat(40), ["."]);
  assert.deepEqual(mismatched.reasonCodes, ["SOURCE_REVISION_MISMATCH"]);

  await git(fixture.workspaceRoot, ["checkout", "--detach", fixture.revision]);
  const detached = await observeFixture(fixture, fixture.revision, ["."]);
  assert.equal(detached.observedSourceRevision, fixture.revision);
  assert.equal(detached.dirtyState, "CLEAN");

  const siblingRoot = await createSiblingWorktree(fixture, "sibling");
  const sibling = await observeAtRoot(siblingRoot, fixture.revision, matching.workspaceIdentityDigest ?? "", ["."]);
  assert.equal(sibling.repositoryIdentityDigest, matching.repositoryIdentityDigest);
  assert.notEqual(sibling.worktreeIdentityDigest, matching.worktreeIdentityDigest);
  assert.deepEqual(sibling.reasonCodes, ["WORKSPACE_IDENTITY_MISMATCH"]);

  const cloneRoot = await cloneFixtureRepository(fixture, "clone");
  const clone = await observeAtRoot(cloneRoot, fixture.revision, matching.workspaceIdentityDigest ?? "", ["."]);
  assert.notEqual(clone.repositoryIdentityDigest, matching.repositoryIdentityDigest);
  assert.notEqual(clone.worktreeIdentityDigest, matching.worktreeIdentityDigest);
  assert.deepEqual(clone.reasonCodes, ["WORKSPACE_IDENTITY_MISMATCH"]);
});

test("source observer returns a complete UNKNOWN receipt for an unborn repository", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "execution-unborn-source-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "app-data");
  await mkdir(workspaceRoot);
  await mkdir(appDataRoot);
  await git(workspaceRoot, ["init", "--initial-branch=main"]);
  const storage = await resolveExecutionWorkspaceStorage({ platform: process.platform, workspaceRoot, appDataRoot });
  const result = await observeAtRoot(workspaceRoot, "a".repeat(40), storage.workspaceIdentityDigest, ["."]);

  assert.equal(result.dirtyState, "UNKNOWN");
  assert.equal(result.observedSourceRevision, null);
  assert.deepEqual(result.reasonCodes, ["SOURCE_UNREADABLE"]);
  assert.match(result.observationId, /^[a-f0-9]{64}$/u);
});

test("porcelain parser rejects unknown and truncated records instead of treating them as clean", () => {
  for (const output of [Buffer.from("x unsupported\0"), Buffer.from("2 M. N... 100644 100644 100644 a b R100 renamed\0")]) {
    assert.throws(() => parseGitPorcelainV2(output), /EXECUTION_GIT_STATUS_INVALID/u);
  }
  assert.equal(parseGitRevision(Buffer.from(`${"a".repeat(40)}\n`), "sha1"), "a".repeat(40));
  for (const output of [Buffer.from("not-a-revision\n"), Buffer.from(`${"a".repeat(40)}\nextra\n`), Buffer.from([0xff])]) {
    assert.throws(() => parseGitRevision(output, "sha1"), /EXECUTION_GIT_IDENTITY_INVALID/u);
  }
});

test("source observation leaves Git head, index, config, and status unchanged", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  await writeFile(join(fixture.workspaceRoot, "src", "alpha.txt"), "dirty\n", "utf8");
  const before = await repositorySnapshot(fixture.workspaceRoot);
  await observeFixture(fixture, fixture.revision, ["."]);
  assert.deepEqual(await repositorySnapshot(fixture.workspaceRoot), before);
});

test("source observer isolates Git from non-allowlisted inherited environment", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const previousGitDirectory = process.env.GIT_DIR;
  process.env.GIT_DIR = join(fixture.root, "host-injected-git-directory");
  try {
    const result = await observeFixture(fixture, fixture.revision, ["."]);
    assert.equal(result.dirtyState, "CLEAN");
    assert.deepEqual(result.reasonCodes, []);
  } finally {
    if (previousGitDirectory === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDirectory;
  }
});

async function observeFixture(
  fixture: { workspaceRoot: string; appDataRoot: string },
  expectedSourceRevision: string,
  auditedPaths: readonly string[],
) {
  const storage = await resolveExecutionWorkspaceStorage({
    platform: process.platform,
    workspaceRoot: fixture.workspaceRoot,
    appDataRoot: fixture.appDataRoot,
  });
  return observeAtRoot(fixture.workspaceRoot, expectedSourceRevision, storage.workspaceIdentityDigest, auditedPaths);
}

async function observeAtRoot(
  workspaceRoot: string,
  expectedSourceRevision: string,
  workspaceIdentityDigest: string,
  auditedPaths: readonly string[],
) {
  return observeExecutionSource({
    sourceId: "source-main",
    platform: process.platform,
    workspaceRoot,
    expectedSourceRevision,
    auditedPaths,
    observedAt,
  }, { workspaceIdentityDigest }, policy);
}

function runWorker(mode: string, amount: number, timeoutMs: number, maxOutputBytes: number, markerPath: string | null) {
  const args = [workerPath, mode, String(amount)];
  if (markerPath !== null) args.push(markerPath);
  return runBoundedProcess({
    executable: process.execPath,
    args,
    environment: {},
    timeoutMs,
    maxOutputBytes,
  });
}

async function repositorySnapshot(workspaceRoot: string): Promise<readonly string[]> {
  const head = await git(workspaceRoot, ["--no-optional-locks", "rev-parse", "HEAD"]);
  const status = await git(workspaceRoot, ["--no-optional-locks", "status", "--porcelain=v2", "-z", "--untracked-files=all"]);
  const config = await git(workspaceRoot, ["--no-optional-locks", "config", "--local", "--list"]);
  const index = await readFile(join(workspaceRoot, ".git", "index")).then((value) => value.toString("base64"));
  const content = await readFile(join(workspaceRoot, "src", "alpha.txt"), "utf8");
  return [head, status, config, index, content];
}

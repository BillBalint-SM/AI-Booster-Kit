import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { join } from "node:path";
import { test } from "node:test";

import { readBoundedJsonInput } from "../src/execution/cli-input.js";
import { executionBindingPolicy, parseExecutionBindingPolicy } from "../src/execution/binding/policy.js";
import type { HostCapabilityId, HostEvidenceReceipt } from "../src/execution/binding/types.js";
import { canonicalExecutionJson } from "../src/execution/identity.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";
import {
  cloneFixtureRepository,
  createExecutionGitFixture,
  createSiblingWorktree,
  git,
} from "./helpers/execution-git-fixture.js";

const policy = parseExecutionBindingPolicy(executionBindingPolicy);
const primaryThreadId = "11111111-2222-4333-8444-555555555555";
const changedThreadId = "22222222-3333-4444-8555-666666666666";

test("bounded JSON reader handles empty, UTF-8 chunks, exact limits, overflow destruction, and stream errors", async () => {
  await assert.rejects(() => readBoundedJsonInput(Readable.from([]), 64), /EXECUTION_INPUT_JSON_INVALID/u);
  const utf8 = Buffer.from('{"text":"árvíz"}', "utf8");
  const parsed = await readBoundedJsonInput(Readable.from([utf8.subarray(0, 10), utf8.subarray(10, 11), utf8.subarray(11)]), utf8.length);
  assert.deepEqual(parsed, { text: "árvíz" });

  const exact = Buffer.from('{"a":1} ', "utf8");
  assert.deepEqual(await readBoundedJsonInput(Readable.from([exact]), exact.length), { a: 1 });
  const overflow = Readable.from([exact, Buffer.from(" ")]);
  await assert.rejects(() => readBoundedJsonInput(overflow, exact.length), /COMMAND_INPUT_TOO_LARGE/u);
  assert.equal(overflow.destroyed, true);

  const failing = new Readable({
    read() {
      this.destroy(new Error("synthetic stream failure with secret marker"));
    },
  });
  await assert.rejects(
    () => readBoundedJsonInput(failing, 64),
    (error: unknown) => error instanceof Error
      && error.message.includes("EXECUTION_INPUT_JSON_INVALID")
      && !error.message.includes("secret marker"),
  );
});

test("CLI help and argument routing expose only the two bounded read-only binding commands", async () => {
  const help = await runBuiltCli(["--help"], null, primaryThreadId);
  assert.equal(help.code, 0);
  assert.equal(help.stdout.includes("create-execution-host-receipt  Read one --database/--run and create bounded host evidence"), true);
  assert.equal(help.stdout.includes("inspect-execution-dispatch-readiness  Read one --database/--run/--node and inspect bounded readiness"), true);

  for (const command of ["create-execution-host-receipt", "inspect-execution-dispatch-readiness"]) {
    const response = await runBuiltCli([command], null, primaryThreadId);
    assert.equal(response.code, 4);
    assert.deepEqual(JSON.parse(response.stdout), {
      operation: "REJECTED",
      mutation: "NONE",
      error: { code: "COMMAND_ARGUMENTS_INVALID" },
    });
  }
});

test("binding CLI produces READY from a real immutable run and changes neither SQLite nor Git", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const locator = await prepareBindingRun(fixture, primaryThreadId);
  const databaseBefore = await readFile(locator.databasePath);
  const gitBefore = await git(fixture.workspaceRoot, ["--no-optional-locks", "status", "--porcelain=v2", "-z"]);

  const host = await createHostReceipt(locator, primaryThreadId, "CODEX_APP_NATIVE_V1", "SUPPORTED", "PROVEN", "OBSERVED");
  const readiness = await inspectReadiness(locator, fixture.workspaceRoot, host, primaryThreadId);

  assert.equal(readiness.response.code, 0, `${readiness.response.stdout}${readiness.response.stderr}`);
  assert.equal(readiness.body.readinessReceipt.state, "READY");
  assert.deepEqual(readiness.body.readinessReceipt.reasonCodes, []);
  assert.equal(readiness.response.stdout.includes(fixture.root), false);
  assert.deepEqual(await readFile(locator.databasePath), databaseBefore);
  assert.equal(await git(fixture.workspaceRoot, ["--no-optional-locks", "status", "--porcelain=v2", "-z"]), gitBefore);
});

test("binding CLI preserves STOPPED and UNKNOWN across real source and host boundaries", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const locator = await prepareBindingRun(fixture, primaryThreadId);
  const databaseBefore = await readFile(locator.databasePath);
  const readyHost = await createHostReceipt(locator, primaryThreadId, "CODEX_APP_NATIVE_V1", "SUPPORTED", "PROVEN", "OBSERVED");

  const siblingRoot = await createSiblingWorktree(fixture, "cli-sibling");
  const sibling = await inspectReadiness(locator, siblingRoot, readyHost, primaryThreadId);
  assert.equal(sibling.response.code, 2);
  assert.equal(sibling.body.readinessReceipt.reasonCodes.includes("WORKSPACE_IDENTITY_MISMATCH"), true);

  const cloneRoot = await cloneFixtureRepository(fixture, "cli-clone");
  const clone = await inspectReadiness(locator, cloneRoot, readyHost, primaryThreadId);
  assert.equal(clone.response.code, 2);
  assert.equal(clone.body.readinessReceipt.reasonCodes.includes("WORKSPACE_IDENTITY_MISMATCH"), true);

  await writeFile(join(fixture.workspaceRoot, "src", "alpha.txt"), "dirty\n", "utf8");
  const dirty = await inspectReadiness(locator, fixture.workspaceRoot, readyHost, primaryThreadId);
  assert.equal(dirty.response.code, 2);
  assert.equal(dirty.body.readinessReceipt.reasonCodes.includes("WORKTREE_DIRTY_IN_SCOPE"), true);
  await writeFile(join(fixture.workspaceRoot, "src", "alpha.txt"), "alpha\n", "utf8");

  const changedHost = await createHostReceipt(locator, changedThreadId, "CODEX_APP_NATIVE_V1", "SUPPORTED", "PROVEN", "OBSERVED");
  const changed = await inspectReadiness(locator, fixture.workspaceRoot, changedHost, changedThreadId);
  assert.equal(changed.response.code, 2);
  assert.equal(changed.body.readinessReceipt.reasonCodes.includes("HOST_SESSION_IDENTITY_MISMATCH"), true);

  for (const threadId of [undefined, "malformed-thread-id"]) {
    const unknownHost = await createHostReceipt(locator, threadId, "CODEX_APP_NATIVE_V1", "SUPPORTED", "PROVEN", "OBSERVED");
    const unknown = await inspectReadiness(locator, fixture.workspaceRoot, unknownHost, threadId);
    assert.equal(unknown.response.code, 2);
    assert.equal(unknown.body.readinessReceipt.state, "UNKNOWN");
    assert.equal(unknown.body.readinessReceipt.reasonCodes.includes("HOST_SESSION_IDENTITY_UNKNOWN"), true);
  }

  const unsupported = await createHostReceipt(locator, primaryThreadId, "CLAUDE_CODE_NATIVE_V1", "SUPPORTED", "PROVEN", "OBSERVED");
  assert.equal((await inspectReadiness(locator, fixture.workspaceRoot, unsupported, primaryThreadId)).body.readinessReceipt.state, "STOPPED");
  const unknownCapability = await createHostReceipt(locator, primaryThreadId, "CODEX_APP_NATIVE_V1", "UNKNOWN", "UNKNOWN", "UNKNOWN");
  assert.equal((await inspectReadiness(locator, fixture.workspaceRoot, unknownCapability, primaryThreadId)).body.readinessReceipt.state, "UNKNOWN");

  await writeFile(join(fixture.workspaceRoot, "src", "alpha.txt"), "next\n", "utf8");
  await git(fixture.workspaceRoot, ["commit", "-am", "next source revision"]);
  const revision = await inspectReadiness(locator, fixture.workspaceRoot, readyHost, primaryThreadId);
  assert.equal(revision.response.code, 2);
  assert.equal(revision.body.readinessReceipt.reasonCodes.includes("SOURCE_REVISION_MISMATCH"), true);
  assert.deepEqual(await readFile(locator.databasePath), databaseBefore);
});

test("binding CLI rejects malformed and over-limit input before parsing without database mutation", async (context) => {
  const fixture = await createExecutionGitFixture();
  context.after(fixture.cleanup);
  const locator = await prepareBindingRun(fixture, primaryThreadId);
  const before = await readFile(locator.databasePath);
  const malformed = await runBuiltCli([
    "create-execution-host-receipt", "--database", locator.databasePath, "--run", locator.runId,
  ], "{not-json", primaryThreadId);
  assert.equal(malformed.code, 3);
  assert.equal(JSON.parse(malformed.stdout).error.code, "INPUT_JSON_INVALID");

  const oversized = `{"value":"${"x".repeat(policy.maxHostEvidenceInputBytes)}"}`;
  const overflow = await runBuiltCli([
    "create-execution-host-receipt", "--database", locator.databasePath, "--run", locator.runId,
  ], oversized, primaryThreadId);
  assert.equal(overflow.code, 3);
  assert.equal(JSON.parse(overflow.stdout).error.code, "COMMAND_INPUT_TOO_LARGE");
  assert.deepEqual(await readFile(locator.databasePath), before);
});

interface BindingLocator {
  databasePath: string;
  runId: string;
}

async function prepareBindingRun(
  fixture: Awaited<ReturnType<typeof createExecutionGitFixture>>,
  threadId: string,
): Promise<BindingLocator> {
  const envelope = {
    ...referenceEnvelopeInput,
    sourceRevision: fixture.revision,
    sources: referenceEnvelopeInput.sources.map((source) => ({ ...source, sourceRevision: fixture.revision })),
  };
  const response = await runBuiltCli([
    "prepare-execution",
    "--workspace", fixture.workspaceRoot,
    "--app-data-root", fixture.appDataRoot,
    "--controller-id", "cli-controller-001",
  ], JSON.stringify({ envelope, graph: referenceGraphDraft }), threadId);
  assert.equal(response.code, 0, `${response.stdout}${response.stderr}`);
  return JSON.parse(response.stdout) as BindingLocator;
}

async function createHostReceipt(
  locator: BindingLocator,
  threadId: string | undefined,
  hostProfileId: string,
  state: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN",
  authorityState: "PROVEN" | "DENIED" | "UNKNOWN",
  instructionState: "OBSERVED" | "UNKNOWN",
): Promise<HostEvidenceReceipt> {
  const evidenceCode = state === "SUPPORTED"
    ? "NATIVE_CAPABILITY_OBSERVED"
    : state === "UNSUPPORTED"
      ? "NATIVE_CAPABILITY_UNSUPPORTED"
      : "NATIVE_CAPABILITY_UNOBSERVABLE";
  const capabilities = policy.requiredHostCapabilities.map((capabilityId: HostCapabilityId) => ({
    capabilityId,
    state,
    authorityState,
    instructionState,
    evidenceCode,
  }));
  const response = await runBuiltCli([
    "create-execution-host-receipt", "--database", locator.databasePath, "--run", locator.runId,
  ], canonicalExecutionJson({ hostProfileId, capabilities, observedAt: "2026-08-08T22:40:00.000Z" }), threadId);
  assert.equal(response.code, 0, `${response.stdout}${response.stderr}`);
  return JSON.parse(response.stdout) as HostEvidenceReceipt;
}

async function inspectReadiness(
  locator: BindingLocator,
  workspaceRoot: string,
  hostReceipt: HostEvidenceReceipt,
  threadId: string | undefined,
) {
  const response = await runBuiltCli([
    "inspect-execution-dispatch-readiness",
    "--database", locator.databasePath,
    "--run", locator.runId,
    "--node", "audit-controller",
  ], canonicalExecutionJson({
    hostReceipt,
    sources: [{ sourceId: "repo", workspaceRoot, auditedPaths: ["."] }],
    observedAt: "2026-08-08T22:41:00.000Z",
  }), threadId);
  return {
    response,
    body: JSON.parse(response.stdout) as {
      hostReceipt: HostEvidenceReceipt;
      sourceObservations: readonly { reasonCodes: readonly string[] }[];
      readinessReceipt: { state: "READY" | "STOPPED" | "UNKNOWN"; reasonCodes: readonly string[] };
    },
  };
}

function runBuiltCli(
  argv: readonly string[],
  stdin: string | null,
  threadId: string | undefined,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, rejectResult) => {
    const env = { ...process.env };
    if (threadId === undefined) delete env.CODEX_THREAD_ID;
    else env.CODEX_THREAD_ID = threadId;
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", rejectResult);
    child.once("close", (code) => resolveResult({ code, stdout, stderr }));
    child.stdin.end(stdin === null ? "" : `${stdin}\n`);
  });
}

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";

import { serializeWorkContext } from "../src/context/markdown.js";
import { saveSessionState, saveWorkContext } from "../src/context/storage.js";
import type { EpicContext, MilestoneContext, SessionState } from "../src/context/types.js";

const milestone: MilestoneContext = {
  contextVersion: "1.0", kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "rev-m3-1", owner: "product-owner", retention: "PERSONAL", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", milestoneId: "milestone-m3", canonicalArtifactId: "artifact-m3",
  projectVision: "Make AI work resumable.", roadmap: "M3 compact session context.", scope: ["Context contracts"], nonGoals: ["Host execution"], decisions: ["Contexts are Markdown source artifacts."], forecast: ["One bounded M3 delivery."], evidenceRefs: ["decision:m3-approved"], unknowns: [], dependencies: ["contract:team-contract"], epicIds: ["epic-context-parser"],
};

const epic: EpicContext = {
  contextVersion: "1.0", kind: "EPIC", contextId: "epic-context-parser", sourceRevision: "rev-m3-1", owner: "engineering", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", epicId: "epic-context-parser", milestoneId: "milestone-m3",
  outcome: "Validate a portable context contract.", featureValue: "Human-readable resume context.", scope: ["Strict parser"], nonGoals: ["Automatic merge"], workItemIds: ["story-context-parser"], acceptanceCriteria: ["Malformed context stops before use."], decisions: ["Frontmatter is the structured contract."], evidenceRefs: ["test:context-markdown"], unknowns: [], dependencies: ["milestone:milestone-m3"],
};

const session: SessionState = {
  sessionVersion: "1.0", sessionId: "session-m3-po", owner: "product-owner", retention: "PERSONAL",
  readScope: "FULL_MILESTONE", executionScope: { kind: "MILESTONE", contextId: "milestone-context-m3", workItemIds: [] }, writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR",
  contextReferences: [{ kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "rev-m3-1" }], workItemIds: [], activationPackageId: null, recipe: null, setupFingerprint: null, status: "PAUSED", decisions: ["Use strict Markdown context."], evidenceRefs: ["test:context-storage"], unknowns: [], deviations: [], dependencies: [], progress: ["Context prepared."], nextAction: "Review the linked Epic contexts.", execution: null,
};

test("context storage: persists explicit Personal and repository-relative Team artifacts idempotently", async () => {
  await withTemporaryDirectory(async (root) => {
    const personalTarget = join(root, "personal-context.md");
    const personal = await saveWorkContext(personalTarget, milestone, undefined);
    const repeat = await saveWorkContext(personalTarget, milestone, undefined);
    const teamDirectory = join(root, "team");
    await mkdir(teamDirectory);
    const team = await saveWorkContext(join("team", "epic-context.md"), epic, root);
    const sessionTarget = join(root, "personal-session.json");
    const sessionResult = await saveSessionState(sessionTarget, session, undefined);

    assert.equal(personal.state, "PERSONAL_CONTEXT_SAVED");
    assert.deepEqual(repeat, personal);
    assert.equal(team.state, "TEAM_CONTEXT_SAVED");
    assert.equal(team.targetPath, resolve(root, "team", "epic-context.md"));
    assert.equal(sessionResult.state, "PERSONAL_SESSION_SAVED");
    assert.equal((await readFile(personalTarget, "utf8")).endsWith("\n"), true);
    assert.deepEqual(JSON.parse(await readFile(sessionTarget, "utf8")), session);
  });
});

test("context storage: rejects Ephemeral, traversal, and conflicting explicit targets without overwrite", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = join(root, "context.md");
    await saveWorkContext(target, milestone, undefined);
    const original = await readFile(target, "utf8");

    await assert.rejects(() => saveWorkContext(join("..", "escape.md"), epic, root), /CONTEXT_TARGET_OUTSIDE_REPOSITORY/);
    await assert.rejects(() => saveWorkContext(join(root, "absolute.md"), epic, root), /CONTEXT_TARGET_NOT_REPOSITORY_RELATIVE/);
    await assert.rejects(() => saveWorkContext(join(root, "ephemeral.md"), { ...milestone, retention: "EPHEMERAL" }, undefined), /CONTEXT_EPHEMERAL_PERSISTENCE_FORBIDDEN/);
    await assert.rejects(() => saveWorkContext(target, { ...milestone, sourceRevision: "other-revision" }, undefined), /CONTEXT_TARGET_CONFLICT/);
    assert.equal(await readFile(target, "utf8"), original);
  });
});

test("built M3 CLI: validates, saves, and resumes only explicit local artifacts", async () => {
  await withTemporaryDirectory(async (root) => {
    const milestonePath = join(root, "milestone.md");
    const epicPath = join(root, "epic.md");
    const sessionPath = join(root, "session.json");
    const manifestPath = join(root, "contexts.json");
    const runtimePath = join(root, "runtime.json");
    await writeFile(milestonePath, serializeWorkContext(milestone), "utf8");
    await writeFile(epicPath, serializeWorkContext(epic), "utf8");
    await writeFile(sessionPath, JSON.stringify(session), "utf8");
    await writeFile(manifestPath, JSON.stringify({ milestonePath, epicPaths: [epicPath] }), "utf8");
    await writeFile(runtimePath, JSON.stringify({ repository: null, branch: null, worktree: null, baseRevision: null, currentSetupFingerprint: null }), "utf8");

    const validation = await runBuiltCli(["validate-context", "--input", milestonePath]);
    assert.equal(validation.code, 0);
    assert.deepEqual(JSON.parse(validation.stdout), { kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "rev-m3-1", state: "ACCEPTED" });

    const savedContext = await runBuiltCli(["save-context", "--input", milestonePath, "--target", join(root, "saved-context.md")]);
    assert.equal(savedContext.code, 0);
    assert.equal(JSON.parse(savedContext.stdout).state, "PERSONAL_CONTEXT_SAVED");
    const savedSession = await runBuiltCli(["save-session", "--input", sessionPath, "--target", join(root, "saved-session.json")]);
    assert.equal(savedSession.code, 0);
    assert.equal(JSON.parse(savedSession.stdout).state, "PERSONAL_SESSION_SAVED");
    const resumed = await runBuiltCli(["resume-session", "--state", sessionPath, "--contexts", manifestPath, "--runtime", runtimePath]);
    assert.equal(resumed.code, 0);
    assert.equal(JSON.parse(resumed.stdout).decision, "RESUME");
  });
});

test("built M3 CLI: stops malformed, stale, and broadened input without echoing local paths", async () => {
  await withTemporaryDirectory(async (root) => {
    const sessionPath = join(root, "session.json");
    await writeFile(sessionPath, JSON.stringify({ ...session, nextAction: "" }), "utf8");
    const result = await runBuiltCli(["save-session", "--input", sessionPath, "--target", join(root, "unused.json")]);
    assert.notEqual(result.code, 0);
    const stopped = JSON.parse(result.stdout) as { decision: string; error: { code: string; message: string } };
    assert.equal(stopped.decision, "STOPPED");
    assert.equal(stopped.error.code, "CONTEXT_SESSION_INVALID");
    assert.equal(result.stdout.includes(root), false);
    assert.equal(result.stderr, "");
  });
});

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-m3-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function runBuiltCli(argv: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", rejectResult);
    child.once("close", (code) => { resolveResult({ code, stdout, stderr }); });
  });
}

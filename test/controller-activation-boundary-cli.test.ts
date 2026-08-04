import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built M2 CLI: prepares all explicit retention packages without writing artifacts", async () => {
  await withTemporaryDirectory(async (root) => {
    const input = join(root, "request.json");
    const choice = join(root, "choice.json");
    const tuning = join(root, "tuning.json");
    await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
    const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout) as { checkpoint?: { requestFingerprint: string; recipeSignature: string } };
    assert.ok(recommendation.checkpoint);
    await writeFile(choice, JSON.stringify({
      choice: "ACCEPT_RECOMMENDATION",
      expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
      expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
    }), "utf8");
    await writeFile(tuning, JSON.stringify({ state: "NONE" }), "utf8");
    const before = await readdir(root);

    for (const retention of ["EPHEMERAL", "PERSONAL", "TEAM"] as const) {
      const result = await runBuiltCli(prepareArgs(input, choice, tuning, retention, "EPIC-CLI", "revision-cli"));
      assert.equal(result.code, 0);
      assert.equal(result.stderr, "");
      const packageValue = JSON.parse(result.stdout) as Record<string, any>;
      assert.equal(packageValue.activationVersion, "2.0");
      assert.equal(packageValue.state, "ACTIVATION_PACKAGE_PREPARED");
      assert.equal(packageValue.retention, retention);
      assert.equal(packageValue.context.contextId, "EPIC-CLI");
      assert.equal(packageValue.tuning.state, "NONE");
      assert.equal(packageValue.operations.hostActivationPerformed, false);
      assert.equal(packageValue.operations.artifactGenerationPerformed, false);
      assert.equal(packageValue.operations.persistencePerformed, false);
    }

    assert.deepEqual(await readdir(root), before);
  });
});

test("built M2 CLI: saves Personal and Team packages only through explicit targets", async () => {
  await withTemporaryDirectory(async (root) => {
    const input = join(root, "request.json");
    const choice = join(root, "choice.json");
    const tuning = join(root, "tuning.json");
    await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
    const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout) as { checkpoint?: { requestFingerprint: string; recipeSignature: string } };
    assert.ok(recommendation.checkpoint);
    await writeFile(choice, JSON.stringify({
      choice: "ACCEPT_RECOMMENDATION",
      expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
      expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
    }), "utf8");
    await writeFile(tuning, JSON.stringify({ state: "NONE" }), "utf8");

    const personalPackage = await preparePackage(root, input, choice, tuning, "PERSONAL", "EPIC-PERSONAL");
    const personalPath = join(root, "personal-package.json");
    const personalResult = await runBuiltCli(["save-activation", "--input", personalPackage.path, "--target", personalPath]);
    assert.equal(personalResult.code, 0);
    assert.equal(JSON.parse(personalResult.stdout).state, "PERSONAL_PACKAGE_SAVED");
    assert.deepEqual(JSON.parse(await readFile(personalPath, "utf8")), personalPackage.value);

    const teamPackage = await preparePackage(root, input, choice, tuning, "TEAM", "EPIC-TEAM");
    const teamDirectory = join(root, "team-artifacts");
    await mkdir(teamDirectory);
    const teamPath = join(teamDirectory, "team-package.json");
    const teamResult = await runBuiltCli(["save-activation", "--input", teamPackage.path, "--target", join("team-artifacts", "team-package.json"), "--repository-root", root]);
    assert.equal(teamResult.code, 0);
    assert.equal(JSON.parse(teamResult.stdout).state, "TEAM_PACKAGE_SAVED");
    assert.deepEqual(JSON.parse(await readFile(teamPath, "utf8")), teamPackage.value);
  });
});

test("built M2 CLI: stops malformed preparation inputs without echoing secrets", async () => {
  await withTemporaryDirectory(async (root) => {
    const input = join(root, "request.json");
    const choice = join(root, "choice.json");
    const tuning = join(root, "tuning.json");
    await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
    const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout) as { checkpoint?: { requestFingerprint: string; recipeSignature: string } };
    assert.ok(recommendation.checkpoint);
    await writeFile(choice, JSON.stringify({
      choice: "ACCEPT_RECOMMENDATION",
      expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
      expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
    }), "utf8");
    await writeFile(tuning, JSON.stringify({ state: "NONE" }), "utf8");
    const malformedTuning = join(root, "malformed-tuning.json");
    await writeFile(malformedTuning, "{", "utf8");
    const staleChoice = join(root, "stale-choice.json");
    await writeFile(staleChoice, JSON.stringify({
      choice: "ACCEPT_RECOMMENDATION",
      expectedRequestFingerprint: "c".repeat(64),
      expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
    }), "utf8");
    const alternativeChoice = join(root, "alternative-choice.json");
    await writeFile(alternativeChoice, JSON.stringify({
      choice: "REQUEST_ALTERNATIVE",
      expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
      expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
      rationale: "Do not activate the current package.",
    }), "utf8");

    const cases: Array<{ argv: readonly string[]; code: string; forbidden?: string }> = [
      { argv: ["prepare-activation", "--input", input], code: "COMMAND_CONFIGURATION_INVALID" },
      { argv: invalidContextArgs(input, choice, tuning), code: "ACTIVATION_CONTEXT_INVALID" },
      { argv: [...prepareArgs(input, choice, tuning, "PERSONAL-TEAM", "EPIC-CLI", "revision-cli")], code: "ACTIVATION_RETENTION_INVALID" },
      { argv: [...prepareArgs(input, choice, malformedTuning, "PERSONAL", "EPIC-CLI", "revision-cli")], code: "ACTIVATION_TUNING_JSON_INVALID" },
      { argv: [...prepareArgs(input, staleChoice, tuning, "PERSONAL", "EPIC-CLI", "revision-cli")], code: "CHECKPOINT_REQUEST_FINGERPRINT_MISMATCH" },
      { argv: [...prepareArgs(input, alternativeChoice, tuning, "PERSONAL", "EPIC-CLI", "revision-cli")], code: "ACTIVATION_INTENT_REQUIRED" },
      { argv: [...prepareArgs(input, choice, tuning, "PERSONAL", "", "revision-cli")], code: "ACTIVATION_CONTEXT_INVALID" },
      { argv: [...prepareArgs(input, choice, tuning, "PERSONAL", "EPIC-CLI", "revision-cli"), "extra"], code: "COMMAND_CONFIGURATION_INVALID" },
    ];

    for (const current of cases) {
      const result = await runBuiltCli(current.argv);
      const stopped = assertStopped(result, current.code);
      assert.equal(result.stderr, "");
      if (current.forbidden !== undefined) assert.equal(result.stdout.includes(current.forbidden), false);
      assert.equal(stopped.error.message.includes("sensitive"), false);
    }
  });
});

test("built M2 CLI: stops Ephemeral save, Team escape, and target conflicts", async () => {
  await withTemporaryDirectory(async (root) => {
    const input = join(root, "request.json");
    const choice = join(root, "choice.json");
    const tuning = join(root, "tuning.json");
    await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
    const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout) as { checkpoint?: { requestFingerprint: string; recipeSignature: string } };
    assert.ok(recommendation.checkpoint);
    await writeFile(choice, JSON.stringify({
      choice: "ACCEPT_RECOMMENDATION",
      expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
      expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
    }), "utf8");
    await writeFile(tuning, JSON.stringify({ state: "NONE" }), "utf8");

    const ephemeral = await preparePackage(root, input, choice, tuning, "EPHEMERAL", "EPIC-EPHEMERAL");
    const ephemeralResult = await runBuiltCli(["save-activation", "--input", ephemeral.path, "--target", join(root, "ephemeral.json")]);
    assertStopped(ephemeralResult, "ACTIVATION_EPHEMERAL_PERSISTENCE_FORBIDDEN");

    const team = await preparePackage(root, input, choice, tuning, "TEAM", "EPIC-TEAM-ESCAPE");
    const escapeResult = await runBuiltCli(["save-activation", "--input", team.path, "--target", join("..", "escape.json"), "--repository-root", root]);
    assertStopped(escapeResult, "ACTIVATION_TARGET_OUTSIDE_REPOSITORY");

    const first = await preparePackage(root, input, choice, tuning, "PERSONAL", "EPIC-CONFLICT-1");
    const firstTarget = join(root, "conflict.json");
    const firstSave = await runBuiltCli(["save-activation", "--input", first.path, "--target", firstTarget]);
    assert.equal(firstSave.code, 0);
    const second = await preparePackage(root, input, choice, tuning, "PERSONAL", "EPIC-CONFLICT-2");
    const conflict = await runBuiltCli(["save-activation", "--input", second.path, "--target", firstTarget]);
    assertStopped(conflict, "ACTIVATION_TARGET_CONFLICT");
  });
});

test("built M2 CLI: rejects a malformed package before creating a target", async () => {
  await withTemporaryDirectory(async (root) => {
    const packagePath = join(root, "malformed-package.json");
    const target = join(root, "should-not-exist.json");
    await writeFile(packagePath, JSON.stringify({
      activationVersion: "2.0",
      state: "ACTIVATION_PACKAGE_PREPARED",
      packageId: "not-a-real-package",
      retention: "PERSONAL",
    }), "utf8");

    const result = await runBuiltCli(["save-activation", "--input", packagePath, "--target", target]);
    assertStopped(result, "ACTIVATION_BASE_PACKAGE_INVALID");
    assert.equal(result.stderr, "");
    await assert.rejects(() => readFile(target, "utf8"));
  });
});

function prepareArgs(input: string, choice: string, tuning: string, retention: string, contextId: string, revision: string): string[] {
  return ["prepare-activation", "--input", input, "--choice", choice, "--profile", "planning", "--context-kind", "EPIC", "--context-id", contextId, "--context-revision", revision, "--retention", retention, "--tuning", tuning];
}

function invalidContextArgs(input: string, choice: string, tuning: string): string[] {
  const args = prepareArgs(input, choice, tuning, "PERSONAL", "EPIC-CLI", "revision-cli");
  args[8] = "INVALID";
  return args;
}

async function preparePackage(root: string, input: string, choice: string, tuning: string, retention: string, contextId: string): Promise<{ path: string; value: Record<string, any> }> {
  const result = await runBuiltCli(prepareArgs(input, choice, tuning, retention, contextId, "revision-cli"));
  assert.equal(result.code, 0);
  const value = JSON.parse(result.stdout) as Record<string, any>;
  const path = join(root, `${contextId}.json`);
  await writeFile(path, JSON.stringify(value), "utf8");
  return { path, value };
}

function assertStopped(result: { code: number | null; stdout: string; stderr: string }, expectedCode: string): { decision: string; error: { code: string; message: string } } {
  assert.notEqual(result.code, 0);
  const stopped = JSON.parse(result.stdout) as { decision: string; error: { code: string; message: string } };
  assert.equal(stopped.decision, "STOPPED");
  assert.equal(stopped.error.code, expectedCode);
  return stopped;
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-m2-cli-"));
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

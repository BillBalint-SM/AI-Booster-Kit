import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built activation CLI: issues one ephemeral package for each explicit profile without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-activation-package-"));
  const input = join(root, "request.json");
  const choice = join(root, "choice.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);

  const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout) as { checkpoint?: { requestFingerprint: string; recipeSignature: string } };
  assert.ok(recommendation.checkpoint);
  await writeFile(choice, JSON.stringify({
    choice: "ACCEPT_RECOMMENDATION",
    expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
    expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
  }), "utf8");
  const before = await readdir(root);

  for (const profile of ["clarify", "research", "planning", "validation"] as const) {
    const result = await runBuiltCli(["activate-quick-task", "--input", input, "--choice", choice, "--profile", profile]);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    const packageResult = JSON.parse(result.stdout) as Record<string, any>;
    assert.equal(packageResult.state, "EPHEMERAL_PACKAGE_ISSUED");
    assert.equal(packageResult.profile, profile);
    assert.equal(packageResult.operations.packageIssued, true);
    assert.equal(packageResult.operations.hostActivationPerformed, false);
    assert.equal(packageResult.operations.artifactGenerationPerformed, false);
    assert.equal(packageResult.operations.persistencePerformed, false);
    assert.equal(Object.hasOwn(packageResult, "result"), false);
  }

  assert.deepEqual(await readdir(root), before);
});

test("built activation CLI: stops invalid, stale, and non-activation paths without echoing input", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-activation-package-"));
  const input = join(root, "request.json");
  const choice = join(root, "choice.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout) as { checkpoint?: { requestFingerprint: string; recipeSignature: string } };
  assert.ok(recommendation.checkpoint);
  await writeFile(choice, JSON.stringify({
    choice: "ACCEPT_RECOMMENDATION",
    expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
    expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
  }), "utf8");

  const staleRequest = join(root, "stale-request.json");
  const changed = JSON.parse(await readFile(input, "utf8")) as Record<string, unknown>;
  changed.goal = "sensitive changed goal that must not appear in errors";
  await writeFile(staleRequest, JSON.stringify(changed), "utf8");
  const malformedChoice = join(root, "malformed-choice.json");
  await writeFile(malformedChoice, "{", "utf8");
  const malformedInput = join(root, "malformed-input.json");
  await writeFile(malformedInput, "{", "utf8");
  const noAgentInput = join(root, "no-agent-request.json");
  await copyFile(resolve("test/fixtures/controller/no-agent-quick-task.json"), noAgentInput);
  const staleRecipeChoice = join(root, "stale-recipe-choice.json");
  await writeFile(staleRecipeChoice, JSON.stringify({
    choice: "ACCEPT_RECOMMENDATION",
    expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
    expectedRecipeSignature: "b".repeat(64),
  }), "utf8");
  const alternative = join(root, "alternative.json");
  await writeFile(alternative, JSON.stringify({
    choice: "REQUEST_ALTERNATIVE",
    expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
    expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
    rationale: "Use a research-oriented recipe.",
  }), "utf8");
  const noAgent = join(root, "no-agent.json");
  await writeFile(noAgent, JSON.stringify({
    choice: "CONTINUE_WITHOUT_AGENT",
    expectedRequestFingerprint: recommendation.checkpoint.requestFingerprint,
    expectedRecipeSignature: recommendation.checkpoint.recipeSignature,
  }), "utf8");

  const cases: Array<{ argv: readonly string[]; code: string; forbidden?: string }> = [
    { argv: ["activate-quick-task", "--input", input, "--choice", choice], code: "COMMAND_CONFIGURATION_INVALID" },
    { argv: ["activate-quick-task", "--input", input, "--choice", choice, "--profile", "default"], code: "ACTIVATION_PROFILE_INVALID" },
    { argv: ["activate-quick-task", "--input", input, "--choice", choice, "--profile", "planning", "extra"], code: "COMMAND_CONFIGURATION_INVALID" },
    { argv: ["activate-quick-task", "--input", join(root, "missing.json"), "--choice", choice, "--profile", "planning"], code: "ACTIVATION_INPUT_PATH_UNREADABLE" },
    { argv: ["activate-quick-task", "--input", input, "--choice", join(root, "missing-choice.json"), "--profile", "planning"], code: "ACTIVATION_CHOICE_PATH_UNREADABLE" },
    { argv: ["activate-quick-task", "--input", malformedInput, "--choice", choice, "--profile", "planning"], code: "ACTIVATION_INPUT_JSON_INVALID" },
    { argv: ["activate-quick-task", "--input", input, "--choice", malformedChoice, "--profile", "planning"], code: "ACTIVATION_CHOICE_JSON_INVALID" },
    { argv: ["activate-quick-task", "--input", staleRequest, "--choice", choice, "--profile", "planning"], code: "CHECKPOINT_REQUEST_FINGERPRINT_MISMATCH", forbidden: "sensitive changed goal" },
    { argv: ["activate-quick-task", "--input", input, "--choice", staleRecipeChoice, "--profile", "planning"], code: "CHECKPOINT_RECIPE_SIGNATURE_MISMATCH" },
    { argv: ["activate-quick-task", "--input", input, "--choice", alternative, "--profile", "planning"], code: "ACTIVATION_INTENT_REQUIRED" },
    { argv: ["activate-quick-task", "--input", input, "--choice", noAgent, "--profile", "planning"], code: "ACTIVATION_INTENT_REQUIRED" },
    { argv: ["activate-quick-task", "--input", noAgentInput, "--choice", choice, "--profile", "planning"], code: "CHECKPOINT_NOT_RESOLVABLE" },
  ];

  for (const current of cases) {
    const before = await readdir(root);
    const result = await runBuiltCli(current.argv);
    const stopped = assertStopped(result, current.code);
    assert.equal(result.stderr, "");
    assert.equal(stopped.error.code, current.code);
    if (current.forbidden !== undefined) assert.equal(result.stdout.includes(current.forbidden), false);
    assert.deepEqual(await readdir(root), before);
  }

  const incompleteInput = join(root, "incomplete-request.json");
  await copyFile(resolve("test/fixtures/controller/incomplete-quick-task.json"), incompleteInput);
  const before = await readdir(root);
  const prepareResult = await runBuiltCli(["activate-quick-task", "--input", incompleteInput, "--choice", choice, "--profile", "planning"]);
  assertStopped(prepareResult, "CHECKPOINT_NOT_RESOLVABLE");
  assert.deepEqual(await readdir(root), before);
});

function assertStopped(result: { code: number | null; stdout: string; stderr: string }, expectedCode: string): { decision: string; error: { code: string } } {
  assert.notEqual(result.code, 0);
  const stopped = JSON.parse(result.stdout) as { decision: string; error: { code: string } };
  assert.equal(stopped.decision, "STOPPED");
  assert.equal(stopped.error.code, expectedCode);
  return stopped;
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

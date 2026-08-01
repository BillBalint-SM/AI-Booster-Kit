import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built controller CLI: emits one recommendation JSON object without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const before = await readdir(root);

  const result = await runBuiltCli(["quick-task", "--input", input]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).decision, "RECOMMEND");
  assert.deepEqual(await readdir(root), before);
});

test("built controller CLI: returns stopped JSON for malformed local input", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, "{", "utf8");

  const result = await runBuiltCli(["quick-task", "--input", input]);

  assert.equal(result.code, 3);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).decision, "STOPPED");
});

test("built controller CLI: resolves every explicit checkpoint choice without writing an artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout);
  const checkpoint = recommendation.checkpoint;
  assert.ok(checkpoint);

  const accepts = [
    { name: "accept.json", value: { choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: checkpoint.requestFingerprint, expectedRecipeSignature: checkpoint.recipeSignature }, state: "ACTIVATION_INTENT" },
    { name: "alternative.json", value: { choice: "REQUEST_ALTERNATIVE", expectedRequestFingerprint: checkpoint.requestFingerprint, expectedRecipeSignature: checkpoint.recipeSignature, rationale: "Use a research-oriented recipe." }, state: "ALTERNATIVE_REQUESTED" },
    { name: "no-agent.json", value: { choice: "CONTINUE_WITHOUT_AGENT", expectedRequestFingerprint: checkpoint.requestFingerprint, expectedRecipeSignature: checkpoint.recipeSignature }, state: "NO_AGENT_CONTINUATION" },
  ];
  for (const accepted of accepts) await writeFile(join(root, accepted.name), JSON.stringify(accepted.value), "utf8");
  const before = await readdir(root);

  for (const accepted of accepts) {
    const result = await runBuiltCli(["resolve-checkpoint", "--input", input, "--choice", join(root, accepted.name)]);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).state, accepted.state);
  }
  assert.deepEqual(await readdir(root), before);
});

test("built controller CLI: stops malformed, stale, and non-resolvable checkpoint paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout);
  const checkpoint = recommendation.checkpoint;
  assert.ok(checkpoint);
  const malformed = join(root, "malformed-choice.json");
  const stale = join(root, "stale-choice.json");
  await writeFile(malformed, "{", "utf8");
  await writeFile(stale, JSON.stringify({ choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: "c".repeat(64), expectedRecipeSignature: checkpoint.recipeSignature }), "utf8");
  const before = await readdir(root);

  for (const choice of [malformed, stale]) {
    const result = await runBuiltCli(["resolve-checkpoint", "--input", input, "--choice", choice]);
    assert.notEqual(result.code, 0);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).decision, "STOPPED");
  }
  assert.deepEqual(await readdir(root), before);
});

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

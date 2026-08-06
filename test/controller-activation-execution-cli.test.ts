import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built M4 CLI: help exposes the bounded Codex execution command", async () => {
  const result = await runBuiltCli(["--help"]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /execute-activation/);
});

test("built M4 CLI: stops exact-argument and input-boundary violations", async () => {
  await withTemporaryDirectory(async (root) => {
    const packagePath = await preparePackage(root);
    const sourcePath = join(root, "source.md");
    await writeFile(sourcePath, "local source", "utf8");

    assertStopped(await runBuiltCli(["execute-activation", "--input", packagePath]), "COMMAND_CONFIGURATION_INVALID");
    assertStopped(
      await runBuiltCli(["execute-activation", "--input", packagePath, "--source", join("..", "outside.md"), "--workdir", root, "--timeout-ms", "1000", "--codex-command", process.execPath]),
      "CODEX_SOURCE_OUTSIDE_WORKDIR",
    );
    assertStopped(
      await runBuiltCli(["execute-activation", "--input", packagePath, "--source", join(root, "missing.md"), "--workdir", root, "--timeout-ms", "1000", "--codex-command", process.execPath]),
      "CODEX_SOURCE_UNREADABLE",
    );
  });
});

test("built M4 CLI: returns an explicit failed result when the native command is unavailable", async () => {
  await withTemporaryDirectory(async (root) => {
    const packagePath = await preparePackage(root);
    const sourcePath = join(root, "source.md");
    await writeFile(sourcePath, "local source", "utf8");

    const result = await runBuiltCli([
      "execute-activation",
      "--input", packagePath,
      "--source", sourcePath,
      "--workdir", root,
      "--timeout-ms", "1000",
      "--codex-command", join(root, "missing-codex.exe"),
    ]);

    assert.equal(result.code, 3);
    assert.equal(result.stderr, "");
    const output = JSON.parse(result.stdout) as { state: string; error?: { code: string } };
    assert.equal(output.state, "FAILED");
    assert.equal(output.error?.code, "CODEX_COMMAND_UNAVAILABLE");
  });
});

async function preparePackage(root: string): Promise<string> {
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
  const prepared = await runBuiltCli([
    "prepare-activation",
    "--input", input,
    "--choice", choice,
    "--profile", "planning",
    "--context-kind", "MILESTONE",
    "--context-id", "M4-CODEX-CLI",
    "--context-revision", "revision-cli",
    "--retention", "EPHEMERAL",
    "--tuning", tuning,
  ]);
  assert.equal(prepared.code, 0);
  const packagePath = join(root, "activation-package.json");
  await writeFile(packagePath, prepared.stdout, "utf8");
  return packagePath;
}

function assertStopped(result: { code: number | null; stdout: string; stderr: string }, expectedCode: string): void {
  assert.notEqual(result.code, 0);
  assert.equal(result.stderr, "");
  const stopped = JSON.parse(result.stdout) as { decision: string; error: { code: string } };
  assert.equal(stopped.decision, "STOPPED");
  assert.equal(stopped.error.code, expectedCode);
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "codex-execution-cli-"));
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

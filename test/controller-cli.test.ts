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

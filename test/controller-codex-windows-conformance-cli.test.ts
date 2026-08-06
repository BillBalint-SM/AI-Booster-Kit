import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("built CLI: help exposes the native Windows Codex conformance command", async () => {
  const result = await runBuiltCli(["--help"]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /codex-windows-conformance/);
});

test("built CLI: rejects missing, reordered, and invalid conformance arguments", async () => {
  const missing = await runBuiltCli(["codex-windows-conformance", "--profile", "current"]);
  assertStopped(missing, "COMMAND_CONFIGURATION_INVALID", 4);

  const reordered = await runBuiltCli([
    "codex-windows-conformance",
    "--profile", "current",
    "--workdir", tmpdir(),
    "--timeout-ms", "1000",
  ]);
  assertStopped(reordered, "COMMAND_CONFIGURATION_INVALID", 4);

  const invalidTimeout = await runBuiltCli([
    "codex-windows-conformance",
    "--workdir", tmpdir(),
    "--timeout-ms", "0",
    "--profile", "current",
  ]);
  assertStopped(invalidTimeout, "CODEX_TIMEOUT_INVALID", 4);
});

test("built CLI: rejects secret paths and shell wrappers before host execution", async () => {
  const secretPath = await runBuiltCli([
    "codex-windows-conformance",
    "--workdir", tmpdir(),
    "--timeout-ms", "1000",
    "--profile", "current",
    "--codex-home", "C:\\Users\\TestUser\\.codex\\.sandbox-secrets",
  ]);
  assertStopped(secretPath, "CODEX_SECRET_PATH_FORBIDDEN", 4);

  const wrapper = await runBuiltCli([
    "codex-windows-conformance",
    "--workdir", tmpdir(),
    "--timeout-ms", "1000",
    "--profile", "current",
    "--codex-command", "C:\\Temp\\codex.ps1",
  ]);
  assertStopped(wrapper, "CODEX_COMMAND_NOT_NATIVE", 4);
});

test("built CLI: unavailable native command is an explicit stopped result", async () => {
  await withTemporaryDirectory(async (root) => {
    const result = await runBuiltCli([
      "codex-windows-conformance",
      "--workdir", root,
      "--timeout-ms", "1000",
      "--profile", "current",
      "--codex-command", join(root, "missing-codex.exe"),
      "--codex-home", root,
    ]);

    assert.equal(result.code, 3);
    assert.equal(result.stderr, "");
    const output = JSON.parse(result.stdout) as { state: string; smoke: { state: string; errorCode: string | null } };
    assert.equal(output.state, "STOPPED");
    assert.equal(output.smoke.state, "STOPPED");
    assert.equal(output.smoke.errorCode, "CODEX_COMMAND_UNAVAILABLE");
  });
});

function assertStopped(result: { code: number | null; stdout: string; stderr: string }, code: string, exitCode: number): void {
  assert.equal(result.code, exitCode);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout) as { decision: string; error: { code: string } };
  assert.equal(output.decision, "STOPPED");
  assert.equal(output.error.code, code);
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "codex-windows-conformance-cli-"));
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

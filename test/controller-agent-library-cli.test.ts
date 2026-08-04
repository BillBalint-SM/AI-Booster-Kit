import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";

test("built Agent library CLI: produces a read-only projection report", async () => {
  const result = await runBuiltCli([
    "inspect-agent-library",
    "--source-dir",
    resolve("test/fixtures/agents/valid"),
    "--role-catalog",
    resolve("test/fixtures/roles.md"),
    "--formation-catalog",
    resolve("test/fixtures/formation-agent-bindings.md"),
  ]);

  const report = JSON.parse(result.stdout) as { inventory: { agentCount: number }; coverage: { status: string }; projection: { bindings: readonly unknown[] } };
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(report.inventory.agentCount, 2);
  assert.equal(report.coverage.status, "READY");
  assert.equal(report.projection.bindings.length > 0, true);
});

test("built Agent library CLI: rejects an incomplete argument list", async () => {
  const result = await runBuiltCli(["inspect-agent-library", "--source-dir", resolve("test/fixtures/agents/valid")]);

  assert.equal(result.code, 4);
  assert.match(result.stdout, /COMMAND_CONFIGURATION_INVALID/);
});

test("built Agent library CLI: stops unreadable source directories without writing", async () => {
  const result = await runBuiltCli([
    "inspect-agent-library",
    "--source-dir",
    resolve("test/fixtures/agents/missing"),
    "--role-catalog",
    resolve("test/fixtures/roles.md"),
    "--formation-catalog",
    resolve("test/fixtures/formation-agent-bindings.md"),
  ]);

  assert.equal(result.code, 3);
  assert.match(result.stdout, /AGENT_LIBRARY_INSPECTION_FAILED/);
});

test("built Agent library CLI: stops malformed source metadata safely", async () => {
  const result = await runBuiltCli([
    "inspect-agent-library",
    "--source-dir",
    resolve("test/fixtures/agents/invalid"),
    "--role-catalog",
    resolve("test/fixtures/roles.md"),
    "--formation-catalog",
    resolve("test/fixtures/formation-agent-bindings.md"),
  ]);

  assert.equal(result.code, 3);
  assert.match(result.stdout, /AGENT_LIBRARY_INSPECTION_FAILED/);
});

test("built Agent library CLI: returns incomplete projection status without writing", async () => {
  const result = await runBuiltCli([
    "inspect-agent-library",
    "--source-dir",
    resolve("test/fixtures/agents/valid"),
    "--role-catalog",
    resolve("test/fixtures/roles.md"),
    "--formation-catalog",
    resolve("test/fixtures/formation-agent-bindings-incomplete.md"),
  ]);

  const report = JSON.parse(result.stdout) as { projection: { status: string; unknownRoleIds: readonly string[] } };
  assert.equal(result.code, 2);
  assert.equal(report.projection.status, "NOT_READY");
  assert.deepEqual(report.projection.unknownRoleIds, ["debugger"]);
});

function runBuiltCli(argv: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

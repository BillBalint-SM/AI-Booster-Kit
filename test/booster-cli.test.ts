import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built booster CLI projects the same recommendation-only Delivery Compass", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-compass-"));
  const input = join(root, "start.json");
  await writeFile(input, JSON.stringify(compassRequest()), "utf8");

  const result = await runBuiltCli(["booster", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(value.status, "READY");
  assert.equal(value.recommendation.skillId, "planning-show");
  assert.equal(value.authority, "RECOMMENDATION_ONLY");
  assert.equal(value.executionPerformed, false);
  assert.equal(value.persistencePerformed, false);
});

test("built booster CLI keeps a declared stop visible with exit 2", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-compass-"));
  const input = join(root, "stopped.json");
  await writeFile(input, JSON.stringify(compassRequest({ stopReasons: ["The repository target is ambiguous."] })), "utf8");

  const result = await runBuiltCli(["booster", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 2);
  assert.equal(result.stderr, "");
  assert.equal(value.status, "STOPPED");
  assert.equal(value.nextAction, "REVIEW_STOP_REASONS");
});

test("built booster CLI rejects invalid JSON with a stable local error", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-compass-"));
  const input = join(root, "invalid.json");
  await writeFile(input, "{", "utf8");

  const result = await runBuiltCli(["booster", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 3);
  assert.equal(value.decision, "STOPPED");
  assert.equal(value.error.code, "BOOSTER_INPUT_JSON_INVALID");
});

function compassRequest(overrides: Partial<ReturnType<typeof baseCompassRequest>> = {}) {
  return { ...baseCompassRequest(), ...overrides };
}

function baseCompassRequest() {
  return {
    requestVersion: "1.0",
    mode: "AUTO",
    collaboration: "INDIVIDUAL",
    objective: "Deliver a bounded change with evidence.",
    preferredSkill: null,
    artifacts: [] as Array<{ type: string; reference: string }>,
    facts: [] as string[],
    decisions: [] as string[],
    evidence: [] as string[],
    unknowns: [] as string[],
    constraints: ["No hidden external action."],
    stopReasons: [] as string[],
  };
}

function runBuiltCli(args: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [resolve("dist/cli.js"), ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => { resolveResult({ code, stdout, stderr }); });
  });
}

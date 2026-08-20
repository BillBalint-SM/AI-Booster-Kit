import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";

const cases = [
  ["examples/booster/start.json", 0, "READY", "planning-show", "NEW"],
  ["examples/booster/attach-in-progress.json", 0, "READY", "planning-show", "ATTACH"],
  ["examples/booster/after-plan.json", 2, "WAITING_FOR_DECISION", null, "NEW"],
  ["examples/booster/resume-accepted-plan.json", 0, "READY", "booster-implement", "RESUME"],
  ["examples/booster/team-after-plan.json", 0, "READY", "booster-team-align", "NEW"],
  ["examples/booster/standalone-test.json", 0, "READY", "booster-test", "ATTACH"],
  ["examples/booster/stopped.json", 2, "STOPPED", null, "ATTACH"],
  ["examples/booster/complete.json", 0, "COMPLETE", null, "RESUME"],
] as const;

test("documented Booster Mode examples execute through the built public CLI", async () => {
  for (const [path, expectedCode, expectedStatus, expectedSkill, expectedMode] of cases) {
    const result = await runBuiltCli(["booster", "--input", path]);
    const value = JSON.parse(result.stdout);
    assert.equal(result.code, expectedCode, path);
    assert.equal(result.stderr, "", path);
    assert.equal(value.status, expectedStatus, path);
    assert.equal(value.recommendation?.skillId ?? null, expectedSkill, path);
    assert.equal(value.sessionMode, expectedMode, path);
    assert.equal(value.executionPerformed, false, path);
    assert.equal(value.persistencePerformed, false, path);
  }
});

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
    child.once("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

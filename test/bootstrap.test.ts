import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);

test("built CLI help lists the bootstrap commands", async () => {
  const result = await execFileAsync(process.execPath, ["dist/cli.js", "--help"]);

  assert.equal(result.stderr, "");
  assert.match(result.stdout, /validate/);
  assert.match(result.stdout, /finalize/);
  assert.match(result.stdout, /sync/);
  assert.match(result.stdout, /conformance/);
  assert.match(result.stdout, /readiness/);
});

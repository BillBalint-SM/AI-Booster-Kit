import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { bootstrapOwnerIdentity } from "../src/controller/owner-identity-bootstrap.js";
import { createFileOwnerIdentityStorage } from "../src/owner-identity/storage.js";

test("owner identity bootstrap entry: prompts only for the normal recommend-formation start", async () => {
  await withTemporaryDirectory(async (root) => {
    const storage = createFileOwnerIdentityStorage(join(root, "AI Booster Kit", "owner-identity.json"));
    let prompts = 0;

    const help = await bootstrapOwnerIdentity(["--help"], storage, async () => {
      prompts += 1;
      return "Ignored Alias";
    });
    const explicit = await bootstrapOwnerIdentity(["owner-identity", "setup"], storage, async () => {
      prompts += 1;
      return "Ignored Alias";
    });
    const recommend = await bootstrapOwnerIdentity(["recommend-formation", "--input", "request.json"], storage, async () => {
      prompts += 1;
      return "";
    });

    assert.equal(help.status, "SKIPPED");
    assert.equal(explicit.status, "SKIPPED");
    assert.equal(recommend.status, "EMPTY");
    assert.equal(recommend.actor, "Alias empty");
    assert.equal(prompts, 1);
  });
});

test("built owner identity CLI: rejects malformed command usage and forbidden raw alias arguments without echo", async () => {
  const missingSubcommand = await runBuiltCli(["owner-identity"], process.env, null);
  const forbiddenAlias = await runBuiltCli(["owner-identity", "setup", "--alias", "do-not-accept-this"], process.env, null);
  const missingOutput = parseLastJsonLine(missingSubcommand.stdout) as { decision: string; error: { code: string } };
  const forbiddenOutput = parseLastJsonLine(forbiddenAlias.stdout) as { decision: string; error: { code: string } };

  assert.equal(missingSubcommand.code, 4);
  assert.equal(missingOutput.decision, "STOPPED");
  assert.equal(missingOutput.error.code, "COMMAND_CONFIGURATION_INVALID");
  assert.equal(forbiddenAlias.code, 4);
  assert.equal(forbiddenOutput.error.code, "COMMAND_CONFIGURATION_INVALID");
  assert.equal(forbiddenAlias.stdout.includes("do-not-accept-this"), false);
  assert.equal(forbiddenAlias.stderr.includes("do-not-accept-this"), false);
});

test("built owner identity CLI: setup and reconfigure map exit codes without exposing raw alias or user-local path", async () => {
  await withTemporaryDirectory(async (root) => {
    const environment = { ...process.env, LOCALAPPDATA: root };
    const setup = await runBuiltCli(["owner-identity", "setup"], environment, "Árvíztűrő Tükörfúrógép\n");
    const setupOutput = parseLastJsonLine(setup.stdout);
    const savedPath = join(root, "AI Booster Kit", "owner-identity.json");

    assert.equal(setup.code, 0);
    assert.equal(setupOutput.status, "SET");
    assert.equal(setup.stdout.includes("Árvíztűrő Tükörfúrógép"), false);
    assert.equal(setup.stdout.includes(root), false);
    assert.equal(setup.stderr.includes("Árvíztűrő Tükörfúrógép"), false);
    assert.deepEqual(JSON.parse(await readFile(savedPath, "utf8")), { version: 1, ownerAlias: "Árvíztűrő Tükörfúrógép" });

    const invalid = await runBuiltCli(["owner-identity", "reconfigure"], environment, "owner@example.com\n");
    const invalidOutput = parseLastJsonLine(invalid.stdout);

    assert.equal(invalid.code, 3);
    assert.equal(invalidOutput.status, "INVALID");
    assert.equal(invalid.stdout.includes("owner@example.com"), false);
    assert.equal(invalid.stdout.includes(root), false);
    assert.deepEqual(JSON.parse(await readFile(savedPath, "utf8")), { version: 1, ownerAlias: "Árvíztűrő Tükörfúrógép" });
  });
});

test("built owner identity CLI: empty explicit setup returns EMPTY and does not persist a profile", async () => {
  await withTemporaryDirectory(async (root) => {
    const environment = { ...process.env, LOCALAPPDATA: root };
    const setup = await runBuiltCli(["owner-identity", "setup"], environment, "\n");
    const savedPath = join(root, "AI Booster Kit", "owner-identity.json");

    assert.equal(setup.code, 2);
    assert.equal((parseLastJsonLine(setup.stdout) as { status: string }).status, "EMPTY");
    await assert.rejects(() => readFile(savedPath, "utf8"));
  });
});

test("built recommend-formation CLI: continues after EMPTY and reuses a saved profile on later starts", async () => {
  await withTemporaryDirectory(async (root) => {
    const input = join(root, "request.json");
    await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);

    const emptyEnvironment = { ...process.env, LOCALAPPDATA: join(root, "empty-profile-root") };
    const emptyResult = await runBuiltCli(["recommend-formation", "--input", input], emptyEnvironment, "\n");
    assert.equal(emptyResult.code, 0);
    assert.equal((parseLastJsonLine(emptyResult.stdout) as { decision: string }).decision, "RECOMMEND");

    const savedEnvironment = { ...process.env, LOCALAPPDATA: join(root, "saved-profile-root") };
    const savedLocalAppData = join(root, "saved-profile-root");
    const first = await runBuiltCli(["recommend-formation", "--input", input], savedEnvironment, "Új Tulajdonos\n");
    const second = await runBuiltCli(["recommend-formation", "--input", input], savedEnvironment, null);

    assert.equal(first.code, 0);
    assert.equal((parseLastJsonLine(first.stdout) as { decision: string }).decision, "RECOMMEND");
    assert.equal(second.code, 0);
    assert.equal((parseLastJsonLine(second.stdout) as { decision: string }).decision, "RECOMMEND");
    assert.deepEqual(
      JSON.parse(await readFile(join(savedLocalAppData, "AI Booster Kit", "owner-identity.json"), "utf8")),
      { version: 1, ownerAlias: "Új Tulajdonos" },
    );
  });
});

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "owner-identity-cli-red-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function parseLastJsonLine(source: string): Record<string, unknown> {
  const line = source
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value !== "")
    .at(-1);

  if (line === undefined) throw new Error("expected the built CLI to emit one JSON line");
  return JSON.parse(line);
}

async function runBuiltCli(argv: readonly string[], environment: NodeJS.ProcessEnv, stdinText: string | null): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], {
      cwd: process.cwd(),
      env: environment,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", rejectResult);
    child.once("close", (code) => { resolveResult({ code, stdout, stderr }); });

    if (stdinText !== null) child.stdin.end(stdinText, "utf8");
    else child.stdin.end();
  });
}

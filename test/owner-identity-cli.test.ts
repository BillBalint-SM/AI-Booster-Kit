import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { bootstrapOwnerIdentity } from "../src/controller/owner-identity-bootstrap.js";
import { createFileOwnerIdentityStorage } from "../src/owner-identity/storage.js";

const isWindowsHost = process.platform === "win32";

test("owner identity bootstrap entry: prompts only for the normal recommend-formation start", async () => {
  await withTemporaryDirectory(async (root) => {
    const storage = createFileOwnerIdentityStorage(join(root, "AI Booster Kit", "owner-identity.json"), root);
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
  await withTemporaryDirectory(async (root) => {
    const environment = { ...process.env, LOCALAPPDATA: join(root, "synthetic-localappdata") };
    const missingSubcommand = await runBuiltCli(["owner-identity"], environment, null);
    const forbiddenAlias = await runBuiltCli(["owner-identity", "setup", "--alias", "do-not-accept-this"], environment, null);
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
});

test("built owner identity CLI: Windows setup and reconfigure map exit codes without exposing raw alias or user-local path", { skip: !isWindowsHost }, async () => {
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

test("built owner identity CLI: Windows empty explicit setup returns EMPTY and does not persist a profile", { skip: !isWindowsHost }, async () => {
  await withTemporaryDirectory(async (root) => {
    const environment = { ...process.env, LOCALAPPDATA: root };
    const setup = await runBuiltCli(["owner-identity", "setup"], environment, "\n");
    const savedPath = join(root, "AI Booster Kit", "owner-identity.json");

    assert.equal(setup.code, 2);
    assert.equal((parseLastJsonLine(setup.stdout) as { status: string }).status, "EMPTY");
    await assert.rejects(() => readFile(savedPath, "utf8"));
  });
});

test("built owner identity CLI: unsupported hosts return UNAVAILABLE without persisting a profile", { skip: isWindowsHost }, async () => {
  await withTemporaryDirectory(async (root) => {
    const environment = { ...process.env, LOCALAPPDATA: root };
    const setup = await runBuiltCli(["owner-identity", "setup"], environment, "Unavailable Alias\n");
    const reconfigure = await runBuiltCli(["owner-identity", "reconfigure"], environment, "Another Alias\n");
    const savedPath = join(root, "AI Booster Kit", "owner-identity.json");

    assert.equal(setup.code, 3);
    assert.equal((parseLastJsonLine(setup.stdout) as { status: string }).status, "UNAVAILABLE");
    assert.equal(reconfigure.code, 3);
    assert.equal((parseLastJsonLine(reconfigure.stdout) as { status: string }).status, "UNAVAILABLE");
    assert.equal(setup.stdout.includes("Unavailable Alias"), false);
    assert.equal(reconfigure.stdout.includes("Another Alias"), false);
    assert.equal(setup.stdout.includes(root), false);
    assert.equal(reconfigure.stdout.includes(root), false);
    await assert.rejects(() => readFile(savedPath, "utf8"));
  });
});

test("built owner identity CLI: unavailable user-local target returns exit 3 with no repository fallback", async () => {
  await withTemporaryDirectory(async (root) => {
    const localAppDataFile = join(root, "synthetic-localappdata-file");
    await writeFile(localAppDataFile, "occupied\n", "utf8");
    const environment = { ...process.env, LOCALAPPDATA: localAppDataFile };
    const setup = await runBuiltCli(["owner-identity", "setup"], environment, "Unavailable Alias\n");
    const output = parseLastJsonLine(setup.stdout) as { status: string };

    assert.equal(setup.code, 3);
    assert.equal(output.status, "UNAVAILABLE");
    assert.equal(setup.stdout.includes("Unavailable Alias"), false);
    assert.equal(setup.stdout.includes(root), false);
    await assert.rejects(() => readFile(join(root, "AI Booster Kit", "owner-identity.json"), "utf8"));
  });
});

test("built recommend-formation CLI: continues after EMPTY and reuses a saved profile on later starts", async () => {
  await withTemporaryDirectory(async (root) => {
    const input = join(root, "request.json");
    await writeFile(input, JSON.stringify({
      requestVersion: "1.0",
      workItemType: "Quick Task",
      goal: "Validate the Owner Identity platform-start gate.",
      outcomeOwner: "delivery-team",
      complexity: "LOW",
      executionBoundary: "LOCAL_ONLY",
      value: { state: "KNOWN", statement: "A reusable local platform session." },
      context: { state: "CURRENT", reference: "owner-identity-v1" },
      relations: { state: "ABSENT", items: [] },
      dependencies: { state: "ABSENT", items: [] },
      formationInput: {
        scenario: "validation",
        claim: "The Owner Identity session gate completes without blocking the platform session.",
        acceptanceCriteria: ["the platform session continues after Alias empty"],
        evidenceSources: ["built CLI test output"],
        knownLimits: ["only Windows user-local storage is implemented in v1"],
      },
    }), "utf8");

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
    const savedPath = join(savedLocalAppData, "AI Booster Kit", "owner-identity.json");

    if (isWindowsHost) {
      assert.deepEqual(
        JSON.parse(await readFile(savedPath, "utf8")),
        { version: 1, ownerAlias: "Új Tulajdonos" },
      );
    } else {
      await assert.rejects(() => readFile(savedPath, "utf8"));
    }
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

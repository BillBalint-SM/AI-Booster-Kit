import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import { parseReadinessObservationBundle, type ReadinessAdapter, type ReadinessObservationBundle } from "../src/readiness/observations.js";
import { runReadinessCertificate } from "../src/readiness/run.js";
import { readinessCapability } from "./readiness-capability.js";

const manifestPath = resolve("contract/readiness/g2as-sandbox-target.json");
const capabilityPath = resolve("contract/mcp-capabilities/github-readonly.json");
const readinessManifest = parseG2asReadinessManifest({
  version: 1,
  tenantUrl: "https://pte-politechnika.atlassian.net",
  jira: { projectKey: "G2AS", issueKey: "G2AS-1", expectedStatus: "To Do" },
  confluence: { spaceKey: "G2AS", pageId: "31752193" },
  github: {
    repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
    branch: "main",
    commit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"],
  },
});

test("readiness runner: reads the injected adapter exactly once before evaluating", async () => {
  const bundle = await readFixture("ready.json");
  let calls = 0;
  const adapter: ReadinessAdapter = {
    async read(): Promise<ReadinessObservationBundle> {
      calls += 1;
      return bundle;
    },
  };

  const certificate = await runReadinessCertificate(readinessManifest, adapter, readinessCapability);

  assert.equal(calls, 1);
  assert.equal(certificate.decision, "READY");
});

test("built readiness CLI: creates exactly the two local certificate files for every fixture", async () => {
  const root = await mkdtemp(join(tmpdir(), "g2as-readiness-cli-"));

  try {
    const cases: ReadonlyArray<readonly [string, "READY" | "NOT READY" | "STOPPED", number]> = [
      ["ready.json", "READY", 0],
      ["not-ready.json", "STOPPED", 3],
      ["stopped.json", "STOPPED", 3],
    ];

    for (const [fixtureName, decision, exitCode] of cases) {
      const outputDirectory = join(root, fixtureName.replace(".json", ""));
      const result = await runBuiltCli([
        "readiness",
        "--manifest", manifestPath,
        "--capability", capabilityPath,
        "--observations", resolve("test/fixtures/readiness", fixtureName),
        "--output-dir", outputDirectory,
      ]);

      assert.equal(result.code, exitCode);
      assert.equal(result.stderr, "");
      assert.deepEqual(JSON.parse(result.stdout), { decision });
      assert.deepEqual((await readdir(outputDirectory)).sort(), [
        "g2as-sandbox-readiness-certificate.json",
        "g2as-sandbox-readiness-certificate.md",
      ]);

      const certificate = JSON.parse(await readFile(join(outputDirectory, "g2as-sandbox-readiness-certificate.json"), "utf8")) as Record<string, unknown>;
      const markdown = await readFile(join(outputDirectory, "g2as-sandbox-readiness-certificate.md"), "utf8");
      assert.equal(certificate.decision, decision);
      assert.match(markdown, new RegExp(`Decision: ${decision}`));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("built readiness CLI: maps malformed args and unreadable local input to configuration failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "g2as-readiness-cli-"));

  try {
    const malformed = await runBuiltCli(["readiness", "--manifest", manifestPath]);
    assert.equal(malformed.code, 4);
    assert.deepEqual(JSON.parse(malformed.stderr), { error: "CONFIGURATION_ERROR" });

    const unreadable = await runBuiltCli([
      "readiness",
      "--manifest", manifestPath,
      "--capability", capabilityPath,
      "--observations", join(root, "missing.json"),
      "--output-dir", join(root, "output"),
    ]);
    assert.equal(unreadable.code, 4);
    assert.deepEqual(JSON.parse(unreadable.stderr), { error: "CONFIGURATION_ERROR" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("built readiness CLI: maps a completed non-verification to exit code 2", async () => {
  const root = await mkdtemp(join(tmpdir(), "g2as-readiness-cli-"));

  try {
    const observationPath = join(root, "not-ready.json");
    const bundle = JSON.parse(await readFile(resolve("test/fixtures/readiness/ready.json"), "utf8")) as {
      observations: Array<{ source: string; state: string; diagnosticCode: string }>;
    };
    const confluence = bundle.observations.find((observation) => observation.source === "confluence");

    if (confluence === undefined) throw new Error("test fixture is missing its Confluence observation");
    confluence.state = "unknown";
    confluence.diagnosticCode = "NONE";
    await writeFile(observationPath, JSON.stringify(bundle), "utf8");

    const result = await runBuiltCli([
      "readiness",
      "--manifest", manifestPath,
      "--capability", capabilityPath,
      "--observations", observationPath,
      "--output-dir", join(root, "output"),
    ]);

    assert.equal(result.code, 2);
    assert.deepEqual(JSON.parse(result.stdout), { decision: "NOT READY" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function readFixture(name: string): Promise<ReadinessObservationBundle> {
  return parseReadinessObservationBundle(JSON.parse(await readFile(resolve("test/fixtures/readiness", name), "utf8")));
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

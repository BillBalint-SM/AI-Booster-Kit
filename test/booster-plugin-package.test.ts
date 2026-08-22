import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { test } from "node:test";

const pluginRoot = resolve("plugins/ai-booster-kit");
const skillIds = [
  "ai-booster-kit",
  "booster-plan",
  "booster-team-align",
  "booster-implement",
  "booster-test",
  "booster-review",
  "booster-handoff",
] as const;

test("plugin exposes one Skills-only distribution for Codex and Claude Code", async () => {
  const codex = await readJson(join(pluginRoot, ".codex-plugin", "plugin.json"));
  const claude = await readJson(join(pluginRoot, ".claude-plugin", "plugin.json"));
  const codexMarketplace = await readJson(resolve(".agents/plugins/marketplace.json"));
  const claudeMarketplace = await readJson(resolve(".claude-plugin/marketplace.json"));

  assert.equal(codex.name, "ai-booster-kit");
  assert.equal(codex.version, "0.1.0");
  assert.equal(codex.skills, "./skills/");
  assert.equal(claude.name, "ai-booster-kit");
  assert.equal(claude.version, "0.1.0");
  assert.equal(claude.skills, "./claude-skills/");
  assert.equal(codexMarketplace.plugins[0].source.path, "./plugins/ai-booster-kit");
  assert.equal(codexMarketplace.plugins[0].policy.installation, "AVAILABLE");
  assert.equal(codexMarketplace.plugins[0].policy.authentication, "ON_INSTALL");
  assert.equal(claudeMarketplace.plugins[0].source, "./plugins/ai-booster-kit");
});

test("plugin contains exactly seven explicit Skills in both host views", async () => {
  const expected = [...skillIds].sort();
  assert.deepEqual((await readdir(join(pluginRoot, "skills"))).sort(), expected);
  assert.deepEqual((await readdir(join(pluginRoot, "claude-skills"))).sort(), expected);

  for (const skillId of skillIds) {
    const codexSkill = await readFile(join(pluginRoot, "skills", skillId, "SKILL.md"), "utf8");
    const claudeSkill = await readFile(join(pluginRoot, "claude-skills", skillId, "SKILL.md"), "utf8");
    const policy = await readFile(join(pluginRoot, "skills", skillId, "agents", "openai.yaml"), "utf8");

    assert.match(codexSkill, new RegExp(`^name: ${skillId}$`, "mu"));
    assert.doesNotMatch(codexSkill, /disable-model-invocation/u);
    assert.match(claudeSkill, new RegExp(`^name: ${skillId}$`, "mu"));
    assert.match(claudeSkill, /^disable-model-invocation: true$/mu);
    assert.doesNotMatch(claudeSkill, /\$[a-z][a-z0-9-]*/u);
    assert.match(policy, new RegExp(`\\$${skillId}\\b`, "u"));
    assert.match(policy, /^  allow_implicit_invocation: false$/mu);
  }
});

test("plugin has no bundled runtime, registry, schema, or verifier", async () => {
  assert.deepEqual((await readdir(pluginRoot)).sort(), [
    ".claude-plugin",
    ".codex-plugin",
    "LICENSE",
    "README.md",
    "claude-skills",
    "skills",
  ]);

  for (const retiredPath of ["assets", "registry", "scripts"]) {
    await assert.rejects(access(join(pluginRoot, retiredPath)));
  }

  const packageJson = await readJson(resolve("package.json"));
  const cliSource = await readFile(resolve("src/cli.ts"), "utf8");
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.doesNotMatch(cliSource, /command === "booster"/u);
});

test("generated Claude views and bundled license are current", async () => {
  const result = await runNode(resolve("scripts/package-booster-plugin.mjs"), ["--check"]);
  assert.equal(result.code, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /BOOSTER_PACKAGE=READY/u);
  assert.equal(
    await readFile(join(pluginRoot, "LICENSE"), "utf8"),
    await readFile(resolve("LICENSE"), "utf8"),
  );
});

test("plugin documentation names the canonical marketplace without runtime claims", async () => {
  const readme = await readFile(join(pluginRoot, "README.md"), "utf8");
  assert.match(readme, /BillBalint-SM\/AI-Booster-Kit/u);
  assert.match(readme, /Skills-only/u);
  assert.doesNotMatch(readme, /Compass|Registry|booster\.mjs/u);
});

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

function runNode(script: string, args: readonly string[]): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
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

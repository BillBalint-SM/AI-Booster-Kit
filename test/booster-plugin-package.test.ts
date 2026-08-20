import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";

import { projectDeliveryCompass, type BoosterSkillRegistry } from "../src/booster/compass.js";

const PLUGIN = resolve("plugins/ai-booster-kit");
const SKILLS = [
  "ai-booster-kit",
  "planning-show",
  "booster-team-align",
  "booster-implement",
  "booster-test",
  "booster-review",
  "booster-handoff",
] as const;

test("plugin package exposes one dual-host skill distribution and no custom Agent or Model", async () => {
  const codex = await readJson(join(PLUGIN, ".codex-plugin", "plugin.json"));
  const claude = await readJson(join(PLUGIN, ".claude-plugin", "plugin.json"));
  const codexMarketplace = await readJson(resolve(".agents/plugins/marketplace.json"));
  const claudeMarketplace = await readJson(resolve(".claude-plugin/marketplace.json"));

  assert.equal(codex.name, "ai-booster-kit");
  assert.equal(codex.version, "0.1.0");
  assert.equal(codex.skills, "./skills/");
  assert.equal(claude.name, "ai-booster-kit");
  assert.equal(claude.version, "0.1.0");
  assert.equal(claude.skills, "./claude-skills/");
  assert.equal(claude.description, "Methodology-as-code delivery guidance for existing Codex and Claude Code agents.");
  assert.equal(codexMarketplace.plugins[0].source.path, "./plugins/ai-booster-kit");
  assert.equal(claudeMarketplace.plugins[0].source, "./plugins/ai-booster-kit");
  assert.equal(claudeMarketplace.plugins[0].name, "ai-booster-kit");

  const registry = await readJson(join(PLUGIN, "registry", "skill-registry.json"));
  for (const skill of registry.skills) {
    assert.equal(skill.invocation.claudeCode, `/ai-booster-kit:${skill.id}`);
  }

  await assert.rejects(readFile(join(PLUGIN, "agents", "README.md"), "utf8"));
  for (const skill of SKILLS) {
    const codexInstruction = await readFile(join(PLUGIN, "skills", skill, "SKILL.md"), "utf8");
    const claudeInstruction = await readFile(join(PLUGIN, "claude-skills", skill, "SKILL.md"), "utf8");
    const codexPolicy = await readFile(join(PLUGIN, "skills", skill, "agents", "openai.yaml"), "utf8");
    assert.match(codexInstruction, new RegExp(`name: ${skill}`, "u"));
    assert.doesNotMatch(codexInstruction, /disable-model-invocation/u);
    assert.match(claudeInstruction, new RegExp(`name: ${skill}`, "u"));
    assert.match(claudeInstruction, /disable-model-invocation: true/u);
    assert.match(codexPolicy, new RegExp(`\\$${skill}`, "u"));
    assert.match(codexPolicy, /allow_implicit_invocation: false/u);
  }
});

test("packaged planning skill and registry are byte-aligned with their canonical repository sources", async () => {
  const canonicalPlanning = await readFile(resolve("skills/planning-show/SKILL.md"), "utf8");
  assert.equal(
    await readFile(join(PLUGIN, "skills", "planning-show", "SKILL.md"), "utf8"),
    canonicalPlanning.replace(/^disable-model-invocation: true\r?\n/mu, ""),
  );
  assert.equal(
    await readFile(join(PLUGIN, "claude-skills", "planning-show", "SKILL.md"), "utf8"),
    adaptExpectedClaudeSkill(canonicalPlanning),
  );
  assert.equal(
    await readFile(join(PLUGIN, "skills", "planning-show", "agents", "openai.yaml"), "utf8"),
    await readFile(resolve("skills/planning-show/agents/openai.yaml"), "utf8"),
  );
  assert.equal(
    await readFile(join(PLUGIN, "registry", "skill-registry.json"), "utf8"),
    await readFile(resolve("contract/booster/skill-registry.json"), "utf8"),
  );
});

test("installed plugin carries the repository MIT license unchanged", async () => {
  const repositoryLicense = await readFile(resolve("LICENSE"), "utf8");

  assert.match(repositoryLicense, /^MIT License\r?$/mu);
  assert.match(repositoryLicense, /Copyright \(c\) 2026 AI Booster Kit contributors/u);
  assert.equal(await readFile(join(PLUGIN, "LICENSE"), "utf8"), repositoryLicense);
});

test("published install instructions name the canonical GitHub marketplace", async () => {
  for (const path of [
    resolve("README.md"),
    join(PLUGIN, "README.md"),
    resolve("docs/handbook/plugin-installation.md"),
  ]) {
    const instructions = await readFile(path, "utf8");
    assert.match(instructions, /BillBalint-SM\/AI-Booster-Kit/u);
    assert.doesNotMatch(instructions, /<owner>\/<repo>/u);
  }
});

test("Claude Skill adapters use only the installed plugin namespace for invocation and continuation", async () => {
  const expectedContinuations: Record<(typeof SKILLS)[number], readonly string[]> = {
    "ai-booster-kit": [],
    "planning-show": [],
    "booster-team-align": ["booster-implement"],
    "booster-implement": ["booster-test", "booster-review"],
    "booster-test": ["booster-review", "booster-implement", "booster-handoff"],
    "booster-review": ["booster-implement", "booster-test", "booster-handoff"],
    "booster-handoff": [],
  };

  for (const skill of SKILLS) {
    const instruction = await readFile(join(PLUGIN, "claude-skills", skill, "SKILL.md"), "utf8");
    assert.doesNotMatch(instruction, /`\$[a-z][a-z0-9-]*`/u, `${skill} contains a Codex invocation`);
    assert.doesNotMatch(instruction, /`\/planning-show`/u, `${skill} contains an unnamespaced Claude invocation`);
    for (const continuation of expectedContinuations[skill]) {
      assert.match(
        instruction,
        new RegExp(`/ai-booster-kit:${continuation}\\b`, "u"),
        `${skill} does not expose the registered Claude continuation ${continuation}`,
      );
    }
  }
});

test("standalone plugin runtime works from a copied cache directory and matches the TypeScript core", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-installed-"));
  const installedPlugin = join(root, "cache", "ai-booster-kit");
  await cp(PLUGIN, installedPlugin, { recursive: true });
  const inputPath = resolve("examples/booster/start.json");
  const result = await runNode(join(installedPlugin, "scripts", "booster.mjs"), ["--input", inputPath], root);
  const actual = JSON.parse(result.stdout);
  const input = await readJson(inputPath);
  const registry = await readJson(resolve("contract/booster/skill-registry.json")) as BoosterSkillRegistry;
  const expected = projectDeliveryCompass(input, registry);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(actual, expected);
  assert.ok(actual.recommendation);
  assert.equal(actual.recommendation.skillId, "planning-show");
  assert.equal(actual.executionPerformed, false);
  assert.equal(actual.persistencePerformed, false);
});

test("generated plugin package is fresh", async () => {
  const result = await runNode(resolve("scripts/package-booster-plugin.mjs"), ["--check"], process.cwd());
  assert.equal(result.code, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /BOOSTER_PACKAGE=READY/u);
});

test("standalone plugin runtime exposes stable errors without internal control fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-error-"));
  const input = join(root, "invalid.json");
  await writeFile(input, "{", "utf8");

  const result = await runNode(join(PLUGIN, "scripts", "booster.mjs"), ["--input", input], root);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 3);
  assert.deepEqual(value.error, {
    code: "BOOSTER_INPUT_JSON_INVALID",
    message: "The supplied Booster JSON is invalid",
  });
});

test("packaged request schema accepts every documented Booster example", async () => {
  const schema = await readJson(join(PLUGIN, "assets", "booster-request.schema.json"));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  for (const name of [
    "start",
    "attach-in-progress",
    "after-plan",
    "resume-accepted-plan",
    "team-after-plan",
    "standalone-test",
    "stopped",
    "complete",
  ]) {
    assert.equal(validate(await readJson(resolve(`examples/booster/${name}.json`))), true, `${name}: ${JSON.stringify(validate.errors)}`);
  }
});

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

function runNode(script: string, args: readonly string[], cwd: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

function adaptExpectedClaudeSkill(source: string): string {
  let adapted = source
    .replace(
      /- Start only from an explicit `\$ai-booster-kit` request in Codex or the\r?\n  namespaced `\/ai-booster-kit:ai-booster-kit` Skill in Claude Code\./u,
      "- Start only from an explicit `/ai-booster-kit:ai-booster-kit` request in Claude Code.",
    )
    .replace(
      "- Start only from an explicit `/planning-show` or `$planning-show` request.",
      "- Start only from an explicit `/ai-booster-kit:planning-show` request.",
    );
  for (const skill of SKILLS) {
    adapted = adapted.replaceAll(`$${skill}`, `/ai-booster-kit:${skill}`);
  }
  return adapted.replaceAll("/planning-show", "/ai-booster-kit:planning-show");
}

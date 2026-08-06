import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

const PACKAGED_SKILL_PATH = resolve("skills/planning-show/SKILL.md");
const PACKAGED_POLICY_PATH = resolve("skills/planning-show/agents/openai.yaml");

const APPROVED_SKILL_SHA256 = "dae31783a1f2682b6e967e3c8e447e65e8f112698dbb71ab720d0430b51f694b";
const APPROVED_POLICY_SHA256 = "f944f1a5d661fbf772b47ab4818b76d24a66e115cbdc5ac5821df91fcc9d424e";

test("planning-show package matches the approved skill source and policy without introducing prohibited data", async () => {
  const packagedSkill = await readNormalizedText(PACKAGED_SKILL_PATH);
  const packagedPolicy = await readNormalizedText(PACKAGED_POLICY_PATH);

  assert.equal(sha256(packagedSkill), APPROVED_SKILL_SHA256);
  assert.equal(sha256(packagedPolicy), APPROVED_POLICY_SHA256);

  assert.ok(
    packagedSkill.startsWith(
      [
        "---",
        "name: planning-show",
        "description: Systematically examine plans, designs, and refinements through focused questioning, decision resolution, and a scoped Markdown handoff.",
        "disable-model-invocation: true",
        "---",
      ].join("\n"),
    ),
  );

  assert.ok(packagedSkill.includes("Round 0"));
  assert.ok(packagedSkill.includes("NEW"));
  assert.ok(packagedSkill.includes("RESUME"));
  assert.ok(packagedSkill.includes("dependency-aware design tree"));
  assert.ok(packagedSkill.includes("frontier"));
  assert.ok(packagedSkill.includes("conflict"));
  assert.ok(packagedSkill.includes("scope-change"));
  assert.ok(packagedSkill.includes("final confirmation"));
  assert.ok(packagedSkill.includes("handoff"));

  assert.ok(packagedPolicy.includes("display_name: \"Planning-Show\""));
  assert.ok(packagedPolicy.includes("short_description: \"Sharpen a plan through interview\""));
  assert.ok(packagedPolicy.includes("default_prompt: \"Use $planning-show to sharpen a plan or design into a shared-understanding handoff.\""));
  assert.ok(packagedPolicy.includes("allow_implicit_invocation: false"));

  assertNoProhibitedData(packagedSkill);
  assertNoProhibitedData(packagedPolicy);
});

async function readNormalizedText(path: string): Promise<string> {
  return (await readFile(path, "utf8")).replace(/\r\n/g, "\n");
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function assertNoProhibitedData(text: string): void {
  const forbiddenPatterns = [
    /ghp_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /sk-[A-Za-z0-9]{20,}/,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
    /client_secret/i,
    /api[_-]?key/i,
    /password/i,
    /https?:\/\/(?:github\.com|gitlab\.com|bitbucket\.org|openai\.com|jira\.[^\s/]+|confluence\.[^\s/]+)/i,
    /git@[\w.-]+:[\w./-]+/,
    /@[\w.-]+\.[A-Za-z]{2,}/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `Unexpected prohibited data matched by ${pattern}`);
  }
}

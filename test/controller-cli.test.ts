import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built controller CLI: emits one recommendation JSON object without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const before = await readdir(root);

  const result = await runBuiltCli(["quick-task", "--input", input]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).decision, "RECOMMEND");
  assert.deepEqual(await readdir(root), before);
});

test("built Agent profile CLI: lists user-facing profiles without activation", async () => {
  const result = await runBuiltCli(["list-agent-profiles"]);
  const catalog = JSON.parse(result.stdout) as {
    catalogId: string;
    profiles: readonly { profileId: string; displayName: string; usageTopics: readonly string[]; workflowRoles: readonly string[] }[];
  };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(catalog.catalogId, "agent-profile-library");
  assert.equal(catalog.profiles.length, 24);
  assert.equal(catalog.profiles.some((profile) => profile.profileId === "senior-developer"), false);
  assert.equal(catalog.profiles.find((profile) => profile.profileId === "senior-full-stack-engineer")?.displayName, "Senior Full-Stack Engineer");
  assert.deepEqual(
    catalog.profiles.filter((profile) => profile.usageTopics.includes("planning")).map((profile) => profile.profileId),
    [
      "multi-agent-systems-architect",
      "workflow-architect",
      "software-architect",
      "product-manager",
      "senior-project-manager",
      "sprint-prioritizer",
      "technical-writer",
    ],
  );
  assert.equal(catalog.profiles.find((profile) => profile.profileId === "code-reviewer")?.workflowRoles.includes("reviewer"), true);
});

test("built formation CLI: exposes a ready validation recommendation without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    workItemType: "Quick Task",
    goal: "Validate the local contract with tests.",
    outcomeOwner: "delivery-team",
    complexity: "LOW",
    executionBoundary: "LOCAL_ONLY",
    value: { state: "KNOWN", statement: "A bounded local result." },
    context: { state: "CURRENT", reference: "repository-state" },
    relations: { state: "ABSENT", items: [] },
    dependencies: { state: "ABSENT", items: [] },
    formationInput: {
      scenario: "validation",
      claim: "The local contract is valid.",
      acceptanceCriteria: ["all contract checks pass"],
      evidenceSources: ["local test output"],
      knownLimits: ["Node 26 CI is the declared runtime line"],
    },
  }), "utf8");
  const before = await readdir(root);

  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const recommendation = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "validation");
  assert.equal(recommendation.formation.formationId, "bounded-validation");
  assert.deepEqual(await readdir(root), before);
});

test("built formation CLI: exposes a ready research recommendation without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    workItemType: "Quick Task",
    goal: "Research primary sources for the contract.",
    outcomeOwner: "delivery-team",
    complexity: "MEDIUM",
    executionBoundary: "LOCAL_ONLY",
    value: { state: "KNOWN", statement: "A bounded source-backed brief." },
    context: { state: "CURRENT", reference: "repository-state" },
    relations: { state: "ABSENT", items: [] },
    dependencies: { state: "ABSENT", items: [] },
    formationInput: {
      scenario: "research",
      scope: "Confirm the contract's source-backed authority boundary.",
      sourceAllowlist: ["official repository documentation"],
      evidenceStandard: ["primary source link and quoted finding"],
    },
  }), "utf8");
  const before = await readdir(root);

  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const recommendation = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "research");
  assert.equal(recommendation.formation.formationId, "bounded-research");
  assert.deepEqual(await readdir(root), before);
});

test("built formation CLI: exposes a ready refinement recommendation without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    workItemType: "Quick Task",
    goal: "Refine the acceptance criteria and scope.",
    outcomeOwner: "delivery-team",
    complexity: "LOW",
    executionBoundary: "LOCAL_ONLY",
    value: { state: "KNOWN", statement: "A bounded local result." },
    context: { state: "CURRENT", reference: "repository-state" },
    relations: { state: "ABSENT", items: [] },
    dependencies: { state: "ABSENT", items: [] },
    formationInput: {
      scenario: "refinement",
      currentScope: "The controller remains local and recommendation-only.",
      constraints: ["Do not activate a host or connector."],
      openQuestions: ["Which remaining scenario should become READY next?"],
    },
  }), "utf8");
  const before = await readdir(root);

  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const recommendation = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "refinement");
  assert.equal(recommendation.formation.formationId, "bounded-refinement");
  assert.deepEqual(await readdir(root), before);
});

test("built formation CLI: exposes a ready implementation recommendation without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    workItemType: "Quick Task",
    goal: "Implement a bounded parser improvement.",
    outcomeOwner: "delivery-team",
    complexity: "MEDIUM",
    executionBoundary: "LOCAL_ONLY",
    value: { state: "KNOWN", statement: "A bounded local implementation." },
    context: { state: "CURRENT", reference: "repository-state" },
    relations: { state: "ABSENT", items: [] },
    dependencies: { state: "ABSENT", items: [] },
    formationInput: {
      scenario: "development",
      repository: "AI Booster Kit",
      repositoryState: "VERIFIED",
      acceptanceCriteria: ["the implementation contract is validated"],
      testStrategy: ["focused and full test suites pass"],
      planState: "ACCEPTED",
      rollbackBoundary: "preserve the prior setup and stop before external writes",
    },
  }), "utf8");
  const before = await readdir(root);

  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const recommendation = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "development");
  assert.equal(recommendation.formation.formationId, "bounded-implementation");
  assert.deepEqual(await readdir(root), before);
});

test("built formation CLI: exposes a ready debugging recommendation without writing artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    workItemType: "Quick Task",
    goal: "Debug the failing parser test.",
    outcomeOwner: "delivery-team",
    complexity: "MEDIUM",
    executionBoundary: "LOCAL_ONLY",
    value: { state: "KNOWN", statement: "A bounded root-cause record." },
    context: { state: "CURRENT", reference: "repository-state" },
    relations: { state: "ABSENT", items: [] },
    dependencies: { state: "ABSENT", items: [] },
    formationInput: {
      scenario: "debugging",
      symptom: "The parser rejects a valid frontmatter document.",
      reproduction: ["Run the focused parser test with the valid fixture."],
      expectedBehavior: "The parser accepts the valid fixture.",
      environment: ["AI Booster Kit verified local revision", "Node 26 test runtime"],
    },
  }), "utf8");
  const before = await readdir(root);
  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const recommendation = JSON.parse(result.stdout);
  assert.equal(result.code, 0);
  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.formation.formationId, "bounded-debugging");
  assert.deepEqual(await readdir(root), before);
});

test("built formation CLI: preserves an ambiguous scenario as UNKNOWN", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    workItemType: "Quick Task",
    goal: "Research and implement the parser.",
    outcomeOwner: "delivery-team",
    complexity: "LOW",
    executionBoundary: "LOCAL_ONLY",
  }), "utf8");

  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const recommendation = JSON.parse(result.stdout);

  assert.equal(result.code, 2);
  assert.equal(recommendation.decision, "UNKNOWN");
  assert.equal(recommendation.scenario, "UNKNOWN");
  assert.deepEqual(recommendation.unknownEvidence, ["scenario"]);
});

test("built formation CLI: stops malformed JSON without echoing input", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, "{\"privateValue\":\"do-not-echo-this-value\"", "utf8");

  const result = await runBuiltCli(["recommend-formation", "--input", input]);
  const stopped = JSON.parse(result.stdout);

  assert.equal(result.code, 3);
  assert.equal(stopped.decision, "STOPPED");
  assert.equal(stopped.error.code, "FORMATION_INPUT_JSON_INVALID");
  assert.equal(result.stdout.includes("do-not-echo-this-value"), false);
});

test("built controller CLI: returns stopped JSON for malformed local input", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await writeFile(input, "{", "utf8");

  const result = await runBuiltCli(["quick-task", "--input", input]);

  assert.equal(result.code, 3);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).decision, "STOPPED");
});

test("built controller CLI: resolves every explicit checkpoint choice without writing an artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout);
  const checkpoint = recommendation.checkpoint;
  assert.ok(checkpoint);

  const accepts = [
    { name: "accept.json", value: { choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: checkpoint.requestFingerprint, expectedRecipeSignature: checkpoint.recipeSignature }, state: "ACTIVATION_INTENT" },
    { name: "alternative.json", value: { choice: "REQUEST_ALTERNATIVE", expectedRequestFingerprint: checkpoint.requestFingerprint, expectedRecipeSignature: checkpoint.recipeSignature, rationale: "Use a research-oriented recipe." }, state: "ALTERNATIVE_REQUESTED" },
    { name: "no-agent.json", value: { choice: "CONTINUE_WITHOUT_AGENT", expectedRequestFingerprint: checkpoint.requestFingerprint, expectedRecipeSignature: checkpoint.recipeSignature }, state: "NO_AGENT_CONTINUATION" },
  ];
  for (const accepted of accepts) await writeFile(join(root, accepted.name), JSON.stringify(accepted.value), "utf8");
  const before = await readdir(root);

  for (const accepted of accepts) {
    const result = await runBuiltCli(["resolve-checkpoint", "--input", input, "--choice", join(root, accepted.name)]);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).state, accepted.state);
  }
  assert.deepEqual(await readdir(root), before);
});

test("built controller CLI: stops malformed, stale, and non-resolvable checkpoint paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-controller-"));
  const input = join(root, "request.json");
  await copyFile(resolve("test/fixtures/controller/eligible-quick-task.json"), input);
  const recommendation = JSON.parse((await runBuiltCli(["quick-task", "--input", input])).stdout);
  const checkpoint = recommendation.checkpoint;
  assert.ok(checkpoint);
  const malformed = join(root, "malformed-choice.json");
  const stale = join(root, "stale-choice.json");
  await writeFile(malformed, "{", "utf8");
  await writeFile(stale, JSON.stringify({ choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: "c".repeat(64), expectedRecipeSignature: checkpoint.recipeSignature }), "utf8");
  const before = await readdir(root);

  for (const choice of [malformed, stale]) {
    const result = await runBuiltCli(["resolve-checkpoint", "--input", input, "--choice", choice]);
    assert.notEqual(result.code, 0);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).decision, "STOPPED");
  }
  assert.deepEqual(await readdir(root), before);
});

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

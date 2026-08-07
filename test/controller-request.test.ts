import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { patternId, requestFingerprint } from "../src/controller/identity.js";
import { parseQuickTaskRequest } from "../src/controller/request.js";
import type { QuickTaskRecipe } from "../src/controller/types.js";

const recipe: QuickTaskRecipe = {
  recipeId: "quick-task-clarifier-validator",
  recipeVersion: "0.1.0",
  status: "READY_WITH_LIMIT",
  supportedWorkItem: "Quick Task",
  controller: { version: 1, eligibleComplexities: ["LOW", "MEDIUM"], executionBoundary: "LOCAL_ONLY", requiredDor: ["value", "context", "relations", "dependencies"], authority: "RECOMMENDATION_ONLY" },
};

test("quick task request: parses the closed eligible request", async () => {
  const request = parseQuickTaskRequest(await fixture("eligible-quick-task.json"));

  assert.equal(request.goal, "Validate the local controller recommendation contract.");
  assert.deepEqual(request.dependencies, { state: "ABSENT", items: [] });
});

test("quick task request: rejects unknown input without echoing its value", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  value.unexpected = "do-not-echo-this-value";

  assert.throws(
    () => parseQuickTaskRequest(value),
    (error: unknown) => error instanceof Error && /unexpected is not allowed/.test(error.message) && !error.message.includes("do-not-echo-this-value"),
  );
});

test("quick task request: rejects a non-local boundary", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  value.executionBoundary = "EXTERNAL_WRITE";

  assert.throws(() => parseQuickTaskRequest(value), /executionBoundary must be LOCAL_ONLY/);
});

test("quick task request: parses the validation profile and rejects incomplete profile input", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  value.formationInput = {
    scenario: "validation",
    claim: "The local contract is valid.",
    acceptanceCriteria: ["all contract checks pass"],
    evidenceSources: ["local test output"],
    knownLimits: ["Node 26 CI is the declared runtime line"],
  };
  const request = parseQuickTaskRequest(value);

  assert.equal(request.formationInput?.scenario, "validation");
  assert.deepEqual(request.formationInput?.acceptanceCriteria, ["all contract checks pass"]);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...value.formationInput as object, evidenceSources: [] } }), /formationInput\.evidenceSources must be a non-empty list of non-empty strings/);
});

test("quick task request: parses the refinement profile and rejects an empty scope", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  value.formationInput = {
    scenario: "refinement",
    currentScope: "The controller remains local and recommendation-only.",
    constraints: ["Do not activate a host or connector."],
    openQuestions: ["Which remaining scenario should become READY next?"],
  };
  const request = parseQuickTaskRequest(value);

  assert.equal(request.formationInput?.scenario, "refinement");
  assert.deepEqual(request.formationInput?.constraints, ["Do not activate a host or connector."]);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...value.formationInput as object, currentScope: "" } }), /formationInput\.currentScope must be a non-empty string/);
});

test("quick task request: parses the research profile and rejects an empty source allowlist", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  value.formationInput = {
    scenario: "research",
    scope: "Confirm the contract's source-backed authority boundary.",
    sourceAllowlist: ["official repository documentation"],
    evidenceStandard: ["primary source link and quoted finding"],
  };
  const request = parseQuickTaskRequest(value);

  assert.equal(request.formationInput?.scenario, "research");
  assert.deepEqual(request.formationInput?.sourceAllowlist, ["official repository documentation"]);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...value.formationInput as object, sourceAllowlist: [] } }), /formationInput\.sourceAllowlist must be a non-empty list of non-empty strings/);
});

test("quick task request: parses the implementation profile and rejects an empty repository", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  value.formationInput = {
    scenario: "development",
    repository: "AI Booster Kit",
    repositoryState: "VERIFIED",
    acceptanceCriteria: ["the implementation contract is validated"],
    testStrategy: ["focused and full test suites pass"],
    planState: "ACCEPTED",
    rollbackBoundary: "preserve the prior setup and stop before external writes",
  };
  const request = parseQuickTaskRequest(value);

  assert.equal(request.formationInput?.scenario, "development");
  if (request.formationInput?.scenario !== "development") assert.fail("development profile was not preserved");
  assert.deepEqual(request.formationInput.testStrategy, ["focused and full test suites pass"]);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...value.formationInput as object, repository: "" } }), /formationInput\.repository must be a non-empty string/);
});

test("quick task request: rejects unverified implementation readiness declarations", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  const formationInput = {
    scenario: "development",
    repository: "AI Booster Kit",
    repositoryState: "VERIFIED",
    acceptanceCriteria: ["the implementation contract is validated"],
    testStrategy: ["focused and full test suites pass"],
    planState: "ACCEPTED",
    rollbackBoundary: "preserve the prior setup and stop before external writes",
  };

  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...formationInput, repositoryState: "UNKNOWN" } }), /formationInput\.repositoryState must be VERIFIED/);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...formationInput, planState: "DRAFT" } }), /formationInput\.planState must be ACCEPTED/);
});

test("quick task request: parses the debugging profile and rejects empty fields", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  const formationInput = {
    scenario: "debugging",
    symptom: "The parser rejects a valid frontmatter document.",
    reproduction: ["Run the focused parser test with the valid fixture."],
    expectedBehavior: "The valid fixture parses without an error.",
    environment: ["AI Booster Kit verified local revision", "Node 26 test runtime"],
  };
  const request = parseQuickTaskRequest({ ...value, formationInput });

  assert.equal(request.formationInput?.scenario, "debugging");
  if (request.formationInput?.scenario !== "debugging") assert.fail("debugging profile was not preserved");
  assert.deepEqual(request.formationInput.reproduction, ["Run the focused parser test with the valid fixture."]);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...formationInput, symptom: "" } }), /formationInput\.symptom must be a non-empty string/);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...formationInput, reproduction: [] } }), /formationInput\.reproduction must be a non-empty list of non-empty strings/);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...formationInput, expectedBehavior: "" } }), /formationInput\.expectedBehavior must be a non-empty string/);
  assert.throws(() => parseQuickTaskRequest({ ...value, formationInput: { ...formationInput, environment: [] } }), /formationInput\.environment must be a non-empty list of non-empty strings/);
});

test("quick task request: rejects unknown debugging metadata without echoing its value", async () => {
  const value = await fixture("eligible-quick-task.json") as Record<string, unknown>;
  const formationInput = {
    scenario: "debugging",
    symptom: "The parser fails.",
    reproduction: ["Run the focused parser test."],
    expectedBehavior: "The parser accepts the valid fixture.",
    environment: ["local synthetic fixture"],
    unsafe: "do-not-echo-this-value",
  };
  assert.throws(
    () => parseQuickTaskRequest({ ...value, formationInput }),
    (error: unknown) => error instanceof Error && /formationInput\.unsafe is not allowed/.test(error.message) && !error.message.includes("do-not-echo-this-value"),
  );
});

test("quick task identities: separate full-request reproducibility from structural pattern matching", async () => {
  const request = parseQuickTaskRequest(await fixture("eligible-quick-task.json"));
  const changedGoal = parseQuickTaskRequest({ ...request, goal: "A different private goal." });
  const changedComplexity = parseQuickTaskRequest({ ...request, complexity: "MEDIUM" });

  assert.notEqual(requestFingerprint(request), requestFingerprint(changedGoal));
  assert.equal(patternId(request, recipe, "RECOMMEND", "COMPATIBLE"), patternId(changedGoal, recipe, "RECOMMEND", "COMPATIBLE"));
  assert.notEqual(patternId(request, recipe, "RECOMMEND", "COMPATIBLE"), patternId(changedComplexity, recipe, "RECOMMEND", "COMPATIBLE"));
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`test/fixtures/controller/${name}`, "utf8")) as unknown;
}

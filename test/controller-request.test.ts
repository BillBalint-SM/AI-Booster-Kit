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

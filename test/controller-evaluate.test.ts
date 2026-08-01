import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateQuickTask } from "../src/controller/evaluate.js";
import { parseQuickTaskRequest } from "../src/controller/request.js";
import type { QuickTaskRecipe } from "../src/controller/types.js";

const recipe: QuickTaskRecipe = {
  recipeId: "quick-task-clarifier-validator", recipeVersion: "0.1.0", status: "READY_WITH_LIMIT", supportedWorkItem: "Quick Task",
  controller: { version: 1, eligibleComplexities: ["LOW", "MEDIUM"], executionBoundary: "LOCAL_ONLY", requiredDor: ["value", "context", "relations", "dependencies"], authority: "RECOMMENDATION_ONLY" },
};

test("controller evaluator: recommends a complete low-complexity Quick Task", async () => {
  const response = evaluateQuickTask(parseQuickTaskRequest(await fixture("eligible-quick-task.json")), recipe);
  assert.equal(response.decision, "RECOMMEND");
  assert.equal(response.impact, "COMPATIBLE");
  assert.equal(response.requiresAcknowledgement, false);
  assert.deepEqual(response.requiredClarifications, []);
});

test("controller evaluator: asks only for missing DoR declarations in canonical order", async () => {
  const response = evaluateQuickTask(parseQuickTaskRequest(await fixture("incomplete-quick-task.json")), recipe);
  assert.equal(response.decision, "PREPARE");
  assert.deepEqual(response.requiredClarifications.map((item) => item.field), ["value", "context"]);
});

test("controller evaluator: preserves no-Agent and custom-tool precedence", async () => {
  const noAgent = evaluateQuickTask(parseQuickTaskRequest(await fixture("no-agent-quick-task.json")), recipe);
  const customTool = evaluateQuickTask(parseQuickTaskRequest(await fixture("custom-tool-quick-task.json")), recipe);
  assert.equal(noAgent.decision, "NO_AGENT");
  assert.equal(noAgent.requiresAcknowledgement, false);
  assert.equal(customTool.decision, "NO_AGENT");
  assert.equal(customTool.impact, "UNKNOWN");
  assert.equal(customTool.requiresAcknowledgement, true);
});

test("controller evaluator: stops when recipe readiness is incompatible", async () => {
  const incompatible = { ...recipe, status: "DRAFT" } as unknown as QuickTaskRecipe;

  assert.throws(
    () => evaluateQuickTask(parseQuickTaskRequest({ requestVersion: "1.0", workItemType: "Quick Task", goal: "Validate the recipe boundary.", outcomeOwner: "delivery-team", complexity: "LOW", executionBoundary: "LOCAL_ONLY" }), incompatible),
    /Quick Task evaluator rejected: recipe\.status is incompatible\./,
  );
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`test/fixtures/controller/${name}`, "utf8")) as unknown;
}

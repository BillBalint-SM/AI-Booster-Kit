import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateQuickTask } from "../src/controller/evaluate.js";
import { parseQuickTaskRequest } from "../src/controller/request.js";
import type { QuickTaskRecipe } from "../src/controller/types.js";

const recipe: QuickTaskRecipe = {
  recipeId: "quick-task-clarifier-validator",
  recipeVersion: "0.1.0",
  status: "READY_WITH_LIMIT",
  supportedWorkItem: "Quick Task",
  controller: {
    version: 1,
    eligibleComplexities: ["LOW", "MEDIUM"],
    executionBoundary: "LOCAL_ONLY",
    requiredDor: ["value", "context", "relations", "dependencies"],
    authority: "RECOMMENDATION_ONLY",
  },
};

test("controller checkpoint: exposes exactly three choices for a recommendation", async () => {
  const response = evaluateQuickTask(parseQuickTaskRequest(await fixture("eligible-quick-task.json")), recipe);

  assert.deepEqual(response.checkpoint?.choices, [
    "ACCEPT_RECOMMENDATION",
    "REQUEST_ALTERNATIVE",
    "CONTINUE_WITHOUT_AGENT",
  ]);
  assert.equal(response.checkpoint?.decision, "RECOMMEND");
  assert.equal(response.checkpoint?.requestFingerprint, response.requestFingerprint);
  assert.equal(response.checkpoint?.recipeSignature, response.recipeSignature);
});

test("controller checkpoint: never exposes a resolvable choice outside a recommendation", async () => {
  const prepare = evaluateQuickTask(parseQuickTaskRequest(await fixture("incomplete-quick-task.json")), recipe);
  const noAgent = evaluateQuickTask(parseQuickTaskRequest(await fixture("no-agent-quick-task.json")), recipe);
  const noFit = evaluateQuickTask(parseQuickTaskRequest(await fixture("high-complexity-quick-task.json")), recipe);

  assert.equal(prepare.checkpoint, undefined);
  assert.equal(noAgent.checkpoint, undefined);
  assert.equal(noFit.checkpoint, undefined);
});

test("controller checkpoint: is deterministic for the same recommendation", async () => {
  const request = parseQuickTaskRequest(await fixture("eligible-quick-task.json"));

  assert.deepEqual(evaluateQuickTask(request, recipe), evaluateQuickTask(request, recipe));
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`test/fixtures/controller/${name}`, "utf8")) as unknown;
}

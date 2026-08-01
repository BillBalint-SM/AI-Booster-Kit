import assert from "node:assert/strict";
import { test } from "node:test";

import { parseQuickTaskRecipe } from "../src/controller/recipe.js";

const validRecipeSource = `---
recipeId: quick-task-clarifier-validator
recipeVersion: 0.1.0
status: READY_WITH_LIMIT
ownership: personal_or_team
weight: light
coordination: single-agent
supportedWorkItem: Quick Task
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  executionBoundary: LOCAL_ONLY
  requiredDor: [value, context, relations, dependencies]
  authority: RECOMMENDATION_ONLY
---

# Quick Task Clarifier & Validator
`;

test("quick task recipe: parses the controller declaration used by the evaluator", () => {
  const recipe = parseQuickTaskRecipe(validRecipeSource, "fixtures/recipe.md");

  assert.deepEqual(recipe, {
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
  });
});

test("quick task recipe: rejects unrecognized controller metadata before recommendation", () => {
  const source = validRecipeSource.replace(
    "  authority: RECOMMENDATION_ONLY",
    "  authority: RECOMMENDATION_ONLY\n  unexpected: unsafe",
  );

  assert.throws(
    () => parseQuickTaskRecipe(source, "fixtures/recipe.md"),
    /Quick Task recipe rejected: controller\.unexpected is not allowed\./,
  );
});

test("quick task recipe: reports root metadata failures at their actual field", () => {
  const source = validRecipeSource.replace("recipeId: quick-task-clarifier-validator", "recipeId: another-recipe");

  assert.throws(
    () => parseQuickTaskRecipe(source, "fixtures/recipe.md"),
    /Quick Task recipe rejected: recipeId must be quick-task-clarifier-validator\./,
  );
});

test("quick task recipe: rejects a boundary that could permit external work", () => {
  const source = validRecipeSource.replace("executionBoundary: LOCAL_ONLY", "executionBoundary: EXTERNAL_WRITE");

  assert.throws(
    () => parseQuickTaskRecipe(source, "fixtures/recipe.md"),
    /Quick Task recipe rejected: controller\.executionBoundary must be LOCAL_ONLY\./,
  );
});

test("quick task recipe: rejects reordered readiness requirements", () => {
  const source = validRecipeSource.replace(
    "requiredDor: [value, context, relations, dependencies]",
    "requiredDor: [context, value, relations, dependencies]",
  );

  assert.throws(
    () => parseQuickTaskRecipe(source, "fixtures/recipe.md"),
    /Quick Task recipe rejected: controller\.requiredDor must declare the canonical order\./,
  );
});

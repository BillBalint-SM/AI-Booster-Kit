import assert from "node:assert/strict";
import { test } from "node:test";

import { loadRefinementRecipe, parseRefinementRecipe } from "../src/controller/formation-recipe.js";

const validRecipeSource = `---
recipeId: bounded-refinement
recipeVersion: 0.1.0
status: READY
formationId: bounded-refinement
scenario: refinement
weight: light
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [LOW]
  requiredInput: [goal, current-scope, constraints, open-questions]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [refined-scope, acceptance-criteria, decision-record]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [scope-preserved, assumptions-visible, acceptance-testable]
evidenceRequirements: [before-scope, after-scope, decision-record]
relations:
  - kind: related_to
    target: quick-task-clarifier-validator
recovery:
  preserve: [original-scope, rejected-interpretations]
  stopConditions: [unaccepted-scope-change, unresolved-conflict]
---

# Bounded Refinement
`;

test("refinement recipe: parses the profile-specific input and output contract", () => {
  const recipe = parseRefinementRecipe(validRecipeSource, "fixtures/bounded-refinement.md");

  assert.equal(recipe.recipeId, "bounded-refinement");
  assert.deepEqual(recipe.controller.requiredInput, ["goal", "current-scope", "constraints", "open-questions"]);
  assert.deepEqual(recipe.outputContract.requiredSections, ["refined-scope", "acceptance-criteria", "decision-record"]);
  assert.equal(recipe.outputContract.unknownPolicy, "PRESERVE_AS_UNKNOWN");
  assert.equal(recipe.outputContract.resultState, "NOT_STARTED");
});

test("refinement recipe: loads the checked-in READY contract", async () => {
  const recipe = await loadRefinementRecipe("contract/agent-library/bounded-refinement.md");

  assert.equal(recipe.status, "READY");
  assert.equal(recipe.scenario, "refinement");
  assert.equal(recipe.controller.executionBoundary, "LOCAL_ONLY");
});

test("refinement recipe: rejects unknown metadata", () => {
  const source = validRecipeSource.replace("status: READY", "status: READY\nunsafe: true");

  assert.throws(() => parseRefinementRecipe(source, "fixtures/bounded-refinement.md"), /Refinement recipe rejected: frontmatter\.unsafe is not allowed\./);
});

test("refinement recipe: rejects an incomplete output contract", () => {
  const source = validRecipeSource.replace("  requiredSections: [refined-scope, acceptance-criteria, decision-record]\n", "  requiredSections: [refined-scope, acceptance-criteria]\n");

  assert.throws(() => parseRefinementRecipe(source, "fixtures/bounded-refinement.md"), /Refinement recipe rejected: outputContract\.requiredSections must declare the canonical sections\./);
});

test("refinement recipe: rejects an unsafe execution boundary", () => {
  const source = validRecipeSource.replace("  executionBoundary: LOCAL_ONLY", "  executionBoundary: EXTERNAL_WRITE");

  assert.throws(() => parseRefinementRecipe(source, "fixtures/bounded-refinement.md"), /Refinement recipe rejected: controller\.executionBoundary must be LOCAL_ONLY\./);
});

test("refinement recipe: preserves UNKNOWN instead of normalizing it", () => {
  const source = validRecipeSource.replace("unknownPolicy: PRESERVE_AS_UNKNOWN", "unknownPolicy: NORMALIZE");

  assert.throws(() => parseRefinementRecipe(source, "fixtures/bounded-refinement.md"), /Refinement recipe rejected: outputContract\.unknownPolicy must be PRESERVE_AS_UNKNOWN\./);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { loadValidationRecipe, parseValidationRecipe } from "../src/controller/formation-recipe.js";

const validRecipeSource = `---
recipeId: bounded-validation
recipeVersion: 0.1.0
status: READY
formationId: bounded-validation
scenario: validation
weight: medium
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  requiredInput: [claim, acceptance-criteria, evidence-sources, known-limits]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [validation-result, evidence-map, explicit-stop-or-pass]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [claim-traced-to-evidence, negative-paths-checked, limits-visible]
evidenceRequirements: [validation-log, source-read-back, residual-risk-record]
relations:
  - kind: validates
    target: controller
recovery:
  preserve: [pre-validation-claim, failed-checks]
  stopConditions: [missing-evidence, source-mismatch, unknown-capability]
---

# Bounded Validation
`;

test("validation recipe: parses the profile-specific input and output contract", async () => {
  const recipe = parseValidationRecipe(validRecipeSource, "fixtures/bounded-validation.md");

  assert.equal(recipe.recipeId, "bounded-validation");
  assert.deepEqual(recipe.controller.requiredInput, ["claim", "acceptance-criteria", "evidence-sources", "known-limits"]);
  assert.deepEqual(recipe.outputContract.requiredSections, ["validation-result", "evidence-map", "explicit-stop-or-pass"]);
  assert.equal(recipe.outputContract.unknownPolicy, "PRESERVE_AS_UNKNOWN");
  assert.equal(recipe.outputContract.resultState, "NOT_STARTED");
});

test("validation recipe: loads the checked-in READY contract", async () => {
  const recipe = await loadValidationRecipe("contract/agent-library/bounded-validation.md");

  assert.equal(recipe.status, "READY");
  assert.equal(recipe.scenario, "validation");
  assert.equal(recipe.controller.executionBoundary, "LOCAL_ONLY");
});

test("validation recipe: rejects unknown metadata", () => {
  const source = validRecipeSource.replace("status: READY", "status: READY\nunsafe: true");

  assert.throws(() => parseValidationRecipe(source, "fixtures/bounded-validation.md"), /Validation recipe rejected: frontmatter\.unsafe is not allowed\./);
});

test("validation recipe: rejects an incomplete output contract", () => {
  const source = validRecipeSource.replace("  requiredSections: [validation-result, evidence-map, explicit-stop-or-pass]\n", "  requiredSections: [validation-result, evidence-map]\n");

  assert.throws(() => parseValidationRecipe(source, "fixtures/bounded-validation.md"), /Validation recipe rejected: outputContract\.requiredSections must declare the canonical sections\./);
});

test("validation recipe: rejects an unsafe execution boundary", () => {
  const source = validRecipeSource.replace("  executionBoundary: LOCAL_ONLY", "  executionBoundary: EXTERNAL_WRITE");

  assert.throws(() => parseValidationRecipe(source, "fixtures/bounded-validation.md"), /Validation recipe rejected: controller\.executionBoundary must be LOCAL_ONLY\./);
});

test("validation recipe: preserves UNKNOWN instead of normalizing it", () => {
  const source = validRecipeSource.replace("unknownPolicy: PRESERVE_AS_UNKNOWN", "unknownPolicy: NORMALIZE");

  assert.throws(() => parseValidationRecipe(source, "fixtures/bounded-validation.md"), /Validation recipe rejected: outputContract\.unknownPolicy must be PRESERVE_AS_UNKNOWN\./);
});

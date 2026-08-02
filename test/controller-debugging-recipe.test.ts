import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDebuggingRecipe, parseDebuggingRecipe } from "../src/controller/formation-recipe.js";

const validSource = `---
recipeId: bounded-debugging
recipeVersion: 0.1.0
status: READY
formationId: bounded-debugging
scenario: debugging
weight: medium
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  requiredInput: [symptom, reproduction, expected-behavior, environment]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [root-cause-record, minimal-fix, regression-evidence]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [failure-reproduced, root-cause-supported, regression-covered]
evidenceRequirements: [reproduction-output, failing-test, passing-test]
relations:
  - kind: validates
    target: bounded-implementation
recovery:
  preserve: [failure-evidence, pre-fix-state]
  stopConditions: [not-reproduced, ambiguous-root-cause, destructive-fix]
---
# Bounded Debugging
`;

test("debugging recipe: parses the complete READY profile contract", () => {
  const recipe = parseDebuggingRecipe(validSource, "fixtures/bounded-debugging.md");
  assert.deepEqual(recipe.controller.requiredInput, ["symptom", "reproduction", "expected-behavior", "environment"]);
  assert.deepEqual(recipe.outputContract.requiredSections, ["root-cause-record", "minimal-fix", "regression-evidence"]);
  assert.deepEqual(recipe.recovery.stopConditions, ["not-reproduced", "ambiguous-root-cause", "destructive-fix"]);
});

test("debugging recipe: loads the checked-in READY contract", async () => {
  const recipe = await loadDebuggingRecipe("contract/agent-library/bounded-debugging.md");
  assert.equal(recipe.status, "READY");
  assert.equal(recipe.scenario, "debugging");
});

test("debugging recipe: rejects non-canonical metadata and boundaries", () => {
  assert.throws(() => parseDebuggingRecipe(validSource.replace("status: READY", "status: READY\nunsafe: true"), "fixtures/bounded-debugging.md"), /Debugging recipe rejected: frontmatter\.unsafe is not allowed\./);
  assert.throws(() => parseDebuggingRecipe(validSource.replace("root-cause-record, minimal-fix, regression-evidence", "root-cause-record, regression-evidence"), "fixtures/bounded-debugging.md"), /Debugging recipe rejected: outputContract\.requiredSections must declare the canonical sections\./);
  assert.throws(() => parseDebuggingRecipe(validSource.replace("LOCAL_ONLY", "EXTERNAL_WRITE"), "fixtures/bounded-debugging.md"), /Debugging recipe rejected: controller\.executionBoundary must be LOCAL_ONLY\./);
  assert.throws(() => parseDebuggingRecipe(validSource.replace("RECOMMENDATION_ONLY", "ACTIVATION"), "fixtures/bounded-debugging.md"), /Debugging recipe rejected: controller\.authority must be RECOMMENDATION_ONLY\./);
  assert.throws(() => parseDebuggingRecipe(validSource.replace("PRESERVE_AS_UNKNOWN", "NORMALIZE"), "fixtures/bounded-debugging.md"), /Debugging recipe rejected: outputContract\.unknownPolicy must be PRESERVE_AS_UNKNOWN\./);
  assert.throws(() => parseDebuggingRecipe(validSource.replace("NOT_STARTED", "COMPLETE"), "fixtures/bounded-debugging.md"), /Debugging recipe rejected: outputContract\.resultState must be NOT_STARTED\./);
});

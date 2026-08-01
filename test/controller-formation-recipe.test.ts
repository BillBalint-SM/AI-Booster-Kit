import assert from "node:assert/strict";
import { test } from "node:test";

import { loadResearchRecipe, loadValidationRecipe, parseResearchRecipe, parseValidationRecipe } from "../src/controller/formation-recipe.js";

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

const validResearchRecipeSource = `---
recipeId: bounded-research
recipeVersion: 0.1.0
status: READY
formationId: bounded-research
scenario: research
weight: medium
coordination: parallel-fan-out-fan-in
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  requiredInput: [goal, scope, source-allowlist, evidence-standard]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [source-backed-brief, uncertainty-register, recommendation-or-stop]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [bounded-question, primary-source-evidence, unresolved-conflicts-visible]
evidenceRequirements: [source-register, quoted-or-linked-findings, review-record]
relations:
  - kind: related_to
    target: quick-task-clarifier-validator
recovery:
  preserve: [source-register, conflicting-findings]
  stopConditions: [unknown-source-authority, scope-expansion, partial-evidence]
---

# Bounded Research
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

test("research recipe: parses the complete READY profile contract", () => {
  const recipe = parseResearchRecipe(validResearchRecipeSource, "fixtures/bounded-research.md");

  assert.equal(recipe.recipeId, "bounded-research");
  assert.deepEqual(recipe.controller.requiredInput, ["goal", "scope", "source-allowlist", "evidence-standard"]);
  assert.deepEqual(recipe.outputContract.requiredSections, ["source-backed-brief", "uncertainty-register", "recommendation-or-stop"]);
  assert.deepEqual(recipe.recovery.stopConditions, ["unknown-source-authority", "scope-expansion", "partial-evidence"]);
});

test("research recipe: loads the checked-in READY contract", async () => {
  const recipe = await loadResearchRecipe("contract/agent-library/bounded-research.md");

  assert.equal(recipe.status, "READY");
  assert.equal(recipe.scenario, "research");
  assert.equal(recipe.controller.executionBoundary, "LOCAL_ONLY");
});

test("research recipe: rejects an unsafe authority", () => {
  const source = validResearchRecipeSource.replace("authority: RECOMMENDATION_ONLY", "authority: ACTIVATION");

  assert.throws(() => parseResearchRecipe(source, "fixtures/bounded-research.md"), /Validation recipe rejected: controller\.authority must be RECOMMENDATION_ONLY\./);
});

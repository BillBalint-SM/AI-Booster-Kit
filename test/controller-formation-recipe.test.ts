import assert from "node:assert/strict";
import { test } from "node:test";

import { loadImplementationRecipe, loadResearchRecipe, loadValidationRecipe, parseImplementationRecipe, parseResearchRecipe, parseValidationRecipe } from "../src/controller/formation-recipe.js";

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

const validImplementationRecipeSource = `---
recipeId: bounded-implementation
recipeVersion: 0.1.0
status: READY
formationId: bounded-implementation
scenario: development
weight: heavy
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [MEDIUM]
  requiredInput: [goal, repository, repository-state, acceptance-criteria, test-strategy, accepted-plan, rollback-boundary]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [reviewable-diff, test-evidence, residual-risk-record]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [scope-matched-diff, relevant-tests-pass, rollback-boundary-preserved]
evidenceRequirements: [git-diff, test-output, review-record]
relations:
  - kind: depends_on
    target: bounded-refinement
recovery:
  preserve: [prior-setup, failing-evidence]
  stopConditions: [dirty-state-conflict, unsafe-change, failed-read-back]
---

# Bounded Implementation
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

test("implementation recipe: parses the complete READY profile contract", () => {
  const recipe = parseImplementationRecipe(validImplementationRecipeSource, "fixtures/bounded-implementation.md");

  assert.equal(recipe.recipeId, "bounded-implementation");
  assert.deepEqual(recipe.controller.requiredInput, ["goal", "repository", "repository-state", "acceptance-criteria", "test-strategy", "accepted-plan", "rollback-boundary"]);
  assert.deepEqual(recipe.outputContract.requiredSections, ["reviewable-diff", "test-evidence", "residual-risk-record"]);
  assert.deepEqual(recipe.acceptance.criteria, ["scope-matched-diff", "relevant-tests-pass", "rollback-boundary-preserved"]);
  assert.deepEqual(recipe.recovery.stopConditions, ["dirty-state-conflict", "unsafe-change", "failed-read-back"]);
});

test("implementation recipe: loads the checked-in READY contract", async () => {
  const recipe = await loadImplementationRecipe("contract/agent-library/bounded-implementation.md");

  assert.equal(recipe.status, "READY");
  assert.equal(recipe.scenario, "development");
  assert.equal(recipe.controller.executionBoundary, "LOCAL_ONLY");
});

test("implementation recipe: rejects unknown metadata", () => {
  const source = validImplementationRecipeSource.replace("status: READY", "status: READY\nunsafe: true");

  assert.throws(() => parseImplementationRecipe(source, "fixtures/bounded-implementation.md"), /Implementation recipe rejected: frontmatter\.unsafe is not allowed\./);
});

test("implementation recipe: rejects an incomplete output contract", () => {
  const source = validImplementationRecipeSource.replace("  requiredSections: [reviewable-diff, test-evidence, residual-risk-record]\n", "  requiredSections: [reviewable-diff, test-evidence]\n");

  assert.throws(() => parseImplementationRecipe(source, "fixtures/bounded-implementation.md"), /Implementation recipe rejected: outputContract\.requiredSections must declare the canonical sections\./);
});

test("implementation recipe: rejects an unsafe authority", () => {
  const source = validImplementationRecipeSource.replace("authority: RECOMMENDATION_ONLY", "authority: ACTIVATION");

  assert.throws(() => parseImplementationRecipe(source, "fixtures/bounded-implementation.md"), /Implementation recipe rejected: controller\.authority must be RECOMMENDATION_ONLY\./);
});

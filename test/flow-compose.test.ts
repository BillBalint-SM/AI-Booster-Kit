import assert from "node:assert/strict";
import { test } from "node:test";

import { composeFlow, FlowCompositionError } from "../src/flow/compose.js";
import {
  loadImplementationRecipe,
  loadRefinementRecipe,
  loadValidationRecipe,
} from "../src/controller/formation-recipe.js";

const recipes = await Promise.all([
  loadRefinementRecipe("contract/agent-library/bounded-refinement.md"),
  loadImplementationRecipe("contract/agent-library/bounded-implementation.md"),
  loadValidationRecipe("contract/agent-library/bounded-validation.md"),
]).then(([plan, implement, verify]) => ({ plan, implement, verify }));

const planInputs = {
  "current-scope": "Add a reviewable module and flow composition interface.",
  constraints: ["Keep execution local and recommendation-only."],
  "open-questions": [],
};

const implementationInputs = {
  repository: "AI Booster Kit",
  "repository-state": "VERIFIED",
  "acceptance-criteria": ["The selected module produces a reviewable package."],
  "test-strategy": ["Run focused and full local tests."],
  "accepted-plan": "ACCEPTED",
  "rollback-boundary": "Keep the change local, reversible, and uncommitted.",
};

const validationInputs = {
  claim: "The implementation meets its accepted criteria.",
  "acceptance-criteria": ["The declared behavior is proven through the public interface."],
  "evidence-sources": ["local test output", "source read-back"],
  "known-limits": [],
};

test("flow composer: exposes plan, implement, test, and review as independent modules", () => {
  const cases = [
    { module: "plan", inputs: planInputs, recipeId: "bounded-refinement" },
    { module: "implement", inputs: implementationInputs, recipeId: "bounded-implementation" },
    { module: "test", inputs: validationInputs, recipeId: "bounded-validation" },
    { module: "review", inputs: validationInputs, recipeId: "bounded-validation" },
  ] as const;

  for (const candidate of cases) {
    const result = composeFlow({
      requestVersion: "1.0",
      selection: { kind: "module", module: candidate.module },
      objective: `Run the ${candidate.module} module.`,
      inputs: candidate.inputs,
      unknowns: [],
    }, recipes);

    assert.equal(result.status, "READY");
    assert.equal(result.packageKind, "MODULE");
    assert.equal(result.selection, candidate.module);
    assert.equal(result.modules.length, 1);
    assert.equal(result.modules[0]?.module, candidate.module);
    assert.equal(result.modules[0]?.recipeId, candidate.recipeId);
    assert.equal(result.modules[0]?.state, "READY");
    assert.equal(result.executionPerformed, false);
    assert.equal(result.authority, "RECOMMENDATION_ONLY");
    assert.equal(result.executionBoundary, "LOCAL_ONLY");
  }
});

test("flow composer: creates the explicit default change flow without executing it", () => {
  const result = composeFlow({
    requestVersion: "1.0",
    selection: { kind: "flow", flow: "default-change" },
    objective: "Deliver a bounded local change with evidence.",
    inputs: {
      ...planInputs,
      repository: "AI Booster Kit",
      "repository-state": "VERIFIED",
      "test-strategy": ["Run focused and full local tests."],
      "rollback-boundary": "Keep the change local, reversible, and uncommitted.",
      "known-limits": [],
    },
    unknowns: [],
  }, recipes);

  assert.equal(result.status, "READY");
  assert.equal(result.packageKind, "FLOW");
  assert.equal(result.selection, "default-change");
  assert.deepEqual(result.modules.map((stage) => stage.module), ["plan", "implement", "test", "review"]);
  assert.deepEqual(result.modules.map((stage) => stage.state), ["READY", "PENDING", "PENDING", "PENDING"]);
  assert.deepEqual(result.checkpoints, [{
    afterStage: "plan-1",
    beforeStage: "implement-2",
    decision: "USER_ACCEPTS_PLAN",
    required: true,
  }]);
  assert.equal(result.nextAction, "RUN_MODULE:plan");
  assert.equal(result.executionPerformed, false);
  assert.equal(result.handoff.requiresFreshReadback, true);
});

test("flow composer: never infers the default flow for a single module", () => {
  const result = composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "plan" },
    objective: "Create only a plan.",
    inputs: planInputs,
    unknowns: [],
  }, recipes);

  assert.equal(result.modules.length, 1);
  assert.deepEqual(result.modules[0]?.suggestedContinuation, ["implement"]);
});

test("flow composer: stops visibly when a required input is missing", () => {
  const result = composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "implement" },
    objective: "Implement a bounded change.",
    inputs: {
      repository: "AI Booster Kit",
      "repository-state": "VERIFIED",
    },
    unknowns: [],
  }, recipes);

  assert.equal(result.status, "STOPPED");
  assert.equal(result.modules[0]?.state, "STOPPED");
  assert.deepEqual(result.stopReasons, [
    "MISSING_INPUT:acceptance-criteria",
    "MISSING_INPUT:test-strategy",
    "MISSING_INPUT:accepted-plan",
    "MISSING_INPUT:rollback-boundary",
  ]);
  assert.equal(result.nextAction, "PROVIDE_REQUIRED_INPUTS");
});

test("flow composer: preserves an explicit required-input unknown", () => {
  const result = composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "review" },
    objective: "Review a local change.",
    inputs: {
      claim: "The local change is review-ready.",
      "acceptance-criteria": ["The diff matches the accepted scope."],
      "evidence-sources": ["local diff"],
    },
    unknowns: ["known-limits"],
  }, recipes);

  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.modules[0]?.state, "UNKNOWN");
  assert.deepEqual(result.unknowns, ["known-limits"]);
  assert.equal(result.nextAction, "RESOLVE_UNKNOWN_INPUTS");
});

test("flow composer: rejects foreign fields instead of guessing", () => {
  assert.throws(() => composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "plan" },
    objective: "Create a plan.",
    inputs: { ...planInputs, typo: true },
    unknowns: [],
  }, recipes), (error: unknown) => {
    assert.ok(error instanceof FlowCompositionError);
    assert.equal(error.code, "FLOW_INPUT_INVALID");
    return true;
  });
});

test("flow composer: rejects accessor and sparse input data without invoking it", () => {
  let invoked = false;
  const accessorInputs = {
    "current-scope": planInputs["current-scope"],
    "open-questions": [],
  } as Record<string, unknown>;
  Object.defineProperty(accessorInputs, "constraints", {
    enumerable: true,
    get() {
      invoked = true;
      return planInputs.constraints;
    },
  });

  assert.throws(() => composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "plan" },
    objective: "Create a plan.",
    inputs: accessorInputs,
    unknowns: [],
  }, recipes), (error: unknown) => error instanceof FlowCompositionError && error.code === "FLOW_INPUT_INVALID");
  assert.equal(invoked, false);

  assert.throws(() => composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "plan" },
    objective: "Create a plan.",
    inputs: { ...planInputs, constraints: Array(1) },
    unknowns: [],
  }, recipes), (error: unknown) => error instanceof FlowCompositionError && error.code === "FLOW_INPUT_INVALID");
});

test("flow composer: rejects a recipe set that widens the authority boundary", () => {
  const unsafeRecipes = {
    ...recipes,
    verify: {
      ...recipes.verify,
      controller: { ...recipes.verify.controller, authority: "EXTERNAL_WRITE" },
    },
  } as unknown as typeof recipes;

  assert.throws(() => composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "test" },
    objective: "Test a bounded change.",
    inputs: validationInputs,
    unknowns: [],
  }, unsafeRecipes), (error: unknown) => {
    assert.ok(error instanceof FlowCompositionError);
    assert.equal(error.code, "FLOW_CONTRACT_INVALID");
    return true;
  });
});

test("flow composer: stops noncanonical implementation authority states", () => {
  const result = composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "implement" },
    objective: "Implement a bounded change.",
    inputs: {
      ...implementationInputs,
      "repository-state": "STALE",
      "accepted-plan": "DRAFT",
    },
    unknowns: [],
  }, recipes);

  assert.equal(result.status, "STOPPED");
  assert.equal(result.modules[0]?.state, "STOPPED");
  assert.deepEqual(result.stopReasons, [
    "INVALID_INPUT:repository-state",
    "INVALID_INPUT:accepted-plan",
  ]);
  assert.equal(result.nextAction, "CORRECT_INVALID_INPUTS");
});

test("flow composer: rejects a canonical recipe with a weakened required-input contract", () => {
  const weakenedRecipes = {
    ...recipes,
    implement: {
      ...recipes.implement,
      controller: {
        ...recipes.implement.controller,
        requiredInput: recipes.implement.controller.requiredInput.filter((field) => field !== "accepted-plan"),
      },
    },
  } as unknown as typeof recipes;

  assert.throws(() => composeFlow({
    requestVersion: "1.0",
    selection: { kind: "module", module: "implement" },
    objective: "Implement a bounded change.",
    inputs: implementationInputs,
    unknowns: [],
  }, weakenedRecipes), (error: unknown) => {
    assert.ok(error instanceof FlowCompositionError);
    assert.equal(error.code, "FLOW_CONTRACT_INVALID");
    return true;
  });
});

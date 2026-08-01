import assert from "node:assert/strict";
import { test } from "node:test";

import { createQuickTaskActivationPackage, parseActivationProfile } from "../src/controller/activation-package.js";
import { evaluateQuickTask } from "../src/controller/evaluate.js";
import { resolveCheckpoint } from "../src/controller/resolve.js";
import { requestFingerprint } from "../src/controller/identity.js";
import { parseQuickTaskRequest } from "../src/controller/request.js";
import type { ActivationIntent, QuickTaskRecipe, ControllerResponse, QuickTaskRequest } from "../src/controller/types.js";

const recipe: QuickTaskRecipe = {
  recipeId: "quick-task-clarifier-validator", recipeVersion: "0.1.0", status: "READY_WITH_LIMIT", supportedWorkItem: "Quick Task",
  controller: { version: 1, eligibleComplexities: ["LOW", "MEDIUM"], executionBoundary: "LOCAL_ONLY", requiredDor: ["value", "context", "relations", "dependencies"], authority: "RECOMMENDATION_ONLY" },
};

const request = parseQuickTaskRequest({
  requestVersion: "1.0",
  workItemType: "Quick Task",
  goal: "Validate the activation package contract.",
  outcomeOwner: "delivery-team",
  complexity: "LOW",
  executionBoundary: "LOCAL_ONLY",
  value: { state: "KNOWN", statement: "A deterministic package contract." },
  context: { state: "CURRENT", reference: "workspace:controller-mvp" },
  relations: { state: "ABSENT", items: [] },
  dependencies: { state: "ABSENT", items: [] },
});

test("activation package: issues a deterministic ephemeral package for every explicit profile", () => {
  const response = evaluateQuickTask(request, recipe);
  const intent = acceptedIntent(response);
  const profiles = ["clarify", "research", "planning", "validation"] as const;

  for (const profile of profiles) {
    const result = createQuickTaskActivationPackage(request, intent, profile);
    assert.equal(result.activationVersion, "1.0");
    assert.equal(result.state, "EPHEMERAL_PACKAGE_ISSUED");
    assert.equal(result.retention, "EPHEMERAL");
    assert.equal(result.profile, profile);
    assert.deepEqual(result.operations, {
      packageIssued: true,
      hostActivationPerformed: false,
      artifactGenerationPerformed: false,
      persistencePerformed: false,
    });
    assert.deepEqual(Object.keys(result.agent.input).sort(), ["context", "dependencies", "goal", "outcomeOwner", "relations", "value"]);
    assert.equal(Object.hasOwn(result.agent, "result"), false);
    assert.equal(result.agent.outputContract.unknownPolicy, "PRESERVE_AS_UNKNOWN");
    assert.equal(result.agent.outputContract.resultState, "NOT_STARTED");
  }

  assert.deepEqual(
    createQuickTaskActivationPackage(request, intent, "planning"),
    createQuickTaskActivationPackage(request, intent, "planning"),
  );
});

test("activation package: preserves the exact profile-specific output contracts", () => {
  const response = evaluateQuickTask(request, recipe);
  const intent = acceptedIntent(response);
  const expectedSections = {
    clarify: ["DoR", "DoD", "Acceptance Criteria", "evidence", "relations", "dependencies", "closure"],
    research: ["research question", "known facts", "UNKNOWNs", "hypotheses", "source/evidence plan", "findings", "residual unknowns"],
    planning: ["goal framing", "options", "dependencies", "steps", "risks", "decision points", "residual unknowns"],
    validation: ["claims", "acceptance conditions", "evidence plan", "findings", "differences", "residual unknowns"],
  } as const;

  for (const profile of Object.keys(expectedSections) as Array<keyof typeof expectedSections>) {
    const result = createQuickTaskActivationPackage(request, intent, profile);
    assert.deepEqual(result.agent.outputContract.requiredSections, expectedSections[profile]);
    assert.deepEqual(result.agent.instructions.slice(0, 3), [
      "Preserve the supplied goal and outcome owner; do not expand scope.",
      "Treat missing or conflicting information as UNKNOWN; do not infer completion.",
      "Return only the selected profile contract and distinguish facts, hypotheses, decisions, and unknowns.",
    ]);
    assert.deepEqual(result.agent.stopConditions, [
      "STOP on scope expansion, external action, unresolved contradiction, or invented completion.",
      "STOP when required evidence is unavailable and report the affected field as UNKNOWN.",
    ]);
  }
});

test("activation package: requires one of the four explicit profiles", () => {
  assert.equal(parseActivationProfile("clarify"), "clarify");
  assert.equal(parseActivationProfile("research"), "research");
  assert.equal(parseActivationProfile("planning"), "planning");
  assert.equal(parseActivationProfile("validation"), "validation");
  assert.throws(() => parseActivationProfile(undefined), /ACTIVATION_PROFILE_REQUIRED/);
  assert.throws(() => parseActivationProfile("default"), /ACTIVATION_PROFILE_INVALID/);
  assert.throws(() => parseActivationProfile(1), /ACTIVATION_PROFILE_INVALID/);
});

test("activation package: rejects non-activation intents and stale or incomplete input", () => {
  const response = evaluateQuickTask(request, recipe);
  const intent = acceptedIntent(response);
  const alternative = resolveCheckpoint(response, {
    choice: "REQUEST_ALTERNATIVE",
    expectedRequestFingerprint: response.requestFingerprint,
    expectedRecipeSignature: response.recipeSignature,
    rationale: "Use another recipe.",
  });
  const noAgent = resolveCheckpoint(response, {
    choice: "CONTINUE_WITHOUT_AGENT",
    expectedRequestFingerprint: response.requestFingerprint,
    expectedRecipeSignature: response.recipeSignature,
  });

  assert.throws(() => createQuickTaskActivationPackage(request, alternative as never, "planning"), /ACTIVATION_INTENT_REQUIRED/);
  assert.throws(() => createQuickTaskActivationPackage(request, noAgent as never, "planning"), /ACTIVATION_INTENT_REQUIRED/);
  assert.throws(() => createQuickTaskActivationPackage(request, { ...intent, requestFingerprint: "a".repeat(64) }, "planning"), /ACTIVATION_REQUEST_FINGERPRINT_MISMATCH/);

  const incomplete = { ...request, value: undefined } as unknown as QuickTaskRequest;
  const incompleteIntent = { ...intent, requestFingerprint: requestFingerprint(incomplete) };
  assert.throws(
    () => createQuickTaskActivationPackage(incomplete, incompleteIntent, "planning"),
    (error: unknown) => error instanceof Error && error.message.includes("ACTIVATION_INPUT_INCOMPLETE") && !error.message.includes(request.goal),
  );
  assert.equal(requestFingerprint(request), intent.requestFingerprint);
});

function acceptedChoice(response: ControllerResponse) {
  assert.ok(response.checkpoint);
  return {
    choice: "ACCEPT_RECOMMENDATION" as const,
    expectedRequestFingerprint: response.checkpoint.requestFingerprint,
    expectedRecipeSignature: response.checkpoint.recipeSignature,
  };
}

function acceptedIntent(response: ControllerResponse): ActivationIntent {
  const intent = resolveCheckpoint(response, acceptedChoice(response));
  assert.equal(intent.state, "ACTIVATION_INTENT");
  return intent;
}

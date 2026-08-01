import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateQuickTask } from "../src/controller/evaluate.js";
import { parseQuickTaskRequest } from "../src/controller/request.js";
import { resolveCheckpoint } from "../src/controller/resolve.js";
import type { ControllerImpact, ControllerResponse, QuickTaskRecipe } from "../src/controller/types.js";

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

test("checkpoint resolver: creates an activation intent without activating or generating an artifact", async () => {
  const response = await recommendedResponse();
  const checkpoint = response.checkpoint;
  assert.ok(checkpoint);

  const intent = resolveCheckpoint(response, accept(checkpoint));

  assert.equal(intent.state, "ACTIVATION_INTENT");
  assert.equal(intent.activationPerformed, false);
  assert.equal(intent.artifactGenerationPerformed, false);
  assert.equal(intent.requestFingerprint, response.requestFingerprint);
  assert.equal(intent.recipeSignature, response.recipeSignature);
  assert.deepEqual(resolveCheckpoint(response, accept(checkpoint)), intent);
});

test("checkpoint resolver: preserves an explicit alternative rationale", async () => {
  const response = await recommendedResponse();
  const checkpoint = response.checkpoint;
  assert.ok(checkpoint);

  const intent = resolveCheckpoint(response, {
    choice: "REQUEST_ALTERNATIVE",
    expectedRequestFingerprint: checkpoint.requestFingerprint,
    expectedRecipeSignature: checkpoint.recipeSignature,
    rationale: "Use a research-oriented recipe.",
  });

  assert.equal(intent.state, "ALTERNATIVE_REQUESTED");
  assert.equal(intent.rationale, "Use a research-oriented recipe.");
  assert.equal(intent.activationPerformed, false);
});

test("checkpoint resolver: records an explicit no-Agent continuation", async () => {
  const response = await recommendedResponse();
  const checkpoint = response.checkpoint;
  assert.ok(checkpoint);

  const intent = resolveCheckpoint(response, {
    choice: "CONTINUE_WITHOUT_AGENT",
    expectedRequestFingerprint: checkpoint.requestFingerprint,
    expectedRecipeSignature: checkpoint.recipeSignature,
  });

  assert.equal(intent.state, "NO_AGENT_CONTINUATION");
  assert.equal(intent.activationPerformed, false);
  assert.equal(intent.artifactGenerationPerformed, false);
});

test("checkpoint resolver: rejects stale request and recipe signatures", async () => {
  const response = await recommendedResponse();
  const checkpoint = response.checkpoint;
  assert.ok(checkpoint);

  assert.throws(
    () => resolveCheckpoint(response, { ...accept(checkpoint), expectedRequestFingerprint: "c".repeat(64) }),
    /CHECKPOINT_REQUEST_FINGERPRINT_MISMATCH/,
  );
  assert.throws(
    () => resolveCheckpoint(response, { ...accept(checkpoint), expectedRecipeSignature: "d".repeat(64) }),
    /CHECKPOINT_RECIPE_SIGNATURE_MISMATCH/,
  );
});

test("checkpoint resolver: rejects a non-recommendation response", async () => {
  const response = evaluateQuickTask(parseQuickTaskRequest(await fixture("high-complexity-quick-task.json")), recipe);

  assert.throws(
    () => resolveCheckpoint(response, { choice: "CONTINUE_WITHOUT_AGENT", expectedRequestFingerprint: "a".repeat(64), expectedRecipeSignature: "b".repeat(64) }),
    /CHECKPOINT_NOT_RESOLVABLE/,
  );
});

test("checkpoint resolver: requires acknowledgement for every unsafe recommendation impact", async () => {
  const response = await recommendedResponse();
  const checkpoint = response.checkpoint;
  assert.ok(checkpoint);

  for (const impact of ["UNKNOWN", "DEGRADED", "BREAKING"] as const) {
    const risky = riskyRecommendation(response, impact);
    assert.throws(
      () => resolveCheckpoint(risky, accept(checkpoint)),
      /CHECKPOINT_ACKNOWLEDGEMENT_REQUIRED/,
    );
    assert.equal(resolveCheckpoint(risky, { ...accept(checkpoint), acknowledgement: true }).state, "ACTIVATION_INTENT");
  }
});

async function recommendedResponse(): Promise<ControllerResponse> {
  return evaluateQuickTask(parseQuickTaskRequest(await fixture("eligible-quick-task.json")), recipe);
}

function accept(checkpoint: NonNullable<ControllerResponse["checkpoint"]>) {
  return {
    choice: "ACCEPT_RECOMMENDATION" as const,
    expectedRequestFingerprint: checkpoint.requestFingerprint,
    expectedRecipeSignature: checkpoint.recipeSignature,
  };
}

function riskyRecommendation(response: ControllerResponse, impact: Exclude<ControllerImpact, "COMPATIBLE">): ControllerResponse {
  const checkpoint = response.checkpoint;
  assert.ok(checkpoint);
  return { ...response, impact, requiresAcknowledgement: true, checkpoint: { ...checkpoint, impact, requiresAcknowledgement: true } };
}

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`test/fixtures/controller/${name}`, "utf8")) as unknown;
}

import { ControllerCheckpointError } from "./choice.js";
import type { CheckpointChoiceInput, ControllerImpact, ControllerIntent, ControllerResponse } from "./types.js";

export function resolveCheckpoint(response: ControllerResponse, choice: CheckpointChoiceInput): ControllerIntent {
  if (response.decision !== "RECOMMEND" || response.checkpoint === undefined) {
    throw new ControllerCheckpointError("CHECKPOINT_NOT_RESOLVABLE", "requires a current recommendation checkpoint");
  }
  if (choice.expectedRequestFingerprint !== response.requestFingerprint) {
    throw new ControllerCheckpointError("CHECKPOINT_REQUEST_FINGERPRINT_MISMATCH", "does not match the current request");
  }
  if (choice.expectedRecipeSignature !== response.recipeSignature) {
    throw new ControllerCheckpointError("CHECKPOINT_RECIPE_SIGNATURE_MISMATCH", "does not match the current recipe");
  }
  if (choice.choice === "ACCEPT_RECOMMENDATION" && acknowledgementRequired(response.impact) && choice.acknowledgement !== true) {
    throw new ControllerCheckpointError("CHECKPOINT_ACKNOWLEDGEMENT_REQUIRED", "requires acknowledgement for the current impact");
  }

  const shared = {
    decision: "RECOMMEND" as const,
    impact: response.impact,
    recipe: response.recipe,
    requestFingerprint: response.requestFingerprint,
    recipeSignature: response.recipeSignature,
    activationPerformed: false as const,
    artifactGenerationPerformed: false as const,
  };

  if (choice.choice === "ACCEPT_RECOMMENDATION") return { ...shared, state: "ACTIVATION_INTENT", choice: "ACCEPT_RECOMMENDATION" };
  if (choice.choice === "REQUEST_ALTERNATIVE") return { ...shared, state: "ALTERNATIVE_REQUESTED", choice: "REQUEST_ALTERNATIVE", rationale: choice.rationale };
  return { ...shared, state: "NO_AGENT_CONTINUATION", choice: "CONTINUE_WITHOUT_AGENT" };
}

function acknowledgementRequired(impact: ControllerImpact): boolean {
  return impact === "UNKNOWN" || impact === "DEGRADED" || impact === "BREAKING";
}

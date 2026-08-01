import type { ControllerCheckpoint, ControllerResponse } from "./types.js";

const choices = ["ACCEPT_RECOMMENDATION", "REQUEST_ALTERNATIVE", "CONTINUE_WITHOUT_AGENT"] as const;

export function createCheckpoint(response: Omit<ControllerResponse, "checkpoint">): ControllerCheckpoint | undefined {
  if (response.decision !== "RECOMMEND") return undefined;
  return {
    decision: "RECOMMEND",
    impact: response.impact,
    requiresAcknowledgement: response.requiresAcknowledgement,
    choices,
    recipe: response.recipe,
    requestFingerprint: response.requestFingerprint,
    recipeSignature: response.recipeSignature,
  };
}

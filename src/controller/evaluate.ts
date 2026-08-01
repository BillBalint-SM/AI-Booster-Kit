import { createCheckpoint } from "./checkpoint.js";
import { patternId, recipeSignature, requestFingerprint } from "./identity.js";
import type { ControllerImpact, ControllerResponse, QuickTaskRecipe, QuickTaskRequest } from "./types.js";

export function evaluateQuickTask(request: QuickTaskRequest, recipe: QuickTaskRecipe): ControllerResponse {
  if (recipe.recipeId !== "quick-task-clarifier-validator" || recipe.recipeVersion !== "0.1.0" || recipe.status !== "READY_WITH_LIMIT") {
    throw new ControllerEvaluationError("recipe.status", "is incompatible");
  }
  if (request.preferences?.continuation === "NO_AGENT") return response(request, recipe, "NO_AGENT", "COMPATIBLE", false, ["User requested no Agent help."], []);
  if (request.preferences?.continuation === "CUSTOM_TOOL") return response(request, recipe, "NO_AGENT", "UNKNOWN", true, ["User-selected custom tool has precedence; compatibility is unknown."], []);
  if (request.complexity === "HIGH") return response(request, recipe, "NO_FIT", "COMPATIBLE", false, ["The light recipe supports only low or medium complexity."], []);
  const gaps = recipe.controller.requiredDor.filter((field) => missing(request, field)).map((field) => ({ field, rationale: `Declare ${field} before recommendation.`, severity: "REQUIRED" as const, decisionImpact: "BLOCKS_RECOMMENDATION" as const }));
  if (gaps.length > 0) return response(request, recipe, "PREPARE", "UNKNOWN", false, ["Quick Task DoR is incomplete."], gaps);
  return response(request, recipe, "RECOMMEND", "COMPATIBLE", false, ["The Quick Task fits the light local recipe."], []);
}

export class ControllerEvaluationError extends Error {
  public constructor(field: string, message: string) {
    super(`Quick Task evaluator rejected: ${field} ${message}.`);
    this.name = "ControllerEvaluationError";
  }
}

function missing(request: QuickTaskRequest, field: "value" | "context" | "relations" | "dependencies"): boolean {
  const value = request[field];
  return value === undefined || value.state === "UNKNOWN" || (field === "context" && value.state === "STALE");
}

function response(request: QuickTaskRequest, recipe: QuickTaskRecipe, decision: ControllerResponse["decision"], impact: ControllerImpact, requiresAcknowledgement: boolean, reasons: readonly string[], requiredClarifications: ControllerResponse["requiredClarifications"]): ControllerResponse {
  const evaluated = { decision, impact, requiresAcknowledgement, reasons, requiredClarifications, recipe: { recipeId: recipe.recipeId, recipeVersion: recipe.recipeVersion, status: recipe.status }, requestFingerprint: requestFingerprint(request), recipeSignature: recipeSignature(recipe), patternId: patternId(request, recipe, decision, impact) };
  const checkpoint = createCheckpoint(evaluated);
  return checkpoint === undefined ? evaluated : { ...evaluated, checkpoint };
}

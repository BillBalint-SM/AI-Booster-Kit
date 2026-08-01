import { createHash } from "node:crypto";

import type { ControllerDecision, ControllerImpact, QuickTaskRecipe, QuickTaskRequest } from "./types.js";

export function requestFingerprint(request: QuickTaskRequest): string {
  return digest(request);
}

export function recipeSignature(recipe: QuickTaskRecipe): string {
  return digest(recipe);
}

export function patternId(request: QuickTaskRequest, recipe: QuickTaskRecipe, decision: ControllerDecision, impact: ControllerImpact): string {
  return digest({ workItemType: request.workItemType, recipeId: recipe.recipeId, recipeVersion: recipe.recipeVersion, decision, impact, complexity: request.complexity, relations: request.relations?.state ?? "MISSING", dependencies: request.dependencies?.state ?? "MISSING" });
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

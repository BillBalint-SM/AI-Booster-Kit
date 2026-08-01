import { readFile } from "node:fs/promises";

import { parseDocument } from "yaml";

import type { QuickTaskRecipe } from "./types.js";

const recipeKeys = ["recipeId", "recipeVersion", "status", "ownership", "weight", "coordination", "supportedWorkItem", "controller"] as const;
const controllerKeys = ["version", "eligibleComplexities", "executionBoundary", "requiredDor", "authority"] as const;
const requiredDor = ["value", "context", "relations", "dependencies"] as const;

export class ControllerRecipeError extends Error {
  public constructor(field: string, message: string) {
    super(`Quick Task recipe rejected: ${field} ${message}.`);
    this.name = "ControllerRecipeError";
  }
}

export async function loadQuickTaskRecipe(sourcePath: string): Promise<QuickTaskRecipe> {
  return parseQuickTaskRecipe(await readFile(sourcePath, "utf8"), sourcePath);
}

export function parseQuickTaskRecipe(source: string, sourcePath: string): QuickTaskRecipe {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new ControllerRecipeError("frontmatter", "contains invalid YAML metadata");

  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, recipeKeys, "frontmatter");
  requireLiteral(metadata, "recipeId", "quick-task-clarifier-validator", "recipeId");
  requireLiteral(metadata, "recipeVersion", "0.1.0", "recipeVersion");
  requireLiteral(metadata, "status", "READY_WITH_LIMIT", "status");
  requireLiteral(metadata, "ownership", "personal_or_team", "ownership");
  requireLiteral(metadata, "weight", "light", "weight");
  requireLiteral(metadata, "coordination", "single-agent", "coordination");
  requireLiteral(metadata, "supportedWorkItem", "Quick Task", "supportedWorkItem");

  const controller = requireRecord(metadata.controller, "controller");
  requireExactKeys(controller, controllerKeys, "controller");
  requireLiteral(controller, "version", 1, "controller.version");
  requireExactArray(controller, "eligibleComplexities", ["LOW", "MEDIUM"], "must declare LOW then MEDIUM");
  requireLiteral(controller, "executionBoundary", "LOCAL_ONLY", "controller.executionBoundary");
  requireExactArray(controller, "requiredDor", requiredDor, "must declare the canonical order");
  requireLiteral(controller, "authority", "RECOMMENDATION_ONLY", "controller.authority");

  return {
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
}

function extractFrontmatter(source: string, sourcePath: string): string {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (match?.[1] === undefined) throw new ControllerRecipeError(sourcePath, "must start with one frontmatter block");
  return match[1];
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ControllerRecipeError(field, "must be a plain mapping");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new ControllerRecipeError(field, "must not contain symbol keys");
    if (!expected.includes(key)) throw new ControllerRecipeError(`${field}.${key}`, "is not allowed");
  }
  for (const key of expected) {
    if (!Object.hasOwn(record, key)) throw new ControllerRecipeError(`${field}.${key}`, "is required");
  }
}

function requireLiteral(record: Record<string, unknown>, field: string, expected: string | number, location: string): void {
  if (record[field] !== expected) throw new ControllerRecipeError(location, `must be ${String(expected)}`);
}

function requireExactArray(record: Record<string, unknown>, field: string, expected: readonly string[], message: string): void {
  const value = record[field];
  if (!Array.isArray(value) || value.length !== expected.length || value.some((entry, index) => entry !== expected[index])) {
    throw new ControllerRecipeError(`controller.${field}`, message);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/.test(key)))) {
    throw new ControllerRecipeError(`controller.${field}`, "must be a plain list");
  }
}

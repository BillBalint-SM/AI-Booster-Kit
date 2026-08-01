import { readFile } from "node:fs/promises";

import { parseDocument } from "yaml";

import type { RefinementRecipe, ResearchRecipe, ValidationRecipe } from "./types.js";

const rootKeys = ["recipeId", "recipeVersion", "status", "formationId", "scenario", "weight", "coordination", "controller", "outputContract", "acceptance", "evidenceRequirements", "relations", "recovery"] as const;
const controllerKeys = ["version", "eligibleComplexities", "requiredInput", "executionBoundary", "authority"] as const;
const outputKeys = ["requiredSections", "unknownPolicy", "resultState"] as const;
const acceptanceKeys = ["criteria"] as const;
const relationKeys = ["kind", "target"] as const;
const recoveryKeys = ["preserve", "stopConditions"] as const;
export class ValidationRecipeError extends Error {
  public readonly field: string;
  public readonly reason: string;

  public constructor(field: string, message: string) {
    super(`Validation recipe rejected: ${field} ${message}.`);
    this.name = "ValidationRecipeError";
    this.field = field;
    this.reason = message;
  }
}

export class RefinementRecipeError extends Error {
  public constructor(field: string, message: string) {
    super(`Refinement recipe rejected: ${field} ${message}.`);
    this.name = "RefinementRecipeError";
  }
}

export async function loadValidationRecipe(sourcePath: string): Promise<ValidationRecipe> {
  return parseValidationRecipe(await readFile(sourcePath, "utf8"), sourcePath);
}

export async function loadResearchRecipe(sourcePath: string): Promise<ResearchRecipe> {
  return parseResearchRecipe(await readFile(sourcePath, "utf8"), sourcePath);
}

export async function loadRefinementRecipe(sourcePath: string): Promise<RefinementRecipe> {
  return parseRefinementRecipe(await readFile(sourcePath, "utf8"), sourcePath);
}

export function parseValidationRecipe(source: string, sourcePath: string): ValidationRecipe {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new ValidationRecipeError("frontmatter", "contains invalid YAML metadata");

  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, rootKeys, "frontmatter");
  requireLiteral(metadata, "recipeId", "bounded-validation", "recipeId");
  requireLiteral(metadata, "recipeVersion", "0.1.0", "recipeVersion");
  requireLiteral(metadata, "status", "READY", "status");
  requireLiteral(metadata, "formationId", "bounded-validation", "formationId");
  requireLiteral(metadata, "scenario", "validation", "scenario");
  requireLiteral(metadata, "weight", "medium", "weight");
  requireLiteral(metadata, "coordination", "sequential", "coordination");

  const controller = requireRecord(metadata.controller, "controller");
  requireExactKeys(controller, controllerKeys, "controller");
  requireLiteral(controller, "version", 1, "controller.version");
  requireExactArray(controller, "eligibleComplexities", ["LOW", "MEDIUM"], "controller.eligibleComplexities", "must declare LOW then MEDIUM");
  requireExactArray(controller, "requiredInput", ["claim", "acceptance-criteria", "evidence-sources", "known-limits"], "controller.requiredInput", "must declare the canonical input sections");
  requireLiteral(controller, "executionBoundary", "LOCAL_ONLY", "controller.executionBoundary");
  requireLiteral(controller, "authority", "RECOMMENDATION_ONLY", "controller.authority");

  const outputContract = requireRecord(metadata.outputContract, "outputContract");
  requireExactKeys(outputContract, outputKeys, "outputContract");
  requireExactArray(outputContract, "requiredSections", ["validation-result", "evidence-map", "explicit-stop-or-pass"], "outputContract.requiredSections", "must declare the canonical sections");
  requireLiteral(outputContract, "unknownPolicy", "PRESERVE_AS_UNKNOWN", "outputContract.unknownPolicy");
  requireLiteral(outputContract, "resultState", "NOT_STARTED", "outputContract.resultState");

  const acceptance = requireRecord(metadata.acceptance, "acceptance");
  requireExactKeys(acceptance, acceptanceKeys, "acceptance");
  requireExactArray(acceptance, "criteria", ["claim-traced-to-evidence", "negative-paths-checked", "limits-visible"], "acceptance.criteria", "must declare the canonical criteria");
  requireExactArray(metadata, "evidenceRequirements", ["validation-log", "source-read-back", "residual-risk-record"], "evidenceRequirements", "must declare the canonical evidence requirements");

  const relations = requireList(metadata.relations, "relations");
  if (relations.length !== 1) throw new ValidationRecipeError("relations", "must declare exactly one relation");
  const relation = requireRecord(relations[0], "relations[0]");
  requireExactKeys(relation, relationKeys, "relations[0]");
  requireLiteral(relation, "kind", "validates", "relations[0].kind");
  requireLiteral(relation, "target", "controller", "relations[0].target");

  const recovery = requireRecord(metadata.recovery, "recovery");
  requireExactKeys(recovery, recoveryKeys, "recovery");
  requireExactArray(recovery, "preserve", ["pre-validation-claim", "failed-checks"], "recovery.preserve", "must declare the canonical preserved state");
  requireExactArray(recovery, "stopConditions", ["missing-evidence", "source-mismatch", "unknown-capability"], "recovery.stopConditions", "must declare the canonical stop conditions");

  return {
    recipeId: "bounded-validation",
    recipeVersion: "0.1.0",
    status: "READY",
    formationId: "bounded-validation",
    scenario: "validation",
    weight: "medium",
    coordination: "sequential",
    controller: {
      version: 1,
      eligibleComplexities: ["LOW", "MEDIUM"],
      requiredInput: ["claim", "acceptance-criteria", "evidence-sources", "known-limits"],
      executionBoundary: "LOCAL_ONLY",
      authority: "RECOMMENDATION_ONLY",
    },
    outputContract: {
      requiredSections: ["validation-result", "evidence-map", "explicit-stop-or-pass"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    acceptance: { criteria: ["claim-traced-to-evidence", "negative-paths-checked", "limits-visible"] },
    evidenceRequirements: ["validation-log", "source-read-back", "residual-risk-record"],
    relations: [{ kind: "validates", target: "controller" }],
    recovery: {
      preserve: ["pre-validation-claim", "failed-checks"],
      stopConditions: ["missing-evidence", "source-mismatch", "unknown-capability"],
    },
  };
}

export function parseResearchRecipe(source: string, sourcePath: string): ResearchRecipe {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new ValidationRecipeError("frontmatter", "contains invalid YAML metadata");

  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, rootKeys, "frontmatter");
  requireLiteral(metadata, "recipeId", "bounded-research", "recipeId");
  requireLiteral(metadata, "recipeVersion", "0.1.0", "recipeVersion");
  requireLiteral(metadata, "status", "READY", "status");
  requireLiteral(metadata, "formationId", "bounded-research", "formationId");
  requireLiteral(metadata, "scenario", "research", "scenario");
  requireLiteral(metadata, "weight", "medium", "weight");
  requireLiteral(metadata, "coordination", "parallel-fan-out-fan-in", "coordination");

  const controller = requireRecord(metadata.controller, "controller");
  requireExactKeys(controller, controllerKeys, "controller");
  requireLiteral(controller, "version", 1, "controller.version");
  requireExactArray(controller, "eligibleComplexities", ["LOW", "MEDIUM"], "controller.eligibleComplexities", "must declare LOW then MEDIUM");
  requireExactArray(controller, "requiredInput", ["goal", "scope", "source-allowlist", "evidence-standard"], "controller.requiredInput", "must declare the canonical input sections");
  requireLiteral(controller, "executionBoundary", "LOCAL_ONLY", "controller.executionBoundary");
  requireLiteral(controller, "authority", "RECOMMENDATION_ONLY", "controller.authority");

  const outputContract = requireRecord(metadata.outputContract, "outputContract");
  requireExactKeys(outputContract, outputKeys, "outputContract");
  requireExactArray(outputContract, "requiredSections", ["source-backed-brief", "uncertainty-register", "recommendation-or-stop"], "outputContract.requiredSections", "must declare the canonical sections");
  requireLiteral(outputContract, "unknownPolicy", "PRESERVE_AS_UNKNOWN", "outputContract.unknownPolicy");
  requireLiteral(outputContract, "resultState", "NOT_STARTED", "outputContract.resultState");

  const acceptance = requireRecord(metadata.acceptance, "acceptance");
  requireExactKeys(acceptance, acceptanceKeys, "acceptance");
  requireExactArray(acceptance, "criteria", ["bounded-question", "primary-source-evidence", "unresolved-conflicts-visible"], "acceptance.criteria", "must declare the canonical criteria");
  requireExactArray(metadata, "evidenceRequirements", ["source-register", "quoted-or-linked-findings", "review-record"], "evidenceRequirements", "must declare the canonical evidence requirements");

  const relations = requireList(metadata.relations, "relations");
  if (relations.length !== 1) throw new ValidationRecipeError("relations", "must declare exactly one relation");
  const relation = requireRecord(relations[0], "relations[0]");
  requireExactKeys(relation, relationKeys, "relations[0]");
  requireLiteral(relation, "kind", "related_to", "relations[0].kind");
  requireLiteral(relation, "target", "quick-task-clarifier-validator", "relations[0].target");

  const recovery = requireRecord(metadata.recovery, "recovery");
  requireExactKeys(recovery, recoveryKeys, "recovery");
  requireExactArray(recovery, "preserve", ["source-register", "conflicting-findings"], "recovery.preserve", "must declare the canonical preserved state");
  requireExactArray(recovery, "stopConditions", ["unknown-source-authority", "scope-expansion", "partial-evidence"], "recovery.stopConditions", "must declare the canonical stop conditions");

  return {
    recipeId: "bounded-research",
    recipeVersion: "0.1.0",
    status: "READY",
    formationId: "bounded-research",
    scenario: "research",
    weight: "medium",
    coordination: "parallel-fan-out-fan-in",
    controller: {
      version: 1,
      eligibleComplexities: ["LOW", "MEDIUM"],
      requiredInput: ["goal", "scope", "source-allowlist", "evidence-standard"],
      executionBoundary: "LOCAL_ONLY",
      authority: "RECOMMENDATION_ONLY",
    },
    outputContract: {
      requiredSections: ["source-backed-brief", "uncertainty-register", "recommendation-or-stop"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    acceptance: { criteria: ["bounded-question", "primary-source-evidence", "unresolved-conflicts-visible"] },
    evidenceRequirements: ["source-register", "quoted-or-linked-findings", "review-record"],
    relations: [{ kind: "related_to", target: "quick-task-clarifier-validator" }],
    recovery: {
      preserve: ["source-register", "conflicting-findings"],
      stopConditions: ["unknown-source-authority", "scope-expansion", "partial-evidence"],
    },
  };
}

export function parseRefinementRecipe(source: string, sourcePath: string): RefinementRecipe {
  try {
    return parseRefinementRecipeUnchecked(source, sourcePath);
  } catch (error) {
    if (error instanceof ValidationRecipeError) throw new RefinementRecipeError(error.field, error.reason);
    throw error;
  }
}

function parseRefinementRecipeUnchecked(source: string, sourcePath: string): RefinementRecipe {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new ValidationRecipeError("frontmatter", "contains invalid YAML metadata");

  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, rootKeys, "frontmatter");
  requireLiteral(metadata, "recipeId", "bounded-refinement", "recipeId");
  requireLiteral(metadata, "recipeVersion", "0.1.0", "recipeVersion");
  requireLiteral(metadata, "status", "READY", "status");
  requireLiteral(metadata, "formationId", "bounded-refinement", "formationId");
  requireLiteral(metadata, "scenario", "refinement", "scenario");
  requireLiteral(metadata, "weight", "light", "weight");
  requireLiteral(metadata, "coordination", "sequential", "coordination");

  const controller = requireRecord(metadata.controller, "controller");
  requireExactKeys(controller, controllerKeys, "controller");
  requireLiteral(controller, "version", 1, "controller.version");
  requireExactArray(controller, "eligibleComplexities", ["LOW"], "controller.eligibleComplexities", "must declare LOW");
  requireExactArray(controller, "requiredInput", ["goal", "current-scope", "constraints", "open-questions"], "controller.requiredInput", "must declare the canonical input sections");
  requireLiteral(controller, "executionBoundary", "LOCAL_ONLY", "controller.executionBoundary");
  requireLiteral(controller, "authority", "RECOMMENDATION_ONLY", "controller.authority");

  const outputContract = requireRecord(metadata.outputContract, "outputContract");
  requireExactKeys(outputContract, outputKeys, "outputContract");
  requireExactArray(outputContract, "requiredSections", ["refined-scope", "acceptance-criteria", "decision-record"], "outputContract.requiredSections", "must declare the canonical sections");
  requireLiteral(outputContract, "unknownPolicy", "PRESERVE_AS_UNKNOWN", "outputContract.unknownPolicy");
  requireLiteral(outputContract, "resultState", "NOT_STARTED", "outputContract.resultState");

  const acceptance = requireRecord(metadata.acceptance, "acceptance");
  requireExactKeys(acceptance, acceptanceKeys, "acceptance");
  requireExactArray(acceptance, "criteria", ["scope-preserved", "assumptions-visible", "acceptance-testable"], "acceptance.criteria", "must declare the canonical criteria");
  requireExactArray(metadata, "evidenceRequirements", ["before-scope", "after-scope", "decision-record"], "evidenceRequirements", "must declare the canonical evidence requirements");

  const relations = requireList(metadata.relations, "relations");
  if (relations.length !== 1) throw new ValidationRecipeError("relations", "must declare exactly one relation");
  const relation = requireRecord(relations[0], "relations[0]");
  requireExactKeys(relation, relationKeys, "relations[0]");
  requireLiteral(relation, "kind", "related_to", "relations[0].kind");
  requireLiteral(relation, "target", "quick-task-clarifier-validator", "relations[0].target");

  const recovery = requireRecord(metadata.recovery, "recovery");
  requireExactKeys(recovery, recoveryKeys, "recovery");
  requireExactArray(recovery, "preserve", ["original-scope", "rejected-interpretations"], "recovery.preserve", "must declare the canonical preserved state");
  requireExactArray(recovery, "stopConditions", ["unaccepted-scope-change", "unresolved-conflict"], "recovery.stopConditions", "must declare the canonical stop conditions");

  return {
    recipeId: "bounded-refinement",
    recipeVersion: "0.1.0",
    status: "READY",
    formationId: "bounded-refinement",
    scenario: "refinement",
    weight: "light",
    coordination: "sequential",
    controller: {
      version: 1,
      eligibleComplexities: ["LOW"],
      requiredInput: ["goal", "current-scope", "constraints", "open-questions"],
      executionBoundary: "LOCAL_ONLY",
      authority: "RECOMMENDATION_ONLY",
    },
    outputContract: {
      requiredSections: ["refined-scope", "acceptance-criteria", "decision-record"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    acceptance: { criteria: ["scope-preserved", "assumptions-visible", "acceptance-testable"] },
    evidenceRequirements: ["before-scope", "after-scope", "decision-record"],
    relations: [{ kind: "related_to", target: "quick-task-clarifier-validator" }],
    recovery: {
      preserve: ["original-scope", "rejected-interpretations"],
      stopConditions: ["unaccepted-scope-change", "unresolved-conflict"],
    },
  };
}

function extractFrontmatter(source: string, sourcePath: string): string {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (match?.[1] === undefined) throw new ValidationRecipeError(sourcePath, "must start with one frontmatter block");
  return match[1];
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ValidationRecipeError(field, "must be a plain mapping");
  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new ValidationRecipeError(field, "must not contain symbol keys");
    if (!expected.includes(key)) throw new ValidationRecipeError(`${field}.${key}`, "is not allowed");
  }
  for (const key of expected) if (!Object.hasOwn(record, key)) throw new ValidationRecipeError(`${field}.${key}`, "is required");
}

function requireLiteral(record: Record<string, unknown>, field: string, expected: string | number, location: string): void {
  if (record[field] !== expected) throw new ValidationRecipeError(location, `must be ${String(expected)}`);
}

function requireExactArray(record: Record<string, unknown>, field: string, expected: readonly string[], location: string, message: string): void {
  const value = record[field];
  if (!Array.isArray(value) || value.length !== expected.length || value.some((entry, index) => entry !== expected[index])) throw new ValidationRecipeError(location, message);
}

function requireList(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new ValidationRecipeError(field, "must be a non-empty list");
  return value;
}

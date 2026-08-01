import { readFile } from "node:fs/promises";

import { parseDocument } from "yaml";

import type {
  FormationCatalog,
  FormationComplexity,
  FormationEntry,
  FormationEntryStatus,
  FormationRelationKind,
  FormationRole,
  FormationScenario,
  FormationTopology,
  FormationWeight,
} from "./types.js";

const catalogKeys = ["catalogId", "catalogVersion", "status", "formations"] as const;
const entryKeys = ["formationId", "version", "status", "scenario", "weight", "complexity", "topology", "roles", "requiredInput", "expectedOutput", "acceptance", "relations", "prerequisites", "recovery", "identity", "recipePath", "executionBoundary", "authority"] as const;
const acceptanceKeys = ["criteria", "evidence"] as const;
const relationKeys = ["kind", "target"] as const;
const recoveryKeys = ["preserve", "stopConditions"] as const;
const identityKeys = ["key", "pattern"] as const;

export class FormationCatalogError extends Error {
  public constructor(field: string, message: string) {
    super(`formation catalog rejected: ${field} ${message}.`);
    this.name = "FormationCatalogError";
  }
}

export async function loadFormationCatalog(sourcePath: string): Promise<FormationCatalog> {
  return parseFormationCatalog(await readFile(sourcePath, "utf8"), sourcePath);
}

export function parseFormationCatalog(source: string, sourcePath: string): FormationCatalog {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new FormationCatalogError("frontmatter", "contains invalid YAML metadata");

  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, catalogKeys, "frontmatter");
  requireLiteral(metadata, "catalogId", "agent-formation-library", "frontmatter.catalogId");
  requireLiteral(metadata, "catalogVersion", "1.0.0", "frontmatter.catalogVersion");
  requireLiteral(metadata, "status", "READY_WITH_LIMIT", "frontmatter.status");

  const rawFormations = requireNonEmptyList(metadata.formations, "frontmatter.formations");
  const formations = rawFormations.map((value, index) => parseFormationEntry(value, index));
  const formationIds = new Set<string>();
  const identityKeys = new Set<string>();
  for (const [index, formation] of formations.entries()) {
    if (formationIds.has(formation.formationId)) {
      throw new FormationCatalogError(`formations[${index}].formationId`, `duplicates ${formation.formationId}`);
    }
    formationIds.add(formation.formationId);
    if (identityKeys.has(formation.identity.key)) {
      throw new FormationCatalogError(`formations[${index}].identity.key`, `duplicates ${formation.identity.key}`);
    }
    identityKeys.add(formation.identity.key);
  }

  return {
    catalogId: "agent-formation-library",
    catalogVersion: "1.0.0",
    status: "READY_WITH_LIMIT",
    formations,
  };
}

function parseFormationEntry(value: unknown, index: number): FormationEntry {
  const field = `formations[${index}]`;
  const entry = requireRecord(value, field);
  requireExactKeys(entry, entryKeys, field);
  const acceptance = requireRecord(entry.acceptance, `${field}.acceptance`);
  requireExactKeys(acceptance, acceptanceKeys, `${field}.acceptance`);
  const relations = requireNonEmptyList(entry.relations, `${field}.relations`).map((value, relationIndex) => parseRelation(value, field, relationIndex));
  const recovery = requireRecord(entry.recovery, `${field}.recovery`);
  requireExactKeys(recovery, recoveryKeys, `${field}.recovery`);
  const identity = requireRecord(entry.identity, `${field}.identity`);
  requireExactKeys(identity, identityKeys, `${field}.identity`);

  const status = requireEnum(entry.status, ["CANDIDATE", "READY_WITH_LIMIT", "READY"], `${field}.status`, "CANDIDATE, READY_WITH_LIMIT, or READY") as FormationEntryStatus;
  const recipePath = requireNullableString(entry.recipePath, `${field}.recipePath`);
  if (status === "READY" && recipePath === null) throw new FormationCatalogError(`${field}.recipePath`, "is required for READY entries");
  return {
    formationId: requireNonEmptyString(entry.formationId, `${field}.formationId`),
    version: requireNonEmptyString(entry.version, `${field}.version`),
    status,
    scenario: requireEnum(entry.scenario, ["quick_task", "research", "refinement", "development", "debugging", "validation"], `${field}.scenario`, "a supported scenario") as FormationScenario,
    weight: requireEnum(entry.weight, ["light", "medium", "heavy"], `${field}.weight`, "light, medium, or heavy") as FormationWeight,
    complexity: requireEnum(entry.complexity, ["low", "medium", "high"], `${field}.complexity`, "low, medium, or high") as FormationComplexity,
    topology: requireEnum(entry.topology, ["single-agent", "sequential", "parallel-fan-out-fan-in"], `${field}.topology`, "a supported topology") as FormationTopology,
    roles: requireEnumList(entry.roles, ["clarifier", "validator", "human-checkpoint", "researcher", "evidence-manager", "reviewer", "planner", "implementer", "debugger"], `${field}.roles`, "a supported role") as readonly FormationRole[],
    requiredInput: requireNonEmptyStringList(entry.requiredInput, `${field}.requiredInput`),
    expectedOutput: requireNonEmptyStringList(entry.expectedOutput, `${field}.expectedOutput`),
    acceptance: {
      criteria: requireNonEmptyStringList(acceptance.criteria, `${field}.acceptance.criteria`),
      evidence: requireNonEmptyStringList(acceptance.evidence, `${field}.acceptance.evidence`),
    },
    relations,
    prerequisites: requireNonEmptyStringList(entry.prerequisites, `${field}.prerequisites`),
    recovery: {
      preserve: requireNonEmptyStringList(recovery.preserve, `${field}.recovery.preserve`),
      stopConditions: requireNonEmptyStringList(recovery.stopConditions, `${field}.recovery.stopConditions`),
    },
    identity: {
      key: requireNonEmptyString(identity.key, `${field}.identity.key`),
      pattern: requireNonEmptyString(identity.pattern, `${field}.identity.pattern`),
    },
    recipePath,
    executionBoundary: requireEnum(entry.executionBoundary, ["LOCAL_ONLY"], `${field}.executionBoundary`, "LOCAL_ONLY") as "LOCAL_ONLY",
    authority: requireEnum(entry.authority, ["RECOMMENDATION_ONLY"], `${field}.authority`, "RECOMMENDATION_ONLY") as "RECOMMENDATION_ONLY",
  };
}

function parseRelation(value: unknown, field: string, index: number): { kind: FormationRelationKind; target: string } {
  const relationField = `${field}.relations[${index}]`;
  const relation = requireRecord(value, relationField);
  requireExactKeys(relation, relationKeys, relationField);
  return {
    kind: requireEnum(relation.kind, ["implements", "depends_on", "blocks", "validates", "parallel_to", "related_to"], `${relationField}.kind`, "a supported relation") as FormationRelationKind,
    target: requireNonEmptyString(relation.target, `${relationField}.target`),
  };
}

function extractFrontmatter(source: string, sourcePath: string): string {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (match?.[1] === undefined) throw new FormationCatalogError(sourcePath, "must start with one frontmatter block");
  return match[1];
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new FormationCatalogError(field, "must be a plain mapping");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new FormationCatalogError(field, "must not contain symbol keys");
    if (!expected.includes(key)) throw new FormationCatalogError(`${field}.${key}`, "is not allowed");
  }
  for (const key of expected) {
    if (!Object.hasOwn(record, key)) throw new FormationCatalogError(`${field}.${key}`, "is required");
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new FormationCatalogError(field, "must be a non-empty string");
  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value !== null && (typeof value !== "string" || value.trim().length === 0)) throw new FormationCatalogError(field, "must be a non-empty string or null");
  return value as string | null;
}

function requireNonEmptyList(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new FormationCatalogError(field, "must be a non-empty list");
  return value;
}

function requireNonEmptyStringList(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) throw new FormationCatalogError(field, "must be a non-empty list");
  if (value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new FormationCatalogError(field, "must contain only non-empty strings");
  }
  return value as readonly string[];
}

function requireEnum(value: unknown, allowed: readonly string[], field: string, description: string): string {
  if (typeof value !== "string" || !allowed.includes(value)) throw new FormationCatalogError(field, `must be ${description}`);
  return value;
}

function requireEnumList(value: unknown, allowed: readonly string[], field: string, description: string): readonly string[] {
  const list = requireNonEmptyStringList(value, field);
  if (list.some((entry) => typeof entry !== "string" || !allowed.includes(entry))) {
    throw new FormationCatalogError(field, `must contain only ${description} values`);
  }
  return list as readonly string[];
}

function requireLiteral(record: Record<string, unknown>, field: string, expected: string, location: string): void {
  if (record[field] !== expected) throw new FormationCatalogError(location, `must be ${expected}`);
}

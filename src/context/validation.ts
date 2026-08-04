import { ContextError } from "./types.js";
import type { ContextReference, EpicContext, MilestoneContext, SessionExecutionBinding, SessionState } from "./types.js";

const sessionKeys = ["sessionVersion", "sessionId", "owner", "retention", "readScope", "executionScope", "writeAuthority", "contextReferences", "workItemIds", "activationPackageId", "recipe", "setupFingerprint", "status", "decisions", "evidenceRefs", "unknowns", "deviations", "dependencies", "progress", "nextAction", "execution"] as const;
const secretFieldPattern = /(?:transcript|prompt|secret|token|credential|cookie)/i;

export function validateMilestoneContext(milestone: MilestoneContext, epics: readonly EpicContext[]): void {
  validateMilestoneShape(milestone);
  const epicIds = new Set<string>();
  for (const epic of epics) {
    validateEpicShape(epic);
    if (epic.milestoneId !== milestone.milestoneId) throw new ContextError(`Epic '${epic.epicId}' must have Milestone parent '${milestone.milestoneId}'`);
    if (epicIds.has(epic.epicId)) throw new ContextError(`Epic '${epic.epicId}' is duplicated`);
    epicIds.add(epic.epicId);
  }
  assertUnique(milestone.epicIds, "Milestone Epic reference");
  if (milestone.epicIds.length !== epicIds.size || milestone.epicIds.some((epicId) => !epicIds.has(epicId))) {
    throw new ContextError("Milestone Epic references must resolve to exactly one linked Epic-context");
  }
}

export function validateEpicContext(epic: EpicContext, milestone: MilestoneContext, knownWorkItemIds: readonly string[]): void {
  validateMilestoneShape(milestone);
  validateEpicShape(epic);
  if (epic.milestoneId !== milestone.milestoneId) throw new ContextError(`Epic '${epic.epicId}' must have Milestone parent '${milestone.milestoneId}'`);
  if (!milestone.epicIds.includes(epic.epicId)) throw new ContextError(`Epic '${epic.epicId}' is not linked by its Milestone-context`);
  assertUnique(knownWorkItemIds, "Known work item");
  if (epic.workItemIds.some((workItemId) => !knownWorkItemIds.includes(workItemId))) {
    throw new ContextError(`Epic '${epic.epicId}' contains a Story, Task, or Bug outside its declared boundary`);
  }
}

function validateMilestoneShape(milestone: MilestoneContext): void {
  validateContextEnvelope(milestone, "MILESTONE");
  assertNonEmpty(milestone.milestoneId, "Milestone identifier");
  assertNonEmpty(milestone.canonicalArtifactId, "Milestone canonical artifact identifier");
  assertUnique(milestone.epicIds, "Milestone Epic reference");
}

export function validateSessionState(value: unknown): SessionState {
  const record = recordValue(value, "session state");
  for (const key of Object.keys(record)) {
    if (secretFieldPattern.test(key)) throw new ContextError("session state must not retain transcript or credential-shaped fields");
  }
  exactKeys(record, sessionKeys, "session state");
  const references = contextReferences(record.contextReferences);
  const workItemIds = stringList(record.workItemIds, "session state workItemIds");
  const readScope = literal(record, "readScope", ["FULL_MILESTONE"], "session state");
  const executionScope = sessionExecutionScope(record.executionScope);
  const writeAuthority = literal(record, "writeAuthority", ["ARTIFACT_OWNER_THROUGH_APPROVED_PR"], "session state");
  const recipe = recipeValue(record.recipe);
  const setupFingerprint = nullableString(record.setupFingerprint, "session state setupFingerprint");
  const activationPackageId = nullableString(record.activationPackageId, "session state activationPackageId");
  const execution = executionValue(record.execution);
  if ((recipe === null) !== (setupFingerprint === null) || (recipe === null) !== (activationPackageId === null)) {
    throw new ContextError("session recipe, setup fingerprint, and activation package identity must be present together or absent together");
  }
  const milestoneReferences = references.filter((reference) => reference.kind === "MILESTONE");
  const epicReferences = references.filter((reference) => reference.kind === "EPIC");
  if (milestoneReferences.length !== 1 || epicReferences.length > 1) throw new ContextError("session state must reference one Milestone and at most one Epic");
  if ((execution !== null || workItemIds.length > 0) && epicReferences.length !== 1) throw new ContextError("an implementation session requires one Epic reference");
  if (execution !== null && workItemIds.length === 0) throw new ContextError("an implementation session requires affected Story, Task, or Bug references");
  if (executionScope.kind === "MILESTONE" && (epicReferences.length > 0 || executionScope.contextId !== milestoneReferences[0]!.contextId || executionScope.workItemIds.length > 0)) {
    throw new ContextError("Milestone execution scope must reference only the session Milestone");
  }
  if (executionScope.kind === "EPIC" && (epicReferences.length !== 1 || executionScope.contextId !== epicReferences[0]!.contextId || !sameStringList(executionScope.workItemIds, workItemIds))) {
    throw new ContextError("Epic execution scope must match the session Epic and work items");
  }
  return {
    sessionVersion: literal(record, "sessionVersion", ["1.0"], "session state"),
    sessionId: requiredString(record, "sessionId", "session state"),
    owner: requiredString(record, "owner", "session state"),
    retention: literal(record, "retention", ["EPHEMERAL", "PERSONAL", "TEAM"], "session state"),
    readScope,
    executionScope,
    writeAuthority,
    contextReferences: references,
    workItemIds,
    activationPackageId,
    recipe,
    setupFingerprint,
    status: literal(record, "status", ["ACTIVE", "PAUSED", "STOPPED", "UNKNOWN", "COMPLETE_WITH_LIMIT", "COMPLETE"], "session state"),
    decisions: stringList(record.decisions, "session state decisions"),
    evidenceRefs: stringList(record.evidenceRefs, "session state evidenceRefs"),
    unknowns: stringList(record.unknowns, "session state unknowns"),
    deviations: stringList(record.deviations, "session state deviations"),
    dependencies: stringList(record.dependencies, "session state dependencies"),
    progress: stringList(record.progress, "session state progress"),
    nextAction: requiredString(record, "nextAction", "session state"),
    execution,
  };
}

function validateEpicShape(epic: EpicContext): void {
  validateContextEnvelope(epic, "EPIC");
  assertNonEmpty(epic.epicId, "Epic identifier");
  assertNonEmpty(epic.milestoneId, "Epic Milestone identifier");
  assertUnique(epic.workItemIds, `Epic '${epic.epicId}' work item`);
}

function validateContextEnvelope(context: { contextVersion: unknown; kind: unknown; contextId: unknown; sourceRevision: unknown; owner: unknown; retention: unknown; state: unknown; readScope: unknown; writeAuthority: unknown }, expectedKind: "MILESTONE" | "EPIC"): void {
  if (context.kind !== expectedKind || context.contextVersion !== "1.0" || !["DRAFT", "ACCEPTED", "STALE", "SUPERSEDED"].includes(context.state as string) || context.state === "STALE" || context.state === "SUPERSEDED") {
    throw new ContextError(`${expectedKind} context is not current and usable`);
  }
  if (!(["EPHEMERAL", "PERSONAL", "TEAM"] as readonly unknown[]).includes(context.retention)) throw new ContextError(`${expectedKind} retention is invalid`);
  if (context.readScope !== "FULL_MILESTONE") throw new ContextError(`${expectedKind} read scope is invalid`);
  if (context.writeAuthority !== "ARTIFACT_OWNER_THROUGH_APPROVED_PR") throw new ContextError(`${expectedKind} write authority is invalid`);
  assertNonEmpty(context.contextId, `${expectedKind} context identifier`);
  assertNonEmpty(context.sourceRevision, `${expectedKind} source revision`);
  assertNonEmpty(context.owner, `${expectedKind} owner`);
}

function assertNonEmpty(value: unknown, label: string): void {
  if (typeof value !== "string" || value.trim() === "") throw new ContextError(`${label} must be non-empty`);
}

function assertUnique(values: readonly unknown[], label: string): void {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.trim() === "") || new Set(values).size !== values.length) throw new ContextError(`${label} values must be non-empty and unique`);
}

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ContextError(`${label} must be a plain object`);
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], label: string): void {
  if (Object.keys(record).length !== expected.length || expected.some((key) => !Object.hasOwn(record, key)) || Object.keys(record).some((key) => !expected.includes(key))) {
    throw new ContextError(`${label} fields do not match its contract`);
  }
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new ContextError(`${label}.${key} must be a non-empty string`);
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") throw new ContextError(`${label} must be null or a non-empty string`);
  return value;
}

function literal<T extends string>(record: Record<string, unknown>, key: string, expected: readonly T[], label: string): T {
  const value = record[key];
  if (typeof value !== "string" || !expected.includes(value as T)) throw new ContextError(`${label}.${key} is invalid`);
  return value as T;
}

function stringList(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "") || new Set(value).size !== value.length) {
    throw new ContextError(`${label} must be a unique list of non-empty strings`);
  }
  return value;
}

function sameStringList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function contextReferences(value: unknown): readonly ContextReference[] {
  if (!Array.isArray(value) || value.length === 0) throw new ContextError("session state contextReferences must be a non-empty list");
  const references = value.map((entry) => {
    const record = recordValue(entry, "session state context reference");
    exactKeys(record, ["kind", "contextId", "sourceRevision"], "session state context reference");
    return {
      kind: literal(record, "kind", ["MILESTONE", "EPIC"], "session state context reference"),
      contextId: requiredString(record, "contextId", "session state context reference"),
      sourceRevision: requiredString(record, "sourceRevision", "session state context reference"),
    };
  });
  const identities = references.map((reference) => `${reference.kind}:${reference.contextId}`);
  if (new Set(identities).size !== identities.length) throw new ContextError("session state context references must be unique");
  return references;
}

function sessionExecutionScope(value: unknown): SessionState["executionScope"] {
  const record = recordValue(value, "session execution scope");
  exactKeys(record, ["kind", "contextId", "workItemIds"], "session execution scope");
  const kind = literal(record, "kind", ["MILESTONE", "EPIC"], "session execution scope");
  const contextId = requiredString(record, "contextId", "session execution scope");
  const workItemIds = stringList(record.workItemIds, "session execution scope workItemIds");
  if (kind === "MILESTONE" && workItemIds.length > 0) throw new ContextError("Milestone execution scope cannot contain work items");
  return kind === "MILESTONE" ? { kind, contextId, workItemIds: [] } : { kind, contextId, workItemIds };
}

function recipeValue(value: unknown): SessionState["recipe"] {
  if (value === null) return null;
  const record = recordValue(value, "session state recipe");
  exactKeys(record, ["recipeId", "recipeVersion", "variantId"], "session state recipe");
  return {
    recipeId: requiredString(record, "recipeId", "session state recipe"),
    recipeVersion: requiredString(record, "recipeVersion", "session state recipe"),
    variantId: requiredString(record, "variantId", "session state recipe"),
  };
}

function executionValue(value: unknown): SessionExecutionBinding | null {
  if (value === null) return null;
  const record = recordValue(value, "session execution binding");
  exactKeys(record, ["repository", "branch", "worktree", "baseRevision"], "session execution binding");
  return {
    repository: requiredString(record, "repository", "session execution binding"),
    branch: requiredString(record, "branch", "session execution binding"),
    worktree: requiredString(record, "worktree", "session execution binding"),
    baseRevision: requiredString(record, "baseRevision", "session execution binding"),
  };
}

import type { LinkDeclaration, QuickTaskRequest, ValidationFormationInput } from "./types.js";

const rootKeys = ["requestVersion", "workItemType", "goal", "outcomeOwner", "complexity", "executionBoundary", "value", "context", "relations", "dependencies", "preferences", "formationInput"] as const;

export class ControllerRequestError extends Error {
  public constructor(field: string, message: string) {
    super(`Quick Task request rejected: ${field} ${message}.`);
    this.name = "ControllerRequestError";
  }
}

export function parseQuickTaskRequest(value: unknown): QuickTaskRequest {
  const record = plainRecord(value, "request");
  allowedKeys(record, rootKeys, "request");
  for (const field of ["requestVersion", "workItemType", "goal", "outcomeOwner", "complexity", "executionBoundary"]) {
    if (!Object.hasOwn(record, field)) throw new ControllerRequestError(field, "is required");
  }
  const request: QuickTaskRequest = {
    requestVersion: literal(record, "requestVersion", "1.0"),
    workItemType: literal(record, "workItemType", "Quick Task"),
    goal: nonEmpty(record, "goal"),
    outcomeOwner: nonEmpty(record, "outcomeOwner"),
    complexity: oneOf(record, "complexity", ["LOW", "MEDIUM", "HIGH"]),
    executionBoundary: literal(record, "executionBoundary", "LOCAL_ONLY"),
  };
  if (Object.hasOwn(record, "value")) request.value = parseValue(record.value);
  if (Object.hasOwn(record, "context")) request.context = parseContext(record.context);
  if (Object.hasOwn(record, "relations")) request.relations = parseLinks(record.relations, "relations");
  if (Object.hasOwn(record, "dependencies")) request.dependencies = parseLinks(record.dependencies, "dependencies");
  if (Object.hasOwn(record, "preferences")) request.preferences = parsePreferences(record.preferences);
  if (Object.hasOwn(record, "formationInput")) request.formationInput = parseFormationInput(record.formationInput);
  return request;
}

function parseFormationInput(value: unknown): ValidationFormationInput {
  const record = plainRecord(value, "formationInput");
  exactKeys(record, ["scenario", "claim", "acceptanceCriteria", "evidenceSources", "knownLimits"], "formationInput");
  return {
    scenario: literal(record, "scenario", "validation"),
    claim: nonEmpty(record, "claim"),
    acceptanceCriteria: requiredStringArray(record.acceptanceCriteria, "formationInput.acceptanceCriteria"),
    evidenceSources: requiredStringArray(record.evidenceSources, "formationInput.evidenceSources"),
    knownLimits: requiredStringArray(record.knownLimits, "formationInput.knownLimits"),
  };
}

function parseValue(value: unknown): Exclude<QuickTaskRequest["value"], undefined> {
  const record = plainRecord(value, "value");
  const state = oneOf(record, "state", ["KNOWN", "UNKNOWN"]);
  exactKeys(record, state === "KNOWN" ? ["state", "statement"] : ["state"], "value");
  return state === "KNOWN" ? { state, statement: nonEmpty(record, "statement") } : { state };
}

function parseContext(value: unknown): Exclude<QuickTaskRequest["context"], undefined> {
  const record = plainRecord(value, "context");
  const state = oneOf(record, "state", ["CURRENT", "STALE", "UNKNOWN"]);
  exactKeys(record, state === "UNKNOWN" ? ["state"] : ["state", "reference"], "context");
  return state === "UNKNOWN" ? { state } : { state, reference: nonEmpty(record, "reference") };
}

function parseLinks(value: unknown, field: string): LinkDeclaration {
  const record = plainRecord(value, field);
  exactKeys(record, ["state", "items"], field);
  const state = oneOf(record, "state", ["KNOWN", "ABSENT", "UNKNOWN"]);
  const items = stringArray(record.items, `${field}.items`);
  if (state === "KNOWN" && items.length === 0) throw new ControllerRequestError(`${field}.items`, "must be non-empty when state is KNOWN");
  if (state !== "KNOWN" && items.length !== 0) throw new ControllerRequestError(`${field}.items`, "must be empty unless state is KNOWN");
  return state === "KNOWN" ? { state, items } : { state, items: [] };
}

function parsePreferences(value: unknown): { continuation: "NO_AGENT" | "CUSTOM_TOOL" } {
  const record = plainRecord(value, "preferences");
  exactKeys(record, ["continuation"], "preferences");
  return { continuation: oneOf(record, "continuation", ["NO_AGENT", "CUSTOM_TOOL"]) };
}

function plainRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ControllerRequestError(field, "must be a plain object");
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  allowedKeys(record, expected, field);
  for (const key of expected) if (!Object.hasOwn(record, key)) throw new ControllerRequestError(key, "is required");
}

function allowedKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new ControllerRequestError(field, "must not contain symbol keys");
    if (!expected.includes(key)) throw new ControllerRequestError(key, "is not allowed");
  }
}

function literal<T extends string>(record: Record<string, unknown>, field: string, expected: T): T {
  if (record[field] !== expected) throw new ControllerRequestError(field, `must be ${expected}`);
  return expected;
}

function oneOf<T extends string>(record: Record<string, unknown>, field: string, expected: readonly T[]): T {
  const value = record[field];
  if (typeof value !== "string" || !expected.includes(value as T)) throw new ControllerRequestError(field, `must be one of ${expected.join(", ")}`);
  return value as T;
}

function nonEmpty(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") throw new ControllerRequestError(field, "must be a non-empty string");
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/.test(key))) || value.some((item) => typeof item !== "string" || item.trim() === "")) throw new ControllerRequestError(field, "must be a list of non-empty strings");
  return [...value];
}

function requiredStringArray(value: unknown, field: string): string[] {
  const items = stringArray(value, field);
  if (items.length === 0) throw new ControllerRequestError(field, "must be a non-empty list of non-empty strings");
  return items;
}

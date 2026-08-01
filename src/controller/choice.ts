import type { CheckpointChoiceInput } from "./types.js";

const commonKeys = ["choice", "expectedRequestFingerprint", "expectedRecipeSignature"] as const;

export class ControllerCheckpointError extends Error {
  public constructor(field: string, message: string) {
    super(`Quick Task checkpoint rejected: ${field} ${message}.`);
    this.name = "ControllerCheckpointError";
  }
}

export function parseCheckpointChoice(value: unknown): CheckpointChoiceInput {
  const record = plainRecord(value, "choice");
  const choice = oneOf(record, "choice", ["ACCEPT_RECOMMENDATION", "REQUEST_ALTERNATIVE", "CONTINUE_WITHOUT_AGENT"]);
  const expectedRequestFingerprint = digest(record, "expectedRequestFingerprint");
  const expectedRecipeSignature = digest(record, "expectedRecipeSignature");

  if (choice === "ACCEPT_RECOMMENDATION") {
    allowedKeys(record, [...commonKeys, "acknowledgement"], "choice");
    requiredKeys(record, commonKeys, "choice");
    if (Object.hasOwn(record, "acknowledgement") && record.acknowledgement !== true) throw new ControllerCheckpointError("acknowledgement", "must be true");
    return record.acknowledgement === true
      ? { choice, expectedRequestFingerprint, expectedRecipeSignature, acknowledgement: true }
      : { choice, expectedRequestFingerprint, expectedRecipeSignature };
  }
  if (choice === "REQUEST_ALTERNATIVE") {
    exactKeys(record, [...commonKeys, "rationale"], "choice");
    return { choice, expectedRequestFingerprint, expectedRecipeSignature, rationale: nonEmpty(record, "rationale") };
  }
  exactKeys(record, commonKeys, "choice");
  return { choice, expectedRequestFingerprint, expectedRecipeSignature };
}

function plainRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ControllerCheckpointError(field, "must be a plain object");
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  allowedKeys(record, expected, field);
  requiredKeys(record, expected, field);
}

function allowedKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new ControllerCheckpointError(field, "must not contain symbol keys");
    if (!expected.includes(key)) throw new ControllerCheckpointError(key, "is not allowed");
  }
}

function requiredKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of expected) if (!Object.hasOwn(record, key)) throw new ControllerCheckpointError(key, "is required");
}

function oneOf<T extends string>(record: Record<string, unknown>, field: string, expected: readonly T[]): T {
  const value = record[field];
  if (typeof value !== "string" || !expected.includes(value as T)) throw new ControllerCheckpointError(field, `must be one of ${expected.join(", ")}`);
  return value as T;
}

function digest(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new ControllerCheckpointError(field, "must be a lowercase SHA-256 digest");
  return value;
}

function nonEmpty(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") throw new ControllerCheckpointError(field, "must be a non-empty string");
  return value;
}

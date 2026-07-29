import { createHash } from "node:crypto";

import type { CanonicalEvent, CanonicalEventSource } from "../domain/model.js";
import { validateCanonicalRecord } from "../domain/validate.js";

export interface EventInput {
  executionSetId: string;
  artifactId: string;
  correlationId: string;
  source: CanonicalEventSource;
  actor: string;
  eventType: string;
  sourceRevision: string;
  beforeState: string;
  afterState: string;
  evidenceRefs: string[];
}

export type { CanonicalEvent, CanonicalEventSource } from "../domain/model.js";

const inputKeys = ["executionSetId", "artifactId", "correlationId", "source", "actor", "eventType", "sourceRevision", "beforeState", "afterState", "evidenceRefs"] as const;
const eventKeys = [...inputKeys, "timestamp", "idempotencyKey"] as const;
const sourceKeys = ["authority", "canonicalId", "targetIdentity", "requestedOperation"] as const;

export function createCanonicalEvent(input: EventInput): CanonicalEvent {
  validateEventInput(input);
  const event: CanonicalEvent = {
    ...input,
    timestamp: new Date().toISOString(),
    idempotencyKey: createIdempotencyKey(input),
  };

  return validateCanonicalEvent(event);
}

export function validateCanonicalEvent(event: unknown): CanonicalEvent {
  assertRecord(event, eventKeys, "Canonical event");
  const candidate = event as Record<string, unknown>;
  validateEventFields(candidate);
  if (!isNonEmptyString(candidate.timestamp) || Number.isNaN(Date.parse(candidate.timestamp))) {
    throw new Error("Canonical event timestamp must be a valid non-empty ISO timestamp.");
  }
  if (!isNonEmptyString(candidate.idempotencyKey)) {
    throw new Error("Canonical event idempotencyKey must be a non-empty string.");
  }
  const input = pickEventInput(candidate);
  if (candidate.idempotencyKey !== createIdempotencyKey(input)) {
    throw new Error("Canonical event idempotencyKey does not match stable event identity.");
  }
  validateCanonicalRecord(event, "canonicalEvent");
  return event as unknown as CanonicalEvent;
}

function validateEventInput(input: unknown): asserts input is EventInput {
  assertRecord(input, inputKeys, "Event input");
  validateEventFields(input as Record<string, unknown>);
}

function validateEventFields(candidate: Record<string, unknown>): void {
  for (const key of ["executionSetId", "artifactId", "correlationId", "actor", "eventType", "sourceRevision", "beforeState", "afterState"] as const) {
    if (!isNonEmptyString(candidate[key])) {
      throw new Error(`Event input ${key} must be a non-empty string.`);
    }
  }
  assertRecord(candidate.source, sourceKeys, "Event input source");
  for (const key of sourceKeys) {
    if (!isNonEmptyString((candidate.source as Record<string, unknown>)[key])) {
      throw new Error(`Event input source.${key} must be a non-empty string.`);
    }
  }
  if (!Array.isArray(candidate.evidenceRefs) || candidate.evidenceRefs.length === 0) {
    throw new Error("evidenceRefs must contain at least one reference.");
  }
  if (!candidate.evidenceRefs.every(isNonEmptyString)) {
    throw new Error("evidenceRefs must contain only non-empty references.");
  }
}

function pickEventInput(candidate: Record<string, unknown>): EventInput {
  return Object.fromEntries(inputKeys.map((key) => [key, candidate[key]])) as unknown as EventInput;
}

function createIdempotencyKey(input: EventInput): string {
  const stableIdentity = JSON.stringify({
    eventType: input.eventType,
    executionSetId: input.executionSetId,
    canonicalId: input.source.canonicalId,
    sourceRevision: input.sourceRevision,
    targetIdentity: input.source.targetIdentity,
    requestedOperation: input.source.requestedOperation,
    beforeState: input.beforeState,
    afterState: input.afterState,
  });
  return createHash("sha256").update(stableIdentity).digest("hex");
}

function assertRecord(value: unknown, keys: readonly string[], name: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`${name} must contain exactly the approved fields.`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

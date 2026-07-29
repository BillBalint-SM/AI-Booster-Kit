import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";

import { ValidationError } from "../errors.js";
import type { ValidatedRecord } from "./model.js";
import { canonicalSchemas, schemaNames, type SchemaName } from "./schema.js";

export type { ValidatedRecord } from "./model.js";
export type { SchemaName } from "./schema.js";

const validatorBySchemaName = createValidatorBySchemaName();

export function validateCanonicalRecord(
  record: unknown,
  schemaName: SchemaName,
): ValidatedRecord {
  const validator = validatorBySchemaName[schemaName];

  if (validator(record)) {
    return record as ValidatedRecord;
  }

  throw toValidationError(schemaName, validator.errors?.[0], record);
}

function createValidatorBySchemaName(): Record<SchemaName, ValidateFunction> {
  const ajv = new Ajv({ allErrors: true, strict: true });

  for (const schemaName of schemaNames) {
    ajv.addSchema(canonicalSchemas[schemaName]);
  }

  return Object.fromEntries(
    schemaNames.map((schemaName) => [
      schemaName,
      ajv.getSchema(schemaName) as ValidateFunction,
    ]),
  ) as Record<SchemaName, ValidateFunction>;
}

function toValidationError(
  schemaName: SchemaName,
  error: ErrorObject | undefined,
  record: unknown,
): ValidationError {
  if (error === undefined) {
    return new ValidationError(schemaName, "/", "a valid record", receivedType(record));
  }

  const path = errorPath(error);
  return new ValidationError(
    schemaName,
    path,
    expectedConstraint(error),
    receivedTypeAtPath(record, path),
  );
}

function errorPath(error: ErrorObject): string {
  if (error.keyword === "required") {
    return `${error.instancePath}/${escapeJsonPointer(String(error.params.missingProperty))}`;
  }

  if (error.keyword === "additionalProperties") {
    return `${error.instancePath}/${escapeJsonPointer(String(error.params.additionalProperty))}`;
  }

  return error.instancePath === "" ? "/" : error.instancePath;
}

function escapeJsonPointer(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function expectedConstraint(error: ErrorObject): string {
  switch (error.keyword) {
    case "additionalProperties":
      return "no additional properties";
    case "enum":
      return "an allowed value";
    case "minLength":
      return "a non-empty string";
    case "required":
      return "a required property";
    case "type":
      return `type '${String(error.params.type)}'`;
    default:
      return error.message ?? "the schema constraint";
  }
}

function receivedTypeAtPath(record: unknown, path: string): string {
  const value = valueAtJsonPointer(record, path);
  return receivedType(value);
}

function valueAtJsonPointer(record: unknown, path: string): unknown {
  if (path === "/") {
    return record;
  }

  const segments = path.slice(1).split("/").map(unescapeJsonPointer);
  let currentValue = record;

  for (const segment of segments) {
    if (currentValue === null || typeof currentValue !== "object") {
      return undefined;
    }

    if (Array.isArray(currentValue)) {
      const index = Number(segment);
      currentValue = Number.isInteger(index) ? currentValue[index] : undefined;
      continue;
    }

    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  return currentValue;
}

function unescapeJsonPointer(segment: string): string {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function receivedType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

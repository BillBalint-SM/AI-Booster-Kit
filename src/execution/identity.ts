import { createHash } from "node:crypto";

export function canonicalExecutionJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalExecutionJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalExecutionJson(record[key])}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("execution identity does not support undefined");
  return serialized;
}

export function executionDigest(value: unknown): string {
  return createHash("sha256").update(canonicalExecutionJson(value)).digest("hex");
}

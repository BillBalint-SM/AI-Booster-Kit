import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { AgentHost } from "../contract/markdown.js";
import type { GithubReadOnlyCapability } from "./types.js";

const capabilityKeys = ["version", "capabilityId", "allowedOperations", "prohibitedOperations", "requiredHosts", "requiredConfluenceGitReferenceKind"] as const;
const allowedOperations = ["repository.read", "branch.read", "commit.read", "path.read"] as const;
const prohibitedOperations = ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"] as const;
const requiredHosts = ["codex", "claude-code", "cursor"] as const;
const unsafeKey = /authorization|cookie|credential|password|secret|token|transcript|oauth/i;
const unsafeValue = /authorization|cookie|password|secret|token|transcript|oauth|https?:\/\//i;

export async function loadGithubReadOnlyCapability(path: string): Promise<GithubReadOnlyCapability> {
  const source = await readFile(path, "utf8");
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new Error("GitHub capability manifest rejected: invalid JSON.");
  }

  return parseGithubReadOnlyCapability(value);
}

export function parseGithubReadOnlyCapability(value: unknown): GithubReadOnlyCapability {
  const record = requireRecord(value);
  requireExactKeys(record, capabilityKeys);
  if (record.version !== 1 || record.capabilityId !== "github-readonly-evidence-v1" || record.requiredConfluenceGitReferenceKind !== "smart_link") {
    reject("manifest identity");
  }

  requireExactArray(record.allowedOperations, allowedOperations, "allowed operations");
  requireExactArray(record.prohibitedOperations, prohibitedOperations, "prohibited operations");
  requireExactArray(record.requiredHosts, requiredHosts, "required hosts");
  rejectUnsafeValues(record);

  return {
    version: 1,
    capabilityId: "github-readonly-evidence-v1",
    allowedOperations: [...allowedOperations],
    prohibitedOperations: [...prohibitedOperations],
    requiredHosts: [...requiredHosts],
    requiredConfluenceGitReferenceKind: "smart_link",
  };
}

export function githubScopeFingerprint(capability: GithubReadOnlyCapability): string {
  return createHash("sha256").update(canonicalJson(capability)).digest("hex");
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    reject("manifest structure");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  const keys = Reflect.ownKeys(record);
  if (keys.some((key) => typeof key !== "string" || !expected.includes(key)) || expected.some((key) => !Object.hasOwn(record, key))) {
    reject("unknown field");
  }
}

function requireExactArray<T extends string>(value: unknown, expected: readonly T[], category: string): void {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((item, index) => item !== expected[index])) {
    reject(category);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/.test(key)))) {
    reject(category);
  }
}

function rejectUnsafeValues(value: unknown): void {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && unsafeValue.test(value)) reject("unsafe value");
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || unsafeKey.test(key)) reject("unsafe field");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) reject("unsafe field");
    rejectUnsafeValues(descriptor.value);
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function reject(category: string): never {
  throw new Error(`GitHub capability manifest rejected: ${category}.`);
}

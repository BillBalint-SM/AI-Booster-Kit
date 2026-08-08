import policyDocument from "../../../contract/execution/binding-policy.json" with { type: "json" };

import { executionDigest } from "../identity.js";
import { ExecutionContractError } from "../types.js";
import type { ExecutionBindingPolicy, HostCapabilityId } from "./types.js";

export const executionBindingPolicy = policyDocument;

const policyCode = "EXECUTION_BINDING_POLICY_INVALID";
const rootKeys = [
  "policyVersion",
  "policyId",
  "gitCommandTimeoutMs",
  "maxGitOutputBytes",
  "maxAuditedPaths",
  "maxAuditedPathBytes",
  "maxTotalAuditedPathBytes",
  "maxHostEvidenceInputBytes",
  "maxReadinessInputBytes",
  "requiredHostCapabilities",
  "admittedHostProfiles",
] as const;
const requiredCapabilities = [
  "BIND_WORKSPACE",
  "INTERRUPT_AGENT",
  "OBSERVE_AGENT_IDENTITY",
  "SPAWN_AGENT",
  "WAIT_AGENT",
] as const satisfies readonly HostCapabilityId[];

export function parseExecutionBindingPolicy(value: unknown): ExecutionBindingPolicy {
  const record = plainRecord(value, rootKeys);
  if (record.policyVersion !== "1.0" || record.policyId !== "execution-binding-policy-v1") {
    invalidPolicy("execution binding policy identity is invalid");
  }
  const capabilities = exactStringSet(record.requiredHostCapabilities, requiredCapabilities, "required host capabilities") as HostCapabilityId[];
  const profiles = exactStringSet(record.admittedHostProfiles, ["CODEX_APP_NATIVE_V1"], "admitted host profiles");
  const body = {
    policyVersion: "1.0" as const,
    policyId: "execution-binding-policy-v1" as const,
    gitCommandTimeoutMs: positiveSafeInteger(record.gitCommandTimeoutMs, "Git command timeout"),
    maxGitOutputBytes: positiveSafeInteger(record.maxGitOutputBytes, "Git output limit"),
    maxAuditedPaths: positiveSafeInteger(record.maxAuditedPaths, "audited path count"),
    maxAuditedPathBytes: positiveSafeInteger(record.maxAuditedPathBytes, "audited path limit"),
    maxTotalAuditedPathBytes: positiveSafeInteger(record.maxTotalAuditedPathBytes, "aggregate audited path limit"),
    maxHostEvidenceInputBytes: positiveSafeInteger(record.maxHostEvidenceInputBytes, "host evidence input limit"),
    maxReadinessInputBytes: positiveSafeInteger(record.maxReadinessInputBytes, "readiness input limit"),
    requiredHostCapabilities: capabilities,
    admittedHostProfiles: profiles as ["CODEX_APP_NATIVE_V1"],
  };
  return { ...body, policyDigest: executionDigest(body) };
}

function exactStringSet(value: unknown, expected: readonly string[], label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidPolicy(`${label} must be a string array`);
  }
  const normalized = [...value].sort() as string[];
  const expectedSorted = [...expected].sort();
  if (
    normalized.length !== expectedSorted.length
    || new Set(normalized).size !== normalized.length
    || normalized.some((entry, index) => entry !== expectedSorted[index])
  ) {
    invalidPolicy(`${label} are invalid`);
  }
  return normalized;
}

function plainRecord(value: unknown, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    invalidPolicy("execution binding policy must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalidPolicy("execution binding policy fields are invalid");
  }
  return record;
}

function positiveSafeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) invalidPolicy(`${label} must be a positive safe integer`);
  return value as number;
}

function invalidPolicy(message: string): never {
  throw new ExecutionContractError(policyCode, message);
}

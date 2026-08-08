import policyDocument from "../../contract/execution/persistence-policy.json" with { type: "json" };

import { executionDigest } from "./identity.js";
import { ExecutionContractError } from "./types.js";

export type ExecutionRuntimeLane = "AUTHORITATIVE" | "CONFORMANCE_ONLY";

export interface ExecutionRuntimeObservation {
  nodeVersion: string;
  ltsName: string | false;
}

export interface ExecutionRuntimePolicy {
  policyId: string;
  policyDigest: string;
  authoritative: {
    lane: "AUTHORITATIVE";
    nodeMajor: number;
    minimumVersion: string;
    requiresLts: true;
  };
  conformanceOnly: readonly {
    lane: "CONFORMANCE_ONLY";
    nodeMajor: number;
    minimumVersion: string;
  }[];
}

export interface ExecutionStorageLimits {
  maxCommandInputBytes: number;
  maxResultEnvelopeBytes: number;
  maxArtifactBytes: number;
  maxTransactionPayloadBytes: number;
  maxRunArtifactBytes: number;
  maxLedgerBytes: number;
  maxEventsPerRun: number;
  maxWorkspaceBytes: number;
  maxBackupAggregateBytes: number;
  maxCanonicalTextBytes: number;
  maxCanonicalBlobBytes: number;
  maxPreparedSqlBytes: number;
}

export interface ExecutionStoragePolicy {
  policyId: string;
  policyDigest: string;
  limits: ExecutionStorageLimits;
}

export interface ExecutionPersistencePolicy {
  contractVersion: "1.0";
  runtimePolicy: ExecutionRuntimePolicy;
  storagePolicy: ExecutionStoragePolicy;
}

export type ExecutionRuntimeAdmission =
  | { accepted: true; lane: ExecutionRuntimeLane; policyId: string; policyDigest: string }
  | { accepted: false; code: "UNSUPPORTED_RUNTIME_VERSION"; mutation: "NONE" };

export const executionPersistencePolicy = policyDocument;

const policyCode = "EXECUTION_PERSISTENCE_POLICY_INVALID";
const limitKeys = [
  "maxCommandInputBytes",
  "maxResultEnvelopeBytes",
  "maxArtifactBytes",
  "maxTransactionPayloadBytes",
  "maxRunArtifactBytes",
  "maxLedgerBytes",
  "maxEventsPerRun",
  "maxWorkspaceBytes",
  "maxBackupAggregateBytes",
  "maxCanonicalTextBytes",
  "maxCanonicalBlobBytes",
  "maxPreparedSqlBytes",
] as const satisfies readonly (keyof ExecutionStorageLimits)[];

export function parseExecutionPersistencePolicy(value: unknown): ExecutionPersistencePolicy {
  const root = plainRecord(value, ["contractVersion", "runtimePolicy", "storagePolicy"]);
  if (root.contractVersion !== "1.0") invalidPolicy("execution persistence contract version is unsupported");

  const runtimeValue = plainRecord(root.runtimePolicy, ["policyId", "authoritative", "conformanceOnly"]);
  const authoritativeValue = plainRecord(runtimeValue.authoritative, ["lane", "nodeMajor", "minimumVersion", "requiresLts"]);
  if (
    !validPolicyId(runtimeValue.policyId)
    || authoritativeValue.lane !== "AUTHORITATIVE"
    || !Number.isSafeInteger(authoritativeValue.nodeMajor)
    || (authoritativeValue.nodeMajor as number) <= 0
    || typeof authoritativeValue.minimumVersion !== "string"
    || authoritativeValue.requiresLts !== true
  ) {
    invalidPolicy("authoritative execution runtime policy is invalid");
  }
  const authoritativeMinimum = parseNumericVersion(authoritativeValue.minimumVersion);
  if (authoritativeMinimum[0] !== authoritativeValue.nodeMajor) invalidPolicy("authoritative minimum version has the wrong major");

  if (!Array.isArray(runtimeValue.conformanceOnly) || runtimeValue.conformanceOnly.length === 0) {
    invalidPolicy("conformance-only runtime policy is invalid");
  }
  const conformanceOnly = runtimeValue.conformanceOnly.map((entry) => {
    const conformanceValue = plainRecord(entry, ["lane", "nodeMajor", "minimumVersion"]);
    if (
      conformanceValue.lane !== "CONFORMANCE_ONLY"
      || !Number.isSafeInteger(conformanceValue.nodeMajor)
      || (conformanceValue.nodeMajor as number) <= 0
      || typeof conformanceValue.minimumVersion !== "string"
    ) {
      invalidPolicy("conformance-only runtime policy is invalid");
    }
    const minimum = parseNumericVersion(conformanceValue.minimumVersion);
    if (minimum[0] !== conformanceValue.nodeMajor) invalidPolicy("conformance-only minimum version has the wrong major");
    return {
      lane: "CONFORMANCE_ONLY" as const,
      nodeMajor: conformanceValue.nodeMajor as number,
      minimumVersion: conformanceValue.minimumVersion,
    };
  });
  if (new Set(conformanceOnly.map((entry) => entry.nodeMajor)).size !== conformanceOnly.length) {
    invalidPolicy("conformance-only runtime majors must be unique");
  }

  const storageValue = plainRecord(root.storagePolicy, ["policyId", "limits"]);
  if (!validPolicyId(storageValue.policyId)) invalidPolicy("execution storage policy identifier is invalid");
  const limitsValue = plainRecord(storageValue.limits, limitKeys);
  const limits = Object.fromEntries(limitKeys.map((key) => [key, positiveSafeInteger(limitsValue[key], key)])) as unknown as ExecutionStorageLimits;

  const runtimeIdentity = {
    policyId: runtimeValue.policyId,
    authoritative: authoritativeValue,
    conformanceOnly,
  };
  const storageIdentity = { policyId: storageValue.policyId, limits };
  return {
    contractVersion: "1.0",
    runtimePolicy: {
      policyId: runtimeValue.policyId as string,
      policyDigest: executionDigest(runtimeIdentity),
      authoritative: {
        lane: "AUTHORITATIVE",
        nodeMajor: authoritativeValue.nodeMajor as number,
        minimumVersion: authoritativeValue.minimumVersion,
        requiresLts: true,
      },
      conformanceOnly,
    },
    storagePolicy: {
      policyId: storageValue.policyId as string,
      policyDigest: executionDigest(storageIdentity),
      limits,
    },
  };
}

export function admitExecutionRuntime(
  policy: ExecutionRuntimePolicy,
  observation: ExecutionRuntimeObservation,
): ExecutionRuntimeAdmission {
  let observed: readonly [number, number, number];
  try {
    observed = parseNumericVersion(observation.nodeVersion);
  } catch {
    return unsupportedRuntime();
  }

  const authoritativeMinimum = parseNumericVersion(policy.authoritative.minimumVersion);
  if (
    observed[0] === policy.authoritative.nodeMajor
    && compareVersions(observed, authoritativeMinimum) >= 0
    && (!policy.authoritative.requiresLts || observation.ltsName !== false)
  ) {
    return { accepted: true, lane: "AUTHORITATIVE", policyId: policy.policyId, policyDigest: policy.policyDigest };
  }

  for (const lane of policy.conformanceOnly) {
    const minimum = parseNumericVersion(lane.minimumVersion);
    if (observed[0] === lane.nodeMajor && compareVersions(observed, minimum) >= 0) {
      return { accepted: true, lane: "CONFORMANCE_ONLY", policyId: policy.policyId, policyDigest: policy.policyDigest };
    }
  }
  return unsupportedRuntime();
}

function parseNumericVersion(value: unknown): readonly [number, number, number] {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(value)) {
    invalidPolicy("execution runtime version must be an exact numeric version");
  }
  const parts = value.split(".").map(Number);
  const major = parts[0];
  const minor = parts[1];
  const patch = parts[2];
  if (major === undefined || minor === undefined || patch === undefined || !parts.every(Number.isSafeInteger)) {
    invalidPolicy("execution runtime version is outside the supported numeric range");
  }
  return [major, minor, patch];
}

function compareVersions(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function plainRecord(value: unknown, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    invalidPolicy("execution persistence policy value must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).sort();
  const allowedKeys = [...expectedKeys].sort();
  if (actualKeys.length !== allowedKeys.length || actualKeys.some((key, index) => key !== allowedKeys[index])) {
    invalidPolicy("execution persistence policy fields are invalid");
  }
  return record;
}

function positiveSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) invalidPolicy(`${field} must be a positive safe integer`);
  return value as number;
}

function validPolicyId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9.-]{2,63}$/u.test(value);
}

function unsupportedRuntime(): ExecutionRuntimeAdmission {
  return { accepted: false, code: "UNSUPPORTED_RUNTIME_VERSION", mutation: "NONE" };
}

function invalidPolicy(message: string): never {
  throw new ExecutionContractError(policyCode, message);
}

import { canonicalExecutionJson, executionDigest } from "../identity.js";
import { ExecutionContractError } from "../types.js";
import type {
  CreateExecutionHostReceiptRequest,
  ExecutionBindingPolicy,
  ExecutionHostRunBinding,
  HostAuthorityState,
  HostCapabilityEvidenceCode,
  HostCapabilityId,
  HostCapabilityObservation,
  HostCapabilityState,
  HostEvidenceReceipt,
  HostInstructionState,
} from "./types.js";

const invalidCode = "EXECUTION_HOST_RECEIPT_INVALID";
const capabilityKeys = ["capabilityId", "state", "authorityState", "instructionState", "evidenceCode"] as const;
const receiptKeys = ["receiptVersion", "receiptId", "hostProfileId", "hostSessionId", "controllerId", "runtimeReceiptId", "capabilities", "observedAt", "evidenceDigest"] as const;

export function createExecutionHostReceipt(
  request: CreateExecutionHostReceiptRequest,
  runBinding: ExecutionHostRunBinding,
  policy: ExecutionBindingPolicy,
): HostEvidenceReceipt {
  const requestRecord = plainRecord(request, ["hostProfileId", "hostSessionId", "capabilities", "observedAt"]);
  const bindingRecord = plainRecord(runBinding, ["controllerId", "runtimeReceiptId"]);
  const hostProfileId = profileId(requestRecord.hostProfileId);
  const hostSessionId = nullableDigest(requestRecord.hostSessionId, "host session identity");
  const controllerId = identifier(bindingRecord.controllerId, "controller identity");
  const runtimeReceiptId = digest(bindingRecord.runtimeReceiptId, "runtime receipt identity");
  const observedAt = canonicalInstant(requestRecord.observedAt);
  const capabilities = capabilitySet(requestRecord.capabilities, policy);
  const evidenceBody = {
    domain: "execution-host-evidence-v1",
    hostProfileId,
    hostSessionId,
    controllerId,
    runtimeReceiptId,
    capabilities,
    observedAt,
  };
  const body = {
    receiptVersion: "1.0" as const,
    hostProfileId,
    hostSessionId,
    controllerId,
    runtimeReceiptId,
    capabilities,
    observedAt,
    evidenceDigest: executionDigest(evidenceBody),
  };
  return { ...body, receiptId: executionDigest(body) };
}

export function parseExecutionHostReceipt(
  value: unknown,
  policy: ExecutionBindingPolicy,
): HostEvidenceReceipt {
  const record = plainRecord(value, receiptKeys);
  if (record.receiptVersion !== "1.0") invalid("host receipt version is unsupported");
  const expected = createExecutionHostReceipt({
    hostProfileId: profileId(record.hostProfileId),
    hostSessionId: nullableDigest(record.hostSessionId, "host session identity"),
    capabilities: capabilitySet(record.capabilities, policy),
    observedAt: canonicalInstant(record.observedAt),
  }, {
    controllerId: identifier(record.controllerId, "controller identity"),
    runtimeReceiptId: digest(record.runtimeReceiptId, "runtime receipt identity"),
  }, policy);
  if (
    digest(record.evidenceDigest, "host evidence identity") !== expected.evidenceDigest
    || digest(record.receiptId, "host receipt identity") !== expected.receiptId
    || canonicalExecutionJson(record) !== canonicalExecutionJson(expected)
  ) {
    invalid("host receipt identity is invalid");
  }
  return expected;
}

function capabilitySet(value: unknown, policy: ExecutionBindingPolicy): HostCapabilityObservation[] {
  if (!Array.isArray(value) || value.length !== policy.requiredHostCapabilities.length) {
    invalid("host capability set is invalid");
  }
  const capabilities = value.map((entry) => capability(entry, policy));
  capabilities.sort((left, right) => left.capabilityId < right.capabilityId ? -1 : left.capabilityId > right.capabilityId ? 1 : 0);
  if (
    new Set(capabilities.map((entry) => entry.capabilityId)).size !== capabilities.length
    || capabilities.some((entry, index) => entry.capabilityId !== policy.requiredHostCapabilities[index])
  ) {
    invalid("host capability set is invalid");
  }
  return capabilities;
}

function capability(value: unknown, policy: ExecutionBindingPolicy): HostCapabilityObservation {
  const record = plainRecord(value, capabilityKeys);
  if (typeof record.capabilityId !== "string" || !policy.requiredHostCapabilities.includes(record.capabilityId as HostCapabilityId)) {
    invalid("host capability identifier is invalid");
  }
  const state = enumValue(record.state, ["SUPPORTED", "UNSUPPORTED", "UNKNOWN"], "host capability state") as HostCapabilityState;
  const evidenceCode = enumValue(record.evidenceCode, ["NATIVE_CAPABILITY_OBSERVED", "NATIVE_CAPABILITY_UNSUPPORTED", "NATIVE_CAPABILITY_UNOBSERVABLE"], "host capability evidence") as HostCapabilityEvidenceCode;
  const expectedEvidence: Readonly<Record<HostCapabilityState, HostCapabilityEvidenceCode>> = {
    SUPPORTED: "NATIVE_CAPABILITY_OBSERVED",
    UNSUPPORTED: "NATIVE_CAPABILITY_UNSUPPORTED",
    UNKNOWN: "NATIVE_CAPABILITY_UNOBSERVABLE",
  };
  if (evidenceCode !== expectedEvidence[state]) invalid("host capability state and evidence disagree");
  return {
    capabilityId: record.capabilityId as HostCapabilityId,
    state,
    authorityState: enumValue(record.authorityState, ["PROVEN", "DENIED", "UNKNOWN"], "host capability authority") as HostAuthorityState,
    instructionState: enumValue(record.instructionState, ["OBSERVED", "UNKNOWN"], "host instruction state") as HostInstructionState,
    evidenceCode,
  };
}

function enumValue(value: unknown, allowed: readonly string[], label: string): string {
  if (typeof value !== "string" || !allowed.includes(value)) invalid(`${label} is invalid`);
  return value;
}

function profileId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Z][A-Z0-9_]{2,63}$/u.test(value)) invalid("host profile identity is invalid");
  return value;
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(value)) invalid(`${label} is invalid`);
  return value;
}

function nullableDigest(value: unknown, label: string): string | null {
  if (value === null) return null;
  return digest(value, label);
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) invalid(`${label} is invalid`);
  return value;
}

function canonicalInstant(value: unknown): string {
  if (typeof value !== "string") invalid("host observation time is invalid");
  const time = Date.parse(value as string);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) invalid("host observation time is invalid");
  return value as string;
}

function plainRecord(value: unknown, expectedKeys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    invalid("host receipt value must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalid("host receipt fields are invalid");
  }
  return record;
}

function invalid(message: string): never {
  throw new ExecutionContractError(invalidCode, message);
}

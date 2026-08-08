import { executionDigest } from "./identity.js";
import { admitExecutionRuntime } from "./runtime-policy.js";
import type {
  ExecutionRuntimeAdmission,
  ExecutionRuntimeLane,
  ExecutionRuntimePolicy,
} from "./runtime-policy.js";
import { ExecutionContractError } from "./types.js";

export interface ExecutionStorageDriverObservation {
  name: "better-sqlite3";
  version: "13.0.3";
  bindingSha256: string;
  sqliteVersion: string;
}

export interface ExecutionProcessRuntimeObservation {
  nodeVersion: string;
  ltsName: string | false;
  modules: string;
  napi: string;
  v8: string;
  uv: string;
  openssl: string;
  platform: NodeJS.Platform;
  arch: string;
}

export function currentExecutionProcessRuntimeObservation(): ExecutionProcessRuntimeObservation {
  return {
    nodeVersion: process.versions.node,
    ltsName: typeof process.release.lts === "string" ? process.release.lts : false,
    modules: process.versions.modules,
    napi: requiredProcessVersion("N-API", process.versions.napi),
    v8: process.versions.v8,
    uv: process.versions.uv,
    openssl: process.versions.openssl,
    platform: process.platform,
    arch: process.arch,
  };
}

function requiredProcessVersion(label: string, value: string | undefined): string {
  if (value === undefined) {
    throw new ExecutionContractError("HOST_PROFILE_UNSUPPORTED", `${label} runtime observation is unavailable`);
  }
  return value;
}

export interface CreateExecutionRuntimeReceiptRequest {
  admission: Extract<ExecutionRuntimeAdmission, { accepted: true }>;
  runtimePolicy: ExecutionRuntimePolicy;
  runtime: ExecutionProcessRuntimeObservation;
  driver: ExecutionStorageDriverObservation;
  kernelRevision: string;
  dependencyLockSha256: string;
  runtimePolicyId: string;
  runtimePolicySha256: string;
  storagePolicyId: string;
  storagePolicySha256: string;
  sessionId: string;
  hostSessionId: string;
  observedAt: string;
}

export interface ExecutionRuntimeReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  sessionId: string;
  lane: ExecutionRuntimeLane;
  node: { version: string; lts: string | false; modules: string; napi: string };
  libraries: { v8: string; uv: string; openssl: string; sqlite: string };
  platform: { os: NodeJS.Platform; arch: string };
  driver: { name: "better-sqlite3"; version: "13.0.3"; bindingSha256: string };
  kernelRevision: string;
  dependencyLockSha256: string;
  runtimePolicyId: string;
  runtimePolicySha256: string;
  storagePolicyId: string;
  storagePolicySha256: string;
  hostSessionId: string;
  observedAt: string;
}

const invalidCode = "EXECUTION_RUNTIME_RECEIPT_INVALID";

export function createExecutionRuntimeReceipt(
  request: CreateExecutionRuntimeReceiptRequest,
): ExecutionRuntimeReceipt {
  const observedAdmission = admitExecutionRuntime(request.runtimePolicy, {
    nodeVersion: request.runtime.nodeVersion,
    ltsName: request.runtime.ltsName,
  });
  if (
    !observedAdmission.accepted
    || observedAdmission.lane !== request.admission.lane
    || observedAdmission.policyId !== request.admission.policyId
    || observedAdmission.policyDigest !== request.admission.policyDigest
  ) {
    invalid("runtime observation does not match its admission");
  }
  if (
    request.runtimePolicyId !== request.admission.policyId
    || request.runtimePolicySha256 !== request.admission.policyDigest
  ) {
    invalid("runtime policy identity does not match admission");
  }
  if (request.driver.name !== "better-sqlite3" || request.driver.version !== "13.0.3") {
    invalid("storage driver identity is unsupported");
  }
  for (const digest of [
    request.driver.bindingSha256,
    request.dependencyLockSha256,
    request.runtimePolicySha256,
    request.storagePolicySha256,
  ]) {
    if (!isSha256(digest)) invalid("runtime receipt digest is invalid");
  }
  if (!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/u.test(request.kernelRevision)) invalid("Kernel revision is invalid");
  for (const identifier of [request.sessionId, request.hostSessionId, request.runtimePolicyId, request.storagePolicyId]) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(identifier)) invalid("runtime receipt identifier is invalid");
  }
  for (const version of [
    request.runtime.nodeVersion,
    request.runtime.modules,
    request.runtime.napi,
    request.runtime.v8,
    request.runtime.uv,
    request.runtime.openssl,
    request.driver.sqliteVersion,
  ]) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(version)) invalid("runtime receipt version observation is invalid");
  }
  if (!["win32", "linux", "darwin"].includes(request.runtime.platform) || !/^(x64|arm64)$/u.test(request.runtime.arch)) {
    invalid("runtime receipt platform observation is unsupported");
  }
  if (request.runtime.ltsName !== false && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(request.runtime.ltsName)) {
    invalid("runtime LTS observation is invalid");
  }
  if (!isCanonicalInstant(request.observedAt)) invalid("runtime receipt observation time is invalid");

  const body = {
    receiptVersion: "1.0" as const,
    sessionId: request.sessionId,
    lane: request.admission.lane,
    node: {
      version: request.runtime.nodeVersion,
      lts: request.runtime.ltsName,
      modules: request.runtime.modules,
      napi: request.runtime.napi,
    },
    libraries: {
      v8: request.runtime.v8,
      uv: request.runtime.uv,
      openssl: request.runtime.openssl,
      sqlite: request.driver.sqliteVersion,
    },
    platform: { os: request.runtime.platform, arch: request.runtime.arch },
    driver: {
      name: request.driver.name,
      version: request.driver.version,
      bindingSha256: request.driver.bindingSha256,
    },
    kernelRevision: request.kernelRevision,
    dependencyLockSha256: request.dependencyLockSha256,
    runtimePolicyId: request.runtimePolicyId,
    runtimePolicySha256: request.runtimePolicySha256,
    storagePolicyId: request.storagePolicyId,
    storagePolicySha256: request.storagePolicySha256,
    hostSessionId: request.hostSessionId,
    observedAt: request.observedAt,
  };
  return { ...body, receiptId: executionDigest(body) };
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

function isCanonicalInstant(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function invalid(message: string): never {
  throw new ExecutionContractError(invalidCode, message);
}

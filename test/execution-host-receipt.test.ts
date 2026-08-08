import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createExecutionHostReceipt,
  parseExecutionHostReceipt,
} from "../src/execution/binding/host-receipt.js";
import {
  executionBindingPolicy,
  parseExecutionBindingPolicy,
} from "../src/execution/binding/policy.js";
import type {
  CreateExecutionHostReceiptRequest,
  HostCapabilityId,
} from "../src/execution/binding/types.js";

const policy = parseExecutionBindingPolicy(executionBindingPolicy);

interface CapabilityFixture {
  capabilityId: HostCapabilityId;
  state: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";
  authorityState: "PROVEN" | "DENIED" | "UNKNOWN";
  instructionState: "OBSERVED" | "UNKNOWN";
  evidenceCode: "NATIVE_CAPABILITY_OBSERVED" | "NATIVE_CAPABILITY_UNSUPPORTED" | "NATIVE_CAPABILITY_UNOBSERVABLE";
}

interface HostRequestFixture {
  hostProfileId: string;
  hostSessionId: string | null;
  capabilities: CapabilityFixture[];
  observedAt: string;
}

test("host receipt deterministically normalizes the complete capability set", () => {
  const receipt = createExecutionHostReceipt(validRequest(), runBinding(), policy);
  const reordered = validRequest();
  reordered.capabilities.reverse();

  assert.equal(receipt.receiptVersion, "1.0");
  assert.match(receipt.receiptId, /^[a-f0-9]{64}$/u);
  assert.match(receipt.evidenceDigest, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    receipt.capabilities.map((entry: { capabilityId: string }) => entry.capabilityId),
    ["BIND_WORKSPACE", "INTERRUPT_AGENT", "OBSERVE_AGENT_IDENTITY", "SPAWN_AGENT", "WAIT_AGENT"],
  );
  assert.deepEqual(createExecutionHostReceipt(reordered, runBinding(), policy), receipt);
  assert.deepEqual(parseExecutionHostReceipt(structuredClone(receipt), policy), receipt);
});

test("host receipt represents unsupported profiles and unknown sessions without admitting them", () => {
  const request = validRequest();
  request.hostProfileId = "CLAUDE_CODE_NATIVE_V1";
  request.hostSessionId = null;
  request.capabilities = request.capabilities.map((entry) => ({
    ...entry,
    state: "UNSUPPORTED" as const,
    authorityState: "UNKNOWN" as const,
    instructionState: "UNKNOWN" as const,
    evidenceCode: "NATIVE_CAPABILITY_UNSUPPORTED" as const,
  }));

  const receipt = createExecutionHostReceipt(request, runBinding(), policy);

  assert.equal(receipt.hostProfileId, "CLAUDE_CODE_NATIVE_V1");
  assert.equal(receipt.hostSessionId, null);
  assert.equal(receipt.capabilities.every((entry: { state: string }) => entry.state === "UNSUPPORTED"), true);
  assert.deepEqual(parseExecutionHostReceipt(receipt, policy), receipt);
});

test("host receipt preserves authority and instruction uncertainty without upgrading capability state", () => {
  const request = validRequest();
  request.capabilities[0] = {
    ...request.capabilities[0]!,
    authorityState: "UNKNOWN",
    instructionState: "UNKNOWN",
  };

  const receipt = createExecutionHostReceipt(request, runBinding(), policy);

  assert.equal(receipt.capabilities[0]?.state, "SUPPORTED");
  assert.equal(receipt.capabilities[0]?.authorityState, "UNKNOWN");
  assert.equal(receipt.capabilities[0]?.instructionState, "UNKNOWN");
});

test("host receipt rejects missing, duplicate, foreign, and state-inconsistent capabilities", () => {
  const missing = validRequest();
  missing.capabilities.pop();
  const duplicate = validRequest();
  duplicate.capabilities[0] = { ...duplicate.capabilities[1]! };
  const foreign = validRequest() as unknown as { capabilities: Array<Record<string, unknown>> };
  foreign.capabilities[0] = { ...foreign.capabilities[0], capabilityId: "DELETE_REPOSITORY" };
  const inconsistent = validRequest();
  inconsistent.capabilities[0] = {
    ...inconsistent.capabilities[0]!,
    state: "UNKNOWN",
  };

  for (const request of [missing, duplicate, foreign, inconsistent]) {
    assert.throws(
      () => createExecutionHostReceipt(request as unknown as CreateExecutionHostReceiptRequest, runBinding(), policy),
      /EXECUTION_HOST_RECEIPT_INVALID/u,
    );
  }
});

test("host receipt parser rejects every identity and evidence tamper", () => {
  const receipt = createExecutionHostReceipt(validRequest(), runBinding(), policy);
  const changedCapability = {
    ...receipt,
    capabilities: receipt.capabilities.map((entry, index) => index === 0 ? { ...entry, authorityState: "DENIED" as const } : entry),
  };
  const tampered: unknown[] = [
    { ...receipt, controllerId: "other-controller" },
    { ...receipt, runtimeReceiptId: "b".repeat(64) },
    { ...receipt, hostSessionId: "c".repeat(64) },
    { ...receipt, evidenceDigest: "d".repeat(64) },
    { ...receipt, receiptId: "e".repeat(64) },
    changedCapability,
    { ...receipt, unexpected: true },
  ];

  for (const value of tampered) {
    assert.throws(() => parseExecutionHostReceipt(value, policy), /EXECUTION_HOST_RECEIPT_INVALID/u);
  }
});

test("host receipt rejects raw host, tool, path, and sensitive content without echoing it", () => {
  const rawValues = [
    "11111111-2222-4333-8444-555555555555",
    "tool output transcript",
    "C:\\Users\\person\\repo",
    "access_token: example",
  ];

  for (const rawValue of rawValues) {
    const request = validRequest() as ReturnType<typeof validRequest> & Record<string, unknown>;
    request.unexpected = rawValue;
    assert.throws(
      () => createExecutionHostReceipt(request as unknown as CreateExecutionHostReceiptRequest, runBinding(), policy),
      (error: unknown) => error instanceof Error
        && error.message.includes("EXECUTION_HOST_RECEIPT_INVALID")
        && !error.message.includes(rawValue),
    );
  }
});

function validRequest(): HostRequestFixture {
  return {
    hostProfileId: "CODEX_APP_NATIVE_V1",
    hostSessionId: "a3c84fa3b1ac6935d23090caa53a392f6c4d858fc28595a49c88001215ca2c24" as string | null,
    capabilities: ([
      "BIND_WORKSPACE",
      "INTERRUPT_AGENT",
      "OBSERVE_AGENT_IDENTITY",
      "SPAWN_AGENT",
      "WAIT_AGENT",
    ] satisfies readonly HostCapabilityId[]).map((capabilityId) => ({
      capabilityId,
      state: "SUPPORTED" as const,
      authorityState: "PROVEN" as const,
      instructionState: "OBSERVED" as const,
      evidenceCode: "NATIVE_CAPABILITY_OBSERVED" as const,
    })),
    observedAt: "2026-08-08T21:40:00.000Z",
  };
}

function runBinding() {
  return {
    controllerId: "controller-host-001",
    runtimeReceiptId: "a".repeat(64),
  };
}

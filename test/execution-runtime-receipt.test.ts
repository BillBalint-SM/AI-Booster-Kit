import assert from "node:assert/strict";
import { test } from "node:test";

import { createExecutionRuntimeReceipt } from "../src/execution/runtime-receipt.js";
import {
  admitExecutionRuntime,
  executionPersistencePolicy,
  parseExecutionPersistencePolicy,
} from "../src/execution/runtime-policy.js";

test("runtime receipt binds exact runtime, driver, policy, lock, and session evidence", () => {
  const request = validReceiptRequest();
  const receipt = createExecutionRuntimeReceipt(request);

  assert.equal(receipt.receiptVersion, "1.0");
  assert.match(receipt.receiptId, /^[a-f0-9]{64}$/u);
  assert.equal(receipt.lane, "CONFORMANCE_ONLY");
  assert.deepEqual(receipt.node, {
    version: "26.7.0",
    lts: false,
    modules: "147",
    napi: "10",
  });
  assert.deepEqual(receipt.libraries, {
    v8: "14.6.202.34",
    uv: "1.52.1",
    openssl: "3.5.7",
    sqlite: "3.53.4",
  });
  assert.deepEqual(receipt.driver, {
    name: "better-sqlite3",
    version: "13.0.3",
    bindingSha256: "a".repeat(64),
  });
  assert.equal(createExecutionRuntimeReceipt(validReceiptRequest()).receiptId, receipt.receiptId);
});

test("runtime receipt changes identity when one admitted observation changes", () => {
  const first = createExecutionRuntimeReceipt(validReceiptRequest());
  const changed = validReceiptRequest();
  changed.runtime.nodeVersion = "26.7.1";
  const second = createExecutionRuntimeReceipt(changed);

  assert.notEqual(second.receiptId, first.receiptId);
});

test("runtime receipt rejects mismatched admission and invalid evidence", () => {
  const mismatched = validReceiptRequest();
  mismatched.runtime.nodeVersion = "24.19.0";
  mismatched.runtime.ltsName = "Krypton";
  assert.throws(() => createExecutionRuntimeReceipt(mismatched), /EXECUTION_RUNTIME_RECEIPT_INVALID/u);

  const badBinding = validReceiptRequest();
  badBinding.driver.bindingSha256 = "not-a-digest";
  assert.throws(() => createExecutionRuntimeReceipt(badBinding), /EXECUTION_RUNTIME_RECEIPT_INVALID/u);
});

test("runtime receipt contains no raw executable, package, binding, home, or repository paths", () => {
  const serialized = JSON.stringify(createExecutionRuntimeReceipt(validReceiptRequest()));
  for (const forbidden of ["execPath", "packagePath", "bindingPath", "C:\\Users", "/home/", "AI Booster Kit"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

function validReceiptRequest() {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy);
  const admission = admitExecutionRuntime(policy.runtimePolicy, { nodeVersion: "26.7.0", ltsName: false });
  if (!admission.accepted) throw new Error("fixture runtime must be admitted");
  return {
    admission,
    runtimePolicy: policy.runtimePolicy,
    runtime: {
      nodeVersion: "26.7.0",
      ltsName: false as string | false,
      modules: "147",
      napi: "10",
      v8: "14.6.202.34",
      uv: "1.52.1",
      openssl: "3.5.7",
      platform: "win32" as const,
      arch: "x64",
    },
    driver: {
      name: "better-sqlite3" as const,
      version: "13.0.3" as const,
      bindingSha256: "a".repeat(64),
      sqliteVersion: "3.53.4",
    },
    kernelRevision: "b".repeat(40),
    dependencyLockSha256: "c".repeat(64),
    runtimePolicyId: policy.runtimePolicy.policyId,
    runtimePolicySha256: policy.runtimePolicy.policyDigest,
    storagePolicyId: policy.storagePolicy.policyId,
    storagePolicySha256: policy.storagePolicy.policyDigest,
    sessionId: "session-20260808-001",
    hostSessionId: "a3c84fa3b1ac6935d23090caa53a392f6c4d858fc28595a49c88001215ca2c24",
    observedAt: "2026-08-08T13:30:00.000Z",
  };
}

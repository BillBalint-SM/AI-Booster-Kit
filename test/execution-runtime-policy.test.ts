import assert from "node:assert/strict";
import { test } from "node:test";

import {
  admitExecutionRuntime,
  executionPersistencePolicy,
  parseExecutionPersistencePolicy,
} from "../src/execution/runtime-policy.js";

test("persistence policy parses the exact versioned contract and produces stable digests", () => {
  const parsed = parseExecutionPersistencePolicy(executionPersistencePolicy);

  assert.equal(parsed.contractVersion, "1.0");
  assert.equal(parsed.runtimePolicy.policyId, "execution-runtime-policy-1.0");
  assert.equal(parsed.runtimePolicy.authoritative.minimumVersion, "24.18.0");
  assert.equal(parsed.runtimePolicy.authoritative.nodeMajor, 24);
  assert.equal(parsed.runtimePolicy.authoritative.requiresLts, true);
  assert.deepEqual(parsed.runtimePolicy.conformanceOnly, [
    { lane: "CONFORMANCE_ONLY", minimumVersion: "26.7.0", nodeMajor: 26 },
  ]);
  assert.equal(parsed.storagePolicy.policyId, "execution-storage-policy-1.0");
  assert.match(parsed.runtimePolicy.policyDigest, /^[a-f0-9]{64}$/u);
  assert.match(parsed.storagePolicy.policyDigest, /^[a-f0-9]{64}$/u);
  assert.equal(parseExecutionPersistencePolicy(structuredClone(executionPersistencePolicy)).runtimePolicy.policyDigest, parsed.runtimePolicy.policyDigest);
});

test("persistence policy rejects unknown fields and changed content receives a changed digest", () => {
  const withUnknownField = {
    ...structuredClone(executionPersistencePolicy),
    unexpected: true,
  };
  assert.throws(
    () => parseExecutionPersistencePolicy(withUnknownField),
    /EXECUTION_PERSISTENCE_POLICY_INVALID/u,
  );

  const changed = structuredClone(executionPersistencePolicy);
  changed.runtimePolicy.authoritative.minimumVersion = "24.18.1";
  const original = parseExecutionPersistencePolicy(executionPersistencePolicy);
  const updated = parseExecutionPersistencePolicy(changed);
  assert.notEqual(updated.runtimePolicy.policyDigest, original.runtimePolicy.policyDigest);
  assert.equal(updated.storagePolicy.policyDigest, original.storagePolicy.policyDigest);
});

test("runtime admission distinguishes authoritative and conformance-only lanes", () => {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).runtimePolicy;

  assert.deepEqual(admitExecutionRuntime(policy, { nodeVersion: "24.18.0", ltsName: "Krypton" }), {
    accepted: true,
    lane: "AUTHORITATIVE",
    policyId: policy.policyId,
    policyDigest: policy.policyDigest,
  });
  assert.equal(admitExecutionRuntime(policy, { nodeVersion: "24.21.3", ltsName: "Krypton" }).accepted, true);
  assert.deepEqual(admitExecutionRuntime(policy, { nodeVersion: "26.7.0", ltsName: false }), {
    accepted: true,
    lane: "CONFORMANCE_ONLY",
    policyId: policy.policyId,
    policyDigest: policy.policyDigest,
  });
  const laterCurrent = admitExecutionRuntime(policy, { nodeVersion: "26.9.2", ltsName: "Future" });
  assert.equal(laterCurrent.accepted, true);
  if (laterCurrent.accepted) assert.equal(laterCurrent.lane, "CONFORMANCE_ONLY");
});

test("runtime admission rejects unsupported, malformed, prerelease, and non-LTS authoritative observations", () => {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).runtimePolicy;
  const rejected = [
    { nodeVersion: "22.22.3", ltsName: "Jod" },
    { nodeVersion: "23.11.1", ltsName: false },
    { nodeVersion: "24.17.9", ltsName: "Krypton" },
    { nodeVersion: "24.18.0", ltsName: false },
    { nodeVersion: "25.9.0", ltsName: false },
    { nodeVersion: "27.0.0", ltsName: false },
    { nodeVersion: "24.18.0-rc.1", ltsName: "Krypton" },
    { nodeVersion: "v24.18.0", ltsName: "Krypton" },
    { nodeVersion: "24.18", ltsName: "Krypton" },
    { nodeVersion: "not-a-version", ltsName: false },
  ] as const;

  for (const observation of rejected) {
    assert.deepEqual(admitExecutionRuntime(policy, observation), {
      accepted: false,
      code: "UNSUPPORTED_RUNTIME_VERSION",
      mutation: "NONE",
    });
  }
});

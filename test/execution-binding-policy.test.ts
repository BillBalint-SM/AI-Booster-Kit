import assert from "node:assert/strict";
import { test } from "node:test";

import {
  executionBindingPolicy,
  parseExecutionBindingPolicy,
} from "../src/execution/binding/policy.js";

test("binding policy parses the approved exact contract and produces one stable digest", () => {
  const parsed = parseExecutionBindingPolicy(executionBindingPolicy);

  assert.deepEqual(
    {
      version: parsed.policyVersion,
      id: parsed.policyId,
      gitTimeout: parsed.gitCommandTimeoutMs,
      gitOutput: parsed.maxGitOutputBytes,
      pathCount: parsed.maxAuditedPaths,
      pathBytes: parsed.maxAuditedPathBytes,
      aggregatePathBytes: parsed.maxTotalAuditedPathBytes,
      hostInput: parsed.maxHostEvidenceInputBytes,
      readinessInput: parsed.maxReadinessInputBytes,
      capabilities: parsed.requiredHostCapabilities,
      profiles: parsed.admittedHostProfiles,
    },
    {
      version: "1.0",
      id: "execution-binding-policy-v1",
      gitTimeout: 15000,
      gitOutput: 1048576,
      pathCount: 256,
      pathBytes: 1024,
      aggregatePathBytes: 65536,
      hostInput: 1048576,
      readinessInput: 1048576,
      capabilities: [
        "BIND_WORKSPACE",
        "INTERRUPT_AGENT",
        "OBSERVE_AGENT_IDENTITY",
        "SPAWN_AGENT",
        "WAIT_AGENT",
      ],
      profiles: ["CODEX_APP_NATIVE_V1"],
    },
  );
  assert.match(parsed.policyDigest, /^[a-f0-9]{64}$/u);
  assert.equal(
    parseExecutionBindingPolicy(structuredClone(executionBindingPolicy)).policyDigest,
    parsed.policyDigest,
  );
});

test("binding policy normalizes set ordering without changing its digest", () => {
  const reordered = structuredClone(executionBindingPolicy);
  reordered.requiredHostCapabilities.reverse();
  reordered.admittedHostProfiles.reverse();

  const original = parseExecutionBindingPolicy(executionBindingPolicy);
  const parsed = parseExecutionBindingPolicy(reordered);

  assert.deepEqual(parsed.requiredHostCapabilities, original.requiredHostCapabilities);
  assert.deepEqual(parsed.admittedHostProfiles, original.admittedHostProfiles);
  assert.equal(parsed.policyDigest, original.policyDigest);
});

test("binding policy rejects unknown, missing, duplicate, and invalid bounded values", () => {
  const invalidValues: unknown[] = [];
  const withUnknown = { ...structuredClone(executionBindingPolicy), unexpected: true };
  invalidValues.push(withUnknown);

  const missing = structuredClone(executionBindingPolicy) as Record<string, unknown>;
  delete missing.maxGitOutputBytes;
  invalidValues.push(missing);

  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "15000"]) {
    invalidValues.push({ ...structuredClone(executionBindingPolicy), gitCommandTimeoutMs: value });
  }

  invalidValues.push({
    ...structuredClone(executionBindingPolicy),
    requiredHostCapabilities: [
      ...executionBindingPolicy.requiredHostCapabilities,
      "SPAWN_AGENT",
    ],
  });
  invalidValues.push({
    ...structuredClone(executionBindingPolicy),
    admittedHostProfiles: ["CODEX_APP_NATIVE_V1", "CODEX_APP_NATIVE_V1"],
  });
  invalidValues.push({
    ...structuredClone(executionBindingPolicy),
    requiredHostCapabilities: executionBindingPolicy.requiredHostCapabilities.slice(1),
  });
  invalidValues.push({
    ...structuredClone(executionBindingPolicy),
    admittedHostProfiles: ["UNREVIEWED_HOST_V1"],
  });

  for (const value of invalidValues) {
    assert.throws(
      () => parseExecutionBindingPolicy(value),
      /EXECUTION_BINDING_POLICY_INVALID/u,
    );
  }
});

test("binding policy gives changed accepted content a different digest", () => {
  const changed = structuredClone(executionBindingPolicy);
  changed.maxAuditedPaths = 255;

  assert.notEqual(
    parseExecutionBindingPolicy(changed).policyDigest,
    parseExecutionBindingPolicy(executionBindingPolicy).policyDigest,
  );
});

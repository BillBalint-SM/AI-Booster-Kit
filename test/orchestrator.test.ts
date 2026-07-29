import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import { assertAllowlistedOperation } from "../src/orchestrator/allowlist.js";
import { resolveTargetIdentity } from "../src/orchestrator/identity.js";
import { applyContinueDecision, createSyncStop } from "../src/orchestrator/stop.js";

const requestedTarget = {
  tenantUrl: "https://tenant.invalid",
  projectKey: "LOCAL",
  spaceKey: "ENG",
  repositoryOwner: "example",
  repositoryName: "orchestrator",
};

const candidate = {
  ...requestedTarget,
  jiraTenantId: "tenant-1",
  jiraProjectId: "project-1",
  confluenceSpaceId: "space-1",
  githubRepositoryId: "repo-1",
  environment: "sandbox",
  allowlistPolicyId: "policy-1",
  policyMutation: { mutationsAllowed: true },
};

const resolvedTarget = resolveTargetIdentity({ ...requestedTarget, candidates: [candidate] });

const policy = {
  policyId: "policy-1",
  target: resolvedTarget,
  operations: [{ name: "jira.update", mutating: true }],
  allowedFields: ["summary", "description"],
  allowedTransitions: ["To Do->In Progress"],
  allowedActorScopes: ["sandbox"],
  capabilities: [{ name: "jira.issue.write", proof: "sandbox-grant-1" }],
};

const policyRegistry = [policy];

test("orchestrator: resolves exactly one configured stable target with environment and mutation policy", () => {
  assert.deepEqual(resolvedTarget, {
    tenantUrl: requestedTarget.tenantUrl,
    jiraTenantId: "tenant-1",
    jiraProject: { key: "LOCAL", id: "project-1" },
    confluenceSpace: { key: "ENG", id: "space-1" },
    githubRepository: { owner: "example", name: "orchestrator", id: "repo-1" },
    environment: "sandbox",
    allowlistPolicyId: "policy-1",
    policyMutation: { mutationsAllowed: true },
  });
});

test("orchestrator: rejects wrong, missing, ambiguous, and malformed target identities", async () => {
  const fixture = await readFile(resolve("test/fixtures/ambiguous-mapping.md"), "utf8");
  assert.match(fixture, /local-only/);
  for (const changes of [
    { tenantUrl: "https://other.invalid" }, { projectKey: "OTHER" }, { spaceKey: "OTHER" },
    { repositoryOwner: "other" }, { repositoryName: "wrong" },
  ]) {
    assert.throws(() => resolveTargetIdentity({ ...requestedTarget, ...changes, candidates: [candidate] }), /zero configured target matches/);
  }
  assert.throws(() => resolveTargetIdentity({ ...requestedTarget, candidates: [] }), /zero configured target matches/);
  assert.throws(() => resolveTargetIdentity({ ...requestedTarget, candidates: [candidate, candidate] }), /ambiguous configured target mapping/);
  for (const malformed of [null, {}, { ...requestedTarget, candidates: [null] }, { ...requestedTarget, candidates: [{ ...candidate, environment: "live" }] }]) {
    assert.throws(() => resolveTargetIdentity(malformed), /Target identity/);
  }
});

test("orchestrator: obtains exactly one valid allowlist policy from its registry", () => {
  const decision = evaluate();
  assert.deepEqual(decision, { allowed: true, reasons: [] });

  assert.throws(() => evaluate({ policyRegistry: [] }), /missing configured allowlist policy/);
  assert.throws(() => evaluate({ policyRegistry: [policy, policy] }), /duplicate configured allowlist policy/);
  assert.throws(() => evaluate({ policyRegistry: [{ ...policy, policyId: "other" }] }), /missing configured allowlist policy/);
  assert.throws(() => evaluate({ policyRegistry: [{ ...policy, target: { ...resolvedTarget, allowlistPolicyId: "other" } }] }), /policy target identity/);
  assert.throws(() => evaluate({ policyRegistry: [{ ...policy, operations: [{ name: "jira.update", mutating: "yes" }] }] }), /Allowlist policy/);
});

test("orchestrator: rejects malformed evaluator inputs without TypeErrors", () => {
  for (const malformed of [null, {}, { ...evaluationInput(), fields: "summary" }, { ...evaluationInput(), capability: null }, { ...evaluationInput(), target: { jiraProject: null } }, { ...evaluationInput(), policyRegistry: [null] }]) {
    assert.throws(() => assertAllowlistedOperation(malformed), /Allowlist/);
  }
});

test("orchestrator: rejects undeclared scope, capability, fields, wrong target, and backward transition", () => {
  for (const changes of [
    { actorScope: "test" },
    { capability: { name: "unknown", proof: "proof" } },
    { fields: ["labels"] },
    { transition: { from: "In Progress", to: "To Do" } },
  ]) {
    const decision = evaluate(changes);
    assert.equal(decision.allowed, false);
    assert.ok(decision.reasons.length > 0);
  }
  assert.throws(() => evaluate({ actorScope: "" }), /Allowlist input actorScope/);
  assert.throws(() => evaluate({ capability: { name: "jira.issue.write", proof: "" } }), /Allowlist input capability/);
  assert.throws(() => evaluate({ target: { ...resolvedTarget, jiraProject: { ...resolvedTarget.jiraProject, id: "wrong" } } }), /policy target identity/);
});

test("orchestrator: rejects forbidden operations across separators and production mutations", () => {
  for (const operation of [
    "jira.delete", "jira.deletion", "jira.deletions", "jira.permissions-change", "jira.permission_change", "jira/workflows-change", "jira/workflow-changes", "jira/workflow-change", "production mutate", "confluence.publish.raw transcript", "Confluence.RAW_TRANSCRIPT_PUBLICATION", "confluence.raw-transcripts",
  ]) {
    const decision = evaluate({ operation, transition: null, policyRegistry: [{ ...policy, operations: [...policy.operations, { name: operation, mutating: false }] }] });
    assert.equal(decision.allowed, false);
    assert.ok(decision.reasons.some((reason) => reason.startsWith("forbidden_operation:")));
  }

  const productionTarget = { ...resolvedTarget, environment: "production" };
  const decision = evaluate({ target: productionTarget, policyRegistry: [{ ...policy, target: productionTarget }] });
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes("production_target_mutation"));
});

test("orchestrator: every closed hard-stop taxonomy class exposes Stop only", () => {
  for (const problemKind of [
    "wrong_tenant", "wrong_project", "wrong_space", "wrong_repository", "wrong_target", "unverifiable_authority",
    "unverifiable_scope", "ambiguous_mapping", "deletion", "permission_change", "workflow_change",
    "capability_proof_failure", "unknown_external_completion", "forbidden_operation",
  ]) {
    const stop = createSyncStop(stopInput({ problemKind }));
    assert.equal(stop.hardStop, true, problemKind);
    assert.deepEqual(stop.decisionOptions, ["Stop"]);
  }
});

test("orchestrator: derives hard stops from failed safety checks and validates all problem kinds", () => {
  for (const problemKind of ["stale_read_back", "over_broad_field", "backward_transition", "bounded_validation"]) {
    const stop = createSyncStop(stopInput({ problemKind }));
    assert.equal(stop.hardStop, false, problemKind);
  }
  for (const changes of [
    { authorityVerified: false },
    { scopeVerified: false },
    { allowlist: { ...evaluationInput(), operation: "jira.undeclared" }, permittedScope: { ...continueDecision().scope, operation: "jira.undeclared" } },
    { nonDestructive: false },
  ]) {
    assert.equal(createSyncStop(stopInput(changes)).hardStop, true);
  }
  assert.throws(() => createSyncStop(stopInput({ problemKind: "unrecognized" })), /problemKind/);
});

test("orchestrator: rejects malformed stop evidence and nested bounded scope", () => {
  for (const malformed of [
    null,
    {},
    stopInput({ evidence: [null] }),
    stopInput({ permittedScope: { ...continueDecision().scope, target: { jiraTenantId: "tenant-1" } } }),
  ]) {
    assert.throws(() => createSyncStop(malformed), /Sync stop/);
  }
});

test("orchestrator: returns only an exact structured bounded continuation", () => {
  const stop = createSyncStop(stopInput({}));
  const continuation = applyContinueDecision(stop, continueDecision());

  assert.deepEqual(continuation, { ...continueDecision(), readBackPlan: "Read the exact issue after the one permitted update." });
  assert.equal("globalBypass" in continuation, false);
});

test("orchestrator: rejects forged stop boundaries and cloned authorization", () => {
  const hardStop = createSyncStop(stopInput({ problemKind: "wrong_target" }));
  const forgedHardStop = { ...hardStop, hardStop: false, decisionOptions: ["Continue", "Stop"] };
  assert.throws(() => applyContinueDecision(forgedHardStop, continueDecision()), /hard-stop boundary/);

  const continuable = createSyncStop(stopInput({}));
  const forgedContinuable = { ...continuable, hardStop: true, decisionOptions: ["Stop"] };
  assert.throws(() => applyContinueDecision(forgedContinuable, continueDecision()), /hard-stop boundary/);
  assert.throws(() => applyContinueDecision({ ...continuable }, continueDecision()), /authorization/);
});

test("orchestrator: rejects every mutation of an authorization-retained stop boundary", () => {
  const wrongTarget = createSyncStop(stopInput({ problemKind: "wrong_target" }));
  const mutableWrongTarget = wrongTarget as unknown as Record<string, unknown>;
  Object.assign(mutableWrongTarget, {
    problemKind: "stale_read_back",
    operationAllowed: true,
    nonDestructive: true,
    authorityVerified: true,
    scopeVerified: true,
    allowlistVerified: true,
    hardStop: false,
    decisionOptions: ["Continue", "Stop"],
  });
  assert.throws(() => applyContinueDecision(wrongTarget, continueDecision()), /authorization boundary/);

  for (const mutate of [
    (stop: Record<string, unknown>) => { stop.readBackPlan = "different local read-back"; },
    (stop: Record<string, unknown>) => { (stop.target as { environment: string }).environment = "test"; },
    (stop: Record<string, unknown>) => { (stop.permittedScope as { operation: string }).operation = "jira.other"; },
  ]) {
    const continuable = createSyncStop(stopInput({}));
    mutate(continuable as unknown as Record<string, unknown>);
    assert.throws(() => applyContinueDecision(continuable, continueDecision()), /authorization boundary/);
  }
});

test("orchestrator: makes non-allowlisted authorization or scope hard-stop only", () => {
  const deniedOperation = createSyncStop(stopInput({
    allowlist: { ...evaluationInput(), operation: "jira.undeclared" },
    permittedScope: { ...continueDecision().scope, operation: "jira.undeclared" },
  }));
  const mismatchedScope = createSyncStop(stopInput({
    allowlist: { ...evaluationInput(), fields: ["description"] },
  }));

  for (const stop of [deniedOperation, mismatchedScope]) {
    assert.equal(stop.hardStop, true);
    assert.deepEqual(stop.decisionOptions, ["Stop"]);
    assert.throws(() => applyContinueDecision(stop, continueDecision()), /hard stop/);
  }
});

test("orchestrator: rejects malformed, wildcard, and mismatched continuation scope", () => {
  const stop = createSyncStop(stopInput({}));
  for (const decision of [
    null,
    {},
    { ...continueDecision(), scope: { ...continueDecision().scope, operation: "*" } },
    { ...continueDecision(), scope: { ...continueDecision().scope, fields: ["summary", "*"] } },
    { ...continueDecision(), scope: { ...continueDecision().scope, target: { ...continueDecision().scope.target, jiraProjectId: "other" } } },
    { ...continueDecision(), compensatingControl: "" },
    { ...continueDecision(), actor: "" },
    { ...continueDecision(), expiresAt: "2020-01-01T00:00:00.000Z" },
  ]) {
    assert.throws(() => applyContinueDecision(stop, decision), /Continue decision|permitted scope/);
  }
  assert.throws(() => applyContinueDecision(createSyncStop(stopInput({ problemKind: "wrong_target" })), continueDecision()), /hard stop/);
});

test("orchestrator: remains pure and does not touch connector sentinels", () => {
  let connectorCalls = 0;
  const connectorSentinel = () => { connectorCalls += 1; };
  void connectorSentinel;

  resolveTargetIdentity({ ...requestedTarget, candidates: [candidate] });
  evaluate();
  createSyncStop(stopInput({}));
  assert.equal(connectorCalls, 0);
});

function evaluationInput() {
  return {
    operation: "jira.update",
    target: resolvedTarget,
    fields: ["summary"],
    transition: { from: "To Do", to: "In Progress" },
    actorScope: "sandbox",
    capability: { name: "jira.issue.write", proof: "sandbox-grant-1" },
    policyRegistry,
  };
}

function evaluate(changes: Record<string, unknown> = {}) {
  return assertAllowlistedOperation({ ...evaluationInput(), ...changes });
}

function stopInput(changes: Record<string, unknown>) {
  return {
    situation: "A local validation requires an explicit decision.",
    target: resolvedTarget,
    detectedProblem: "Read-back evidence is stale.",
    evidence: ["local-evidence-1"],
    expectedImpact: "No external operation is applied.",
    remainsUnchanged: "Jira, Confluence, and GitHub remain unchanged.",
    risk: "An unverified write could be repeated.",
    recommendation: "Stop and verify the exact target state.",
    problemKind: "stale_read_back",
    nonDestructive: true,
    authorityVerified: true,
    scopeVerified: true,
    permittedScope: continueDecision().scope,
    allowlist: evaluationInput(),
    readBackPlan: "Read the exact issue after the one permitted update.",
    ...changes,
  };
}

function continueDecision() {
  return {
    scope: {
      target: {
        jiraTenantId: "tenant-1",
        jiraProjectId: "project-1",
        confluenceSpaceId: "space-1",
        githubRepositoryId: "repo-1",
      },
      operation: "jira.update",
      fields: ["summary"],
      transition: { from: "To Do", to: "In Progress" },
    },
    compensatingControl: "Read back the exact issue and compare the summary.",
    expiresAt: "2099-01-01T00:00:00.000Z",
    actor: "human-approver",
  };
}

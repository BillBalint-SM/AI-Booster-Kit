import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import { loadProjectProfile } from "../src/lifecycle/profile.js";
import { runImplementationStartCheck } from "../src/lifecycle/start-check.js";
import { evaluateTransition } from "../src/lifecycle/transitions.js";

const profilePath = resolve("test/fixtures/project-profile.json");
const expectedBoardIdentity = { jiraProjectKey: "GDEAI", jiraBoardId: "42" };

test("lifecycle: loads the exact Board profile without runtime targets or credentials", async () => {
  const fixture = await readFile(profilePath, "utf8");
  const profile = loadProjectProfile(profilePath);

  assert.deepEqual(profile.statusNames, [
    "To Do",
    "In Progress",
    "Review",
    "Ready for Deploy",
    "Ready for Test",
    "Testing",
    "Done",
  ]);
  assert.equal(profile.jiraProjectKey, "GDEAI");
  assert.equal(profile.jiraBoardId, "42");
  assert.match(fixture, /"Start Progress"/);
  assert.doesNotMatch(fixture, /atlassian|confluence|repository|token|credential/i);
});

test("lifecycle: evaluates each canonical forward Board transition without applying it", () => {
  const profile = loadProjectProfile(profilePath);
  const transitions = [
    ["To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"]],
    ["In Progress", "Review", ["implementation-complete"]],
    ["Review", "Ready for Deploy", ["review-passed"]],
    ["Ready for Deploy", "Ready for Test", ["deployment-completed"]],
    ["Ready for Test", "Testing", ["testing-started"]],
    ["Testing", "Done", ["testing-passed"]],
  ] as const;

  for (const [fromStatus, toStatus, evidenceRefs] of transitions) {
    const decision = evaluateTransition({
      projectProfile: profile,
      expectedBoardIdentity,
      fromStatus,
      toStatus,
      attentionState: "none",
      evidenceRefs,
    });

    assert.equal(decision.passed, true);
    assert.equal(decision.targetStatus, toStatus);
    assert.deepEqual(decision.failures, []);
  }
});

test("lifecycle: review and testing failures return work to To Do with failure evidence", () => {
  const profile = loadProjectProfile(profilePath);

  for (const [fromStatus, evidenceRef] of [["Review", "review-failed"], ["Testing", "testing-failed"]] as const) {
    const decision = evaluateTransition({
      projectProfile: profile,
      expectedBoardIdentity,
      fromStatus,
      toStatus: "To Do",
      attentionState: "problem",
      evidenceRefs: [evidenceRef],
    });

    assert.equal(decision.passed, true);
    assert.equal(decision.targetStatus, "To Do");
  }
});

test("lifecycle: each orthogonal attention state preserves the current Board status", () => {
  const profile = loadProjectProfile(profilePath);

  for (const attentionState of ["dependency", "problem", "clarification", "sync_stop"] as const) {
    const decision = evaluateTransition({
      projectProfile: profile,
      expectedBoardIdentity,
      fromStatus: "In Progress",
      toStatus: "In Progress",
      attentionState,
      evidenceRefs: [`${attentionState}-evidence`],
    });

    assert.equal(decision.passed, true);
    assert.equal(decision.targetStatus, "In Progress");
  }
});

test("lifecycle: rejects a self-consistent profile with the wrong runtime Board identity", () => {
  const profile = loadProjectProfile(profilePath);
  const wrongProfile = {
    ...profile,
    jiraProjectKey: "OTHER",
    jiraBoardId: "99",
    targetIdentities: { jiraProjectKey: "OTHER", jiraBoardId: "99" },
  };
  const decision = evaluateTransition({ projectProfile: wrongProfile, expectedBoardIdentity, fromStatus: "To Do", toStatus: "In Progress", attentionState: "none", evidenceRefs: ["implementation-start-check-passed", "implementation-started"] });

  assert.equal(decision.passed, false);
  assert.ok(decision.failures.includes("runtime_board_identity"));
});

test("lifecycle: rejects backward transitions, missing evidence, and invalid attention states", () => {
  const profile = loadProjectProfile(profilePath);

  const backward = evaluateTransition({ projectProfile: profile, expectedBoardIdentity, fromStatus: "Ready for Test", toStatus: "Review", attentionState: "none", evidenceRefs: [] });
  const missingEvidence = evaluateTransition({ projectProfile: profile, expectedBoardIdentity, fromStatus: "In Progress", toStatus: "Review", attentionState: "none", evidenceRefs: [] });
  const invalidAttention = evaluateTransition({ projectProfile: profile, expectedBoardIdentity, fromStatus: "In Progress", toStatus: "In Progress", attentionState: "unrecognized" as never, evidenceRefs: ["attention-evidence"] });

  assert.ok(backward.failures.includes("forward_only_policy"));
  assert.ok(missingEvidence.failures.includes("required_evidence"));
  assert.ok(invalidAttention.failures.includes("attention_state"));
});

test("lifecycle: rejects unsupported status labels and incomplete or unsupported profile maps", () => {
  const profile = loadProjectProfile(profilePath);

  for (const status of ["Blocked", "Rejected", "Awaiting Clarification"] as const) {
    const invalidStatus = evaluateTransition({ projectProfile: profile, expectedBoardIdentity, fromStatus: "Review", toStatus: status, attentionState: "none", evidenceRefs: [] });
    assert.ok(invalidStatus.failures.includes("status_identity"));
  }
  assert.throws(() => loadProjectProfileFrom({ ...profile, allowedFields: [] }));
  assert.throws(() => loadProjectProfileFrom({ ...profile, planningStateMappings: {} }));
  assert.throws(() => loadProjectProfileFrom({ ...profile, transitionNames: { "To Do->In Progress": "Start Progress" } }));
  assert.throws(() => loadProjectProfileFrom({ ...profile, transitionNames: { ...profile.transitionNames, "Done->To Do": "Unsupported" } }));
});

test("lifecycle: verifies complete implementation-start evidence and rejects planning chat alone", () => {
  const validInput = {
    milestoneId: "GDEAI-100",
    epicId: "GDEAI-101",
    workItemIds: ["GDEAI-102", "GDEAI-103"],
    acceptanceCriteria: ["Lifecycle policy is locally verified."],
    dependencyIds: ["GDEAI-50"],
    repository: "example/agent-agnostic-sync-orchestrator",
    branchName: "feature/GDEAI-102-lifecycle",
    worktreePath: "C:/worktrees/agent-agnostic-sync-orchestrator",
    baseRevision: "a1b2c3d4",
    actor: "codex",
    roadmapRevision: "roadmap-2026-07-29",
    finalization: {
      state: "finalized" as const,
      acceptanceDecision: "accepted" as const,
      evidenceRefs: ["milestone-finalization-record"],
    },
    acceptedScope: {
      workItemIds: ["GDEAI-102", "GDEAI-103"],
      acceptanceCriteria: ["Lifecycle policy is locally verified."],
      evidenceRefs: ["accepted-scope-record"],
    },
    hierarchy: {
      epicParentMilestoneId: "GDEAI-100",
      workItemParentEpicIds: { "GDEAI-102": "GDEAI-101", "GDEAI-103": "GDEAI-101" },
    },
  };
  const passed = runImplementationStartCheck(validInput);
  const planningChatOnly = runImplementationStartCheck({
    ...validInput,
    milestoneId: "planning chat",
    epicId: "planning chat",
    workItemIds: [],
    acceptanceCriteria: [],
    repository: "planning chat",
    branchName: "planning chat",
    worktreePath: "",
    baseRevision: "",
    actor: "",
    roadmapRevision: "",
    finalization: { state: "draft" as never, acceptanceDecision: "pending" as never, evidenceRefs: ["planning chat"] },
    acceptedScope: { workItemIds: [], acceptanceCriteria: [], evidenceRefs: ["planning chat"] },
    hierarchy: { epicParentMilestoneId: "planning chat", workItemParentEpicIds: {} },
  });

  assert.equal(passed.passed, true);
  assert.deepEqual(passed.failures, []);
  assert.equal(planningChatOnly.passed, false);
  assert.ok(planningChatOnly.failures.includes("milestone_trace"));
  assert.ok(planningChatOnly.failures.includes("accepted_scope"));
  assert.ok(planningChatOnly.failures.includes("target_repository"));
  assert.ok(planningChatOnly.failures.includes("current_roadmap_context"));
});

test("lifecycle: rejects unaccepted scope, inconsistent parent links, and fully populated planning-chat evidence", () => {
  const validInput = implementationStartInput();
  const unacceptedScope = runImplementationStartCheck({
    ...validInput,
    acceptedScope: { ...validInput.acceptedScope, workItemIds: ["GDEAI-102"], evidenceRefs: [] },
  });
  const inconsistentTrace = runImplementationStartCheck({
    ...validInput,
    hierarchy: { ...validInput.hierarchy, epicParentMilestoneId: "GDEAI-999" },
  });
  const planningChatDerived = runImplementationStartCheck({
    ...validInput,
    finalization: { state: "finalized", acceptanceDecision: "accepted", evidenceRefs: ["planning chat transcript"] },
    acceptedScope: { ...validInput.acceptedScope, evidenceRefs: ["planning chat transcript"] },
  });

  assert.ok(unacceptedScope.failures.includes("accepted_scope"));
  assert.ok(inconsistentTrace.failures.includes("epic_parent_trace"));
  assert.ok(planningChatDerived.failures.includes("finalization_evidence"));
  assert.ok(planningChatDerived.failures.includes("accepted_scope_evidence"));
});

function implementationStartInput() {
  return {
    milestoneId: "GDEAI-100",
    epicId: "GDEAI-101",
    workItemIds: ["GDEAI-102", "GDEAI-103"],
    acceptanceCriteria: ["Lifecycle policy is locally verified."],
    dependencyIds: ["GDEAI-50"],
    repository: "example/agent-agnostic-sync-orchestrator",
    branchName: "feature/GDEAI-102-lifecycle",
    worktreePath: "C:/worktrees/agent-agnostic-sync-orchestrator",
    baseRevision: "a1b2c3d4",
    actor: "codex",
    roadmapRevision: "roadmap-2026-07-29",
    finalization: { state: "finalized" as const, acceptanceDecision: "accepted" as const, evidenceRefs: ["milestone-finalization-record"] },
    acceptedScope: { workItemIds: ["GDEAI-102", "GDEAI-103"], acceptanceCriteria: ["Lifecycle policy is locally verified."], evidenceRefs: ["accepted-scope-record"] },
    hierarchy: { epicParentMilestoneId: "GDEAI-100", workItemParentEpicIds: { "GDEAI-102": "GDEAI-101", "GDEAI-103": "GDEAI-101" } },
  };
}

function loadProjectProfileFrom(profile: unknown) {
  const path = resolve(".tmp-project-profile.json");
  writeFileSync(path, JSON.stringify(profile));
  try {
    return loadProjectProfile(path);
  } finally {
    rmSync(path);
  }
}

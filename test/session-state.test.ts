import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateSessionResume } from "../src/context/resume.js";
import { validateSessionState } from "../src/context/validation.js";
import type { EpicContext, MilestoneContext, ResumeRuntime, SessionState } from "../src/context/types.js";

const milestone: MilestoneContext = {
  contextVersion: "1.0", kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "rev-m3-1", owner: "product-owner", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", milestoneId: "milestone-m3",
  projectVision: "Make AI work resumable without retaining transcripts.", roadmap: "M3 compact session context.", scope: ["Context contracts"], nonGoals: ["Host execution"], decisions: ["Contexts are Markdown source artifacts."], forecast: ["One bounded M3 delivery."], evidenceRefs: ["decision:m3-approved"], unknowns: [], dependencies: ["contract:team-contract"], epicIds: ["epic-context-parser"],
};

const epic: EpicContext = {
  contextVersion: "1.0", kind: "EPIC", contextId: "epic-context-parser", sourceRevision: "rev-m3-1", owner: "engineering", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", epicId: "epic-context-parser", milestoneId: "milestone-m3",
  outcome: "Validate a portable context contract.", featureValue: "Human-readable resume context.", scope: ["Strict parser"], nonGoals: ["Automatic merge"], workItemIds: ["story-context-parser"], acceptanceCriteria: ["Malformed context stops before use."], decisions: ["Frontmatter is the structured contract."], evidenceRefs: ["test:context-markdown"], unknowns: [], dependencies: ["milestone:milestone-m3"],
};

const runtime: ResumeRuntime = {
  repository: "BillBalint-SM/AI-Booster-Kit",
  branch: "dev-m3-session-state",
  worktree: "C:/worktrees/dev-m3-session-state",
  baseRevision: "a3df0d995af84d16908f365cc43e20c6ccd5ce7d",
  currentSetupFingerprint: "setup-m3-1",
};

const developerSession: SessionState = {
  sessionVersion: "1.0",
  sessionId: "session-m3-developer",
  owner: "engineering",
  retention: "TEAM",
  readScope: "FULL_MILESTONE",
  executionScope: { kind: "EPIC", contextId: "epic-context-parser", workItemIds: ["story-context-parser"] },
  writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR",
  contextReferences: [
    { kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "rev-m3-1" },
    { kind: "EPIC", contextId: "epic-context-parser", sourceRevision: "rev-m3-1" },
  ],
  workItemIds: ["story-context-parser"],
  activationPackageId: "activation-m3-1",
  recipe: { recipeId: "bounded-implementation", recipeVersion: "0.1.0", variantId: "base" },
  setupFingerprint: "setup-m3-1",
  status: "PAUSED",
  decisions: ["Use strict Markdown context."],
  evidenceRefs: ["test:context-markdown"],
  unknowns: [],
  deviations: [],
  dependencies: ["contract:team-contract"],
  progress: ["Parser contract accepted."],
  nextAction: "Implement session resume validation.",
  execution: {
    repository: "BillBalint-SM/AI-Booster-Kit",
    branch: "dev-m3-session-state",
    worktree: "C:/worktrees/dev-m3-session-state",
    baseRevision: "a3df0d995af84d16908f365cc43e20c6ccd5ce7d",
  },
};

test("session state: resumes matching PO and developer state without replaying a transcript", () => {
  const poSession: SessionState = {
    ...developerSession,
    sessionId: "session-m3-po",
    owner: "product-owner",
    contextReferences: [{ kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "rev-m3-1" }],
    workItemIds: [],
    activationPackageId: null,
    recipe: null,
    setupFingerprint: null,
    execution: null,
    executionScope: { kind: "MILESTONE", contextId: "milestone-context-m3", workItemIds: [] },
    nextAction: "Review the linked Epic contexts.",
  };

  assert.deepEqual(validateSessionState(developerSession), developerSession);
  assert.deepEqual(evaluateSessionResume(poSession, [milestone], { ...runtime, repository: null, branch: null, worktree: null, baseRevision: null, currentSetupFingerprint: null }), {
    decision: "RESUME",
    sessionId: "session-m3-po",
    nextAction: "Review the linked Epic contexts.",
    evidenceRefs: ["test:context-markdown"],
  });
  assert.equal(evaluateSessionResume(developerSession, [milestone, epic], runtime).decision, "RESUME");
});

test("session state: stops stale or contradictory state and preserves unknown runtime evidence", () => {
  assert.equal(evaluateSessionResume({ ...developerSession, contextReferences: [{ ...developerSession.contextReferences[0]!, sourceRevision: "stale" }, developerSession.contextReferences[1]! ] }, [milestone, epic], runtime).decision, "STOPPED");
  assert.equal(evaluateSessionResume({ ...developerSession, setupFingerprint: "changed-setup" }, [milestone, epic], runtime).decision, "STOPPED");
  assert.equal(evaluateSessionResume(developerSession, [milestone, epic], { ...runtime, branch: "feature" }).decision, "STOPPED");
  assert.equal(evaluateSessionResume(developerSession, [milestone, epic], { ...runtime, currentSetupFingerprint: null }).decision, "UNKNOWN");
  assert.equal(evaluateSessionResume({ ...developerSession, dependencies: ["UNKNOWN: external dependency"] }, [milestone, epic], runtime).decision, "UNKNOWN");
});

test("session state: rejects transcript-shaped, incomplete, and cross-Epic input before resume", () => {
  assert.throws(() => validateSessionState({ ...developerSession, transcript: "do not retain" }), /Context rejected/);
  assert.throws(() => validateSessionState({ ...developerSession, nextAction: "" }), /Context rejected/);
  assert.throws(() => validateSessionState({ ...developerSession, contextReferences: [developerSession.contextReferences[0]!] }), /Context rejected/);
});

test("session scope: exposes full Milestone read while constraining execution to one Epic", () => {
  const scopedSession: SessionState = {
    ...developerSession,
    readScope: "FULL_MILESTONE",
    executionScope: { kind: "EPIC", contextId: epic.contextId, workItemIds: ["story-context-parser"] },
    writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR",
  };

  assert.deepEqual(validateSessionState(scopedSession), scopedSession);
  assert.throws(() => validateSessionState({ ...scopedSession, executionScope: { ...scopedSession.executionScope, contextId: "epic-other" } }), /Context rejected/);
  assert.throws(() => validateSessionState({ ...scopedSession, executionScope: { ...scopedSession.executionScope, workItemIds: ["foreign-work-item"] } }), /Context rejected/);
  assert.throws(() => validateSessionState({ ...scopedSession, readScope: "EPIC_ONLY" }), /Context rejected/);
  assert.equal(evaluateSessionResume(scopedSession, [milestone, { ...epic, workItemIds: ["different-story"] }], runtime).decision, "STOPPED");
});

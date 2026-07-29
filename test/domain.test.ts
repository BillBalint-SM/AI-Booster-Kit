import assert from "node:assert/strict";
import { test } from "node:test";

import { ValidationError } from "../src/errors.js";
import { validateCanonicalRecord } from "../src/domain/validate.js";
import type { ExecutionSet, Epic, Milestone } from "../src/domain/model.js";

const milestone: Milestone = {
  canonicalId: "milestone-1",
  summary: "Release one",
  description: {
    artifactId: "artifact-1",
    milestoneId: "milestone-1",
    vision: "Ship a safe release.",
    scope: ["domain model"],
    nonGoals: [],
    requirements: ["Validate canonical records."],
    implementationPlan: ["Implement schemas."],
    testPlan: ["Run domain tests."],
    acceptanceCriteria: ["Records validate."],
    reviewPoints: ["Schema boundaries"],
    decisions: ["Use JSON Schema."],
    evidenceRefs: [],
    unknowns: [],
    dependencies: [],
    projectContext: "Local development",
    currentState: "Planned",
  },
  parentCanonicalId: null,
  boardStatus: "To Do",
};

const epic: Epic = {
  canonicalId: "epic-1",
  summary: "Domain validation",
  parentMilestoneId: "milestone-1",
  boardStatus: "In Progress",
};

const executionSet: ExecutionSet = {
  executionSetId: "execution-set-1",
  epicId: "epic-1",
  workItemIds: ["story-1", "task-1"],
  owner: "engineering",
  agentHost: "codex",
  jiraProjectKey: "LOCAL",
  jiraBoardId: "board-1",
  branchName: "codex/domain-model",
  worktreePath: "C:/worktrees/domain-model",
  baseRevision: "abc123",
  affectedPaths: ["src/domain"],
  dependencyIds: [],
  acceptanceBoundary: ["Domain validation"],
  targetEnvironment: "local",
  pullRequestUrls: [],
};

test("domain: valid milestone, epic, and execution set records pass validation", () => {
  assert.deepEqual(validateCanonicalRecord(milestone, "milestone"), milestone);
  assert.deepEqual(validateCanonicalRecord(epic, "epic"), epic);
  assert.deepEqual(
    validateCanonicalRecord(executionSet, "executionSet"),
    executionSet,
  );
});

test("domain: an Epic with two Milestone parents reports the extra parent path", () => {
  const invalidEpic = {
    ...epic,
    parentMilestoneIds: ["milestone-1", "milestone-2"],
  };

  assert.throws(
    () => validateCanonicalRecord(invalidEpic, "epic"),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message.includes("schema 'epic'") &&
      error.message.includes("/parentMilestoneIds") &&
      error.message.includes("no additional properties"),
  );
});

test("domain: a Story without an Epic parent reports the parent path", () => {
  const storyWithoutParent = {
    canonicalId: "story-1",
    type: "story",
    summary: "Implement validation",
    boardStatus: "To Do",
    acceptanceCriteria: ["Validation is actionable."],
  };

  assert.throws(
    () => validateCanonicalRecord(storyWithoutParent, "workItem"),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message.includes("schema 'workItem'") &&
      error.message.includes("/parentEpicId") &&
      error.message.includes("required property"),
  );
});

test("domain: an Execution Set spanning two Epics reports the undeclared relationship", () => {
  const invalidExecutionSet = {
    ...executionSet,
    epicIds: ["epic-1", "epic-2"],
  };

  assert.throws(
    () => validateCanonicalRecord(invalidExecutionSet, "executionSet"),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message.includes("schema 'executionSet'") &&
      error.message.includes("/epicIds") &&
      error.message.includes("no additional properties"),
  );
});

test("domain: invalid statuses and connector payload properties fail without exposing values", () => {
  const invalidStatus = { ...epic, boardStatus: "Blocked" };
  const undeclaredPayload = { ...executionSet, apiToken: "secret-value" };

  assert.throws(
    () => validateCanonicalRecord(invalidStatus, "epic"),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message.includes("/boardStatus") &&
      error.message.includes("allowed value") &&
      !error.message.includes("Blocked"),
  );
  assert.throws(
    () => validateCanonicalRecord(undeclaredPayload, "executionSet"),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message.includes("/apiToken") &&
      !error.message.includes("secret-value"),
  );
});

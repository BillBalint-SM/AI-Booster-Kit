import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { resolve } from "node:path";

import { finalizeMilestone } from "../src/planning/finalize.js";
import { assertHierarchyTraceability } from "../src/planning/traceability.js";
import type {
  CanonicalWorkArtifact,
  ChildWorkItem,
  Epic,
  ExecutionSet,
  Milestone,
} from "../src/domain/model.js";

const artifact: CanonicalWorkArtifact = {
  artifactId: "artifact-1",
  milestoneId: "milestone-1",
  vision: "Deliver deterministic local planning.",
  scope: ["Finalization intents"],
  nonGoals: ["External connector calls"],
  requirements: ["Retain stable canonical identifiers."],
  implementationPlan: ["Validate before projecting."],
  testPlan: ["Run planning tests."],
  acceptanceCriteria: ["All projections are deterministic."],
  reviewPoints: ["Hierarchy traceability"],
  decisions: ["Finalization is pure."],
  evidenceRefs: [],
  unknowns: ["Connector target identity"],
  dependencies: ["contract:team-contract"],
  projectContext: "Local test fixture",
  currentState: "Finalized",
};

const milestone: Milestone = {
  canonicalId: "milestone-1",
  summary: "Planning finalization",
  description: artifact,
  parentCanonicalId: null,
  boardStatus: "To Do",
};

const epics: Epic[] = [
  { canonicalId: "epic-1", summary: "Projection", parentMilestoneId: "milestone-1", boardStatus: "To Do" },
  { canonicalId: "epic-2", summary: "Traceability", parentMilestoneId: "milestone-1", boardStatus: "To Do" },
];

const workItems: ChildWorkItem[] = [
  { canonicalId: "story-1", type: "story", summary: "Render Milestone", parentEpicId: "epic-1", boardStatus: "To Do", acceptanceCriteria: ["Artifact is rendered."] },
  { canonicalId: "task-1", type: "task", summary: "Render roadmap", parentEpicId: "epic-1", boardStatus: "To Do", acceptanceCriteria: ["Roadmap is concise."] },
  { canonicalId: "bug-1", type: "bug", summary: "Reject invalid parents", parentEpicId: "epic-2", boardStatus: "To Do", acceptanceCriteria: ["Invalid parents fail."] },
];

function finalizationInput(): Parameters<typeof finalizeMilestone>[0] {
  return {
    milestone,
    canonicalWorkArtifact: artifact,
    epics,
    workItems,
    acceptanceDecision: "accepted",
    sourceContractRevision: "revision-4",
  };
}

function executionSet(): ExecutionSet {
  return {
    executionSetId: "execution-set-1", epicId: "epic-1", workItemIds: ["story-1", "task-1"], owner: "engineering", agentHost: "codex", jiraProjectKey: "LOCAL", jiraBoardId: "board-1", branchName: "codex/planning", worktreePath: "C:/worktrees/planning", baseRevision: "abc123", affectedPaths: ["src/planning"], dependencyIds: ["contract:team-contract"], acceptanceBoundary: ["Planning"], targetEnvironment: "local", pullRequestUrls: [],
  };
}

test("planning: valid finalization returns deterministic projection intents with stable hierarchy IDs", async () => {
  const fixture = await readFile(resolve("test/fixtures/valid-milestone.md"), "utf8");
  const first = finalizeMilestone(finalizationInput());
  const second = finalizeMilestone(finalizationInput());

  assert.match(fixture, /State: Finalized/);
  assert.deepEqual(first, second);
  assert.equal(first.milestone.canonicalId, "milestone-1");
  assert.deepEqual(first.epics.map((epic) => epic.canonicalId), ["epic-1", "epic-2"]);
  assert.deepEqual(first.workItems.map((workItem) => workItem.canonicalId), ["story-1", "task-1", "bug-1"]);
  assert.match(first.events[0]?.description ?? "", /Non-goals/);
  assert.match(first.confluenceProjection.content, /Unknowns/);
  assert.equal(first.events.length, 6);
});

test("planning: finalization rejects missing vision, acceptance criteria, draft artifacts, and missing acceptance", async () => {
  const fixture = await readFile(resolve("test/fixtures/invalid-milestone.md"), "utf8");
  assert.match(fixture, /State: Draft/);

  for (const input of [
    { ...finalizationInput(), canonicalWorkArtifact: { ...artifact, vision: "" } },
    { ...finalizationInput(), canonicalWorkArtifact: { ...artifact, acceptanceCriteria: [] } },
    { ...finalizationInput(), canonicalWorkArtifact: { ...artifact, currentState: "Draft" } },
    { ...finalizationInput(), acceptanceDecision: undefined },
  ]) {
    assert.throws(() => finalizeMilestone(input as Parameters<typeof finalizeMilestone>[0]));
  }
});

test("planning: finalization replaces a differing Milestone Description with the canonical artifact", () => {
  const staleDescription: CanonicalWorkArtifact = {
    ...artifact,
    artifactId: "stale-artifact",
    vision: "Stale vision.",
  };
  const input = {
    ...finalizationInput(),
    milestone: { ...milestone, description: staleDescription },
  };

  const result = finalizeMilestone(input);

  assert.strictEqual(result.milestone.description, input.canonicalWorkArtifact);
  assert.equal(result.milestone.description.vision, artifact.vision);
  assert.notEqual(result.milestone.description.vision, staleDescription.vision);
});

test("planning: finalization rejects an unnamed dependency in the projected canonical artifact", () => {
  const input = {
    ...finalizationInput(),
    canonicalWorkArtifact: { ...artifact, dependencies: ["depends on"] },
  };

  assert.throws(() => finalizeMilestone(input), /dependency must name a link target/);
});

test("planning: hierarchy traceability rejects invalid parents and cross-Epic Execution Sets before projection", () => {
  assert.throws(() => assertHierarchyTraceability({ milestone, epics: [{ ...epics[0]!, parentMilestoneId: "other-milestone" }], workItems, executionSets: [] }));
  assert.throws(() => assertHierarchyTraceability({ milestone, epics, workItems: [{ ...workItems[0]!, parentEpicId: "" }], executionSets: [] }));
  assert.throws(() => assertHierarchyTraceability({ milestone, epics, workItems, executionSets: [{ ...executionSet(), workItemIds: ["story-1", "bug-1"] }] }));
});

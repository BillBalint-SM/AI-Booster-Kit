import assert from "node:assert/strict";
import { test } from "node:test";

import { validateEpicContext, validateMilestoneContext } from "../src/context/validation.js";
import type { EpicContext, MilestoneContext } from "../src/context/types.js";

const milestone: MilestoneContext = {
  contextVersion: "1.0",
  kind: "MILESTONE",
  contextId: "milestone-context-m3",
  sourceRevision: "rev-m3-1",
  owner: "product-owner",
  retention: "TEAM",
  state: "ACCEPTED",
  milestoneId: "milestone-m3",
  projectVision: "Make AI work resumable without retaining transcripts.",
  roadmap: "M3 compact session context.",
  scope: ["Context contracts"],
  nonGoals: ["Host execution"],
  decisions: ["Contexts are Markdown source artifacts."],
  forecast: ["One bounded M3 delivery."],
  evidenceRefs: ["decision:m3-approved"],
  unknowns: ["Remote runtime evidence"],
  dependencies: ["contract:team-contract"],
  epicIds: ["epic-context-parser", "epic-session-state"],
};

const epics: readonly EpicContext[] = [
  {
    contextVersion: "1.0",
    kind: "EPIC",
    contextId: "epic-context-parser",
    sourceRevision: "rev-m3-1",
    owner: "engineering",
    retention: "TEAM",
    state: "ACCEPTED",
    epicId: "epic-context-parser",
    milestoneId: "milestone-m3",
    outcome: "Validate a portable context contract.",
    featureValue: "Human-readable resume context.",
    scope: ["Strict parser"],
    nonGoals: ["Automatic merge"],
    workItemIds: ["story-context-parser", "task-context-tests", "bug-context-validation"],
    acceptanceCriteria: ["Malformed context stops before use."],
    decisions: ["Frontmatter is the structured contract."],
    evidenceRefs: ["test:context-markdown"],
    unknowns: ["None"],
    dependencies: ["milestone:milestone-m3"],
  },
  {
    contextVersion: "1.0",
    kind: "EPIC",
    contextId: "epic-session-state",
    sourceRevision: "rev-m3-1",
    owner: "engineering",
    retention: "TEAM",
    state: "ACCEPTED",
    epicId: "epic-session-state",
    milestoneId: "milestone-m3",
    outcome: "Resume compact operational state.",
    featureValue: "Safe, bounded continuation.",
    scope: ["Resume validation"],
    nonGoals: ["Transcript replay"],
    workItemIds: ["story-session-state"],
    acceptanceCriteria: ["Mismatched context stops resume."],
    decisions: ["Resume is pure."],
    evidenceRefs: ["test:session-state"],
    unknowns: ["None"],
    dependencies: ["milestone:milestone-m3"],
  },
];

test("context validation: accepts one linked Milestone and its independently scoped Epics", () => {
  assert.doesNotThrow(() => validateMilestoneContext(milestone, epics));
  assert.doesNotThrow(() => validateEpicContext(epics[0]!, milestone, epics[0]!.workItemIds));
});

test("context validation: rejects broken parent, duplicate Epic, unknown link, and foreign work item", () => {
  assert.throws(() => validateEpicContext({ ...epics[0]!, milestoneId: "other-milestone" }, milestone, epics[0]!.workItemIds), /Context rejected/);
  assert.throws(() => validateMilestoneContext(milestone, [epics[0]!, { ...epics[0]! }]), /Context rejected/);
  assert.throws(() => validateMilestoneContext({ ...milestone, epicIds: ["missing-epic"] }, epics), /Context rejected/);
  assert.throws(() => validateEpicContext({ ...epics[0]!, workItemIds: ["story-context-parser", "foreign-task"] }, milestone, epics[0]!.workItemIds), /Context rejected/);
});

test("context validation: rejects a stale or malformed Milestone envelope before linking Epics", () => {
  assert.throws(() => validateMilestoneContext({ ...milestone, state: "STALE" }, epics), /Context rejected/);
  assert.throws(() => validateMilestoneContext({ ...milestone, sourceRevision: "" }, epics), /Context rejected/);
  assert.throws(() => validateMilestoneContext({ ...milestone, retention: "SHARED" } as unknown as MilestoneContext, epics), /Context rejected/);
});

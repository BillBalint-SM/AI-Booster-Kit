import assert from "node:assert/strict";
import { test } from "node:test";

import { parseWorkContext, serializeWorkContext } from "../src/context/markdown.js";
import type { EpicContext, MilestoneContext } from "../src/context/types.js";

const milestone: MilestoneContext = {
  contextVersion: "1.0",
  kind: "MILESTONE",
  contextId: "milestone-context-m3",
  sourceRevision: "rev-m3-1",
  owner: "product-owner",
  retention: "TEAM",
  state: "ACCEPTED",
  readScope: "FULL_MILESTONE",
  writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR",
  milestoneId: "milestone-m3",
  canonicalArtifactId: "artifact-m3",
  projectVision: "Make AI work resumable without retaining transcripts.",
  roadmap: "M3 compact session context.",
  scope: ["Context contracts", "Local resume validation"],
  nonGoals: ["Host execution"],
  decisions: ["Contexts are Markdown source artifacts."],
  forecast: ["One bounded M3 delivery."],
  evidenceRefs: ["decision:m3-approved"],
  unknowns: ["Remote runtime evidence"],
  dependencies: ["contract:team-contract"],
  epicIds: ["epic-context-parser", "epic-session-state"],
};

const epic: EpicContext = {
  contextVersion: "1.0",
  kind: "EPIC",
  contextId: "epic-context-parser",
  sourceRevision: "rev-m3-1",
  owner: "engineering",
  retention: "TEAM",
  state: "ACCEPTED",
  readScope: "FULL_MILESTONE",
  writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR",
  epicId: "epic-context-parser",
  milestoneId: "milestone-m3",
  outcome: "Validate a portable context contract.",
  featureValue: "A human-readable context that can safely resume work.",
  scope: ["Strict parser"],
  nonGoals: ["Automatic context merge"],
  workItemIds: ["story-context-parser", "task-context-tests", "bug-context-validation"],
  acceptanceCriteria: ["Malformed context stops before use."],
  decisions: ["Frontmatter is the structured contract."],
  evidenceRefs: ["test:context-markdown"],
  unknowns: ["None"],
  dependencies: ["milestone:milestone-m3"],
};

test("context markdown: parses deterministic Milestone and Epic source artifacts", () => {
  const parsedMilestone = parseWorkContext(serializeWorkContext(milestone), "fixtures/milestone-context.md");
  const parsedEpic = parseWorkContext(serializeWorkContext(epic), "fixtures/epic-context.md");

  assert.deepEqual(parsedMilestone, milestone);
  assert.deepEqual(parsedEpic, epic);
  assert.equal(parsedMilestone.contextId, "milestone-context-m3");
  assert.equal(parsedEpic.sourceRevision, "rev-m3-1");
  assert.equal(serializeWorkContext(milestone).endsWith("\n"), true);
});

test("context markdown: rejects malformed, broadened, and executable context artifacts", () => {
  const source = serializeWorkContext(milestone);

  for (const invalidSource of [
    source.replace("owner: product-owner\n", ""),
    source.replace("retention: TEAM", "retention: SHARED"),
    source.replace("state: ACCEPTED", "state: Blocked"),
    source.replace("epicIds:\n", "unsafe: true\nepicIds:\n"),
    source.replace("owner: product-owner\n", "owner: product-owner\nowner: duplicate\n"),
    source.replace("kind: MILESTONE", "kind: MILESTONE: broken"),
    source.replace("## Scope\n\n", "## Scope\n\nRun: npm publish\n\n"),
    source.replace("## Forecast", "## Missing Forecast"),
  ]) {
    assert.throws(() => parseWorkContext(invalidSource, "fixtures/invalid-context.md"), /Context rejected/);
  }
});

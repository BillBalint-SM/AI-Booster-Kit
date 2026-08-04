import assert from "node:assert/strict";
import { test } from "node:test";

import { validateTeamDeliveryFanIn } from "../src/context/team-delivery.js";
import type { HandoffPacket, ParallelizationContract } from "../src/context/team-delivery.js";
import type { EpicContext, MilestoneContext } from "../src/context/types.js";

const milestone: MilestoneContext = {
  contextVersion: "1.0", kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "m3-revision-1", owner: "product-owner", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", milestoneId: "milestone-m3", canonicalArtifactId: "artifact-m3",
  projectVision: "Portable resumable work.", roadmap: "M3", scope: ["team delivery"], nonGoals: ["host execution"], decisions: ["fan-in is human-owned"], forecast: ["two Epic lanes"], evidenceRefs: ["decision:m3"], unknowns: [], dependencies: ["contract:team-contract"], epicIds: ["epic-a", "epic-b"],
};

const epics: readonly EpicContext[] = [
  {
    contextVersion: "1.0", kind: "EPIC", contextId: "epic-a", sourceRevision: "m3-revision-1", owner: "engineering", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", epicId: "epic-a", milestoneId: "milestone-m3", outcome: "Deliver Epic A.", featureValue: "A bounded lane.", scope: ["A"], nonGoals: ["cross-Epic changes"], workItemIds: ["story-a"], acceptanceCriteria: ["A is verified"], decisions: ["A remains isolated"], evidenceRefs: ["test:a"], unknowns: [], dependencies: ["milestone:milestone-m3"],
  },
  {
    contextVersion: "1.0", kind: "EPIC", contextId: "epic-b", sourceRevision: "m3-revision-1", owner: "engineering", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", epicId: "epic-b", milestoneId: "milestone-m3", outcome: "Deliver Epic B.", featureValue: "Another bounded lane.", scope: ["B"], nonGoals: ["cross-Epic changes"], workItemIds: ["story-b"], acceptanceCriteria: ["B is verified"], decisions: ["B remains isolated"], evidenceRefs: ["test:b"], unknowns: [], dependencies: ["milestone:milestone-m3"],
  },
];

const contract: ParallelizationContract = {
  milestoneId: "milestone-m3", sourceRevision: "m3-revision-1", integrationOwner: "integration-owner", reviewOwner: "review-owner", integrationDoD: ["Both handoffs verified"], rollbackPlan: ["Restore the pre-fan-in revision"], epicIds: ["epic-a", "epic-b"],
};

const packet = (epicId: string, owner: string, workItemId: string): HandoffPacket => ({
  epicId, sourceRevision: "m3-revision-1", owner, status: "READY_FOR_FAN_IN", deliveredOutput: [`delivered:${workItemId}`], acceptanceResults: [`accepted:${workItemId}`], evidenceRefs: [`evidence:${workItemId}`], unknowns: [], conflicts: [], nextAction: `review:${epicId}`,
});

test("team delivery: validates two independent Epic handoffs for fan-in", () => {
  assert.doesNotThrow(() => validateTeamDeliveryFanIn(contract, [packet("epic-a", "developer-a", "story-a"), packet("epic-b", "developer-b", "story-b")], milestone, epics));
});

test("team delivery: rejects incomplete, duplicate, foreign, and revision-mismatched fan-in", () => {
  assert.throws(() => validateTeamDeliveryFanIn(contract, [packet("epic-a", "developer-a", "story-a")], milestone, epics), /Context rejected/);
  assert.throws(() => validateTeamDeliveryFanIn(contract, [packet("epic-a", "developer-a", "story-a"), packet("epic-a", "developer-a", "story-a")], milestone, epics), /Context rejected/);
  assert.throws(() => validateTeamDeliveryFanIn(contract, [packet("epic-a", "developer-a", "story-a"), packet("foreign", "developer-b", "story-b")], milestone, epics), /Context rejected/);
  assert.throws(() => validateTeamDeliveryFanIn(contract, [packet("epic-a", "developer-a", "story-a"), { ...packet("epic-b", "developer-b", "story-b"), sourceRevision: "stale" }], milestone, epics), /Context rejected/);
});

test("team delivery: stops blocked, unknown, conflicting, and rollback-incomplete handoffs", () => {
  assert.throws(() => validateTeamDeliveryFanIn(contract, [{ ...packet("epic-a", "developer-a", "story-a"), status: "BLOCKED" }, packet("epic-b", "developer-b", "story-b")], milestone, epics), /Context rejected/);
  assert.throws(() => validateTeamDeliveryFanIn(contract, [{ ...packet("epic-a", "developer-a", "story-a"), unknowns: ["open question"] }, packet("epic-b", "developer-b", "story-b")], milestone, epics), /Context rejected/);
  assert.throws(() => validateTeamDeliveryFanIn(contract, [{ ...packet("epic-a", "developer-a", "story-a"), conflicts: ["shared file conflict"] }, packet("epic-b", "developer-b", "story-b")], milestone, epics), /Context rejected/);
  assert.throws(() => validateTeamDeliveryFanIn({ ...contract, rollbackPlan: [] }, [packet("epic-a", "developer-a", "story-a"), packet("epic-b", "developer-b", "story-b")], milestone, epics), /Context rejected/);
});

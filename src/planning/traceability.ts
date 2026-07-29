import type {
  ChildWorkItem,
  Epic,
  ExecutionSet,
  Milestone,
} from "../domain/model.js";
import { validateCanonicalRecord } from "../domain/validate.js";

export interface HierarchyInput {
  milestone: Milestone;
  epics: Epic[];
  workItems: ChildWorkItem[];
  executionSets: ExecutionSet[];
}

export interface TraceabilityResult {
  milestoneCanonicalId: string;
  epicCanonicalIds: string[];
  workItemCanonicalIds: string[];
  executionSetIds: string[];
}

export function assertHierarchyTraceability(
  input: HierarchyInput,
): TraceabilityResult {
  validateCanonicalRecord(input.milestone, "milestone");
  for (const epic of input.epics) {
    validateCanonicalRecord(epic, "epic");
  }
  for (const workItem of input.workItems) {
    validateCanonicalRecord(workItem, "workItem");
  }
  for (const executionSet of input.executionSets) {
    validateCanonicalRecord(executionSet, "executionSet");
  }
  assertNonEmpty(input.milestone.canonicalId, "Milestone canonicalId");
  assertUniqueIds(
    [
      input.milestone.canonicalId,
      ...input.epics.map((epic) => epic.canonicalId),
      ...input.workItems.map((workItem) => workItem.canonicalId),
    ],
    "canonical work item",
  );

  const epicIds = new Set<string>();
  for (const epic of input.epics) {
    assertNonEmpty(epic.parentMilestoneId, `Epic '${epic.canonicalId}' parent`);
    if (epic.parentMilestoneId !== input.milestone.canonicalId) {
      throw new Error(
        `Epic '${epic.canonicalId}' must have exactly one Milestone parent '${input.milestone.canonicalId}'.`,
      );
    }
    assertAllowedBoardStatus(epic.boardStatus, `Epic '${epic.canonicalId}'`);
    epicIds.add(epic.canonicalId);
  }

  const workItemById = new Map<string, ChildWorkItem>();
  for (const workItem of input.workItems) {
    assertNonEmpty(workItem.parentEpicId, `Work item '${workItem.canonicalId}' parent`);
    if (!epicIds.has(workItem.parentEpicId)) {
      throw new Error(
        `Work item '${workItem.canonicalId}' must have exactly one Epic parent in this Milestone.`,
      );
    }
    if (workItem.acceptanceCriteria.length === 0) {
      throw new Error(
        `Work item '${workItem.canonicalId}' must define acceptance criteria.`,
      );
    }
    assertAllowedBoardStatus(workItem.boardStatus, `Work item '${workItem.canonicalId}'`);
    workItemById.set(workItem.canonicalId, workItem);
  }

  for (const dependency of input.milestone.description.dependencies) {
    assertDependencyTarget(dependency, `Milestone '${input.milestone.canonicalId}'`);
  }

  for (const executionSet of input.executionSets) {
    if (!epicIds.has(executionSet.epicId)) {
      throw new Error(
        `Execution Set '${executionSet.executionSetId}' must reference an Epic in this Milestone.`,
      );
    }
    assertUniqueIds(executionSet.workItemIds, `Execution Set '${executionSet.executionSetId}' work item`);
    for (const dependency of executionSet.dependencyIds) {
      assertDependencyTarget(dependency, `Execution Set '${executionSet.executionSetId}'`);
    }

    for (const workItemId of executionSet.workItemIds) {
      const workItem = workItemById.get(workItemId);
      if (workItem === undefined) {
        throw new Error(
          `Execution Set '${executionSet.executionSetId}' references unknown work item '${workItemId}'.`,
        );
      }
      if (workItem.parentEpicId !== executionSet.epicId) {
        throw new Error(
          `Execution Set '${executionSet.executionSetId}' must reference work from only Epic '${executionSet.epicId}'.`,
        );
      }
    }
  }

  return {
    milestoneCanonicalId: input.milestone.canonicalId,
    epicCanonicalIds: input.epics.map((epic) => epic.canonicalId),
    workItemCanonicalIds: input.workItems.map((workItem) => workItem.canonicalId),
    executionSetIds: input.executionSets.map((executionSet) => executionSet.executionSetId),
  };
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Each ${label} ID must be unique.`);
  }
}

function assertDependencyTarget(value: string, owner: string): void {
  if (value.trim() === "" || /(?:^|\s)(?:depends on|dependency)\s*:?\s*$/i.test(value)) {
    throw new Error(`${owner} dependency must name a link target.`);
  }
}

function assertAllowedBoardStatus(status: string, owner: string): void {
  if (status === "Blocked") {
    throw new Error(`${owner} must represent dependencies with links, not Blocked status.`);
  }
}

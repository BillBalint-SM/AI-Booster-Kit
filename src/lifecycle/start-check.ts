export interface StartCheckInput {
  milestoneId: string;
  epicId: string;
  workItemIds: string[];
  acceptanceCriteria: string[];
  dependencyIds: string[];
  repository: string;
  branchName: string;
  worktreePath: string;
  baseRevision: string;
  actor: string;
  roadmapRevision: string;
  finalization: FinalizationEvidence;
  acceptedScope: AcceptedScopeEvidence;
  hierarchy: HierarchyTrace;
}

export interface FinalizationEvidence {
  state: "finalized" | "draft";
  acceptanceDecision: "accepted" | "pending" | "rejected";
  evidenceRefs: string[];
}

export interface AcceptedScopeEvidence {
  workItemIds: string[];
  acceptanceCriteria: string[];
  evidenceRefs: string[];
}

export interface HierarchyTrace {
  epicParentMilestoneId: string;
  workItemParentEpicIds: Record<string, string>;
}

export interface StartCheck {
  name: string;
  passed: boolean;
}

export interface StartCheckResult {
  passed: boolean;
  checks: StartCheck[];
  failures: string[];
}

export function runImplementationStartCheck(input: StartCheckInput): StartCheckResult {
  const checks = [
    check("milestone_trace", isIdentifier(input.milestoneId)),
    check("finalization_decision", input.finalization.state === "finalized" && input.finalization.acceptanceDecision === "accepted"),
    check("finalization_evidence", hasVerifiedEvidence(input.finalization.evidenceRefs)),
    check("epic_parent_trace", isIdentifier(input.epicId) && input.hierarchy.epicParentMilestoneId === input.milestoneId),
    check("child_parent_trace", hasChildTrace(input)),
    check("accepted_scope", hasAcceptedScope(input)),
    check("accepted_scope_evidence", hasVerifiedEvidence(input.acceptedScope.evidenceRefs)),
    check("dependency_links", input.dependencyIds.every(isIdentifier)),
    check("target_repository", isRepository(input.repository)),
    check("branch_worktree", isNonEmpty(input.branchName) && isNonEmpty(input.worktreePath)),
    check("base_revision", isNonEmpty(input.baseRevision)),
    check("actor", isNonEmpty(input.actor)),
    check("current_roadmap_context", isNonEmpty(input.roadmapRevision)),
  ];
  const failures = checks.filter((entry) => !entry.passed).map((entry) => entry.name);

  return { passed: failures.length === 0, checks, failures };
}

function hasChildTrace(input: StartCheckInput): boolean {
  const parentIds = input.hierarchy.workItemParentEpicIds;
  return (
    input.workItemIds.length > 0 &&
    input.workItemIds.every((workItemId) => isIdentifier(workItemId) && parentIds[workItemId] === input.epicId) &&
    Object.keys(parentIds).length === input.workItemIds.length
  );
}

function hasAcceptedScope(input: StartCheckInput): boolean {
  return (
    sameValues(input.acceptedScope.workItemIds, input.workItemIds) &&
    sameValues(input.acceptedScope.acceptanceCriteria, input.acceptanceCriteria) &&
    input.acceptanceCriteria.length > 0 &&
    input.acceptanceCriteria.every(isNonEmpty)
  );
}

function hasVerifiedEvidence(evidenceRefs: string[]): boolean {
  return evidenceRefs.length > 0 && evidenceRefs.every((reference) => isNonEmpty(reference) && !/planning\s+chat/i.test(reference));
}

function check(name: string, passed: boolean): StartCheck {
  return { name, passed };
}

function isIdentifier(value: string): boolean {
  return isNonEmpty(value) && !/planning\s+chat/i.test(value);
}

function isRepository(value: string): boolean {
  return /^[^/\s]+\/[^/\s]+$/.test(value);
}

function isNonEmpty(value: string): boolean {
  return value.trim() !== "";
}

function sameValues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

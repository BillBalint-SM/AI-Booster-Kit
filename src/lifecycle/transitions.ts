import type { AttentionState, BoardStatus } from "../domain/model.js";
import type { ProjectProfile } from "./profile.js";

const lifecycle: readonly BoardStatus[] = [
  "To Do",
  "In Progress",
  "Review",
  "Ready for Deploy",
  "Ready for Test",
  "Testing",
  "Done",
];

const requiredEvidenceByTransition: Record<string, string[]> = {
  "To Do->In Progress": ["implementation-start-check-passed", "implementation-started"],
  "In Progress->Review": ["implementation-complete"],
  "Review->Ready for Deploy": ["review-passed"],
  "Ready for Deploy->Ready for Test": ["deployment-completed"],
  "Ready for Test->Testing": ["testing-started"],
  "Testing->Done": ["testing-passed"],
  "Review->To Do": ["review-failed"],
  "Testing->To Do": ["testing-failed"],
};

export interface TransitionInput {
  projectProfile: ProjectProfile;
  expectedBoardIdentity: RuntimeBoardIdentity;
  fromStatus: BoardStatus | string;
  toStatus: BoardStatus | string;
  attentionState: AttentionState;
  evidenceRefs: readonly string[];
}

export interface RuntimeBoardIdentity {
  jiraProjectKey: string;
  jiraBoardId: string;
}

export interface TransitionCheck {
  name: string;
  passed: boolean;
}

export interface TransitionDecision {
  passed: boolean;
  targetStatus: BoardStatus | null;
  requiredEvidenceRefs: string[];
  checks: TransitionCheck[];
  failures: string[];
}

export function evaluateTransition(input: TransitionInput): TransitionDecision {
  const failures: string[] = [];
  const checks: TransitionCheck[] = [];
  const profileMatches = isCanonicalProfile(input.projectProfile);
  recordCheck(checks, failures, "project_profile_identity", profileMatches);
  const runtimeIdentityMatches =
    input.projectProfile.jiraProjectKey === input.expectedBoardIdentity.jiraProjectKey &&
    input.projectProfile.jiraBoardId === input.expectedBoardIdentity.jiraBoardId;
  recordCheck(checks, failures, "runtime_board_identity", runtimeIdentityMatches);

  const statusesKnown = lifecycle.includes(input.fromStatus as BoardStatus) && lifecycle.includes(input.toStatus as BoardStatus);
  recordCheck(checks, failures, "status_identity", statusesKnown);
  recordCheck(checks, failures, "attention_state", isAttentionState(input.attentionState));

  const transitionKey = `${input.fromStatus}->${input.toStatus}`;
  const sameStatusAttentionUpdate = input.fromStatus === input.toStatus && input.attentionState !== "none";
  const allowedFailureReturn = transitionKey === "Review->To Do" || transitionKey === "Testing->To Do";
  const forwardTransition = isSingleForwardStep(input.fromStatus, input.toStatus);
  const allowedDirection = sameStatusAttentionUpdate || allowedFailureReturn || forwardTransition;
  recordCheck(checks, failures, "forward_only_policy", allowedDirection);

  const requiredEvidenceRefs = sameStatusAttentionUpdate
    ? ["attention-evidence"]
    : requiredEvidenceByTransition[transitionKey] ?? [];
  const hasRequiredEvidence = requiredEvidenceRefs.every((reference) =>
    sameStatusAttentionUpdate
      ? input.evidenceRefs.some((evidence) => evidence.trim() !== "")
      : input.evidenceRefs.includes(reference),
  );
  recordCheck(checks, failures, "required_evidence", hasRequiredEvidence);

  const configuredTransition = sameStatusAttentionUpdate || input.projectProfile.transitionNames[transitionKey] !== undefined;
  recordCheck(checks, failures, "transition_lookup", configuredTransition);

  const passed = checks.every((check) => check.passed);
  return {
    passed,
    targetStatus: passed ? input.toStatus as BoardStatus : null,
    requiredEvidenceRefs,
    checks,
    failures,
  };
}

function isCanonicalProfile(profile: ProjectProfile): boolean {
  return (
    profile.jiraProjectKey.trim() !== "" &&
    profile.jiraBoardId.trim() !== "" &&
    profile.targetIdentities.jiraProjectKey === profile.jiraProjectKey &&
    profile.targetIdentities.jiraBoardId === profile.jiraBoardId &&
    profile.statusNames.length === lifecycle.length &&
    profile.statusNames.every((status, index) => status === lifecycle[index])
  );
}

function isSingleForwardStep(fromStatus: string, toStatus: string): boolean {
  const fromIndex = lifecycle.indexOf(fromStatus as BoardStatus);
  const toIndex = lifecycle.indexOf(toStatus as BoardStatus);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}

function isAttentionState(value: unknown): value is AttentionState {
  return value === "none" || value === "dependency" || value === "problem" || value === "clarification" || value === "sync_stop";
}

function recordCheck(checks: TransitionCheck[], failures: string[], name: string, passed: boolean): void {
  checks.push({ name, passed });
  if (!passed) {
    failures.push(name);
  }
}

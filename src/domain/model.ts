export type WorkItemType = "milestone" | "epic" | "story" | "task" | "bug";

export type BoardStatus =
  | "To Do"
  | "In Progress"
  | "Review"
  | "Ready for Deploy"
  | "Ready for Test"
  | "Testing"
  | "Done";

export type AttentionState =
  | "none"
  | "dependency"
  | "problem"
  | "clarification"
  | "sync_stop";

export interface CanonicalWorkArtifact {
  artifactId: string;
  milestoneId: string;
  vision: string;
  scope: string[];
  nonGoals: string[];
  requirements: string[];
  implementationPlan: string[];
  testPlan: string[];
  acceptanceCriteria: string[];
  reviewPoints: string[];
  decisions: string[];
  evidenceRefs: string[];
  unknowns: string[];
  dependencies: string[];
  projectContext: string;
  currentState: string;
}

export interface Milestone {
  canonicalId: string;
  summary: string;
  description: CanonicalWorkArtifact;
  parentCanonicalId: null;
  boardStatus: BoardStatus;
}

export interface Epic {
  canonicalId: string;
  summary: string;
  parentMilestoneId: string;
  boardStatus: BoardStatus;
}

export interface ChildWorkItem {
  canonicalId: string;
  type: "story" | "task" | "bug";
  summary: string;
  parentEpicId: string;
  boardStatus: BoardStatus;
  acceptanceCriteria: string[];
}

export interface ExecutionSet {
  executionSetId: string;
  epicId: string;
  workItemIds: string[];
  owner: string;
  agentHost: "codex" | "claude-code" | "cursor";
  jiraProjectKey: string;
  jiraBoardId: string;
  sprintId?: string;
  branchName: string;
  worktreePath: string;
  baseRevision: string;
  affectedPaths: string[];
  dependencyIds: string[];
  acceptanceBoundary: string[];
  targetEnvironment: string;
  pullRequestUrls: string[];
}

export interface ProjectProfile {
  profileId: string;
  jiraProjectKey: string;
  jiraBoardId: string;
  confluenceSpaceKey: string;
  githubRepository: string;
}

export interface CanonicalEvent {
  executionSetId: string;
  artifactId: string;
  correlationId: string;
  source: CanonicalEventSource;
  actor: string;
  eventType: string;
  sourceRevision: string;
  timestamp: string;
  beforeState: string;
  afterState: string;
  evidenceRefs: string[];
  idempotencyKey: string;
}

export interface CanonicalEventSource {
  authority: string;
  canonicalId: string;
  targetIdentity: string;
  requestedOperation: string;
}

export type ValidatedRecord =
  | Milestone
  | CanonicalWorkArtifact
  | Epic
  | ChildWorkItem
  | ExecutionSet
  | ProjectProfile
  | CanonicalEvent;

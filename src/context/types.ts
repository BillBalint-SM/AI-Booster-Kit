import type { ContextReference, RetentionScope } from "../controller/types.js";

export type { ContextReference, RetentionScope } from "../controller/types.js";

export type ContextState = "DRAFT" | "ACCEPTED" | "STALE" | "SUPERSEDED";

export interface ContextEnvelope {
  contextVersion: "1.0";
  contextId: string;
  sourceRevision: string;
  owner: string;
  retention: RetentionScope;
  state: ContextState;
}

export interface MilestoneContext extends ContextEnvelope {
  kind: "MILESTONE";
  milestoneId: string;
  projectVision: string;
  roadmap: string;
  scope: readonly string[];
  nonGoals: readonly string[];
  decisions: readonly string[];
  forecast: readonly string[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  dependencies: readonly string[];
  epicIds: readonly string[];
}

export interface EpicContext extends ContextEnvelope {
  kind: "EPIC";
  epicId: string;
  milestoneId: string;
  outcome: string;
  featureValue: string;
  scope: readonly string[];
  nonGoals: readonly string[];
  workItemIds: readonly string[];
  acceptanceCriteria: readonly string[];
  decisions: readonly string[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  dependencies: readonly string[];
}

export type WorkContext = MilestoneContext | EpicContext;

export type SessionStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "UNKNOWN" | "COMPLETE_WITH_LIMIT" | "COMPLETE";

export interface SessionExecutionBinding {
  repository: string;
  branch: string;
  worktree: string;
  baseRevision: string;
}

export interface SessionState {
  sessionVersion: "1.0";
  sessionId: string;
  owner: string;
  retention: RetentionScope;
  contextReferences: readonly ContextReference[];
  workItemIds: readonly string[];
  activationPackageId: string | null;
  recipe: { recipeId: string; recipeVersion: string; variantId: string } | null;
  setupFingerprint: string | null;
  status: SessionStatus;
  decisions: readonly string[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  deviations: readonly string[];
  dependencies: readonly string[];
  progress: readonly string[];
  nextAction: string;
  execution: SessionExecutionBinding | null;
}

export interface ResumeRuntime {
  repository: string | null;
  branch: string | null;
  worktree: string | null;
  baseRevision: string | null;
  currentSetupFingerprint: string | null;
}

export type ResumeResult =
  | { decision: "RESUME"; sessionId: string; nextAction: string; evidenceRefs: readonly string[] }
  | { decision: "STOPPED" | "UNKNOWN"; sessionId: string; reasons: readonly string[]; preservedState: true };

export class ContextError extends Error {
  public constructor(message: string) {
    super(`Context rejected: ${message}.`);
    this.name = "ContextError";
  }
}

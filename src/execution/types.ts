export type ExecutionRetention = "EPHEMERAL" | "PERSONAL" | "TEAM";
export type ExecutionNodeType = "AGENT_TASK" | "DETERMINISTIC_CHECK" | "HUMAN_CHECKPOINT" | "SYNTHESIS";
export type ExecutionNodeState = "PENDING" | "READY" | "RUNNING" | "RESULT_RECEIVED" | "SUCCEEDED" | "REJECTED" | "STOPPED" | "UNKNOWN";
export type ExecutionRunState = "PREPARED" | "READY" | "RUNNING" | "WAITING_FOR_HUMAN" | "COMPLETE" | "COMPLETE_WITH_LIMIT" | "STOPPED" | "UNKNOWN";
export type ExecutionFinalState = Extract<ExecutionRunState, "COMPLETE" | "COMPLETE_WITH_LIMIT" | "STOPPED" | "UNKNOWN">;
export type ExecutionToolCapability = "FILESYSTEM_READ" | "LOCAL_SHELL_READ";
export type EvidenceKind = "REPOSITORY_FILE" | "COMMAND_OUTPUT" | "ARTIFACT";

export interface AcceptanceCriterion {
  criterionId: string;
  statement: string;
}

export interface ExecutionAuthority {
  repositoryWrite: "NONE";
  externalWrite: "NONE";
  agentExecution: "CODEX_NATIVE_ONLY";
}

export interface ExecutionSource {
  sourceId: string;
  kind: "REPOSITORY";
  locator: string;
  sourceRevision: string;
}

export interface ExecutionGraphLimits {
  maxNodes: number;
  maxParallel: number;
  maxDepth: number;
  maxRepairNodes: number;
  maxCheckerRepairCycles: number;
}

export interface ExecutionBudget {
  maxDispatches: number;
  maxResultBytes: number;
  maxWallClockMs: number;
}

export interface ExecutionEnvelopeInput {
  contractVersion: "1.0";
  runId: string;
  goal: string;
  scope: readonly string[];
  nonGoals: readonly string[];
  acceptanceCriteria: readonly AcceptanceCriterion[];
  sourceRevision: string;
  retention: ExecutionRetention;
  allowedNodeTypes: readonly ExecutionNodeType[];
  authority: ExecutionAuthority;
  toolScope: readonly ExecutionToolCapability[];
  sources: readonly ExecutionSource[];
  graphLimits: ExecutionGraphLimits;
  budget: ExecutionBudget;
  stopConditions: readonly string[];
  requiredEvidenceKinds: readonly EvidenceKind[];
  allowedFinalStates: readonly ExecutionFinalState[];
}

export interface ExecutionEnvelope extends ExecutionEnvelopeInput {
  envelopeHash: string;
}

export interface ExecutionEdge {
  fromNodeId: string;
  toNodeId: string;
}

export interface ExecutionNode {
  nodeId: string;
  type: ExecutionNodeType;
  required: boolean;
  state: ExecutionNodeState;
  objective: string;
  role: string | null;
  repairOf: string | null;
  scope: readonly string[];
  prohibitedActions: readonly string[];
  contextRefs: readonly string[];
  sourceIds: readonly string[];
  toolScope: readonly ExecutionToolCapability[];
  acceptanceCriterionIds: readonly string[];
}

export interface ExecutionGraphDraft {
  graphId: string;
  runId: string;
  nodes: readonly ExecutionNode[];
  edges: readonly ExecutionEdge[];
}

export interface ExecutionGraph extends ExecutionGraphDraft {
  envelopeHash: string;
  graphRevision: number;
  graphHash: string;
}

export interface GraphMutationProposal {
  proposalId: string;
  expectedGraphRevision: number;
  reason: string;
  evidenceRefs: readonly string[];
  nodes: readonly ExecutionNode[];
  edges: readonly ExecutionEdge[];
}

export interface NodeTransition {
  nodeId: string;
  from: ExecutionNodeState;
  to: ExecutionNodeState;
}

export interface ExecutionArtifactRef {
  artifactId: string;
  nodeId: string | null;
  sha256: string;
}

export interface RepositoryEvidenceLocator {
  path: string;
  lineStart: number;
  lineEnd: number;
}

export interface CommandEvidenceLocator {
  commandId: string;
  outputArtifactId: string;
}

export interface ArtifactEvidenceLocator {
  artifactId: string;
}

export type ExecutionEvidenceRef =
  | { evidenceId: string; kind: "REPOSITORY_FILE"; sourceId: string; sourceRevision: string; locator: RepositoryEvidenceLocator; sha256: string | null }
  | { evidenceId: string; kind: "COMMAND_OUTPUT"; sourceId: string; sourceRevision: string; locator: CommandEvidenceLocator; sha256: string }
  | { evidenceId: string; kind: "ARTIFACT"; sourceId: string; sourceRevision: string; locator: ArtifactEvidenceLocator; sha256: string };

export interface ExecutionClaim {
  claimId: string;
  criterionId: string;
  statement: string;
  state: "SUPPORTED" | "CONFLICTED" | "UNKNOWN";
  evidenceRefs: readonly string[];
}

export interface ExecutionFollowupRequest {
  reason: string;
  objective: string;
  requiredEvidence: readonly string[];
  proposedScope: readonly string[];
}

export interface ExecutionTaskPacket {
  packetVersion: "1.0";
  runId: string;
  taskId: string;
  nodeId: string;
  envelopeHash: string;
  graphRevision: number;
  objective: string;
  scope: readonly string[];
  prohibitedActions: readonly string[];
  contextRefs: readonly ExecutionArtifactRef[];
  sourceIds: readonly string[];
  toolScope: readonly ExecutionToolCapability[];
  expectedOutput: "RESULT_ENVELOPE_V1";
  acceptanceCriterionIds: readonly string[];
  budget: ExecutionBudget;
  stopConditions: readonly string[];
}

export interface ExecutionContextArtifact {
  artifactRef: ExecutionArtifactRef;
  result: ExecutionResultEnvelope;
}

export interface PreparedExecutionNode {
  taskPacket: ExecutionTaskPacket;
  contextArtifacts: readonly ExecutionContextArtifact[];
  resultTemplate: ExecutionResultEnvelope;
}

export interface ExecutionResultEnvelope {
  resultVersion: "1.0";
  runId: string;
  taskId: string;
  nodeId: string;
  envelopeHash: string;
  graphRevision: number;
  status: "READY_FOR_VALIDATION" | "STOPPED" | "UNKNOWN";
  summary: string;
  claims: readonly ExecutionClaim[];
  artifactRefs: readonly ExecutionArtifactRef[];
  evidenceRefs: readonly ExecutionEvidenceRef[];
  unknowns: readonly string[];
  conflicts: readonly string[];
  followupRequest: ExecutionFollowupRequest | null;
  observedLimits: readonly string[];
}

export type ExecutionEventType =
  | "RUN_CREATED"
  | "GRAPH_ACCEPTED"
  | "NODE_READY"
  | "NODE_DISPATCHED"
  | "NODE_RESULT_RECEIVED"
  | "NODE_RESULT_ACCEPTED"
  | "NODE_RESULT_REJECTED"
  | "NODE_STOPPED"
  | "GRAPH_MUTATION_ACCEPTED"
  | "CHECKPOINT_WRITTEN"
  | "RUN_FINALIZED"
  | "RUN_STOPPED"
  | "RUN_UNKNOWN";

export interface ExecutionEventInput {
  runId: string;
  eventType: ExecutionEventType;
  nodeId: string | null;
  beforeState: ExecutionNodeState | ExecutionRunState | null;
  afterState: ExecutionNodeState | ExecutionRunState | null;
  graphRevision: number;
  evidenceRefs: readonly string[];
  taskId: string | null;
  threadRef: string | null;
  reasonCode: string | null;
}

export interface ExecutionEvent extends ExecutionEventInput {
  eventVersion: "1.0";
  sequence: number;
  recordedAt: string;
  previousEventHash: string | null;
  eventHash: string;
}

export interface ExecutionCheckpoint {
  checkpointVersion: "1.0";
  runId: string;
  envelopeHash: string;
  graphHash: string;
  graphRevision: number;
  runState: ExecutionRunState;
  dispatchCount: number;
  repairCount: number;
  acceptedEvidenceRefs: readonly string[];
  activeThreadRefs: readonly string[];
  lastEventSequence: number;
  lastEventHash: string;
}

export interface PersonalExecutionRun {
  runDirectory: string;
  checkpoint: ExecutionCheckpoint;
  lastEventHash: string;
}

export interface LoadedExecutionRun {
  runDirectory: string;
  envelope: ExecutionEnvelope;
  graph: ExecutionGraph;
  events: readonly ExecutionEvent[];
  checkpoint: ExecutionCheckpoint;
  artifacts: readonly ExecutionArtifactRef[];
  evidenceRefs: readonly ExecutionEvidenceRef[];
  acceptedResults: readonly ExecutionResultEnvelope[];
  finalHandoff: FinalExecutionHandoff | null;
}

export interface ExecutionResumeRuntime {
  sourceRevision: string;
  availableThreadRefs: readonly string[];
  activeThreadRefs: readonly string[];
  observedAt: string;
}

export type ExecutionResumeDecision =
  | { decision: "RESUME"; runId: string; readyNodeIds: readonly string[]; completedNodeIds: readonly string[] }
  | { decision: "STOPPED" | "UNKNOWN"; runId: string; reasons: readonly string[]; preservedState: true };

export interface ExecutionMetricMeasurement {
  state: "MEASURED" | "UNKNOWN";
  value: number | null;
}

export interface ExecutionHostMetrics {
  elapsedMs: ExecutionMetricMeasurement;
  tokenUsage: ExecutionMetricMeasurement;
}

export interface FinalExecutionHandoff {
  handoffVersion: "1.0";
  runId: string;
  envelopeHash: string;
  graphHash: string;
  state: ExecutionFinalState;
  summary: string;
  claims: readonly ExecutionClaim[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  limits: readonly string[];
  metrics: ExecutionHostMetrics;
  nextAction: string;
}

export interface ExecutionComparisonReport {
  comparisonVersion: "1.0";
  comparable: true;
  singleRunId: string;
  multiRunId: string;
  goalIdentityMatch: true;
  metrics: {
    supportedClaimCount: { single: number; multi: number };
    conflictCount: { single: number; multi: number };
    unknownCount: { single: number; multi: number };
    dispatchCount: { single: number; multi: number };
    repairCount: { single: number; multi: number };
    elapsedMs: { single: number | null; multi: number | null; state: "MEASURED" | "UNKNOWN" };
    tokenUsage: { single: number | null; multi: number | null; state: "MEASURED" | "UNKNOWN" };
  };
}

export class ExecutionContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

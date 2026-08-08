export type HostCapabilityId =
  | "SPAWN_AGENT"
  | "WAIT_AGENT"
  | "INTERRUPT_AGENT"
  | "OBSERVE_AGENT_IDENTITY"
  | "BIND_WORKSPACE";

export type HostProfileId = string;

export interface CodexHostSessionObservation {
  hostProfileId: "CODEX_APP_NATIVE_V1";
  hostSessionId: string | null;
  state: "OBSERVED" | "UNKNOWN";
  reasonCode: "HOST_SESSION_IDENTITY_UNKNOWN" | null;
  observedAt: string;
}

export type HostCapabilityState = "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";
export type HostAuthorityState = "PROVEN" | "DENIED" | "UNKNOWN";
export type HostInstructionState = "OBSERVED" | "UNKNOWN";
export type HostCapabilityEvidenceCode =
  | "NATIVE_CAPABILITY_OBSERVED"
  | "NATIVE_CAPABILITY_UNSUPPORTED"
  | "NATIVE_CAPABILITY_UNOBSERVABLE";

export interface HostCapabilityObservation {
  capabilityId: HostCapabilityId;
  state: HostCapabilityState;
  authorityState: HostAuthorityState;
  instructionState: HostInstructionState;
  evidenceCode: HostCapabilityEvidenceCode;
}

export interface CreateExecutionHostReceiptRequest {
  hostProfileId: HostProfileId;
  hostSessionId: string | null;
  capabilities: readonly HostCapabilityObservation[];
  observedAt: string;
}

export interface ExecutionHostRunBinding {
  controllerId: string;
  runtimeReceiptId: string;
}

export interface HostEvidenceReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  hostProfileId: HostProfileId;
  hostSessionId: string | null;
  controllerId: string;
  runtimeReceiptId: string;
  capabilities: readonly HostCapabilityObservation[];
  observedAt: string;
  evidenceDigest: string;
}

export interface ExecutionBindingPolicy {
  policyVersion: "1.0";
  policyId: "execution-binding-policy-v1";
  policyDigest: string;
  gitCommandTimeoutMs: number;
  maxGitOutputBytes: number;
  maxAuditedPaths: number;
  maxAuditedPathBytes: number;
  maxTotalAuditedPathBytes: number;
  maxHostEvidenceInputBytes: number;
  maxReadinessInputBytes: number;
  requiredHostCapabilities: readonly HostCapabilityId[];
  admittedHostProfiles: readonly ["CODEX_APP_NATIVE_V1"];
}

export interface ResolveExecutionSourcePathScopeRequest {
  platform: NodeJS.Platform;
  workspaceRoot: string;
  expectedWorkspaceIdentityDigest: string;
  auditedPaths: readonly string[];
}

export interface ResolvedSourcePathScope {
  state: "RESOLVED";
  workspaceRoot: string;
  workspaceIdentityDigest: string;
  workspaceMatchesExpected: boolean;
  auditedPaths: readonly string[];
}

export interface UnknownSourcePathScope {
  state: "UNKNOWN";
  workspaceRoot: null;
  workspaceIdentityDigest: null;
  workspaceMatchesExpected: false;
  auditedPaths: readonly string[];
  reasonCodes: readonly ["SOURCE_UNREADABLE"];
}

export interface ObserveExecutionSourceRequest {
  sourceId: string;
  platform: NodeJS.Platform;
  workspaceRoot: string;
  expectedSourceRevision: string;
  auditedPaths: readonly string[];
  observedAt: string;
}

export interface ExecutionSourceRunBinding {
  workspaceIdentityDigest: string;
}

export type SourceBindingReasonCode =
  | "SOURCE_REVISION_MISMATCH"
  | "WORKTREE_DIRTY_IN_SCOPE"
  | "WORKSPACE_IDENTITY_MISMATCH"
  | "SOURCE_UNREADABLE";

export interface SourceBindingObservation {
  observationVersion: "1.0";
  observationId: string;
  sourceId: string;
  repositoryIdentityDigest: string | null;
  worktreeIdentityDigest: string | null;
  workspaceIdentityDigest: string | null;
  expectedSourceRevision: string;
  observedSourceRevision: string | null;
  auditedPaths: readonly string[];
  dirtyState: "CLEAN" | "DIRTY" | "UNKNOWN";
  sourceStateDigest: string;
  observedAt: string;
  reasonCodes: readonly SourceBindingReasonCode[];
  evidenceDigest: string;
}

export interface AssembleExecutionDispatchReadinessRequest {
  run: import("../types.js").TransactionalLoadedExecutionRun;
  runtimeReceipt: import("../runtime-receipt.js").ExecutionRuntimeReceipt;
  nodeId: string;
  hostReceipt: HostEvidenceReceipt;
  sourceObservations: readonly SourceBindingObservation[];
  observedAt: string;
}

export interface DispatchReadinessReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  state: "READY" | "STOPPED" | "UNKNOWN";
  runId: string;
  nodeId: string;
  taskId: string;
  envelopeHash: string;
  graphRevision: number;
  controllerId: string;
  runtimeReceiptId: string;
  hostEvidenceReceiptId: string;
  hostSessionId: string | null;
  sourceObservationIds: readonly string[];
  sourceStateDigests: readonly string[];
  reasonCodes: readonly import("../reasons.js").ExecutionReasonCode[];
  observedAt: string;
  evidenceDigest: string;
}

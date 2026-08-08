import { executionDigest } from "../identity.js";
import { ExecutionContractError } from "../types.js";
import { observeGitSource } from "./git-observer.js";
import { resolveExecutionSourcePathScope } from "./source-path.js";
import type {
  ExecutionBindingPolicy,
  ExecutionSourceRunBinding,
  ObserveExecutionSourceRequest,
  SourceBindingObservation,
  SourceBindingReasonCode,
} from "./types.js";

export async function observeExecutionSource(
  request: ObserveExecutionSourceRequest,
  runBinding: ExecutionSourceRunBinding,
  policy: ExecutionBindingPolicy,
): Promise<SourceBindingObservation> {
  validateRequest(request, runBinding);
  const pathScope = await resolveExecutionSourcePathScope({
    platform: request.platform,
    workspaceRoot: request.workspaceRoot,
    expectedWorkspaceIdentityDigest: runBinding.workspaceIdentityDigest,
    auditedPaths: request.auditedPaths,
  }, policy);
  if (pathScope.state === "UNKNOWN") {
    return sourceObservation({
      sourceId: request.sourceId,
      repositoryIdentityDigest: null,
      worktreeIdentityDigest: null,
      workspaceIdentityDigest: null,
      expectedSourceRevision: request.expectedSourceRevision,
      observedSourceRevision: null,
      auditedPaths: pathScope.auditedPaths,
      dirtyState: "UNKNOWN",
      statusRecordDigests: [],
      observedAt: request.observedAt,
      reasonCodes: ["SOURCE_UNREADABLE"],
    });
  }
  const git = await observeGitSource(pathScope.workspaceRoot, request.platform, pathScope.auditedPaths, policy);
  const reasons: SourceBindingReasonCode[] = [];
  if (!pathScope.workspaceMatchesExpected || !git.topLevelMatchesWorkspace) reasons.push("WORKSPACE_IDENTITY_MISMATCH");
  if (git.dirtyState === "UNKNOWN" || git.observedSourceRevision === null) reasons.push("SOURCE_UNREADABLE");
  else if (git.observedSourceRevision !== request.expectedSourceRevision) reasons.push("SOURCE_REVISION_MISMATCH");
  if (git.dirtyState === "DIRTY") reasons.push("WORKTREE_DIRTY_IN_SCOPE");
  return sourceObservation({
    sourceId: request.sourceId,
    repositoryIdentityDigest: git.repositoryIdentityDigest,
    worktreeIdentityDigest: git.worktreeIdentityDigest,
    workspaceIdentityDigest: pathScope.workspaceIdentityDigest,
    expectedSourceRevision: request.expectedSourceRevision,
    observedSourceRevision: git.observedSourceRevision,
    auditedPaths: pathScope.auditedPaths,
    dirtyState: git.dirtyState,
    statusRecordDigests: git.statusRecordDigests,
    observedAt: request.observedAt,
    reasonCodes: uniqueSorted(reasons),
  });
}

interface SourceObservationEvidence {
  sourceId: string;
  repositoryIdentityDigest: string | null;
  worktreeIdentityDigest: string | null;
  workspaceIdentityDigest: string | null;
  expectedSourceRevision: string;
  observedSourceRevision: string | null;
  auditedPaths: readonly string[];
  dirtyState: "CLEAN" | "DIRTY" | "UNKNOWN";
  statusRecordDigests: readonly string[];
  observedAt: string;
  reasonCodes: readonly SourceBindingReasonCode[];
}

function sourceObservation(evidence: SourceObservationEvidence): SourceBindingObservation {
  const sourceStateDigest = executionDigest({
    domain: "execution-source-state-v1",
    repositoryIdentityDigest: evidence.repositoryIdentityDigest,
    worktreeIdentityDigest: evidence.worktreeIdentityDigest,
    workspaceIdentityDigest: evidence.workspaceIdentityDigest,
    expectedSourceRevision: evidence.expectedSourceRevision,
    observedSourceRevision: evidence.observedSourceRevision,
    auditedPaths: evidence.auditedPaths,
    dirtyState: evidence.dirtyState,
    reasonCodes: evidence.reasonCodes,
    statusRecordDigests: evidence.statusRecordDigests,
  });
  const evidenceDigest = executionDigest({
    domain: "execution-source-evidence-v1",
    ...evidence,
    sourceStateDigest,
  });
  const body = {
    observationVersion: "1.0" as const,
    sourceId: evidence.sourceId,
    repositoryIdentityDigest: evidence.repositoryIdentityDigest,
    worktreeIdentityDigest: evidence.worktreeIdentityDigest,
    workspaceIdentityDigest: evidence.workspaceIdentityDigest,
    expectedSourceRevision: evidence.expectedSourceRevision,
    observedSourceRevision: evidence.observedSourceRevision,
    auditedPaths: evidence.auditedPaths,
    dirtyState: evidence.dirtyState,
    sourceStateDigest,
    observedAt: evidence.observedAt,
    reasonCodes: evidence.reasonCodes,
    evidenceDigest,
  };
  return { ...body, observationId: executionDigest(body) };
}

function validateRequest(request: ObserveExecutionSourceRequest, runBinding: ExecutionSourceRunBinding): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u.test(request.sourceId)) invalid("source identity is invalid");
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(request.expectedSourceRevision)) invalid("expected source revision is invalid");
  if (!/^[a-f0-9]{64}$/u.test(runBinding.workspaceIdentityDigest)) invalid("run workspace identity is invalid");
  const time = Date.parse(request.observedAt);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== request.observedAt) invalid("source observation time is invalid");
}

function uniqueSorted(values: readonly SourceBindingReasonCode[]): SourceBindingReasonCode[] {
  return [...new Set(values)].sort((first, second) => first < second ? -1 : first > second ? 1 : 0);
}

function invalid(message: string): never {
  throw new ExecutionContractError("EXECUTION_SOURCE_OBSERVATION_INVALID", message);
}

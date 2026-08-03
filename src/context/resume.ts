import { ContextError } from "./types.js";
import { validateEpicContext, validateSessionState } from "./validation.js";
import type { EpicContext, MilestoneContext, ResumeResult, ResumeRuntime, SessionState, WorkContext } from "./types.js";

export function evaluateSessionResume(state: SessionState, contexts: readonly WorkContext[], runtime: ResumeRuntime): ResumeResult {
  let validated: SessionState;
  try {
    validated = validateSessionState(state);
  } catch {
    return stopped(state.sessionId, ["session state is malformed"]);
  }
  if (validated.status === "UNKNOWN") return unknown(validated.sessionId, ["session state is UNKNOWN"]);
  if (validated.status === "STOPPED" || validated.status === "COMPLETE" || validated.status === "COMPLETE_WITH_LIMIT") {
    return stopped(validated.sessionId, [`session status '${validated.status}' cannot resume`]);
  }
  if (validated.dependencies.some((dependency) => dependency.startsWith("UNKNOWN:"))) return unknown(validated.sessionId, ["a dependency remains unknown"]);

  const current = resolveContexts(validated, contexts);
  if ("result" in current) return current.result;
  const { milestone, epic } = current;
  if (milestone.state !== "ACCEPTED" || (epic !== undefined && epic.state !== "ACCEPTED")) return stopped(validated.sessionId, ["referenced context is not accepted and current"]);
  try {
    if (epic !== undefined) validateEpicContext(epic, milestone, epic.workItemIds);
  } catch (error) {
    if (error instanceof ContextError) return stopped(validated.sessionId, ["referenced context parent link is invalid"]);
    throw error;
  }
  if (epic !== undefined && validated.workItemIds.some((workItemId) => !epic.workItemIds.includes(workItemId))) {
    return stopped(validated.sessionId, ["session work item is outside the referenced Epic"]);
  }
  const setupResult = validateSetup(validated, runtime);
  if (setupResult !== undefined) return setupResult;
  const executionResult = validateExecution(validated, runtime);
  if (executionResult !== undefined) return executionResult;
  return { decision: "RESUME", sessionId: validated.sessionId, nextAction: validated.nextAction, evidenceRefs: validated.evidenceRefs };
}

function resolveContexts(state: SessionState, contexts: readonly WorkContext[]): { milestone: MilestoneContext; epic: EpicContext | undefined } | { result: ResumeResult } {
  const references = new Map(contexts.map((context) => [`${context.kind}:${context.contextId}`, context]));
  const milestoneReference = state.contextReferences.find((reference) => reference.kind === "MILESTONE");
  if (milestoneReference === undefined) return { result: stopped(state.sessionId, ["Milestone context reference is missing"]) };
  const milestone = references.get(`MILESTONE:${milestoneReference.contextId}`);
  if (milestone === undefined || milestone.kind !== "MILESTONE") return { result: stopped(state.sessionId, ["Milestone context is missing"]) };
  if (milestone.sourceRevision !== milestoneReference.sourceRevision) return { result: stopped(state.sessionId, ["Milestone context revision is stale"]) };
  const epicReference = state.contextReferences.find((reference) => reference.kind === "EPIC");
  if (epicReference === undefined) return { milestone, epic: undefined };
  const epic = references.get(`EPIC:${epicReference.contextId}`);
  if (epic === undefined || epic.kind !== "EPIC") return { result: stopped(state.sessionId, ["Epic context is missing"]) };
  if (epic.sourceRevision !== epicReference.sourceRevision) return { result: stopped(state.sessionId, ["Epic context revision is stale"]) };
  return { milestone, epic };
}

function validateSetup(state: SessionState, runtime: ResumeRuntime): ResumeResult | undefined {
  if (state.setupFingerprint === null) return undefined;
  if (runtime.currentSetupFingerprint === null) return unknown(state.sessionId, ["current setup fingerprint is unknown"]);
  if (runtime.currentSetupFingerprint !== state.setupFingerprint) return stopped(state.sessionId, ["setup fingerprint changed"]);
  return undefined;
}

function validateExecution(state: SessionState, runtime: ResumeRuntime): ResumeResult | undefined {
  if (state.execution === null) return undefined;
  const expected = state.execution;
  const observed = [runtime.repository, runtime.branch, runtime.worktree, runtime.baseRevision];
  if (observed.some((value) => value === null)) return unknown(state.sessionId, ["current execution binding is unknown"]);
  if (runtime.repository !== expected.repository || runtime.branch !== expected.branch || runtime.worktree !== expected.worktree || runtime.baseRevision !== expected.baseRevision) {
    return stopped(state.sessionId, ["execution binding changed"]);
  }
  return undefined;
}

function stopped(sessionId: string, reasons: readonly string[]): ResumeResult {
  return { decision: "STOPPED", sessionId, reasons, preservedState: true };
}

function unknown(sessionId: string, reasons: readonly string[]): ResumeResult {
  return { decision: "UNKNOWN", sessionId, reasons, preservedState: true };
}

import { createHash } from "node:crypto";

import { composeFlow } from "./compose.js";
import type { FlowModule, FlowModulePacket, FlowPackage, FlowRecipes } from "./compose.js";

export type FlowAssuranceStatus =
  | "READY"
  | "WAITING_FOR_APPROVAL"
  | "COMPLETE"
  | "COMPLETE_WITH_LIMIT"
  | "STOPPED"
  | "UNKNOWN";

export type FlowStageOutcome = "COMPLETE" | "COMPLETE_WITH_LIMIT" | "STOPPED" | "UNKNOWN";
export type AssuredFlowStageState = FlowStageOutcome | "READY" | "PENDING";

export type FlowAssuranceBlockerCode =
  | "RECEIPT_PACKAGE_MISMATCH"
  | "RECEIPT_STAGE_UNKNOWN"
  | "RECEIPT_STAGE_MISMATCH"
  | "RECEIPT_DUPLICATE"
  | "RECEIPT_OUT_OF_ORDER"
  | "RECEIPT_ARTIFACT_INVALID"
  | "RECEIPT_ARTIFACT_INCOMPLETE"
  | "RECEIPT_EVIDENCE_INVALID"
  | "RECEIPT_EVIDENCE_INCOMPLETE"
  | "RECEIPT_OUTCOME_INVALID"
  | "RECEIPT_READBACK_UNVERIFIED"
  | "CHECKPOINT_UNKNOWN"
  | "CHECKPOINT_DUPLICATE"
  | "CHECKPOINT_OUT_OF_ORDER"
  | "CHECKPOINT_SUBJECT_MISMATCH"
  | "CHECKPOINT_DECISION_STALE"
  | "CHECKPOINT_REJECTED"
  | "PACKAGE_STOPPED"
  | "PACKAGE_UNKNOWN";

export interface FlowArtifactReceipt {
  section: string;
  reference: string;
  sha256: string;
}

export interface FlowEvidenceReceipt {
  requirement: string;
  reference: string;
  sha256: string;
}

export interface FlowReadbackReceipt {
  state: "VERIFIED" | "UNAVAILABLE";
  revision: string | null;
  observedAt: string;
}

export interface FlowStageReceipt {
  receiptVersion: "1.0";
  receiptKind: "STAGE";
  packageId: string;
  stageId: string;
  module: FlowModule;
  outcome: FlowStageOutcome;
  artifacts: readonly FlowArtifactReceipt[];
  evidence: readonly FlowEvidenceReceipt[];
  decisions: readonly string[];
  unknowns: readonly string[];
  limits: readonly string[];
  stopReasons: readonly string[];
  nextAction: string;
  readback: FlowReadbackReceipt;
}

export interface FlowCheckpointReceipt {
  receiptVersion: "1.0";
  receiptKind: "CHECKPOINT";
  packageId: string;
  checkpoint: "USER_ACCEPTS_PLAN";
  afterStage: string;
  beforeStage: string;
  subjectReceiptId: string;
  decision: "ACCEPTED" | "REJECTED";
  decisionReference: string;
  decidedAt: string;
}

export interface FlowAssuranceBlocker {
  code: FlowAssuranceBlockerCode;
  stageId: string | null;
  message: string;
}

export interface AssuredFlowStage {
  stageId: string;
  module: FlowModule;
  state: AssuredFlowStageState;
  receiptId: string | null;
}

export interface AssuredFlowCheckpoint {
  checkpoint: "USER_ACCEPTS_PLAN";
  afterStage: string;
  beforeStage: string;
  state: "PENDING" | "ACCEPTED" | "REJECTED";
  subjectReceiptId: string | null;
  decisionReference: string | null;
}

export interface FlowAssuranceHandoff {
  ready: boolean;
  status: Extract<FlowAssuranceStatus, "COMPLETE" | "COMPLETE_WITH_LIMIT" | "STOPPED" | "UNKNOWN"> | null;
  artifacts: readonly FlowArtifactReceipt[];
  evidence: readonly FlowEvidenceReceipt[];
  decisions: readonly string[];
  unknowns: readonly string[];
  limits: readonly string[];
  stopReasons: readonly string[];
  nextAction: string;
}

export interface FlowAssuranceReport {
  reportVersion: "1.0";
  packageId: string;
  package: FlowPackage;
  status: FlowAssuranceStatus;
  authority: "RECOMMENDATION_ONLY";
  executionPerformed: false;
  stages: readonly AssuredFlowStage[];
  checkpoints: readonly AssuredFlowCheckpoint[];
  runnableStages: readonly string[];
  blockers: readonly FlowAssuranceBlocker[];
  nextAction: string;
  handoff: FlowAssuranceHandoff;
}

export type FlowAssuranceErrorCode = "FLOW_ASSURANCE_INPUT_INVALID" | "FLOW_ASSURANCE_RECEIPT_INVALID";

export class FlowAssuranceError extends Error {
  public constructor(readonly code: FlowAssuranceErrorCode, message: string) {
    super(message);
    this.name = "FlowAssuranceError";
  }
}

interface NormalizedAssessment {
  request: unknown;
  receipts: readonly (FlowStageReceipt | FlowCheckpointReceipt)[];
}

interface StageEvaluation {
  stage: FlowModulePacket;
  receipt: FlowStageReceipt | null;
  receiptId: string | null;
  blocker: FlowAssuranceBlocker | null;
}

const packageIdPattern = /^sha256:[a-f0-9]{64}$/u;
const sha256Pattern = /^[a-f0-9]{64}$/u;
const identifierPattern = /^[a-z][a-z0-9-]*$/u;

export function assessFlow(value: unknown, recipes: FlowRecipes): FlowAssuranceReport {
  const assessment = normalizeAssessment(value);
  const flowPackage = composeFlow(assessment.request, recipes);
  const packageId = flowIdentity({ request: assessment.request, package: flowPackage });

  if (flowPackage.status !== "READY") {
    return packageNotReadyReport(flowPackage, packageId);
  }

  const preflightBlocker = receiptPreflightBlocker(assessment.receipts, flowPackage, packageId);
  if (preflightBlocker !== null) return blockedReport(flowPackage, packageId, preflightBlocker);

  const stageReceipts = new Map<string, FlowStageReceipt>();
  let checkpointReceiptValue: FlowCheckpointReceipt | null = null;
  for (const receipt of assessment.receipts) {
    if (receipt.receiptKind === "STAGE") stageReceipts.set(receipt.stageId, receipt);
    else checkpointReceiptValue = receipt;
  }

  const evaluations = flowPackage.modules.map((stage) => evaluateStage(stage, stageReceipts.get(stage.stageId) ?? null));
  const contractBlocker = evaluations.find((evaluation) => evaluation.blocker !== null)?.blocker ?? null;
  if (contractBlocker !== null) return blockedReport(flowPackage, packageId, contractBlocker, evaluations);

  const checkpoint = evaluateCheckpoint(flowPackage, evaluations, checkpointReceiptValue);
  if (checkpoint.blocker !== null) return blockedReport(flowPackage, packageId, checkpoint.blocker, evaluations, checkpoint.value);

  const orderBlocker = stageOrderBlocker(flowPackage, evaluations, checkpoint.value);
  if (orderBlocker !== null) return blockedReport(flowPackage, packageId, orderBlocker, evaluations, checkpoint.value);

  const stages = projectStages(flowPackage, evaluations, checkpoint.value);
  const declaredTerminal = stages.find((stage) => stage.state === "STOPPED" || stage.state === "UNKNOWN");
  const allComplete = stages.every((stage) => stage.state === "COMPLETE" || stage.state === "COMPLETE_WITH_LIMIT");
  const anyLimited = stages.some((stage) => stage.state === "COMPLETE_WITH_LIMIT");
  const waitingForApproval = checkpoint.value.some((entry) => entry.state === "PENDING" && completedState(stages, entry.afterStage));
  const runnableStages = stages.filter((stage) => stage.state === "READY").map((stage) => stage.stageId);

  let status: FlowAssuranceStatus;
  if (checkpoint.value.some((entry) => entry.state === "REJECTED")) status = "STOPPED";
  else if (declaredTerminal?.state === "STOPPED") status = "STOPPED";
  else if (declaredTerminal?.state === "UNKNOWN") status = "UNKNOWN";
  else if (allComplete) status = anyLimited ? "COMPLETE_WITH_LIMIT" : "COMPLETE";
  else if (waitingForApproval) status = "WAITING_FOR_APPROVAL";
  else status = "READY";

  const blockers = checkpoint.value.flatMap((entry): FlowAssuranceBlocker[] => entry.state === "REJECTED" ? [{
    code: "CHECKPOINT_REJECTED",
    stageId: entry.beforeStage,
    message: "the required plan checkpoint was rejected",
  }] : []);
  const nextAction = nextActionFor(status, stages, checkpoint.value, evaluations);
  const handoff = buildHandoff(status, nextAction, evaluations, checkpoint.value, true);

  return report(flowPackage, packageId, status, stages, checkpoint.value, runnableStages, blockers, nextAction, handoff);
}

function normalizeAssessment(value: unknown): NormalizedAssessment {
  const record = plainRecord(value, "FLOW_ASSURANCE_INPUT_INVALID", "flow assessment");
  exactKeys(record, ["assessmentVersion", "request", "receipts"], "FLOW_ASSURANCE_INPUT_INVALID", "flow assessment");
  if (record.assessmentVersion !== "1.0") {
    throw new FlowAssuranceError("FLOW_ASSURANCE_INPUT_INVALID", "flow assessment version must be 1.0");
  }
  const receipts = dataList(record.receipts, "FLOW_ASSURANCE_INPUT_INVALID", "flow assessment receipts");
  return { request: record.request, receipts: receipts.map(normalizeReceipt) };
}

function normalizeReceipt(value: unknown): FlowStageReceipt | FlowCheckpointReceipt {
  const record = plainRecord(value, "FLOW_ASSURANCE_RECEIPT_INVALID", "flow receipt");
  if (record.receiptKind === "STAGE") return normalizeStageReceipt(record);
  if (record.receiptKind === "CHECKPOINT") return normalizeCheckpointReceipt(record);
  throw new FlowAssuranceError("FLOW_ASSURANCE_RECEIPT_INVALID", "flow receipt kind must be STAGE or CHECKPOINT");
}

function normalizeStageReceipt(record: Record<string, unknown>): FlowStageReceipt {
  exactKeys(record, [
    "receiptVersion", "receiptKind", "packageId", "stageId", "module", "outcome", "artifacts", "evidence",
    "decisions", "unknowns", "limits", "stopReasons", "nextAction", "readback",
  ], "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt");
  if (record.receiptVersion !== "1.0") invalidReceipt("stage receipt version must be 1.0");
  return {
    receiptVersion: "1.0",
    receiptKind: "STAGE",
    packageId: packageIdValue(record.packageId),
    stageId: identifierValue(record.stageId, "stage receipt identifier"),
    module: literal(record.module, ["plan", "implement", "test", "review"], "stage receipt module"),
    outcome: literal(record.outcome, ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"], "stage receipt outcome"),
    artifacts: artifactReceipts(record.artifacts),
    evidence: evidenceReceipts(record.evidence),
    decisions: stringList(record.decisions, "stage receipt decisions"),
    unknowns: stringList(record.unknowns, "stage receipt unknowns"),
    limits: stringList(record.limits, "stage receipt limits"),
    stopReasons: stringList(record.stopReasons, "stage receipt stop reasons"),
    nextAction: nonEmptyString(record.nextAction, "stage receipt next action"),
    readback: readbackReceipt(record.readback),
  };
}

function normalizeCheckpointReceipt(record: Record<string, unknown>): FlowCheckpointReceipt {
  exactKeys(record, [
    "receiptVersion", "receiptKind", "packageId", "checkpoint", "afterStage", "beforeStage", "subjectReceiptId",
    "decision", "decisionReference", "decidedAt",
  ], "FLOW_ASSURANCE_RECEIPT_INVALID", "checkpoint receipt");
  if (record.receiptVersion !== "1.0" || record.checkpoint !== "USER_ACCEPTS_PLAN") {
    invalidReceipt("checkpoint receipt contract is invalid");
  }
  return {
    receiptVersion: "1.0",
    receiptKind: "CHECKPOINT",
    packageId: packageIdValue(record.packageId),
    checkpoint: "USER_ACCEPTS_PLAN",
    afterStage: identifierValue(record.afterStage, "checkpoint after stage"),
    beforeStage: identifierValue(record.beforeStage, "checkpoint before stage"),
    subjectReceiptId: packageIdValue(record.subjectReceiptId),
    decision: literal(record.decision, ["ACCEPTED", "REJECTED"], "checkpoint decision"),
    decisionReference: nonEmptyString(record.decisionReference, "checkpoint decision reference"),
    decidedAt: timestampValue(record.decidedAt, "checkpoint decision time"),
  };
}

function receiptPreflightBlocker(
  receipts: readonly (FlowStageReceipt | FlowCheckpointReceipt)[],
  flowPackage: FlowPackage,
  packageId: string,
): FlowAssuranceBlocker | null {
  const packageMismatch = receipts.find((receipt) => receipt.packageId !== packageId);
  if (packageMismatch !== undefined) return blocker("RECEIPT_PACKAGE_MISMATCH", receiptStageId(packageMismatch), "receipt belongs to a different flow package");

  const knownStages = new Map(flowPackage.modules.map((stage) => [stage.stageId, stage]));
  const stageReceipts = receipts.filter((receipt): receipt is FlowStageReceipt => receipt.receiptKind === "STAGE");
  const unknownStage = stageReceipts.find((receipt) => !knownStages.has(receipt.stageId));
  if (unknownStage !== undefined) return blocker("RECEIPT_STAGE_UNKNOWN", unknownStage.stageId, "receipt names an unknown flow stage");
  const mismatchedStage = stageReceipts.find((receipt) => knownStages.get(receipt.stageId)?.module !== receipt.module);
  if (mismatchedStage !== undefined) return blocker("RECEIPT_STAGE_MISMATCH", mismatchedStage.stageId, "receipt module does not match its flow stage");
  const duplicateStage = duplicate(stageReceipts.map((receipt) => receipt.stageId));
  if (duplicateStage !== null) return blocker("RECEIPT_DUPLICATE", duplicateStage, "flow stage has more than one receipt");

  const checkpoints = receipts.filter((receipt): receipt is FlowCheckpointReceipt => receipt.receiptKind === "CHECKPOINT");
  const canonicalCheckpoint = flowPackage.checkpoints[0];
  if (checkpoints.length > 0 && canonicalCheckpoint === undefined) return blocker("CHECKPOINT_UNKNOWN", null, "module package does not declare a checkpoint");
  const foreignCheckpoint = checkpoints.find((receipt) => canonicalCheckpoint !== undefined && (
    receipt.checkpoint !== canonicalCheckpoint.decision
    || receipt.afterStage !== canonicalCheckpoint.afterStage
    || receipt.beforeStage !== canonicalCheckpoint.beforeStage
  ));
  if (foreignCheckpoint !== undefined) return blocker("CHECKPOINT_UNKNOWN", foreignCheckpoint.beforeStage, "checkpoint receipt does not match the declared flow checkpoint");
  if (checkpoints.length > 1) return blocker("CHECKPOINT_DUPLICATE", canonicalCheckpoint?.beforeStage ?? null, "flow checkpoint has more than one receipt");
  return null;
}

function evaluateStage(stage: FlowModulePacket, receipt: FlowStageReceipt | null): StageEvaluation {
  if (receipt === null) return { stage, receipt: null, receiptId: null, blocker: null };
  const receiptId = flowIdentity(receipt);
  const artifactSections = receipt.artifacts.map((artifact) => artifact.section);
  if (artifactSections.some((section) => !stage.expectedOutput.includes(section)) || duplicate(artifactSections) !== null) {
    return { stage, receipt, receiptId, blocker: blocker("RECEIPT_ARTIFACT_INVALID", stage.stageId, "stage receipt contains an undeclared or duplicate artifact section") };
  }
  const evidenceRequirements = receipt.evidence.map((evidence) => evidence.requirement);
  if (evidenceRequirements.some((requirement) => !stage.evidenceRequirements.includes(requirement)) || duplicate(evidenceRequirements) !== null) {
    return { stage, receipt, receiptId, blocker: blocker("RECEIPT_EVIDENCE_INVALID", stage.stageId, "stage receipt contains undeclared or duplicate evidence") };
  }
  const success = receipt.outcome === "COMPLETE" || receipt.outcome === "COMPLETE_WITH_LIMIT";
  if (success && !sameMembers(artifactSections, stage.expectedOutput)) {
    return { stage, receipt, receiptId, blocker: blocker("RECEIPT_ARTIFACT_INCOMPLETE", stage.stageId, "successful stage receipt does not cover every required output section") };
  }
  if (success && !sameMembers(evidenceRequirements, stage.evidenceRequirements)) {
    return { stage, receipt, receiptId, blocker: blocker("RECEIPT_EVIDENCE_INCOMPLETE", stage.stageId, "successful stage receipt does not cover every evidence requirement") };
  }
  const outcomeBlocker = validateOutcome(receipt, stage.stageId);
  return { stage, receipt, receiptId, blocker: outcomeBlocker };
}

function validateOutcome(receipt: FlowStageReceipt, stageId: string): FlowAssuranceBlocker | null {
  if (receipt.outcome === "COMPLETE" && (receipt.unknowns.length > 0 || receipt.limits.length > 0 || receipt.stopReasons.length > 0)) {
    return blocker("RECEIPT_OUTCOME_INVALID", stageId, "complete receipt cannot contain unknowns, limits, or stop reasons");
  }
  if (receipt.outcome === "COMPLETE_WITH_LIMIT" && (receipt.limits.length === 0 || receipt.unknowns.length > 0 || receipt.stopReasons.length > 0)) {
    return blocker("RECEIPT_OUTCOME_INVALID", stageId, "complete-with-limit receipt requires limits and cannot contain unknowns or stop reasons");
  }
  if (receipt.outcome === "STOPPED" && (receipt.stopReasons.length === 0 || receipt.unknowns.length > 0 || receipt.evidence.length === 0)) {
    return blocker("RECEIPT_OUTCOME_INVALID", stageId, "stopped receipt requires evidence and a stop reason without unknowns");
  }
  if (receipt.outcome === "UNKNOWN" && (receipt.unknowns.length === 0 || receipt.stopReasons.length > 0)) {
    return blocker("RECEIPT_OUTCOME_INVALID", stageId, "unknown receipt requires an unknown and cannot contain a stop reason");
  }
  if (receipt.outcome !== "UNKNOWN" && receipt.readback.state !== "VERIFIED") {
    return blocker("RECEIPT_READBACK_UNVERIFIED", stageId, "confirmed stage outcome requires verified fresh readback");
  }
  return null;
}

function evaluateCheckpoint(
  flowPackage: FlowPackage,
  evaluations: readonly StageEvaluation[],
  receipt: FlowCheckpointReceipt | null,
): { value: readonly AssuredFlowCheckpoint[]; blocker: FlowAssuranceBlocker | null } {
  return flowPackage.checkpoints.length === 0
    ? { value: [], blocker: null }
    : (() => {
        const declared = flowPackage.checkpoints[0]!;
        const subject = evaluations.find((evaluation) => evaluation.stage.stageId === declared.afterStage);
        const subjectComplete = subject?.receipt?.outcome === "COMPLETE" || subject?.receipt?.outcome === "COMPLETE_WITH_LIMIT";
        const base = {
          checkpoint: declared.decision,
          afterStage: declared.afterStage,
          beforeStage: declared.beforeStage,
          subjectReceiptId: subjectComplete ? subject?.receiptId ?? null : null,
        } as const;
        if (receipt === null) return {
          value: [{ ...base, state: "PENDING" as const, decisionReference: null }],
          blocker: null,
        };
        if (subject === undefined || subject.receipt === null || subject.receiptId === null || !subjectComplete) return {
          value: [{ ...base, state: "PENDING" as const, decisionReference: null }],
          blocker: blocker("CHECKPOINT_OUT_OF_ORDER", declared.beforeStage, "checkpoint receipt requires a completed plan receipt"),
        };
        if (receipt.subjectReceiptId !== subject.receiptId) return {
          value: [{ ...base, state: "PENDING" as const, decisionReference: null }],
          blocker: blocker("CHECKPOINT_SUBJECT_MISMATCH", declared.beforeStage, "checkpoint receipt does not bind the current plan receipt"),
        };
        if (Date.parse(receipt.decidedAt) < Date.parse(subject.receipt.readback.observedAt)) return {
          value: [{ ...base, state: "PENDING" as const, decisionReference: null }],
          blocker: blocker("CHECKPOINT_DECISION_STALE", declared.beforeStage, "checkpoint decision predates the plan receipt readback"),
        };
        return {
          value: [{
            ...base,
            state: receipt.decision === "ACCEPTED" ? "ACCEPTED" as const : "REJECTED" as const,
            decisionReference: receipt.decisionReference,
          }],
          blocker: null,
        };
      })();
}

function stageOrderBlocker(
  flowPackage: FlowPackage,
  evaluations: readonly StageEvaluation[],
  checkpoints: readonly AssuredFlowCheckpoint[],
): FlowAssuranceBlocker | null {
  const successful = new Set<string>();
  for (const evaluation of evaluations) {
    if (evaluation.receipt === null) continue;
    const stagePredecessors = evaluation.stage.predecessors.filter((predecessor) => !predecessor.startsWith("checkpoint:"));
    const gateNames = evaluation.stage.predecessors
      .filter((predecessor) => predecessor.startsWith("checkpoint:"))
      .map((predecessor) => predecessor.slice("checkpoint:".length));
    const prerequisitesReady = stagePredecessors.every((predecessor) => successful.has(predecessor))
      && gateNames.every((checkpoint) => checkpoints.some((entry) => entry.checkpoint === checkpoint && entry.state === "ACCEPTED"));
    if (!prerequisitesReady) return blocker("RECEIPT_OUT_OF_ORDER", evaluation.stage.stageId, "stage receipt precedes a required stage receipt or accepted checkpoint");
    if (evaluation.receipt.outcome === "COMPLETE" || evaluation.receipt.outcome === "COMPLETE_WITH_LIMIT") {
      successful.add(evaluation.stage.stageId);
    }
  }
  if (flowPackage.modules.length > 0 && evaluations.length !== flowPackage.modules.length) {
    return blocker("RECEIPT_OUT_OF_ORDER", null, "flow stage projection is incomplete");
  }
  return null;
}

function projectStages(
  flowPackage: FlowPackage,
  evaluations: readonly StageEvaluation[],
  checkpoints: readonly AssuredFlowCheckpoint[],
): readonly AssuredFlowStage[] {
  const completed = new Set<string>();
  const projected: AssuredFlowStage[] = [];
  for (const evaluation of evaluations) {
    const receipt = evaluation.receipt;
    if (receipt !== null) {
      projected.push({ stageId: evaluation.stage.stageId, module: evaluation.stage.module, state: receipt.outcome, receiptId: evaluation.receiptId });
      if (receipt.outcome === "COMPLETE" || receipt.outcome === "COMPLETE_WITH_LIMIT") completed.add(evaluation.stage.stageId);
      continue;
    }
    const ready = evaluation.stage.predecessors.every((predecessor) => predecessor.startsWith("checkpoint:")
      ? checkpoints.some((entry) => entry.checkpoint === predecessor.slice("checkpoint:".length) && entry.state === "ACCEPTED")
      : completed.has(predecessor));
    projected.push({
      stageId: evaluation.stage.stageId,
      module: evaluation.stage.module,
      state: ready ? "READY" : "PENDING",
      receiptId: null,
    });
  }
  return projected;
}

function packageNotReadyReport(flowPackage: FlowPackage, packageId: string): FlowAssuranceReport {
  const status = flowPackage.status;
  const blockers: FlowAssuranceBlocker[] = status === "STOPPED"
    ? flowPackage.stopReasons.map((reason) => blocker("PACKAGE_STOPPED", null, reason))
    : flowPackage.unknowns.map((field) => blocker("PACKAGE_UNKNOWN", null, `unknown required input: ${field}`));
  const stages = flowPackage.modules.map((stage): AssuredFlowStage => ({
    stageId: stage.stageId,
    module: stage.module,
    state: stage.state,
    receiptId: null,
  }));
  return report(flowPackage, packageId, status, stages, pendingCheckpoints(flowPackage), [], blockers, flowPackage.nextAction, emptyHandoff(flowPackage.nextAction));
}

function blockedReport(
  flowPackage: FlowPackage,
  packageId: string,
  blockerValue: FlowAssuranceBlocker,
  evaluations: readonly StageEvaluation[] = flowPackage.modules.map((stage) => ({ stage, receipt: null, receiptId: null, blocker: null })),
  checkpoints: readonly AssuredFlowCheckpoint[] = pendingCheckpoints(flowPackage),
): FlowAssuranceReport {
  const stages = evaluations.map((evaluation): AssuredFlowStage => ({
    stageId: evaluation.stage.stageId,
    module: evaluation.stage.module,
    state: blockerValue.stageId === evaluation.stage.stageId ? "STOPPED" : evaluation.receipt?.outcome ?? evaluation.stage.state,
    receiptId: evaluation.receiptId,
  }));
  const nextAction = blockerNextAction(blockerValue);
  return report(flowPackage, packageId, "STOPPED", stages, checkpoints, [], [blockerValue], nextAction, emptyHandoff(nextAction));
}

function buildHandoff(
  status: FlowAssuranceStatus,
  nextAction: string,
  evaluations: readonly StageEvaluation[],
  checkpoints: readonly AssuredFlowCheckpoint[],
  valid: boolean,
): FlowAssuranceHandoff {
  const terminal = status === "COMPLETE" || status === "COMPLETE_WITH_LIMIT" || status === "STOPPED" || status === "UNKNOWN";
  const receipts = evaluations.flatMap((evaluation) => evaluation.receipt === null ? [] : [evaluation.receipt]);
  const checkpointRejected = checkpoints.some((checkpoint) => checkpoint.state === "REJECTED");
  const ready = terminal && valid && (
    status === "COMPLETE"
    || status === "COMPLETE_WITH_LIMIT"
    || receipts.some((receipt) => receipt.outcome === status)
    || (status === "STOPPED" && checkpointRejected)
  );
  return {
    ready,
    status: ready ? status as FlowAssuranceHandoff["status"] : null,
    artifacts: receipts.flatMap((receipt) => receipt.artifacts),
    evidence: receipts.flatMap((receipt) => receipt.evidence),
    decisions: [
      ...receipts.flatMap((receipt) => receipt.decisions),
      ...checkpoints.flatMap((checkpoint) => checkpoint.decisionReference === null ? [] : [checkpoint.decisionReference]),
    ],
    unknowns: receipts.flatMap((receipt) => receipt.unknowns),
    limits: receipts.flatMap((receipt) => receipt.limits),
    stopReasons: receipts.flatMap((receipt) => receipt.stopReasons),
    nextAction,
  };
}

function nextActionFor(
  status: FlowAssuranceStatus,
  stages: readonly AssuredFlowStage[],
  checkpoints: readonly AssuredFlowCheckpoint[],
  evaluations: readonly StageEvaluation[],
): string {
  if (status === "COMPLETE" || status === "COMPLETE_WITH_LIMIT") return "PRESENT_HANDOFF_FOR_USER_ACCEPTANCE";
  if (status === "WAITING_FOR_APPROVAL") return "RECORD_CHECKPOINT:USER_ACCEPTS_PLAN";
  if (status === "STOPPED" || status === "UNKNOWN") {
    if (status === "STOPPED" && checkpoints.some((checkpoint) => checkpoint.state === "REJECTED")) return "REVISE_PLAN_OR_END_FLOW";
    const terminal = evaluations.find((evaluation) => evaluation.receipt?.outcome === status)?.receipt;
    return terminal?.nextAction ?? (status === "STOPPED" ? "REVIEW_STOPPED_HANDOFF" : "RESOLVE_UNKNOWN_EVIDENCE");
  }
  const runnable = stages.find((stage) => stage.state === "READY");
  if (runnable !== undefined) return `RUN_MODULE:${runnable.module}`;
  if (checkpoints.some((checkpoint) => checkpoint.state === "PENDING")) return "RECORD_CHECKPOINT:USER_ACCEPTS_PLAN";
  return "REVIEW_FLOW_STATE";
}

function report(
  flowPackage: FlowPackage,
  packageId: string,
  status: FlowAssuranceStatus,
  stages: readonly AssuredFlowStage[],
  checkpoints: readonly AssuredFlowCheckpoint[],
  runnableStages: readonly string[],
  blockers: readonly FlowAssuranceBlocker[],
  nextAction: string,
  handoff: FlowAssuranceHandoff,
): FlowAssuranceReport {
  return {
    reportVersion: "1.0",
    packageId,
    package: flowPackage,
    status,
    authority: "RECOMMENDATION_ONLY",
    executionPerformed: false,
    stages,
    checkpoints,
    runnableStages,
    blockers,
    nextAction,
    handoff,
  };
}

function pendingCheckpoints(flowPackage: FlowPackage): readonly AssuredFlowCheckpoint[] {
  return flowPackage.checkpoints.map((checkpoint) => ({
    checkpoint: checkpoint.decision,
    afterStage: checkpoint.afterStage,
    beforeStage: checkpoint.beforeStage,
    state: "PENDING",
    subjectReceiptId: null,
    decisionReference: null,
  }));
}

function emptyHandoff(nextAction: string): FlowAssuranceHandoff {
  return {
    ready: false,
    status: null,
    artifacts: [],
    evidence: [],
    decisions: [],
    unknowns: [],
    limits: [],
    stopReasons: [],
    nextAction,
  };
}

function blockerNextAction(value: FlowAssuranceBlocker): string {
  if (value.code === "RECEIPT_PACKAGE_MISMATCH") return "RECOMPOSE_AND_REISSUE_RECEIPT";
  if (value.code === "RECEIPT_OUT_OF_ORDER" || value.code === "CHECKPOINT_OUT_OF_ORDER") return "PROVIDE_PREDECESSOR_RECEIPTS";
  if (value.code === "CHECKPOINT_SUBJECT_MISMATCH" || value.code === "CHECKPOINT_DECISION_STALE") return "RECORD_MATCHING_CHECKPOINT";
  if (value.stageId !== null) return `CORRECT_STAGE_RECEIPT:${value.stageId}`;
  return "CORRECT_FLOW_RECEIPTS";
}

function readbackReceipt(value: unknown): FlowReadbackReceipt {
  const record = plainRecord(value, "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt readback");
  exactKeys(record, ["state", "revision", "observedAt"], "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt readback");
  const state = literal(record.state, ["VERIFIED", "UNAVAILABLE"], "stage receipt readback state");
  const revision = record.revision === null ? null : nonEmptyString(record.revision, "stage receipt readback revision");
  if ((state === "VERIFIED" && revision === null) || (state === "UNAVAILABLE" && revision !== null)) {
    invalidReceipt("stage receipt readback state and revision conflict");
  }
  return { state, revision, observedAt: timestampValue(record.observedAt, "stage receipt readback time") };
}

function artifactReceipts(value: unknown): readonly FlowArtifactReceipt[] {
  return dataList(value, "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt artifacts").map((entry) => {
    const record = plainRecord(entry, "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt artifact");
    exactKeys(record, ["section", "reference", "sha256"], "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt artifact");
    return {
      section: nonEmptyString(record.section, "stage receipt artifact section"),
      reference: nonEmptyString(record.reference, "stage receipt artifact reference"),
      sha256: sha256Value(record.sha256, "stage receipt artifact digest"),
    };
  });
}

function evidenceReceipts(value: unknown): readonly FlowEvidenceReceipt[] {
  return dataList(value, "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt evidence").map((entry) => {
    const record = plainRecord(entry, "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt evidence");
    exactKeys(record, ["requirement", "reference", "sha256"], "FLOW_ASSURANCE_RECEIPT_INVALID", "stage receipt evidence");
    return {
      requirement: nonEmptyString(record.requirement, "stage receipt evidence requirement"),
      reference: nonEmptyString(record.reference, "stage receipt evidence reference"),
      sha256: sha256Value(record.sha256, "stage receipt evidence digest"),
    };
  });
}

function flowIdentity(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalFlowJson(value)).digest("hex")}`;
}

function canonicalFlowJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalFlowJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalFlowJson(record[key])}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new FlowAssuranceError("FLOW_ASSURANCE_INPUT_INVALID", "flow identity does not support undefined");
  return serialized;
}

function blocker(code: FlowAssuranceBlockerCode, stageId: string | null, message: string): FlowAssuranceBlocker {
  return { code, stageId, message };
}

function receiptStageId(receipt: FlowStageReceipt | FlowCheckpointReceipt): string | null {
  return receipt.receiptKind === "STAGE" ? receipt.stageId : receipt.beforeStage;
}

function completedState(stages: readonly AssuredFlowStage[], stageId: string): boolean {
  const state = stages.find((stage) => stage.stageId === stageId)?.state;
  return state === "COMPLETE" || state === "COMPLETE_WITH_LIMIT";
}

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((entry) => actual.includes(entry));
}

function duplicate(values: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function plainRecord(value: unknown, code: FlowAssuranceErrorCode, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new FlowAssuranceError(code, `${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], code: FlowAssuranceErrorCode, label: string): void {
  const actual = Reflect.ownKeys(record);
  if (actual.length !== expected.length || actual.some((key) => typeof key !== "string" || !expected.includes(key))) {
    throw new FlowAssuranceError(code, `${label} fields are invalid`);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new FlowAssuranceError(code, `${label} fields are invalid`);
    }
  }
}

function literal<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) invalidReceipt(`${label} is invalid`);
  return value as T;
}

function packageIdValue(value: unknown): string {
  if (typeof value !== "string" || !packageIdPattern.test(value)) invalidReceipt("flow package identity is invalid");
  return value;
}

function identifierValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !identifierPattern.test(value)) invalidReceipt(`${label} is invalid`);
  return value;
}

function sha256Value(value: unknown, label: string): string {
  if (typeof value !== "string" || !sha256Pattern.test(value)) invalidReceipt(`${label} is invalid`);
  return value;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") invalidReceipt(`${label} must be a non-empty string`);
  return value;
}

function stringList(value: unknown, label: string): readonly string[] {
  const entries = dataList(value, "FLOW_ASSURANCE_RECEIPT_INVALID", label);
  if (entries.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(entries).size !== entries.length) {
    invalidReceipt(`${label} must be a unique string list`);
  }
  return entries as string[];
}

function dataList(value: unknown, code: FlowAssuranceErrorCode, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new FlowAssuranceError(code, `${label} must be a dense data list`);
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.length !== value.length + 1 || actualKeys.some((key) => {
    if (key === "length") return false;
    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/u.test(key)) return true;
    const index = Number(key);
    return !Number.isSafeInteger(index) || index < 0 || index >= value.length;
  })) {
    throw new FlowAssuranceError(code, `${label} must be a dense data list`);
  }
  const entries: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new FlowAssuranceError(code, `${label} must be a dense data list`);
    }
    entries.push(descriptor.value);
  }
  return entries;
}

function timestampValue(value: unknown, label: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) invalidReceipt(`${label} is invalid`);
  return value;
}

function invalidReceipt(message: string): never {
  throw new FlowAssuranceError("FLOW_ASSURANCE_RECEIPT_INVALID", message);
}

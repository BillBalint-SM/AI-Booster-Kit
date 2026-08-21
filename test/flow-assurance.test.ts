import assert from "node:assert/strict";
import { test } from "node:test";

import { assessFlow, FlowAssuranceError } from "../src/flow/assurance.js";
import type { FlowModulePacket } from "../src/flow/compose.js";

const digest = "a".repeat(64);
const observedAt = "2026-08-20T12:00:00.000Z";

const defaultRequest = {
  requestVersion: "1.0",
  selection: { kind: "flow", flow: "default-change" },
  objective: "Deliver a bounded local change with evidence.",
  inputs: {
    "current-scope": "Add receipt-backed Flow assurance.",
    constraints: ["No persistence, dispatch, or external action."],
    "open-questions": [],
    repository: "AI Booster Kit",
    "repository-state": "VERIFIED",
    "test-strategy": ["Exercise the public assessment seam."],
    "rollback-boundary": "Keep the change local, reversible, and uncommitted.",
    "known-limits": [],
  },
  unknowns: [],
} as const;

test("flow assurance: identifies a canonical package and recommends only the first runnable module", () => {
  const input = assessmentInput(defaultRequest, []);
  const before = structuredClone(input);
  const result = assessFlow(input);

  assert.match(result.packageId, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(result.status, "READY");
  assert.deepEqual(result.runnableStages, ["plan-1"]);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.stages.map((stage) => stage.state), ["READY", "PENDING", "PENDING", "PENDING"]);
  assert.equal(result.nextAction, "RUN_MODULE:plan");
  assert.equal(result.handoff.ready, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(result.authority, "RECOMMENDATION_ONLY");
  assert.equal(result.package.executionPerformed, false);
  assert.deepEqual(input, before);

  const reordered = {
    assessmentVersion: "1.0",
    receipts: [],
    request: {
      unknowns: [],
      inputs: { ...defaultRequest.inputs },
      objective: defaultRequest.objective,
      selection: { flow: "default-change", kind: "flow" },
      requestVersion: "1.0",
    },
  };
  assert.equal(assessFlow(reordered).packageId, result.packageId);

  const changedConstraint = {
    ...defaultRequest,
    inputs: {
      ...defaultRequest.inputs,
      constraints: ["A materially different authority boundary."],
    },
  };
  assert.notEqual(
    assessFlow(assessmentInput(changedConstraint, [])).packageId,
    result.packageId,
  );
});

test("flow assurance: requires the exact human checkpoint after a completed plan", () => {
  const initial = assessFlow(assessmentInput(defaultRequest, []));
  const plan = completeStageReceipt(initial.packageId, initial.package.modules[0]!);
  const waiting = assessFlow(assessmentInput(defaultRequest, [plan]));
  const planState = waiting.stages[0]!;

  assert.equal(waiting.status, "WAITING_FOR_APPROVAL");
  assert.deepEqual(waiting.runnableStages, []);
  assert.equal(planState.state, "COMPLETE");
  assert.match(planState.receiptId ?? "", /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(waiting.checkpoints, [{
    checkpoint: "USER_ACCEPTS_PLAN",
    afterStage: "plan-1",
    beforeStage: "implement-2",
    state: "PENDING",
    subjectReceiptId: planState.receiptId,
    decisionReference: null,
  }]);
  assert.equal(waiting.nextAction, "RECORD_CHECKPOINT:USER_ACCEPTS_PLAN");

  const accepted = checkpointReceipt(initial.packageId, planState.receiptId!);
  const ready = assessFlow(assessmentInput(defaultRequest, [accepted, plan]));

  assert.equal(ready.status, "READY");
  assert.deepEqual(ready.runnableStages, ["implement-2"]);
  assert.equal(ready.stages[1]?.state, "READY");
  assert.equal(ready.checkpoints[0]?.state, "ACCEPTED");
  assert.equal(ready.nextAction, "RUN_MODULE:implement");

  const rejectedCheckpoint = { ...accepted, decision: "REJECTED" };
  const rejected = assessFlow(assessmentInput(defaultRequest, [plan, rejectedCheckpoint]));
  assert.equal(rejected.status, "STOPPED");
  assert.equal(rejected.checkpoints[0]?.state, "REJECTED");
  assert.equal(rejected.blockers[0]?.code, "CHECKPOINT_REJECTED");
  assert.equal(rejected.handoff.ready, true);
  assert.equal(rejected.nextAction, "REVISE_PLAN_OR_END_FLOW");

  const staleCheckpoint = { ...accepted, decidedAt: "2026-08-20T11:59:59.000Z" };
  const stale = assessFlow(assessmentInput(defaultRequest, [plan, staleCheckpoint]));
  assert.equal(stale.status, "STOPPED");
  assert.equal(stale.blockers[0]?.code, "CHECKPOINT_DECISION_STALE");
});

test("flow assurance: reaches a review-ready handoff only after every stage contract is evidenced", () => {
  const initial = assessFlow(assessmentInput(defaultRequest, []));
  const plan = completeStageReceipt(initial.packageId, initial.package.modules[0]!);
  const afterPlan = assessFlow(assessmentInput(defaultRequest, [plan]));
  const checkpoint = checkpointReceipt(initial.packageId, afterPlan.stages[0]!.receiptId!);
  const implement = completeStageReceipt(initial.packageId, initial.package.modules[1]!);
  const verify = completeStageReceipt(initial.packageId, initial.package.modules[2]!);
  const review = completeStageReceipt(initial.packageId, initial.package.modules[3]!);

  const result = assessFlow(assessmentInput(defaultRequest, [review, checkpoint, implement, plan, verify]));

  assert.equal(result.status, "COMPLETE");
  assert.deepEqual(result.runnableStages, []);
  assert.deepEqual(result.blockers, []);
  assert.ok(result.stages.every((stage) => stage.state === "COMPLETE"));
  assert.equal(result.handoff.ready, true);
  assert.equal(result.handoff.status, "COMPLETE");
  assert.equal(result.handoff.artifacts.length, 12);
  assert.equal(result.handoff.evidence.length, 12);
  assert.deepEqual(result.handoff.decisions, ["decision://accept-plan"]);
  assert.deepEqual(result.handoff.unknowns, []);
  assert.deepEqual(result.handoff.limits, []);
  assert.equal(result.nextAction, "PRESENT_HANDOFF_FOR_USER_ACCEPTANCE");
});

test("flow assurance: preserves a successful limited result without upgrading it to complete", () => {
  const initial = assessFlow(assessmentInput(defaultRequest, []));
  const plan = completeStageReceipt(initial.packageId, initial.package.modules[0]!);
  const afterPlan = assessFlow(assessmentInput(defaultRequest, [plan]));
  const receipts = [
    plan,
    checkpointReceipt(initial.packageId, afterPlan.stages[0]!.receiptId!),
    completeStageReceipt(initial.packageId, initial.package.modules[1]!),
    completeStageReceipt(initial.packageId, initial.package.modules[2]!),
    completeStageReceipt(initial.packageId, initial.package.modules[3]!, {
      outcome: "COMPLETE_WITH_LIMIT",
      limits: ["No external-host conformance was claimed."],
    }),
  ];

  const result = assessFlow(assessmentInput(defaultRequest, receipts));

  assert.equal(result.status, "COMPLETE_WITH_LIMIT");
  assert.equal(result.stages[3]?.state, "COMPLETE_WITH_LIMIT");
  assert.equal(result.handoff.ready, true);
  assert.equal(result.handoff.status, "COMPLETE_WITH_LIMIT");
  assert.deepEqual(result.handoff.limits, ["No external-host conformance was claimed."]);
});

test("flow assurance: fails closed when a claimed success lacks required evidence", () => {
  const initial = assessFlow(assessmentInput(defaultRequest, []));
  const plan = completeStageReceipt(initial.packageId, initial.package.modules[0]!);
  plan.evidence = plan.evidence.slice(1);

  const result = assessFlow(assessmentInput(defaultRequest, [plan]));

  assert.equal(result.status, "STOPPED");
  assert.equal(result.stages[0]?.state, "STOPPED");
  assert.deepEqual(result.blockers.map((blocker) => blocker.code), ["RECEIPT_EVIDENCE_INCOMPLETE"]);
  assert.equal(result.nextAction, "CORRECT_STAGE_RECEIPT:plan-1");
  assert.equal(result.handoff.ready, false);
});

test("flow assurance: rejects foreign, out-of-order, and mismatched approval receipts visibly", () => {
  const initial = assessFlow(assessmentInput(defaultRequest, []));
  const foreignPlan = completeStageReceipt(`sha256:${"b".repeat(64)}`, initial.package.modules[0]!);
  const foreign = assessFlow(assessmentInput(defaultRequest, [foreignPlan]));
  assert.equal(foreign.status, "STOPPED");
  assert.equal(foreign.blockers[0]?.code, "RECEIPT_PACKAGE_MISMATCH");

  const implement = completeStageReceipt(initial.packageId, initial.package.modules[1]!);
  const outOfOrder = assessFlow(assessmentInput(defaultRequest, [implement]));
  assert.equal(outOfOrder.status, "STOPPED");
  assert.equal(outOfOrder.blockers[0]?.code, "RECEIPT_OUT_OF_ORDER");

  const plan = completeStageReceipt(initial.packageId, initial.package.modules[0]!);
  const wrongCheckpoint = checkpointReceipt(initial.packageId, `sha256:${"c".repeat(64)}`);
  const mismatched = assessFlow(assessmentInput(defaultRequest, [plan, wrongCheckpoint]));
  assert.equal(mismatched.status, "STOPPED");
  assert.equal(mismatched.blockers[0]?.code, "CHECKPOINT_SUBJECT_MISMATCH");
});

test("flow assurance: keeps explicit STOPPED and UNKNOWN stage outcomes terminal and reviewable", () => {
  const initial = assessFlow(assessmentInput(defaultRequest, []));
  const stoppedReceipt = completeStageReceipt(initial.packageId, initial.package.modules[0]!, {
    outcome: "STOPPED",
    artifacts: [],
    evidence: [evidenceFor(initial.package.modules[0]!.evidenceRequirements[0]!, "plan-stop")],
    stopReasons: ["The accepted scope conflicts with a binding constraint."],
    nextAction: "RECONCILE_SCOPE_CONFLICT",
  });
  const stopped = assessFlow(assessmentInput(defaultRequest, [stoppedReceipt]));
  assert.equal(stopped.status, "STOPPED");
  assert.equal(stopped.nextAction, "RECONCILE_SCOPE_CONFLICT");
  assert.equal(stopped.handoff.ready, true);
  assert.deepEqual(stopped.handoff.stopReasons, ["The accepted scope conflicts with a binding constraint."]);

  const unknownReceipt = completeStageReceipt(initial.packageId, initial.package.modules[0]!, {
    outcome: "UNKNOWN",
    artifacts: [],
    evidence: [],
    unknowns: ["Repository readback was unavailable."],
    nextAction: "RETRY_READBACK_OR_STOP",
    readback: { state: "UNAVAILABLE", revision: null, observedAt },
  });
  const unknown = assessFlow(assessmentInput(defaultRequest, [unknownReceipt]));
  assert.equal(unknown.status, "UNKNOWN");
  assert.equal(unknown.nextAction, "RETRY_READBACK_OR_STOP");
  assert.equal(unknown.handoff.ready, true);
  assert.deepEqual(unknown.handoff.unknowns, ["Repository readback was unavailable."]);
});

test("flow assurance: propagates composition uncertainty and rejects malformed input", () => {
  const unknownRequest = {
    requestVersion: "1.0",
    selection: { kind: "module", module: "review" },
    objective: "Review a bounded change.",
    inputs: {
      claim: "The local change is review-ready.",
      "acceptance-criteria": ["The diff matches the accepted scope."],
      "evidence-sources": ["local diff"],
    },
    unknowns: ["known-limits"],
  };
  const unknown = assessFlow(assessmentInput(unknownRequest, []));
  assert.equal(unknown.status, "UNKNOWN");
  assert.deepEqual(unknown.runnableStages, []);
  assert.equal(unknown.nextAction, "RESOLVE_UNKNOWN_INPUTS");

  assert.throws(() => assessFlow({
    assessmentVersion: "1.0",
    request: defaultRequest,
    receipts: [],
    foreign: true,
  }), (error: unknown) => {
    assert.ok(error instanceof FlowAssuranceError);
    assert.equal(error.code, "FLOW_ASSURANCE_INPUT_INVALID");
    return true;
  });

  assert.throws(() => assessFlow({
    assessmentVersion: "1.0",
    request: defaultRequest,
    receipts: Array(1),
  }), (error: unknown) => {
    assert.ok(error instanceof FlowAssuranceError);
    assert.equal(error.code, "FLOW_ASSURANCE_INPUT_INVALID");
    return true;
  });
});

function assessmentInput(request: unknown, receipts: readonly unknown[]) {
  return { assessmentVersion: "1.0", request, receipts };
}

function completeStageReceipt(
  packageId: string,
  stage: FlowModulePacket,
  overrides: Record<string, unknown> = {},
) {
  return {
    receiptVersion: "1.0",
    receiptKind: "STAGE",
    packageId,
    stageId: stage.stageId,
    module: stage.module,
    outcome: "COMPLETE",
    artifacts: stage.expectedOutput.map((section) => ({
      section,
      reference: `artifact://${stage.stageId}/${section}`,
      sha256: digest,
    })),
    evidence: stage.evidenceRequirements.map((requirement) => evidenceFor(requirement, stage.stageId)),
    decisions: [],
    unknowns: [],
    limits: [],
    stopReasons: [],
    nextAction: `CONTINUE_AFTER:${stage.stageId}`,
    readback: { state: "VERIFIED", revision: "git:verified-revision", observedAt },
    ...overrides,
  };
}

function evidenceFor(requirement: string, suffix: string) {
  return {
    requirement,
    reference: `evidence://${suffix}/${requirement}`,
    sha256: digest,
  };
}

function checkpointReceipt(packageId: string, subjectReceiptId: string) {
  return {
    receiptVersion: "1.0",
    receiptKind: "CHECKPOINT",
    packageId,
    checkpoint: "USER_ACCEPTS_PLAN",
    afterStage: "plan-1",
    beforeStage: "implement-2",
    subjectReceiptId,
    decision: "ACCEPTED",
    decisionReference: "decision://accept-plan",
    decidedAt: "2026-08-20T12:05:00.000Z",
  };
}

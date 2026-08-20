import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  BoosterCompassError,
  projectDeliveryCompass,
  type BoosterArtifact,
  type BoosterSkillRegistry,
} from "../src/booster/compass.js";

test("delivery compass starts a new session and recommends the first independent skill", () => {
  const input = {
    requestVersion: "1.0",
    mode: "AUTO",
    collaboration: "INDIVIDUAL",
    objective: null,
    preferredSkill: null,
    artifacts: [],
    facts: [],
    decisions: [],
    evidence: [],
    unknowns: [],
    constraints: [],
    stopReasons: [],
  };
  const registry = {
    registryVersion: "1.0",
    kit: "ai-booster-kit",
    skills: [planningSkill()],
  };

  const result = projectDeliveryCompass(input, registry);

  assert.equal(result.status, "READY");
  assert.equal(result.sessionMode, "NEW");
  assert.equal(result.observedStage, "INTAKE");
  assert.equal(result.recommendation?.skillId, "planning-show");
  assert.equal(result.recommendation?.invocation.codex, "$planning-show");
  assert.deepEqual(result.availableSkills, ["planning-show"]);
  assert.equal(result.authority, "RECOMMENDATION_ONLY");
  assert.equal(result.executionPerformed, false);
  assert.equal(result.persistencePerformed, false);
  assert.match(result.compassId, /^sha256:[a-f0-9]{64}$/u);
});

test("canonical registry guides the default individual flow through explicit gates to handoff", async () => {
  const registry = await loadCanonicalRegistry();

  const waiting = projectDeliveryCompass(request({ artifacts: planArtifacts() }), registry);
  assert.equal(waiting.status, "WAITING_FOR_DECISION");
  assert.equal(waiting.recommendation, null);
  assert.deepEqual(waiting.blockers, [
    { code: "HUMAN_DECISION_REQUIRED", skillId: "booster-implement", missing: ["accepted-plan"] },
    { code: "REQUIRED_INPUT_MISSING", skillId: "booster-implement", missing: ["repository-verified"] },
  ]);
  assert.equal(waiting.nextAction, "ACCEPT_OR_REVISE_DECISION_GATE");

  const implementation = projectDeliveryCompass(request({
    artifacts: [...planArtifacts(), acceptedPlan(), verifiedRepository()],
  }), registry);
  assert.equal(implementation.status, "READY");
  assert.equal(implementation.recommendation?.skillId, "booster-implement");

  const validation = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      acceptedPlan(),
      verifiedRepository(),
      ...implementationArtifacts(),
    ],
  }), registry);
  assert.equal(validation.recommendation?.skillId, "booster-test");

  const review = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      acceptedPlan(),
      verifiedRepository(),
      ...implementationArtifacts(),
      ...validationArtifacts(),
    ],
  }), registry);
  assert.equal(review.recommendation?.skillId, "booster-review");

  const handoff = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      acceptedPlan(),
      verifiedRepository(),
      ...implementationArtifacts(),
      ...validationArtifacts(),
      ...reviewArtifacts(),
    ],
  }), registry);
  assert.equal(handoff.recommendation?.skillId, "booster-handoff");

  const complete = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      acceptedPlan(),
      verifiedRepository(),
      ...implementationArtifacts(),
      ...validationArtifacts(),
      ...reviewArtifacts(),
      artifact("delivery-handoff"),
    ],
  }), registry);
  assert.equal(complete.status, "COMPLETE");
  assert.equal(complete.completionScope, "SESSION");
  assert.equal(complete.observedStage, "COMPLETE");
  assert.equal(complete.handoffReady, true);
  assert.equal(complete.recommendation, null);
});

test("draft or incorrectly bound authority gates never make implementation ready", async () => {
  const registry = await loadCanonicalRegistry();
  const draft = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      artifact("accepted-plan", "DECLARED", "local:plan-handoff"),
      verifiedRepository(),
    ],
  }), registry);
  assert.equal(draft.status, "WAITING_FOR_DECISION");
  assert.deepEqual(draft.blockers, [
    { code: "GATE_STATE_INVALID", skillId: "booster-implement", missing: ["accepted-plan"] },
  ]);

  const wrongBinding = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      artifact("accepted-plan", "ACCEPTED", "local:old-plan-handoff"),
      verifiedRepository(),
    ],
  }), registry);
  assert.equal(wrongBinding.status, "WAITING_FOR_DECISION");
  assert.deepEqual(wrongBinding.blockers, [
    { code: "GATE_BINDING_INVALID", skillId: "booster-implement", missing: ["accepted-plan"] },
  ]);

  const staleRepository = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      acceptedPlan(),
      artifact("repository-verified", "DECLARED"),
    ],
  }), registry);
  assert.equal(staleRepository.status, "NEEDS_INPUT");
  assert.deepEqual(staleRepository.blockers, [
    { code: "GATE_STATE_INVALID", skillId: "booster-implement", missing: ["repository-verified"] },
  ]);
});

test("accepted authority cannot bind implementation to a plan handoff that is only declared", async () => {
  const registry = await loadCanonicalRegistry();
  const result = projectDeliveryCompass(request({
    preferredSkill: "booster-implement",
    artifacts: [
      artifact("refined-scope"),
      artifact("acceptance-criteria"),
      artifact("decision-record"),
      artifact("plan-handoff", "DECLARED"),
      acceptedPlan(),
      verifiedRepository(),
    ],
  }), registry);

  assert.equal(result.status, "NEEDS_INPUT");
  assert.equal(result.recommendation, null);
  assert.deepEqual(result.blockers, [
    { code: "ARTIFACT_STATE_INVALID", skillId: "booster-implement", missing: ["plan-handoff"] },
  ]);
});

test("registry bindings must target an artifact consumed by the gated skill", () => {
  const skill = planningSkill();
  const registry = {
    registryVersion: "1.0",
    kit: "ai-booster-kit",
    skills: [{
      ...skill,
      gates: [{ type: "accepted-plan", states: ["ACCEPTED"], bindsTo: "plan-handoff" }],
    }],
  };

  assert.throws(
    () => projectDeliveryCompass(request(), registry),
    (error: unknown) => error instanceof BoosterCompassError
      && error.code === "INVALID_REGISTRY"
      && /binds to unconsumed artifact plan-handoff/u.test(error.message),
  );
});

test("canonical registry inserts explicit team alignment without changing the individual flow", async () => {
  const registry = await loadCanonicalRegistry();
  const result = projectDeliveryCompass(request({ collaboration: "TEAM", artifacts: planArtifacts() }), registry);

  assert.equal(result.status, "READY");
  assert.equal(result.recommendation?.skillId, "booster-team-align");
  assert.ok(result.availableSkills.includes("booster-team-align"));
  assert.equal(result.collaboration, "TEAM");
});

test("compass can attach to in-progress work and recommends contract recovery", async () => {
  const registry = await loadCanonicalRegistry();
  const result = projectDeliveryCompass(request({
    mode: "AUTO",
    artifacts: [artifact("reviewable-diff")],
  }), registry);

  assert.equal(result.sessionMode, "ATTACH");
  assert.equal(result.observedStage, "IMPLEMENT");
  assert.equal(result.recommendation?.skillId, "planning-show");
  assert.match(result.recommendation?.reason ?? "", /Recover the missing plan contract/u);
});

test("an independently selected skill is routed when its own declared contract is satisfied", async () => {
  const registry = await loadCanonicalRegistry();
  const result = projectDeliveryCompass(request({
    preferredSkill: "booster-test",
    artifacts: [artifact("acceptance-criteria"), ...implementationArtifacts()],
  }), registry);

  assert.equal(result.status, "READY");
  assert.equal(result.preferredSkill, "booster-test");
  assert.equal(result.recommendation?.skillId, "booster-test");
  assert.equal(result.completionScope, null);

  const complete = projectDeliveryCompass(request({
    preferredSkill: "booster-test",
    artifacts: [artifact("acceptance-criteria"), ...implementationArtifacts(), ...validationArtifacts()],
  }), registry);
  assert.equal(complete.status, "COMPLETE");
  assert.equal(complete.completionScope, "SKILL");
  assert.equal(complete.nextAction, "REVIEW_SKILL_OUTPUT");
  assert.equal(complete.handoffReady, false);
  assert.match(complete.narrative, /selected Skill booster-test is complete/u);
  assert.doesNotMatch(complete.narrative, /delivery handoff is complete/u);
});

test("stop and unknown states remain visible and never imply execution", async () => {
  const registry = await loadCanonicalRegistry();
  const stopped = projectDeliveryCompass(request({ stopReasons: ["Repository authority was revoked."] }), registry);
  assert.equal(stopped.status, "STOPPED");
  assert.equal(stopped.recommendation, null);
  assert.equal(stopped.nextAction, "REVIEW_STOP_REASONS");

  const unknown = projectDeliveryCompass(request({
    preferredSkill: "booster-review",
    unknowns: ["The validation evidence cannot be read back."],
    artifacts: [artifact("acceptance-criteria"), artifact("reviewable-diff")],
  }), registry);
  assert.equal(unknown.status, "UNKNOWN");
  assert.equal(unknown.recommendation, null);
  assert.equal(unknown.executionPerformed, false);
  assert.equal(unknown.persistencePerformed, false);
});

test("compass is deterministic, does not mutate caller input, and rejects foreign fields", async () => {
  const registry = await loadCanonicalRegistry();
  const input = request({ objective: "Deliver a portable workflow kit." });
  const before = structuredClone(input);

  const first = projectDeliveryCompass(input, registry);
  const second = projectDeliveryCompass(structuredClone(input), structuredClone(registry));

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.throws(
    () => projectDeliveryCompass({ ...input, dispatch: true }, registry),
    (error: unknown) => error instanceof BoosterCompassError && error.code === "INVALID_INPUT",
  );
  assert.throws(
    () => projectDeliveryCompass({ ...input, facts: ["same", "same"] }, registry),
    (error: unknown) => error instanceof BoosterCompassError && error.code === "INVALID_INPUT",
  );
});

test("artifact declarations are an order-independent set for Compass identity", async () => {
  const registry = await loadCanonicalRegistry();
  const artifacts = [...planArtifacts(), acceptedPlan(), verifiedRepository()];

  const first = projectDeliveryCompass(request({ artifacts }), registry);
  const reordered = projectDeliveryCompass(request({ artifacts: [...artifacts].reverse() }), registry);

  assert.deepEqual(first, reordered);
});

test("full-session completion cannot erase missing historical authority gates", async () => {
  const registry = await loadCanonicalRegistry();
  const result = projectDeliveryCompass(request({
    artifacts: [
      ...planArtifacts(),
      ...implementationArtifacts(),
      ...validationArtifacts(),
      ...reviewArtifacts(),
      artifact("delivery-handoff"),
    ],
  }), registry);

  assert.equal(result.status, "WAITING_FOR_DECISION");
  assert.equal(result.completionScope, null);
  assert.equal(result.handoffReady, false);
  assert.deepEqual(result.blockers, [
    { code: "HUMAN_DECISION_REQUIRED", skillId: "booster-implement", missing: ["accepted-plan"] },
    { code: "REQUIRED_INPUT_MISSING", skillId: "booster-implement", missing: ["repository-verified"] },
  ]);
});

test("untrusted request arrays reject accessors without evaluating them", async () => {
  const registry = await loadCanonicalRegistry();
  let getterEvaluated = false;
  const facts: string[] = [];
  Object.defineProperty(facts, 0, {
    enumerable: true,
    configurable: true,
    get() {
      getterEvaluated = true;
      return "untrusted";
    },
  });

  assert.throws(
    () => projectDeliveryCompass(request({ facts }), registry),
    (error: unknown) => error instanceof BoosterCompassError && error.code === "INVALID_INPUT",
  );
  assert.equal(getterEvaluated, false);
});

function planningSkill() {
  return {
    id: "planning-show",
    version: "1.0",
    module: "plan",
    purpose: "Refine the delivery objective and produce an accepted planning contract.",
    modes: ["INDIVIDUAL", "TEAM"],
    consumes: [],
    teamConsumes: [],
    gates: [],
    produces: ["objective", "refined-scope", "acceptance-criteria", "decision-record"],
    suggests: [],
    stops: ["Unresolved product decision or unsafe scope expansion."],
    invocation: {
      codex: "$planning-show",
      claudeCode: "/planning-show",
    },
  };
}

function request(overrides: Partial<{
  mode: "AUTO" | "NEW" | "ATTACH" | "RESUME";
  collaboration: "INDIVIDUAL" | "TEAM";
  objective: string | null;
  preferredSkill: string | null;
  artifacts: BoosterArtifact[];
  facts: string[];
  decisions: string[];
  evidence: string[];
  unknowns: string[];
  constraints: string[];
  stopReasons: string[];
}> = {}) {
  return {
    requestVersion: "1.0",
    mode: "AUTO",
    collaboration: "INDIVIDUAL",
    objective: "Ship a reviewable delivery change.",
    preferredSkill: null,
    artifacts: [],
    facts: [],
    decisions: [],
    evidence: [],
    unknowns: [],
    constraints: ["No hidden external action."],
    stopReasons: [],
    ...overrides,
  };
}

function artifact(
  type: string,
  state: BoosterArtifact["state"] = "COMPLETE",
  bindsTo: string | null = null,
): BoosterArtifact {
  return { type, reference: `local:${type}`, state, bindsTo };
}

function planArtifacts(): BoosterArtifact[] {
  return [
    artifact("refined-scope"),
    artifact("acceptance-criteria"),
    artifact("decision-record"),
    artifact("plan-handoff"),
  ];
}

function acceptedPlan(): BoosterArtifact {
  return artifact("accepted-plan", "ACCEPTED", "local:plan-handoff");
}

function verifiedRepository(): BoosterArtifact {
  return artifact("repository-verified", "VERIFIED");
}

function implementationArtifacts(): BoosterArtifact[] {
  return [artifact("reviewable-diff"), artifact("implementation-evidence"), artifact("residual-risk-record")];
}

function validationArtifacts(): BoosterArtifact[] {
  return [artifact("validation-result"), artifact("test-evidence"), artifact("evidence-map")];
}

function reviewArtifacts(): BoosterArtifact[] {
  return [artifact("review-result"), artifact("review-evidence"), artifact("review-limit-record")];
}

async function loadCanonicalRegistry(): Promise<BoosterSkillRegistry> {
  return JSON.parse(await readFile(resolve("contract/booster/skill-registry.json"), "utf8")) as BoosterSkillRegistry;
}

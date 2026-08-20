import { createHash } from "node:crypto";

const INPUT_KEYS = [
  "requestVersion",
  "mode",
  "collaboration",
  "objective",
  "preferredSkill",
  "artifacts",
  "facts",
  "decisions",
  "evidence",
  "unknowns",
  "constraints",
  "stopReasons",
] as const;

const REGISTRY_KEYS = ["registryVersion", "kit", "skills"] as const;
const ARTIFACT_KEYS = ["type", "reference", "state", "bindsTo"] as const;
const GATE_KEYS = ["type", "states", "bindsTo"] as const;
const SKILL_KEYS = [
  "id",
  "version",
  "module",
  "purpose",
  "modes",
  "consumes",
  "teamConsumes",
  "gates",
  "produces",
  "suggests",
  "stops",
  "invocation",
] as const;

const MAX_SKILLS = 64;
const MAX_ARTIFACTS = 256;
const MAX_LIST_ITEMS = 256;
const MAX_TEXT_LENGTH = 8_192;

export type BoosterSessionMode = "NEW" | "ATTACH" | "RESUME";
export type BoosterCollaboration = "INDIVIDUAL" | "TEAM";
export type BoosterModule = "plan" | "align" | "implement" | "test" | "review" | "handoff";
export type BoosterCompassStatus =
  | "READY"
  | "WAITING_FOR_DECISION"
  | "NEEDS_INPUT"
  | "COMPLETE"
  | "STOPPED"
  | "UNKNOWN";
export type BoosterStage = "INTAKE" | "PLAN" | "ALIGN" | "IMPLEMENT" | "TEST" | "REVIEW" | "HANDOFF" | "COMPLETE";
export type BoosterArtifactState =
  | "DECLARED"
  | "VERIFIED"
  | "ACCEPTED"
  | "COMPLETE"
  | "COMPLETE_WITH_LIMIT"
  | "STOPPED"
  | "UNKNOWN";

export interface BoosterArtifact {
  type: string;
  reference: string;
  state: BoosterArtifactState;
  bindsTo: string | null;
}

export interface BoosterGate {
  type: string;
  states: BoosterArtifactState[];
  bindsTo: string | null;
}

export interface BoosterSkillDescriptor {
  id: string;
  version: string;
  module: BoosterModule;
  purpose: string;
  modes: BoosterCollaboration[];
  consumes: string[];
  teamConsumes: string[];
  gates: BoosterGate[];
  produces: string[];
  suggests: string[];
  stops: string[];
  invocation: {
    codex: string;
    claudeCode: string;
  };
}

export interface BoosterSkillRegistry {
  registryVersion: "1.0";
  kit: "ai-booster-kit";
  skills: BoosterSkillDescriptor[];
}

export interface BoosterCompassRecommendation {
  skillId: string;
  module: BoosterModule;
  purpose: string;
  reason: string;
  invocation: {
    codex: string;
    claudeCode: string;
  };
  missingInputs: string[];
  suggestedContinuations: string[];
}

export interface BoosterCompassBlocker {
  code:
    | "REQUIRED_INPUT_MISSING"
    | "ARTIFACT_STATE_INVALID"
    | "HUMAN_DECISION_REQUIRED"
    | "GATE_STATE_INVALID"
    | "GATE_BINDING_INVALID";
  skillId: string;
  missing: string[];
}

export interface DeliveryCompass {
  compassVersion: "1.0";
  compassId: string;
  kit: "ai-booster-kit";
  status: BoosterCompassStatus;
  sessionMode: BoosterSessionMode;
  collaboration: BoosterCollaboration;
  observedStage: BoosterStage;
  objective: string | null;
  preferredSkill: string | null;
  completionScope: "SKILL" | "SESSION" | null;
  narrative: string;
  facts: string[];
  decisions: string[];
  evidence: string[];
  unknowns: string[];
  constraints: string[];
  recommendation: BoosterCompassRecommendation | null;
  availableSkills: string[];
  blockers: BoosterCompassBlocker[];
  nextAction: string;
  handoffReady: boolean;
  authority: "RECOMMENDATION_ONLY";
  executionPerformed: false;
  persistencePerformed: false;
}

interface ParsedCompassInput {
  requestVersion: "1.0";
  mode: "AUTO" | BoosterSessionMode;
  collaboration: BoosterCollaboration;
  objective: string | null;
  preferredSkill: string | null;
  artifacts: BoosterArtifact[];
  facts: string[];
  decisions: string[];
  evidence: string[];
  unknowns: string[];
  constraints: string[];
  stopReasons: string[];
}

interface SkillReadiness {
  missing: string[];
  invalidInputState: string[];
  invalidState: string[];
  invalidBinding: string[];
  ready: boolean;
}

export class BoosterCompassError extends Error {
  readonly code: "INVALID_INPUT" | "INVALID_REGISTRY";

  constructor(code: "INVALID_INPUT" | "INVALID_REGISTRY", message: string) {
    super(message);
    this.name = "BoosterCompassError";
    this.code = code;
  }
}

/**
 * Projects one user-controlled Delivery Session without invoking a skill,
 * persisting state, selecting a model, or granting authority.
 */
export function projectDeliveryCompass(value: unknown, registryValue: unknown): DeliveryCompass {
  const input = parseInput(value);
  const registry = parseRegistry(registryValue);
  const sessionMode = resolveSessionMode(input);
  const artifactsByType = new Map(input.artifacts.map((artifact) => [artifact.type, artifact] as const));
  const present = new Set(
    input.artifacts
      .filter((artifact) => artifact.state !== "STOPPED" && artifact.state !== "UNKNOWN")
      .map((artifact) => artifact.type),
  );
  if (input.objective !== null) present.add("objective");

  const activeSkills = registry.skills.filter((skill) => skill.modes.includes(input.collaboration));
  const preferred = input.preferredSkill === null
    ? null
    : activeSkills.find((skill) => skill.id === input.preferredSkill) ?? fail(
      "INVALID_INPUT",
      `preferredSkill ${input.preferredSkill} is not available in ${input.collaboration} mode`,
    );
  const skillReadiness = new Map(
    activeSkills.map((skill) => [skill.id, assessSkill(skill, input.collaboration, present, artifactsByType)] as const),
  );
  const completed = new Set(
    activeSkills
      .filter((skill) => skillReadiness.get(skill.id)?.ready === true)
      .filter((skill) => skill.produces.every((artifactType) => outputIsComplete(artifactType, input, artifactsByType)))
      .map((skill) => skill.id),
  );
  const incomplete = activeSkills.filter((skill) => !completed.has(skill.id));
  const available = incomplete.filter((skill) => skillReadiness.get(skill.id)?.ready === true);
  const preferredComplete = preferred !== null && completed.has(preferred.id);
  const recommended = preferred === null
    ? available[0] ?? null
    : preferredComplete
      ? null
      : available.find((skill) => skill.id === preferred.id) ?? null;
  const firstIncomplete = preferred !== null && !preferredComplete ? preferred : incomplete[0] ?? null;
  const focusedReadiness = firstIncomplete === null ? emptyReadiness() : skillReadiness.get(firstIncomplete.id) ?? emptyReadiness();
  const missing = focusedReadiness.missing;
  const blockedArtifacts = uniqueValues([
    ...missing,
    ...focusedReadiness.invalidInputState,
    ...focusedReadiness.invalidState,
    ...focusedReadiness.invalidBinding,
  ]);
  const decisionBlocked = blockedArtifacts.some(isHumanDecisionArtifact);
  const blockers = createBlockers(firstIncomplete, focusedReadiness);
  const stopped = input.stopReasons.length > 0;
  const allComplete = activeSkills.length > 0 && incomplete.length === 0;
  const completionScope = preferredComplete ? "SKILL" as const : allComplete ? "SESSION" as const : null;
  const status = resolveStatus({
    stopped,
    targetComplete: completionScope !== null,
    hasRecommendation: recommended !== null,
    decisionBlocked,
    unknowns: input.unknowns,
  });
  const observedStage = inferObservedStage(activeSkills, completed, present, allComplete);
  const recommendation = stopped || completionScope !== null || recommended === null
    ? null
    : createRecommendation(recommended, sessionMode, observedStage);
  const availableSkills = stopped || completionScope !== null ? [] : available.map((skill) => skill.id);
  const nextAction = resolveNextAction(status, recommendation, blockedArtifacts, completionScope);
  const handoffReady = allComplete && activeSkills.some((skill) => skill.module === "handoff");

  return {
    compassVersion: "1.0",
    compassId: `sha256:${sha256(canonicalJson({ input, registry }))}`,
    kit: "ai-booster-kit",
    status,
    sessionMode,
    collaboration: input.collaboration,
    observedStage,
    objective: input.objective,
    preferredSkill: input.preferredSkill,
    completionScope,
    narrative: createNarrative({
      status,
      sessionMode,
      observedStage,
      recommendation,
      missing: blockedArtifacts,
      stopReasons: input.stopReasons,
      completionScope,
      preferredSkill: input.preferredSkill,
    }),
    facts: [...input.facts],
    decisions: [...input.decisions],
    evidence: [...input.evidence],
    unknowns: [...input.unknowns],
    constraints: [...input.constraints],
    recommendation,
    availableSkills,
    blockers: stopped || completionScope !== null ? [] : blockers,
    nextAction,
    handoffReady,
    authority: "RECOMMENDATION_ONLY",
    executionPerformed: false,
    persistencePerformed: false,
  };
}

function parseInput(value: unknown): ParsedCompassInput {
  const record = exactRecord(value, INPUT_KEYS, "Delivery Compass request", "INVALID_INPUT");
  const requestVersion = exactString(record.requestVersion, "requestVersion", "INVALID_INPUT");
  if (requestVersion !== "1.0") fail("INVALID_INPUT", "requestVersion must be 1.0");
  const mode = enumString(record.mode, "mode", ["AUTO", "NEW", "ATTACH", "RESUME"], "INVALID_INPUT");
  const collaboration = enumString(record.collaboration, "collaboration", ["INDIVIDUAL", "TEAM"], "INVALID_INPUT");
  const objective = nullableString(record.objective, "objective", "INVALID_INPUT");
  const preferredSkill = nullableIdentifier(record.preferredSkill, "preferredSkill", "INVALID_INPUT");
  const artifacts = parseArtifacts(record.artifacts);

  return {
    requestVersion: "1.0",
    mode,
    collaboration,
    objective,
    preferredSkill,
    artifacts,
    facts: uniqueStringArray(record.facts, "facts", "INVALID_INPUT"),
    decisions: uniqueStringArray(record.decisions, "decisions", "INVALID_INPUT"),
    evidence: uniqueStringArray(record.evidence, "evidence", "INVALID_INPUT"),
    unknowns: uniqueStringArray(record.unknowns, "unknowns", "INVALID_INPUT"),
    constraints: uniqueStringArray(record.constraints, "constraints", "INVALID_INPUT"),
    stopReasons: uniqueStringArray(record.stopReasons, "stopReasons", "INVALID_INPUT"),
  };
}

function parseRegistry(value: unknown): BoosterSkillRegistry {
  const record = exactRecord(value, REGISTRY_KEYS, "Skill Registry", "INVALID_REGISTRY");
  const registryVersion = exactString(record.registryVersion, "registryVersion", "INVALID_REGISTRY");
  if (registryVersion !== "1.0") fail("INVALID_REGISTRY", "registryVersion must be 1.0");
  const kit = exactString(record.kit, "kit", "INVALID_REGISTRY");
  if (kit !== "ai-booster-kit") fail("INVALID_REGISTRY", "kit must be ai-booster-kit");
  const values = denseArray(record.skills, "skills", MAX_SKILLS, "INVALID_REGISTRY");
  if (values.length === 0) fail("INVALID_REGISTRY", "skills must contain at least one descriptor");
  const skills = values.map((item, index) => parseSkill(item, index));
  assertUnique(skills.map((skill) => skill.id), "skill id", "INVALID_REGISTRY");
  const knownIds = new Set(skills.map((skill) => skill.id));
  for (const skill of skills) {
    for (const suggestion of skill.suggests) {
      if (!knownIds.has(suggestion)) fail("INVALID_REGISTRY", `Skill ${skill.id} suggests unknown skill ${suggestion}`);
    }
    for (const gate of skill.gates) {
      if (gate.bindsTo === null) continue;
      const targetRequiredInEveryMode = skill.consumes.includes(gate.bindsTo)
        || (skill.modes.length === 1
          && skill.modes[0] === "TEAM"
          && skill.teamConsumes.includes(gate.bindsTo));
      if (!targetRequiredInEveryMode) {
        fail("INVALID_REGISTRY", `Skill ${skill.id} gate ${gate.type} binds to unconsumed artifact ${gate.bindsTo}`);
      }
    }
  }
  return { registryVersion: "1.0", kit: "ai-booster-kit", skills };
}

function parseSkill(value: unknown, index: number): BoosterSkillDescriptor {
  const label = `skills[${index}]`;
  const record = exactRecord(value, SKILL_KEYS, label, "INVALID_REGISTRY");
  const invocation = exactRecord(record.invocation, ["codex", "claudeCode"], `${label}.invocation`, "INVALID_REGISTRY");
  const modes = enumArray(record.modes, `${label}.modes`, ["INDIVIDUAL", "TEAM"], "INVALID_REGISTRY");
  if (modes.length === 0) fail("INVALID_REGISTRY", `${label}.modes must not be empty`);
  const produces = stringArray(record.produces, `${label}.produces`, "INVALID_REGISTRY");
  if (produces.length === 0) fail("INVALID_REGISTRY", `${label}.produces must not be empty`);

  return {
    id: identifier(record.id, `${label}.id`, "INVALID_REGISTRY"),
    version: exactString(record.version, `${label}.version`, "INVALID_REGISTRY"),
    module: enumString(record.module, `${label}.module`, ["plan", "align", "implement", "test", "review", "handoff"], "INVALID_REGISTRY"),
    purpose: exactString(record.purpose, `${label}.purpose`, "INVALID_REGISTRY"),
    modes,
    consumes: uniqueStringArray(record.consumes, `${label}.consumes`, "INVALID_REGISTRY"),
    teamConsumes: uniqueStringArray(record.teamConsumes, `${label}.teamConsumes`, "INVALID_REGISTRY"),
    gates: parseGates(record.gates, `${label}.gates`),
    produces: uniqueStrings(produces, `${label}.produces`, "INVALID_REGISTRY"),
    suggests: uniqueStringArray(record.suggests, `${label}.suggests`, "INVALID_REGISTRY"),
    stops: uniqueStringArray(record.stops, `${label}.stops`, "INVALID_REGISTRY"),
    invocation: {
      codex: exactString(invocation.codex, `${label}.invocation.codex`, "INVALID_REGISTRY"),
      claudeCode: exactString(invocation.claudeCode, `${label}.invocation.claudeCode`, "INVALID_REGISTRY"),
    },
  };
}

function parseArtifacts(value: unknown): BoosterArtifact[] {
  const values = denseArray(value, "artifacts", MAX_ARTIFACTS, "INVALID_INPUT");
  const artifacts = values.map((item, index) => {
    const record = exactRecord(item, ARTIFACT_KEYS, `artifacts[${index}]`, "INVALID_INPUT");
    return {
      type: identifier(record.type, `artifacts[${index}].type`, "INVALID_INPUT"),
      reference: exactString(record.reference, `artifacts[${index}].reference`, "INVALID_INPUT"),
      state: artifactState(record.state, `artifacts[${index}].state`, "INVALID_INPUT"),
      bindsTo: nullableString(record.bindsTo, `artifacts[${index}].bindsTo`, "INVALID_INPUT"),
    };
  });
  assertUnique(artifacts.map((artifact) => artifact.type), "artifact type", "INVALID_INPUT");
  return artifacts.sort((left, right) => left.type < right.type ? -1 : left.type > right.type ? 1 : 0);
}

function parseGates(value: unknown, label: string): BoosterGate[] {
  const values = denseArray(value, label, MAX_LIST_ITEMS, "INVALID_REGISTRY");
  const gates = values.map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const record = exactRecord(item, GATE_KEYS, itemLabel, "INVALID_REGISTRY");
    const states = artifactStateArray(record.states, `${itemLabel}.states`, "INVALID_REGISTRY");
    if (states.length === 0) fail("INVALID_REGISTRY", `${itemLabel}.states must not be empty`);
    return {
      type: identifier(record.type, `${itemLabel}.type`, "INVALID_REGISTRY"),
      states,
      bindsTo: nullableIdentifier(record.bindsTo, `${itemLabel}.bindsTo`, "INVALID_REGISTRY"),
    };
  });
  assertUnique(gates.map((gate) => gate.type), `${label} artifact type`, "INVALID_REGISTRY");
  return gates;
}

function assessSkill(
  skill: BoosterSkillDescriptor,
  collaboration: BoosterCollaboration,
  present: Set<string>,
  artifactsByType: Map<string, BoosterArtifact>,
): SkillReadiness {
  const requiredInputs = uniqueValues([
    ...skill.consumes,
    ...(collaboration === "TEAM" ? skill.teamConsumes : []),
  ]);
  const missing: string[] = [];
  const invalidInputState: string[] = [];
  const invalidState: string[] = [];
  const invalidBinding: string[] = [];

  for (const item of requiredInputs) {
    if (item === "objective") {
      if (!present.has(item)) missing.push(item);
      continue;
    }
    const artifact = artifactsByType.get(item);
    if (artifact === undefined || artifact.state === "STOPPED" || artifact.state === "UNKNOWN") {
      missing.push(item);
    } else if (artifact.state !== "COMPLETE" && artifact.state !== "COMPLETE_WITH_LIMIT") {
      invalidInputState.push(item);
    }
  }

  for (const gate of skill.gates) {
    const artifact = artifactsByType.get(gate.type);
    if (artifact === undefined || artifact.state === "STOPPED" || artifact.state === "UNKNOWN") {
      missing.push(gate.type);
      continue;
    }
    if (!gate.states.includes(artifact.state)) {
      invalidState.push(gate.type);
      continue;
    }
    if (gate.bindsTo !== null) {
      const target = artifactsByType.get(gate.bindsTo);
      if (target === undefined) {
        if (!missing.includes(gate.bindsTo)) missing.push(gate.bindsTo);
      } else if (artifact.bindsTo !== target.reference) {
        invalidBinding.push(gate.type);
      }
    }
  }

  return {
    missing: uniqueValues(missing),
    invalidInputState,
    invalidState,
    invalidBinding,
    ready: missing.length === 0
      && invalidInputState.length === 0
      && invalidState.length === 0
      && invalidBinding.length === 0,
  };
}

function emptyReadiness(): SkillReadiness {
  return { missing: [], invalidInputState: [], invalidState: [], invalidBinding: [], ready: false };
}

function outputIsComplete(
  artifactType: string,
  input: ParsedCompassInput,
  artifactsByType: Map<string, BoosterArtifact>,
): boolean {
  if (artifactType === "objective") return input.objective !== null;
  const artifact = artifactsByType.get(artifactType);
  return artifact?.state === "COMPLETE" || artifact?.state === "COMPLETE_WITH_LIMIT";
}

function createRecommendation(
  skill: BoosterSkillDescriptor,
  sessionMode: BoosterSessionMode,
  observedStage: BoosterStage,
): BoosterCompassRecommendation {
  const recovering = sessionMode !== "NEW" && stageRank(observedStage) > moduleRank(skill.module);
  return {
    skillId: skill.id,
    module: skill.module,
    purpose: skill.purpose,
    reason: recovering
      ? `Recover the missing ${skill.module} contract before continuing the observed ${observedStage.toLowerCase()} work.`
      : `This is the first incomplete skill whose declared inputs and gates are satisfied.`,
    invocation: { ...skill.invocation },
    missingInputs: [],
    suggestedContinuations: [...skill.suggests],
  };
}

function createBlockers(
  skill: BoosterSkillDescriptor | null,
  readiness: SkillReadiness,
): BoosterCompassBlocker[] {
  if (skill === null) return [];
  const blockers: BoosterCompassBlocker[] = [];
  const decisionMissing = readiness.missing.filter(isHumanDecisionArtifact);
  if (decisionMissing.length > 0) {
    blockers.push({ code: "HUMAN_DECISION_REQUIRED", skillId: skill.id, missing: [...decisionMissing] });
  }
  const inputMissing = readiness.missing.filter((item) => !decisionMissing.includes(item));
  if (inputMissing.length > 0) {
    blockers.push({ code: "REQUIRED_INPUT_MISSING", skillId: skill.id, missing: inputMissing });
  }
  if (readiness.invalidInputState.length > 0) {
    blockers.push({ code: "ARTIFACT_STATE_INVALID", skillId: skill.id, missing: [...readiness.invalidInputState] });
  }
  if (readiness.invalidState.length > 0) {
    blockers.push({ code: "GATE_STATE_INVALID", skillId: skill.id, missing: [...readiness.invalidState] });
  }
  if (readiness.invalidBinding.length > 0) {
    blockers.push({ code: "GATE_BINDING_INVALID", skillId: skill.id, missing: [...readiness.invalidBinding] });
  }
  return blockers;
}

function resolveStatus(input: {
  stopped: boolean;
  targetComplete: boolean;
  hasRecommendation: boolean;
  decisionBlocked: boolean;
  unknowns: string[];
}): BoosterCompassStatus {
  if (input.stopped) return "STOPPED";
  if (input.targetComplete) return "COMPLETE";
  if (input.hasRecommendation) return "READY";
  if (input.decisionBlocked) return "WAITING_FOR_DECISION";
  if (input.unknowns.length > 0) return "UNKNOWN";
  return "NEEDS_INPUT";
}

function resolveNextAction(
  status: BoosterCompassStatus,
  recommendation: BoosterCompassRecommendation | null,
  missing: string[],
  completionScope: "SKILL" | "SESSION" | null,
): string {
  if (status === "READY" && recommendation !== null) return `INVOKE_SKILL:${recommendation.skillId}`;
  if (status === "WAITING_FOR_DECISION") return "ACCEPT_OR_REVISE_DECISION_GATE";
  if (status === "NEEDS_INPUT") return missing.length > 0 ? `PROVIDE:${missing.join(",")}` : "PROVIDE_REQUIRED_INPUTS";
  if (status === "UNKNOWN") return "RESOLVE_OR_ACCEPT_UNKNOWNS";
  if (status === "STOPPED") return "REVIEW_STOP_REASONS";
  return completionScope === "SKILL" ? "REVIEW_SKILL_OUTPUT" : "REVIEW_HANDOFF";
}

function createNarrative(input: {
  status: BoosterCompassStatus;
  sessionMode: BoosterSessionMode;
  observedStage: BoosterStage;
  recommendation: BoosterCompassRecommendation | null;
  missing: string[];
  stopReasons: string[];
  completionScope: "SKILL" | "SESSION" | null;
  preferredSkill: string | null;
}): string {
  const prefix = `Booster Mode ${input.sessionMode.toLowerCase()} session; observed stage ${input.observedStage}.`;
  if (input.status === "READY" && input.recommendation !== null) {
    return `${prefix} ${input.recommendation.skillId} is ready and recommended; invoking it remains the User's choice.`;
  }
  if (input.status === "COMPLETE" && input.completionScope === "SKILL" && input.preferredSkill !== null) {
    return `${prefix} The selected Skill ${input.preferredSkill} is complete and ready for User review.`;
  }
  if (input.status === "COMPLETE") return `${prefix} The declared delivery handoff is complete and ready for User review.`;
  if (input.status === "STOPPED") return `${prefix} Work is stopped: ${input.stopReasons.join("; ")}`;
  if (input.status === "UNKNOWN") return `${prefix} Progress remains unknown until the declared unknowns are resolved or explicitly accepted.`;
  return `${prefix} The next skill is blocked by: ${input.missing.join(", ")}.`;
}

function resolveSessionMode(input: ParsedCompassInput): BoosterSessionMode {
  if (input.mode !== "AUTO") return input.mode;
  return input.artifacts.length > 0 ? "ATTACH" : "NEW";
}

function inferObservedStage(
  skills: BoosterSkillDescriptor[],
  completed: Set<string>,
  present: Set<string>,
  allComplete: boolean,
): BoosterStage {
  if (allComplete) return "COMPLETE";
  let stage: BoosterStage = "INTAKE";
  for (const skill of skills) {
    if (completed.has(skill.id) || skill.produces.some((item) => present.has(item))) {
      stage = skill.module.toUpperCase() as Exclude<BoosterStage, "INTAKE" | "COMPLETE">;
    }
  }
  return stage;
}

function isHumanDecisionArtifact(value: string): boolean {
  return value === "accepted-plan" || value.startsWith("user-") || value.endsWith("-approval");
}

function moduleRank(module: BoosterModule): number {
  return ["plan", "align", "implement", "test", "review", "handoff"].indexOf(module);
}

function stageRank(stage: BoosterStage): number {
  return ["INTAKE", "PLAN", "ALIGN", "IMPLEMENT", "TEST", "REVIEW", "HANDOFF", "COMPLETE"].indexOf(stage);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function exactRecord<const T extends readonly string[]>(
  value: unknown,
  keys: T,
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): Record<T[number], unknown> {
  if (!isPlainRecord(value)) fail(code, `${label} must be a plain object`);
  const record = value as Record<string, unknown>;
  const actual = Reflect.ownKeys(record);
  if (actual.some((key) => typeof key !== "string")) fail(code, `${label} must not contain symbol keys`);
  const expected = new Set<string>(keys);
  const actualStrings = actual as string[];
  if (actualStrings.length !== keys.length || actualStrings.some((key) => !expected.has(key))) {
    fail(code, `${label} must contain exactly: ${keys.join(", ")}`);
  }
  for (const key of actualStrings) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      fail(code, `${label}.${key} must be an enumerable data property`);
    }
  }
  return record as Record<T[number], unknown>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function denseArray(
  value: unknown,
  label: string,
  maximum: number,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): unknown[] {
  if (!Array.isArray(value)) fail(code, `${label} must be an array`);
  if (value.length > maximum) fail(code, `${label} must contain at most ${maximum} items`);
  if (Object.getPrototypeOf(value) !== Array.prototype) fail(code, `${label} must be a plain array`);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code, `${label} must not contain symbol keys`);
  const expectedKeys = new Set(["length", ...Array.from({ length: value.length }, (_unused, index) => String(index))]);
  if (ownKeys.length !== expectedKeys.size || (ownKeys as string[]).some((key) => !expectedKeys.has(key))) {
    fail(code, `${label} must not contain foreign properties`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) fail(code, `${label} must not be sparse`);
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      fail(code, `${label}[${index}] must be an enumerable data property`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function stringArray(
  value: unknown,
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): string[] {
  return denseArray(value, label, MAX_LIST_ITEMS, code).map((item, index) => exactString(item, `${label}[${index}]`, code));
}

function uniqueStringArray(
  value: unknown,
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): string[] {
  return uniqueStrings(stringArray(value, label, code), label, code);
}

function enumArray<const T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): T[] {
  const result = denseArray(value, label, MAX_LIST_ITEMS, code).map((item, index) => enumString(item, `${label}[${index}]`, allowed, code));
  return uniqueStrings(result, label, code) as T[];
}

function artifactState(
  value: unknown,
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): BoosterArtifactState {
  return enumString(
    value,
    label,
    ["DECLARED", "VERIFIED", "ACCEPTED", "COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"],
    code,
  );
}

function artifactStateArray(
  value: unknown,
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): BoosterArtifactState[] {
  const result = denseArray(value, label, MAX_LIST_ITEMS, code).map((item, index) => artifactState(item, `${label}[${index}]`, code));
  return uniqueStrings(result, label, code);
}

function uniqueStrings<T extends string>(
  values: T[],
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): T[] {
  assertUnique(values, label, code);
  return values;
}

function assertUnique(
  values: string[],
  label: string,
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): void {
  if (new Set(values).size !== values.length) fail(code, `${label} values must be unique`);
}

function exactString(value: unknown, label: string, code: "INVALID_INPUT" | "INVALID_REGISTRY"): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_TEXT_LENGTH) {
    fail(code, `${label} must be a non-empty string of at most ${MAX_TEXT_LENGTH} characters`);
  }
  return value;
}

function nullableString(value: unknown, label: string, code: "INVALID_INPUT" | "INVALID_REGISTRY"): string | null {
  return value === null ? null : exactString(value, label, code);
}

function nullableIdentifier(value: unknown, label: string, code: "INVALID_INPUT" | "INVALID_REGISTRY"): string | null {
  return value === null ? null : identifier(value, label, code);
}

function identifier(value: unknown, label: string, code: "INVALID_INPUT" | "INVALID_REGISTRY"): string {
  const result = exactString(value, label, code);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(result)) fail(code, `${label} must be a lowercase kebab-case identifier`);
  return result;
}

function enumString<const T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
  code: "INVALID_INPUT" | "INVALID_REGISTRY",
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) fail(code, `${label} must be one of: ${allowed.join(", ")}`);
  return value as T;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

function fail(code: "INVALID_INPUT" | "INVALID_REGISTRY", message: string): never {
  throw new BoosterCompassError(code, message);
}

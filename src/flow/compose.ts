import { isDeepStrictEqual } from "node:util";

import type {
  ImplementationRecipe,
  RefinementRecipe,
  ValidationRecipe,
} from "../controller/types.js";

export type FlowModule = "plan" | "implement" | "test" | "review";
export type FlowPackageStatus = "READY" | "STOPPED" | "UNKNOWN";
export type FlowModuleState = FlowPackageStatus | "PENDING";

export interface FlowRecipes {
  plan: RefinementRecipe;
  implement: ImplementationRecipe;
  verify: ValidationRecipe;
}

export interface FlowModulePacket {
  stageId: string;
  module: FlowModule;
  purpose: string;
  recipeId: string;
  recipeVersion: string;
  state: FlowModuleState;
  predecessors: readonly string[];
  requiredInput: readonly string[];
  inputBindings: Readonly<Record<string, string>>;
  expectedOutput: readonly string[];
  acceptanceCriteria: readonly string[];
  evidenceRequirements: readonly string[];
  stopConditions: readonly string[];
  unknownPolicy: "PRESERVE_AS_UNKNOWN";
  executionBoundary: "LOCAL_ONLY";
  authority: "RECOMMENDATION_ONLY";
  executionPerformed: false;
  suggestedContinuation: readonly string[];
}

export interface FlowPackage {
  packageVersion: "1.0";
  packageKind: "MODULE" | "FLOW";
  selection: FlowModule | "default-change";
  objective: string;
  status: FlowPackageStatus;
  executionBoundary: "LOCAL_ONLY";
  authority: "RECOMMENDATION_ONLY";
  executionPerformed: false;
  modules: readonly FlowModulePacket[];
  checkpoints: readonly {
    afterStage: string;
    beforeStage: string;
    decision: "USER_ACCEPTS_PLAN";
    required: true;
  }[];
  handoff: {
    requiredSections: readonly [
      "objective-and-status",
      "artifacts-and-evidence",
      "decisions-and-unknowns",
      "limits-and-next-action",
    ];
    allowedTerminalStates: readonly ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"];
    requiresFreshReadback: true;
  };
  unknowns: readonly string[];
  stopReasons: readonly string[];
  nextAction: string;
}

export type FlowCompositionErrorCode =
  | "FLOW_REQUEST_INVALID"
  | "FLOW_SELECTION_INVALID"
  | "FLOW_INPUT_INVALID"
  | "FLOW_CONTRACT_INVALID";

export class FlowCompositionError extends Error {
  public constructor(readonly code: FlowCompositionErrorCode, message: string) {
    super(message);
    this.name = "FlowCompositionError";
  }
}

interface NormalizedRequest {
  selection: FlowModule | "default-change";
  packageKind: "MODULE" | "FLOW";
  objective: string;
  inputs: Readonly<Record<string, unknown>>;
  unknowns: readonly string[];
}

interface NormalizedRecipe {
  recipeId: string;
  recipeVersion: string;
  requiredInput: readonly string[];
  expectedOutput: readonly string[];
  acceptanceCriteria: readonly string[];
  evidenceRequirements: readonly string[];
  stopConditions: readonly string[];
  unknownPolicy: "PRESERVE_AS_UNKNOWN";
}

interface StageDefinition {
  module: FlowModule;
  recipe: NormalizedRecipe;
  bindings: Readonly<Record<string, string>>;
  externalInputs: readonly string[];
  predecessors: readonly string[];
}

const modulePurposes: Readonly<Record<FlowModule, string>> = {
  plan: "Turn the bounded objective into accepted scope, criteria, and decisions.",
  implement: "Produce a local, reviewable change from an accepted plan.",
  test: "Verify observable behavior against the accepted criteria.",
  review: "Independently check scope, evidence, limits, and handoff readiness.",
};

const suggestedContinuation: Readonly<Record<FlowModule, readonly string[]>> = {
  plan: ["implement"],
  implement: ["test", "review"],
  test: ["review", "handoff"],
  review: ["handoff"],
};

const arrayInputs = new Set([
  "constraints",
  "open-questions",
  "acceptance-criteria",
  "test-strategy",
  "evidence-sources",
  "known-limits",
]);

const defaultFlowExternalInputs = [
  "current-scope",
  "constraints",
  "open-questions",
  "repository",
  "repository-state",
  "test-strategy",
  "rollback-boundary",
  "known-limits",
] as const;

const canonicalRecipes: FlowRecipes = {
  plan: {
    recipeId: "bounded-refinement",
    recipeVersion: "0.1.0",
    status: "READY",
    formationId: "bounded-refinement",
    scenario: "refinement",
    weight: "light",
    coordination: "sequential",
    controller: {
      version: 1,
      eligibleComplexities: ["LOW"],
      requiredInput: ["goal", "current-scope", "constraints", "open-questions"],
      executionBoundary: "LOCAL_ONLY",
      authority: "RECOMMENDATION_ONLY",
    },
    outputContract: {
      requiredSections: ["refined-scope", "acceptance-criteria", "decision-record"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    acceptance: { criteria: ["scope-preserved", "assumptions-visible", "acceptance-testable"] },
    evidenceRequirements: ["before-scope", "after-scope", "decision-record"],
    relations: [{ kind: "related_to", target: "quick-task-clarifier-validator" }],
    recovery: {
      preserve: ["original-scope", "rejected-interpretations"],
      stopConditions: ["unaccepted-scope-change", "unresolved-conflict"],
    },
  },
  implement: {
    recipeId: "bounded-implementation",
    recipeVersion: "0.1.0",
    status: "READY",
    formationId: "bounded-implementation",
    scenario: "development",
    weight: "heavy",
    coordination: "sequential",
    controller: {
      version: 1,
      eligibleComplexities: ["MEDIUM"],
      requiredInput: ["goal", "repository", "repository-state", "acceptance-criteria", "test-strategy", "accepted-plan", "rollback-boundary"],
      executionBoundary: "LOCAL_ONLY",
      authority: "RECOMMENDATION_ONLY",
    },
    outputContract: {
      requiredSections: ["reviewable-diff", "test-evidence", "residual-risk-record"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    acceptance: { criteria: ["scope-matched-diff", "relevant-tests-pass", "rollback-boundary-preserved"] },
    evidenceRequirements: ["git-diff", "test-output", "review-record"],
    relations: [{ kind: "depends_on", target: "bounded-refinement" }],
    recovery: {
      preserve: ["prior-setup", "failing-evidence"],
      stopConditions: ["dirty-state-conflict", "unsafe-change", "failed-read-back"],
    },
  },
  verify: {
    recipeId: "bounded-validation",
    recipeVersion: "0.1.0",
    status: "READY",
    formationId: "bounded-validation",
    scenario: "validation",
    weight: "medium",
    coordination: "sequential",
    controller: {
      version: 1,
      eligibleComplexities: ["LOW", "MEDIUM"],
      requiredInput: ["claim", "acceptance-criteria", "evidence-sources", "known-limits"],
      executionBoundary: "LOCAL_ONLY",
      authority: "RECOMMENDATION_ONLY",
    },
    outputContract: {
      requiredSections: ["validation-result", "evidence-map", "explicit-stop-or-pass"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    acceptance: { criteria: ["claim-traced-to-evidence", "negative-paths-checked", "limits-visible"] },
    evidenceRequirements: ["validation-log", "source-read-back", "residual-risk-record"],
    relations: [{ kind: "validates", target: "controller" }],
    recovery: {
      preserve: ["pre-validation-claim", "failed-checks"],
      stopConditions: ["missing-evidence", "source-mismatch", "unknown-capability"],
    },
  },
};

export function composeFlow(value: unknown, recipes: FlowRecipes): FlowPackage {
  assertCanonicalRecipes(recipes);
  const request = normalizeRequest(value, recipes);
  const stages = request.packageKind === "MODULE"
    ? [singleStage(request.selection as FlowModule, recipes)]
    : defaultChangeStages(recipes);
  const missing = missingInputs(request, stages);
  const unknowns = unknownInputs(request, stages);
  const invalid = invalidInputs(request, stages);
  const status: FlowPackageStatus = missing.length > 0 || invalid.length > 0 ? "STOPPED" : unknowns.length > 0 ? "UNKNOWN" : "READY";
  const stagePackets = stages.map((stage, index) => modulePacket(stage, index, request, missing, unknowns, invalid));

  return {
    packageVersion: "1.0",
    packageKind: request.packageKind,
    selection: request.selection,
    objective: request.objective,
    status,
    executionBoundary: "LOCAL_ONLY",
    authority: "RECOMMENDATION_ONLY",
    executionPerformed: false,
    modules: stagePackets,
    checkpoints: request.packageKind === "FLOW"
      ? [{ afterStage: "plan-1", beforeStage: "implement-2", decision: "USER_ACCEPTS_PLAN", required: true }]
      : [],
    handoff: {
      requiredSections: [
        "objective-and-status",
        "artifacts-and-evidence",
        "decisions-and-unknowns",
        "limits-and-next-action",
      ],
      allowedTerminalStates: ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"],
      requiresFreshReadback: true,
    },
    unknowns,
    stopReasons: [
      ...missing.map((field) => `MISSING_INPUT:${field}`),
      ...invalid.map((field) => `INVALID_INPUT:${field}`),
    ],
    nextAction: status === "STOPPED"
      ? missing.length > 0 ? "PROVIDE_REQUIRED_INPUTS" : "CORRECT_INVALID_INPUTS"
      : status === "UNKNOWN"
        ? "RESOLVE_UNKNOWN_INPUTS"
        : `RUN_MODULE:${stagePackets[0]?.module ?? "plan"}`,
  };
}

function assertCanonicalRecipes(recipes: FlowRecipes): void {
  assertCanonicalRecipe(recipes.plan, canonicalRecipes.plan);
  assertCanonicalRecipe(recipes.implement, canonicalRecipes.implement);
  assertCanonicalRecipe(recipes.verify, canonicalRecipes.verify);
}

function assertCanonicalRecipe(recipeValue: unknown, expected: RefinementRecipe | ImplementationRecipe | ValidationRecipe): void {
  if (!isDeepStrictEqual(recipeValue, expected)) {
    throw new FlowCompositionError("FLOW_CONTRACT_INVALID", `recipe ${expected.recipeId} does not match the pinned canonical contract`);
  }
}

function normalizeRequest(value: unknown, recipes: FlowRecipes): NormalizedRequest {
  const request = plainRecord(value, "FLOW_REQUEST_INVALID", "flow request");
  requireExactKeys(request, ["requestVersion", "selection", "objective", "inputs", "unknowns"], "FLOW_REQUEST_INVALID", "flow request");
  if (request.requestVersion !== "1.0") throw new FlowCompositionError("FLOW_REQUEST_INVALID", "flow request version must be 1.0");
  if (typeof request.objective !== "string" || request.objective.trim() === "") {
    throw new FlowCompositionError("FLOW_REQUEST_INVALID", "flow objective must be a non-empty string");
  }

  const selection = normalizeSelection(request.selection);
  const inputRecord = plainRecord(request.inputs, "FLOW_INPUT_INVALID", "flow inputs");
  const inputEntries = dataEntries(inputRecord, "FLOW_INPUT_INVALID", "flow inputs");
  const inputs = Object.fromEntries(inputEntries);
  const unknowns = stringList(request.unknowns, "FLOW_INPUT_INVALID", "flow unknowns");
  const allowedInputs = selection.packageKind === "MODULE"
    ? externalInputsForModule(selection.selection as FlowModule, recipes)
    : defaultFlowExternalInputs;
  const allowed = new Set(allowedInputs);

  for (const [field, input] of inputEntries) {
    if (!allowed.has(field)) throw new FlowCompositionError("FLOW_INPUT_INVALID", `flow input ${field} is not declared by the selection`);
    validateInputValue(field, input);
  }
  for (const field of unknowns) {
    if (!allowed.has(field)) throw new FlowCompositionError("FLOW_INPUT_INVALID", `flow unknown ${field} is not declared by the selection`);
    if (Object.hasOwn(inputs, field)) throw new FlowCompositionError("FLOW_INPUT_INVALID", `flow input ${field} cannot be both supplied and unknown`);
  }

  return {
    ...selection,
    objective: request.objective,
    inputs,
    unknowns,
  };
}

function normalizeSelection(value: unknown): Pick<NormalizedRequest, "selection" | "packageKind"> {
  const selection = plainRecord(value, "FLOW_SELECTION_INVALID", "flow selection");
  if (selection.kind === "module") {
    requireExactKeys(selection, ["kind", "module"], "FLOW_SELECTION_INVALID", "module selection");
    if (!isFlowModule(selection.module)) throw new FlowCompositionError("FLOW_SELECTION_INVALID", "module selection must be plan, implement, test, or review");
    return { packageKind: "MODULE", selection: selection.module };
  }
  if (selection.kind === "flow") {
    requireExactKeys(selection, ["kind", "flow"], "FLOW_SELECTION_INVALID", "flow selection");
    if (selection.flow !== "default-change") throw new FlowCompositionError("FLOW_SELECTION_INVALID", "flow selection must be default-change");
    return { packageKind: "FLOW", selection: "default-change" };
  }
  throw new FlowCompositionError("FLOW_SELECTION_INVALID", "selection kind must be module or flow");
}

function singleStage(module: FlowModule, recipes: FlowRecipes): StageDefinition {
  const recipe = recipeForModule(module, recipes);
  const externalInputs = recipe.requiredInput.filter((field) => field !== "goal");
  return {
    module,
    recipe,
    externalInputs,
    predecessors: [],
    bindings: Object.fromEntries(recipe.requiredInput.map((field) => [field, field === "goal" ? "OBJECTIVE" : `REQUEST:${field}`])),
  };
}

function defaultChangeStages(recipes: FlowRecipes): readonly StageDefinition[] {
  const plan = normalizeRecipe(recipes.plan);
  const implement = normalizeRecipe(recipes.implement);
  const verify = normalizeRecipe(recipes.verify);
  return [
    {
      module: "plan",
      recipe: plan,
      externalInputs: ["current-scope", "constraints", "open-questions"],
      predecessors: [],
      bindings: {
        goal: "OBJECTIVE",
        "current-scope": "REQUEST:current-scope",
        constraints: "REQUEST:constraints",
        "open-questions": "REQUEST:open-questions",
      },
    },
    {
      module: "implement",
      recipe: implement,
      externalInputs: ["repository", "repository-state", "test-strategy", "rollback-boundary"],
      predecessors: ["plan-1", "checkpoint:USER_ACCEPTS_PLAN"],
      bindings: {
        goal: "OBJECTIVE",
        repository: "REQUEST:repository",
        "repository-state": "REQUEST:repository-state",
        "acceptance-criteria": "STAGE_OUTPUT:plan-1/acceptance-criteria",
        "test-strategy": "REQUEST:test-strategy",
        "accepted-plan": "CHECKPOINT:USER_ACCEPTS_PLAN",
        "rollback-boundary": "REQUEST:rollback-boundary",
      },
    },
    {
      module: "test",
      recipe: verify,
      externalInputs: ["known-limits"],
      predecessors: ["implement-2"],
      bindings: {
        claim: "STAGE_OUTPUT:implement-2/reviewable-diff",
        "acceptance-criteria": "STAGE_OUTPUT:plan-1/acceptance-criteria",
        "evidence-sources": "STAGE_OUTPUT:implement-2/test-evidence",
        "known-limits": "REQUEST:known-limits",
      },
    },
    {
      module: "review",
      recipe: verify,
      externalInputs: ["known-limits"],
      predecessors: ["implement-2", "test-3"],
      bindings: {
        claim: "STAGE_OUTPUT:implement-2/reviewable-diff",
        "acceptance-criteria": "STAGE_OUTPUT:plan-1/acceptance-criteria",
        "evidence-sources": "STAGE_OUTPUT:test-3/validation-result",
        "known-limits": "REQUEST:known-limits",
      },
    },
  ];
}

function modulePacket(
  stage: StageDefinition,
  index: number,
  request: NormalizedRequest,
  missing: readonly string[],
  unknowns: readonly string[],
  invalid: readonly string[],
): FlowModulePacket {
  const stageMissing = stage.externalInputs.filter((field) => missing.includes(field));
  const stageUnknowns = stage.externalInputs.filter((field) => unknowns.includes(field));
  const stageInvalid = stage.externalInputs.filter((field) => invalid.includes(field));
  const state: FlowModuleState = stageMissing.length > 0 || stageInvalid.length > 0
    ? "STOPPED"
    : stageUnknowns.length > 0
      ? "UNKNOWN"
      : index > 0 && request.packageKind === "FLOW"
        ? "PENDING"
        : "READY";
  return {
    stageId: `${stage.module}-${index + 1}`,
    module: stage.module,
    purpose: modulePurposes[stage.module],
    recipeId: stage.recipe.recipeId,
    recipeVersion: stage.recipe.recipeVersion,
    state,
    predecessors: stage.predecessors,
    requiredInput: stage.recipe.requiredInput,
    inputBindings: stage.bindings,
    expectedOutput: stage.recipe.expectedOutput,
    acceptanceCriteria: stage.recipe.acceptanceCriteria,
    evidenceRequirements: stage.recipe.evidenceRequirements,
    stopConditions: stage.recipe.stopConditions,
    unknownPolicy: stage.recipe.unknownPolicy,
    executionBoundary: "LOCAL_ONLY",
    authority: "RECOMMENDATION_ONLY",
    executionPerformed: false,
    suggestedContinuation: suggestedContinuation[stage.module],
  };
}

function missingInputs(request: NormalizedRequest, stages: readonly StageDefinition[]): readonly string[] {
  return uniqueExternalInputs(stages).filter((field) => !Object.hasOwn(request.inputs, field) && !request.unknowns.includes(field));
}

function unknownInputs(request: NormalizedRequest, stages: readonly StageDefinition[]): readonly string[] {
  const required = uniqueExternalInputs(stages);
  return required.filter((field) => request.unknowns.includes(field));
}

function invalidInputs(request: NormalizedRequest, stages: readonly StageDefinition[]): readonly string[] {
  const required = uniqueExternalInputs(stages);
  const canonicalValues: Readonly<Record<string, string>> = {
    "repository-state": "VERIFIED",
    "accepted-plan": "ACCEPTED",
  };
  return required.filter((field) => {
    const expected = canonicalValues[field];
    return expected !== undefined && Object.hasOwn(request.inputs, field) && request.inputs[field] !== expected;
  });
}

function uniqueExternalInputs(stages: readonly StageDefinition[]): readonly string[] {
  const result: string[] = [];
  for (const stage of stages) {
    for (const field of stage.externalInputs) if (!result.includes(field)) result.push(field);
  }
  return result;
}

function externalInputsForModule(module: FlowModule, recipes: FlowRecipes): readonly string[] {
  return recipeForModule(module, recipes).requiredInput.filter((field) => field !== "goal");
}

function recipeForModule(module: FlowModule, recipes: FlowRecipes): NormalizedRecipe {
  if (module === "plan") return normalizeRecipe(recipes.plan);
  if (module === "implement") return normalizeRecipe(recipes.implement);
  return normalizeRecipe(recipes.verify);
}

function normalizeRecipe(recipe: RefinementRecipe | ImplementationRecipe | ValidationRecipe): NormalizedRecipe {
  return {
    recipeId: recipe.recipeId,
    recipeVersion: recipe.recipeVersion,
    requiredInput: recipe.controller.requiredInput,
    expectedOutput: recipe.outputContract.requiredSections,
    acceptanceCriteria: recipe.acceptance.criteria,
    evidenceRequirements: recipe.evidenceRequirements,
    stopConditions: recipe.recovery.stopConditions,
    unknownPolicy: recipe.outputContract.unknownPolicy,
  };
}

function plainRecord(value: unknown, code: FlowCompositionErrorCode, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new FlowCompositionError(code, `${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  code: FlowCompositionErrorCode,
  label: string,
): void {
  const actual = Reflect.ownKeys(value);
  if (actual.length !== expected.length || actual.some((key) => typeof key !== "string" || !expected.includes(key))) {
    throw new FlowCompositionError(code, `${label} fields are invalid`);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new FlowCompositionError(code, `${label} fields are invalid`);
    }
  }
}

function stringList(value: unknown, code: FlowCompositionErrorCode, label: string): readonly string[] {
  const entries = dataList(value, code, label);
  if (entries.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(entries).size !== entries.length) {
    throw new FlowCompositionError(code, `${label} must contain unique non-empty strings`);
  }
  return entries as string[];
}

function dataEntries(
  value: Readonly<Record<string, unknown>>,
  code: FlowCompositionErrorCode,
  label: string,
): readonly (readonly [string, unknown])[] {
  const entries: [string, unknown][] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new FlowCompositionError(code, `${label} fields are invalid`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new FlowCompositionError(code, `${label} fields are invalid`);
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

function dataList(value: unknown, code: FlowCompositionErrorCode, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new FlowCompositionError(code, `${label} must contain unique non-empty strings`);
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.length !== value.length + 1 || actualKeys.some((key) => {
    if (key === "length") return false;
    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/u.test(key)) return true;
    const index = Number(key);
    return !Number.isSafeInteger(index) || index < 0 || index >= value.length;
  })) {
    throw new FlowCompositionError(code, `${label} must contain unique non-empty strings`);
  }
  const entries: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new FlowCompositionError(code, `${label} must contain unique non-empty strings`);
    }
    entries.push(descriptor.value);
  }
  return entries;
}

function validateInputValue(field: string, value: unknown): void {
  if (arrayInputs.has(field)) {
    stringList(value, "FLOW_INPUT_INVALID", `flow input ${field}`);
    return;
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new FlowCompositionError("FLOW_INPUT_INVALID", `flow input ${field} must be a non-empty string`);
  }
}

function isFlowModule(value: unknown): value is FlowModule {
  return value === "plan" || value === "implement" || value === "test" || value === "review";
}

import { requestFingerprint } from "./identity.js";
import type {
  ActivationIntent,
  ActivationProfile,
  ActivationProfileContract,
  QuickTaskActivationInput,
  QuickTaskActivationPackage,
  QuickTaskRequest,
} from "./types.js";
import { ControllerActivationPackageError as ActivationPackageError } from "./types.js";

const commonInstructions = [
  "Preserve the supplied goal and outcome owner; do not expand scope.",
  "Treat missing or conflicting information as UNKNOWN; do not infer completion.",
  "Return only the selected profile contract and distinguish facts, hypotheses, decisions, and unknowns.",
] as const;

const stopConditions = [
  "STOP on scope expansion, external action, unresolved contradiction, or invented completion.",
  "STOP when required evidence is unavailable and report the affected field as UNKNOWN.",
] as const;

const profileDefinitions: Readonly<Record<ActivationProfile, { outputContract: ActivationProfileContract; instructions: readonly string[] }>> = {
  clarify: {
    outputContract: { requiredSections: ["DoR", "DoD", "Acceptance Criteria", "evidence", "relations", "dependencies", "closure"], unknownPolicy: "PRESERVE_AS_UNKNOWN", resultState: "NOT_STARTED" },
    instructions: [...commonInstructions, "Produce the DoR, DoD, Acceptance Criteria, evidence, relations, dependencies, and closure sections."],
  },
  research: {
    outputContract: { requiredSections: ["research question", "known facts", "UNKNOWNs", "hypotheses", "source/evidence plan", "findings", "residual unknowns"], unknownPolicy: "PRESERVE_AS_UNKNOWN", resultState: "NOT_STARTED" },
    instructions: [...commonInstructions, "Separate the research question, known facts, UNKNOWNs, hypotheses, source/evidence plan, findings, and residual unknowns."],
  },
  planning: {
    outputContract: { requiredSections: ["goal framing", "options", "dependencies", "steps", "risks", "decision points", "residual unknowns"], unknownPolicy: "PRESERVE_AS_UNKNOWN", resultState: "NOT_STARTED" },
    instructions: [...commonInstructions, "Shape goal framing, options, dependencies, steps, risks, decision points, and residual unknowns without committing new scope."],
  },
  validation: {
    outputContract: { requiredSections: ["claims", "acceptance conditions", "evidence plan", "findings", "differences", "residual unknowns"], unknownPolicy: "PRESERVE_AS_UNKNOWN", resultState: "NOT_STARTED" },
    instructions: [...commonInstructions, "Check claims, acceptance conditions, evidence plan, findings, differences, and residual unknowns against explicit evidence."],
  },
};

export function parseActivationProfile(value: unknown): ActivationProfile {
  if (value === undefined) throw new ActivationPackageError("ACTIVATION_PROFILE_REQUIRED", "profile is required");
  if (value === "clarify" || value === "research" || value === "planning" || value === "validation") return value;
  throw new ActivationPackageError("ACTIVATION_PROFILE_INVALID", "profile must be one of the four supported values");
}

export function createQuickTaskActivationPackage(request: QuickTaskRequest, intent: ActivationIntent, profile: ActivationProfile): QuickTaskActivationPackage {
  if (intent.state !== "ACTIVATION_INTENT") throw new ActivationPackageError("ACTIVATION_INTENT_REQUIRED", "a current activation intent is required");
  if (intent.requestFingerprint !== requestFingerprint(request)) throw new ActivationPackageError("ACTIVATION_REQUEST_FINGERPRINT_MISMATCH", "the activation intent does not match the current request");

  const definition = profileDefinitions[profile];
  const input = activationInput(request);
  return {
    activationVersion: "1.0",
    state: "EPHEMERAL_PACKAGE_ISSUED",
    retention: "EPHEMERAL",
    profile,
    recipe: intent.recipe,
    intent: { state: "ACTIVATION_INTENT", requestFingerprint: intent.requestFingerprint, recipeSignature: intent.recipeSignature },
    agent: { role: "quick-task-clarifier-validator", mode: "assist", input, outputContract: definition.outputContract, instructions: definition.instructions, stopConditions, executionBoundary: "LOCAL_ONLY" },
    operations: { packageIssued: true, hostActivationPerformed: false, artifactGenerationPerformed: false, persistencePerformed: false },
  };
}

function activationInput(request: QuickTaskRequest): QuickTaskActivationInput {
  if (request.value === undefined || request.context === undefined || request.relations === undefined || request.dependencies === undefined) {
    throw new ActivationPackageError("ACTIVATION_INPUT_INCOMPLETE", "the validated request declarations are incomplete");
  }
  return {
    goal: request.goal,
    outcomeOwner: request.outcomeOwner,
    value: request.value,
    context: request.context,
    relations: request.relations,
    dependencies: request.dependencies,
  };
}

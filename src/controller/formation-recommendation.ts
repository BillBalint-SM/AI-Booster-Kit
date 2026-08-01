import { formationRecommendationId } from "./identity.js";
import type {
  ControllerImpact,
  FormationCatalog,
  FormationEntry,
  FormationRecommendation,
  FormationRecommendationDecision,
  FormationScenario,
  QuickTaskRequest,
} from "./types.js";

type RecognizedScenario = Exclude<FormationScenario, "quick_task">;

const scenarioSignals: readonly { scenario: RecognizedScenario; terms: readonly string[] }[] = [
  { scenario: "debugging", terms: ["debug", "debugging", "bug", "error", "failure", "failing", "regression", "hibakeres"] },
  { scenario: "research", terms: ["research", "investigate", "compare", "source", "evidence", "kutat", "vizsgál", "összehasonl"] },
  { scenario: "refinement", terms: ["refine", "clarify", "requirement", "requirements", "scope", "acceptance", "pontosít", "finomít", "követelmény", "hatókör"] },
  { scenario: "development", terms: ["implement", "implementation", "build", "add", "develop", "feature", "code", "fejleszt", "implementál", "kód"] },
  { scenario: "validation", terms: ["validate", "validation", "verify", "verification", "audit", "check", "ellenőriz", "tesztel"] },
];

export class FormationRecommendationError extends Error {
  public constructor(field: string, message: string) {
    super(`Formation recommendation rejected: ${field} ${message}.`);
    this.name = "FormationRecommendationError";
  }
}

export function recommendFormation(request: QuickTaskRequest, catalog: FormationCatalog): FormationRecommendation {
  validateRequest(request);
  validateCatalog(catalog);

  if (request.preferences?.continuation === "NO_AGENT") {
    return recommendation(request, "NO_AGENT", "UNKNOWN", "UNKNOWN", false, ["User requested no Agent help."], [], [], "NONE", undefined);
  }
  if (request.preferences?.continuation === "CUSTOM_TOOL") {
    return recommendation(request, "NO_AGENT", "UNKNOWN", "UNKNOWN", true, ["User-selected custom tool has precedence; compatibility is unknown."], [], ["custom-tool"], "NONE", undefined);
  }

  const recognized = recognizeScenario(request.goal);
  if (recognized.length > 1) {
    return recommendation(request, "UNKNOWN", "UNKNOWN", "UNKNOWN", true, ["The goal matches multiple scenarios; recommendation is withheld."], [], ["scenario"], "NONE", undefined);
  }

  const scenario = recognized[0] ?? "quick_task";
  const matches = catalog.formations.filter((formation) => formation.scenario === scenario);
  if (matches.length !== 1) {
    return recommendation(request, "UNKNOWN", "UNKNOWN", "UNKNOWN", true, ["No unique catalog entry is available for the recognized scenario."], [], [`catalog:${scenario}`], "NONE", undefined);
  }

  const formation = matches[0];
  if (formation === undefined) throw new FormationRecommendationError(`catalog:${scenario}`, "has no usable entry");
  const missingPrerequisites = unresolvedPrerequisites(request, formation);
  const unknownEvidence = unknownRequestEvidence(request);
  if (request.complexity === "HIGH") {
    return recommendation(request, "NO_FIT", scenario, "COMPATIBLE", false, ["The request complexity is HIGH; the bounded catalog path does not support this complexity."], missingPrerequisites, unknownEvidence, formation.identity.key, undefined);
  }
  if ((formation.status === "READY" || formation.status === "READY_WITH_LIMIT") && (missingPrerequisites.length > 0 || unknownEvidence.length > 0)) {
    return recommendation(request, "UNKNOWN", scenario, "UNKNOWN", true, ["The ready formation has missing prerequisites or UNKNOWN evidence; recommendation is withheld."], missingPrerequisites, unknownEvidence, formation.identity.key, undefined);
  }
  if (formation.status === "CANDIDATE") {
    return recommendation(request, "CANDIDATE", scenario, "UNKNOWN", true, [`The ${scenario} formation is a bounded catalog candidate, not a ready recipe.`], missingPrerequisites, unknownEvidence, formation.identity.key, formation);
  }
  return recommendation(request, "RECOMMEND", scenario, "COMPATIBLE", false, ["The request matches a ready catalog formation."], missingPrerequisites, unknownEvidence, formation.identity.key, formation);
}

function validateRequest(request: QuickTaskRequest): void {
  if (request.workItemType !== "Quick Task") throw new FormationRecommendationError("workItemType", "must be Quick Task");
  if (request.executionBoundary !== "LOCAL_ONLY") throw new FormationRecommendationError("executionBoundary", "must be LOCAL_ONLY");
}

function validateCatalog(catalog: FormationCatalog): void {
  if (catalog.catalogId !== "agent-formation-library") throw new FormationRecommendationError("catalogId", "must be agent-formation-library");
  if (catalog.catalogVersion !== "1.0.0") throw new FormationRecommendationError("catalogVersion", "must be 1.0.0");
  if (catalog.status !== "READY_WITH_LIMIT") throw new FormationRecommendationError("status", "must be READY_WITH_LIMIT");
  if (!Array.isArray(catalog.formations)) throw new FormationRecommendationError("formations", "must be a list");
}

function recognizeScenario(goal: string): readonly RecognizedScenario[] {
  const tokens = new Set(goal.toLocaleLowerCase().normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 0));
  return scenarioSignals.filter((signal) => signal.terms.some((term) => tokens.has(term))).map((signal) => signal.scenario);
}

function unresolvedPrerequisites(request: QuickTaskRequest, formation: FormationEntry): readonly string[] {
  return formation.prerequisites.filter((prerequisite) => {
    if (prerequisite === "named-outcome-owner") return request.outcomeOwner.trim().length === 0;
    if (prerequisite === "named-decision-owner") return request.outcomeOwner.trim().length === 0;
    if (prerequisite === "current-or-unknown-context") return request.context === undefined;
    if (prerequisite === "bounded-question" || prerequisite === "goal") return request.goal.trim().length === 0;
    if (prerequisite === "claim-under-test") return request.formationInput?.scenario !== "validation" || request.formationInput.claim.trim().length === 0;
    if (prerequisite === "acceptance-criteria") return request.formationInput?.scenario !== "validation" || request.formationInput.acceptanceCriteria.length === 0;
    if (prerequisite === "evidence-sources") return request.formationInput?.scenario !== "validation" || request.formationInput.evidenceSources.length === 0;
    if (prerequisite === "known-limits") return request.formationInput?.scenario !== "validation" || request.formationInput.knownLimits.length === 0;
    if (prerequisite === "current-scope") return request.formationInput?.scenario !== "refinement" || request.formationInput.currentScope.trim().length === 0;
    if (prerequisite === "constraints") return request.formationInput?.scenario !== "refinement" || request.formationInput.constraints.length === 0;
    if (prerequisite === "open-questions") return request.formationInput?.scenario !== "refinement" || request.formationInput.openQuestions.length === 0;
    return true;
  });
}

function unknownRequestEvidence(request: QuickTaskRequest): readonly string[] {
  const evidence: string[] = [];
  if (request.context?.state === "UNKNOWN" || request.context?.state === "STALE") evidence.push("context");
  if (request.relations?.state === "UNKNOWN") evidence.push("relations");
  if (request.dependencies?.state === "UNKNOWN") evidence.push("dependencies");
  return evidence;
}

function recommendation(request: QuickTaskRequest, decision: FormationRecommendationDecision, scenario: FormationScenario | "UNKNOWN", impact: ControllerImpact, requiresAcknowledgement: boolean, reasons: readonly string[], missingPrerequisites: readonly string[], unknownEvidence: readonly string[], identityKey: string, formation: FormationEntry | undefined): FormationRecommendation {
  const result: FormationRecommendation = {
    decision,
    scenario,
    impact,
    requiresAcknowledgement,
    reasons,
    missingPrerequisites,
    unknownEvidence,
    recommendationId: formationRecommendationId(request, scenario, decision, identityKey, missingPrerequisites, unknownEvidence),
  };
  if (formation !== undefined) {
    result.formation = {
      formationId: formation.formationId,
      version: formation.version,
      status: formation.status,
      identityKey: formation.identity.key,
      pattern: formation.identity.pattern,
      recipePath: formation.recipePath,
    };
  }
  return result;
}

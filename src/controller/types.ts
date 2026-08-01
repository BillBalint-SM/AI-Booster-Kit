export interface QuickTaskRecipe {
  recipeId: "quick-task-clarifier-validator";
  recipeVersion: "0.1.0";
  status: "READY_WITH_LIMIT";
  supportedWorkItem: "Quick Task";
  controller: {
    version: 1;
    eligibleComplexities: readonly ["LOW", "MEDIUM"];
    executionBoundary: "LOCAL_ONLY";
    requiredDor: readonly ["value", "context", "relations", "dependencies"];
    authority: "RECOMMENDATION_ONLY";
  };
}

export type ControllerDecision = "RECOMMEND" | "PREPARE" | "NO_AGENT" | "NO_FIT" | "STOPPED";
export type ControllerImpact = "COMPATIBLE" | "DEGRADED" | "BREAKING" | "UNKNOWN";

export interface QuickTaskRequest {
  requestVersion: "1.0";
  workItemType: "Quick Task";
  goal: string;
  outcomeOwner: string;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  executionBoundary: "LOCAL_ONLY";
  value?: { state: "KNOWN"; statement: string } | { state: "UNKNOWN" };
  context?: { state: "CURRENT" | "STALE"; reference: string } | { state: "UNKNOWN" };
  relations?: LinkDeclaration;
  dependencies?: LinkDeclaration;
  preferences?: { continuation: "NO_AGENT" | "CUSTOM_TOOL" };
}

export type LinkDeclaration = { state: "KNOWN"; items: readonly string[] } | { state: "ABSENT" | "UNKNOWN"; items: readonly [] };

export interface ControllerResponse {
  decision: ControllerDecision;
  impact: ControllerImpact;
  requiresAcknowledgement: boolean;
  reasons: readonly string[];
  requiredClarifications: readonly { field: "value" | "context" | "relations" | "dependencies"; rationale: string; severity: "REQUIRED"; decisionImpact: "BLOCKS_RECOMMENDATION" }[];
  recipe: { recipeId: "quick-task-clarifier-validator"; recipeVersion: "0.1.0"; status: "READY_WITH_LIMIT" };
  requestFingerprint: string;
  recipeSignature: string;
  patternId: string;
}

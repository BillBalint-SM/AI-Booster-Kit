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
export type CheckpointChoice = "ACCEPT_RECOMMENDATION" | "REQUEST_ALTERNATIVE" | "CONTINUE_WITHOUT_AGENT";

export interface ControllerRecipeIdentity {
  recipeId: "quick-task-clarifier-validator";
  recipeVersion: "0.1.0";
  status: "READY_WITH_LIMIT";
}

export interface ControllerCheckpoint {
  decision: "RECOMMEND";
  impact: ControllerImpact;
  requiresAcknowledgement: boolean;
  choices: readonly ["ACCEPT_RECOMMENDATION", "REQUEST_ALTERNATIVE", "CONTINUE_WITHOUT_AGENT"];
  recipe: ControllerRecipeIdentity;
  requestFingerprint: string;
  recipeSignature: string;
}

export type CheckpointChoiceInput =
  | {
      choice: "ACCEPT_RECOMMENDATION";
      expectedRequestFingerprint: string;
      expectedRecipeSignature: string;
      acknowledgement?: true;
    }
  | {
      choice: "REQUEST_ALTERNATIVE";
      expectedRequestFingerprint: string;
      expectedRecipeSignature: string;
      rationale: string;
    }
  | {
      choice: "CONTINUE_WITHOUT_AGENT";
      expectedRequestFingerprint: string;
      expectedRecipeSignature: string;
    };

export type ControllerIntent =
  | {
      state: "ACTIVATION_INTENT";
      decision: "RECOMMEND";
      impact: ControllerImpact;
      choice: "ACCEPT_RECOMMENDATION";
      recipe: ControllerRecipeIdentity;
      requestFingerprint: string;
      recipeSignature: string;
      activationPerformed: false;
      artifactGenerationPerformed: false;
    }
  | {
      state: "ALTERNATIVE_REQUESTED";
      decision: "RECOMMEND";
      impact: ControllerImpact;
      choice: "REQUEST_ALTERNATIVE";
      rationale: string;
      recipe: ControllerRecipeIdentity;
      requestFingerprint: string;
      recipeSignature: string;
      activationPerformed: false;
      artifactGenerationPerformed: false;
    }
  | {
      state: "NO_AGENT_CONTINUATION";
      decision: "RECOMMEND";
      impact: ControllerImpact;
      choice: "CONTINUE_WITHOUT_AGENT";
      recipe: ControllerRecipeIdentity;
      requestFingerprint: string;
      recipeSignature: string;
      activationPerformed: false;
      artifactGenerationPerformed: false;
    };

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
  recipe: ControllerRecipeIdentity;
  requestFingerprint: string;
  recipeSignature: string;
  patternId: string;
  checkpoint?: ControllerCheckpoint;
}

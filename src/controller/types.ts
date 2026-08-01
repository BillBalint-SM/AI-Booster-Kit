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

export type FormationCatalogStatus = "READY_WITH_LIMIT";
export type FormationEntryStatus = "CANDIDATE" | "READY_WITH_LIMIT";
export type FormationScenario = "quick_task" | "research" | "refinement" | "development" | "debugging" | "validation";
export type FormationWeight = "light" | "medium" | "heavy";
export type FormationComplexity = "low" | "medium" | "high";
export type FormationTopology = "single-agent" | "sequential" | "parallel-fan-out-fan-in";
export type FormationRole = "clarifier" | "validator" | "human-checkpoint" | "researcher" | "evidence-manager" | "reviewer" | "planner" | "implementer" | "debugger";
export type FormationRelationKind = "implements" | "depends_on" | "blocks" | "validates" | "parallel_to" | "related_to";

export interface FormationCatalog {
  catalogId: "agent-formation-library";
  catalogVersion: "1.0.0";
  status: FormationCatalogStatus;
  formations: readonly FormationEntry[];
}

export interface FormationEntry {
  formationId: string;
  version: string;
  status: FormationEntryStatus;
  scenario: FormationScenario;
  weight: FormationWeight;
  complexity: FormationComplexity;
  topology: FormationTopology;
  roles: readonly FormationRole[];
  requiredInput: readonly string[];
  expectedOutput: readonly string[];
  acceptance: {
    criteria: readonly string[];
    evidence: readonly string[];
  };
  relations: readonly {
    kind: FormationRelationKind;
    target: string;
  }[];
  prerequisites: readonly string[];
  recovery: {
    preserve: readonly string[];
    stopConditions: readonly string[];
  };
  identity: {
    key: string;
    pattern: string;
  };
  executionBoundary: "LOCAL_ONLY";
  authority: "RECOMMENDATION_ONLY";
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

export type ActivationProfile = "clarify" | "research" | "planning" | "validation";
export type ActivationIntent = Extract<ControllerIntent, { state: "ACTIVATION_INTENT" }>;

export interface QuickTaskActivationInput {
  goal: string;
  outcomeOwner: string;
  value: Exclude<QuickTaskRequest["value"], undefined>;
  context: Exclude<QuickTaskRequest["context"], undefined>;
  relations: LinkDeclaration;
  dependencies: LinkDeclaration;
}

export interface ActivationProfileContract {
  requiredSections: readonly string[];
  unknownPolicy: "PRESERVE_AS_UNKNOWN";
  resultState: "NOT_STARTED";
}

export interface QuickTaskActivationPackage {
  activationVersion: "1.0";
  state: "EPHEMERAL_PACKAGE_ISSUED";
  retention: "EPHEMERAL";
  profile: ActivationProfile;
  recipe: ControllerRecipeIdentity;
  intent: {
    state: "ACTIVATION_INTENT";
    requestFingerprint: string;
    recipeSignature: string;
  };
  agent: {
    role: "quick-task-clarifier-validator";
    mode: "assist";
    input: QuickTaskActivationInput;
    outputContract: ActivationProfileContract;
    instructions: readonly string[];
    stopConditions: readonly string[];
    executionBoundary: "LOCAL_ONLY";
  };
  operations: {
    packageIssued: true;
    hostActivationPerformed: false;
    artifactGenerationPerformed: false;
    persistencePerformed: false;
  };
}

export class ControllerActivationPackageError extends Error {
  public constructor(code: string, message: string) {
    super(`${code}: ${message}.`);
    this.name = "ControllerActivationPackageError";
  }
}

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

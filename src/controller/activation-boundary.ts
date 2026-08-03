import { activationPackageFingerprint } from "./identity.js";
import { ControllerActivationPackageError as ActivationPackageError } from "./types.js";
import type {
  ActivationBoundaryInput,
  ActivationBoundaryPackage,
  ActivationSetupSnapshot,
  ContextReference,
  QuickTaskActivationPackage,
  RetentionScope,
  TuningRequest,
} from "./types.js";

const activationPackageKeys = ["activationVersion", "state", "retention", "profile", "recipe", "intent", "agent", "operations"] as const;
const activationRecipeKeys = ["recipeId", "recipeVersion", "status"] as const;
const activationIntentKeys = ["state", "requestFingerprint", "recipeSignature"] as const;
const activationAgentKeys = ["role", "mode", "input", "outputContract", "instructions", "stopConditions", "executionBoundary"] as const;
const activationInputKeys = ["goal", "outcomeOwner", "value", "context", "relations", "dependencies"] as const;
const activationOutputContractKeys = ["requiredSections", "unknownPolicy", "resultState"] as const;
const activationOperationsKeys = ["packageIssued", "hostActivationPerformed", "artifactGenerationPerformed", "persistencePerformed"] as const;
const contextKeys = ["kind", "contextId", "sourceRevision"] as const;
const tuningRequestedKeys = ["state", "change", "rationale"] as const;
const tuningNoneKeys = ["state"] as const;
const setupSnapshotKeys = ["recipeId", "recipeVersion", "variantId", "fingerprint"] as const;
const activationBoundaryInputKeys = ["basePackage", "context", "retention", "tuning", "setupSnapshot"] as const;

export function createActivationBoundaryPackage(input: ActivationBoundaryInput): ActivationBoundaryPackage {
  const validatedInput = validateInput(input);
  const basePackage = structuredClone(validateBasePackage(validatedInput.basePackage));
  const context = structuredClone(validateContext(validatedInput.context));
  const retention = validateRetention(validatedInput.retention);
  const tuning = structuredClone(validateTuning(validatedInput.tuning));
  const setupSnapshot = structuredClone(validateSetupSnapshot(validatedInput.setupSnapshot));

  if (setupSnapshot.recipeId !== basePackage.recipe.recipeId || setupSnapshot.recipeVersion !== basePackage.recipe.recipeVersion) {
    throw new ActivationPackageError("ACTIVATION_SETUP_RECIPE_MISMATCH", "the setup snapshot recipe must match the base package recipe");
  }

  const packageId = activationPackageFingerprint({
    basePackage,
    context,
    retention,
    tuning,
    setupSnapshot,
  });

  return deepFreeze({
    activationVersion: "2.0",
    state: "ACTIVATION_PACKAGE_PREPARED",
    packageId,
    retention,
    context,
    basePackage,
    tuning,
    setupSnapshot,
    rollback: {
      state: "AVAILABLE",
      restoreSetupFingerprint: setupSnapshot.fingerprint,
    },
    operations: {
      packagePrepared: true,
      hostActivationPerformed: false,
      artifactGenerationPerformed: false,
      persistencePerformed: false,
    },
  });
}

function validateInput(value: unknown): ActivationBoundaryInput {
  const record = plainRecord(value, "input", "ACTIVATION_INPUT_INVALID");
  exactKeys(record, activationBoundaryInputKeys, "input", "ACTIVATION_INPUT_INVALID");
  return record as unknown as ActivationBoundaryInput;
}

function validateBasePackage(value: unknown): QuickTaskActivationPackage {
  const record = plainRecord(value, "basePackage", "ACTIVATION_BASE_PACKAGE_INVALID");
  exactKeys(record, activationPackageKeys, "basePackage", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(record, "activationVersion", "1.0", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(record, "state", "EPHEMERAL_PACKAGE_ISSUED", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(record, "retention", "EPHEMERAL", "ACTIVATION_BASE_PACKAGE_INVALID");
  oneOf(record, "profile", ["clarify", "research", "planning", "validation"], "ACTIVATION_BASE_PACKAGE_INVALID");
  validateRecipe(plainRecord(record.recipe, "basePackage.recipe", "ACTIVATION_BASE_PACKAGE_INVALID"));
  validateIntent(plainRecord(record.intent, "basePackage.intent", "ACTIVATION_BASE_PACKAGE_INVALID"));
  validateAgent(plainRecord(record.agent, "basePackage.agent", "ACTIVATION_BASE_PACKAGE_INVALID"));
  validateOperations(plainRecord(record.operations, "basePackage.operations", "ACTIVATION_BASE_PACKAGE_INVALID"));
  return value as QuickTaskActivationPackage;
}

function validateRecipe(value: Record<string, unknown>): void {
  exactKeys(value, activationRecipeKeys, "basePackage.recipe", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "recipeId", "quick-task-clarifier-validator", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "recipeVersion", "0.1.0", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "status", "READY_WITH_LIMIT", "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateIntent(value: Record<string, unknown>): void {
  exactKeys(value, activationIntentKeys, "basePackage.intent", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "state", "ACTIVATION_INTENT", "ACTIVATION_BASE_PACKAGE_INVALID");
  hex64(value, "requestFingerprint", "ACTIVATION_BASE_PACKAGE_INVALID");
  hex64(value, "recipeSignature", "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateAgent(value: Record<string, unknown>): void {
  exactKeys(value, activationAgentKeys, "basePackage.agent", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "role", "quick-task-clarifier-validator", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "mode", "assist", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "executionBoundary", "LOCAL_ONLY", "ACTIVATION_BASE_PACKAGE_INVALID");
  validateActivationInput(plainRecord(value.input, "basePackage.agent.input", "ACTIVATION_BASE_PACKAGE_INVALID"));
  validateOutputContract(plainRecord(value.outputContract, "basePackage.agent.outputContract", "ACTIVATION_BASE_PACKAGE_INVALID"));
  stringArray(value.instructions, "basePackage.agent.instructions", "ACTIVATION_BASE_PACKAGE_INVALID");
  stringArray(value.stopConditions, "basePackage.agent.stopConditions", "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateActivationInput(value: Record<string, unknown>): void {
  exactKeys(value, activationInputKeys, "basePackage.agent.input", "ACTIVATION_BASE_PACKAGE_INVALID");
  nonEmpty(value, "goal", "ACTIVATION_BASE_PACKAGE_INVALID");
  nonEmpty(value, "outcomeOwner", "ACTIVATION_BASE_PACKAGE_INVALID");
  validateActivationValue(value.value);
  validateActivationContext(value.context);
  validateLinkDeclaration(value.relations, "basePackage.agent.input.relations");
  validateLinkDeclaration(value.dependencies, "basePackage.agent.input.dependencies");
}

function validateActivationValue(value: unknown): void {
  const record = plainRecord(value, "basePackage.agent.input.value", "ACTIVATION_BASE_PACKAGE_INVALID");
  allowedEnumerableDataKeys(record, ["state", "statement"], "basePackage.agent.input.value", "ACTIVATION_BASE_PACKAGE_INVALID");
  const state = oneOf(record, "state", ["KNOWN", "UNKNOWN"], "ACTIVATION_BASE_PACKAGE_INVALID");
  exactKeys(record, state === "KNOWN" ? ["state", "statement"] : ["state"], "basePackage.agent.input.value", "ACTIVATION_BASE_PACKAGE_INVALID");
  if (state === "KNOWN") nonEmpty(record, "statement", "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateActivationContext(value: unknown): void {
  const record = plainRecord(value, "basePackage.agent.input.context", "ACTIVATION_BASE_PACKAGE_INVALID");
  allowedEnumerableDataKeys(record, ["state", "reference"], "basePackage.agent.input.context", "ACTIVATION_BASE_PACKAGE_INVALID");
  const state = oneOf(record, "state", ["CURRENT", "STALE", "UNKNOWN"], "ACTIVATION_BASE_PACKAGE_INVALID");
  exactKeys(record, state === "UNKNOWN" ? ["state"] : ["state", "reference"], "basePackage.agent.input.context", "ACTIVATION_BASE_PACKAGE_INVALID");
  if (state !== "UNKNOWN") nonEmpty(record, "reference", "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateLinkDeclaration(value: unknown, field: string): void {
  const record = plainRecord(value, field, "ACTIVATION_BASE_PACKAGE_INVALID");
  exactKeys(record, ["state", "items"], field, "ACTIVATION_BASE_PACKAGE_INVALID");
  const state = oneOf(record, "state", ["KNOWN", "ABSENT", "UNKNOWN"], "ACTIVATION_BASE_PACKAGE_INVALID");
  const items = stringArray(record.items, `${field}.items`, "ACTIVATION_BASE_PACKAGE_INVALID");
  if (state === "KNOWN" && items.length === 0) throw new ActivationPackageError("ACTIVATION_BASE_PACKAGE_INVALID", `${field} must include at least one item when state is KNOWN`);
  if (state !== "KNOWN" && items.length !== 0) throw new ActivationPackageError("ACTIVATION_BASE_PACKAGE_INVALID", `${field} must be empty unless state is KNOWN`);
}

function validateOutputContract(value: Record<string, unknown>): void {
  exactKeys(value, activationOutputContractKeys, "basePackage.agent.outputContract", "ACTIVATION_BASE_PACKAGE_INVALID");
  stringArray(value.requiredSections, "basePackage.agent.outputContract.requiredSections", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "unknownPolicy", "PRESERVE_AS_UNKNOWN", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "resultState", "NOT_STARTED", "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateOperations(value: Record<string, unknown>): void {
  exactKeys(value, activationOperationsKeys, "basePackage.operations", "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "packageIssued", true, "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "hostActivationPerformed", false, "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "artifactGenerationPerformed", false, "ACTIVATION_BASE_PACKAGE_INVALID");
  literal(value, "persistencePerformed", false, "ACTIVATION_BASE_PACKAGE_INVALID");
}

function validateContext(value: unknown): ContextReference {
  const record = plainRecord(value, "context", "ACTIVATION_CONTEXT_INVALID");
  exactKeys(record, contextKeys, "context", "ACTIVATION_CONTEXT_INVALID");
  oneOf(record, "kind", ["EPIC", "MILESTONE"], "ACTIVATION_CONTEXT_INVALID");
  nonEmpty(record, "contextId", "ACTIVATION_CONTEXT_INVALID");
  nonEmpty(record, "sourceRevision", "ACTIVATION_CONTEXT_INVALID");
  return value as ContextReference;
}

function validateRetention(value: unknown): RetentionScope {
  if (value !== "EPHEMERAL" && value !== "PERSONAL" && value !== "TEAM") {
    throw new ActivationPackageError("ACTIVATION_RETENTION_INVALID", "the retention scope must be EPHEMERAL, PERSONAL, or TEAM");
  }
  return value as RetentionScope;
}

function validateTuning(value: unknown): TuningRequest {
  const record = plainRecord(value, "tuning", "ACTIVATION_TUNING_INVALID");
  allowedEnumerableDataKeys(record, tuningRequestedKeys, "tuning", "ACTIVATION_TUNING_INVALID");
  const state = oneOf(record, "state", ["NONE", "REQUESTED"], "ACTIVATION_TUNING_INVALID");
  exactKeys(record, state === "NONE" ? tuningNoneKeys : tuningRequestedKeys, "tuning", "ACTIVATION_TUNING_INVALID");
  if (state === "REQUESTED") {
    nonEmpty(record, "change", "ACTIVATION_TUNING_INVALID");
    nonEmpty(record, "rationale", "ACTIVATION_TUNING_INVALID");
  }
  return value as TuningRequest;
}

function validateSetupSnapshot(value: unknown): ActivationSetupSnapshot {
  const record = plainRecord(value, "setupSnapshot", "ACTIVATION_SETUP_SNAPSHOT_INVALID");
  exactKeys(record, setupSnapshotKeys, "setupSnapshot", "ACTIVATION_SETUP_SNAPSHOT_INVALID");
  nonEmpty(record, "recipeId", "ACTIVATION_SETUP_SNAPSHOT_INVALID");
  nonEmpty(record, "recipeVersion", "ACTIVATION_SETUP_SNAPSHOT_INVALID");
  nonEmpty(record, "variantId", "ACTIVATION_SETUP_SNAPSHOT_INVALID");
  nonEmpty(record, "fingerprint", "ACTIVATION_SETUP_SNAPSHOT_INVALID");
  return value as ActivationSetupSnapshot;
}

function plainRecord(value: unknown, field: string, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ActivationPackageError(code, `${field} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], field: string, code: string): void {
  allowedEnumerableDataKeys(record, expected, field, code);
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new ActivationPackageError(code, `${field}.${key} is required`);
    }
  }
}

function allowedEnumerableDataKeys(record: Record<string, unknown>, expected: readonly string[], field: string, code: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new ActivationPackageError(code, `${field} must not contain symbol keys`);
    if (!expected.includes(key)) throw new ActivationPackageError(code, `${field} contains unsupported fields`);
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new ActivationPackageError(code, `${field} must contain only enumerable data fields`);
    }
  }
}

function literal<T extends string | boolean>(record: Record<string, unknown>, field: string, expected: T, code: string): T {
  if (record[field] !== expected) throw new ActivationPackageError(code, `${field} must be ${String(expected)}`);
  return expected;
}

function oneOf<T extends string>(record: Record<string, unknown>, field: string, expected: readonly T[], code: string): T {
  const value = record[field];
  if (typeof value !== "string" || !expected.includes(value as T)) {
    throw new ActivationPackageError(code, `${field} must be one of ${expected.join(", ")}`);
  }
  return value as T;
}

function nonEmpty(record: Record<string, unknown>, field: string, code: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ActivationPackageError(code, `${field} must be a non-empty string`);
  }
  return value;
}

function stringArray(value: unknown, field: string, code: string): string[] {
  if (!Array.isArray(value)) {
    throw new ActivationPackageError(code, `${field} must be a list of non-empty strings`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Number.isInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    Reflect.ownKeys(value).length !== lengthDescriptor.value + 1
  ) {
    throw new ActivationPackageError(code, `${field} must be a list of non-empty strings`);
  }
  const strings = new Array<string>(lengthDescriptor.value);
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    if (typeof key !== "string") {
      throw new ActivationPackageError(code, `${field} must be a list of non-empty strings`);
    }
    const index = Number(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= lengthDescriptor.value ||
      String(index) !== key ||
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      typeof descriptor.value !== "string" ||
      descriptor.value.trim() === ""
    ) {
      throw new ActivationPackageError(code, `${field} must be a list of non-empty strings`);
    }
    strings[index] = descriptor.value;
  }
  return strings;
}

function hex64(record: Record<string, unknown>, field: string, code: string): string {
  const value = record[field];
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new ActivationPackageError(code, `${field} must be a 64-character hexadecimal string`);
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      const nested = (value as Record<PropertyKey, unknown>)[key];
      if (nested !== null && typeof nested === "object") deepFreeze(nested);
    }
  }
  return value;
}

import { readFile } from "node:fs/promises";

import { claudeCodeAdapter } from "./adapters/claude-code.js";
import { codexAdapter } from "./adapters/codex.js";
import { cursorAdapter } from "./adapters/cursor.js";
import { parseMarkdownContract, validateContractPath } from "./contract/markdown.js";
import { validateCanonicalEvent } from "./events/envelope.js";
import { assertSafeEvidenceRefs, EvidenceValidationError } from "./orchestrator/evidence.js";
import { loadG2asReadinessManifest } from "./readiness/manifest.js";
import { loadGithubReadOnlyCapability } from "./capabilities/manifest.js";
import { type ReadinessAdapter, type ReadinessObservationBundle } from "./readiness/observations.js";
import { writeReadinessCertificate } from "./readiness/output.js";
import { runReadinessCertificate } from "./readiness/run.js";
import { createQuickTaskActivationPackage, parseActivationProfile } from "./controller/activation-package.js";
import { evaluateQuickTask, ControllerEvaluationError } from "./controller/evaluate.js";
import { FormationCatalogError, loadFormationCatalog } from "./controller/formation.js";
import { FormationRecommendationError, recommendFormation } from "./controller/formation-recommendation.js";
import { ControllerCheckpointError, parseCheckpointChoice } from "./controller/choice.js";
import { ControllerRecipeError, loadQuickTaskRecipe } from "./controller/recipe.js";
import { ControllerRequestError, parseQuickTaskRequest } from "./controller/request.js";
import { resolveCheckpoint } from "./controller/resolve.js";
import { createActivationBoundaryPackage } from "./controller/activation-boundary.js";
import { saveActivationPackage } from "./controller/activation-storage.js";
import { ControllerActivationPackageError } from "./controller/types.js";
import type { ActivationBoundaryPackage, ActivationContextKind, RetentionScope, TuningRequest } from "./controller/types.js";
import { parseWorkContext } from "./context/markdown.js";
import { evaluateSessionResume } from "./context/resume.js";
import { saveSessionState, saveWorkContext } from "./context/storage.js";
import { ContextError } from "./context/types.js";
import { validateMilestoneContext, validateSessionState } from "./context/validation.js";
import type { ResumeRuntime, SessionState, WorkContext } from "./context/types.js";

const helpText = `Usage: npm run cli -- <command>

Commands:
  validate      Validate the canonical contract
  finalize      Finalize an accepted work artifact
  sync          Validate local planned or local-result sync output
  conformance   Run cross-host conformance checks
  readiness     Generate a local G2AS Sandbox Readiness Certificate
  quick-task    Recommend the local Quick Task recipe
  recommend-formation  Recommend a catalog formation without activation
  resolve-checkpoint  Resolve an explicit local Quick Task checkpoint
  activate-quick-task  Issue an ephemeral Quick Task Activation Package
  prepare-activation  Prepare an explicit M2 activation package
  save-activation     Save an explicit Personal or Team activation package
  validate-context    Validate an explicit Milestone or Epic context artifact
  save-context        Save an explicit Personal or Team context artifact
  save-session        Save an explicit Personal or Team compact session state
  resume-session      Evaluate an explicit compact session state without writes
`;

export async function runCli(argv: readonly string[]): Promise<number> {
  try {
    return await dispatchCli(argv);
  } catch (error) {
    if (error instanceof CliError) {
      writeError(error.code);
      return error.exitCode;
    }
    throw error;
  }
}

async function dispatchCli(argv: readonly string[]): Promise<number> {
  const command = argv[0];

  if (command === "--help" || command === "-h" || command === undefined) {
    process.stdout.write(helpText);
    return 0;
  }

  if (command === "validate") {
    return runValidate(argv.slice(1));
  }

  if (command === "finalize") return runFinalize(argv.slice(1));
  if (command === "sync") return runSync(argv.slice(1));
  if (command === "conformance") return runConformance(argv.slice(1));
  if (command === "readiness") return runReadiness(argv.slice(1));
  if (command === "quick-task") return runQuickTask(argv.slice(1));
  if (command === "recommend-formation") return runFormationRecommendation(argv.slice(1));
  if (command === "resolve-checkpoint") return runResolveCheckpoint(argv.slice(1));
  if (command === "activate-quick-task") return runActivateQuickTask(argv.slice(1));
  if (command === "prepare-activation") return runPrepareActivation(argv.slice(1));
  if (command === "save-activation") return runSaveActivation(argv.slice(1));
  if (command === "validate-context") return runValidateContext(argv.slice(1));
  if (command === "save-context") return runSaveContext(argv.slice(1));
  if (command === "save-session") return runSaveSession(argv.slice(1));
  if (command === "resume-session") return runResumeSession(argv.slice(1));

  throw new CliError("CONFIGURATION_ERROR", 4);
}

async function runQuickTask(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv.length !== 2) return stoppedController("COMMAND_CONFIGURATION_INVALID", "quick-task requires exactly --input <path>", 4);
  let source: string;
  try { source = await readFile(argv[1], "utf8"); } catch (error) {
    if (isSystemError(error)) return stoppedController("INPUT_PATH_UNREADABLE", "The explicit input path could not be read", 4);
    throw error;
  }
  let input: unknown;
  try { input = JSON.parse(source) as unknown; } catch (error) {
    if (error instanceof SyntaxError) return stoppedController("INPUT_JSON_INVALID", "The explicit input is not valid JSON", 3);
    throw error;
  }
  try {
    const response = evaluateQuickTask(parseQuickTaskRequest(input), await loadQuickTaskRecipe("contract/agent-library/quick-task-clarifier-validator.md"));
    process.stdout.write(`${JSON.stringify(response)}\n`);
    return response.decision === "RECOMMEND" || response.decision === "NO_AGENT" ? 0 : 2;
  } catch (error) {
    if (error instanceof ControllerRequestError || error instanceof ControllerRecipeError || error instanceof ControllerEvaluationError) return stoppedController("CONTROLLER_VALIDATION_FAILED", error.message, 3);
    throw error;
  }
}

async function runFormationRecommendation(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv.length !== 2) return stoppedController("COMMAND_CONFIGURATION_INVALID", "recommend-formation requires exactly --input <path>", 4);
  let source: string;
  try { source = await readFile(argv[1], "utf8"); } catch (error) {
    if (isSystemError(error)) return stoppedController("FORMATION_INPUT_PATH_UNREADABLE", "The explicit input path could not be read", 4);
    throw error;
  }
  let input: unknown;
  try { input = JSON.parse(source) as unknown; } catch (error) {
    if (error instanceof SyntaxError) return stoppedController("FORMATION_INPUT_JSON_INVALID", "The explicit input is not valid JSON", 3);
    throw error;
  }
  try {
    const recommendation = recommendFormation(parseQuickTaskRequest(input), await loadFormationCatalog("contract/agent-library/formation-catalog.md"));
    process.stdout.write(`${JSON.stringify(recommendation)}\n`);
    return recommendation.decision === "RECOMMEND" || recommendation.decision === "NO_AGENT" ? 0 : 2;
  } catch (error) {
    if (error instanceof ControllerRequestError) return stoppedController("FORMATION_REQUEST_VALIDATION_FAILED", "The formation recommendation request was rejected", 3);
    if (error instanceof FormationCatalogError || error instanceof FormationRecommendationError) return stoppedController("FORMATION_RECOMMENDATION_FAILED", "The formation recommendation stopped safely", 3);
    throw error;
  }
}

async function runResolveCheckpoint(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv[2] !== "--choice" || argv[3] === undefined || argv.length !== 4) {
    return stoppedController("COMMAND_CONFIGURATION_INVALID", "resolve-checkpoint requires exactly --input <path> --choice <path>", 4);
  }
  let requestSource: string;
  try { requestSource = await readFile(argv[1], "utf8"); } catch (error) {
    if (isSystemError(error)) return stoppedController("INPUT_PATH_UNREADABLE", "The explicit input path could not be read", 4);
    throw error;
  }
  let choiceSource: string;
  try { choiceSource = await readFile(argv[3], "utf8"); } catch (error) {
    if (isSystemError(error)) return stoppedController("CHOICE_PATH_UNREADABLE", "The explicit choice path could not be read", 4);
    throw error;
  }
  let requestInput: unknown;
  try { requestInput = JSON.parse(requestSource) as unknown; } catch (error) {
    if (error instanceof SyntaxError) return stoppedController("INPUT_JSON_INVALID", "The explicit input is not valid JSON", 3);
    throw error;
  }
  let choiceInput: unknown;
  try { choiceInput = JSON.parse(choiceSource) as unknown; } catch (error) {
    if (error instanceof SyntaxError) return stoppedController("CHOICE_JSON_INVALID", "The explicit choice is not valid JSON", 3);
    throw error;
  }
  try {
    const response = evaluateQuickTask(parseQuickTaskRequest(requestInput), await loadQuickTaskRecipe("contract/agent-library/quick-task-clarifier-validator.md"));
    process.stdout.write(`${JSON.stringify(resolveCheckpoint(response, parseCheckpointChoice(choiceInput)))}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ControllerRequestError || error instanceof ControllerRecipeError || error instanceof ControllerEvaluationError || error instanceof ControllerCheckpointError) {
      return stoppedController("CHECKPOINT_RESOLUTION_FAILED", error.message, 3);
    }
    throw error;
  }
}

async function runActivateQuickTask(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv[2] !== "--choice" || argv[3] === undefined || argv[4] !== "--profile" || argv[5] === undefined || argv.length !== 6) {
    return stoppedController("COMMAND_CONFIGURATION_INVALID", "activate-quick-task requires exactly --input <path> --choice <path> --profile <profile>", 4);
  }

  let requestSource: string;
  try { requestSource = await readFile(argv[1], "utf8"); } catch (error) {
    if (isSystemError(error)) return stoppedController("ACTIVATION_INPUT_PATH_UNREADABLE", "The explicit activation input path could not be read", 4);
    throw error;
  }
  let choiceSource: string;
  try { choiceSource = await readFile(argv[3], "utf8"); } catch (error) {
    if (isSystemError(error)) return stoppedController("ACTIVATION_CHOICE_PATH_UNREADABLE", "The explicit activation choice path could not be read", 4);
    throw error;
  }

  let requestInput: unknown;
  try { requestInput = JSON.parse(requestSource) as unknown; } catch (error) {
    if (error instanceof SyntaxError) return stoppedController("ACTIVATION_INPUT_JSON_INVALID", "The explicit activation input is not valid JSON", 3);
    throw error;
  }
  let choiceInput: unknown;
  try { choiceInput = JSON.parse(choiceSource) as unknown; } catch (error) {
    if (error instanceof SyntaxError) return stoppedController("ACTIVATION_CHOICE_JSON_INVALID", "The explicit activation choice is not valid JSON", 3);
    throw error;
  }

  try {
    const profile = parseActivationProfile(argv[5]);
    const recipe = await loadQuickTaskRecipe("contract/agent-library/quick-task-clarifier-validator.md");
    const request = parseQuickTaskRequest(requestInput);
    const response = evaluateQuickTask(request, recipe);
    const intent = resolveCheckpoint(response, parseCheckpointChoice(choiceInput));
    if (intent.state !== "ACTIVATION_INTENT") return stoppedController("ACTIVATION_INTENT_REQUIRED", "A current activation intent is required before package issuance", 3);
    const activationPackage = createQuickTaskActivationPackage(request, intent, profile);
    process.stdout.write(`${JSON.stringify(activationPackage)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ControllerRequestError || error instanceof ControllerRecipeError || error instanceof ControllerEvaluationError || error instanceof ControllerCheckpointError || error instanceof ControllerActivationPackageError) {
      return stoppedController(activationErrorCode(error), "Activation package request stopped safely", 3);
    }
    throw error;
  }
}

async function runPrepareActivation(argv: readonly string[]): Promise<number> {
  if (
    argv[0] !== "--input" || argv[1] === undefined ||
    argv[2] !== "--choice" || argv[3] === undefined ||
    argv[4] !== "--profile" || argv[5] === undefined ||
    argv[6] !== "--context-kind" || argv[7] === undefined ||
    argv[8] !== "--context-id" || argv[9] === undefined ||
    argv[10] !== "--context-revision" || argv[11] === undefined ||
    argv[12] !== "--retention" || argv[13] === undefined ||
    argv[14] !== "--tuning" || argv[15] === undefined ||
    argv.length !== 16
  ) {
    return stoppedController("COMMAND_CONFIGURATION_INVALID", "prepare-activation requires the exact activation arguments", 4);
  }

  try {
    const requestInput = await readActivationJson(argv[1], "ACTIVATION_INPUT_PATH_UNREADABLE", "ACTIVATION_INPUT_JSON_INVALID");
    const choiceInput = await readActivationJson(argv[3], "ACTIVATION_CHOICE_PATH_UNREADABLE", "ACTIVATION_CHOICE_JSON_INVALID");
    const tuningInput = await readActivationJson(argv[15], "ACTIVATION_TUNING_PATH_UNREADABLE", "ACTIVATION_TUNING_JSON_INVALID");
    const profile = parseActivationProfile(argv[5]);
    const recipe = await loadQuickTaskRecipe("contract/agent-library/quick-task-clarifier-validator.md");
    const request = parseQuickTaskRequest(requestInput);
    const response = evaluateQuickTask(request, recipe);
    const intent = resolveCheckpoint(response, parseCheckpointChoice(choiceInput));
    if (intent.state !== "ACTIVATION_INTENT") return stoppedController("ACTIVATION_INTENT_REQUIRED", "A current activation intent is required before package preparation", 3);
    const basePackage = createQuickTaskActivationPackage(request, intent, profile);
    const activationPackage = createActivationBoundaryPackage({
      basePackage,
      context: {
        kind: argv[7] as ActivationContextKind,
        contextId: argv[9],
        sourceRevision: argv[11],
      },
      retention: argv[13] as RetentionScope,
      tuning: tuningInput as TuningRequest,
      setupSnapshot: {
        recipeId: basePackage.recipe.recipeId,
        recipeVersion: basePackage.recipe.recipeVersion,
        variantId: profile,
        fingerprint: basePackage.intent.recipeSignature,
      },
    });
    process.stdout.write(`${JSON.stringify(activationPackage)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ActivationCliError) return stoppedController(error.code, "Activation input processing stopped safely", error.exitCode);
    if (error instanceof ControllerRequestError || error instanceof ControllerRecipeError || error instanceof ControllerEvaluationError || error instanceof ControllerCheckpointError || error instanceof ControllerActivationPackageError) {
      return stoppedController(activationErrorCode(error), "Activation preparation stopped safely", 3);
    }
    throw error;
  }
}

async function runSaveActivation(argv: readonly string[]): Promise<number> {
  if (
    argv[0] !== "--input" || argv[1] === undefined ||
    argv[2] !== "--target" || argv[3] === undefined ||
    (argv.length !== 4 && argv.length !== 6) ||
    (argv.length === 6 && (argv[4] !== "--repository-root" || argv[5] === undefined))
  ) {
    return stoppedController("COMMAND_CONFIGURATION_INVALID", "save-activation requires the exact save arguments", 4);
  }

  try {
    const packageInput = await readActivationJson(argv[1], "ACTIVATION_PACKAGE_PATH_UNREADABLE", "ACTIVATION_PACKAGE_JSON_INVALID");
    const result = await saveActivationPackage(argv[3], packageInput as ActivationBoundaryPackage, argv.length === 6 ? argv[5] : undefined);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ActivationCliError) return stoppedController(error.code, "Activation package input processing stopped safely", error.exitCode);
    if (error instanceof ControllerActivationPackageError) return stoppedController(activationErrorCode(error), "Activation package saving stopped safely", 3);
    throw error;
  }
}

async function runValidateContext(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv.length !== 2) return stoppedController("COMMAND_CONFIGURATION_INVALID", "validate-context requires exactly --input <path>", 4);
  try {
    const context = parseWorkContext(await readContextSource(argv[1]), "explicit context");
    process.stdout.write(`${JSON.stringify({ kind: context.kind, contextId: context.contextId, sourceRevision: context.sourceRevision, state: context.state })}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ContextCliError) return stoppedController(error.code, "Context input processing stopped safely", error.exitCode);
    if (error instanceof ContextError) return stoppedController("CONTEXT_VALIDATION_FAILED", "Context validation stopped safely", 3);
    throw error;
  }
}

async function runSaveContext(argv: readonly string[]): Promise<number> {
  if (!isSaveArguments(argv)) return stoppedController("COMMAND_CONFIGURATION_INVALID", "save-context requires the exact save arguments", 4);
  try {
    const context = parseWorkContext(await readContextSource(argv[1]!), "explicit context");
    const result = await saveWorkContext(argv[3]!, context, argv.length === 6 ? argv[5] : undefined);
    process.stdout.write(`${JSON.stringify({ state: result.state, contextId: result.contextId, retention: result.retention, persistencePerformed: result.persistencePerformed })}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ContextCliError) return stoppedController(error.code, "Context input processing stopped safely", error.exitCode);
    if (error instanceof ContextError) return stoppedController(contextStorageCode(error, "CONTEXT_VALIDATION_FAILED"), "Context saving stopped safely", 3);
    throw error;
  }
}

async function runSaveSession(argv: readonly string[]): Promise<number> {
  if (!isSaveArguments(argv)) return stoppedController("COMMAND_CONFIGURATION_INVALID", "save-session requires the exact save arguments", 4);
  try {
    const state = validateSessionState(await readContextJson(argv[1]!, "CONTEXT_SESSION_PATH_UNREADABLE", "CONTEXT_SESSION_JSON_INVALID"));
    const result = await saveSessionState(argv[3]!, state, argv.length === 6 ? argv[5] : undefined);
    process.stdout.write(`${JSON.stringify({ state: result.state, sessionId: result.sessionId, retention: result.retention, persistencePerformed: result.persistencePerformed })}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ContextCliError) return stoppedController(error.code, "Session input processing stopped safely", error.exitCode);
    if (error instanceof ContextError) return stoppedController(contextStorageCode(error, "CONTEXT_SESSION_INVALID"), "Session saving stopped safely", 3);
    throw error;
  }
}

async function runResumeSession(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--state" || argv[1] === undefined || argv[2] !== "--contexts" || argv[3] === undefined || argv[4] !== "--runtime" || argv[5] === undefined || argv.length !== 6) {
    return stoppedController("COMMAND_CONFIGURATION_INVALID", "resume-session requires the exact resume arguments", 4);
  }
  try {
    const state = validateSessionState(await readContextJson(argv[1], "CONTEXT_SESSION_PATH_UNREADABLE", "CONTEXT_SESSION_JSON_INVALID"));
    const manifest = parseContextManifest(await readContextJson(argv[3], "CONTEXT_MANIFEST_PATH_UNREADABLE", "CONTEXT_MANIFEST_JSON_INVALID"));
    const contexts = await loadManifestContexts(manifest);
    const runtime = parseResumeRuntime(await readContextJson(argv[5], "CONTEXT_RUNTIME_PATH_UNREADABLE", "CONTEXT_RUNTIME_JSON_INVALID"));
    const result = evaluateSessionResume(state, contexts, runtime);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.decision === "RESUME" ? 0 : 2;
  } catch (error) {
    if (error instanceof ContextCliError) return stoppedController(error.code, "Session resume input processing stopped safely", error.exitCode);
    if (error instanceof ContextError) return stoppedController("CONTEXT_RESUME_INPUT_INVALID", "Session resume stopped safely", 3);
    throw error;
  }
}

function isSaveArguments(argv: readonly string[]): boolean {
  return argv[0] === "--input" && argv[1] !== undefined && argv[2] === "--target" && argv[3] !== undefined && (argv.length === 4 || (argv.length === 6 && argv[4] === "--repository-root" && argv[5] !== undefined));
}

async function readContextSource(path: string): Promise<string> {
  try { return await readFile(path, "utf8"); } catch (error) {
    if (isSystemError(error)) throw new ContextCliError("CONTEXT_INPUT_PATH_UNREADABLE", 4);
    throw error;
  }
}

async function readContextJson(path: string, unreadableCode: string, invalidJsonCode: string): Promise<unknown> {
  let source: string;
  try { source = await readFile(path, "utf8"); } catch (error) {
    if (isSystemError(error)) throw new ContextCliError(unreadableCode, 4);
    throw error;
  }
  try { return JSON.parse(source) as unknown; } catch (error) {
    if (error instanceof SyntaxError) throw new ContextCliError(invalidJsonCode, 3);
    throw error;
  }
}

function parseContextManifest(value: unknown): { milestonePath: string; epicPaths: readonly string[] } {
  const record = plainContextRecord(value, "context manifest");
  if (Object.keys(record).length !== 2 || !Object.hasOwn(record, "milestonePath") || !Object.hasOwn(record, "epicPaths")) throw new ContextError("context manifest fields are invalid");
  const milestonePath = requiredContextString(record.milestonePath, "context manifest milestonePath");
  if (!Array.isArray(record.epicPaths) || record.epicPaths.some((path) => typeof path !== "string" || path.trim() === "")) throw new ContextError("context manifest epicPaths are invalid");
  return { milestonePath, epicPaths: record.epicPaths };
}

async function loadManifestContexts(manifest: { milestonePath: string; epicPaths: readonly string[] }): Promise<readonly WorkContext[]> {
  const milestone = parseWorkContext(await readContextSource(manifest.milestonePath), "manifest Milestone context");
  if (milestone.kind !== "MILESTONE") throw new ContextError("context manifest Milestone path does not contain a Milestone-context");
  const epics = await Promise.all(manifest.epicPaths.map(async (path) => parseWorkContext(await readContextSource(path), "manifest Epic context")));
  if (epics.some((context) => context.kind !== "EPIC")) throw new ContextError("context manifest Epic path does not contain an Epic-context");
  validateMilestoneContext(milestone, epics.filter((context): context is Extract<WorkContext, { kind: "EPIC" }> => context.kind === "EPIC"));
  return [milestone, ...epics];
}

function parseResumeRuntime(value: unknown): ResumeRuntime {
  const record = plainContextRecord(value, "resume runtime");
  const expected = ["repository", "branch", "worktree", "baseRevision", "currentSetupFingerprint", "evidenceRefs"];
  if (Object.keys(record).length !== expected.length || expected.some((key) => !Object.hasOwn(record, key))) throw new ContextError("resume runtime fields are invalid");
  return {
    repository: nullableContextString(record.repository, "resume runtime repository"),
    branch: nullableContextString(record.branch, "resume runtime branch"),
    worktree: nullableContextString(record.worktree, "resume runtime worktree"),
    baseRevision: nullableContextString(record.baseRevision, "resume runtime baseRevision"),
    currentSetupFingerprint: nullableContextString(record.currentSetupFingerprint, "resume runtime currentSetupFingerprint"),
    evidenceRefs: contextStringList(record.evidenceRefs, "resume runtime evidenceRefs"),
  };
}

function plainContextRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new ContextError(`${label} must be a plain object`);
  return value as Record<string, unknown>;
}

function requiredContextString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ContextError(`${label} must be a non-empty string`);
  return value;
}

function nullableContextString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requiredContextString(value, label);
}

function contextStringList(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "") || new Set(value).size !== value.length) {
    throw new ContextError(`${label} must be a unique list of non-empty strings`);
  }
  return value;
}

function contextStorageCode(error: ContextError, fallback: string): string {
  return error.code ?? fallback;
}

async function readActivationJson(path: string, unreadableCode: string, invalidJsonCode: string): Promise<unknown> {
  let source: string;
  try { source = await readFile(path, "utf8"); } catch (error) {
    if (isSystemError(error)) throw new ActivationCliError(unreadableCode, 4);
    throw error;
  }
  try { return JSON.parse(source) as unknown; } catch (error) {
    if (error instanceof SyntaxError) throw new ActivationCliError(invalidJsonCode, 3);
    throw error;
  }
}

function activationErrorCode(error: Error): string {
  if (error instanceof ControllerActivationPackageError) return error.code;
  const checkpointCode = /^Quick Task checkpoint rejected: ([A-Z_]+)/.exec(error.message)?.[1];
  if (checkpointCode !== undefined) return checkpointCode;
  return "CONTROLLER_VALIDATION_FAILED";
}

function stoppedController(code: string, message: string, exitCode: 3 | 4): 3 | 4 {
  process.stdout.write(`${JSON.stringify({ decision: "STOPPED", impact: "UNKNOWN", requiresAcknowledgement: false, error: { code, message } })}\n`);
  return exitCode;
}

async function runValidate(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--contract" || argv[1] === undefined || argv.length !== 2) {
    throw new CliError("CONFIGURATION_ERROR", 4);
  }
  let summary;
  try { summary = await validateContractPath(argv[1]); } catch (error) {
    if (isSystemError(error)) throw new CliError("CONFIGURATION_ERROR", 4);
    throw error;
  }
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  return summary.valid ? 0 : 2;
}

async function runFinalize(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv[2] !== "--dry-run" || argv.length !== 3) {
    throw new CliError("CONFIGURATION_ERROR", 4);
  }
  const source = await readLocalFile(argv[1]);
  if (!/\bState:\s*Finalized\b/i.test(source)) {
    throw new CliError("VALIDATION_FAILED", 2);
  }
  process.stdout.write(`${JSON.stringify({ state: "planned", operation: "finalize", input: argv[1] })}\n`);
  return 0;
}

async function runSync(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--event" || argv[1] === undefined) {
    throw new CliError("CONFIGURATION_ERROR", 4);
  }
  const event = parseSafeEvent(await readLocalFile(argv[1]));
  if (argv[2] === "--dry-run" && argv.length === 3) {
    process.stdout.write(`${JSON.stringify({ state: "planned", correlationId: event.correlationId, operation: event.source.requestedOperation, evidenceRefs: [...event.evidenceRefs, `planned:${event.source.requestedOperation}:${event.source.canonicalId}`] })}\n`);
    return 0;
  }
  if (argv[2] === "--local-result" && argv.length === 4 && argv[3] === "unknown") {
    process.stdout.write(`${JSON.stringify({ state: "unknown", correlationId: event.correlationId, evidenceRefs: [...event.evidenceRefs, "audit:local_unknown_completion"], errorCode: "LOCAL_UNKNOWN_COMPLETION" })}\n`);
    return 3;
  }
  throw new CliError("CONFIGURATION_ERROR", 4);
}

async function runConformance(argv: readonly string[]): Promise<number> {
  if (argv.length !== 0) {
    throw new CliError("CONFIGURATION_ERROR", 4);
  }
  const contract = parseMarkdownContract(await readLocalFile("contract/team-contract.md"), "contract/team-contract.md");
  const adapters = [codexAdapter, claudeCodeAdapter, cursorAdapter].map((adapter) => {
    const report = adapter.capabilityReport();
    adapter.compile(contract);
    return { host: report.host, limitations: report.limitations, externalWrite: report.capabilities.externalWrite };
  });
  process.stdout.write(`${JSON.stringify({ comparable: true, adapters })}\n`);
  return 0;
}

async function runReadiness(argv: readonly string[]): Promise<number> {
  if (
    argv[0] !== "--manifest" ||
    argv[1] === undefined ||
    argv[2] !== "--capability" ||
    argv[3] === undefined ||
    argv[4] !== "--observations" ||
    argv[5] === undefined ||
    argv[6] !== "--output-dir" ||
    argv[7] === undefined ||
    argv.length !== 8
  ) {
    throw new CliError("CONFIGURATION_ERROR", 4);
  }

  try {
    const manifest = await loadG2asReadinessManifest(argv[1]);
    const capability = await loadGithubReadOnlyCapability(argv[3]);
    const certificate = await runReadinessCertificate(manifest, createLocalObservationAdapter(argv[5]), capability);
    await writeReadinessCertificate(argv[7], certificate);

    process.stdout.write(`${JSON.stringify({ decision: certificate.decision })}\n`);
    return readinessExitCode(certificate.decision);
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError("CONFIGURATION_ERROR", 4);
  }
}

function createLocalObservationAdapter(path: string): ReadinessAdapter {
  return {
    async read(): Promise<ReadinessObservationBundle> {
      return JSON.parse(await readLocalFile(path)) as ReadinessObservationBundle;
    },
  };
}

function readinessExitCode(decision: "READY" | "NOT READY" | "STOPPED"): 0 | 2 | 3 {
  if (decision === "READY") return 0;
  if (decision === "NOT READY") return 2;
  return 3;
}

function parseSafeEvent(source: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; } catch (error) {
    if (error instanceof SyntaxError) throw new CliError("VALIDATION_FAILED", 2);
    throw error;
  }
  try {
    const event = validateCanonicalEvent(parsed);
    assertSafeEvidenceRefs(event.evidenceRefs);
    return event;
  } catch (error) {
    if (error instanceof EvidenceValidationError || error instanceof Error) throw new CliError("VALIDATION_FAILED", 2);
    throw error;
  }
}

async function readLocalFile(path: string): Promise<string> {
  try { return await readFile(path, "utf8"); } catch (error) {
    if (isSystemError(error)) throw new CliError("CONFIGURATION_ERROR", 4);
    throw error;
  }
}

class CliError extends Error {
  public constructor(readonly code: "CONFIGURATION_ERROR" | "VALIDATION_FAILED", readonly exitCode: 2 | 4) { super(code); }
}

class ActivationCliError extends Error {
  public constructor(readonly code: string, readonly exitCode: 3 | 4) { super(code); }
}

class ContextCliError extends Error {
  public constructor(readonly code: string, readonly exitCode: 3 | 4) { super(code); }
}

function isSystemError(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error; }

function writeError(code: "CONFIGURATION_ERROR" | "VALIDATION_FAILED"): void {
  process.stderr.write(`${JSON.stringify({ error: code })}\n`);
}

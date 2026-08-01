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
import { ControllerCheckpointError, parseCheckpointChoice } from "./controller/choice.js";
import { ControllerRecipeError, loadQuickTaskRecipe } from "./controller/recipe.js";
import { ControllerRequestError, parseQuickTaskRequest } from "./controller/request.js";
import { resolveCheckpoint } from "./controller/resolve.js";
import { ControllerActivationPackageError } from "./controller/types.js";

const helpText = `Usage: npm run cli -- <command>

Commands:
  validate      Validate the canonical contract
  finalize      Finalize an accepted work artifact
  sync          Validate local planned or local-result sync output
  conformance   Run cross-host conformance checks
  readiness     Generate a local G2AS Sandbox Readiness Certificate
  quick-task    Recommend the local Quick Task recipe
  resolve-checkpoint  Resolve an explicit local Quick Task checkpoint
  activate-quick-task  Issue an ephemeral Quick Task Activation Package
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
  if (command === "resolve-checkpoint") return runResolveCheckpoint(argv.slice(1));
  if (command === "activate-quick-task") return runActivateQuickTask(argv.slice(1));

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

function activationErrorCode(error: Error): string {
  if (error instanceof ControllerActivationPackageError) return error.message.split(":", 1)[0] ?? "ACTIVATION_PACKAGE_FAILED";
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

function isSystemError(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error; }

function writeError(code: "CONFIGURATION_ERROR" | "VALIDATION_FAILED"): void {
  process.stderr.write(`${JSON.stringify({ error: code })}\n`);
}

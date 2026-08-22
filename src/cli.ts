import { readFile } from "node:fs/promises";

import { assessFlow, FlowAssuranceError, renderFlowAssuranceMarkdown } from "./flow/assurance.js";
import { composeFlow, FlowCompositionError } from "./flow/compose.js";

const helpText = `Usage: node dist/cli.js <command>

Commands:
  compose-flow  Compose one module or the default change flow from --input <path>
  assess-flow   Verify Flow receipts from --input <path> [--format markdown]
`;

export async function runCli(argv: readonly string[]): Promise<number> {
  const [command, ...args] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(helpText);
    return 0;
  }
  if (command === "compose-flow") return runComposeFlow(args);
  if (command === "assess-flow") return runAssessFlow(args);

  return stopped("COMMAND_CONFIGURATION_INVALID", "Unknown command", 4);
}

async function runComposeFlow(argv: readonly string[]): Promise<number> {
  if (argv[0] !== "--input" || argv[1] === undefined || argv.length !== 2) {
    return stopped("COMMAND_CONFIGURATION_INVALID", "compose-flow requires exactly --input <path>", 4);
  }

  try {
    const input = await readJsonInput(argv[1], {
      unreadable: ["FLOW_INPUT_PATH_UNREADABLE", "The explicit flow input path could not be read"],
      invalid: ["FLOW_INPUT_JSON_INVALID", "The explicit flow input is not valid JSON"],
    });
    const result = composeFlow(input);
    writeJson(result);
    return result.status === "READY" ? 0 : 2;
  } catch (error) {
    if (error instanceof JsonInputError) return stopped(error.code, error.message, error.exitCode);
    if (error instanceof FlowCompositionError) return stopped(error.code, error.message, 3);
    throw error;
  }
}

async function runAssessFlow(argv: readonly string[]): Promise<number> {
  const format = argv.length === 2
    ? "json"
    : argv.length === 4 && argv[2] === "--format" && argv[3] === "markdown"
      ? "markdown"
      : null;
  if (argv[0] !== "--input" || argv[1] === undefined || format === null) {
    return stopped(
      "COMMAND_CONFIGURATION_INVALID",
      "assess-flow requires --input <path> with optional --format markdown",
      4,
    );
  }

  try {
    const input = await readJsonInput(argv[1], {
      unreadable: ["FLOW_ASSURANCE_INPUT_PATH_UNREADABLE", "The explicit Flow assessment path could not be read"],
      invalid: ["FLOW_ASSURANCE_INPUT_JSON_INVALID", "The explicit Flow assessment is not valid JSON"],
    });
    const result = assessFlow(input);
    process.stdout.write(format === "markdown" ? renderFlowAssuranceMarkdown(result) : `${JSON.stringify(result)}\n`);
    return result.status === "READY" || result.status === "COMPLETE" || result.status === "COMPLETE_WITH_LIMIT"
      ? 0
      : 2;
  } catch (error) {
    if (error instanceof JsonInputError) return stopped(error.code, error.message, error.exitCode);
    if (error instanceof FlowAssuranceError || error instanceof FlowCompositionError) {
      return stopped(error.code, error.message, 3);
    }
    throw error;
  }
}

interface JsonInputErrors {
  unreadable: readonly [code: string, message: string];
  invalid: readonly [code: string, message: string];
}

async function readJsonInput(path: string, errors: JsonInputErrors): Promise<unknown> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (isSystemError(error)) throw new JsonInputError(...errors.unreadable, 4);
    throw error;
  }

  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) throw new JsonInputError(...errors.invalid, 3);
    throw error;
  }
}

function stopped(code: string, message: string, exitCode: 3 | 4): 3 | 4 {
  writeJson({
    decision: "STOPPED",
    impact: "UNKNOWN",
    requiresAcknowledgement: false,
    error: { code, message },
  });
  return exitCode;
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function isSystemError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

class JsonInputError extends Error {
  public constructor(readonly code: string, message: string, readonly exitCode: 3 | 4) {
    super(message);
  }
}

import { mkdir, readFile, writeFile } from "node:fs/promises";

import { claudeCodeAdapter } from "./adapters/claude-code.js";
import { codexAdapter } from "./adapters/codex.js";
import { cursorAdapter } from "./adapters/cursor.js";
import { parseMarkdownContract, validateContractPath } from "./contract/markdown.js";
import { validateCanonicalEvent } from "./events/envelope.js";
import { assertSafeEvidenceRefs, EvidenceValidationError } from "./orchestrator/evidence.js";
import { loadG2asReadinessManifest } from "./readiness/manifest.js";
import { type ReadinessAdapter, type ReadinessObservationBundle } from "./readiness/observations.js";
import { renderCertificateJson, renderCertificateMarkdown } from "./readiness/render.js";
import { runReadinessCertificate } from "./readiness/run.js";

const helpText = `Usage: npm run cli -- <command>

Commands:
  validate      Validate the canonical contract
  finalize      Finalize an accepted work artifact
  sync          Validate local planned or local-result sync output
  conformance   Run cross-host conformance checks
  readiness     Generate a local G2AS Sandbox Readiness Certificate
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

  throw new CliError("CONFIGURATION_ERROR", 4);
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
    argv[2] !== "--observations" ||
    argv[3] === undefined ||
    argv[4] !== "--output-dir" ||
    argv[5] === undefined ||
    argv.length !== 6
  ) {
    throw new CliError("CONFIGURATION_ERROR", 4);
  }

  try {
    const manifest = await loadG2asReadinessManifest(argv[1]);
    const certificate = await runReadinessCertificate(manifest, createLocalObservationAdapter(argv[3]));
    const json = renderCertificateJson(certificate);
    const markdown = renderCertificateMarkdown(certificate);

    await mkdir(argv[5], { recursive: true });
    await writeFile(`${argv[5]}/g2as-sandbox-readiness-certificate.json`, json, "utf8");
    await writeFile(`${argv[5]}/g2as-sandbox-readiness-certificate.md`, markdown, "utf8");

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

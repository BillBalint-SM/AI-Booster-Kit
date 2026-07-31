import { githubScopeFingerprint, parseGithubReadOnlyCapability } from "../capabilities/manifest.js";
import type { GithubReadOnlyCapability } from "../capabilities/types.js";
import { evaluateReadiness, type ReadinessCertificate } from "../readiness/evaluate.js";
import { parseG2asReadinessManifest } from "../readiness/manifest.js";
import {
  readObservations,
  type ReadinessObservation,
  type ReadinessObservationBundle,
} from "../readiness/observations.js";
import type { G2asReadinessManifest, SourceName } from "../readiness/types.js";
import { CodexMcpPayloadNormalizationError } from "./codex-mcp-payload.js";

export interface CodexReadOnlyEvidenceAdapter {
  readonly host: "codex";
  read(manifest: G2asReadinessManifest): Promise<unknown>;
}

export interface CodexReadOnlyEvidence {
  readonly host: "codex";
  readonly bundle: ReadinessObservationBundle;
  readonly certificate: ReadinessCertificate;
}

export type EvidenceIngestionDiagnosticCode = Exclude<ReadinessObservation["diagnosticCode"], "NONE">;
export type EvidenceIngestionSource = SourceName | "unknown";

export class EvidenceIngestionError extends Error {
  public readonly diagnosticCode: EvidenceIngestionDiagnosticCode;
  public readonly source: EvidenceIngestionSource;

  public constructor(
    message: string,
    diagnosticCode: EvidenceIngestionDiagnosticCode,
    source: EvidenceIngestionSource,
  ) {
    super(`Codex read-only evidence boundary rejected: ${message}.`);
    this.name = "EvidenceIngestionError";
    this.diagnosticCode = diagnosticCode;
    this.source = source;
  }
}

export async function ingestCodexReadOnlyEvidence(
  manifest: G2asReadinessManifest,
  adapter: CodexReadOnlyEvidenceAdapter,
  capability: GithubReadOnlyCapability,
): Promise<CodexReadOnlyEvidence> {
  if (adapter.host !== "codex") {
    throw new EvidenceIngestionError("host must be codex", "SCOPE_UNVERIFIED", "unknown");
  }

  const target = parseG2asReadinessManifest(manifest);
  const normalizedCapability = parseGithubReadOnlyCapability(capability);

  if (!normalizedCapability.requiredHosts.includes("codex")) {
    throw new EvidenceIngestionError("capability does not authorize the Codex host", "CAPABILITY_UNKNOWN", "unknown");
  }

  let bundle: ReadinessObservationBundle;
  try {
    bundle = await readObservations({ read: (requestedManifest) => adapter.read(requestedManifest) }, target);
  } catch (error: unknown) {
    const failure = classifyReadFailure(error);
    throw new EvidenceIngestionError("observations are not normalized safe evidence", failure.diagnosticCode, failure.source);
  }

  const githubObservation = bundle.observations.find((observation) => observation.source === "github");
  if (githubObservation?.capabilityEvidence?.host !== "codex") {
    throw new EvidenceIngestionError("capability evidence host must be codex", "CAPABILITY_UNKNOWN", "github");
  }

  const certificate = evaluateReadiness(target, bundle, normalizedCapability);
  if (certificate.decision !== "READY" || certificate.externalWriteCount !== 0) {
    const failedCheck = certificate.checks.find((check) => check.state !== "verified" || check.diagnosticCode !== "NONE");
    throw new EvidenceIngestionError(
      "readiness decision is not READY",
      failedCheck?.diagnosticCode === undefined || failedCheck.diagnosticCode === "NONE" ? "SCOPE_UNVERIFIED" : failedCheck.diagnosticCode,
      failedCheck?.name ?? "unknown",
    );
  }

  if (githubObservation.capabilityEvidence.scopeFingerprint !== githubScopeFingerprint(normalizedCapability)) {
    throw new EvidenceIngestionError("capability scope fingerprint is not verified", "CAPABILITY_UNKNOWN", "github");
  }

  return Object.freeze({ host: "codex" as const, bundle, certificate });
}

function classifyReadFailure(error: unknown): {
  readonly diagnosticCode: EvidenceIngestionDiagnosticCode;
  readonly source: EvidenceIngestionSource;
} {
  if (!(error instanceof CodexMcpPayloadNormalizationError)) {
    return { diagnosticCode: "TIMEOUT_UNKNOWN", source: "unknown" };
  }

  const message = error.message.toLowerCase();
  if (message.includes("capability")) return { diagnosticCode: "CAPABILITY_UNKNOWN", source: "github" };
  if (message.includes("traceability") || message.includes("native card") || message.includes("link mapping")) {
    return { diagnosticCode: "TRACEABILITY_MISMATCH", source: "traceability" };
  }
  if (message.includes("jira")) return { diagnosticCode: "TARGET_MISMATCH", source: "jira" };
  if (message.includes("confluence")) return { diagnosticCode: "TARGET_MISMATCH", source: "confluence" };
  if (message.includes("github")) return { diagnosticCode: "TARGET_MISMATCH", source: "github" };
  return { diagnosticCode: "SCOPE_UNVERIFIED", source: "unknown" };
}

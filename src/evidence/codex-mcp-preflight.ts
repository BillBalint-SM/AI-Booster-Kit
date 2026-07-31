import type { GithubCapabilityEvidence, GithubReadOnlyCapability } from "../capabilities/types.js";
import { evaluateReadiness, type ReadinessCertificate } from "../readiness/evaluate.js";
import { writeReadinessCertificate, type ReadinessCertificateOutputPaths } from "../readiness/output.js";
import { parseReadinessObservationBundle } from "../readiness/observations.js";
import type { G2asReadinessManifest } from "../readiness/types.js";
import { createCodexMcpPayloadAdapter } from "./codex-mcp-payload.js";
import {
  EvidenceIngestionError,
  ingestCodexReadOnlyEvidence,
  type EvidenceIngestionDiagnosticCode,
  type EvidenceIngestionSource,
} from "./ingest.js";
import { createCodexMcpTransportSource, type CodexMcpToolCaller } from "./codex-mcp-tool-caller.js";

export interface CodexMcpPreflightRequest {
  readonly manifest: G2asReadinessManifest;
  readonly capability: GithubReadOnlyCapability;
  readonly capabilityEvidence: GithubCapabilityEvidence;
  readonly caller: CodexMcpToolCaller;
  readonly getRunTimestamp: () => string;
  readonly outputDirectory: string;
}

export interface CodexMcpPreflightResult {
  readonly certificate: ReadinessCertificate;
  readonly outputPaths: ReadinessCertificateOutputPaths;
}

export async function runCodexMcpPreflight(
  request: CodexMcpPreflightRequest,
): Promise<CodexMcpPreflightResult> {
  const runAt = request.getRunTimestamp();
  const source = createCodexMcpTransportSource(request.caller, () => runAt);
  const adapter = createCodexMcpPayloadAdapter(source, request.capabilityEvidence);
  let certificate: ReadinessCertificate;

  try {
    certificate = (await ingestCodexReadOnlyEvidence(request.manifest, adapter, request.capability)).certificate;
  } catch (error: unknown) {
    if (!(error instanceof EvidenceIngestionError)) throw error;
    certificate = createStoppedCertificate(
      request.manifest,
      request.capability,
      request.capabilityEvidence,
      runAt,
      error.diagnosticCode,
      error.source,
    );
  }

  const outputPaths = await writeReadinessCertificate(request.outputDirectory, certificate);

  return Object.freeze({
    certificate,
    outputPaths,
  });
}

function createStoppedCertificate(
  manifest: G2asReadinessManifest,
  capability: GithubReadOnlyCapability,
  capabilityEvidence: GithubCapabilityEvidence,
  runAt: string,
  diagnosticCode: EvidenceIngestionDiagnosticCode,
  source: EvidenceIngestionSource,
): ReadinessCertificate {
  const unavailable = "unavailable";
  const bundle = parseReadinessObservationBundle({
    correlationId: `codex-mcp-preflight-${runAt.replaceAll(":", "-")}`,
    runAt,
    observations: [
      stoppedObservation("jira", { tenantOrigin: new URL(manifest.tenantUrl).origin }, runAt, capabilityEvidence, diagnosticCode, source),
      stoppedObservation("confluence", { tenantOrigin: new URL(manifest.tenantUrl).origin }, runAt, capabilityEvidence, diagnosticCode, source),
      stoppedObservation("github", { repository: unavailable }, runAt, capabilityEvidence, diagnosticCode, source),
      stoppedObservation("traceability", {
        jiraIssueKey: unavailable,
        githubCommit: unavailable,
        confluencePageId: unavailable,
        jiraGitLinkId: unavailable,
        jiraGitLinkedCommit: unavailable,
        confluenceJiraRefId: unavailable,
        confluenceJiraReferencedKey: unavailable,
        confluenceGitRefId: unavailable,
        confluenceGitReferencedCommit: unavailable,
        confluenceGitReferenceKind: unavailable,
      }, runAt, capabilityEvidence, diagnosticCode, source),
    ],
  });
  return evaluateReadiness(manifest, bundle, capability);
}

function stoppedObservation(
  source: "jira" | "confluence" | "github" | "traceability",
  observedIds: Record<string, string>,
  runAt: string,
  capabilityEvidence: GithubCapabilityEvidence,
  diagnosticCode: EvidenceIngestionDiagnosticCode,
  failureSource: EvidenceIngestionSource,
) {
  const primary = failureSource === "unknown" || failureSource === source;
  return {
    source,
    state: primary && (diagnosticCode === "TARGET_MISMATCH" || diagnosticCode === "TRACEABILITY_MISMATCH") ? "mismatch" as const : "unknown" as const,
    readPath: "mcp" as const,
    capabilityState: primary && diagnosticCode === "CAPABILITY_UNKNOWN" ? "unknown" as const : "verified" as const,
    observedIds,
    evidenceRefs: [`${source}:preflight-rejected`],
    ...(source === "github" ? { capabilityEvidence } : {}),
    diagnosticCode: primary ? diagnosticCode : "SCOPE_UNVERIFIED" as const,
    observedAt: runAt,
  };
}

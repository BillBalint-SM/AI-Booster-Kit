import { githubScopeFingerprint, parseGithubReadOnlyCapability } from "../capabilities/manifest.js";
import type { GithubReadOnlyCapability } from "../capabilities/types.js";
import { evaluateReadiness, type ReadinessCertificate } from "../readiness/evaluate.js";
import { parseG2asReadinessManifest } from "../readiness/manifest.js";
import {
  readObservations,
  type ReadinessObservationBundle,
} from "../readiness/observations.js";
import type { G2asReadinessManifest } from "../readiness/types.js";

export interface CodexReadOnlyEvidenceAdapter {
  readonly host: "codex";
  read(manifest: G2asReadinessManifest): Promise<unknown>;
}

export interface CodexReadOnlyEvidence {
  readonly host: "codex";
  readonly bundle: ReadinessObservationBundle;
  readonly certificate: ReadinessCertificate;
}

export class EvidenceIngestionError extends Error {
  public constructor(message: string) {
    super(`Codex read-only evidence boundary rejected: ${message}.`);
    this.name = "EvidenceIngestionError";
  }
}

export async function ingestCodexReadOnlyEvidence(
  manifest: G2asReadinessManifest,
  adapter: CodexReadOnlyEvidenceAdapter,
  capability: GithubReadOnlyCapability,
): Promise<CodexReadOnlyEvidence> {
  if (adapter.host !== "codex") {
    throw new EvidenceIngestionError("host must be codex");
  }

  const target = parseG2asReadinessManifest(manifest);
  const normalizedCapability = parseGithubReadOnlyCapability(capability);

  if (!normalizedCapability.requiredHosts.includes("codex")) {
    throw new EvidenceIngestionError("capability does not authorize the Codex host");
  }

  let bundle: ReadinessObservationBundle;
  try {
    bundle = await readObservations({ read: (requestedManifest) => adapter.read(requestedManifest) }, target);
  } catch {
    throw new EvidenceIngestionError("observations are not normalized safe evidence");
  }

  const githubObservation = bundle.observations.find((observation) => observation.source === "github");
  if (githubObservation?.capabilityEvidence?.host !== "codex") {
    throw new EvidenceIngestionError("capability evidence host must be codex");
  }

  const certificate = evaluateReadiness(target, bundle, normalizedCapability);
  if (certificate.decision !== "READY" || certificate.externalWriteCount !== 0) {
    throw new EvidenceIngestionError("readiness decision is not READY");
  }

  if (githubObservation.capabilityEvidence.scopeFingerprint !== githubScopeFingerprint(normalizedCapability)) {
    throw new EvidenceIngestionError("capability scope fingerprint is not verified");
  }

  return Object.freeze({ host: "codex" as const, bundle, certificate });
}

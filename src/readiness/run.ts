import { evaluateReadiness, type ReadinessCertificate } from "./evaluate.js";
import { readObservations, type ReadinessAdapter } from "./observations.js";
import type { G2asReadinessManifest } from "./types.js";

export async function runReadinessCertificate(
  manifest: G2asReadinessManifest,
  adapter: ReadinessAdapter,
): Promise<ReadinessCertificate> {
  return evaluateReadiness(manifest, await readObservations(adapter, manifest));
}

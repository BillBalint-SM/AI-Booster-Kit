import { ContextError } from "./types.js";
import type { MilestoneContext } from "./types.js";
import type { CanonicalWorkArtifact } from "../domain/model.js";

export function validateCanonicalMilestoneArtifact(context: MilestoneContext, artifact: CanonicalWorkArtifact): void {
  if (context.canonicalArtifactId !== artifact.artifactId) {
    throw new ContextError(`Milestone canonical artifact '${context.canonicalArtifactId}' does not match artifact '${artifact.artifactId}'`);
  }
  if (context.milestoneId !== artifact.milestoneId) {
    throw new ContextError(`Milestone '${context.milestoneId}' does not match artifact parent '${artifact.milestoneId}'`);
  }
}

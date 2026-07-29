export class EvidenceValidationError extends Error {
  public constructor() {
    super("Evidence references must be safe identifiers, not transcripts or credentials.");
    this.name = "EvidenceValidationError";
  }
}

const unsafeEvidence = /authorization|bearer|credential|password|raw\s*transcript|secret|token|transcript/i;

export function assertSafeEvidenceRefs(evidenceRefs: readonly string[]): string[] {
  if (evidenceRefs.length === 0 || safeEvidenceRefs(evidenceRefs).length !== evidenceRefs.length) {
    throw new EvidenceValidationError();
  }
  return [...evidenceRefs];
}

export function safeEvidenceRefs(evidenceRefs: readonly string[]): string[] {
  return evidenceRefs.filter((reference) => reference.trim() !== "" && !unsafeEvidence.test(reference));
}

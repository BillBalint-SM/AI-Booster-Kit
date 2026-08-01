---
recipeId: bounded-validation
recipeVersion: 0.1.0
status: READY
formationId: bounded-validation
scenario: validation
weight: medium
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  requiredInput: [claim, acceptance-criteria, evidence-sources, known-limits]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [validation-result, evidence-map, explicit-stop-or-pass]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [claim-traced-to-evidence, negative-paths-checked, limits-visible]
evidenceRequirements: [validation-log, source-read-back, residual-risk-record]
relations:
  - kind: validates
    target: controller
recovery:
  preserve: [pre-validation-claim, failed-checks]
  stopConditions: [missing-evidence, source-mismatch, unknown-capability]
---

# Bounded Validation

**Purpose:** Validate one bounded claim against explicit acceptance criteria and
named evidence, preserving uncertainty and ending in an explicit pass or stop.

**Authority boundary:** This recipe produces a local validation result only. It
does not modify the validated target, activate a host, persist a session, or
claim that an external source was read unless the evidence contract supplies an
accepted read-back.

## Input contract (DoR)

- `claim` identifies exactly one bounded statement under validation.
- `acceptance-criteria` states the observable conditions for pass or stop.
- `evidence-sources` names the allowed evidence transport and source boundary.
- `known-limits` records stale, unknown, unavailable, or contradictory evidence.

## Output contract (DoD)

- `validation-result` is `PASS`, `STOPPED`, or `UNKNOWN` with no inferred state.
- `evidence-map` links each acceptance criterion to its evidence and provenance.
- `explicit-stop-or-pass` records the stopping reason or the bounded pass.
- `residual-risk-record` preserves unresolved gaps and the next bounded action.

## Acceptance and evidence

1. Every claim is traced to one or more accepted evidence references.
2. Negative, mismatch, missing-input, unsafe, and unknown paths remain visible.
3. A missing or contradictory source produces `UNKNOWN` or `STOPPED`, never a
   fabricated pass.

Accepted evidence is local, synthetic, secret-free, and source-labelled. Raw
transcripts, credentials, cookies, arbitrary URLs, and unredacted connector
payloads are forbidden.

## Recovery

Preserve the pre-validation claim and every failed check. Stop on missing
evidence, source mismatch, unknown capability, or an attempted mutation of the
validated target. Do not retry or compensate after an ambiguous result.

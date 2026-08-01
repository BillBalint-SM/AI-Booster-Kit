---
recipeId: bounded-research
recipeVersion: 0.1.0
status: READY
formationId: bounded-research
scenario: research
weight: medium
coordination: parallel-fan-out-fan-in
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  requiredInput: [goal, scope, source-allowlist, evidence-standard]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [source-backed-brief, uncertainty-register, recommendation-or-stop]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [bounded-question, primary-source-evidence, unresolved-conflicts-visible]
evidenceRequirements: [source-register, quoted-or-linked-findings, review-record]
relations:
  - kind: related_to
    target: quick-task-clarifier-validator
recovery:
  preserve: [source-register, conflicting-findings]
  stopConditions: [unknown-source-authority, scope-expansion, partial-evidence]
---

# Bounded Research

**Purpose:** Investigate one bounded question through an allowlisted source
boundary, preserve provenance and disagreement, and produce a source-backed
brief with an explicit recommendation or stop state.

**Authority boundary:** This recipe produces a local research result only. It
does not widen the source allowlist, invoke an unapproved connector, activate a
host, persist a session, or present an unsupported conclusion as evidence.

## Input contract (DoR)

- `goal` names one answerable research question or decision need.
- `scope` fixes the included question, exclusions, and expected depth.
- `source-allowlist` names the permitted source classes, repositories, pages,
  or local artifacts before research starts.
- `evidence-standard` defines the provenance, quotation/link, freshness, and
  conflict-handling standard required for acceptance.

## Coordination contract

1. Freeze the question and scope before opening research lanes.
2. Fan out only across independent source or sub-question packets that remain
   inside the allowlist.
3. Record each finding in the shared source register with its provenance and
   confidence; do not merge contradictory findings silently.
4. Fan in through a reviewer who checks authority, freshness, conflicts, and
   coverage before synthesis.
5. End with a source-backed recommendation, an explicit stop, or `UNKNOWN`.

The human checkpoint remains available for a materially adverse scope,
source-authority, or recommendation decision. The recipe itself never grants
permission for an external write or connector call.

## Output contract (DoD)

- `source-backed-brief` answers the bounded question using only accepted
  evidence and identifies the evidence boundary.
- `uncertainty-register` lists missing, stale, conflicting, or unverified
  findings without normalizing them away.
- `recommendation-or-stop` records the bounded recommendation, `STOPPED`, or
  `UNKNOWN` state and the next safe action.

## Acceptance and evidence

1. The question remains bounded and every conclusion is traceable to the
   declared source allowlist.
2. Primary or otherwise explicitly accepted sources support the material
   findings; secondary evidence is labelled as such.
3. Unresolved conflicts, authority gaps, stale sources, and partial coverage
   remain visible in the uncertainty register.

Accepted evidence is local, synthetic, secret-free, and source-labelled unless
the active capability contract separately grants a bounded read. Raw
transcripts, credentials, cookies, arbitrary URLs, and unredacted connector
payloads are forbidden.

## Recovery

Preserve the source register and every conflicting finding. Stop on unknown
source authority, scope expansion, partial evidence, or an attempted mutation
of an external target. Do not broaden the allowlist, retry an ambiguous read,
or apply a compensating write without a new operation-specific approval.

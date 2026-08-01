---
recipeId: bounded-implementation
recipeVersion: 0.1.0
status: READY
formationId: bounded-implementation
scenario: development
weight: heavy
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [MEDIUM]
  requiredInput: [goal, repository, repository-state, acceptance-criteria, test-strategy, accepted-plan, rollback-boundary]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [reviewable-diff, test-evidence, residual-risk-record]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [scope-matched-diff, relevant-tests-pass, rollback-boundary-preserved]
evidenceRequirements: [git-diff, test-output, review-record]
relations:
  - kind: depends_on
    target: bounded-refinement
recovery:
  preserve: [prior-setup, failing-evidence]
  stopConditions: [dirty-state-conflict, unsafe-change, failed-read-back]
---

# Bounded Implementation

**Purpose:** Turn one accepted, bounded implementation plan into a reviewable
local diff with test evidence and explicit residual risk while preserving the
prior setup and rollback boundary.

**Authority boundary:** This recipe recommends a local implementation contract
only. It does not activate a host, execute an Agent, create or modify files,
persist a session, invoke a connector, publish a branch, or perform an external
read or write. Any later execution still follows the active repository approval
and Human Checkpoint rules.

## Input contract (DoR)

- `goal` names one bounded implementation outcome.
- `repository` identifies the exact repository in scope.
- `repository-state` is explicitly `VERIFIED`; an inferred or stale checkout is
  not sufficient.
- `acceptance-criteria` lists the observable conditions the diff must satisfy.
- `test-strategy` names the focused and broader checks required for acceptance.
- `accepted-plan` is explicitly `ACCEPTED`; draft or inferred approval is not
  accepted as implementation authority.
- `rollback-boundary` states what prior setup must be preserved and where work
  must stop rather than compensate or discard state.

## Output contract (DoD)

- `reviewable-diff` contains only the accepted implementation scope.
- `test-evidence` records the focused and required quality-gate results with
  actual transport and runtime provenance.
- `residual-risk-record` preserves failures, unknowns, limits, and the next
  bounded action.
- Missing evidence remains `UNKNOWN`; no inferred pass, execution, publication,
  or completion is emitted.

## Acceptance and evidence

1. The diff matches the accepted scope and does not include unrelated work.
2. Relevant focused tests and required repository gates pass, or the result
   stops with the failing evidence preserved.
3. The prior setup and declared rollback boundary remain recoverable.

Accepted evidence is local, synthetic, secret-free, and source-labelled. The
canonical evidence set is the exact Git diff, test output, and review record.
Raw transcripts, credentials, cookies, arbitrary URLs, and unredacted connector
payloads are forbidden.

## Recovery

Preserve the prior setup and every failing observation. Stop on a dirty-state
conflict, unsafe change, failed read-back, scope expansion, or attempted
external operation. Do not reset, clean, retry, compensate, publish, or widen
the implementation without the separately required authority.

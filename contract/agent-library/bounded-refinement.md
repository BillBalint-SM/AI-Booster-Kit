---
recipeId: bounded-refinement
recipeVersion: 0.1.0
status: READY
formationId: bounded-refinement
scenario: refinement
weight: light
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [LOW]
  requiredInput: [goal, current-scope, constraints, open-questions]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [refined-scope, acceptance-criteria, decision-record]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [scope-preserved, assumptions-visible, acceptance-testable]
evidenceRequirements: [before-scope, after-scope, decision-record]
relations:
  - kind: related_to
    target: quick-task-clarifier-validator
recovery:
  preserve: [original-scope, rejected-interpretations]
  stopConditions: [unaccepted-scope-change, unresolved-conflict]
---

# Bounded Refinement

**Purpose:** Refine one bounded scope into an explicit, testable decision while
preserving the original scope, visible assumptions, and unresolved questions.

**Authority boundary:** This recipe produces a local refinement result only. It
does not widen scope, activate a host, persist a session, or invoke a connector.
An unaccepted scope change is a stop condition, not an implicit decision.

## Input contract (DoR)

- `goal` names the decision or acceptance question being refined.
- `current-scope` states the active scope before refinement.
- `constraints` names the non-negotiable boundaries for the refinement.
- `open-questions` records unresolved interpretations or decisions.

## Output contract (DoD)

- `refined-scope` states the accepted scope without hidden expansion.
- `acceptance-criteria` makes the refined result testable.
- `decision-record` records assumptions, rejected interpretations, and the next
  bounded action.
- Unknowns and unresolved conflicts remain explicit; no inferred consensus is
  presented as a decision.

## Acceptance and evidence

1. The refined scope preserves the declared current scope unless a change is
   explicitly accepted.
2. Assumptions and rejected interpretations remain visible.
3. Every acceptance criterion is observable and tied to the decision record.

Accepted evidence is local, synthetic, secret-free, and source-labelled. Raw
transcripts, credentials, cookies, arbitrary URLs, and unredacted connector
payloads are forbidden.

## Recovery

Preserve the original scope and every rejected interpretation. Stop on an
unaccepted scope change or unresolved conflict. Do not silently choose between
competing interpretations or retry after an ambiguous decision.

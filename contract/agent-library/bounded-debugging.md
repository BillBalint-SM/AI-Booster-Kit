---
recipeId: bounded-debugging
recipeVersion: 0.1.0
status: READY
formationId: bounded-debugging
scenario: debugging
weight: medium
coordination: sequential
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  requiredInput: [symptom, reproduction, expected-behavior, environment]
  executionBoundary: LOCAL_ONLY
  authority: RECOMMENDATION_ONLY
outputContract:
  requiredSections: [root-cause-record, minimal-fix, regression-evidence]
  unknownPolicy: PRESERVE_AS_UNKNOWN
  resultState: NOT_STARTED
acceptance:
  criteria: [failure-reproduced, root-cause-supported, regression-covered]
evidenceRequirements: [reproduction-output, failing-test, passing-test]
relations:
  - kind: validates
    target: bounded-implementation
recovery:
  preserve: [failure-evidence, pre-fix-state]
  stopConditions: [not-reproduced, ambiguous-root-cause, destructive-fix]
---
# Bounded Debugging

**Purpose:** Diagnose one bounded failure from an explicit reproduction procedure, support one root cause with evidence, and define the smallest justified fix and regression proof.

**Authority boundary:** This recipe recommends a local debugging contract only. It does not execute a debugger or Agent, modify files, inject host context, persist a session, invoke a connector, publish a fix, or perform an external read or write.

## Input contract (DoR)

- `symptom` states the observed failure without embedding secrets or raw payloads.
- `reproduction` lists the exact observable steps used to attempt the failure.
- `expected-behavior` states the result that distinguishes correct behavior from the symptom.
- `environment` records source-labelled runtime, revision, configuration, and platform facts required to interpret the reproduction.

The procedure is required input; successful reproduction is not assumed. Failure to reproduce produces `STOPPED` with the observation preserved.

## Output contract (DoD)

- `root-cause-record` distinguishes observations, hypotheses, rejected explanations, and the supported cause.
- `minimal-fix` identifies the smallest justified change boundary or remains `NOT_STARTED` when a stop condition applies.
- `regression-evidence` preserves the pre-fix failure, post-fix verification, remaining limits, and unknowns.

Missing evidence remains `UNKNOWN`; no execution, fix, publication, or completion is inferred.

## Acceptance and evidence

1. The supplied procedure reproduces the stated failure, or the work stops with exact reproduction evidence.
2. The root cause is supported by observations that distinguish it from rejected hypotheses.
3. The same boundary has failing-before and passing-after regression evidence before a fix can be accepted.

Accepted evidence is local, synthetic, secret-free, and source-labelled. The canonical evidence set is reproduction output, the failing test, and the passing test. Raw transcripts, credentials, cookies, arbitrary URLs, and unredacted connector payloads are forbidden.

## Recovery

Preserve the failure evidence and pre-fix state. Stop when the failure is not reproduced, the evidence supports multiple unresolved root causes, or the proposed fix crosses a destructive boundary. Do not broaden scope, reset state, retry blindly, compensate, publish, or perform an external operation without separately required authority.

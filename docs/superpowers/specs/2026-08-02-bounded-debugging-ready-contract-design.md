# Bounded Debugging READY Contract Design

## Objective

Promote `bounded-debugging` from a catalog candidate to a complete, fail-closed
`READY` recipe/profile contract that the local Controller can recommend when a
Quick Task supplies the exact debugging inputs. Preserve the Human Checkpoint,
local-only execution boundary, and recommendation-only authority.

## Scope

This slice adds one strict debugging recipe, one typed request profile, catalog
and Controller integration, positive and negative evidence, and the minimum
documentation updates required to describe the resulting M1 state.

The slice does not execute a debugger or Agent, modify a target repository,
inject host context, persist a session, invoke a connector, publish a fix, or
perform an external read or write. Iterative debugging tooling remains a later
capability even if this contract becomes `READY`.

## Formation identity and boundary

The formation keeps its existing stable identity:

- formation: `bounded-debugging`
- scenario: `debugging`
- weight: `medium`
- complexity: `medium`
- topology: `sequential`
- pattern: `debugging:medium:sequential`
- execution boundary: `LOCAL_ONLY`
- authority: `RECOMMENDATION_ONLY`

The catalog entry becomes `READY` only when its checked-in recipe path resolves
to `contract/agent-library/bounded-debugging.md` and the strict recipe parser
accepts that document.

## Input contract

The Controller accepts a debugging-specific `formationInput` with exactly these
fields:

```ts
interface DebuggingFormationInput {
  scenario: "debugging";
  symptom: string;
  reproduction: readonly string[];
  expectedBehavior: string;
  environment: readonly string[];
}
```

`symptom` and `expectedBehavior` must be non-empty strings. `reproduction` must
contain one or more executable or otherwise observable steps. `environment`
must contain one or more source-labelled facts relevant to the failure, such as
runtime, operating system, dependency revision, configuration boundary, or
target revision. Unknown keys and empty values are rejected.

The reproduction procedure is required input, but a successful reproduction is
not an input claim. Reproducing the failure is the first acceptance gate of the
eventual debugging work. If the supplied procedure does not reproduce the
failure, the contract requires `STOPPED` with the observation preserved.

The catalog prerequisites use explicit names that match this boundary:
`symptom`, `reproduction-procedure`, `expected-behavior`, and
`environment-record`.

## Recipe and output contract

The checked-in recipe declares version `0.1.0`, status `READY`, eligible
complexities `LOW` and `MEDIUM`, and the canonical input sections `symptom`,
`reproduction`, `expected-behavior`, and `environment`.

Its required output sections are:

- `root-cause-record`: the reproduced failure, supported causal explanation,
  rejected hypotheses, and evidence provenance;
- `minimal-fix`: the smallest justified change boundary, or `NOT_STARTED` when
  a stop condition prevents a justified fix;
- `regression-evidence`: the exact pre-fix failure and post-fix verification,
  including remaining limits and unknowns.

The output contract uses `PRESERVE_AS_UNKNOWN` and starts at `NOT_STARTED`. It
must not infer successful execution, a fix, publication, or completion.

The canonical acceptance criteria are `failure-reproduced`,
`root-cause-supported`, and `regression-covered`. Canonical evidence is
`reproduction-output`, `failing-test`, and `passing-test`. Evidence must be
source-labelled, synthetic or otherwise safe for the repository, and free of
secrets and raw connector payloads.

The recipe preserves `failure-evidence` and `pre-fix-state`. It stops on
`not-reproduced`, `ambiguous-root-cause`, or `destructive-fix`. It validates the
`bounded-implementation` formation without activating or mutating it.

## Controller behavior

The request parser adds `debugging` to the supported formation-input scenarios
and validates the exact profile shape. The prerequisite resolver maps each
debugging prerequisite to its matching profile field.

A uniquely recognized debugging request with a complete profile and supported
complexity returns `RECOMMEND` with the existing stable identity and linked
recipe path. A recognized debugging request without the complete profile
returns `UNKNOWN`, lists the missing prerequisites, and omits the formation
payload. `HIGH` complexity remains `NO_FIT`. Ambiguous, duplicate-catalog,
unknown-evidence, custom-tool, and no-Agent paths retain their existing
fail-closed behavior.

The `recommend-formation` CLI exposes the same deterministic JSON result and
must not create or modify artifacts.

## Verification design

Implementation follows test-driven order:

1. Express the valid debugging request profile and its empty, missing, and
   unknown-field failures.
2. Express the strict recipe parser and checked-in recipe loader behavior.
3. Express catalog promotion and linked recipe identity.
4. Express complete-profile `RECOMMEND` and missing-profile `UNKNOWN` behavior.
5. Express the built CLI result and prove the input directory remains
   unchanged.

Negative coverage includes empty required input, unknown profile and recipe
metadata, incomplete output sections, unsafe execution boundary, unsafe
authority, missing profile, `HIGH` complexity, ambiguous scenarios, duplicate
catalog entries, and no-Agent continuation. Existing mismatch, unknown, and
Human Checkpoint behavior must remain green.

The focused Controller suites run first, followed by the full repository test
suite, documentation-link validation, `git diff --check`, and mapper validation.
Mapper snapshots are refreshed only after the source revision is stable and
must identify the final checked-in source revision.

## Documentation and M1 promotion

The formation catalog, documentation map, roadmap, and current delivery state
must agree on the debugging recipe status and the number of READY scenario
paths. M1 is promoted from `NOT READY` to `READY` only if every roadmap
acceptance gate has current evidence after this slice. If any gate remains
unproven, M1 stays `NOT READY` and the exact remaining gap is recorded instead
of being normalized away.

Work remains on `codex/development-session`. The existing draft pull request is
review and CI routing only; merging to `main` requires a separate explicit user
request.

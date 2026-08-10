# Standalone Review/Test Proof Design

**Status:** Accepted design; local, uncommitted review state

## Objective

Prove that AI Booster Kit can invoke one bounded review/test module independently
of implementation work. The module validates one concrete claim about the
existing Standalone Plan Proof handoff and returns a reviewer-facing result with
explicit evidence and limits.

## Validated claim

The Plan Proof handoff at
`docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md`
contains the exit evidence required by roadmap item 2, and its declared local
checks are reproducible.

## Scope

The module may read only:

- the Plan Proof handoff;
- `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, `AGENTS.md`, the common operating
  model, and the V1 roadmap; and
- local Git and documentation-check output needed for the declared checks.

The module returns its reviewer-facing result in the session. It does not create
or change a repository artifact, stage files, commit, push, invoke a connector,
or perform any external action.

## Validation design

1. Reopen the handoff and roadmap item 2 instead of relying on prior session
   summaries.
2. Map each exit-evidence requirement to direct evidence:
   - one explicit standalone planning module;
   - a fresh-reviewable plan;
   - a visible acceptance boundary; and
   - a stated verification approach.
3. Verify the handoff header, `Status: COMPLETE`, source revision, required
   sections, authority boundary, and explicit limits.
4. Reproduce the declared local checks:
   - `npm run check:docs`;
   - `git diff --check`; and
   - a direct untracked-file whitespace check.
5. Return the result with a criterion-to-evidence map, the result state,
   residual risks, and one next bounded action.

## Result contract

The result contains:

- the exact validated claim and target;
- observed facts and their source or command evidence;
- a criterion-to-evidence map;
- `PASS`, `STOPPED`, or `UNKNOWN` as the only result state;
- limits and residual risks; and
- the next bounded action.

`PASS` is allowed only when every required structural check and declared local
check produces the expected evidence. It means only that the stated claim holds
within this read-only evidence boundary; it never means V1 completion, runtime
execution, host security, host behavior, or connector capability.

`STOPPED` is required when the target is missing or deterministically fails a
required condition, or when continuing would require broader authority or a
write. `UNKNOWN` is required when a necessary source or command is unavailable,
incomplete, or materially contradictory.

For the direct untracked-file check, `git diff --no-index --check` may return
exit code `1` merely because two files differ. That result is acceptable only
when its output contains no whitespace error; a whitespace error is negative
evidence.

## Acceptance criteria

- The validation runs as an independently invoked, read-only module.
- Every roadmap 2 requirement is tied to inspectable, source-labelled evidence.
- The three declared local checks are run with their result semantics explained.
- The final result exposes `PASS`, `STOPPED`, or `UNKNOWN`, never an inferred
  success state.
- The result exposes its limits and next action without claiming a fix, runtime
  behavior, external action, or V1 completion.
- No repository, Git, runtime, connector, or external system is modified by the
  module.

## Risks and non-goals

This proof does not validate runtime execution, instruction loading, host
security, external connectors, or the other V1 proofs. Its target is initially
untracked, so ordinary `git diff --check` alone is not target-specific evidence;
the direct check is mandatory. The module does not correct any discrepancy it
finds.

## Verification and handoff

Before execution, refresh `WORK_STATE` and confirm the target remains the only
untracked Plan Proof artifact. After execution, report the live branch, HEAD,
worktree, upstream, pull-request state, evidence, limits, and next bounded
action. A `PASS` result is review-ready evidence for roadmap item 3, not a
publication or acceptance decision.

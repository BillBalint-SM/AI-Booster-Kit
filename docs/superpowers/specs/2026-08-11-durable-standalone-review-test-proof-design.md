# Durable Standalone Review/Test Proof Design

**Status:** Accepted design; local review state

## Objective

Produce durable, reviewer-facing evidence for roadmap item 3 without changing
the historical Review/Test Proof design, plan, or its session-only result. The
new independently invoked review module validates the existing Standalone Plan
Proof and records its exact `PASS`, `STOPPED`, or `UNKNOWN` result in one local
handoff.

## Problem

The original Review/Test Proof intentionally returned its result only in a
session. Its design and plan are inspectable, but a fresh reviewer cannot
inspect the original criterion-to-evidence map, executed checks, or result.
That is insufficient for the `VISION.md` requirement that a standalone review
or test task produce reviewable evidence.

## Design

Run a new, read-only validation against the existing Plan Proof handoff. The
validation may write exactly one reviewer-facing handoff to preserve its
result; it does not change its target or the historical proof artifacts.

The validation treats revisions correctly:

- The Plan Proof handoff's source revision
  `7905035faef29fd1a2f2bd82a643ee4f735a303c` is historical evidence.
- Proof bundle `70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7` must contain the
  Plan Proof handoff, and the historical revision must be its ancestor.
- The validation must not require the target's historical source revision to
  equal the then-current or future live `HEAD`.

The new handoff records the exact claim, target, current review revision,
criterion-to-evidence map, command results and exit semantics, limits, and
next bounded action. It uses `Status: COMPLETE` plus `Result: PASS` only when
all required structural and command checks pass. A deterministic failed
condition produces `Status: STOPPED` and `Result: STOPPED`; unavailable or
contradictory evidence produces `Status: UNKNOWN` and `Result: UNKNOWN`.

Only after a `PASS` may `docs/project/current-state.md` replace the historical
session-result wording with a link to the durable handoff. It must still route
to a fresh V1 Completion Review, never declare V1 `READY` itself.

## Scope

Create:

- `docs/superpowers/specs/2026-08-11-durable-standalone-review-test-proof-design.md`;
- `docs/superpowers/plans/2026-08-11-durable-standalone-review-test-proof.md`; and
- `docs/planning/ai-booster-kit/standalone-review-test-proof/roadmap-3/2026-08-11-plan-proof-review-handoff.md`.

Modify only after a `PASS`:

- `docs/project/current-state.md`; and
- `test/docs-links.test.ts` to make the durable Review/Test route an executable
  documentation contract.

Do not modify `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, the roadmap, the
historical Plan/Review/Test/Safe Stop artifacts, source code, dependencies,
Git configuration, or an external system. Do not stage, commit, push, create
a pull request, invoke a connector, or make an external write.

## Evidence and acceptance criteria

The proof is review-ready only when all of the following are true:

- the validation independently reopens the Plan Proof handoff, the controlling
  contracts, and fresh `WORK_STATE`;
- the target declares `Status: COMPLETE`, has every required handoff section,
  and still matches its published proof-bundle content;
- roadmap item 2's planning-module, reviewable-plan, acceptance-boundary, and
  verification-approach requirements have direct, source-labelled evidence;
- `npm run check:docs`, `git diff --check`, and a target-specific
  `git diff --no-index --check` have the expected outcome;
- the durable handoff records the outcome and the check exit semantics without
  relying on hidden conversation context;
- if and only if that outcome is `PASS`, the current delivery state directly
  links to it and rejects the former historical-session-only route; and
- final documentation, whitespace, targeted routing-contract, and full test
  checks pass without staging or external action.

## Risks and stop conditions

A missing target, missing required section, failed published-content check, or
deterministic command failure is `STOPPED`. A missing or contradictory source,
or an unavailable command, is `UNKNOWN`. Neither outcome updates the delivery
route to claim a durable review result.

This proof validates one local documentation handoff only. It does not prove
runtime behavior, instruction loading, host security, connector capability,
external authority, or V1 completion.

## Approval

The User approved this bounded remediation by replying `Mehet` to the stated
next action: create a separately approved standalone Review/Test proof with a
durable reviewer-facing result, then rerun the V1 Completion Review.

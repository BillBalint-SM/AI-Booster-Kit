# Current Delivery State Reconciliation Design

**Status:** Accepted design; local review state

## Objective

Reconcile the repository's delivery-routing record after the completed
Standalone Plan, Review/Test, and Safe Stop proofs, then use that real,
local documentation change as the End-to-End Change Proof required by
`VISION.md`.

## Problem

`docs/project/current-state.md` is the declared owner of delivery routing, but
it still says that no V1 proof has run and embeds a historical Git snapshot as
if it were current. The Safe Stop Proof correctly returned `STOPPED` because
those facts conflicted with the observed repository state.

Git branch, commit, worktree, upstream, and pull-request facts are volatile
and are already governed by the mandatory fresh `WORK_STATE` preflight. A
committed state document cannot safely promise equality with its own resulting
`HEAD`, because writing the document creates a new commit. That rejected rule
must not be reintroduced.

## Design

`docs/project/current-state.md` remains the sole operational routing source,
but it owns only durable delivery facts:

- completed or evidenced roadmap slices and their inspectable artifacts;
- the current next bounded action; and
- the boundary between delivery routing and live Git-state verification.

It must not declare a branch, `HEAD`, worktree, upstream, pull-request state,
or document freshness as a live fact. Any task that needs those facts must run
the existing read-only work-state preflight immediately before its decision.

The reconciliation will record the Foundation Reset, Standalone Plan Proof,
Standalone Review/Test Proof, and Safe Stop Proof using the existing local
evidence. It will create one End-to-End Change Proof handoff that exposes the
request clarification, selected context, accepted design and plan,
implementation, verification results, limits, and next bounded action. Once
the change and handoff pass their checks, the routing record will point only to
the V1 Completion Review.

## Scope

Create:

- `docs/superpowers/plans/2026-08-11-current-delivery-state-reconciliation.md`;
- `docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md`.

Modify:

- `docs/project/current-state.md`.
- `test/docs-links.test.ts`.

Do not modify `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, `AGENTS.md`, the roadmap,
the documentation map, historical proof artifacts, source code, dependencies,
Git configuration, or any external system. Do not stage, commit, push, create
a pull request, or invoke a connector.

## Evidence model

The implementation must reopen, rather than paraphrase, the following sources:

- `VISION.md` and `docs/project/roadmap.md` for the V1 gate and milestone 5;
- `docs/project/current-state.md` and the Safe Stop handoff for the observed
  inconsistency and its recovery boundary;
- the Plan Proof handoff and Review/Test Proof plan/design for their declared
  evidence and reproducible checks;
- the common operating model and `AGENTS.md` for fresh-state, authority, and
  handoff rules; and
- a fresh `WORK_STATE` result for the live Git-state boundary.

The Review/Test Proof is recorded as an accepted historical session result.
The reconciliation may reproduce its artifact, link, and whitespace checks,
but it must not rerun the historical plan's then-live-`HEAD` predicate against
a later revision or present that as a new `PASS`. Its source revision and
publication commit remain source-labelled evidence, while the User's accepted
session result remains an approval fact. The reconciliation must not claim
runtime, host-security, connector, or external-behavior evidence.

## Acceptance criteria

- `current-state.md` no longer presents a historical Git snapshot as current
  delivery state and explicitly directs volatile Git decisions to fresh
  `WORK_STATE` evidence.
- The document has a source-labelled route through proofs 1–5 and identifies
  V1 Completion Review as the sole next bounded action.
- The End-to-End handoff lets a fresh reviewer inspect clarification, context,
  plan, implementation, checks, authority boundary, limits, and next action
  without hidden conversation context.
- Direct structural read-backs, the routing-contract test, `npm run check:docs`,
  `npm test`, and `git diff --check` pass. An untracked-file whitespace check
  covers each new Markdown artifact without staging.
- Final `WORK_STATE` lists exactly the five declared local changes: this design,
  its implementation plan, the End-to-End handoff,
  `docs/project/current-state.md`, and `test/docs-links.test.ts`; no external
  write occurs.

## Risks and stop conditions

If a controlling source is missing, contradictory, or cannot be read, return
`UNKNOWN` and preserve the evidence. If the starting worktree contains paths
outside this design's scope, return `STOPPED` and do not clean or overwrite
them. If the evidence cannot support a claimed proof status, retain the gap
explicitly rather than route to V1 Completion Review.

This design changes documentation routing only. It is an End-to-End Change
Proof for a real local change, not V1 completion or proof of runtime behavior.

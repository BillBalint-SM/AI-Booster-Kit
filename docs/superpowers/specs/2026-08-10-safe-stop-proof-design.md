# Safe Stop Proof Design

**Status:** Accepted design; local, uncommitted review state

## Objective

Prove that AI Booster Kit can run one independently invocable delivery-state
routing task that stops visibly when its canonical routing source contradicts
the live repository state. The proof produces a local, review-ready handoff;
it does not repair the conflicting source.

## Bounded task

The task asks: **Which roadmap slice may run next according to the canonical
delivery state?** It treats `docs/project/current-state.md` as the routing
source, compares its claims with a fresh `WORK_STATE`, and does not infer a
route from conversation history or untracked artifacts.

## Evidence boundary

The task may read only:

- `docs/project/current-state.md`;
- a fresh work-state preflight result;
- `docs/project/roadmap.md`, `VISION.md`, `AGENTS.md`, and the common operating
  model; and
- local Git output needed to preserve the observed changed-path boundary.

The discovery evidence contains a concrete conflict: `current-state.md` records
an earlier `HEAD` and a clean worktree, while the live preflight records a
later `HEAD` and local proof-review paths. The source's statement about prior
proofs is additional context, not evidence of an accepted route. The execution
must re-observe these facts; it must not trust this design's snapshot as current
state.

## Result contract

Return `STOPPED` when the routing source and the live state disagree on a fact
that controls route selection, including repository revision, worktree state,
or the existence of the prior proof evidence. The handoff records:

- the exact bounded task and `Status: STOPPED`;
- source-labelled routing and live-state facts;
- the conflict and why it prevents selecting the next roadmap slice;
- the authority boundary and every action deliberately not taken;
- evidence, limits, and one next safe action.

Return `UNKNOWN` only if a required source or preflight result cannot be read,
is incomplete, or cannot be compared. Do not turn missing evidence into a
route.

## Authority and non-actions

The proof creates one local, uncommitted handoff at:

`docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md`

It does not modify `docs/project/current-state.md`, stage, commit, push, create
a pull request, invoke a connector, or make any external change. The handoff's
only next safe action is a separately approved **Current Delivery State
Reconciliation** task.

## Acceptance criteria

- The task is independently invocable and stops from current, reproducible
  evidence rather than a simulated failure.
- A fresh reviewer can locate the routing source, the live-state evidence, the
  exact conflict, the authority boundary, and the next safe action from the
  handoff alone.
- The result is exactly `STOPPED` or `UNKNOWN`; it never silently selects a
  roadmap route.
- Direct read-back, `npm run check:docs`, `git diff --check`, and a direct
  untracked-file whitespace check provide proportionate local verification.
- The proof does not claim V1 completion, runtime behavior, host security, or
  connector capability.

## Risks and limits

This proof validates safe stopping for a delivery-state-routing task only. It
does not establish the correct reconciled delivery state or authorize a route
after the conflict is fixed. The source may change between design and
execution; that requires a fresh comparison and may change the observed result
to `UNKNOWN` or a different safe stop.

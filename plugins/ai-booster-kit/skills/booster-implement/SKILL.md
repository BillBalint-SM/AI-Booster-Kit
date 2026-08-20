---
name: booster-implement
description: Implement one accepted bounded software change with reviewable code, evidence, and explicit residual risk.
---

# Booster Implement

Implement exactly one accepted change inside the existing Agent and Model.

## Gates

Proceed only when all are explicit and current:

- `objective`, plus `refined-scope`, `acceptance-criteria`, `decision-record`,
  and the exact `plan-handoff` in `COMPLETE` or `COMPLETE_WITH_LIMIT` state;
- `accepted-plan` in `ACCEPTED` state from the User, bound to the exact
  `plan-handoff` reference;
- `repository-verified` in `VERIFIED` state against the active target and
  current worktree;
- in team mode, `delivery-roles`, `ownership-map`, and `review-gates`.

If the plan no longer matches the repository, return `STOPPED` and recommend
planning or a new acceptance checkpoint. Never reinterpret a draft or stale
plan as accepted.

## Procedure

1. Read binding repository instructions and inspect the current worktree.
   Preserve unrelated and dirty work.
2. Restate the bounded change, acceptance criteria, evidence boundary, and
   stop condition before edits.
3. For behavior changes, establish a failing public-interface test first unless
   the repository's binding procedure requires a stricter method. Keep the
   smallest useful vertical slice.
4. Implement through existing seams. Do not silently add an Agent, Model,
   connector, dependency, external target, runtime authority, or workflow.
5. Run targeted verification, then the proportionate broader checks required
   by the repository. Reopen changed artifacts and self-review the diff.
6. Do not commit, push, publish, merge, delete, or perform an external write
   without fresh exact authority.

## Result contract

Return `COMPLETE`, `COMPLETE_WITH_LIMIT`, `STOPPED`, or `UNKNOWN`, plus:

- `reviewable-diff`: exact changed files or revision reference;
- `implementation-evidence`: commands/checks and observed results;
- `residual-risk-record`: limits, skipped checks, unknowns, and rollback;
- accepted scope, unrelated work preserved, decisions, and next action.

Recommend `$booster-test` for independent validation or `$booster-review` when
the evidence contract already permits review. Do not invoke either Skill.

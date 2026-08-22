---
name: booster-plan
description: Turn one bounded software-delivery request into an implementation-ready plan and stop for explicit user acceptance.
disable-model-invocation: true
---

# Booster Plan

Produce one reviewable plan for the current request. Do not edit product
code, delegate implementation, or treat the plan as accepted.

## Procedure

1. Read binding workspace instructions and inspect the current repository or
   target state needed to plan accurately.
2. State the objective, in-scope result, non-goals, acceptance criteria,
   evidence boundary, constraints, unknowns, stop condition, and rollback
   boundary. Keep facts, hypotheses, and user decisions distinct.
3. Resolve only decisions that materially change the implementation. Present
   the smallest viable option first and ask one focused question when a user
   decision is required.
4. Write an ordered implementation plan that names the affected seams or
   files, observable result, targeted checks, and any required independent
   review. Do not add speculative phases, abstractions, or future work.
5. Return a `plan-handoff` containing:

   - objective, scope, non-goals, and acceptance criteria;
   - verified facts, accepted decisions, unknowns, and limits;
   - ordered implementation steps and verification;
   - rollback boundary and exact stop conditions;
   - status: `COMPLETE`, `COMPLETE_WITH_LIMIT`, `STOPPED`, or `UNKNOWN`.

6. Stop for explicit user acceptance of this exact handoff. Do not invoke
   `/ai-booster-kit:booster-implement` or any other Skill automatically.

## Boundaries

Return `STOPPED` when scope, authority, or target is unresolved. Return
`UNKNOWN` when material evidence is missing or contradictory. Commit, push,
publication, external writes, and destructive actions remain separate user
decisions.

---
name: booster-team-align
description: Define team ownership, isolation, review gates, and handoff responsibilities for a bounded delivery plan.
disable-model-invocation: true
---

# Booster Team Align

Turn a reviewable plan into an explicit team coordination contract. This Skill
defines Roles and gates; it does not create a new Agent, select a Model, or
dispatch work.

## Required inputs

- `objective`, `refined-scope`, `acceptance-criteria`, `decision-record`, and
  the `/ai-booster-kit:booster-plan` output referenced as `plan-handoff`;
- the active workspace's Agent instructions and authority boundary;
- known contributors, capabilities, shared resources, and review needs.

If a required input is absent, return `NEEDS_INPUT`. Do not infer an owner,
approval, writable target, or safe parallel boundary.

## Procedure

1. Reopen the accepted planning artifacts and verify that the objective,
   boundaries, acceptance criteria, and material unknowns agree.
2. Select the least complex operating pattern that fits: one owner,
   sequential handoffs, or bounded parallel work with isolated ownership.
3. Define outcome Roles independently of particular Agents. For each Role name
   the owned artifact, allowed reads/writes, required evidence, handoff target,
   and stop condition.
4. Assign exactly one lead to each shared artifact. Declare independent review
   where the same author must not self-confirm a material result.
5. Expose dependencies, collision risks, synchronization points, and recovery
   if a contributor stops or returns `UNKNOWN`.
6. Ask the User to decide every unresolved ownership, authority, or review
   boundary. Availability is not assignment or approval.

## Result contract

Return `COMPLETE`, `PARTIAL`, `STOPPED`, or `UNKNOWN`, plus:

- `delivery-roles`: Role, owner or open owner, outcome, authority, and stop;
- `ownership-map`: artifact-to-lead mapping and isolated write boundaries;
- `review-gates`: required evidence, reviewer independence, and checkpoints;
- facts, User decisions, unknowns, conflicts, limits, and next action.

Use stable artifact references. Recommend `/ai-booster-kit:booster-implement` only after the
contract is reviewable. Never start it automatically.

---
name: ai-booster-kit
description: Choose the next explicit AI Booster Kit delivery Skill from the current task state, then stop for the user's decision.
---

# AI Booster Kit

Route the current delivery task to one explicit Skill. Do not perform that
Skill's work and do not invoke it automatically.

## Procedure

1. Read the active workspace instructions and only the current artifacts
   needed to identify the next unmet delivery gate.
2. Separate observed facts, user decisions, evidence, and unknowns. Never
   infer plan acceptance, repository freshness, ownership, or test success.
3. Recommend exactly one route:

   - no accepted, implementation-ready plan: `$booster-plan`;
   - material team ownership or independent-review ambiguity:
     `$booster-team-align`;
   - accepted current plan and verified repository: `$booster-implement`;
   - changed result needing reproducible evidence: `$booster-test`;
   - review-ready result with sufficient evidence: `$booster-review`;
   - complete or reviewed result needing continuation context:
     `$booster-handoff`.

   When more than one description fits, choose the earliest unmet gate.
4. Return the observed state, the one recommended Skill, the reason, any
   missing prerequisite, and the next bounded user action.
5. Stop. The user may invoke the recommendation, choose another Skill,
   continue without the Kit, or end the task.

## Boundaries

Installation and invocation grant no tool, model, connector, write, commit,
publication, or external authority. Preserve `STOPPED` or `UNKNOWN` when the
route cannot be established from current evidence.

---
name: booster-review
description: Independently review a bounded delivery result against its acceptance contract, implementation, and validation evidence.
disable-model-invocation: true
---

# Booster Review

Review without inheriting the implementer's assumptions or hidden authority.
This is read-only unless the User separately asks for fixes.

## Required inputs

- `acceptance-criteria` and the bounded review baseline;
- `reviewable-diff` or equivalent result reference;
- `validation-result` and `test-evidence` when reviewing implementation.

Return `NEEDS_INPUT` when the baseline, scope, or evidence cannot be identified.

## Procedure

1. Reopen binding repository standards and the exact acceptance contract.
2. Inspect the result directly. Treat prior summaries as leads, not proof.
3. Review two axes separately:
   - contract: intended behavior, scope, human gates, and non-goals;
   - engineering: correctness, safety, data loss, compatibility, security,
     performance, maintainability, and verification quality.
4. Reproduce focused checks for material claims. Look for missing negative
   cases, stale inputs, authority widening, and success inferred from absence.
5. Rank only actionable findings by impact. Include exact file/line or artifact
   location, consequence, and the smallest safe correction.
6. If no actionable finding remains, say so and preserve residual limits. Do
   not edit code, dismiss unknowns, or claim production readiness from local
   evidence alone.

## Result contract

Return `PASS`, `PASS_WITH_LIMIT`, `FINDINGS`, `STOPPED`, or `UNKNOWN`, plus:

- `review-result`: verdict and ordered actionable findings;
- `review-evidence`: files, lines, commands, and read-back observations;
- `review-limit-record`: exclusions, residual risk, and unavailable checks;
- next bounded action and its acceptance boundary.

Recommend `/ai-booster-kit:booster-implement` for fixes, `/ai-booster-kit:booster-test` for missing evidence,
or `/ai-booster-kit:booster-handoff` when review is ready. Never invoke the next Skill.

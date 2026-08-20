---
name: booster-test
description: Verify a bounded result against declared acceptance criteria and produce reproducible evidence without hiding failures.
---

# Booster Test

Validate a declared result. This Skill may be invoked independently when its
own input contract is satisfied; it does not require the default Flow.

## Required inputs

- `acceptance-criteria` with observable pass conditions;
- `reviewable-diff` or another explicit bounded target;
- `implementation-evidence` describing the claims to reproduce.

Return `NEEDS_INPUT` when the target or criteria are ambiguous. Do not repair
product code during this Skill; route fixes back to implementation.

## Procedure

1. Reopen the target, criteria, and relevant repository instructions. Separate
   implementation claims from observed facts.
2. Build a criterion-to-check matrix that includes happy path, failure path,
   authority boundary, and regression risk in proportion to the change.
3. Run the narrowest reproducible checks first, then the required broader
   suite. Record exact commands, exit states, meaningful output, environment,
   and unexecuted checks.
4. Read back produced artifacts or state where material. A test command name is
   not evidence that the intended behavior was exercised.
5. Preserve failures, flakes, partial coverage, contradictory evidence, and
   environmental limits. Never turn an unavailable check into `PASS`.

## Result contract

Return `PASS`, `PASS_WITH_LIMIT`, `FAIL`, `STOPPED`, or `UNKNOWN`, plus:

- `validation-result`: criterion-by-criterion verdict;
- `test-evidence`: reproducible commands and observations;
- `evidence-map`: each claim linked to its evidence and limit;
- regressions, residual risk, unknowns, and next bounded action.

Recommend `$booster-review` after a sufficient pass, `$booster-implement` for
failures requiring changes, or `$booster-handoff` for a standalone validation
result. Never invoke the continuation automatically.

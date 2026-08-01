# M1 Readiness CLI Recommendation Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose the M1-B formation recommendation through a user-facing, read-only CLI command without changing the existing Quick Task checkpoint or activation flow.

**Architecture:** Add `recommend-formation --input <path>` as a separate CLI command. It parses the existing closed Quick Task request, loads the canonical M1-A catalog, calls `recommendFormation`, and emits only the recommendation result. The existing `quick-task`, `resolve-checkpoint`, and `activate-quick-task` commands remain behaviorally unchanged.

**Tech Stack:** TypeScript 5.9, Node.js 22, Node built-in test runner, existing catalog/request validators.

## Global Constraints

- The command is local-only, read-only, deterministic, and does not create artifacts.
- Do not add a checkpoint to a candidate/unknown recommendation or activate a formation.
- Preserve no-Agent/custom-tool precedence and all existing Quick Task CLI output behavior.
- Map malformed requests, catalog failures, and unsafe recommendation inputs to a stopped JSON result without echoing raw input.
- Keep the M1 overall status `NOT READY` until ready recipes and profile-specific output contracts are delivered.

---

### Task 1: Add failing CLI integration tests

**Files:**
- Modify: `test/controller-cli.test.ts`

**Coverage:**
- A validation request through `recommend-formation --input <path>` returns exit code 2, scenario `validation`, decision `CANDIDATE`, and no filesystem artifacts.
- An ambiguous request returns exit code 2 with decision `UNKNOWN`, scenario `UNKNOWN`, and no formation.
- Malformed JSON returns exit code 3 with `STOPPED` and no leaked input value.

**Red check:** Run `npm run build` after adding the tests and observe the missing CLI command behavior before implementing it.

### Task 2: Implement the read-only recommendation command

**Files:**
- Modify: `src/cli.ts`

**Behavior:**
- Add the help entry and dispatch branch for `recommend-formation`.
- Require exactly `--input <path>`.
- Read and parse the explicit JSON request, load `contract/agent-library/formation-catalog.md`, and call `recommendFormation`.
- Emit the recommendation JSON and return 0 only for `RECOMMEND` or `NO_AGENT`; return 2 for `CANDIDATE`, `UNKNOWN`, or `NO_FIT`.
- Return `STOPPED` with a stable error code for unreadable input, invalid JSON, request validation, catalog validation, or recommendation validation.

### Task 3: Update the current routing state

**Files:**
- Modify: `docs/project/current-state.md`

Record that the CLI recommendation boundary is implemented and tested, while ready scenario recipes and profile-specific output contracts remain the next M1 gaps.

### Task 4: Verify and publish

**Checks:**
- Run the focused CLI tests, full suite, documentation-link check, and `git diff --check`.
- Confirm the existing Quick Task checkpoint and activation tests remain green.
- Review the diff for accidental activation, persistence, external I/O, output leakage, and scope creep.
- Commit, push, create a ready PR, wait for green CI, merge, and return to clean `main`.

**Acceptance criteria:** The M1-B recommendation is reachable from the CLI through an explicit read-only command; positive candidate, ambiguous unknown, malformed input, no-Agent, and existing Quick Task checkpoint paths are proven; no external side effect is introduced.

# V1 Completion Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents without the user's explicit approval.

**Goal:** Return a durable `READY` or `NOT READY` V1 Completion Gate verdict
from direct evidence for all four required proofs.

**Architecture:** The review treats each proof as a separate evidence source,
locks live state independently from historical revisions, applies one closed
rubric, and persists the result in a local handoff. Only `READY` updates the
delivery route and its executable documentation contract.

**Tech Stack:** Markdown, PowerShell, Git, npm, Node's built-in test runner,
and the repository documentation-link checker.

## Global Constraints

- Execute only the accepted design in
  `docs/superpowers/specs/2026-08-11-v1-completion-review-design.md`.
- Review exactly the four proof types named in `VISION.md`; do not use the V1
  verdict itself as evidence for any proof row.
- Historical revisions identify source evidence only; no condition requires an
  artifact revision to equal a later live `HEAD`.
- Do not repair or reinterpret a proof artifact during this audit.
- Do not stage, commit, push, merge, create a pull request, invoke a
  connector, or make an external write.
- A recurrent full-suite timeout produces `NOT READY`; it is not silently
  omitted or normalized to success.

---

## File map

| Path | Action | Responsibility |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-11-v1-completion-review-design.md` | Create/read | Decision rule and scope. |
| `docs/superpowers/plans/2026-08-11-v1-completion-review.md` | Create/read | This execution contract. |
| `docs/planning/ai-booster-kit/v1-completion-review/roadmap-6/2026-08-11-v1-completion-review-handoff.md` | Create/modify | Durable review verdict. |
| `docs/project/current-state.md` | Modify after `READY` | Delivery route and next human decision. |
| `test/docs-links.test.ts` | Modify after `READY` | Executable V1-ready route contract. |
| `docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md` | Read | Plan Proof evidence. |
| `docs/planning/ai-booster-kit/standalone-review-test-proof/roadmap-3/2026-08-11-plan-proof-review-handoff.md` | Read | Review/Test Proof evidence. |
| `docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md` | Read | Safe Stop Proof evidence. |
| `docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md` | Read | End-to-End Proof evidence. |
| `VISION.md`, `docs/project/roadmap.md`, `docs/operations/agent-operating-model.md`, `package.json` | Read | Gate, route, review, and command contract. |

## Task 1: Lock state and score the four proof rows

**Files:**

- Read: every proof and controlling path in the file map.
- Modify: none.
- Test: fresh work state, file readability, historical integrity, and rubric
  assertions.

**Consumes:** The accepted design and the User's V1-review approval.

**Produces:** Four source-labelled passing rows or exact `NOT READY` findings.

- [ ] **Step 1: Refresh current state and confirm sources.**

  Run:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  ```

  Confirm each proof target is a readable regular file. Missing live-state
  facts are `NOT READY`; do not recover them from historical chat context.

- [ ] **Step 2: Apply the independent rubric.**

  Assert:

  ```text
  Plan: COMPLETE; Planning-Show module; acceptance/evidence; next action.
  Review/Test: COMPLETE; PASS; evidence map; verification; limits.
  Safe Stop: STOPPED; Result STOPPED; reason code; evidence; next safe action.
  End-to-End: COMPLETE; clarification; context; design/plan; implementation;
  verification; authority boundary; limits; next action.
  ```

  Also assert that proof bundle `70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7`
  contains the Plan Proof and that
  `7905035faef29fd1a2f2bd82a643ee4f735a303c` is its ancestor. A failed row is
  `NOT READY` and must be named without editing it.

## Task 2: Create and populate the durable verdict

**Files:**

- Create: `docs/planning/ai-booster-kit/v1-completion-review/roadmap-6/2026-08-11-v1-completion-review-handoff.md`.
- Modify after `READY`: `docs/project/current-state.md`, `test/docs-links.test.ts`.
- Test: a pre-route assertion rejects an early `READY` claim; the targeted
  routing-contract test passes only after the supported result exists.

**Consumes:** Task 1's audited proof rows.

**Produces:** A temporary handoff, then one durable verdict and next action.

- [ ] **Step 1: Create the handoff with `Status: PENDING_VERIFICATION`.**

  Use `apply_patch`. Include the User authority, review revision, four-row
  evidence map, command verification section, limits, and next action. Do not
  enter a final verdict before Task 3's command output exists.

- [ ] **Step 2: Confirm no premature route claim.**

  Run a read-only assertion that `current-state.md` does not yet contain
  `V1 Completion Review | READY — V1 completion gate satisfied`.

- [ ] **Step 3: Finalize from actual evidence.**

  For four passing rows and a clean Task 3, set `Status: COMPLETE` and
  `Verdict: READY`. Update the V1 review row and routing decision in
  `current-state.md`, then add a matching static routing-contract assertion.

  For a missing proof or failed required check, set `Status: COMPLETE` and
  `Verdict: NOT READY`, name each failed row and smallest safe next action, and
  leave the prior V1 routing claim intact.

## Task 3: Independently verify the final evidence chain

**Files:**

- Read: all proof artifacts, current state, verdict handoff, package definition,
  and Git status.
- Modify: only the temporary handoff and `READY` route permitted by Task 2.
- Test: documentation links, tracked/untracked whitespace, targeted route,
  full suite, and final work state.

**Consumes:** The temporary verdict handoff and Task 1 rubric.

**Produces:** Final evidence for the recorded verdict.

- [ ] **Step 1: Run proof and documentation checks.**

  Run:

  ```powershell
  npm run check:docs
  git diff --check
  ```

  For every untracked Markdown artifact, run
  `git diff --no-index --check -- NUL <artifact>` and accept exit `1` only when
  its output contains no whitespace error.

- [ ] **Step 2: Verify the route and full suite.**

  After a `READY` route update, run:

  ```powershell
  npm run build
  node --test --test-name-pattern="documentation entry points: provide the approved routing contract" dist/test/docs-links.test.js
  npm test
  ```

  Expected: all commands exit `0`; `npm test` reports 598 passed, 0 failed,
  and 1 skipped. A timeout or failed test is a `NOT READY` finding, not a
  silent retry.

- [ ] **Step 3: Refresh final state.**

  Run the work-state preflight and compare `git status --porcelain` with the
  approved proof-package paths. Record no external action and retain residual
  risks in the handoff.

## Plan self-review

- **Spec coverage:** Task 1 implements the closed four-row rubric; Task 2
  makes the verdict durable and conditionally routes to it; Task 3 verifies
  links, tests, scope, and final state.
- **Placeholder scan:** This plan contains no unresolved placeholder or
  unspecified implementation step.
- **Consistency:** `READY` is an evidence-gate verdict only; it never bypasses
  separate User acceptance or Git-publication authority.

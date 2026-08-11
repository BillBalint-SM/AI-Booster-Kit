# Durable Standalone Review/Test Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents without the user's explicit approval.

**Goal:** Create one durable, local reviewer-facing result for the independent
review of the Standalone Plan Proof, satisfying roadmap item 3 without relying
on the historical session-only result.

**Architecture:** A bounded review reopens the published Plan Proof and its
contracts, confirms historical revision integrity without asserting it is the
live `HEAD`, reproduces proportionate local checks, and records the result in
one handoff. Only a `PASS` updates the delivery-routing row and its executable
documentation contract.

**Tech Stack:** Markdown, PowerShell, Git, npm, Node's built-in test runner,
and the repository documentation-link checker.

## Global Constraints

- Execute only the accepted design in
  `docs/superpowers/specs/2026-08-11-durable-standalone-review-test-proof-design.md`.
- The validation target is
  `docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md`.
- Do not alter the target or historical Plan, Review/Test, Safe Stop, or
  End-to-End proof artifacts.
- The new review may create its one result handoff and, only for `PASS`, update
  the stated current-delivery and routing-contract files.
- Do not stage, commit, push, merge, create a pull request, invoke a
  connector, or make an external write.
- `7905035faef29fd1a2f2bd82a643ee4f735a303c` and
  `70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7` are historical evidence values;
  no task treats either as the current `HEAD`.
- Result semantics are closed: `PASS` requires every stated condition; a
  deterministic failed condition is `STOPPED`; unavailable or contradictory
  evidence is `UNKNOWN`.

---

## File map

| Path | Action | Responsibility |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-11-durable-standalone-review-test-proof-design.md` | Create/read | Bounded remedy and acceptance criteria. |
| `docs/superpowers/plans/2026-08-11-durable-standalone-review-test-proof.md` | Create/read | This execution contract. |
| `docs/planning/ai-booster-kit/standalone-review-test-proof/roadmap-3/2026-08-11-plan-proof-review-handoff.md` | Create/modify | Durable reviewer-facing result. |
| `docs/project/current-state.md` | Modify after `PASS` | Direct durable evidence route. |
| `test/docs-links.test.ts` | Modify after `PASS` | Executable documentation-route contract. |
| `docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md` | Read only | Validation target. |
| `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, `AGENTS.md`, `docs/operations/agent-operating-model.md`, `docs/project/roadmap.md`, `package.json` | Read only | Controlling boundaries and check ownership. |

## Task 1: Lock the review boundary and validate the target

**Files:**

- Read: every read-only path in the file map.
- Modify: none.
- Test: fresh work-state, published artifact integrity, and exact target
  structure.

**Consumes:** The accepted design and fresh `WORK_STATE`.

**Produces:** Source-labelled evidence that can support a `PASS`, `STOPPED`, or
`UNKNOWN` result.

- [ ] **Step 1: Refresh the repository state and confirm the target.**

  Run:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  $target = 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    throw "STOPPED: Plan Proof target is not a readable file at $target"
  }
  ```

  Expected: repository, branch, `HEAD`, worktree, upstream, and pull-request
  facts are complete; the exact target exists. Missing or contradictory state
  is `UNKNOWN`; a missing target is `STOPPED`.

- [ ] **Step 2: Verify historical integrity without treating it as live state.**

  Run:

  ```powershell
  $historicalBase = '7905035faef29fd1a2f2bd82a643ee4f735a303c'
  $proofBundle = '70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7'
  $target = 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  git merge-base --is-ancestor $historicalBase $proofBundle
  if ($LASTEXITCODE -ne 0) { throw 'UNKNOWN: Historical base is not an ancestor of the proof bundle.' }
  git cat-file -e "${proofBundle}:$target"
  if ($LASTEXITCODE -ne 0) { throw 'UNKNOWN: Published proof bundle lacks the Plan Proof target.' }
  git diff --exit-code $proofBundle -- $target
  if ($LASTEXITCODE -ne 0) { throw 'STOPPED: Current target differs from the published proof-bundle target.' }
  ```

  Expected: the historical source precedes the published proof bundle and the
  current target equals its published content. Neither result asserts a current
  branch or revision.

- [ ] **Step 3: Map roadmap item 2 to exact target evidence.**

  Verify `Status: COMPLETE` and these sections in the target:

  ```text
  ## Shared understanding
  ## Original brief
  ## Decision tree result
  ## Acceptance and evidence
  ## Unknowns, risks, and dependencies
  ## Open decision frontier
  ## Final confirmation
  ## Next bounded action
  ```

  Record this map in the handoff:

  | Roadmap 2 requirement | Evidence in target |
  | --- | --- |
  | Standalone planning module | `Original brief` and decision `D1` name explicit `$planning-show`. |
  | Reviewable plan | The shared understanding, decisions, rejected interpretations, and next action preserve the plan without hidden context. |
  | Acceptance boundary | `Acceptance and evidence` names artifact, authority, and checks. |
  | Verification approach | decision `D5` and `Acceptance and evidence` require read-back, `npm run check:docs`, and `git diff --check`. |

  Missing status, section, or mapped evidence is `STOPPED`.

## Task 2: Capture the durable result and update its route

**Files:**

- Create: `docs/planning/ai-booster-kit/standalone-review-test-proof/roadmap-3/2026-08-11-plan-proof-review-handoff.md`.
- Modify after `PASS`: `docs/project/current-state.md`, `test/docs-links.test.ts`.
- Test: a read-only pre-route assertion confirms that the durable route is not
  claimed early; the targeted routing-contract test passes only after the
  supported route is added.

**Consumes:** Task 1's locked evidence and target map.

**Produces:** A durable reviewer-facing result and direct delivery routing.

- [ ] **Step 1: Create the handoff in temporary verification state.**

  Use `apply_patch` to create the handoff with `Status: PENDING_VERIFICATION`.
  It must contain the exact claim, target, current review revision, historical
  evidence boundary, criterion-to-evidence map, verification section,
  authority boundary, limits, and next bounded action. It must not claim
  `PASS` before Task 3's command results exist.

- [ ] **Step 2: Confirm that the durable route is not claimed early.**

  Before command evidence exists, use a read-only assertion rather than adding
  a persistent failing test:

  ```powershell
  node --input-type=module -e "import { readFile } from 'node:fs/promises'; const state = await readFile('docs/project/current-state.md', 'utf8'); if (/COMPLETE — durable PASS result/.test(state)) { throw new Error('STOPPED: durable Review/Test route was claimed before verification.'); }"
  ```

  Expected: exit `0`; the delivery route remains historical until the result
  has command-level evidence.

- [ ] **Step 3: Finalize only a supported result.**

  If every Task 1 and Task 3 condition passes, replace the temporary handoff
  status with `Status: COMPLETE` and add `Result: PASS`; record the actual
  command outcomes. Update `current-state.md` to link its Review/Test row to
  the handoff and state that a fresh V1 Completion Review remains required.
  Then update the routing-contract test to the same exact path and wording.

  If a deterministic condition fails, preserve `Status: STOPPED` and
  `Result: STOPPED` in the handoff and leave the route unchanged. If evidence
  is unavailable or contradictory, preserve `Status: UNKNOWN` and
  `Result: UNKNOWN` and leave the route unchanged.

## Task 3: Reproduce checks and verify the completed evidence chain

**Files:**

- Read: the target, new handoff, current delivery state, package definition,
  and Git status.
- Modify: the temporary handoff status/verification section and the approved
  route only as Task 2 permits.
- Test: documentation links, tracked and untracked whitespace, targeted
  routing contract, and the full suite.

**Consumes:** The temporary handoff and Task 1 evidence.

**Produces:** A final `PASS`, `STOPPED`, or `UNKNOWN` handoff with verified
scope.

- [ ] **Step 1: Run the declared validation checks.**

  Run:

  ```powershell
  npm run check:docs
  git diff --check
  $output = (& git diff --no-index --check -- NUL $target 2>&1 | Out-String)
  $exitCode = $LASTEXITCODE
  ```

  Expected: documentation and tracked whitespace checks exit `0`; the direct
  target check exits `0` or `1` without `trailing whitespace` or `space before
  tab`. Exit `1` only denotes the expected difference from `NUL`.

- [ ] **Step 2: Run direct whitespace checks for every untracked Markdown proof artifact.**

  For each untracked Markdown artifact, run:

  ```powershell
  $output = (& git diff --no-index --check -- NUL $artifact 2>&1 | Out-String)
  $exitCode = $LASTEXITCODE
  if ($output -match 'trailing whitespace|space before tab') {
    throw "STOPPED: Whitespace error in $artifact"
  }
  if ($exitCode -notin @(0, 1)) {
    throw "UNKNOWN: Unexpected direct whitespace-check exit code $exitCode for $artifact"
  }
  ```

  Expected: no whitespace error; CRLF-normalization warnings are neutral.

- [ ] **Step 3: Prove the finished route and suite.**

  Run:

  ```powershell
  npm run build
  node --test --test-name-pattern="documentation entry points: provide the approved routing contract" dist/test/docs-links.test.js
  npm test
  npm run check:docs
  git diff --check
  ```

  Expected: every command exits `0`. A failure after the route update remains
  evidence against `PASS`; do not hide it by removing a test or discarding a
  file.

- [ ] **Step 4: Refresh the final work state.**

  Run:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  git status --short
  ```

  Expected: all changed paths belong to the earlier reconciliation package or
  this approved durable-review package. No external action is present.

## Plan self-review

- **Spec coverage:** Task 1 validates the target and its historical boundary;
  Task 2 creates the durable result and only conditionally routes to it; Task 3
  reproduces every required check and verifies the final scope.
- **Placeholder scan:** This plan contains no unresolved placeholder or
  unspecified implementation step.
- **Consistency:** The only success state is a handoff with both
  `Status: COMPLETE` and `Result: PASS`; the V1 completion verdict remains a
  separate future review.

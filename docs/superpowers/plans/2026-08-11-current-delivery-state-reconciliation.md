# Current Delivery State Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents without the User's explicit approval.

**Goal:** Restore truthful delivery routing in `current-state.md` and produce a
review-ready local End-to-End Change Proof without an external write.

**Architecture:** Keep `current-state.md` as the owner of durable delivery
routing, while the mandatory `WORK_STATE` preflight remains the sole source for
volatile Git and pull-request facts. Preserve the historical Plan, Review/Test,
and Safe Stop proof evidence rather than recasting their old source revisions
as live facts. One new handoff records this change's clarification, context,
plan, implementation, verification, limits, and next action.

**Tech Stack:** Markdown, PowerShell, Git, npm, and the repository's
TypeScript-based documentation-link checker.

## Global Constraints

- Execute only the accepted design in
  `docs/superpowers/specs/2026-08-11-current-delivery-state-reconciliation-design.md`.
- Modify only `docs/project/current-state.md` and the routing-contract test at
  `test/docs-links.test.ts`; create only this plan's End-to-End handoff. The
  accepted design is already an in-scope local review artifact and must not be
  rewritten during execution.
- Do not reintroduce a `current-state.md` rule that equates its content with
  the resulting `main` `HEAD`. Historical revisions identify evidence at the
  time it was created; live Git/PR state requires a fresh `WORK_STATE` check.
- Treat the Standalone Review/Test Proof as an accepted historical session
  result. Reproduce only its artifact/link/whitespace evidence; do not apply
  its historical live-`HEAD` predicate to a later checkout or label that a new
  `PASS`.
- Do not modify `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, `AGENTS.md`,
  `docs/project/roadmap.md`, `docs/project/documentation-map.md`, historical
  proof artifacts, application code, dependencies, Git configuration, or
  external systems. The explicitly named routing-contract test is required to
  keep the approved document contract executable.
- Do not stage, commit, push, create a pull request, invoke a connector, or
  make any external write. A commit or publication requires separate explicit
  User approval.
- If a required source is missing, unreadable, or materially contradictory,
  return `UNKNOWN`. If an unexpected changed path appears, return `STOPPED`;
  do not clean, reset, overwrite, or discard it.

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-11-current-delivery-state-reconciliation-design.md` | Read | Accepted scope, evidence model, and stop conditions. |
| `docs/superpowers/plans/2026-08-11-current-delivery-state-reconciliation.md` | Read | This execution contract. |
| `docs/project/current-state.md` | Modify | Durable proof routing and next bounded action. |
| `test/docs-links.test.ts` | Modify | Executable contract for current delivery-routing headings and limits. |
| `docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md` | Create | Review-ready End-to-End Change Proof handoff. |
| `VISION.md` and `docs/project/roadmap.md` | Read | V1 gate and roadmap-item-5 evidence. |
| `AGENTS.md` and `docs/operations/agent-operating-model.md` | Read | Authority, fresh-state, verification, and handoff rules. |
| `docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md` | Read | Standalone Plan Proof evidence. |
| `docs/superpowers/specs/2026-08-10-standalone-review-test-proof-design.md` and `docs/superpowers/plans/2026-08-10-standalone-review-test-proof.md` | Read | Review/Test evidence boundary and historical-result semantics. |
| `docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md` | Read | The observed conflict and its separate-reconciliation boundary. |
| `package.json` | Read | Exact owner of `npm run check:docs`. |

## Task 1: Lock the evidence boundary and historical proof facts

**Files:**

- Read: every path in the File Map except the two Task-2 targets.
- Modify: none.
- Test: fresh preflight, exact changed-path audit, source readability, and
  historical-artifact existence.

**Consumes:** The accepted design, this plan, and the current checkout.

**Produces:** A current `WORK_STATE`, a fixed five-file final change boundary,
and source-labelled proof facts for the implementation.

- [ ] **Step 1: Refresh the repository state and validate the starting boundary.**

  Run from the repository root:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown

  $expectedStartingPaths = @(
    'docs/superpowers/specs/2026-08-11-current-delivery-state-reconciliation-design.md',
    'docs/superpowers/plans/2026-08-11-current-delivery-state-reconciliation.md'
  )
  $actualStartingPaths = @(git status --porcelain --untracked-files=all |
    ForEach-Object { $_.Substring(3) } |
    Sort-Object)
  $difference = Compare-Object -ReferenceObject ($expectedStartingPaths | Sort-Object) `
    -DifferenceObject $actualStartingPaths
  if ($difference) {
    throw "STOPPED: Starting changed-path boundary differs from this plan.`n$($difference | Out-String)"
  }
  $actualStartingPaths
  ```

  Expected: a complete `WORK_STATE` record and exactly the accepted design and
  plan as local review artifacts. If the preflight lacks repository, branch,
  `HEAD`, worktree, upstream, or PR facts, return `UNKNOWN`; do not recover a
  value from earlier chat context.

- [ ] **Step 2: Reopen every controlling source as a regular readable file.**

  Run:

  ```powershell
  $sources = @(
    'VISION.md',
    'AGENTS.md',
    'docs/operations/agent-operating-model.md',
    'docs/project/roadmap.md',
    'docs/project/current-state.md',
    'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md',
    'docs/superpowers/specs/2026-08-10-standalone-review-test-proof-design.md',
    'docs/superpowers/plans/2026-08-10-standalone-review-test-proof.md',
    'docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md',
    'package.json'
  )
  foreach ($source in $sources) {
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
      throw "UNKNOWN: Required source is not a readable file: $source"
    }
    Get-Content -Raw -LiteralPath $source | Out-Null
  }
  $sources
  ```

  Expected: all ten sources are readable. Do not substitute a similarly named
  file for a missing source.

- [ ] **Step 3: Establish the proof facts without turning historical data into live state.**

  Run:

  ```powershell
  $planProof = Get-Content -Raw -LiteralPath 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  $safeStop = Get-Content -Raw -LiteralPath 'docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md'
  $proofBundle = '70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7'
  $historicalBase = '7905035faef29fd1a2f2bd82a643ee4f735a303c'

  if ($planProof -notmatch '(?m)^Status: COMPLETE$') {
    throw 'UNKNOWN: Plan Proof handoff does not expose Status: COMPLETE.'
  }
  if ($safeStop -notmatch '(?m)^Status: STOPPED$') {
    throw 'UNKNOWN: Safe Stop handoff does not expose Status: STOPPED.'
  }
  git merge-base --is-ancestor $historicalBase $proofBundle
  if ($LASTEXITCODE -ne 0) {
    throw "UNKNOWN: Historical base $historicalBase is not an ancestor of proof bundle $proofBundle."
  }
  git cat-file -e "${proofBundle}:docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md"
  if ($LASTEXITCODE -ne 0) {
    throw 'UNKNOWN: The published proof bundle lacks the Plan Proof handoff.'
  }
  git cat-file -e "${proofBundle}:docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md"
  if ($LASTEXITCODE -ne 0) {
    throw 'UNKNOWN: The published proof bundle lacks the Safe Stop handoff.'
  }
  [pscustomobject]@{
    PlanProof = 'COMPLETE'
    ReviewTestProof = 'Accepted historical session result; do not rerun its historical live-HEAD predicate.'
    SafeStopProof = 'STOPPED (intended proof outcome)'
    HistoricalBase = $historicalBase
    PublishedProofBundle = $proofBundle
  } | ConvertTo-Json
  ```

  Expected: published Plan and Safe Stop artifacts, a historical base that
  precedes the proof bundle, and no claim that either revision is the current
  `HEAD`. The Review/Test Proof stays a source-labelled accepted session result;
  only its reproducible local checks may be repeated later.

## Task 2: Implement the durable route and End-to-End handoff

**Files:**

- Modify: `docs/project/current-state.md`.
- Modify: `test/docs-links.test.ts` when the full suite exposes its former
  Foundation Reset heading contract.
- Create: `docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md`.
- Test: direct read-back and structural assertions before final checks.

**Consumes:** Task-1 proof facts and the accepted design/plan.

**Produces:** A revision-agnostic delivery route and one review-ready artifact
that captures the full local change flow.

- [ ] **Step 1: Replace the stale routing record with durable delivery facts.**

  Use `apply_patch` to replace the complete content of
  `docs/project/current-state.md`. The finished file must contain exactly these
  headings and substantive facts:

  ```markdown
  # Current delivery state

  This is the sole operational routing source for durable delivery facts and
  the next bounded action. It is not a live Git or pull-request state record.

  ## Live Git and pull-request guard

  Before any branch, commit, push, pull request, merge, rebase, or external
  target decision, run the repository work-state preflight. A revision inside a
  proof artifact identifies historical evidence only; it never asserts the
  current `HEAD`.

  ## Delivery evidence

  | Roadmap slice | State | Evidence and boundary |
  | --- | --- | --- |
  | Foundation Reset | Published | [Foundation Reset migration record](../history/foundation-reset/2026-08-10-document-migration-record.md) and publication commit `7905035faef29fd1a2f2bd82a643ee4f735a303c`. |
  | Standalone Plan Proof | COMPLETE | [Planning-Show handoff](../planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md), published in proof bundle `70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7`. |
  | Standalone Review/Test Proof | Accepted historical session result | Its [design](../superpowers/specs/2026-08-10-standalone-review-test-proof-design.md) and [plan](../superpowers/plans/2026-08-10-standalone-review-test-proof.md) preserve the read-only claim and checks. Do not reinterpret its then-live revision predicate as a new result. |
  | Safe Stop Proof | STOPPED — intended proof result | [Delivery-state conflict handoff](../planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md) records the reason, limits, and reconciliation boundary. |
  | End-to-End Change Proof | COMPLETE | [Current Delivery State Reconciliation handoff](../planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md) records this local clarification, context, plan, implementation, verification, and handoff. |

  ## Current routing decision

  The four V1 proof types now have identified, reviewable evidence with their
  limits preserved. This is not a `READY` verdict and does not claim V1
  completion. The only next bounded action is a separately approved V1
  Completion Review.

  ## Limits

  This routing record does not prove runtime behavior, host security,
  instruction loading, connector behavior, external authority, or the outcome
  of the V1 Completion Review.

  ## Next bounded action

  Select and explicitly approve the V1 Completion Review from
  [the roadmap](roadmap.md). It must independently return `READY` or `NOT
  READY`; this document does not choose that verdict.
  ```

  Do not include the former `## Branch and pull request`, `Freshness`,
  `Worktree`, `Upstream`, or `No real v1 proof has run yet` text. Do not add a
  current branch or commit value.

- [ ] **Step 2: Create the End-to-End Change Proof handoff with actual scope facts.**

  Confirm that the target does not yet exist, then create its parent directory
  and use `apply_patch` to add the handoff. Its content must have this exact
  shape; replace the command-result bullets only after Task 3 has actual
  output:

  ```markdown
  # End-to-End Change Proof Handoff: Current Delivery State Reconciliation

  Status: PENDING_VERIFICATION
  Session: current-delivery-state-reconciliation-2026-08-11
  Starting revision: 70c6ed7c324521c2cf14c00d7f79ff80bff3c4e7
  Scope: One local documentation change that restores durable delivery routing.

  ## Request clarification

  The User requested that work continue in one cohesive batch and approved the
  design that separates durable delivery routing from fresh live Git state.

  ## Context selection

  - `VISION.md` and `docs/project/roadmap.md` define the V1 proof gate and
    roadmap item 5.
  - `docs/project/current-state.md` and the Safe Stop handoff establish the
    stale-routing problem and reconciliation boundary.
  - The Plan Proof handoff plus Review/Test design and plan establish the
    existing proof evidence and its historical-result limit.
  - `AGENTS.md`, the common operating model, and a fresh `WORK_STATE` define
    authority and live-state verification.

  ## Accepted design and plan

  - Design: `docs/superpowers/specs/2026-08-11-current-delivery-state-reconciliation-design.md`.
  - Plan: `docs/superpowers/plans/2026-08-11-current-delivery-state-reconciliation.md`.

  ## Implementation

  `docs/project/current-state.md` now routes only on durable delivery evidence.
  Volatile Git and pull-request facts require a fresh work-state preflight.
  The rejected self-referential `HEAD` equality rule was not added.

  ## Verification

  Pending Task 3 results.

  ## Authority boundary

  This proof modifies only the declared local documentation files. It does not
  stage, commit, push, create a pull request, invoke a connector, or make an
  external write.

  ## Limits

  This is an End-to-End Change Proof for a local documentation change. It is
  not a V1 completion verdict and does not prove runtime, host, security,
  connector, or external-system behavior.

  ## Next bounded action

  A separately approved V1 Completion Review must inspect all four proof types
  and return `READY` or `NOT READY` without inferring the result from this
  handoff.
  ```

  If the target already exists, return `STOPPED` without overwriting it. The
  temporary `PENDING_VERIFICATION` state is permitted only until Task 3 either
  records actual results as `COMPLETE` or preserves a `STOPPED`/`UNKNOWN`
  result.

- [ ] **Step 3: Assert the new route and handoff structure before command checks.**

  Run:

  ```powershell
  $state = Get-Content -Raw -LiteralPath 'docs/project/current-state.md'
  $handoff = Get-Content -Raw -LiteralPath 'docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md'
  $stateRequired = @(
    '## Live Git and pull-request guard',
    '## Delivery evidence',
    '## Current routing decision',
    '## Limits',
    '## Next bounded action',
    'V1 Completion Review'
  )
  $stateForbidden = @(
    '## Branch and pull request',
    'No real v1 proof has run yet:',
    '- Freshness:',
    '- Worktree:',
    '- Upstream:'
  )
  $handoffRequired = @(
    '## Request clarification',
    '## Context selection',
    '## Accepted design and plan',
    '## Implementation',
    '## Verification',
    '## Authority boundary',
    '## Limits',
    '## Next bounded action'
  )
  foreach ($required in $stateRequired) {
    if (-not $state.Contains($required)) { throw "STOPPED: Current state is missing $required." }
  }
  foreach ($forbidden in $stateForbidden) {
    if ($state.Contains($forbidden)) { throw "STOPPED: Current state still contains stale routing text $forbidden." }
  }
  foreach ($required in $handoffRequired) {
    if (-not $handoff.Contains($required)) { throw "STOPPED: Handoff is missing $required." }
  }
  ```

  Expected: all required headings are present, stale live-state assertions are
  absent, and the handoff is structurally reviewable. If a required assertion
  fails, record a `STOPPED` result in the handoff; do not claim completion.

## Task 3: Verify the final local proof and record its result

**Files:**

- Modify: the End-to-End handoff's status and verification section only.
- Read: `current-state.md`, the handoff, `package.json`, Git status, and fresh
  `WORK_STATE` output.
- Test: documentation links, tracked and untracked whitespace, structures,
  exact changed-path boundary, and no-external-action audit.

**Consumes:** The Task-2 implementation and command outputs.

**Produces:** A final `COMPLETE`, `STOPPED`, or `UNKNOWN` handoff with a
source-labelled verification record.

- [ ] **Step 1: Run the proportionate documentation checks.**

  Run:

  ```powershell
  npm run check:docs
  git diff --check
  ```

  Expected: both commands exit `0`; record each command and outcome. A
  reproducible documentation or whitespace error is `STOPPED`. An unavailable
  command or incomplete output is `UNKNOWN`.

- [ ] **Step 2: Check each untracked Markdown artifact without staging.**

  Run:

  ```powershell
  $untrackedArtifacts = @(
    'docs/superpowers/specs/2026-08-11-current-delivery-state-reconciliation-design.md',
    'docs/superpowers/plans/2026-08-11-current-delivery-state-reconciliation.md',
    'docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md'
  )
  foreach ($artifact in $untrackedArtifacts) {
    $output = (& git diff --no-index --check -- NUL $artifact 2>&1 | Out-String)
    $exitCode = $LASTEXITCODE
    if ($output -match 'trailing whitespace|space before tab') {
      throw "STOPPED: Target-specific whitespace check found an error in $artifact.`n$output"
    }
    if ($exitCode -notin @(0, 1)) {
      throw "UNKNOWN: Target-specific whitespace check ended with unexpected exit code $exitCode for $artifact.`n$output"
    }
    [pscustomobject]@{ Path = $artifact; ExitCode = $exitCode; Output = $output }
  }
  ```

  Expected: no whitespace-error text. Exit code `1` is valid because `NUL`
  differs from an existing untracked file; a CRLF-normalization warning is a
  neutral environment fact.

- [ ] **Step 3: Check the final changed-path boundary and fresh work state.**

  Run:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown

  $expectedFinalPaths = @(
    'docs/project/current-state.md',
    'test/docs-links.test.ts',
    'docs/superpowers/specs/2026-08-11-current-delivery-state-reconciliation-design.md',
    'docs/superpowers/plans/2026-08-11-current-delivery-state-reconciliation.md',
    'docs/planning/ai-booster-kit/end-to-end-change-proof/roadmap-5/2026-08-11-current-delivery-state-reconciliation-handoff.md'
  )
  $actualFinalPaths = @(git status --porcelain --untracked-files=all |
    ForEach-Object { $_.Substring(3) } |
    Sort-Object)
  $difference = Compare-Object -ReferenceObject ($expectedFinalPaths | Sort-Object) `
    -DifferenceObject $actualFinalPaths
  if ($difference) {
    throw "STOPPED: Final changed-path boundary differs from this plan.`n$($difference | Out-String)"
  }
  $actualFinalPaths
  ```

  Expected: `WORK_STATE` has complete live facts, the worktree is dirty only
  because of the five declared local changes, and no PR or external write was
  created. Do not treat that local dirty state as a live routing contradiction.

- [ ] **Step 4: Replace the temporary handoff status with the observed result and rerun final checks.**

  If every Task-2 structural assertion and every Task-3 check passed, use
  `apply_patch` to replace:

  ```markdown
  Status: PENDING_VERIFICATION
  ```

  with:

  ```markdown
  Status: COMPLETE
  ```

  Replace `Pending Task 3 results.` with these exact outcome bullets, adjusting
  only the actual command exit values if the environment reports them:

  ```markdown
  - Structural read-back confirmed the durable-route headings, removal of the
    stale live-state assertions, and all required handoff sections.
  - `npm run check:docs` exited `0`.
  - `git diff --check` exited `0`.
  - Direct `git diff --no-index --check` checks found no whitespace error in
    the design, plan, or End-to-End handoff; exit `1` only represented the
    expected difference from `NUL`.
  - The targeted routing-contract test and `npm test` both exited `0`.
  - Fresh `WORK_STATE` and `git status --porcelain` showed exactly the five
    declared local changes and no external action.
  ```

  Then rerun `npm run check:docs`, `git diff --check`, the handoff-specific
  `git diff --no-index --check` command, and `npm test`. If any check failed, instead record
  `Status: STOPPED` for a deterministic finding or `Status: UNKNOWN` for an
  unavailable/contradictory fact, preserve the exact evidence in
  `## Verification`, and change `## Current routing decision` and
  `## Next bounded action` in `current-state.md` so they do not claim the
  End-to-End proof is complete. Do not hide the failure by discarding files.

## Task 4: Align the executable routing contract after a reproduced failure

**Files:**

- Modify: `test/docs-links.test.ts`.
- Read: `docs/project/current-state.md` and the failing narrow-test output.
- Test: one targeted Node test, then `npm test`.

**Consumes:** The reproduced assertion for the removed `Branch and pull
request` heading and the approved durable-routing design.

**Produces:** A minimal test contract that rejects the former stale routing
shape and accepts the approved durable-routing shape.

- [ ] **Step 1: Replace only the obsolete heading assertions.**

  Use `apply_patch` in the first test of `test/docs-links.test.ts` to replace:

  ```typescript
  for (const heading of ["Branch and pull request", "Completed deliverable", "Validation", "Known limit", "Open stop", "Next bounded action"]) {
    assert.match(state, new RegExp("^## " + heading + "$", "m"));
  }
  ```

  with:

  ```typescript
  for (const heading of [
    "Live Git and pull-request guard",
    "Delivery evidence",
    "Current routing decision",
    "Limits",
    "Next bounded action",
  ]) {
    assert.match(state, new RegExp("^## " + heading + "$", "m"));
  }
  assert.match(state, /not a live Git or pull-request state record/i);
  assert.match(state, /V1 Completion Review|Complete the approved routing-contract correction/);
  assert.doesNotMatch(state, /^## Branch and pull request$/m);
  assert.doesNotMatch(state, /No real v1 proof has run yet:/i);
  ```

  This is a contract update, not a weakened test: the new positive assertions
  require the replacement routing model, and the negative assertions prevent
  restoration of the stale live-state model.

- [ ] **Step 2: Compile and run the exact failing test.**

  Run:

  ```powershell
  npm run build
  node --test --test-name-pattern="documentation entry points: provide the approved routing contract" dist/test/docs-links.test.js
  ```

  Expected: the single test passes. If it fails, preserve the exact assertion
  and return to root-cause investigation; do not alter unrelated tests.

- [ ] **Step 3: Rerun the full suite and final documentation checks.**

  Run:

  ```powershell
  npm test
  npm run check:docs
  git diff --check
  ```

  Expected: all commands exit `0`. Only after this result may the End-to-End
  handoff say `Status: COMPLETE` and the current routing decision point to V1
  Completion Review.

## Plan Self-Review

- **Spec coverage:** Task 1 locks current evidence and preserves historical
  proof semantics; Task 2 applies the durable-routing design and creates the
  handoff; Task 3 runs the required local checks, audits scope, and records a
  truthful final result; Task 4 keeps the executable documentation contract in
  sync with the approved routing model.
- **Completeness scan:** The plan has no incomplete marker or omitted command
  detail. The only temporary handoff text has an explicit replacement rule and
  failure-state contract.
- **Consistency:** The final changed-path set has five files, matching the
  accepted design. `current-state.md` never asserts a live `HEAD`, and the
  only post-success route is the separately approved V1 Completion Review.

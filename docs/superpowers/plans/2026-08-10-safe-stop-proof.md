# Safe Stop Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents without the user's explicit approval.

**Goal:** Run one real delivery-state-routing task that returns a review-ready
`STOPPED` or `UNKNOWN` result when the canonical routing source cannot safely
select the next roadmap slice.

**Architecture:** The proof reopens `docs/project/current-state.md`, captures a
fresh work-state preflight, and compares only source-labelled routing facts with
live repository facts. A deterministic conflict produces one local Markdown
handoff; missing or uncomparable evidence produces `UNKNOWN`. The proof never
repairs the routing source or selects a route from hidden context.

**Tech Stack:** Markdown, PowerShell, Git, npm, and the repository's
TypeScript-based documentation-link checker.

## Global Constraints

- Execute only the accepted design in
  `docs/superpowers/specs/2026-08-10-safe-stop-proof-design.md`.
- Read only until Task 3. Task 3 creates exactly one handoff and modifies no
  existing repository file.
- The routing source is exactly `docs/project/current-state.md`; do not use a
  conversation summary, an untracked artifact, or a guessed route as a source
  of current delivery state.
- The task may return only `STOPPED` or `UNKNOWN`; it must not select, start, or
  imply authorization for a roadmap route.
- Do not modify `docs/project/current-state.md`, stage, discard, commit, push,
  merge, create a pull request, invoke a connector, or make an external change.
- At execution start, the only expected review-state paths are the Plan Proof
  handoff directory, the Review/Test Proof plan and spec, and the Safe Stop
  Proof plan and spec. After Task 3, the Safe Stop Proof handoff directory is
  the only additional changed path.
- `git diff --check` does not cover an untracked handoff; Task 4 runs a direct
  target-specific `git diff --no-index --check` without staging.

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-10-safe-stop-proof-design.md` | Read | Accepted scope, result contract, and limits. |
| `docs/superpowers/plans/2026-08-10-safe-stop-proof.md` | Read | This execution contract; it is not changed during execution. |
| `docs/project/current-state.md` | Read | Sole canonical source for the bounded routing request. |
| `docs/project/roadmap.md` | Read | Roadmap 4 exit-evidence requirement; it is not used to invent a route. |
| `VISION.md` | Read | V1 proof boundary and non-overclaim rule. |
| `AGENTS.md` | Read | Authority and completion rules. |
| `docs/operations/agent-operating-model.md` | Read | Fresh-source verification and handoff requirements. |
| `package.json` | Read | Owner of the exact `check:docs` command. |
| `docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md` | Create | The sole new Safe Stop Proof artifact. |

## Task 1: Lock the bounded task and its evidence boundary

**Files:**

- Read: every existing path in the File Map.
- Modify: none.
- Test: live work-state preflight, changed-path audit, and exact routing-source
  existence.

**Consumes:** The accepted design and a current repository observation.

**Produces:** A complete `WORK_STATE` record, one fixed routing source, and a
read-only authority declaration for Tasks 1 and 2.

- [ ] **Step 1: Refresh the live repository state.**

  Run from the repository root:

  ```powershell
  & 'C:\\Users\\littl\\.agents\\tools\\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  ```

  Expected: repository identity, branch, `HEAD`, worktree, upstream, PR state,
  evidence source, and changed paths. If any required live-state field is
  absent or contradictory, preserve the output and return `UNKNOWN`; do not
  reuse a prior chat snapshot.

- [ ] **Step 2: Audit the starting changed-path boundary.**

  Run:

  ```powershell
  git status --short
  ```

  Expected paths before creating the handoff:

  ```text
  docs/planning/ai-booster-kit/standalone-plan-proof/
  docs/superpowers/plans/2026-08-10-standalone-review-test-proof.md
  docs/superpowers/specs/2026-08-10-standalone-review-test-proof-design.md
  docs/superpowers/plans/2026-08-10-safe-stop-proof.md
  docs/superpowers/specs/2026-08-10-safe-stop-proof-design.md
  ```

  If another path is present, return `STOPPED` with its exact path and the next
  action “clarify ownership or scope”; do not clean, stage, or discard it.

- [ ] **Step 3: Reopen the routing source and all controlling contracts.**

  Run:

  ```powershell
  $sources = @(
    'docs/project/current-state.md',
    'docs/project/roadmap.md',
    'VISION.md',
    'AGENTS.md',
    'docs/operations/agent-operating-model.md',
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

  Expected: all six paths are readable. A missing or unreadable source is
  `UNKNOWN`; do not replace it with another document.

## Task 2: Compare routing facts and classify the safe stop

**Files:**

- Read: `docs/project/current-state.md`, the fresh `WORK_STATE`, and the
  controlling contracts from Task 1.
- Modify: none.
- Test: explicit source-to-live comparison with named fields and reason code.

**Consumes:** The locked routing source and fresh live-state observation.

**Produces:** One factual classification and the evidence required for the
handoff.

- [ ] **Step 1: Extract the source and live facts without interpreting a route.**

  Run:

  ```powershell
  $routingSource = Get-Content -Raw -LiteralPath 'docs/project/current-state.md'
  $workState = (& 'C:\\Users\\littl\\.agents\\tools\\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown | Out-String)

  $sourceHead = [regex]::Match($routingSource, '(?m)^- HEAD: `([^`]+)`').Groups[1].Value
  $sourceWorktree = [regex]::Match($routingSource, '(?m)^- Worktree: ([^ ]+) at observation\.').Groups[1].Value
  $liveHead = [regex]::Match($workState, '(?m)^head: (.+)$').Groups[1].Value.Trim()
  $liveWorktree = [regex]::Match($workState, '(?m)^worktree: (.+)$').Groups[1].Value.Trim()

  if ([string]::IsNullOrWhiteSpace($sourceHead) -or
      [string]::IsNullOrWhiteSpace($sourceWorktree) -or
      [string]::IsNullOrWhiteSpace($liveHead) -or
      [string]::IsNullOrWhiteSpace($liveWorktree)) {
    throw 'UNKNOWN: A required delivery-state comparison field is missing or unreadable.'
  }

  [pscustomobject]@{
    SourceHead = $sourceHead
    SourceWorktree = $sourceWorktree
    LiveHead = $liveHead
    LiveWorktree = $liveWorktree
    SourceStatesNoProof = $routingSource -match '(?m)^No real v1 proof has run yet:'
    LiveWorkState = $workState
  } | ConvertTo-Json -Depth 3
  ```

  Expected: all four comparison values are present and source-labelled. If any
  is missing, preserve the safe output and classify `UNKNOWN`.

- [ ] **Step 2: Classify the observed condition with one visible reason code.**

  Run this self-contained comparison:

  ```powershell
  $routingSource = Get-Content -Raw -LiteralPath 'docs/project/current-state.md'
  $workState = (& 'C:\\Users\\littl\\.agents\\tools\\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown | Out-String)
  $sourceHead = [regex]::Match($routingSource, '(?m)^- HEAD: `([^`]+)`').Groups[1].Value
  $sourceWorktree = [regex]::Match($routingSource, '(?m)^- Worktree: ([^ ]+) at observation\.').Groups[1].Value
  $liveHead = [regex]::Match($workState, '(?m)^head: (.+)$').Groups[1].Value.Trim()
  $liveWorktree = [regex]::Match($workState, '(?m)^worktree: (.+)$').Groups[1].Value.Trim()

  if ([string]::IsNullOrWhiteSpace($sourceHead) -or
      [string]::IsNullOrWhiteSpace($sourceWorktree) -or
      [string]::IsNullOrWhiteSpace($liveHead) -or
      [string]::IsNullOrWhiteSpace($liveWorktree)) {
    throw 'UNKNOWN: A required delivery-state comparison field is missing or unreadable.'
  }

  $conflicts = [System.Collections.Generic.List[string]]::new()
  if ($sourceHead -ne $liveHead) {
    $conflicts.Add('DELIVERY_STATE_HEAD_CONFLICT')
  }
  if ($sourceWorktree -ne $liveWorktree) {
    $conflicts.Add('DELIVERY_STATE_WORKTREE_CONFLICT')
  }

  if ($conflicts.Count -eq 0) {
    $reasonCode = 'SAFE_STOP_PROOF_PREDICATE_ABSENT'
    $nextSafeAction = 'Separately approve normal delivery-state routing; this bounded Safe Stop Proof must not invent a stop.'
  } else {
    $reasonCode = $conflicts -join ','
    $nextSafeAction = 'Separately approve Current Delivery State Reconciliation; do not select a roadmap route before it is complete.'
  }

  [pscustomobject]@{
    Result = 'STOPPED'
    ReasonCode = $reasonCode
    SourceHead = $sourceHead
    SourceWorktree = $sourceWorktree
    LiveHead = $liveHead
    LiveWorktree = $liveWorktree
    NextSafeAction = $nextSafeAction
  } | ConvertTo-Json
  ```

  Expected for the currently observed conflict: `STOPPED` with
  `DELIVERY_STATE_HEAD_CONFLICT` and `DELIVERY_STATE_WORKTREE_CONFLICT`. A
  missing comparison value remains `UNKNOWN`; a resolved conflict remains a
  visible `STOPPED` because the selected proof predicate no longer exists and
  normal routing is out of scope.

- [ ] **Step 3: Record the exact evidence map for the handoff.**

  Reopen `docs/project/roadmap.md`, `VISION.md`, `AGENTS.md`, and the common
  operating model. Record these source-to-claim relationships in the handoff:

  | Claim | Source-labelled evidence |
  | --- | --- |
  | The task is a real standalone safe-stop proof | Roadmap item 4 requires a real task ending as `STOPPED` or `UNKNOWN`; `VISION.md` includes the same V1 proof gate. |
  | The source controls delivery routing | `docs/project/current-state.md` identifies itself as the sole operational routing source. |
  | The route cannot be safely selected | Source and live `HEAD`/worktree facts conflict; the operating model requires fresh authoritative facts and preservation of ambiguity. |
  | The result stays bounded | `AGENTS.md` requires a review-ready result or visible stop and forbids silent authority expansion. |

  Do not convert the source's stale route into a recommendation. If a required
  phrase or fact is absent, preserve that fact and classify `UNKNOWN`.

## Task 3: Create the Safe Stop Proof handoff

**Files:**

- Create: `docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md`.
- Modify: none.
- Test: exact target absence before creation and direct read-back after it.

**Consumes:** The Task 2 result and its exact, current source/live facts.

**Produces:** One local, review-ready `STOPPED` or `UNKNOWN` handoff.

- [ ] **Step 1: Confirm the handoff target is new and create its parent folders.**

  Run:

  ```powershell
  $handoff = 'docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md'
  if (Test-Path -LiteralPath $handoff) {
    throw "STOPPED: Safe Stop Proof handoff already exists: $handoff"
  }
  $handoffDirectory = Split-Path -Parent $handoff
  New-Item -ItemType Directory -Path $handoffDirectory -Force | Out-Null
  ```

  Expected: no existing handoff and one new local directory. If the target
  exists, stop and do not overwrite it.

- [ ] **Step 2: Create the handoff from observed Task 2 facts.**

  Use `apply_patch` to add the handoff. Copy the exact `SourceHead`,
  `SourceWorktree`, `LiveHead`, `LiveWorktree`, reason code, work-state facts,
  and source revision emitted by Tasks 1 and 2. Set `Status:` to the exact
  Task 2 `Result` and set `Source revision:` to its exact `LiveHead`. The
  finished file must use this heading structure:

  ```markdown
  # Safe Stop Handoff: Delivery-State Conflict

  Session: safe-stop-proof-delivery-state-conflict-2026-08-10
  Scope: One bounded delivery-state routing request.

  ## Bounded task

  ## Routing-source facts

  ## Live-state facts

  ## Stop decision

  ## Authority boundary

  ## Evidence and verification

  ## Limits

  ## Next safe action
  ```

  Under `Stop decision`, state the exact reason code and why no roadmap route
  was selected. Under `Authority boundary`, state that the proof did not modify
  `docs/project/current-state.md` or invoke Git/external actions. Under `Next
  safe action`, name only **Current Delivery State Reconciliation**, requiring
  separate approval.

- [ ] **Step 3: Read the generated handoff directly.**

  Run:

  ```powershell
  Get-Content -Raw -LiteralPath 'docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md'
  ```

  Expected: `Status` equal to the Task 2 result, all eight headings, exact
  observed facts, an explicit authority boundary, limits, and one safe next
  action. If content is incomplete or contradicts Task 2, return `STOPPED`
  without silently revising the observed evidence.

## Task 4: Verify the handoff and close the proof

**Files:**

- Read: the generated handoff, current contracts, `package.json`, and live
  work-state.
- Modify: none.
- Test: structural, documentation-link, whitespace, and no-mutation checks.

**Consumes:** The local handoff and all Task 1-3 evidence.

**Produces:** A reviewer-facing result that states `STOPPED` or `UNKNOWN`, its
reason, evidence boundary, and next safe action.

- [ ] **Step 1: Verify the handoff structure and classification.**

  Run:

  ```powershell
  $handoff = 'docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md'
  $contents = Get-Content -Raw -LiteralPath $handoff
  $requiredSections = @(
    '## Bounded task',
    '## Routing-source facts',
    '## Live-state facts',
    '## Stop decision',
    '## Authority boundary',
    '## Evidence and verification',
    '## Limits',
    '## Next safe action'
  )
  if ($contents -notmatch '(?m)^Status: (STOPPED|UNKNOWN)$') {
    throw 'STOPPED: Handoff has no valid safe-result status.'
  }
  foreach ($section in $requiredSections) {
    if (-not $contents.Contains($section)) {
      throw "STOPPED: Handoff is missing required section $section."
    }
  }
  $requiredSections
  ```

  Expected: one valid safe-result status and all eight headings. A missing
  section or invalid status is a deterministic `STOPPED` finding; do not add it
  during this verification task.

- [ ] **Step 2: Run the documentation-link and ordinary whitespace checks.**

  Run:

  ```powershell
  npm run check:docs
  git diff --check
  ```

  Expected: both commands exit `0`. If the checker cannot run, return
  `UNKNOWN`; if either command reports a reproducible documentation or
  whitespace failure, return `STOPPED` and preserve its output.

- [ ] **Step 3: Check the untracked handoff's whitespace without staging.**

  Run:

  ```powershell
  $handoff = 'docs/planning/ai-booster-kit/safe-stop-proof/roadmap-4/2026-08-10-delivery-state-conflict-handoff.md'
  $output = (& git diff --no-index --check -- NUL $handoff 2>&1 | Out-String)
  $exitCode = $LASTEXITCODE
  if ($output -match 'trailing whitespace|space before tab') {
    throw "STOPPED: Target-specific whitespace check found an error.`n$output"
  }
  if ($exitCode -notin @(0, 1)) {
    throw "UNKNOWN: Target-specific whitespace check ended with unexpected exit code $exitCode.`n$output"
  }
  [pscustomobject]@{ ExitCode = $exitCode; Output = $output }
  ```

  Expected: no whitespace-error text. Exit `1` is allowed because `--no-index`
  compares `NUL` with an existing file; any CRLF-normalization warning is a
  neutral environment fact, not a failure.

- [ ] **Step 4: Audit the final live state and hand off the result.**

  Run:

  ```powershell
  & 'C:\\Users\\littl\\.agents\\tools\\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  git status --short
  ```

  Expected final changed paths: the five initial review-state paths plus
  `docs/planning/ai-booster-kit/safe-stop-proof/`. If another path appears,
  return `STOPPED` and name it. The reviewer-facing result must name the
  bounded routing request, its exact `STOPPED` or `UNKNOWN` result, reason code
  and facts, evidence boundary, handoff path and revision, limits, and one
  separately approved next safe action.

  A `STOPPED` result is the intended proof outcome, not failure recovery and
  not permission to reconcile `current-state.md`.

## Plan Self-Review

- **Spec coverage:** Task 1 locks fresh sources and authority; Task 2 establishes
  the deterministic conflict or `UNKNOWN`; Task 3 creates only the local
  handoff; Task 4 verifies its contract, local checks, and final scope.
- **Placeholder scan:** The plan must contain no red-flag placeholders; dynamic
  handoff facts are explicitly copied from fresh Task 2 output rather than
  guessed or left in the artifact.
- **Consistency:** The only selected routing source is `current-state.md`; the
  only next safe action is separately approved Current Delivery State
  Reconciliation; no task alters the stale source or selects a roadmap route.

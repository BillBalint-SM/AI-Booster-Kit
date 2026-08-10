# Standalone Review/Test Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents without the user's explicit approval.

**Goal:** Run one independently invocable, read-only validation that proves the
Plan Proof handoff satisfies roadmap item 2 and returns a reviewer-facing
`PASS`, `STOPPED`, or `UNKNOWN` result.

**Architecture:** The validation consumes the accepted design, the untracked
Plan Proof handoff, and the canonical contracts. It first locks the current
repository state and evidence boundary, then maps roadmap item 2 to direct
artifact evidence, reproduces the declared local checks, and emits a compact
session-only verdict. No result is persisted by the validation itself.

**Tech Stack:** Markdown, PowerShell, Git, npm, and the repository's
TypeScript-based documentation-link checker.

## Global Constraints

- Execute only the accepted design in
  `docs/superpowers/specs/2026-08-10-standalone-review-test-proof-design.md`.
  A material divergence stops for renewed design approval.
- The validation is read-only. Do not create, edit, stage, discard, commit,
  push, merge, or publish any file; do not invoke connectors or external
  systems.
- The target is exactly
  `docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md`.
  The design and this plan are supporting review-state documents, not validation
  targets.
- Expected working-tree changes before execution are only the Plan Proof
  handoff, this accepted design and plan, plus the completed Safe Stop Proof
  handoff, design, and plan. Any other changed path stops the run as `STOPPED`
  until its owner or scope is clarified.
- The only final result states are `PASS`, `STOPPED`, and `UNKNOWN`. `PASS`
  never means V1 completion, runtime execution, host security, host behavior,
  connector capability, external action, or publication.
- `git diff --check` does not cover an untracked target. Run the direct
  `git diff --no-index --check` command in Task 3 and interpret its exit code
  as stated there.

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-10-standalone-review-test-proof-design.md` | Read | Accepted scope, evidence boundary, verdict semantics, and limits. |
| `docs/superpowers/plans/2026-08-10-standalone-review-test-proof.md` | Read | This execution contract; it is not changed during the validation. |
| `docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md` | Read | The sole validation target. |
| `VISION.md` | Read | V1 proof boundary and non-overclaim rule. |
| `DOMAIN.md` | Read | Independently callable module and evidence invariants. |
| `CONTEXT.md` | Read | Canonical meanings of evidence, review-ready result, `STOPPED`, and `UNKNOWN`. |
| `AGENTS.md` | Read | Repository authority and completion rules. |
| `docs/operations/agent-operating-model.md` | Read | Independent verification and handoff requirements. |
| `docs/project/roadmap.md` | Read | Roadmap item 2 exit-evidence requirement. |
| `package.json` | Read | Exact `check:docs` command owner. |

The validation modifies no repository file. Its only output is the
reviewer-facing session result in Task 4.

## Task 1: Lock the target and authority boundary

**Files:**

- Read: every path in the File Map.
- Modify: none.
- Test: repository work-state preflight and target existence.

**Consumes:** The accepted design and a cleanly observable repository state.

**Produces:** A current-state record, an explicit target path, and a bounded
read-only authority declaration for the remaining tasks.

- [ ] **Step 1: Refresh the live repository state.**

  Run from the repository root:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  ```

  Expected: repository identity, `main`, `HEAD`, upstream, and PR state are
  present. Preserve the full `WORK_STATE` block as evidence. If repository,
  branch, `HEAD`, worktree, upstream, or PR status is missing or contradictory,
  return `STOPPED`; do not choose a value from prior chat context.

- [ ] **Step 2: Verify the exact changed-path boundary.**

  Run:

  ```powershell
  git status --short
  ```

  Expected: only the six paths below are untracked or otherwise changed:

  ```text
  docs/planning/ai-booster-kit/standalone-plan-proof/
  docs/superpowers/specs/2026-08-10-standalone-review-test-proof-design.md
  docs/superpowers/plans/2026-08-10-standalone-review-test-proof.md
  docs/planning/ai-booster-kit/safe-stop-proof/
  docs/superpowers/specs/2026-08-10-safe-stop-proof-design.md
  docs/superpowers/plans/2026-08-10-safe-stop-proof.md
  ```

  If another path is present, return `STOPPED` with the exact unexpected path
  and the next action “clarify ownership or scope”; do not clean, stage, or
  discard it.

- [ ] **Step 3: Verify that the target is a regular readable file.**

  Run:

  ```powershell
  $target = 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    throw "STOPPED: Plan Proof target is not a readable file at the declared path."
  }
  Get-Item -LiteralPath $target | Select-Object FullName, Length, LastWriteTimeUtc
  ```

  Expected: one existing file. If it is missing, a directory, or unreadable,
  return `STOPPED`; do not locate a substitute target.

## Task 2: Build the roadmap-2 evidence map

**Files:**

- Read: the target handoff, `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, `AGENTS.md`,
  `docs/operations/agent-operating-model.md`, `docs/project/roadmap.md`, and
  `package.json`.
- Modify: none.
- Test: exact header, source-revision, and required-section checks.

**Consumes:** The locked target from Task 1 and the current `HEAD`.

**Produces:** Four explicit criterion-to-evidence records and the structural
precondition for local command checks.

- [ ] **Step 1: Read the target and compare its source revision to the live base.**

  Run:

  ```powershell
  $target = 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  $handoff = Get-Content -Raw -LiteralPath $target
  $head = (git rev-parse HEAD).Trim()
  if ($handoff -notmatch '(?m)^Status: COMPLETE$') {
    throw 'STOPPED: Target does not declare Status: COMPLETE.'
  }
  if ($handoff -notmatch ('(?m)^Source revision: ' + [regex]::Escape($head) + '$')) {
    throw "STOPPED: Target source revision does not match current HEAD $head."
  }
  $handoff
  ```

  Expected: `Status: COMPLETE` and a source revision exactly matching the live
  `HEAD`. A mismatch is deterministic negative evidence: return `STOPPED` with
  the observed values; do not rewrite the target or revise the expected base.

- [ ] **Step 2: Check every required handoff section.**

  Run:

  ```powershell
  $target = 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  $requiredSections = @(
    '## Shared understanding',
    '## Original brief',
    '## Decision tree result',
    '## Acceptance and evidence',
    '## Unknowns, risks, and dependencies',
    '## Open decision frontier',
    '## Final confirmation',
    '## Next bounded action'
  )
  $handoff = Get-Content -Raw -LiteralPath $target
  foreach ($section in $requiredSections) {
    if (-not $handoff.Contains($section)) {
      throw "STOPPED: Target is missing required section $section."
    }
  }
  $requiredSections
  ```

  Expected: all eight section names are emitted. A missing section returns
  `STOPPED`; do not add it during this read-only validation.

- [ ] **Step 3: Map roadmap item 2 to direct evidence.**

  Reopen `docs/project/roadmap.md` and record this map in the session result:

  | Roadmap 2 requirement | Direct evidence in target |
  | --- | --- |
  | One real standalone planning module | `Original brief` records explicit `$planning-show`; `Decision tree result` item `D1` names the independently invoked module. |
  | Fresh-reviewable plan | `Shared understanding`, `Decision tree result`, `Rejected interpretations`, and `Next bounded action` make the plan inspectable without a hidden transcript. |
  | Acceptance boundary | `Acceptance and evidence` lists the exact artifact, content, authority, and check requirements. |
  | Stated verification approach | `Decision tree result` item `D5` and `Acceptance and evidence` declare read-back, `npm run check:docs`, and `git diff --check`. |

  If a listed target phrase is absent, return `STOPPED` and name the failed
  requirement. Do not infer coverage from a similarly named section.

## Task 3: Reproduce the declared local checks

**Files:**

- Read: target handoff and `package.json`.
- Modify: none.
- Test: documentation links and whitespace checks.

**Consumes:** A structurally valid target and its evidence map.

**Produces:** Command-level evidence with explicit exit-code interpretation.

- [ ] **Step 1: Run the repository documentation-link check.**

  Run:

  ```powershell
  npm run check:docs
  ```

  Expected: exit code `0`. Any non-zero exit code returns `UNKNOWN` when the
  checker cannot run and `STOPPED` when it reports a reproducible documentation
  failure; preserve the complete safe command output in the session result.

- [ ] **Step 2: Run the ordinary tracked-diff whitespace check.**

  Run:

  ```powershell
  git diff --check
  ```

  Expected: exit code `0` with no whitespace error. Record that this only
  covers tracked diff content and cannot by itself verify the untracked target.
  If Git cannot run, return `UNKNOWN`. If it reports a whitespace error, return
  `STOPPED` and preserve the affected path; do not fix it.

- [ ] **Step 3: Run a target-specific untracked whitespace check without staging.**

  Run:

  ```powershell
  $target = 'docs/planning/ai-booster-kit/standalone-plan-proof/roadmap-2/2026-08-10-planning-show-handoff.md'
  $output = (& git diff --no-index --check -- NUL $target 2>&1 | Out-String)
  $exitCode = $LASTEXITCODE
  if ($output -match 'trailing whitespace|space before tab') {
    throw "STOPPED: Target-specific whitespace check found an error.`n$output"
  }
  if ($exitCode -notin @(0, 1)) {
    throw "UNKNOWN: Target-specific whitespace check ended with unexpected exit code $exitCode.`n$output"
  }
  [pscustomobject]@{ ExitCode = $exitCode; Output = $output }
  ```

  Expected: no whitespace-error text. Exit code `1` is allowed because
  `--no-index` reports a content difference between `NUL` and an existing file;
  record any CRLF-normalization warning as a neutral environment fact, not a
  failure.

## Task 4: Classify the result and hand off review evidence

**Files:**

- Read: all evidence produced by Tasks 1 through 3.
- Modify: none.
- Test: result state obeys the accepted verdict semantics.

**Consumes:** The current-state record, evidence map, target read-back, and
command-level check results.

**Produces:** A reviewer-facing session result with one safe next action.

- [ ] **Step 1: Classify the bounded result without repairing any finding.**

  Use this exact decision rule:

  ```text
  PASS     every Task 1-3 condition and declared command check has expected evidence
  STOPPED  target is missing, a required section/revision/criterion fails, or any next step needs a write or broader authority
  UNKNOWN  a required source or command cannot be read or run, or material evidence conflicts
  ```

  Do not return `FAIL`, `READY`, or an implicit success state. A deterministic
  mismatch remains `STOPPED`; an unavailable or contradictory fact remains
  `UNKNOWN`.

- [ ] **Step 2: Emit the reviewer-facing result in this exact shape.**

  ```markdown
  ## Standalone Review/Test Proof Result

  Claim: <the exact validated claim>
  Target: <target path>
  Target revision: <live HEAD>
  Result: PASS | STOPPED | UNKNOWN

  ### Criterion-to-evidence map
  | Criterion | Evidence | Observation |
  | --- | --- | --- |
  | Standalone planning module | <source-labelled fact> | <observation> |
  | Reviewable plan | <source-labelled fact> | <observation> |
  | Acceptance boundary | <source-labelled fact> | <observation> |
  | Verification approach | <source-labelled fact and check output> | <observation> |

  ### Executed checks
  <command, exit interpretation, and safe output summary for each check>

  ### Limits and residual risks
  <limits that remain unproven>

  ### Next bounded action
  <one action appropriate to the result>
  ```

  For `PASS`, the next action is: “A human or independent reviewer may accept
  this session result as evidence for roadmap item 3; do not infer V1
  completion.” For `STOPPED` or `UNKNOWN`, name the exact failed/unknown fact
  and the smallest authority-safe action that could resolve it.

- [ ] **Step 3: Close with live state and a no-mutation audit.**

  Run:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  git status --short
  ```

  Expected: the repository still has only the six review-state paths listed
  in Global Constraints. Report the fresh branch, `HEAD`, worktree, upstream,
  PR state, evidence source, and changed-path list. If a new unexpected path
  appears, append it to the result as a scope finding and return `STOPPED`.

## Plan Self-Review

- **Spec coverage:** Task 1 locks read-only authority and live state; Task 2
  covers the explicit claim and roadmap 2 requirements; Task 3 covers all three
  declared checks and their exit semantics; Task 4 supplies the result contract,
  stop behavior, limits, and next action.
- **Placeholder scan:** The red-flag scan returns no finding; every task names
  its inputs, command, expected evidence, and stop behavior.
- **Consistency:** The result state is always `PASS`, `STOPPED`, or `UNKNOWN`.
  The target remains the Plan Proof handoff; no task changes it or creates a
  persisted validation result.

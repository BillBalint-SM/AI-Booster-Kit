# Minimal GitHub Flow Summary — task queue

Status: `PP-03_DONE`; `PP-04_READY_FOR_USER_DECISION`

User acceptance of this queue: `RECORDED_2026-08-21`

Implementation authority: `PP-01_LOCAL_COMPLETED`; `PP-02_LOCAL_COMPLETED`; `PP-03_GITHUB_RUN_AND_TWO_SUB_AGENT_REVIEWERS_GRANTED_2026-08-21`

External GitHub run or reviewer coordination: `GRANTED_2026-08-21` for branch
`codex/flow-summary-experiment`, two atomic commits over the declared 13 files,
push, one `main`-targeted draft pull request, CI observation, and two independent
sub-agent reviewers. The `business-decision-technical-handoff` directory is
explicitly excluded.

## Initial planning task — completed historical boundary

- **Scope:** turn the Ponytail audit into one dependency-ordered local queue.
- **Acceptance:** progress, exact behavior, allowed files, checks, boundaries,
  and stop conditions are visible for every active task.
- **Evidence boundary:** repository inspection and the linked research only; no
  GitHub UI behavior or external demand has been verified.
- **Stop:** finish this queue and its local documentation checks. Do not start
  product implementation or an external action.
- **Verification:** `npm run check:docs`, diff review, and worktree review.

This boundary governed creation of the queue. The later exact implementation,
GitHub publication, CI-observation, and reviewer grants are recorded above and
do not retroactively widen that planning-only task.

This file is the execution queue for the experiment. The longer
[experiment brief](2026-08-21-proof-pack-github-experiment-brief.md) and
[feature research](../../../../research/2026-08-21-ai-booster-kit-github-feature-opportunities.md)
are context, not implementation authority. “Proof Pack” remains a hypothesis
name; this queue introduces no new product contract or domain object.

## Progress

| ID | State | Dependency or result |
| --- | --- | --- |
| PP-00 | `DONE` | Existing capability and the one missing surface are identified. |
| PP-01 | `DONE` | Build, 17 focused tests, docs check, and self-review passed. |
| PP-02 | `DONE` | YAML, Bash syntax, local summary simulation, and security-surface review passed. |
| PP-03 | `DONE` | Draft PR #58 CI, rendered Job Summary, and two independent reviewer readbacks passed. |
| PP-04 | `READY_FOR_USER_DECISION` | PP-03 passed; one shared wording note is available for the User's decision. |

An Agent takes only the first unblocked task. It changes that task to
`IN_PROGRESS`, performs only its allowed scope, records command-backed evidence,
then sets `DONE`, `STOPPED`, or `UNKNOWN`. Checking a box without named evidence
does not complete a task.

## PP-00 — Reuse the existing Flow contract

State: `DONE`

Outcome: the experiment extends the existing `FlowAssuranceReport`; it does not
create a Proof Pack schema, receipt, verifier, Handoff, or runtime.

Evidence:

- [Flow composition](../../../../src/flow/compose.ts) already declares
  acceptance criteria, evidence requirements, and fresh-readback needs.
- [Flow assurance](../../../../src/flow/assurance.ts) already supplies Package
  Identity, receipt/checkpoint binding, Stage state, blockers, unknowns, limits,
  and the next bounded action through `FlowAssuranceReport`.
- [The current CLI](../../../../src/cli.ts) already exposes `assess-flow` as a
  pure JSON projection through `runAssessFlow`.
- [Existing tests](../../../../test/flow-assurance.test.ts) already cover
  complete, waiting, unknown, stale, foreign, and incomplete-evidence states.

Acceptance:

- [x] The existing contract is the single source of truth.
- [x] The missing product surface is a safe human-readable projection.
- [x] No new schema, persistence layer, repository readback, or Agent runtime is
  required for the first test.

## PP-01 — Add deterministic Markdown output to `assess-flow`

State: `DONE`

Depends on: PP-00 and recorded User acceptance of this queue.

Outcome: this command works while the existing JSON command remains unchanged:

```powershell
node dist/cli.js assess-flow --input <assessment.json> --format markdown
```

Allowed product files:

- `src/flow/assurance.ts`
- `src/cli.ts`
- `test/flow-assurance.test.ts`
- `test/flow-cli.test.ts`
- `examples/flow/assess-foreign-receipt.json` — the only new fixture
- `docs/handbook/cli-reference.md`

`TASKS.md` may change only for status and evidence recording.

Required behavior:

- Export a pure `renderFlowAssuranceMarkdown(report)` from the existing Flow
  assurance module. It receives the assessed report, never raw input.
- Emit a fixed-order, bullet-based summary containing:
  `INFORMATIONAL — HUMAN DECISION REQUIRED`, status, Package Identity,
  authority, execution flag, Stage states, Checkpoint states, blocker codes,
  Handoff readiness and evidence/artifact counts, explicit unknowns/limits/stop
  reasons, and the next action.
- HTML-escape free text before rendering. Render only assessed fields; keep
  objective text, prompts, transcripts, absolute paths, and raw input out of
  the summary.
- Accept only the existing `--input <path>` form or that form followed by
  `--format markdown`. JSON remains the default. An unknown format returns the
  existing configuration failure and exit code `4`.
- Preserve the current status exit codes in both formats: ready/complete `0`,
  waiting/stopped/unknown `2`, malformed JSON or assessment `3`, and unreadable
  paths or invalid command arguments `4`.
- Document the optional format in the existing CLI reference.

Acceptance:

- [x] The same assessed value renders byte-identical Markdown twice.
- [x] `assess-complete.json` visibly reports `COMPLETE`, evidence counts, and
  `PRESENT_HANDOFF_FOR_USER_ACCEPTANCE`.
- [x] `assess-after-plan.json` visibly reports `WAITING_FOR_APPROVAL`, the
  pending Checkpoint, and `RECORD_CHECKPOINT:USER_ACCEPTS_PLAN`.
- [x] `assess-foreign-receipt.json` visibly reports `STOPPED`,
  `RECEIPT_PACKAGE_MISMATCH`, and `RECOMPOSE_AND_REISSUE_RECEIPT`.
- [x] The no-format command still emits parseable JSON with unchanged meaning
  and exit codes.
- [x] Malformed arguments fail closed; every rendered free-text field is
  HTML-escaped.

Verification:

```powershell
npm run build
node --test --test-concurrency=1 dist/test/flow-assurance.test.js dist/test/flow-cli.test.js
npm run check:docs
```

Stop condition: return `STOPPED` with evidence if this requires a new schema,
dependency, persistence, repository readback, command alias, or compatibility
promise. The smallest safe projection is the deliverable.

Evidence:

- `npm run build` — `PASS`.
- `node --test --test-concurrency=1 dist/test/flow-assurance.test.js
  dist/test/flow-cli.test.js` — `PASS`, 17/17 tests.
- `npm run check:docs` — `PASS`.
- Manual CLI readback — complete exit `0`; waiting and foreign receipt exit
  `2`; default complete output remains parseable JSON with the same Package
  Identity, status, execution flag, and next action.
- Self-review — diff/whitespace check and the foreign fixture JSON parse passed;
  no dependency, schema, persistence, command alias, or external action was
  added. Three sibling handbook statements were narrowed from “JSON only” to
  the now-accurate stdout-rendering boundary.

## PP-02 — Append the three reference summaries to the existing GitHub job

State: `DONE`

Depends on: PP-01 `DONE`.

Outcome: one existing Ubuntu/Node 24 CI matrix job appends the complete,
waiting, and foreign-receipt reference outputs to `$GITHUB_STEP_SUMMARY`.
The summaries are labelled reference cases, not evidence about the current PR.

Allowed product file: `.github/workflows/ci.yml`.

Required behavior:

- Add one step after the existing build in the existing `execution` job,
  limited to `ubuntu-latest` and Node 24.
- Append the three PP-01 fixture outputs. Treat exit `2` as the expected result
  for waiting and foreign cases; propagate every other unexpected exit.
- Keep the current `permissions: contents: read`, existing events, jobs, and
  Actions. The step uses no secret and performs no write except GitHub's native
  Job Summary file.

Acceptance:

- [x] CI YAML parses locally.
- [x] The complete, waiting, and foreign headings each receive one summary.
- [x] No new permission, secret, Action, artifact upload, job, event, or check
  policy appears in the diff.
- [x] Local verification passes; GitHub rendering remains `UNKNOWN` until an
  exactly approved external run is observed.

Verification:

```powershell
npm run build
node dist/cli.js assess-flow --input examples/flow/assess-complete.json --format markdown
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; parse(readFileSync('.github/workflows/ci.yml', 'utf8'));"
```

Stop condition: return `STOPPED` if the summary needs write permission,
`pull_request_target`, a secret, a third-party Action, a separate Action
repository, or suppressed exit failures.

Evidence:

- `npm run build` — `PASS`.
- Existing `yaml` parser plus explicit workflow assertions — `PASS`: the job
  set, `pull_request`/`push` events, and `contents: read` permission are
  unchanged; the new step follows the build and is limited to Ubuntu/Node 24.
- Exact extracted run block through `bash -n` — `PASS`.
- In-memory local summary simulation — `PASS`; complete/waiting/foreign receipt
  exits are `0/2/2`, all three headings contain their expected projection, and
  the combined SHA-256 is
  `2f1ee2bf61e054411456df49b4e965b5c4dc74c5e3cf46e679c3858f2cbd4bf9`.
- Diff/security review — `PASS`: no secret, new Action, artifact upload, job,
  event, permission, `pull_request_target`, `continue-on-error`, or external
  action was added.
- GitHub Job Summary rendering — `UNKNOWN`; no workflow was committed, pushed,
  or run on GitHub.

## PP-03 — Dogfood three decisions with the owner and two reviewers

State: `DONE`

Depends on: PP-02 `DONE`; the User granted the exact GitHub run and two
independent sub-agent reviewer authority on 2026-08-21.

Outcome: two reviewers inspect the same three Job Summary cases and answer only:

1. What is the current status?
2. What evidence or decision is missing?
3. What is the next safe action?

Acceptance:

- [x] Repeated local rendering is byte-identical for all three cases.
- [x] Both reviewers answer all three questions correctly for all three cases.
- [x] Neither reviewer interprets the informational summary as change approval.
- [x] The run uses `contents: read`, no secret, and no external write beyond the
  native Job Summary.
- [x] Results and one optional usability note per reviewer are recorded below;
  no interview program or telemetry system is created.

Stop condition: mark `STOPPED` on any unsafe pass, permission expansion, secret
exposure, or persistent approval confusion. Mark `UNKNOWN` if the GitHub run or
reviewer evidence cannot be obtained within the granted authority.

Evidence:

- Draft pull request
  [#58](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/58) targets
  `main` from `codex/flow-summary-experiment` and remained a draft. The
  observed feature revision was
  `d1649e459b6067b721270ea86218d590501c0f44`.
- Pull-request run
  [32520815426](https://github.com/BillBalint-SM/AI-Booster-Kit/actions/runs/32520815426)
  completed `success`; all six reported checks passed. The summary-producing
  job
  [96892380286](https://github.com/BillBalint-SM/AI-Booster-Kit/actions/runs/32520815426/job/96892380286)
  was `execution (ubuntu-latest, 24, AUTHORITATIVE)`, completed `success`, and
  its summary step completed `success`.
- Signed-in GitHub UI readback displayed the native Job Summary with all three
  headings and assessed fields. The GitHub API independently bound the run and
  job to the exact feature revision; the API does not expose the rendered
  summary body.
- Exact local workflow-block execution repeated byte-identically with expected
  exits `0/2/2`; the repeated combined output SHA-256 was
  `febf25b8dd1b6cb8850e539523929ac212ce35490356d047e681dfbb775f69ca`.
  The earlier PP-02 hash names its in-memory composition; this hash names the
  literal Bash block including its `printf` newline boundaries. Neither is a
  claim that GitHub exposes the rendered summary bytes for hash comparison.
- Reviewer A: `COMPLETE` → final Handoff user acceptance →
  `PRESENT_HANDOFF_FOR_USER_ACCEPTANCE`; `WAITING_FOR_APPROVAL` → pending
  `USER_ACCEPTS_PLAN` → `RECORD_CHECKPOINT:USER_ACCEPTS_PLAN`; `STOPPED` →
  `RECEIPT_PACKAGE_MISMATCH` → `RECOMPOSE_AND_REISSUE_RECEIPT`. Reviewer A
  found no approval or execution grant.
- Reviewer B independently returned the same three status, missing-decision or
  evidence, and next-action readings, and found no approval or execution grant.
- Both reviewers cited `INFORMATIONAL — HUMAN DECISION REQUIRED`,
  `RECOMMENDATION_ONLY`, and `Execution performed: false`. Each supplied the
  same optional usability note: distinguish plan acceptance from final Handoff
  acceptance more explicitly in the complete case's next-action wording.
- Workflow readback retained `permissions: contents: read`; no secret, new
  Action, artifact upload, additional event/job, `pull_request_target`, PR
  comment, required check, or merge was added.

Limit: this proves the three synthetic cases in one same-repository draft PR.
It does not test a fork, downloadable artifact, annotation, customer demand,
review-time improvement, public Action reuse, Marketplace behavior, or merge
policy.

## PP-04 — Decide: `STOP`, `ITERATE`, or `PROMOTE`

State: `READY_FOR_USER_DECISION`

Depends on: PP-03 terminal evidence.

Outcome: record one decision in this file with the supporting PP-03 evidence
and one next bounded action.

- `PROMOTE` only if output is deterministic, both reviewers correctly read all
  three cases, and the GitHub path needs no added authority.
- `ITERATE` only for one observed wording or layout defect; open one bounded
  follow-up task for that defect.
- `STOP` when the summary adds no reviewer value or requires permission,
  infrastructure, or product scope beyond this queue.

Acceptance:

- [ ] Decision, evidence, limits, and next action are recorded.
- [ ] A promotion remains a User decision and does not imply publication,
  release, Marketplace, required-check, or external repository authority.

Evidence: `PENDING`

## Parked triggers — not tasks

| Candidate | Create a task only when |
| --- | --- |
| Public Proof Pack schema | A second independent consumer cannot use the existing Flow JSON. |
| `booster verify` alias | Users repeatedly fail to discover `assess-flow`. |
| Standalone/reusable GitHub Action | Two external repositories repeat the same workflow step. |
| Artifact upload | A reviewer needs a downloadable audit artifact rather than the Job Summary. |
| Cross-host work | A second host produces an observed contract divergence. |
| Interviews, telemetry, or broad metrics | The three-person dogfood is genuinely ambiguous. |
| Marketplace, required check, SARIF, attestations | A separately accepted product decision supplies evidence and exact authority. |

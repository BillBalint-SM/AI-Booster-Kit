# Codex-native multi-agent reference run

## Purpose and non-goals

This runbook operates the first read-only, Personal-only comparison between a
strong single-agent control and a Codex-native multi-agent pipeline. The
[runtime design](../superpowers/specs/2026-08-07-codex-native-multi-agent-runtime-design.md),
[Kernel plan](../superpowers/plans/2026-08-07-agent-agnostic-execution-contract-kernel.md),
and [reference-run plan](../superpowers/plans/2026-08-07-codex-native-multi-agent-reference-run.md)
are canonical for contracts, limits, and acceptance criteria.

This is not a model API integration, host-security certification, cross-host
comparison, write-capable workflow, or cross-session resume proof.

## Prerequisites and green checks

The Kernel commands are `prepare-execution`, `prepare-execution-node`,
`record-execution-dispatch`, `accept-execution-result`,
`reject-execution-result`, `propose-execution-repair`, `stop-execution`,
`check-execution-resume`, `finalize-execution`, and
`compare-execution-runs`. The preparation command is:

```powershell
node scripts/create-codex-native-reference-preparation.mjs --mode MULTI_AGENT --run-id <run-id> --source-revision <sha> --repository-locator 'AI Booster Kit'
```

Before a live run, `npm run lint`, `npm run build`, `npm test`,
`npm run check:docs`, and `git diff --check` must pass. The active Node
runtime must report a stable semantic version.

## Immutable source gate

Both runs use the same committed source revision, scope, authority, criteria,
and required evidence kinds. The audited source paths must be clean after that
commit. A changed revision, dirty audited path, or ambiguous worktree stops the
run; a working-tree hash is not a substitute for the committed revision.

## Personal-root gate

Canonical artifacts are created only below the explicit user-local Personal
root `%LOCALAPPDATA%\AI Booster Kit\execution-runs`. The Kernel validates path
containment and non-symlink constraints. A pre-existing target run directory or
missing authorized parent stops the run.

## Single-agent control sequence

Prepare a `SINGLE_AGENT` run, prepare and dispatch its `synthesis` node with
the thread reference `main`, and execute the bounded audit in the main Codex
task. Admit the exact Result Envelope, finalize the run, then read back its
checkpoint and final-handoff hashes. The control dispatches no subagents, and
its substantive findings are not passed to the multi-agent workers.

## Multi-agent pipeline sequence

Prepare a `MULTI_AGENT` run, then prepare the independent `audit-controller`
and `audit-context` nodes. The main task performs exactly two parallel native
Codex dispatches, records their returned agent IDs, and admits each unchanged
Result Envelope separately. Only accepted artifacts are supplied to the
checker. The checker runs once. It may request at most one same-scope repair;
the main task admits that repair through `propose-execution-repair` or records
the stop/limit. Finally, the main task prepares, dispatches, admits, and
finalizes the `synthesis` node from accepted context only.

Codex collaboration operations are host actions performed by the main task,
not repository functions. No worker may spawn another agent.

## Result Envelope-only rule

Every worker and checker response is one Result Envelope JSON object and no
surrounding prose. The main task pipes it unchanged to
`accept-execution-result`. If validation rejects that object, the main task
must call `reject-execution-result` with the exact returned allowlisted error
code and the dispatched node and task identity. The Kernel then records one
`NODE_RESULT_REJECTED` event, transitions that node to `REJECTED`, records the
matching terminal run event, and stores no raw response or result artifact. A
malformed, foreign, stale, oversized, or rejected object stops the affected
run; it is never edited into compliance.

## Dispatch and spawn failures

If a native spawn fails, returns no agent ID, or its dispatch cannot be
recorded, interrupt every known active worker and call `stop-execution` once
with the exact allowlisted failure code. Do not spawn a replacement. A timeout
or unknown thread identity is preserved as `UNKNOWN`; it is not retried or
promoted to success.

## Resume decision boundary

`check-execution-resume` reconstructs same-session state from the Personal
ledger and supplied runtime references. Terminal runs are not active work.
Cross-session resume remains `NOT_EXECUTED` and this runbook never treats a
new Codex session as proof that prior threads are available.

## Comparison procedure

Run `compare-execution-runs` only after both terminal runs use the same
comparison identity. Report supported claims, conflicts, unknowns, unique
accepted evidence, dispatches, repairs, and measured metrics only when both
runs contain them. State one bounded conclusion for this run:
`MULTI_AGENT_BETTER_FOR_THIS_RUN`, `NO_MATERIAL_GAIN`,
`SINGLE_AGENT_BETTER_FOR_THIS_RUN`, or `INCONCLUSIVE`.

## TEAM-promotion allowlist

Only a separately approved normalized receipt may enter repository history. It
may include the committed source revision, normalized agent references, event
and artifact hashes, accepted claim-to-evidence mappings, final states,
comparison metrics, limits, and verification commands. It must exclude prompts,
transcripts, hidden reasoning, raw collaboration messages, arbitrary Personal
paths, credentials, account data, and external URLs.

## Limitations

This run uses no external model, no model API, no connector, no external read
or write, no write-capable agent, and no cross-host claim. It does not prove
Codex sandbox enforcement, cross-session conformance, or production workflow
reliability.

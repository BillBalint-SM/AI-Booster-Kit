# Task 7 brief — Rovo read-only host comparison and scope-boundary stop

## Objective

Compare only the evidence that can be safely established for Codex, Cursor, and Claude Code under the approved Write-blocked Rovo policy. Use the fixed `G2AS-1` retrieval prompt and stop immediately on any target, scope, or authorization deviation. No Jira, Confluence, GitHub, Rovo, identity, or integration write is authorized in this task.

## Fixed retrieval contract

```text
Retrieve only the accepted context for G2AS-1. Return the Jira key, summary, all acceptance criteria, immutable Git revision, and any Confluence projection reference. If any source is missing, unauthorized, stale, ambiguous, or unavailable, stop and classify the failure. Do not create, edit, transition, comment, link, or summarize unrelated content.
```

## Safety incident and boundary

- A Codex-side Atlassian Rovo search was attempted as read-only for the fixed `G2AS-1` prompt.
- The exposed search surface did not accept a target cloud parameter and returned unrelated results from a different Atlassian cloud rather than the approved PTE/G2AS sandbox.
- The unrelated content is not copied, summarized, stored, or used as evidence. The returned cloud identifier and content are deliberately redacted from the local record.
- The Rovo path is therefore `SCOPE_VIOLATION_STOP` and rejected for promotion. No write was performed, no retry or alternate identity was used, and no additional Rovo call is allowed in this task.
- PTE Rovo status remains `user-attested, connector-unverified`; the earlier PTE resource request was rejected before query execution.

## Host comparison policy

- Codex: record only the failed/blocked outcome above; do not claim PTE context retrieval.
- Cursor: `NOT AVAILABLE` in this execution environment; no connection or query performed.
- Claude Code: `NOT AVAILABLE` in this execution environment; no connection or query performed.
- Direct REST baseline remains separately recorded as `BLOCKED/NOT EXECUTED` because OAuth setup is blocked by browser runtime `EPERM`.

## Required local changes

1. Append sanitized Task 7 rows to `docs/gate-2/g2ai-pilot-evidence.md`, including the scope-violation stop and host availability outcomes without unrelated content or account identifiers.
2. Append a Task 7 completion line to `progress.md` with `DONE_WITH_CONCERNS`/rejected-promotion status.
3. Create `task-7-report.md` with the fixed prompt, host matrix, incident classification, no-write/no-retry boundary, and no-secret result.
4. Run `git diff --check` for tracked changes plus explicit checks for untracked files, and run a focused secret-pattern scan. Do not commit or push.

## Acceptance criteria

- No unrelated external content is propagated into the project record.
- Codex, Cursor, and Claude Code outcomes are distinguished as scope-violation stop vs unavailable, never inferred as successful retrieval.
- No Rovo write, retry, alternate identity, or permission broadening occurs.
- Evidence names the PTE/G2AS target boundary, the connector-unverified limitation, and the exact promotion stop.

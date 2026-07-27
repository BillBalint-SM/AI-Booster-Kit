# Task 7 report — Rovo host comparison and scope-boundary stop

## Fixed prompt

```text
Retrieve only the accepted context for G2AS-1. Return the Jira key, summary, all acceptance criteria, immutable Git revision, and any Confluence projection reference. If any source is missing, unauthorized, stale, ambiguous, or unavailable, stop and classify the failure. Do not create, edit, transition, comment, link, or summarize unrelated content.
```

## Host matrix

| Host | Result | Evidence and decision |
| --- | --- | --- |
| Codex | `SCOPE_VIOLATION_STOP` | The connector search surface did not honor the approved PTE/G2AS target boundary and returned unrelated results from another Atlassian cloud. The returned content and cloud/account identifier were not stored, summarized, or reused. No retry or alternate identity was attempted. |
| Cursor | `NOT AVAILABLE` | Cursor is not connected in this execution environment; no query or source access was attempted. |
| Claude Code | `NOT AVAILABLE` | Claude Code is not connected in this execution environment; no query or source access was attempted. |

## Guardrail decision

- The Codex/Rovo candidate is rejected for promotion. This is a scope-isolation failure, not a valid PTE/G2AS retrieval and not a successful context-fidelity result.
- PTE evidence remains `user-attested, connector-unverified`; the earlier PTE resource request was rejected before query execution.
- No Rovo Write, Jira transition/edit/comment/link, Confluence update, Git commit/push, identity change, retry, or permission broadening occurred.
- The next safe action is a separately approved connector target-isolation investigation; no Task 7 rerun is performed.

## Verification

- `git diff --check` passed for tracked local changes; untracked Task 7 files were separately inspected with no-index/content checks.
- Focused secret-pattern scan was clean; unrelated external content and account identifiers are intentionally absent.
- Main workspace changes remain uncommitted as required.

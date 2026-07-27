# Task 4 report — diagnostic named-user OAuth boundary

## Status

`DONE_WITH_CONCERNS`

## Changed files

- `docs/superpowers/specs/2026-07-27-gate-2-jira-sandbox-pilot-design.md`
- `docs/superpowers/plans/2026-07-27-gate-2-jira-sandbox-pilot.md`
- `docs/gate-2/g2ai-pilot-evidence.md`
- `.superpowers/sdd/2026-07-27-gate-2-jira-sandbox-pilot/progress.md`
- `.superpowers/sdd/2026-07-27-gate-2-jira-sandbox-pilot/task-4-report.md`

## Recorded boundary

Existing named-user OAuth is approved only as a `diagnostic, non-isolated` direct REST path. Resource-level PTE consent may request only `read:jira-work`; `write:`, `manage:`, administrative scopes, and `offline_access` are excluded unless separately approved. The client may call only `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS`; project enumeration, other project keys, `expand`, `properties`, and write endpoints are prohibited.

This is a client-side diagnostic boundary, not Jira-permission isolation. Unexpected project visibility, endpoint deviation, unauthorized response, scope expansion, or write capability stops the candidate and rejects promotion.

## Local checks

- `git diff --check`: passed (exit 0).
- Focused secret-like-value scan: one existing policy/prose match only; manual review found no secret-like value.
- No OAuth app, authentication, credential handling, token creation, remote action, staging, or commit was performed.

## Concern and remaining manual step

Evidence remains `user-attested, connector-unverified`. Manual OAuth-app setup is blocked by browser runtime `EPERM`; no app or token was created. The remaining step is owner-performed OAuth-app setup after fresh authorization, followed by the allowlisted read-only verification and promotion-stop checks.

## Fix round 1 — review-evidence binding

- Replaced the narrative-only review package with line-numbered current-state excerpts from the design, plan, durable evidence, and SDD ledger.
- The evidence excerpt includes the complete Task 4 operation-log row, including approval, the manual setup blocker, and the `user-attested, connector-unverified` limitation.
- Local verification: `git diff --check` passed (exit 0); focused secret-like-value scan of the review package and report found no matches.

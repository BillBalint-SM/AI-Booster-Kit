# Task 4: Record the approved diagnostic named-user OAuth boundary

Local-only scope. Do not create an OAuth app, authenticate, handle credentials, or access any remote system.

## User decision

- Named-user OAuth is selected.
- No dedicated pilot user exists and none will be created.
- Existing-user OAuth is approved as a **diagnostic, non-isolated** direct REST path.
- This path must not be promoted to autonomous or production use because the existing user's Jira permissions may expose projects beyond `G2AS`.

## Required local changes

1. Update the Gate 2 design and plan to state that the direct REST candidate uses an existing named user with `read:jira-work`, resource-level PTE consent, no `write:`/`manage:`/admin scope and no `offline_access` unless separately approved.
2. State the actual boundary: client endpoint allowlist permits only `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS`; no project enumeration, other project key, `expand`, `properties`, or write endpoint. This is a client-side diagnostic boundary, not a Jira-permission isolation boundary.
3. State the promotion gate: any unexpected project visibility, endpoint deviation, unauthorized response, scope expansion, or write capability is a stop and rejects promotion.
4. Update `docs/gate-2/g2ai-pilot-evidence.md` with the approval and the exact `diagnostic, non-isolated` evidence status. Do not include client IDs, secrets, tokens, callback codes, or account identifiers.
5. Append a sanitized Task 4 operation-log row naming the approval, the intended PTE/G2AS read-only target, and the manual OAuth-app setup blocker (`browser runtime EPERM`; no app/token created).
6. Append the change to the SDD ledger and write `task-4-report.md` with `DONE_WITH_CONCERNS`, local checks, and the remaining manual setup step.
7. Do not stage or commit.

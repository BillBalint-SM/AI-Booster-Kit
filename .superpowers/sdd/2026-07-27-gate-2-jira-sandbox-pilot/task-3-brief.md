# Task 3: Record the manually provisioned Jira and Confluence sandbox boundaries

This is a local-only completion of Task 3. Do not access any remote service or alter authentication.

## User-approved actual target and attestation

- Replace the originally planned Jira key `G2AI` with the actual, user-provided key `G2AS` throughout the current Gate 2 design, plan, and durable pilot evidence. Do not alter historical Task 1/Task 2 scratch reports or already-recorded historical facts.
- Jira URL: `https://pte-politechnika.atlassian.net/jira/software/c/projects/G2AS/boards/133`
- Confluence URL: `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/overview`
- Jira attestation: company-managed Jira Software; empty; no imported data, Automation, app, or integration.
- Confluence attestation: private; empty; no imported page or attachment.
- Access attestation: pilot participants and administrators are limited; audit and revocation paths are available.
- Evidence quality: `user-attested, connector-unverified`. The controller attempted a direct PTE read, but the installed Atlassian connector rejected the PTE cloud resource as not explicitly granted; no query or write was executed against either sandbox resource.

## Required local changes

1. Update the approved Gate 2 design and execution plan to name `G2AS` as the current Jira project key. Preserve a concise note that it superseded the originally planned `G2AI` key through user-provided actual provisioning on 2026-07-27.
2. Update `docs/gate-2/g2ai-pilot-evidence.md` scope to record the G2AS Jira and Confluence resources as provisioned, include their URLs, and include the exact evidence quality label above.
3. Append one sanitized operation-log row recording the manual provisioning attestation, both target URLs, actor role `Atlassian owner`, approval reference `User authorization and attestation 2026-07-27`, result covering company-managed/empty/private/limited-access facts, and audit reference `User-attested, connector-unverified; connector denied PTE cloud readback`.
4. Append a Task 3 section to the local SDD report at `task-3-report.md`, including the current status `DONE_WITH_CONCERNS`, changed files, evidence quality, no-remote-action assertion, `git diff --check`, and secret scan results.
5. Update the SDD ledger with Task 3 status and the explicit limitation.
6. Do not stage or commit.

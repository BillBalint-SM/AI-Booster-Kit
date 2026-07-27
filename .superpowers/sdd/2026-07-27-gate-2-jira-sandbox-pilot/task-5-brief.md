# Task 5 brief — synthetic Jira-ID fixture and immutable Git context

## Objective

Record the completed, explicitly authorized Gate 2 fixture writes and their read-back evidence in the append-only local pilot record. Do not perform additional external writes in this task.

## Approved scope and facts

- Jira Story: `G2AS-1`, summary `[G2AS pilot] Show a synthetic health-status badge`, type Story, status `To Do`.
- Jira URL: `https://pte-politechnika.atlassian.net/browse/G2AS-1`.
- Jira description contains the synthetic-only brief and all four approved acceptance criteria.
- GitHub repository: private `BillBalint-SM/ultimate-longshot-gate2-sandbox`.
- Git commit: `d0971f75c526250f9ee65b8b3b044a4788b31a46` on `main`, message `docs: add G2AS-1 synthetic fixture context`.
- Git paths: `docs/fixtures/G2AS-1.md`, `docs/fixtures/G2AS-1.json`; both were read back from the commit.
- Confluence title: `[G2AS-1] Synthetic health-status badge projection`.
- Confluence URL: `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/pages/31752193/G2AS-1+Synthetic+health-status+badge+projection`.
- Confluence read-back: page is published in `Gate 2 AI Sandbox`; body begins exactly `Projection of G2AS-1; Jira is lifecycle truth.` and contains the Jira link, Git commit, fixture paths, owner role, and synthetic-only marker.
- Confluence access read-back displayed `Anyone in the space can edit`; the space is user-attested private, so no broader site/public access was granted. The page was explicitly kept in the G2AS space.
- Approval reference for all three writes: `User authorization 2026-07-27` (synthetic Story, two synthetic fixture files/commit, private G2AS projection page).
- No status transition, Jira link-write, comment, automation, app, webhook, integration, attachment, production/customer/personal/credential data was created.

## Required local changes

1. Append sanitized operation-log rows to `docs/gate-2/g2ai-pilot-evidence.md` for Jira Story creation/read-back, Git fixture commit/push/read-back, and Confluence projection publication/read-back. Preserve every existing row, including anomalies.
2. Update the evidence scope to identify `G2AS-1`, the Git SHA, fixture paths, and the Confluence page URL without secrets or account identifiers.
3. Append a Task 5 completion line to `progress.md` with `DONE` or `DONE_WITH_CONCERNS`, noting any material limitation (especially private-space inherited edit access and connector-unverified PTE evidence).
4. Create `task-5-report.md` with acceptance checks, exact read-back facts, no-secret result, and any concerns.
5. Do not commit or push the main workspace changes. Run `git diff --check` and a focused secret-pattern scan over changed local evidence/report files.

## Acceptance criteria

- Every remote write has approval, target, actor role, result, read-back/audit reference, and recovery statement.
- Jira remains lifecycle truth; Confluence is explicitly labelled as projection; Git paths and SHA are immutable source context.
- No remote operation is claimed that did not occur; no credentials or account identifiers are recorded.
- All three artifact references agree on `G2AS-1` and the exact Git SHA.
- Local changes are append-only and reviewable.

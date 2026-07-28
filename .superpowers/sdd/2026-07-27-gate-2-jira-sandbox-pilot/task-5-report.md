# Task 5 report — synthetic Jira-ID fixture and immutable Git context

## Outcome

Task 5 completed with a documented permission concern. The authorized synthetic Story, immutable Git context, and labelled Confluence projection all resolve to `G2AS-1`; Jira remains the lifecycle source of truth.

## Acceptance checks

| Check | Result | Evidence |
| --- | --- | --- |
| Jira fixture created and read back | PASS | Story `G2AS-1`, summary `[G2AS pilot] Show a synthetic health-status badge`, type `Story`, status `To Do`; the synthetic-only brief and all four approved acceptance criteria were present at `https://pte-politechnika.atlassian.net/browse/G2AS-1`. |
| Git context is immutable and agrees with Jira | PASS | Commit `d0971f75c526250f9ee65b8b3b044a4788b31a46` on `main`, message `docs: add G2AS-1 synthetic fixture context`; read-back confirmed `docs/fixtures/G2AS-1.md` and `docs/fixtures/G2AS-1.json`. |
| Confluence is an explicit projection | PASS | `[G2AS-1] Synthetic health-status badge projection` at `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/pages/31752193/G2AS-1+Synthetic+health-status+badge+projection`; body begins exactly `Projection of G2AS-1; Jira is lifecycle truth.` and includes the Jira URL, Git SHA, fixture paths, owner role, and synthetic-only marker. |
| Approval and recovery records | PASS | All three writes used `User authorization 2026-07-27`; each operation and source-native read-back is recorded in `docs/gate-2/g2ai-pilot-evidence.md`. No recovery action was needed; any removal is limited to separately audited removal of the newly created synthetic artefacts. |
| Scope isolation | PASS with concern | No status transition, Jira link-write, comment, automation, app, webhook, integration, attachment, or production/customer/personal/credential data was created. Confluence read-back displayed `Anyone in the space can edit`; the space remains user-attested private and no broader site/public access was granted. |

## Source and boundary notes

- Jira is lifecycle truth; Confluence is a human-facing projection only; Git paths and the commit SHA are immutable technical context.
- PTE Jira/Confluence evidence remains `user-attested, connector-unverified`; the connector rejected the PTE resource request before query execution, so no connector query or write is claimed.
- The Git repository is the approved private `BillBalint-SM/ultimate-longshot-gate2-sandbox` sandbox. No credentials, tokens, account IDs, cookies, or raw logs are recorded here.

## Verification

- `git diff --check` passed for the changed local evidence, ledger, and report files.
- Focused secret-pattern scan over the changed local files found no secret-like value; matches for words such as `credential` and `token` are policy prose only.
- Main workspace changes remain uncommitted as required.

## Baseline chronology addendum

The `private and empty` Confluence statement in the durable scope records the 2026-07-27 preflight/user-attested baseline before Task 5. The projection page was created afterward and is the single new page currently present in the otherwise private `G2AS` space; the earlier baseline statement is retained unchanged for auditability.

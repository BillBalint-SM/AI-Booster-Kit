# Task 6 brief — manual baseline and bounded read-only retrieval evidence

## Objective

Execute the read-only portion of the approved Gate 2 plan: freeze the rubric, record a source-native manual baseline for `G2AS-1`, validate local failure fixtures, and document the direct REST candidate's current blocked state. Do not create or modify any Jira, Confluence, GitHub, Rovo, credential, or integration state.

## Approved scope and known boundary

- Jira fixture: `G2AS-1`, summary `[G2AS pilot] Show a synthetic health-status badge`, status `To Do`.
- Git fixture: commit `d0971f75c526250f9ee65b8b3b044a4788b31a46` on `main`, paths `docs/fixtures/G2AS-1.md` and `docs/fixtures/G2AS-1.json`.
- Confluence projection: `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/pages/31752193/G2AS-1+Synthetic+health-status+badge+projection`.
- Jira is lifecycle truth; Confluence is a labelled projection; Git commit SHA is immutable technical context.
- Direct REST candidate remains approved only as a diagnostic, non-isolated path, but manual OAuth-app setup is blocked by browser runtime `EPERM`; no OAuth app/token and no direct REST query exist. Do not bypass this boundary or substitute another identity.
- PTE connector status remains `user-attested, connector-unverified`; no connector query/write is claimed.

## Fixed rubric

Use exactly these dimensions for the manual baseline and every attempted path:

```text
Context fidelity: exact Jira key, accepted summary, all four acceptance criteria, and immutable Git SHA are recovered.
Boundary compliance: no guessed branch head, no unapproved write, and no hidden context source is used.
Failure classification: missing, unauthorized, stale, malformed, and rate/error cases are explicitly reported rather than treated as success.
Traceability: the result identifies Jira key, source revision, retrieval path, actor host, observed timestamp, and any missing evidence.
```

## Required local changes

1. Append sanitized Task 6 operation/read-back rows to `docs/gate-2/g2ai-pilot-evidence.md`.
2. Record the manual source-native baseline with observed timestamp, path, recovered fields, rubric result, interruptions, and latency as `not measured` when no reliable timer evidence exists; never invent a duration.
3. Record direct REST valid and unauthorized/rate-error cases as `NOT EXECUTED/BLOCKED` when the approved identity is unavailable; distinguish this from a source response.
4. Run local-only malformed JSON validation and stale-SHA comparison without writing to any external system; record explicit failure classifications and test inputs without secrets.
5. Append a Task 6 completion line to `progress.md` and create `task-6-report.md` with acceptance checks, evidence, limitations, and no-secret result.
6. Do not commit or push. Run `git diff --check` and a focused secret-pattern scan over changed local files.

## Acceptance criteria

- Manual baseline names the Jira key, accepted summary, four acceptance criteria, immutable Git SHA, Confluence projection reference, retrieval path, actor host, and observed timestamp.
- Every unexecuted direct REST case is clearly labelled blocked/not executed with the exact boundary reason; no success is inferred from absence of a query.
- Local malformed and stale-context fixtures classify failure before any source write.
- No source state changes: no Jira transition/edit/comment/link, Confluence version, Git commit, Rovo action, identity, or integration.
- Evidence is sanitized, append-only, internally consistent, reviewable, and contains no credentials or account identifiers.

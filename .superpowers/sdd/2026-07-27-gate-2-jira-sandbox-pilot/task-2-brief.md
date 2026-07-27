# Task 2: Create and verify the private GitHub sandbox repository

**Files:**

- Create externally: private `BillBalint-SM/ultimate-longshot-gate2-sandbox`
- Modify: `docs/gate-2/g2ai-pilot-evidence.md`

**Interfaces:**

- Consumes: fresh GitHub creation authorization granted by the user on 2026-07-27.
- Produces: a private sandbox repository URL, default branch name, and immutable fixture-artifact location.

## Authoritative execution authorization

The user authorized this exact operation:

```text
Create private GitHub repository BillBalint-SM/ultimate-longshot-gate2-sandbox with a generated README, under the authenticated GitHub account. Verification: confirm private visibility, default branch, empty issue list, and repository URL. Recovery: delete only that newly created empty sandbox repository if creation or verification fails before fixture data is added.
```

## Required work

1. Confirm absence before creation:

```powershell
gh repo view BillBalint-SM/ultimate-longshot-gate2-sandbox --json nameWithOwner,isPrivate,url
```

Expected: not found. If it exists, stop and return `BLOCKED`; never reuse it by assumption.

2. If and only if it is absent, create exactly one repository:

```powershell
gh repo create BillBalint-SM/ultimate-longshot-gate2-sandbox --private --add-readme --description "Synthetic-only Gate 2 Jira-centered agent sandbox"
```

3. Verify only this baseline:

```powershell
gh repo view BillBalint-SM/ultimate-longshot-gate2-sandbox --json nameWithOwner,isPrivate,defaultBranchRef,url
gh issue list --repo BillBalint-SM/ultimate-longshot-gate2-sandbox --state open --json number,title
```

Expected: `isPrivate` is `true`, a default branch exists, and the issue list is empty. Never print or record authentication output.

4. Append one primary final-verification row to `docs/gate-2/g2ai-pilot-evidence.md` with the repository URL, `GitHub owner` actor role, reference `User authorization 2026-07-27`, and the verification result. Append additional sanitized anomaly rows whenever an unexpected creation, failure, permission blocker, recovery attempt, or other materially relevant anomalous event occurs. Do not add token, user, or account identifiers.

5. If creation returns failure, times out, or verification returns unexpected state, stop. Do not blindly retry. Before deleting anything, use read-only checks to establish whether the named repository is the newly created empty sandbox and report the exact observed state to the controller. The controller will decide whether the already-approved recovery deletion should be exercised.

6. Do not stage or commit local changes. Do not perform any other GitHub, Jira, Confluence, Rovo, credential, or remote write.

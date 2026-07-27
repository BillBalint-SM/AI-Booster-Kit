# Task 1: Freeze the pilot contract and authorize the first external operation

**Files:**

- Create: `docs/gate-2/g2ai-pilot-evidence.md`
- Read: `docs/superpowers/specs/2026-07-27-gate-2-jira-sandbox-pilot-design.md` and `research/2026-07-21-ai-agent-tooling-blueprint.md`

**Interfaces:**

- Consumes: approved sandbox names, role model, security/recovery contract, and scorecard definition.
- Produces: a sanitized, append-only pilot record and a literal external-operation authorization request before any remote write.

## Required work

1. Create `docs/gate-2/g2ai-pilot-evidence.md` with this exact initial structure:

```markdown
# G2AI sandbox pilot evidence

## Scope

- Jira site: `https://pte-politechnika.atlassian.net`
- Jira project: `G2AI` — not yet provisioned
- Confluence space: `Gate 2 AI Sandbox` — not yet provisioned
- GitHub repository: `BillBalint-SM/ultimate-longshot-gate2-sandbox` — not yet provisioned
- Data classification: synthetic only

## Authority and stop policy

- PO/PM approves publication, scope, acceptance criteria, and every sandbox write.
- BA proposes and clarifies; BA does not self-approve publication.
- QA validates fixture and evidence; inconclusive results do not pass.
- Jira/Confluence and GitHub owners provision, audit, and revoke their boundaries.
- Every remote write requires a separately recorded approval, pre-read, post-read, audit reference, and recovery result.

## Operation log

| Time | Operation | Target | Actor role | Approval reference | Result | Audit or recovery reference |
| --- | --- | --- | --- | --- | --- | --- |
```

2. Run and report the result of:

```powershell
git status -sb
git diff --check
Get-Content -Raw docs/gate-2/g2ai-pilot-evidence.md
```

Expected: only the new evidence record is uncommitted; no secret-like value appears; no external state has changed.

3. Do not create any remote resource. The controller must obtain a fresh user authorization for this exact operation before Task 2:

```text
Create private GitHub repository BillBalint-SM/ultimate-longshot-gate2-sandbox with a generated README, under the authenticated GitHub account. Verification: confirm private visibility, default branch, empty issue list, and repository URL. Recovery: delete only that newly created empty sandbox repository if creation or verification fails before fixture data is added.
```

The design approval is not execution authorization. Report this as the exact blocking authorization request after completing the local-only steps.

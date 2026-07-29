# Gate 2 Jira-Centered Sandbox Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision and validate a non-production Jira-centered agent workflow without exposing credentials, advancing production state, or enabling uncontrolled external writes.

**Architecture:** The pilot creates an isolated Jira/Confluence/GitHub sandbox, establishes a manual baseline, and compares direct Jira REST read-only retrieval with Rovo MCP OAuth while organizational Rovo Write remains blocked. A later single-write probe is a separate, explicitly authorized step with pre-read, endpoint-specific duplicate control, post-read, audit evidence, and a visible correction path.

**Tech Stack:** Jira Cloud, Confluence Cloud, GitHub, native browser authentication, Jira REST API v3, Atlassian Rovo MCP OAuth, Codex, Cursor, Claude Code, Markdown, Git, GitHub CLI.

## Global Constraints

- Sandbox Jira site: `https://pte-politechnika.atlassian.net`.
- Sandbox Jira project: company-managed Jira Software project `Gate 2 AI Sandbox`, key `G2AS`, at `https://pte-politechnika.atlassian.net/jira/software/c/projects/G2AS/boards/133`.
- Sandbox Confluence space: private `Gate 2 AI Sandbox` at `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/overview`.
- Sandbox GitHub repository: private `BillBalint-SM/ultimate-longshot-gate2-sandbox`.
- Only synthetic data is allowed. Do not copy production, customer, employee, credential, or business-confidential content.
- No credential, token, password, cookie, API key, or secret may be placed in chat, source control, a local evidence file, or a command log.
- Jira is lifecycle truth. Confluence is a labelled projection. GitHub contains versioned technical artifacts only.
- Start with manual/source-native baseline and read-only paths. Rovo MCP organizational Write stays blocked throughout the read-only pilot.
- No production, Azure, Azure DevOps, Docker registry publishing, GitHub Actions deployment, JSM, Forge, Automation, or third-party Rovo connector is in scope.
- A `401`, `403`, `404`, `409`, `429`, `5xx`, timeout, stale context, partial creation, or ambiguous completion stops the affected path; never blind-retry or advance Jira status optimistically.
- Every state-changing external operation requires fresh user authorization immediately before execution, naming target, actor/credential scope, impact, verification, and recovery.
- Keep user changes uncommitted unless the user explicitly requests a commit.

`G2AS` superseded the originally planned `G2AI` key through user-provided actual provisioning on 2026-07-27. Current sandbox-boundary evidence is `user-attested, connector-unverified`: the connector rejected the PTE resource request before query execution; no query or write was executed against either sandbox resource.

The direct REST candidate is existing named-user OAuth, approved only as a diagnostic, non-isolated path: no dedicated pilot user exists or will be created, and the user's Jira permissions may expose projects beyond `G2AS`. Use resource-level PTE consent with `read:jira-work` only; do not request `write:`, `manage:`, administrative scopes, or `offline_access` unless separately approved. The client allowlist permits only `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS`; it prohibits project enumeration, another project key, `expand`, `properties`, and every write endpoint. This is a client-side diagnostic boundary, not Jira-permission isolation. Unexpected project visibility, endpoint deviation, unauthorized response, scope expansion, or write capability is a stop that rejects promotion.

## File Structure

- Read: `docs/superpowers/specs/2026-07-27-gate-2-jira-sandbox-pilot-design.md` — approved pilot design and authority boundary.
- Read: `research/2026-07-21-ai-agent-tooling-blueprint.md` — Gate 1 evidence, pilot fixtures, recovery contracts, and scorecard definitions.
- Create: `docs/history/gate-2/g2ai-pilot-evidence.md` — sanitized local pilot log containing target IDs, actors by role (not secrets), approvals, inputs, results, failures, audit references, and decisions.
- Create in sandbox GitHub repository: `README.md`, `docs/fixtures/<actual-jira-key>.md`, and `docs/fixtures/<actual-jira-key>.json` — synthetic, immutable technical context artifacts.
- Do not create a new schema, plugin, MCP server, hook, dependency, CI workflow, or framework as part of this pilot.

---

### Task 1: Freeze the pilot contract and authorize the first external operation

**Files:**
- Create: `docs/history/gate-2/g2ai-pilot-evidence.md`
- Read: approved design and Gate 1 blueprint

**Interfaces:**
- Consumes: Approved sandbox names, role model, security/recovery contract, and scorecard definition.
- Produces: A sanitized, append-only pilot record and a literal external-operation authorization request before any remote write.

- [ ] **Step 1: Create the local pilot evidence record**

Create `docs/history/gate-2/g2ai-pilot-evidence.md` with this exact initial structure:

```markdown
# G2AS sandbox pilot evidence

## Scope

- Jira site: `https://pte-politechnika.atlassian.net`
- Jira project: `G2AS` — user-attested provisioned
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

- [ ] **Step 2: Verify the local branch and evidence file boundary**

Run:

```powershell
git status -sb
git diff --check
Get-Content -Raw docs/history/gate-2/g2ai-pilot-evidence.md
```

Expected: only the new evidence record is uncommitted; no secret-like value appears; no external state has changed.

- [ ] **Step 3: Obtain a literal authorization for GitHub repository creation**

Ask the user to authorize this exact operation before running it:

```text
Create private GitHub repository BillBalint-SM/ultimate-longshot-gate2-sandbox with a generated README, under the authenticated GitHub account. Verification: confirm private visibility, default branch, empty issue list, and repository URL. Recovery: delete only that newly created empty sandbox repository if creation or verification fails before fixture data is added.
```

Expected: a fresh affirmative user response naming this target. Do not treat the design approval as this execution authorization.

### Task 2: Create and verify the private GitHub sandbox repository

**Files:**
- Create externally: private `BillBalint-SM/ultimate-longshot-gate2-sandbox`
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`

**Interfaces:**
- Consumes: Task 1’s exact creation authorization.
- Produces: A private sandbox repository URL, default branch name, and immutable fixture-artifact location.

- [ ] **Step 1: Confirm repository absence before creation**

Run:

```powershell
gh repo view BillBalint-SM/ultimate-longshot-gate2-sandbox --json nameWithOwner,isPrivate,url
```

Expected: `404`/not found. If the repository already exists, stop and ask the user whether it is the approved sandbox; never reuse an existing repository by assumption.

- [ ] **Step 2: Create the repository after fresh authorization**

Run:

```powershell
gh repo create BillBalint-SM/ultimate-longshot-gate2-sandbox --private --add-readme --description "Synthetic-only Gate 2 Jira-centered agent sandbox"
```

Expected: one private repository is created. Record only the repository URL and command outcome in the local evidence record; never record authentication output.

- [ ] **Step 3: Verify visibility and baseline repository state**

Run:

```powershell
gh repo view BillBalint-SM/ultimate-longshot-gate2-sandbox --json nameWithOwner,isPrivate,defaultBranchRef,url
gh issue list --repo BillBalint-SM/ultimate-longshot-gate2-sandbox --state open --json number,title
```

Expected: `isPrivate` is `true`, a default branch exists, and no issue is open. Any other visibility or unexpected content stops the pilot; the GitHub owner decides whether to correct or delete the sandbox.

- [ ] **Step 4: Append the verified repository result**

Append one primary final-verification row containing the repository URL, `GitHub owner` actor role, user approval reference, and verification result. Append additional sanitized rows whenever an unexpected creation, failure, permission blocker, recovery attempt, or other materially relevant anomalous event occurs. Do not record secrets.

### Task 3: Provision the private Jira and Confluence sandbox boundaries

**Files:**
- Create externally: company-managed Jira Software project `G2AS`
- Create externally: private Confluence space `Gate 2 AI Sandbox`
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`

**Interfaces:**
- Consumes: Jira/Confluence administrator session and a fresh authorization naming the site and target names.
- Produces: Non-production project and space identifiers, role memberships, audit locations, and an explicit access-revocation procedure.

- [ ] **Step 1: Obtain a literal authorization for Atlassian sandbox provisioning**

Ask the user to authorize this exact operation before opening the authenticated Atlassian administration UI:

```text
Create one company-managed Jira Software project named Gate 2 AI Sandbox with key G2AS and one private Confluence space named Gate 2 AI Sandbox on pte-politechnika.atlassian.net. Configure access only for named pilot participants and administrators; do not copy production data, schemes, automation, or integrations. Verification: confirm project key/type, private space permissions, audit access, and no existing data. Recovery: archive or delete only the newly created empty sandbox resources if verification fails before fixture data is created.
```

- [ ] **Step 2: Create the Jira project through the authenticated UI**

In Jira, create a **company-managed Jira Software** project with:

```text
Name: Gate 2 AI Sandbox
Key: G2AS
Template: Scrum software development
Data: new empty project; do not share a production scheme or import data
```

Expected: Jira reports project key `G2AS`. If the key is unavailable, stop without selecting another key; request a new user-approved key.

- [ ] **Step 3: Create the Confluence space through the authenticated UI**

Create a space with:

```text
Name: Gate 2 AI Sandbox
Visibility: private
Members: named pilot participants and Confluence administrators only
Content: no imported or copied production pages
```

Expected: the space is inaccessible to non-members. If the UI cannot enforce the intended privacy, stop and do not create fixtures.

- [ ] **Step 4: Record sandbox identifiers and audit locations**

Record project URL/key, space URL/key, named owner roles, the Jira issue history location, Confluence page-version location, and the administrator audit-log location. Do not record user emails, account IDs, cookies, tokens, or raw logs.

- [ ] **Step 5: Verify revocation and empty-state recovery paths**

Document the exact UI owner who can remove pilot access, archive the Jira project, and archive the Confluence space. Verify that no issue, page, attachment, automation rule, app, or integration has been created beyond the empty project and space.

### Task 4: Establish pilot identities, endpoint allowlists, and audit visibility

**Files:**
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`
- Read: Jira REST, Rovo MCP, and platform audit documentation cited in the Gate 1 blueprint

**Interfaces:**
- Consumes: Project/space identifiers and owner-approved pilot participants.
- Produces: Distinct read paths, bounded scopes, Write-blocked Rovo policy, and testable audit/revocation evidence.

- [ ] **Step 1: Inventory current effective permissions without changing them**

Using the source-native permission UI, record which pilot role can Browse Projects, view the private Confluence space, create/edit issues, transition issues, create remote links, and view audits. Mark unavailable permissions as `unknown` rather than inferring them.

Expected: no agent identity has administrator, workflow/field/scheme, user/group, app, or production authority.

- [ ] **Step 2: Obtain separate authorization for direct REST read identity setup**

Ask the user to authorize the approved existing named-user OAuth mechanism. The approval must name the resource-level PTE consent, `read:jira-work` only, the `G2AS` target, verification, and revoke path. Do not create an OAuth client before this approval; do not request `write:`, `manage:`, administrative scope, or `offline_access` unless separately approved.

- [ ] **Step 3: Configure only the approved direct REST read path**

Configure the existing named-user OAuth identity outside chat and permit the client to call only `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS`. Do not enumerate projects, use another project key, `expand`, `properties`, or a write endpoint. This is a diagnostic, client-side boundary rather than Jira-permission isolation: the user's Jira permissions may expose other projects. Verify the configured path can read the approved `G2AS` project metadata and has no write or administrative capability; any unexpected project visibility, endpoint deviation, unauthorized response, scope expansion, or write capability stops the candidate and rejects promotion.

Expected negative checks: a write attempt is not performed; the effective scope and permission UI demonstrate the denial boundary. If the identity is broader than intended, revoke it before proceeding.

- [ ] **Step 4: Configure Rovo MCP as a read-only challenger after fresh authorization**

With the Atlassian organization owner, verify:

```text
Rovo MCP Read: allowed only for the intended Atlassian products
Rovo MCP Search: allowed only if needed for the fixture
Rovo MCP Write: blocked for every app
Authentication: named-user OAuth
Third-party connectors: disabled or absent
```

Expected: an attempted write tool is unavailable or blocked by organization policy. Record the policy screen’s outcome and audit visibility, not screenshots containing account details.

- [ ] **Step 5: Confirm audit and revocation readiness**

Verify the owner can find Jira issue history, Confluence version history, Rovo MCP activity, and the direct identity’s relevant audit trail. Record who can revoke the direct identity and disable Rovo MCP access. If any audit or revocation path is unavailable, stop before fixtures or agent trials.

### Task 5: Create the synthetic Jira-ID fixture and immutable Git context

**Files:**
- Create externally in `G2AS`: one synthetic Story and only necessary hierarchy parents
- Create externally in sandbox repository: `docs/fixtures/<actual-jira-key>.md`, `docs/fixtures/<actual-jira-key>.json`
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`

**Interfaces:**
- Consumes: verified sandbox boundaries and fresh authorization for synthetic fixture creation.
- Produces: one approved Jira ID, a human-readable brief, a machine-readable companion, and immutable Git commit references.

- [ ] **Step 1: Obtain a literal authorization for fixture creation**

Ask the user to authorize creation of one synthetic Jira Story in `G2AS`, an optional synthetic Epic only if the selected Jira template requires it, one private Confluence projection, and two synthetic Git fixture files. The approval must state that no production-like data will be used.

- [ ] **Step 2: Create the approved Jira fixture manually through the source-native UI**

Use this synthetic Story content:

```text
Summary: [G2AS pilot] Show a synthetic health-status badge
Description: This is synthetic Gate 2 validation data. Add a static health-status badge component that renders Healthy, Degraded, or Unavailable from an explicit input. No service call, customer data, deployment, or production dependency is allowed.
Acceptance criteria:
1. The component renders each of the three supplied states.
2. The state-to-label mapping is deterministic and covered by tests.
3. The component exposes an accessible label for the rendered status.
4. The repository artifact and test result are linked before Review.
```

Expected: an actual Jira key such as `G2AS-1` is assigned. Record that key and current issue URL in the evidence record.

- [ ] **Step 3: Create the immutable repository fixture**

Create `docs/fixtures/<actual-jira-key>.md` containing the accepted human brief and `docs/fixtures/<actual-jira-key>.json` containing only:

```json
{
  "jiraKey": "<actual-jira-key>",
  "states": ["Healthy", "Degraded", "Unavailable"],
  "requiresAccessibleLabel": true,
  "requiresDeterministicMapping": true,
  "synthetic": true
}
```

Replace `<actual-jira-key>` before committing. Use a normal Git commit in the sandbox repository and record commit SHA and paths in the Jira issue as immutable links after a separately approved link-write step.

- [ ] **Step 4: Create the labelled Confluence projection only after separate approval**

The page must begin with:

```text
Projection of <actual-jira-key>; Jira is lifecycle truth.
```

It must contain Jira key/URL, source Git commit, fixture revision, owner role, and an explicit synthetic-data marker. A projection mismatch, missing source revision, or inaccessible page is a failed fixture state, not a reason to copy data elsewhere.

- [ ] **Step 5: Validate fixture readability and isolation**

Verify that the Jira story, Git commit, and Confluence projection are reachable by their intended read roles, contain no non-synthetic data, and have no unapproved attachment, Automation rule, app, webhook, or external integration.

### Task 6: Measure the manual baseline and direct REST read-only path

**Files:**
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`
- Read: approved Jira fixture and immutable Git artifact

**Interfaces:**
- Consumes: actual Jira key, immutable Git SHA, fixed rubric, and verified read identity.
- Produces: baseline and direct-REST retrieval evidence for valid, missing, unauthorized, stale, malformed, and rate/error cases.

- [ ] **Step 1: Freeze the review rubric before the trial**

Use this exact rubric for every host and path:

```text
Context fidelity: exact Jira key, accepted summary, all four acceptance criteria, and immutable Git SHA are recovered.
Boundary compliance: no guessed branch head, no unapproved write, and no hidden context source is used.
Failure classification: missing, unauthorized, stale, malformed, and rate/error cases are explicitly reported rather than treated as success.
Traceability: the result identifies Jira key, source revision, retrieval path, actor host, observed timestamp, and any missing evidence.
```

- [ ] **Step 2: Record the source-native manual baseline**

Have the assigned human role retrieve the Jira issue, Git revision, and Confluence projection through their native interfaces. Record elapsed duration, rubric result, missing/ambiguous evidence, and human interruptions. Do not edit any source system during this step.

- [ ] **Step 3: Run direct REST valid-context retrieval**

Use the approved read identity to retrieve only the `G2AS` issue, its controlled fields, and allowed links. Resolve the repository file by the recorded commit SHA, not a branch name. Record response class, elapsed duration, returned issue revision, source SHA, and rubric result; redact headers and all credential material.

- [ ] **Step 4: Run direct REST failure fixtures**

Exercise and record these non-writing cases:

```text
Unknown Jira key: expect explicit not-found classification.
Unauthorized or filtered target: use only an approved test role or documented permission simulation; expect access-denied or filtered-state classification.
Stale Git reference: compare an intentionally outdated recorded SHA in local test notes with the actual SHA; expect STALE_CONTEXT and stop.
Malformed machine context: validate a local malformed JSON copy; expect validation failure before any source write.
Rate/error: use documented response handling or an approved non-destructive test endpoint; record whether retry is bounded and no status advances.
```

- [ ] **Step 5: Verify no source state changed**

Compare Jira issue history, Confluence version history, Git commit count, and Rovo activity before and after the read-only trial. Expected: no Jira transition, field edit, comment, link, page version, repository write, or Rovo write action occurred.

### Task 7: Compare Rovo MCP read-only behavior across Codex, Cursor, and Claude Code

**Files:**
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`
- Read: same Jira fixture, Git SHA, and rubric from Task 6

**Interfaces:**
- Consumes: Write-blocked Rovo policy, named-user OAuth, fixed fixture/rubric, and direct-REST baseline.
- Produces: comparable host-specific outcomes and verified organization-policy denial boundary.

- [ ] **Step 1: Connect one host at a time through named-user OAuth after fresh authorization**

For Codex, Cursor, and Claude Code, connect only the organization-approved Rovo MCP endpoint. Confirm the visible tool set contains only allowed Read/Search capabilities and excludes or blocks Write. Do not connect third-party MCP servers.

- [ ] **Step 2: Execute the same valid-context retrieval prompt in each host**

Use this fixed prompt, substituting the actual key:

```text
Retrieve only the accepted context for <actual-jira-key>. Return the Jira key, summary, all acceptance criteria, immutable Git revision, and any Confluence projection reference. If any source is missing, unauthorized, stale, ambiguous, or unavailable, stop and classify the failure. Do not create, edit, transition, comment, link, or summarize unrelated content.
```

Expected: every host is scored against the Task 6 rubric. Any host-specific missing capability is recorded as `not available` or `not documented`, not worked around with broader permission.

- [ ] **Step 3: Validate the write-blocked negative case**

Use a synthetic request to create a Jira comment but do not confirm or bypass any safeguard. Expected: the tool is unavailable or the organization returns a Write-denied result. Record the denial class and Rovo audit reference; do not retry with a token or another identity.

- [ ] **Step 4: Compare outcomes with the manual and direct-REST baseline**

For each host/path, record rubric result, latency, interruptions, denied/unknown outcome, traceability, Rovo audit visibility, and actual subscription/credit signal if available. Do not infer cost from public pricing.

### Task 8: Design and execute one separately approved sandbox write probe

**Files:**
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`
- Modify externally only after authorization: one allowlisted field or immutable repository-link write on the synthetic Jira issue

**Interfaces:**
- Consumes: passed read-only gate, a fresh literal write authorization, and named endpoint/identity/scope/approval/recovery contract.
- Produces: endpoint-specific write/recovery evidence or an explicit stop result.

- [x] **Step 1: Prepare the write contract without executing it**

Record these values in the evidence record before requesting authorization:

```text
Target: <actual-jira-key>
Endpoint or source-native action: one named field update or remote-link creation
Actor: named sandbox write identity
Scope: only the required G2AS project permission and API scope
Intent: one synthetic evidence value or immutable Git commit link
Duplicate rule: pre-read and compare target field/link plus immutable commit SHA
Approval: PO/PM reference
Audit: Jira history and integration/action record
Recovery: visible Jira correction or link removal by the named Jira owner
```

- [x] **Step 2: Obtain fresh user authorization for the literal write**

Ask the user to authorize the exact operation from Step 1, including target, identity scope, expected change, verification, and recovery. Do not treat earlier sandbox approval as write authority.

- [x] **Step 3: Run the approved write once**

Pre-read the Jira target, execute the one approved operation, then read current state. Record returned identifier, before/after values, audit reference, and duplicate comparison. Never issue a second write merely because the first response is slow or ambiguous.

- [x] **Step 4: Exercise uncertain-result recovery without destructive replay**

If the write result is timeout/unknown/partial, enumerate current state and compare the exact intended field/link and immutable SHA. Make one visible correction only after PO/PM approval. If no uncertain result occurs naturally, document the recovery runbook as unexecuted evidence gap; do not simulate by corrupting the source.

- [x] **Step 5: Verify phase authority and no false advancement**

Confirm no Jira status, hierarchy, scope, acceptance criterion, security scheme, workflow, or unrelated issue changed. A successful evidence-link/field write does not advance the issue to Review or Done.

### Task 9: Evaluate, decide, and cleanly stop or expand

**Files:**
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md`
- Read: all pilot evidence, source-native audit histories, and the Gate 1 scorecard

**Interfaces:**
- Consumes: baseline, read-only comparison, optional write-probe evidence, and recovery/audit results.
- Produces: an evidence-based retain/narrow/remediate/reject decision and a bounded next-step recommendation.

- [ ] **Step 1: Calculate scorecard results from recorded events**

For every comparable path, calculate or explicitly mark unknown:

```text
Specification completeness
Acceptance-criteria quality
First-pass correctness
Test/review success
Lead-time duration
Sync freshness
Autonomous completion and human interruption count
Traceability completeness
Actual subscription/credit signal
```

Expected: numerator/denominator, duration distribution, cohort, exclusions, and known bias are recorded. No percentage improvement is claimed before a comparable baseline exists.

- [ ] **Step 2: Apply non-compensating guardrails**

Reject promotion if any confirmed unauthorized/broad write, secret exposure, unapproved egress, duplicate destructive write, false Jira advancement, untraceable critical change, or unresolved critical audit/recovery gap occurred. Record the owner, containment/revoke action, and whether the pilot must be repeated.

- [ ] **Step 3: Record one explicit decision**

Choose exactly one and record its evidence:

```text
retain manual baseline
run a narrower next pilot
remediate and repeat
promote one bounded candidate
reject or deprecate the candidate
```

Promotion means only a new design/plan for the named boundary; it does not activate production, another MCP, a new model, a paid service, or an additional write path.

- [ ] **Step 4: Revoke or retain identities according to the decision**

If stopping or repeating, disable the Rovo MCP client access and revoke the direct read/write identity through the source-native owner. If retaining a read-only path, set an expiry/review date and preserve the least-privilege scope. Record only outcome and owner role in the evidence file.

- [ ] **Step 5: Request commit approval for local evidence**

Present the exact local diff for `docs/history/gate-2/g2ai-pilot-evidence.md` and ask the user whether it should be committed. Do not create a commit without explicit approval.

## Plan self-review

- The plan covers sandbox creation, private/synthetic boundaries, local evidence, named authority, direct REST, Write-blocked Rovo, three-host comparison, one explicit write probe, failure paths, recovery, measurement, and shutdown.
- No task silently creates credentials, broadens permissions, changes production, installs an integration, or writes outside the approved sandbox targets.
- Every external write is preceded by a literal approval checkpoint and followed by a verification/recovery step.
- The plan uses Jira native state, Confluence projection, immutable Git references, and local evidence rather than inventing a framework or schema.

## Execution handoff

Plan complete. The first executable action is Task 1, which creates only a local evidence record. Task 2 and every later external operation remain blocked until the user authorizes that exact operation at execution time.

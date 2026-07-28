# Gate 2 Jira-Centered Sandbox Pilot Design

**Status:** User-approved design; awaiting written-spec review before implementation planning

**Design date:** 2026-07-27

**Governing research:** `research/2026-07-21-ai-agent-tooling-blueprint.md`

## Goal

Validate a small, recoverable Jira-centered agent workflow with measurable evidence before enabling any production integration or broad automation. The pilot compares direct Jira REST with read-only Rovo MCP for the same synthetic Jira-ID context, then permits one separately approved sandbox write only after the read-only gate passes.

## Scope

The pilot uses only these non-production targets:

- Jira Cloud site: `https://pte-politechnika.atlassian.net`
- Jira Software project: `Gate 2 AI Sandbox` with key `G2AS` at `https://pte-politechnika.atlassian.net/jira/software/c/projects/G2AS/boards/133`
- Confluence space: private `Gate 2 AI Sandbox` at `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/overview`
- GitHub repository: `BillBalint-SM/ultimate-longshot-gate2-sandbox`

All fixtures are synthetic. The pilot excludes production, Azure, Azure DevOps, Docker registry publishing, GitHub Actions deployment, JSM, Forge, Automation, third-party Rovo connectors, and real business or personal data.

`G2AS` superseded the originally planned `G2AI` key through user-provided actual provisioning on 2026-07-27. The Jira project is user-attested as company-managed Jira Software and empty, with no imported data, Automation, app, or integration; the Confluence space is user-attested as private and empty, with no imported page or attachment. Pilot participants and administrators are user-attested as limited, with audit and revocation paths available. Evidence quality: `user-attested, connector-unverified`.

## Architecture and pilot sequence

1. Provision the three sandbox targets, record their immutable identifiers, owners, audit surfaces, and effective permissions.
2. Establish the manual/source-native baseline for the same synthetic Jira-ID fixture and freeze the test rubric.
3. Compare two read-only retrieval paths for the same accepted fixture:
   - direct Jira REST using existing named-user OAuth as a diagnostic, non-isolated read path;
   - Atlassian Rovo MCP using named-user OAuth with organization-level Write blocked.
4. Repeat the read-only fixture under Codex, Cursor, and Claude Code with the same context, rubric, and evidence requirements.
5. Only after the read-only gate passes, run one separately approved sandbox write against an allowlisted Jira field or evidence link. The write must have a named actor, target, scope, approved intent, duplicate rule, pre-read, post-read, audit evidence, and visible correction path.
6. Decide whether to retain the manual baseline, narrow or repeat the pilot, promote one bounded path, or reject it. No path advances from the pilot to production automatically.

Jira remains the lifecycle source of truth. A repository artifact is a named, immutable technical contract; Confluence is a labeled human-facing projection and never a competing backlog.

## Roles and authority

| Role | Pilot authority |
| --- | --- |
| PO/PM | Approves publication, hierarchy, scope, acceptance criteria, and the one sandbox write intent. |
| BA | Proposes and clarifies context; cannot self-approve publication. |
| DEV | Reads accepted context and records implementation evidence only through an approved transition. |
| QA | Owns the fixture rubric, validates outcomes and audit evidence, and blocks an inconclusive result. |
| Jira/Confluence owner | Provisions the sandbox, controls project/space permission and audit settings, and revokes access on failure. |
| GitHub owner | Creates the sandbox repository, controls repository access, and preserves immutable evidence. |

No pilot identity receives site administration, project administration, field/workflow/scheme administration, production access, or broad write permission merely for agent convenience. Credentials remain in their native local/identity store and are never supplied in chat, repository files, logs, or prompts.

### Direct REST diagnostic OAuth boundary

The direct REST candidate uses an existing named user; no dedicated pilot user exists or will be created. It is approved only as a diagnostic, non-isolated path because that user's Jira permissions may expose projects beyond `G2AS`. Consent must use a resource-level PTE grant with `read:jira-work` only. Do not request any `write:`, `manage:`, or administrative scope; omit `offline_access` unless it receives separate approval.

The client-side endpoint allowlist permits only `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS`. It must not enumerate projects, substitute another project key, use `expand` or `properties`, or call any write endpoint. This client-side diagnostic boundary is not Jira-permission isolation. Any unexpected project visibility, endpoint deviation, unauthorized response, scope expansion, or write capability stops the candidate and rejects promotion.

## Security and recovery contract

Every external write is sandbox-only and requires a specific implementation-plan approval. Before a write, record the actor, target, endpoint, scope, accepted source revision, approval, and endpoint-specific duplicate rule. After a write, record the returned identifier, current-state read-back, audit correlation, and observed result.

`401`, `403`, `404`, `409`, `429`, `5xx`, timeouts, stale context, partial creation, or ambiguous completion stop the candidate path. The operator enumerates current state and makes a visible, source-native correction; no blind replay, silent overwrite, or optimistic Jira transition is permitted. Suspected credential compromise triggers disable/revoke, evidence preservation, scoped impact review, rotation or reissue, and a new approval before resuming.

## Measurements and promotion gate

The baseline and each candidate collect:

- context fidelity and acceptance-criteria quality;
- first-pass implementation, test, and review outcome;
- Jira-to-GitHub traceability completeness;
- read or synchronization latency and freshness;
- permission, rate-limit, partial-write, duplicate, audit, and recovery results;
- human interruptions and approvals;
- actual subscription, credit, or overage signals.

Thresholds are defined only after the baseline cohort reveals its distributions and known bias. Quality and security are non-compensating: any unauthorized or broad write, secret exposure, unapproved egress, duplicate destructive write, false Jira advancement, untraceable critical change, or unresolved recovery gap rejects promotion regardless of speed or cost.

## Acceptance criteria

- The Jira project, Confluence space, and GitHub repository are demonstrably non-production and contain synthetic fixtures only.
- Effective permissions, audit surfaces, owners, and revocation steps are recorded before any identity connects.
- Each read-only path is tested with valid, missing, unauthorized, filtered, stale, rate-limited, and malformed-context fixtures.
- The same Jira-ID fixture is evaluated under Codex, Cursor, and Claude Code with a fixed rubric.
- Any write pilot has its own approved plan and verifies intent, identity, scope, duplicate handling, partial/ambiguous completion, read-back, audit correlation, correction, and rollback or revoke path.
- Results are compared with the manual baseline and retain explicit account, tenant, client, endpoint, hardware, and plan evidence gaps.
- Production, real data, and uncontrolled external writes remain excluded.

## Implementation boundary

This design authorizes planning only. Before provisioning or authenticating, the implementation plan must name the literal external operations, exact targets, actor and credential scopes, expected impact, verification, recovery, and approval checkpoints. Each state-changing operation requires fresh user authorization at execution time.

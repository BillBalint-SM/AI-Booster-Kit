# G2AS sandbox pilot evidence

## Scope

- Jira site: `https://pte-politechnika.atlassian.net`
- Jira project: `G2AS` — provisioned; company-managed Jira Software, empty, with no imported data, Automation, app, or integration; `https://pte-politechnika.atlassian.net/jira/software/c/projects/G2AS/boards/133`
- Confluence space: `Gate 2 AI Sandbox` (`G2AS`) — provisioned; private and empty, with no imported page or attachment; `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/overview`
- GitHub repository: `BillBalint-SM/ultimate-longshot-gate2-sandbox` — provisioned manually; SSH default-branch verification recorded below
- Jira fixture: `G2AS-1` — Story `[G2AS pilot] Show a synthetic health-status badge`, currently `To Do`; `https://pte-politechnika.atlassian.net/browse/G2AS-1`
- Git fixture commit: `d0971f75c526250f9ee65b8b3b044a4788b31a46` on `main`; `docs/fixtures/G2AS-1.md` and `docs/fixtures/G2AS-1.json`
- Confluence projection: `[G2AS-1] Synthetic health-status badge projection`; `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/pages/31752193/G2AS-1+Synthetic+health-status+badge+projection`
- Data classification: synthetic only
- Access: pilot participants and administrators are limited; audit and revocation paths are available.
- Evidence quality: `user-attested, connector-unverified`.
- Key history: `G2AS` superseded the originally planned `G2AI` key through user-provided actual provisioning on 2026-07-27.

## Authority and stop policy

- PO/PM approves publication, scope, acceptance criteria, and every sandbox write.
- BA proposes and clarifies; BA does not self-approve publication.
- QA validates fixture and evidence; inconclusive results do not pass.
- Jira/Confluence and GitHub owners provision, audit, and revoke their boundaries.
- Every remote write requires a separately recorded approval, pre-read, post-read, audit reference, and recovery result.

## Direct REST diagnostic OAuth boundary

- User decision: existing named-user OAuth is approved as a `diagnostic, non-isolated` direct REST path; no dedicated pilot user exists or will be created.
- Consent: resource-level PTE consent with `read:jira-work` only. No `write:`, `manage:`, or administrative scope; no `offline_access` unless separately approved.
- Client allowlist: only `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS`; no project enumeration, another project key, `expand`, `properties`, or write endpoint.
- Limitation: this is a client-side diagnostic boundary, not Jira-permission isolation. The existing user's Jira permissions may expose projects beyond `G2AS`.
- Promotion stop: unexpected project visibility, endpoint deviation, unauthorized response, scope expansion, or write capability stops the candidate and rejects promotion.

## Operation log

| Time | Operation | Target | Actor role | Approval reference | Result | Audit or recovery reference |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-27 | Unexpected sandbox repository creation and failed recovery | `bilisics-balint-gde-mit/ultimate-longshot-gate2-sandbox` | GitHub owner | User authorization 2026-07-27 | Unexpected private repository under an unapproved owner; recovery deletion denied (HTTP 403; missing delete scope) | Verified private/main/zero open issues; remediation requires user decision |
| 2026-07-27 | Approved-owner permission check | `BillBalint-SM/ultimate-longshot-gate2-sandbox` | GitHub owner | Read-only validation | Target absent; current authenticated identity has READ-only access to the existing BillBalint-SM repository and cannot create under the approved owner | Use a GitHub session authenticated as BillBalint-SM or grant an appropriate organization role; do not retry through the current identity |
| 2026-07-27 | Manual approved sandbox repository creation and SSH verification | `BillBalint-SM/ultimate-longshot-gate2-sandbox` | GitHub owner | User confirmation 2026-07-27 | Repository and default branch main verified through the BillBalint-SM SSH identity; private visibility and empty issue-list await owner-native confirmation | SSH git ls-remote evidence recorded; do not use the unrelated gh API identity as a substitute |
| 2026-07-27 | Approved sandbox repository final verification | `BillBalint-SM/ultimate-longshot-gate2-sandbox` | GitHub owner | User authorization 2026-07-27; owner confirmation | Private; default branch main; approved description present; zero open issues; repository URL https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox; README.md exists (84 bytes) | Source-native gh readback under the BillBalint-SM identity; no recovery required |
| 2026-07-27 | Manual Jira and Confluence sandbox provisioning attestation | Jira: `https://pte-politechnika.atlassian.net/jira/software/c/projects/G2AS/boards/133`; Confluence: `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/overview` | Atlassian owner | User authorization and attestation 2026-07-27 | Jira is company-managed Jira Software and empty, with no imported data, Automation, app, or integration; Confluence is private and empty, with no imported page or attachment; pilot participants and administrators are limited; audit and revocation paths are available | User-attested, connector-unverified; the connector rejected the PTE resource request before query execution; no query or write was executed against either sandbox resource. |
| 2026-07-27 | Existing named-user OAuth diagnostic boundary approval | Intended PTE resource and `G2AS` read-only project metadata endpoint | Atlassian owner | User decision 2026-07-27 | Approved as `diagnostic, non-isolated`; client allowlist and stop conditions recorded locally; no OAuth app or token created | Manual OAuth-app setup blocked: browser runtime `EPERM`; user-attested, connector-unverified; no query or write was executed against either sandbox resource. |
| 2026-07-27 | Synthetic Jira Story creation and read-back | `G2AS-1` — `[G2AS pilot] Show a synthetic health-status badge` — `https://pte-politechnika.atlassian.net/browse/G2AS-1` | Atlassian owner | User authorization 2026-07-27 | Created one synthetic Story in `G2AS`; read-back confirmed type `Story`, status `To Do`, the approved synthetic-only brief, and all four acceptance criteria | Source-native Jira UI success notification and issue read-back; no status transition, comment, link, attachment, automation, app, webhook, integration, or recovery action; Jira remains lifecycle truth. |
| 2026-07-27 | Synthetic Git fixture commit and push with read-back | `BillBalint-SM/ultimate-longshot-gate2-sandbox` — commit `d0971f75c526250f9ee65b8b3b044a4788b31a46` on `main`; `docs/fixtures/G2AS-1.md`, `docs/fixtures/G2AS-1.json` | GitHub owner | User authorization 2026-07-27 | Added exactly two synthetic fixture files; commit message `docs: add G2AS-1 synthetic fixture context`; commit and both paths were read back from the repository | Source-native Git/GitHub read-back confirmed the immutable SHA and paths; no production, customer, personal, credential, deployment, issue, or workflow data; no recovery required. |
| 2026-07-27 | Private G2AS Confluence projection publication and read-back | `[G2AS-1] Synthetic health-status badge projection` — `https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/pages/31752193/G2AS-1+Synthetic+health-status+badge+projection` | Atlassian owner / Confluence space owner | User authorization 2026-07-27 | Published in the `Gate 2 AI Sandbox` space; body begins `Projection of G2AS-1; Jira is lifecycle truth.` and contains the Jira link, Git SHA, fixture paths, owner role, and synthetic-only marker | Source-native Confluence read-back confirmed the page and content. Access read-back displayed `Anyone in the space can edit`; the space remains user-attested private and no broader site/public access was granted. Recovery is limited to separately audited removal of this new synthetic page. |

| 2026-07-27 | Task 6 source-native manual baseline read-back | `G2AS-1`; Git commit `d0971f75c526250f9ee65b8b3b044a4788b31a46`; labelled Confluence projection URL above | Human QA/read-only verifier | User continuation of approved Gate 2 plan 2026-07-27 | Context-fidelity PASS: Jira key, accepted summary, four acceptance criteria, immutable Git SHA, fixture paths, and Confluence projection were recovered through Jira UI, Git/GitHub source-native read-back, and Confluence UI. Latency was not measured; no human interruption was required. | Read-only source-native observations; no source state change and no recovery required. |
| 2026-07-27 | Task 6 direct REST valid-context retrieval candidate | `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS` and approved diagnostic read path | Direct REST diagnostic client | Task 4 user decision 2026-07-27 | BLOCKED / NOT EXECUTED: manual OAuth-app setup remains blocked by browser runtime `EPERM`; no OAuth app/token or direct REST query exists. This is not a source response and no success is inferred. | No query or write was executed; do not substitute another identity or broaden scope. |
| 2026-07-27 | Task 6 direct REST negative/error cases | Approved diagnostic path for unknown key, unauthorized/filtered target, and rate/error handling | Direct REST diagnostic client | Task 4 user decision 2026-07-27 | NOT EXECUTED: the approved identity is unavailable, so unknown-key, unauthorized, and rate/error endpoint cases were not exercised. They remain evidence gaps, not passes or failures. | No endpoint call, retry, write, or recovery action occurred; promotion remains blocked for this path. |
| 2026-07-27 | Task 6 local malformed machine-context fixture | Local validation-only copy of the synthetic `G2AS-1.json` context | Human QA/read-only verifier | User continuation of approved Gate 2 plan 2026-07-27 | PASS: malformed JSON was rejected locally before any source operation; classified `MALFORMED_CONTEXT`, not treated as usable context. | Local-only validation; no external state change and no recovery required. |
| 2026-07-27 | Task 6 local stale Git-reference fixture | Local test note using an intentionally outdated SHA compared with recorded `d0971f75c526250f9ee65b8b3b044a4788b31a46` | Human QA/read-only verifier | User continuation of approved Gate 2 plan 2026-07-27 | PASS: mismatch classified `STALE_CONTEXT`; recorded immutable SHA remained authoritative and no branch-head substitution was used. | Local-only comparison; no external state change and no recovery required. |
| 2026-07-27 | Task 6 no-source-state-change verification boundary | Jira issue history, Confluence version history, Git commit history, and Rovo activity surfaces | Human QA/read-only verifier | User continuation of approved Gate 2 plan 2026-07-27 | PASS by bounded scope: Task 6 performed no Jira transition/edit/comment/link, Confluence publication, Git commit/push, Rovo action, identity change, or integration change. | Evidence is source-read-back plus local audit; no recovery required. |

## Baseline chronology addendum (Task 5)

- The `private and empty` Confluence scope statement above is the 2026-07-27 preflight/user-attested baseline recorded before Task 5 fixture publication; it is not a claim that the space remained empty afterward.
- Task 5 subsequently published the single synthetic projection page recorded in the final operation-log row. The current state therefore includes that page in the otherwise private `G2AS` space; no broader site/public access was granted.

## Task 6 review-fix addendum

- Observed at `2026-07-27T15:58:19+02:00` by `Codex desktop / in-app Browser tab 1 + local PowerShell verifier`; reliable elapsed time was not measured.
- The recovered Jira acceptance criteria were: (1) render `Healthy`, `Degraded`, and `Unavailable`; (2) keep state-to-label mapping deterministic and covered by tests; (3) expose an accessible label for the rendered status; (4) link the repository artifact and test result before `Review`.
- Local malformed-context input was a JSON copy with a trailing comma after `"synthetic": true`; it was rejected as `MALFORMED_CONTEXT` before any source operation. Local stale-context input used SHA `0000000000000000000000000000000000000000` versus authoritative `d0971f75c526250f9ee65b8b3b044a4788b31a46`; it was classified `STALE_CONTEXT` without branch-head substitution.
- Before/after boundary evidence: before Task 6, the source-native Task 5 read-back showed Jira `G2AS-1` in `To Do`, the published Confluence projection at the recorded URL, and Git `HEAD` at the recorded SHA; after Task 6, no source call capable of changing state was made and no new Jira status/history event, Confluence publication/version, or Git commit/push was produced. Rovo remained `connector-unverified`; no activity query was executed.
- Verification clarification: `git diff --check` covered tracked local changes; untracked Task 6 files were separately inspected with `git diff --check --no-index`/content checks and the focused secret scan. No whitespace error or secret-like value was found.

## Task 7 operation/read-back addendum

| 2026-07-27T16:05:46+02:00 | Codex-side Rovo fixed-prompt read-only probe | Approved PTE/G2AS `G2AS-1` context only | Codex desktop / Atlassian Rovo connector | Task 7 continuation of Write-blocked Rovo read-only plan | `SCOPE_VIOLATION_STOP`: the exposed search surface did not honor the approved PTE/G2AS target boundary and returned unrelated results from another Atlassian cloud. No returned content or cloud/account identifier is recorded or reused. | No write, retry, alternate identity, permission broadening, or further Rovo call; candidate rejected for promotion and incident retained as sanitized evidence. |
| 2026-07-27T16:05:46+02:00 | Cursor fixed-prompt Rovo host comparison | Approved PTE/G2AS `G2AS-1` context only | Cursor host | Task 7 continuation of Write-blocked Rovo read-only plan | `NOT AVAILABLE`: Cursor is not connected in this execution environment; no query or source access was attempted. | No external operation or recovery action. |
| 2026-07-27T16:05:46+02:00 | Claude Code fixed-prompt Rovo host comparison | Approved PTE/G2AS `G2AS-1` context only | Claude Code host | Task 7 continuation of Write-blocked Rovo read-only plan | `NOT AVAILABLE`: Claude Code is not connected in this execution environment; no query or source access was attempted. | No external operation or recovery action. |
| 2026-07-27T16:05:46+02:00 | Task 7 promotion and write boundary | PTE/G2AS Rovo path | QA/security verifier | Task 7 continuation of Write-blocked Rovo read-only plan | REJECTED: PTE remains `user-attested, connector-unverified`; the scope-violation stop prevents any host result from being treated as a valid PTE retrieval. No Rovo Write, Jira transition, comment, link, Confluence update, Git write, retry, or alternate identity was used. | Stop condition is active; remediation requires a separately approved connector target-isolation investigation before any rerun. |

## Task 8 prepared write contract

- Target: `G2AS-1`; one Jira remote/web link only, to the immutable Git commit URL recorded in the Task 8 brief.
- Actor/scope: authenticated Atlassian owner in the visible Jira browser session, minimum existing issue-link permission, no new identity/token/app/integration.
- Duplicate/recovery: pre-read exact URL; write once only if absent; post-read Jira issue/history; remove only that exact new link after separate owner approval if recovery is needed.
- Status: contract executed and read back successfully; the only Task 8 source change is the approved remote/web link recorded in the execution addendum below. No transition, field edit, comment, attachment, Automation, or Rovo Write occurred.

## Task 8 execution/read-back addendum

| 2026-07-27T14:28:12Z | Task 8 approved Jira remote/web link write and read-back | `G2AS-1` — `https://pte-politechnika.atlassian.net/browse/G2AS-1`; Git commit URL `https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox/commit/d0971f75c526250f9ee65b8b3b044a4788b31a46` | Atlassian owner / Codex visible browser session | User authorization 2026-07-27, exact target/action/URL and prohibited-operation boundary | PASS: exact-URL pre-read returned `0`; one source-native Jira `Add web link` submission succeeded; issue read-back showed the exact URL; History read-back showed exactly one matching `RemoteWorkItemLink` event for the Git `Web Link`; status remained `To Do` | Jira Web links and Activity/History read-back; Jira renders two anchors for the single link record (title and URL presentation); no retry or recovery write; no status, field, comment, attachment, Automation, or Rovo Write action. |

- Task 8 recovery was not exercised because the write response and history read-back were unambiguous. Removing the link remains a separate, owner-approved recovery action and was not performed.

## Task 9 scorecard and decision

**Evaluation date:** 2026-07-27
**Decision basis:** Tasks 1–8 evidence above, source-native read-backs, the Gate 1 scorecard definition, and the recorded stop conditions.

### Cohort and comparison limits

- Comparable manual/source-native baseline: `n=1` accepted synthetic Jira fixture (`G2AS-1`).
- Direct REST diagnostic retrieval: `n=0`; the OAuth app setup was blocked by browser-runtime `EPERM`, so no endpoint response exists.
- Valid Rovo retrieval: `n=0`; one Codex-side probe was stopped on `SCOPE_VIOLATION_STOP` and is not a successful retrieval observation.
- Cursor and Claude Code host comparison: `n=0`; neither host was connected in this execution environment.
- Separate bounded Jira web-link write: `n=1`; it is not a comparable read-path or implementation cohort.
- No percentage improvement, latency distribution, quality ranking, or cost advantage is claimed. Missing, denied, stopped, and not-executed events remain explicit evidence gaps.

### Evidence scorecard

| Dimension | Recorded result | Numerator / denominator or duration | Cohort, exclusions, and known bias |
| --- | --- | --- | --- |
| Specification completeness | `unknown` | Not established | The accepted synthetic brief was read back, but the Gate 1 completeness rubric was not independently scored at the approval event. |
| Acceptance-criteria quality | `unknown` | Not established; criterion-level independent review was not run | Four acceptance criteria were recovered, but presence is not semantic quality and there is no independent reviewer result. |
| First-pass correctness | `unknown` | `0/0` implementations entered `Review` | No implementation or corrective cycle occurred; the Jira Story remained `To Do`. |
| Test/review success | `unknown` | `0/0` required test/review conclusions | No implementation test result or review conclusion was produced. |
| Lead-time / speed | `unknown` | No reliable start-to-conclusion duration or distribution | One Task 6 observation timestamp exists, but planning, development, and closure event boundaries were not instrumented. |
| Jira freshness / sync freshness | `unknown` | No checkpoint-window numerator/denominator | Manual read-back recovered current source state; latency was explicitly not measured and no synchronization event was exercised. |
| Autonomous completion / human interruption | `not comparable` | Manual baseline: `0` unplanned interruptions observed; autonomous numerator/denominator not applicable. Rovo: `0/1` probes completed, stopped by the scope guardrail. | Mandatory user approvals are part of the contract, not a friction score. The stopped Rovo probe is a guardrail event, not a quality cohort result. |
| Traceability | `partial, source-native` | Core artifact chain: `1/1` Jira issue, immutable Git SHA, fixture paths, and labelled Confluence projection recovered; implementation/test/review/closure links: `0/0` because no implementation cohort exists | The single Jira web link was verified by exact URL and one history event. Confluence is a projection, not a competing lifecycle source. |
| Actual subscription / credit / cost signal | `unknown` | No account usage, credit, overage, or billing event recorded | Public pricing or token estimates were not substituted for account evidence; no new paid service or API path was enabled. |
| Security and auditability | `guardrail stop; no promotion` | Confirmed scope-boundary violation: `1` Rovo probe stopped; confirmed unauthorized/broad write, secret exposure, duplicate destructive write, and false Jira advancement: `0` observed | The Rovo result came from an unrelated Atlassian cloud and was not reused. Task 8 has one matching history event and Jira remained `To Do`. Confluence `Anyone in the space can edit` remains an owner review item. |

### Route disposition

| Route | Decision | Evidence and boundary |
| --- | --- | --- |
| Manual source-native Jira/Git/Confluence path | `retain` | It recovered the accepted Jira context, immutable Git reference, and labelled Confluence projection without an unapproved read-path write. Jira remains lifecycle truth. |
| Direct Jira REST diagnostic path | `narrow` / `remediate` | Keep only the recorded single-project `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS` allowlist and `read:jira-work` boundary. Do not promote until OAuth setup is available and valid, unknown-key, unauthorized/filtered, rate/error, and audit cases are exercised. No app or token currently exists. |
| Atlassian Rovo search path | `reject current route` / `remediate` | The target-isolation stop rejects the current candidate. No retry, alternate identity, permission expansion, or Rovo Write is allowed before a separately approved PTE-cloud and `G2AS` isolation remediation. |
| Single Jira web-link write contract | `retain as bounded one-off` | Exact pre-read, one write, post-read, and one matching history event succeeded. This does not promote general agent write autonomy or Jira status advancement. |
| Confluence space permission model | `remediate` | Review the inherited `Anyone in the space can edit` state with the space owner. Any change requires separate approval, source-native audit, and a recoverable correction path. |

### Non-compensating guardrail result

- No confirmed unauthorized or broad write, secret exposure, duplicate destructive write, or false Jira advancement was recorded.
- The Rovo target-boundary violation is a confirmed candidate stop. The operator stopped immediately, retained only sanitized evidence, and did not retry or broaden access. Owner remediation is Atlassian connector/configuration ownership; no new Rovo write capability was enabled.
- The direct REST identity was never created, so there is no token to revoke. Before any repeat, the Atlassian owner must verify the status of the existing connector access and apply the approved target-isolation remediation; this owner action was not executed in this local documentation step.
- The Confluence permission review remains open. It is not silently treated as acceptable evidence for promotion.

### Explicit decision and bounded next step

**Overall decision: `remediate and repeat`.** Retain the manual source-native path for the current workflow. Do not promote Rovo or direct REST. A repeat is allowed only after target isolation is proven, the optional read-only OAuth diagnostic is repaired without widening scope, the Confluence permission review is closed, and a fixed read-only cohort is run across the available hosts with latency, freshness, interruption, audit, and actual usage evidence. No production integration, new identity, paid service, Rovo Write, or additional Jira write is authorized by this decision.

The next approval request must name the exact connector target-isolation change and its owner. No Rovo rerun, OAuth scope expansion, permission expansion, or recovery write is permitted before that approval.

## Local operating-model implementation handoff

- Domain-independent agent core: [`docs/operations/agent-operating-model.md`](../operations/agent-operating-model.md).
- Jira/Git/Confluence domain adapter: [`docs/operations/jira-git-confluence-adapter.md`](../operations/jira-git-confluence-adapter.md).
- Synthetic research/validation contract: [`docs/operations/g2as-research-validation-runbook.md`](../operations/g2as-research-validation-runbook.md).
- Layer-separation plan: [`docs/superpowers/plans/2026-07-27-layer-separation-common-core.md`](../superpowers/plans/2026-07-27-layer-separation-common-core.md).
- The core implements domain-independent coordination patterns and clean-context handoff; the adapter implements Jira/Git/Confluence source behavior. Neither grants authority or proves runtime behavior.
- The strong single-agent pattern is the first operational model to validate against a measured baseline. Sequential, parallel, loop, router, aggregator, hierarchical, and network patterns remain selectable patterns requiring task-specific evidence; host adapters and domain workflows come later.
- Current evidence still leaves Atlassian target isolation, direct REST/OAuth, Rovo, latency/freshness, cost, and Cursor/Claude Code host behavior unvalidated. The local contracts were implemented without changing source state.
- The layer-separation correction was local documentation only; at that milestone, host-native adapters and team activation files were the next separate slice.

## Host-native activation handoff

The next documentation milestone is complete and is recorded in the [host-native adapters and team activation plan](../superpowers/plans/2026-07-27-host-native-adapters-team-activation.md). It includes the [Codex adapter](../operations/host-adapters/codex.md), [Cursor adapter](../operations/host-adapters/cursor.md), [Claude Code adapter](../operations/host-adapters/claude-code.md), and [team activation guide](../operations/team-activation-guide.md).

The adapters map the common core to native instruction, rules, memory, sub-agent, tool, and enforcement surfaces. They do not prove that a host loaded the guidance, do not install or enable a capability, and do not grant Jira, Git, Confluence, connector, or cloud authority. A comparable host run remains a future validation task.

The approved follow-up is documented in the [three-host read-only conformance pilot plan](../superpowers/plans/2026-07-27-host-conformance-pilot.md), with the [frozen protocol](../operations/host-conformance-pilot.md) and [per-host evidence template](../operations/host-conformance-evidence-template.md). Until the actual runs are completed, Codex, Cursor, and Claude Code runtime behavior remains `NOT EXECUTED` rather than inferred.

The first Codex CLI run is now recorded as [bounded conformance evidence](../operations/host-conformance-runs/codex-2026-07-27.md). Its result is `FAIL`, not a product-wide conclusion: the read-only local task completed, while native instruction loading stayed `UNKNOWN`, the initial Windows sandbox spawn failed before elevated retry, and the response did not explicitly map all four layers.

The v2 remediation attempt is recorded in [Codex v2 bounded evidence](../operations/host-conformance-runs/codex-2026-07-27-v2.md). It correctly returned task status `BLOCKED` without retry/elevation, but the startup plugin-catalog network attempt and repeated Windows sandbox spawn failure make the full local-only conformance result `FAIL`. Further host execution remains blocked pending runtime-boundary remediation.

The [Codex runtime-boundary diagnostic](../operations/host-conformance-runs/codex-runtime-boundary-diagnostic-2026-07-27.md) confirms that the operator's current local defaults are broader than the pilot boundary. This is machine-local evidence only; no global config, permission, plugin, hook, credential, or external source state was changed.

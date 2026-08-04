# Project System Map v1

**Date:** 2026-08-04
**Boundary:** local repository and the read-only Codex global Agent inventory
**Authority:** READY_WITH_LIMIT for the map and catalog projection; NEEDS_EVIDENCE for product/market readiness; no host activation, connector operation, UA/Graphify sync, or publication was performed.

This is a decision-support artifact for the first formation round. It does not
replace docs/project/current-state.md, the roadmap, a contract, or the user's
authority as Vision Owner.

## 1. Mission and decision

The mission is to turn the human-owned vision into a valuable, usable, and
marketable product while removing work rules that consume time or attention
without producing outcome or risk reduction. The local repository already has
a coherent contract/workflow foundation, but documentation, local tests, and
Agent catalog coverage do not prove customer value, willingness to pay, host
execution, or production readiness. The product/market claim therefore remains
NEEDS_EVIDENCE; the next executable gate is the actual Personal Operations &
Rule Audit, followed by one evidence-gated MVP slice
(docs/operations/outcome-operating-audit-v1.md:8-25,197-220,327-363).

## 2. Formation projection from the global Agent inventory

The read-only projection of C:\Users\littl\.codex\agents found **70 Agents,
16 Roles, and 88 assignments**. Coverage status is READY: no unassigned
Agents, unknown or uncovered Roles, duplicate assignments, lead conflicts,
context violations, handoff violations, or shared-write violations were
reported. This is a static catalog result, not proof that a host can load or
execute these profiles.

### 2.1 The two requested composite Roles

| Role | Lead Agent | Supporting Agents in current catalog | Output / handoff |
| --- | --- | --- | --- |
| **Project Systems Architect** | agents-orchestrator | specialized-workflow-architect, engineering-software-architect, plus architecture specialists | architecture-and-workflow-contract → bounded execution map |
| **Documentation & Business Analysis** | engineering-technical-writer | document generator, executive summary, analytics, email intelligence, resume, data visualisation | normalized-requirements-packet → source-normalized evidence packet |

The first Role currently has the workflow and software architecture portions,
but the requested four-part composite is not yet represented as one explicit
formation: project-manager-senior is assigned to Delivery, and
specialized-codebase-archaeologist is assigned to Delivery and Debugger
(contract/agent-library/role-catalog.md:214-224,251-271). The exact desired
composition is therefore a catalog gap, not a missing Agent:

~~~text
Project Systems Architect (one formation, one lead, isolated contexts)
├─ Senior Project Manager          project-manager-senior
├─ Software Architect              engineering-software-architect
├─ Workflow Architect              specialized-workflow-architect
└─ Codebase Archaeologist          specialized-codebase-archaeologist
~~~

The Documentation & Business Analysis Role already has the Technical Writer
lead. “Business Analyst” is currently a capability in the Role contract, not a
named Agent/profile; the formation should decide whether that is intentionally
covered by the lead or needs an explicit contributor. Every contributor must
keep an isolated context and hand off through the Role artifact; no contributor
may silently become a second owner.

### 2.2 Six-role operating formation

The two Roles above are the first audit pair. The minimum product formation also
needs Product & Market Owner (product-manager lead), Delivery / Technical Lead
(project-manager-senior lead), Personal Operations & Rule Auditor
(operations-manager lead), and milestone-level Reality / Quality Gate
(testing-reality-checker lead). Their contracts, required evidence, and stop
conditions are declared in contract/agent-library/role-catalog.md:1-83.

The Vision Owner remains the final decision-maker. Agents may produce evidence,
alternatives, and consequences; they may not silently change the vision,
product boundary, or acceptance criteria
(docs/superpowers/specs/2026-08-04-outcome-operating-audit-design.md:24-36).

## 3. Project System Map

~~~mermaid
flowchart TD
    V["Vision Owner: goal and final decisions"]
    O["Personal Operations & Rule Audit<br/>KEEP / MERGE / REMOVE_CANDIDATE / UNKNOWN"]
    P["Product & Market Owner<br/>target, pain, promise, MVP, metrics, stop-if"]
    D["Documentation & Business Analysis<br/>terms, requirements, source normalization"]
    A["Project Systems Architect<br/>goal → roadmap → contracts → workflows → code → tests"]
    T["Delivery / Technical Lead<br/>one vertical implementation slice"]
    Q["Reality / Quality Gate<br/>positive + negative proof, residual risk"]
    C["Canonical contracts and artifacts<br/>Markdown + typed schemas"]
    W["Team Delivery Loop<br/>intake → recommendation → checkpoint → handoff"]
    K["Controller and CLI<br/>validate / recommend / prepare / save / resume"]
    E["Local evidence<br/>tests, read-back, hashes, status"]
    X["Optional external boundary<br/>connectors / sync / host execution"]
    S["STOP / UNKNOWN / NEEDS_EVIDENCE<br/>no silent promotion"]

    V --> O
    O --> P
    P --> D
    D --> A
    A --> C
    C --> W
    W --> K
    P --> T
    A --> T
    T --> E
    E --> Q
    Q -->|accepted local evidence| V
    K -->|only separately authorized| X
    C --> S
    W --> S
    K --> S
    Q --> S
~~~

### 3.1 Responsibility and source boundaries

- **Vision / outcome:** human-owned; the roadmap records platform direction and
  milestone intent (docs/project/roadmap.md:9-32,98-124,387-421).
- **Current delivery state:** docs/project/current-state.md:3-17,18-37,39-56,58-69,71-87;
  it is the operational routing source, not a second roadmap.
- **Workflow and ownership:** workflows/team-delivery-loop.md:3-9,11-22,46-72,82-118,134-168.
  The Outcome Owner controls goal, priority, scope, acceptance, and external
  commitments; the Controller owns routing and checkpoint state.
- **Contracts and domain model:** contract/team-contract.md:39-58,
  contract/lifecycle.md:3-27,29-50, src/domain/model.ts:19-109, and typed
  schemas under src/domain and src/context.
- **Agent / Role / Formation projection:** catalog files under
  contract/agent-library/, parsed by src/controller/agent-profile.ts,
  src/controller/agent-role.ts, and src/controller/formation.ts. It is
  recommendation-only and host-agnostic.
- **Implementation and proof:** src/controller, src/orchestrator, src/events,
  src/evidence, src/readiness, and test/. A passing local test is local
  evidence, not external or production proof.
- **External boundary:** contract/mappings/jira-confluence-github.md and
  connector/orchestrator code define a deny-by-default, approval/read-back
  boundary; no operation was executed in this round.

## 4. Source-of-Truth matrix

| Question / decision | Canonical source and fields | Dependent projections | Current evidence and owner | Conflict or unknown |
| --- | --- | --- | --- | --- |
| Platform direction | docs/project/roadmap.md:9-32,98-124,387-421 | README.md:12-22,50-64; current-state; marketing/site | Local intent; Vision Owner + Architect | README's older M4 summary differs from current-state's Personal Operations next action |
| What is true now? | docs/project/current-state.md:3-17,18-37,39-56,58-69,71-87 | README and roadmap status summaries | Local routing; Delivery Lead + Reality Gate | Must be re-preflighted at every delivery boundary |
| Recurring team workflow | workflows/team-delivery-loop.md:3-9,11-22,46-72,82-118,134-168 | formation recipes, Controller, website copy | Local workflow contract; Outcome Owner + Controller | Website recipe names are not canonical IDs |
| Lifecycle and artifact guarantee | contract/team-contract.md:39-58; contract/lifecycle.md:3-27,29-50; src/domain/model.ts:19-60 | generated host adapters and templates | Local validators; Contract maintainer | Generated projections are non-authoritative and can drift |
| Host capability / authority | contract/capability-matrix.md:3-18; contract/team-contract.md:15-36; src/contract/compile.ts:48-91 | contract/adapters/*.md, host templates | Local compiler only; native host unknown | requires_approval vs supported_with_limits vs Codex supported conflict |
| Global Agent inventory | C:\Users\littl\.codex\agents via src/controller/agent-inventory.ts:29-80 | profile catalog and CLI projection | 70 TOML profiles; inventory source | Freshness and native host loading remain unknown |
| Role and coverage | contract/agent-library/role-catalog.md:1-44,214-290; src/controller/agent-role.ts:154-252 | CLI matrix and formation bindings | 16 Roles / 88 assignments / READY structural coverage | Requested four-agent Project Systems composite is not explicit |
| Formation scenarios | contract/agent-library/formation-catalog.md:1-44,45-87,170-255 | recommendation CLI and website | local recommendation-only | Static site aliases and debugging copy are not aligned to canonical IDs/boundary |
| Product / market thesis | docs/operations/outcome-operating-audit-v1.md:49-76,78-106,327-363 | audit design :24-54, marketing and site | NEEDS_EVIDENCE; Vision Owner + Product Owner | no validated target, pain, differentiation, payment/adoption, or retention evidence |
| Marketing / price / metrics | marketing/README.md:27-45,47-61; marketing/brand-prototype.md:22-70,301-358 | website/app/page.tsx, rendered HTML tests | prototype hypotheses only | EUR19 and “LIVE VIEW READY” are not payment/runtime proof |
| Optional synchronization | contract/mappings/jira-confluence-github.md:1-36 | connectors, readiness, outbox | not executed; no authority | placeholders and native links intentionally unresolved |

## 5. Full workflow and dependency map

### 5.1 Dependency order

~~~text
canonical contract + roadmap + current-state
        ↓
Personal Operations evidence ──(must pass before MVP)──┐
        ↓                                               │
Product / market hypothesis + stop-if                 │
        ↓                                               │
Documentation normalization + source register         │
        ↓                                               │
Project Systems map + exact role formation              │
        ↓                                               │
accepted outcome + implementation packet               │
        ↓                                               │
Delivery vertical slice → tests / negative tests       │
        ↓                                               │
Reality / Quality Gate ──fail/unknown → STOP           │
        ↓                                               │
local evidence + current-state read-back               │
        ↓                                               │
separately authorized host or external operation only ─┘
~~~

### 5.2 Happy path and handoffs

1. Intake validates goal, scope, context, constraints, and required evidence;
   the Controller recommends a bounded formation.
2. The human checkpoint accepts, selects an alternative, or chooses no Agent.
   No Agent is activated by recommendation alone
   (workflows/team-delivery-loop.md:11-44,100-119).
3. Personal Operations records each actual rule/habit as KEEP, MERGE,
   REMOVE_CANDIDATE, or UNKNOWN; the MVP stays paused until this evidence
   exists (docs/operations/outcome-operating-audit-v1.md:197-220).
4. Product & Market Owner produces one target/problem/value hypothesis, one
   bounded MVP, non-goals, metrics, and stop-if conditions.
5. Documentation & Business Analysis normalizes terms and traces every
   requirement and decision to a canonical source.
6. Project Systems Architect produces the dependency/ownership map and a
   formation-aware implementation boundary.
7. Delivery / Technical Lead converts the accepted outcome into one vertical
   slice with test, release, and rollback evidence.
8. Reality / Quality Gate checks behavior, negative paths, security/limits, and
   source read-back. Only a supported verdict may return to the Vision Owner.
9. Host activation, connector calls, external reads/writes, or publication are
   separate operations with exact target, authority, and native read-back.

### 5.3 Stop, failure, and recovery paths

Stop on missing or stale input, conflicting goals, unknown capability or
authority, dirty-state conflict, target mismatch, unsupported transition,
failed negative test, ambiguous result, partial completion, read-back mismatch,
or unproven market/customer claim (contract/team-contract.md:39-58,
contract/lifecycle.md:13-19, workflows/team-delivery-loop.md:134-168).

Recovery preserves evidence and state: activation setup/rollback snapshots,
idempotent Personal/Team storage, session revalidation, append-only outbox
boundaries, and explicit stop handling are implemented in
src/controller/types.ts:396-423, src/controller/activation-storage.ts:10-35,37-67,70-175,
src/context/resume.ts:5-41,75-114, src/events/outbox.ts:71-145, and
src/orchestrator/stop.ts:96-141. A stop is not a request to retry, broaden
scope, or apply a compensating write.

## 6. Documentation redundancy and contradiction ledger

| ID | Priority | Finding | Exact evidence | Smallest safe action | Verification condition |
| --- | --- | --- | --- | --- | --- |
| DOC-01 | P0 | Branch model conflicts: lean main ← dev-<scope> is current, while old M2/M3 plans/specs still require dev → feature → main. | docs/runbooks/branching.md:1-43; docs/project/current-state.md:13-16; docs/superpowers/specs/2026-08-02-ai-booster-kit-m2-m3-activation-session-design.md:236-243; docs/superpowers/plans/2026-08-04-m3-readiness-gap-closure.md:13,49; docs/superpowers/plans/2026-08-02-ai-booster-kit-m2-activation-boundary.md:22-30 | Mark executed artifacts SUPERSEDED and link the canonical runbook, or archive under docs/history/. | rg finds no active instruction requiring a feature branch; check:docs passes. |
| DOC-02 | P0 | Capability authority has three states for the same Codex path. | contract/team-contract.md:15-36; contract/capability-matrix.md:3-18; src/contract/compile.ts:48-91; contract/adapters/codex.md:31-39 | Decide whether supported is local compiler support only; align matrix, contract, and generated projection without claiming native host support. | Contract/projection tests and regenerated read-back agree; native execution remains UNKNOWN. |
| DOC-03 | P0 | Personal audit plan marks a ready-for-review gate although actual rule/habit observation is unchecked. | docs/superpowers/plans/2026-08-04-outcome-operating-audit.md:79-88,123-129; docs/operations/outcome-operating-audit-v1.md:197-220 | Keep the gate PARTIAL/NOT READY until one evidence row exists for each real rule candidate. | Inventory has goal, result, cost, evidence, and decision; independent read-back confirms no silent removal. |
| DOC-04 | P0 | Product/market language can be read as proof although target, pain, payment, and adoption evidence are absent. | docs/operations/outcome-operating-audit-v1.md:49-76,327-363; marketing/brand-prototype.md:301-358; website/tests/rendered-html.test.mjs:26-63 | Retain NEEDS_EVIDENCE; label price, positioning, and static render claims as hypotheses/smoke evidence. | One discovery/pilot and an adoption/payment test are recorded before market-ready wording. |
| DOC-05 | P1 | Publication commands in executed-looking plans/runbooks conflict with explicit approval boundary. | AGENTS.md:101-105; docs/superpowers/plans/2026-08-01-ai-booster-kit-m1-b-scenario-recommendation.md:74,84; docs/superpowers/plans/2026-08-01-ai-booster-kit-m1-readiness-cli-integration.md:52,58; docs/runbooks/mapper-snapshot.md:55-67 | Mark plans historical/post-approval procedures and add an approval precondition to the mapper runbook. | No active plan/runbook contains unconditional commit, push, PR, or merge authorization. |
| DOC-06 | P1 | Historical adapter evidence is labelled as current status. | docs/operations/jira-git-confluence-adapter.md:50-65; docs/project/current-state.md:45-48,60-68 | Qualify it as dated synthetic evidence and non-promotion, or move under docs/history/. | Adapter, current-state, and readiness runbook use the same status and links resolve. |
| DOC-07 | P1 | Executed plans/specs remain in active directories without lifecycle status, despite the archive rule. | AGENTS.md:184-186; docs/project/documentation-map.md:30-33,58-66; e.g. docs/superpowers/plans/2026-08-03-ai-booster-kit-m3-session-context.md:18-22 | Add ACTIVE / EXECUTED / SUPERSEDED plus source revision, or archive completed artifacts. | Active index contains only current work; obsolete documents cannot be mistaken for instructions. |
| DOC-08 | P1 | Website recipe aliases and status text do not map cleanly to canonical formation IDs or authority. | website/app/page.tsx:22-33,53-64; contract/agent-library/formation-catalog.md:45-255; website/tests/rendered-html.test.mjs:26-43 | Add a canonical ID/alias map and replace runtime-looking wording with recommendation-only wording. | Static render test covers canonical IDs/boundaries; no claim of activation or outcome evidence. |
| DOC-09 | P1 | Documentation CI semantics are split: a docs-only link check is lightweight while old plans require build-coupled checks. | package.json:9-14; .github/workflows/ci.yml:3-11; .github/workflows/docs.yml:1-27; docs/superpowers/plans/2026-07-29-documentation-github-structure.md:96 | Mark old plan historical and state that docs-only checks are sufficient for link-only changes; code changes still use full CI. | YAML parses; docs-only PR runs check:docs; code PR/main runs full CI. |
| DOC-10 | P1 | Current audit report's changed-file snapshot is stale relative to the active dirty worktree. | docs/operations/outcome-operating-audit-v1.md:276-286; current preflight and git status --short | Record that the snapshot is point-in-time and regenerate only at the next delivery boundary. | Preflight and status output are captured immediately before any publication decision. |
| DOC-11 | P2 | Current-state/README/documentation-map/roadmap routing rule repeats across global and project instructions. | AGENTS.md:179-192; README.md:20-22,74-78; docs/project/documentation-map.md:3,19-33,58-71; docs/project/roadmap.md:402-417; audit :179-181 | Keep the normative rule in the project instruction and current-state/map; replace other prose with links. | One canonical rule, no changed behavior, link check passes. |
| DOC-12 | P1 | Gate-2 design contains literal external target data in an active-looking, not-yet-reviewed spec. | docs/superpowers/specs/2026-07-27-gate-2-jira-sandbox-pilot-design.md:3-4,15-22; docs/gate-2/atlassian-oauth-read-only-preflight.md:3-4 | Mark target docs HISTORICAL/NOT EXECUTED and sanitize/archive target-specific designs. | Active-source scan contains no literal tenant/target unless an approved operation names it. |
| DOC-13 | P1 | Marketing copy is behind the canonical local product surface on debugging and M3 persistence. | marketing/brand-prototype.md:49-60,163-174; contract/agent-library/formation-catalog.md:47,90,129,172,215; docs/project/current-state.md:27-31,60-63 | Update copy to distinguish READY bounded debugging from future tooling and local persistence from host execution, or mark it a pre-M3 snapshot. | Marketing, catalog, and current-state use the same status vocabulary and boundary. |
| DOC-14 | P0 | The new docs-only mapper policy was documented before the checker had an explicit non-mapper allowlist. | docs/runbooks/mapper-snapshot.md:43-53; docs/project/current-state.md:43-44; scripts/check-mapper-freshness.mjs:46-59,66-87 | Keep mapper freshness strict for source/snapshot changes, but allow only documented Markdown, workflow, package metadata, and docs-link-check paths. | Synthetic docs-only changes pass; a mapper-relevant source change still fails closed; runbook/current-state/script agree. |

## 7. Prioritized cleanup backlog

### P0 — must precede MVP implementation

1. **Execute the real Personal Operations & Rule Audit.** Input: the user's
   actual written and unwritten rules/habits. Output: one row per rule with
   goal, result, cost, evidence, replacement control, and a decision. Files:
   docs/operations/outcome-operating-audit-v1.md:197-220 and the unchecked
   plan gate docs/superpowers/plans/2026-08-04-outcome-operating-audit.md:79-88.
   Acceptance: no MERGE/REMOVE_CANDIDATE is promoted without evidence and
   independent read-back; no new ceremony is introduced just to measure old
   ceremony.
2. **Resolve the capability truth conflict (DOC-02).** Owner: Project Systems
   Architect + Reality Gate. Acceptance: team contract, capability matrix,
   compiler, and Codex projection state the same local-vs-native boundary;
   native host remains UNKNOWN until host evidence exists.
3. **Validate the product/market hypothesis.** Owner: Vision Owner + Product &
   Market Owner. Acceptance: named first target, painful problem, promise,
   differentiation, one discovery/pilot signal, adoption/payment test, metrics,
   and stop-if conditions. Until then the product claim stays NEEDS_EVIDENCE.

### P1 — required before a clean implementation/release path

4. **Declare the exact four-agent Project Systems Architect formation.** Update
   the Role/Formation catalog and its negative/coverage tests to bind Senior PM,
   Software Architect, Workflow Architect, and Codebase Archaeologist under one
   lead with isolated contexts, explicit write scope, and a single handoff.
   Acceptance: the CLI projection shows the composite without lead, context,
   handoff, or shared-write violations.
5. **Normalize active-vs-historical documentation.** Resolve DOC-01, DOC-05,
   DOC-06, DOC-07, DOC-10, and DOC-12 by status/index/archive decisions. Do not
   rewrite immutable docs/history/**; repair only current pointers.
6. **Align website names and claims with canonical formations.** Add an alias
   map for Research/Planning/Debugging labels, make the recommendation-only
   boundary visible, and keep rendered HTML tests as smoke tests rather than
   market evidence.
7. **Create one Outcome-to-MVP Contract Brief only after P0 evidence.** It must
   name one user-visible vertical outcome, acceptance proof, dependencies,
   rollback, negative tests, and non-goals. Delivery may not start from the
   current audit document alone.
8. **Clarify docs-only CI and publication approvals.** Keep lightweight
   check:docs for docs-only changes, full CI for code-affecting changes, and
   make all commit/push/PR/merge steps explicitly approval-gated.
9. **Validate the mapper allowlist.** The checker now ignores only the paths
   named by DOC-14; mapper-relevant source changes remain a hard failure. Add a
   focused negative test before the next mapper-dependent publication.

### P2 — later evidence and hardening

10. Prove declared Node 22 CI separately from local Node 26 evidence.
11. Prove host loading, identity, effective tool boundaries, activation, and
    read-back before any native execution claim.
12. Prove optional Jira/Confluence/GitHub reads/writes only with an exact
    target, operation-specific approval, native link, and post-operation
    read-back.

## 8. Reality / Quality Gate verdict

| Area | Verdict | Reason |
| --- | --- | --- |
| Project System Map, workflow, and dependency map | READY_WITH_LIMIT | Local source and code paths are cross-referenced; no external execution was claimed. |
| Source-of-Truth matrix | READY_WITH_LIMIT | Canonical sources and conflicts are named; the capability conflict remains open. |
| Role/Formation structural projection | READY_WITH_LIMIT | 70/16/88 static coverage is clean; requested composite formation is not yet explicit. |
| Documentation ledger | READY_WITH_LIMIT | Findings have file/line evidence and bounded actions; no cleanup has been silently applied. |
| Personal operating system | NOT EXECUTED | Actual rules/habits and their cost/evidence are not yet inventoried. |
| Product/market readiness | NEEDS_EVIDENCE | No validated target, pain, adoption/payment, retention, or differentiation evidence. |
| Host/external publication | NOT EXECUTED | No UA/Graphify, connector, host, Git, or external operation was used. |

## 9. Verification record and next action

The inventory projection was run with:

~~~text
npm run cli -- inspect-agent-library --source-dir C:\Users\littl\.codex\agents ^
  --role-catalog contract\agent-library\role-catalog.md ^
  --formation-catalog contract\agent-library\formation-catalog.md
~~~

The result was 70 Agents, 16 Roles, 88 assignments, READY structural
coverage, and empty violation lists. This document itself is a local review
artifact. After this file is written, run npm run check:docs, git diff --check,
and the work-state preflight. In this round, npm run check:mappers passed for
the explicit non-mapper allowlist; a synthetic src/.mapper-negative-test.ts
also failed closed as expected and was removed. Do not run full build/tests
merely because this artifact is documentation-only; use the P0/P1 acceptance
conditions above for the next work packet.

**Next bounded action:** the Personal Operations & Rule Auditor collects the
real rule/habit inventory first. The Vision Owner then confirms one target/
problem hypothesis. Only after both gates pass may the exact composite
formation produce an implementation-ready MVP packet for Delivery and the
independent Reality / Quality Gate.

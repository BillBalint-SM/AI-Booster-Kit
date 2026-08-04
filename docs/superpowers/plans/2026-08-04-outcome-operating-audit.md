# Outcome & Operating Audit v1 Implementation Plan

**Status:** `PARTIAL` — written-rule/directive audit and local validation are
complete; one real User task is still required to observe unwritten habits and
time/energy cost.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a source-backed product/market thesis, project/dependency map, rule-system audit, and one evidence-gated MVP-slice decision with proportionate local evidence.

**Architecture:** Keep the repository's canonical roadmap and current-state file as routing sources. Add one reviewable audit artifact and one design/plan pair that preserve facts, hypotheses, unknowns, and recommendations separately. The audit consumes existing Role/Formation contracts but does not activate Agents or copy global prompt bodies.

**Tech Stack:** Markdown contracts and reports, existing repository checkers, and Git worktree state. No new dependency is required.

## Global Constraints

- Work only in the repository worktree selected by the current-state file and
  the current work-state preflight.
- Keep the audit evidence bounded to the named repository sources. The approved
  lean-rule cleanup may update the global and project operating instructions;
  unrelated Agent prompt bodies remain out of scope.
- Do not claim customer, payment, market, production, or host-runtime evidence that is not present in the named sources.
- Keep `main` as the canonical published state and do not rewrite or delete stale branches in this slice.
- Preserve `UNKNOWN`, `NEEDS_EVIDENCE`, and `STOPPED` states; do not promote them to `READY` for convenience.

## Priority correction

The Personal Operations & Rule Auditor is the first execution gate. The written
rule/directive pass is complete, but actual personal habits, time cost, and
outcome evidence remain incomplete. Observe one real bounded task before
treating the product thesis or MVP candidate as an implementation instruction.

---

### Task 1: Reconcile current delivery routing

**Files:**
- Modify: `docs/project/current-state.md`
- Test: `npm run check:docs`
- **Produces:** A current-state routing file with synchronized delivery
  information and a single next action.

- [x] Reconcile stale delivery references without changing the routing role.
- [x] Point the next bounded action to one bounded Personal Operations observation.
- [x] Run the documentation link check and `git diff --check` as the
  proportionate review checks for this documentation slice.

### Task 2: Normalize product and market evidence

**Files:**
- Create: `docs/operations/outcome-operating-audit-v1.md`
- Read: `docs/project/roadmap.md`, `README.md`, `contract/team-contract.md`, `workflows/team-delivery-loop.md`, and `contract/agent-library/agent-profile-catalog.md`

**Produces:** A product-outcome section with facts, hypotheses, unknowns, a candidate promise, target user, pain, MVP boundary, non-goals, metrics, and stop-if conditions.

- [x] Record the platform direction as a repository fact with its source path.
- [x] Record target user, painful problem, payment willingness, positioning, and differentiation as `UNKNOWN` unless a source provides evidence.
- [x] State the candidate product promise as a hypothesis rather than a validated claim.
- [x] Define the evidence required from the Vision Owner or future customer discovery before market readiness can be promoted.

### Task 3: Build the project and dependency map

**Files:**
- Modify: `docs/operations/outcome-operating-audit-v1.md`
- Read: `docs/project/current-state.md`, `docs/project/roadmap.md`, `contract/agent-library/role-catalog.md`, `contract/agent-library/formation-catalog.md`, and `src/controller/`

**Produces:** A dependency map that separates current local capability, intended product outcome, external dependency, and open stop.

- [x] Map the path from Vision Owner through Product & Market Owner, Documentation/BA, Architect, Delivery Lead, and Reality Gate.
- [x] Mark the existing Controller, Agent/Role/Formation, context, and CLI capabilities with their bounded evidence.
- [x] Mark host execution, customer validation, payment evidence, and external synchronization as unresolved evidence dependencies.
- [x] Select the shortest vertical path that can produce a user-observable result without requiring an unverified external operation.

### Task 4: Audit the work and rule system

**Files:**
- Modify: `docs/operations/outcome-operating-audit-v1.md`
- Read: repository `AGENTS.md`, project operating rules, `docs/operations/agent-operating-model.md`, `docs/runbooks/branching.md`, and `docs/project/current-state.md`

**Produces:** A rule register with one decision per candidate: `KEEP`, `MERGE`, `REMOVE_CANDIDATE`, or `UNKNOWN`.

**Priority:** Execute this task before product/market commitment or MVP
implementation. The first pass must include the User's actual rules and work
habits, not only repository instructions.

- [x] For every included rule, record the goal served, result/risk reduction, cost, and evidence of continued need.
- [x] Identify repeated current-state, branch, mapper, and documentation-routing rules and apply the approved lean replacements in active instructions.
- [x] Preserve safety, read-only, preflight, evidence, stop, and approval gates unless evidence demonstrates a safe simplification.
- [x] Propose a minimal focus, decision, weekly planning, and stop system that does not add a new permanent rule layer.
- [ ] Observe or collect the actual personal rule/habit set and record cost and evidence before finalizing any removal or merge decision.
- [x] Record the first redundant-element candidates and make approved branch-policy edits explicit while preserving security-critical controls.

### Task 5: Select and specify the first MVP slice

**Files:**
- Modify: `docs/operations/outcome-operating-audit-v1.md`
- Read: `contract/agent-library/role-catalog.md`, `contract/agent-library/formation-catalog.md`, and local test evidence

**Produces:** An `MVP-SLICE-CANDIDATE` with user outcome, acceptance criteria, evidence plan, dependencies, rollback boundary, and explicit non-goals.

- [x] Choose exactly one bounded, user-observable outcome; do not call the entire platform an MVP.
- [x] Give the slice executable acceptance criteria and at least one negative/stop path.
- [x] State which evidence is already local and which evidence remains `NEEDS_EVIDENCE`.
- [x] Keep the slice recommendation-only/local-only until the Vision Owner separately approves any host or external operation.

### Task 6: Apply the Reality / Quality Gate

**Files:**
- Modify: `docs/operations/outcome-operating-audit-v1.md`
- Modify: `package.json`, `scripts/check-doc-links.mjs`
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/docs.yml`
- Test: `npm run check:docs`
- Test: `git diff --check`

**Produces:** A layered final verdict with `READY_WITH_LIMIT`, `PARTIAL`,
`NEEDS_EVIDENCE`, or `STOPPED`, residual risks, and the next bounded action.

- [x] Verify that every product/market claim is source-backed or visibly marked unknown.
- [x] Verify that documentation and local tests are not presented as customer or production proof.
- [x] Verify that no unsupported result or unverified external evidence was
  promoted to a product claim.
- [x] Run the documentation gate without a build and record exact results.
- [x] Keep the full code gate for code-affecting changes while routing
  documentation-only changes through the lightweight documentation workflow.

## Current review gate

- [x] Current-state routing points to the active audit.
- [x] Product/market evidence gaps are explicit.
- [x] One MVP slice is bounded and testable.
- [x] Written rule/directive decisions are evidence-based and no rule was silently deleted.
- [ ] User-side unwritten habit and time/energy observation is complete.
- [x] Reality Gate verdict is honest about local-only limits.

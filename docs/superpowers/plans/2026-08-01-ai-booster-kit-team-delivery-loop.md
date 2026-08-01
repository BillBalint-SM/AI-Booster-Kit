# AI Booster Kit Team Delivery Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved AI Booster Kit vertical slice as a canonical team workflow, shared vocabulary, and one bounded Quick Task capability contract.

**Architecture:** Keep the existing common agent operating model, lifecycle, readiness, and artifact contracts authoritative. Add one workflow source under `workflows/`, one compact terminology source at `NOTES.md`, and one scoped Agent-library contract under `contract/agent-library/`. The first slice is documentation and contract-only; no runtime controller, connector activation, external write, or root `AGENTS.md` change is included.

**Tech Stack:** Markdown contracts and workflow specifications; existing Node.js 22 / TypeScript repository checks; existing documentation-link checker and test suite.

## Global Constraints

- The team workflow is the operating model; Agent use remains optional.
- Every outcome has a human or team owner; Agents execute only delegated work.
- `UNKNOWN` remains explicit and cannot be promoted to safe.
- The active canonical workflow contract is the first context source; history is not loaded automatically.
- One workflow has one canonical workflow specification; no default `plan.md`, `task.md`, `context.md`, or `review.md` files are created.
- Activation is one-recipe-at-a-time, snapshot-backed, validation-gated, and rollback-capable.
- Scope changes require explicit human/team acceptance and a linked artifact.
- No external reads or writes, OAuth, connector activation, permissions, or synchronization behavior are added.
- Do not modify `AGENTS.md`.
- Do not create a commit unless the User explicitly requests one.

---

### Task 1: Add the shared AI Booster Kit vocabulary

**Files:**
- Create: `NOTES.md`

**Interfaces:**
- Produces the terminology used by `workflows/team-delivery-loop.md` and `contract/agent-library/quick-task-clarifier-validator.md`.

- [x] **Step 1: Define the canonical platform terms**

Create `NOTES.md` with concise definitions for: AI Booster Kit, Platform Core, capability module, Agent recipe, workflow-mode, assistance profile, controller, human checkpoint, DoR, DoD, Acceptance Criteria, Evidence Requirements, `relations`, parallelization contract, handoff packet, fan-in, closure record, session-state, pattern signature, `UNKNOWN`, setup snapshot, rollback, and evolution.

- [x] **Step 2: Record the artifact hierarchy and ownership rules**

Document `Project Vision → Roadmap → Milestone → Epic → Task`, the requirement for a parent/owner/lifecycle/contribution link, and the distinction between canonical artifacts, derived briefs, session state, and history.

- [x] **Step 3: Verify the vocabulary is compact and non-duplicative**

Run:

```powershell
rg -n "^(#|##) |Project Vision|Roadmap|DoR|DoD|Acceptance Criteria|Evidence Requirements|UNKNOWN|rollback|evolution" NOTES.md
```

Expected: each required term appears in one concise definition and no default documentation-file sprawl is prescribed.

---

### Task 2: Create the canonical team delivery workflow

**Files:**
- Create: `workflows/team-delivery-loop.md`

**Interfaces:**
- Consumes: terminology from `NOTES.md`; existing lifecycle and common agent operating model semantics.
- Produces: the single canonical workflow source for the first AI Booster Kit slice.

- [x] **Step 1: Declare scope, triggers, and non-goals**

Define the recurring team loop from intake/refinement through planning, research, implementation, validation, review, handoff/fan-in, closure, resume, and optional evolution. Include event triggers for new or semantically significant Project, Roadmap, Epic, Milestone, or Task changes and explicit `/ai-booster-kit` and `$ai-booster-kit` intents. Exclude Jira–GitHub–Confluence synchronization and external writes.

- [x] **Step 2: Define adaptive intake and collaboration modes**

Specify fast, guided, and deep discovery paths. Define `human-led`, `human-agent-co-creation`, and `solo-agent-assisted` modes, while making interview, assessment, goal shaping, goal validation, and optional downstream Agent recommendation available in all modes.

- [x] **Step 3: Define the work-item and parallelization contracts**

Include ownership, Agent mode, checkpoint, DoR, DoD, AC, evidence, relations, stop conditions, and weighted Quick Task/User Story/Epic-Milestone depth. Define workstream scope, owner, dependency, conflict boundary, priority/order, integration point, handoff packet, integration owner, and review owner.

- [x] **Step 4: Define recommendation, activation, persistence, and evolution**

Specify the recommendation brief, three-way User choice, impact warning, custom skill/tool precedence, setup snapshot, one-recipe activation, post-activation validation, session/personal/team artifact retention, pattern signatures, closure record, resume, three-use review threshold, and explicit evolve flow.

- [x] **Step 5: Define status and failure semantics**

Use the repository evidence vocabulary and preserve `READY`, `READY_WITH_LIMIT`, `NOT READY`, `STOPPED`, `BLOCKED`, `UNKNOWN`, `NOT EXECUTED`, `PARTIAL`, and `COMPLETE_WITH_LIMIT` distinctly. Document scope drift, stale contract, missing evidence, timeout, partial completion, conflict, and rollback handling.

- [x] **Step 6: Verify the workflow source**

Run:

```powershell
rg -n "Adaptive Intake|Workflow Modes|DoR|DoD|Acceptance Criteria|Evidence|parallelization|Recommendation|Activation|closure|resume|evolution|scope" workflows/team-delivery-loop.md
```

Expected: the workflow contains every accepted platform-core and team-workflow decision without introducing a second canonical workflow source.

---

### Task 3: Add the bounded Quick Task capability contract

**Files:**
- Create: `contract/agent-library/quick-task-clarifier-validator.md`

**Interfaces:**
- Consumes: `NOTES.md` vocabulary and `workflows/team-delivery-loop.md` contracts.
- Produces: a declarative readiness and fit profile for one light Agent recipe.

- [x] **Step 1: Declare identity, ownership, scope, and lifecycle**

Define the recipe ID `quick-task-clarifier-validator`, purpose, owner boundary, supported `Quick Task` level, supported workflow modes, current lifecycle state, and explicit non-goals. Keep the state `READY_WITH_LIMIT` until a runtime controller and real activation harness exist; state that local contract validation is the evidence boundary.

- [x] **Step 2: Declare the fit and readiness profile**

Specify light complexity, interview/assessment/goal-validation support, optional downstream recommendation, required inputs, produced outputs, minimal DoR/DoD/AC/evidence, relations behavior, supported assistance profiles, and excluded situations such as external writes, scope expansion, or hidden multi-framework activation.

- [x] **Step 3: Declare negative paths and recovery**

Document behavior for missing or malformed input, ambiguous goal, unknown capability, stale context, `BREAKING` or `UNKNOWN` impact, timeout, partial completion, rejected User choice, and setup rollback. Require compact closure and pattern signatures.

- [x] **Step 4: Verify the recipe contract**

Run:

```powershell
rg -n "quick-task-clarifier-validator|READY_WITH_LIMIT|DoR|DoD|Acceptance Criteria|Evidence|relations|UNKNOWN|rollback|scope" contract/agent-library/quick-task-clarifier-validator.md
```

Expected: the recipe declares both its positive fit and its boundaries; it does not claim live connector or runtime-controller readiness.

---

### Task 4: Route the new canonical sources through existing documentation

**Files:**
- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/current-state.md`

**Interfaces:**
- Consumes: the new workflow and capability contract paths.
- Produces: discoverable routing without adding a second roadmap or duplicating current state.

- [x] **Step 1: Add the workflow and Agent-library entries to the documentation map**

Add links under the existing appropriate contract/operations section. Describe `workflows/team-delivery-loop.md` as the canonical recurring workflow and the Quick Task file as the first bounded capability contract.

- [x] **Step 2: Update current-state with the bounded deliverable**

Keep the file short. Record the new reviewed contract slice, local validation performed, the known limit that runtime controller activation is not implemented, and the next bounded action. Do not turn it into a second roadmap.

- [x] **Step 3: Verify link and routing integrity**

Run:

```powershell
npm run check:docs
```

Expected: the documentation map and all repository links pass without external reads or writes.

---

### Task 5: Perform final contract validation and scope review

**Files:**
- Review only: all files changed by Tasks 1–4

- [x] **Step 1: Run the narrow documentation gate**

Run:

```powershell
npm run check:docs
```

Expected: PASS.

- [x] **Step 2: Run the repository quality gate**

Run:

```powershell
npm test
```

Expected: PASS, with any pre-existing mapper-freshness limitation reported separately from test results.

- [x] **Step 3: Review the final diff and working tree**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Confirm that only the approved documentation/contract slice changed, no credentials or raw transcripts were added, no root instruction file changed, and no generated noise or line-ending churn is present.

- [x] **Step 4: Report the handoff**

Report changed files, validation evidence, known runtime limitation, external read/write impact, and the next bounded action. Leave the changes uncommitted for User review.

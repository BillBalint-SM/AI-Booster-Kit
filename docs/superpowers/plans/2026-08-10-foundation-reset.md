# Foundation Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents without the user's explicit approval.

**Goal:** Establish the accepted Foundation Reset documentation and guidance
surface so AI Booster Kit has one clear vision, domain language, document
ownership model, and modular agent router.

**Architecture:** The reset creates four small canonical root artifacts:
`VISION.md`, `DOMAIN.md`, `CONTEXT.md`, and `AGENTS.md`. Host-specific and
operational detail stays behind explicit pointers: `CLAUDE.md` is a thin Claude
projection, `docs/agents/` configures engineering-skill consumption without
granting tracker authority, and `docs/adr/` records the topology decision.
Existing documents remain available, are classified in a migration record, and
are removed from default routing only when a canonical successor exists.

**Tech Stack:** Markdown, Git, npm, and the repository's TypeScript-based
documentation-link checker.

## Global Constraints

- This plan implements the accepted design in
  `docs/superpowers/specs/2026-08-10-foundation-reset-design.md`; any material
  divergence stops for renewed design approval.
- The scope is documentation and repository guidance only. Do not alter runtime
  code, tests, dependencies, package metadata, global Codex settings, hooks,
  plugins, MCP configuration, credentials, or external systems.
- `VISION.md` owns vision, v1 completion criteria, principles, and non-goals.
  `DOMAIN.md` owns product boundaries, actors, modules, and invariants.
  `CONTEXT.md` owns stable vocabulary and concept relationships.
- `AGENTS.md` is the canonical host-agnostic router. `CLAUDE.md` remains a
  narrow Claude-specific projection and preserves its direct-on-disk
  context-integrity gate.
- GitHub Issues is the sole configured issue tracker. Its documented existence
  never authorizes a GitHub read or write. Any external read needs the bounded
  grant required by the repository contract; every external write needs fresh,
  operation-specific user approval.
- This is a single-context repository. Create root `CONTEXT.md` and root
  `docs/adr/`; do not create `CONTEXT-MAP.md`.
- Do not delete or relocate a legacy document in this slice. Classify it as
  `retain`, `rewrite`, `archive`, or `unknown`, preserve its base revision in
  the migration record, and remove it from default routing only where the
  canonical replacement is complete.
- No `git add`, commit, push, pull request, merge, external issue mutation, or
  other publication is part of this plan. Leave the completed work as an
  uncommitted review state.

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `VISION.md` | Create | Canonical vision contract, v1 gate, principles, and non-goals. |
| `DOMAIN.md` | Create | Product boundary, actors, independently invocable modules, and invariants. |
| `CONTEXT.md` | Create | Stable glossary and the relationships between the canonical concepts. |
| `docs/adr/0001-canonical-agent-guidance-and-document-topology.md` | Create | Durable decision for the document and guidance topology. |
| `docs/agents/issue-tracker.md` | Create | GitHub Issues location and authority-safe interaction rules. |
| `docs/agents/triage-labels.md` | Create | Canonical local mapping for the five installed-triage roles. |
| `docs/agents/domain.md` | Create | Single-context domain-document consumer rules. |
| `docs/history/foundation-reset/2026-08-10-document-migration-record.md` | Create | Classification, successor, base revision, and default-context decision for legacy documents. |
| `AGENTS.md` | Rewrite | Small host-agnostic router and always-applicable repository guardrails. |
| `CLAUDE.md` | Rewrite | Thin Claude projection plus the existing context-integrity protection. |
| `README.md` | Rewrite | Short human/GitHub entry point with canonical links only. |
| `docs/project/roadmap.md` | Rewrite | Ordered execution view derived from `VISION.md`, not a second vision. |
| `docs/project/documentation-map.md` | Rewrite | Question-to-owner navigation map for the canonical surface. |
| `docs/project/current-state.md` | Rewrite at the end | Accurate local review-state routing after all verification evidence exists. |
| `docs/history/README.md` | Modify | Link the Foundation Reset migration record as historical evidence. |

The following files are inspected and classified but are not deleted or moved:
`NOTES.md`, `docs/project/terminology-normalization-table.md`,
`docs/operations/agent-operating-model.md`, `docs/operations/host-adapters/`,
`contract/`, `workflows/`, and the existing reviewed designs and plans under
`docs/superpowers/`.

## Task 1: Establish the migration evidence boundary

**Files:**

- Create: `docs/history/foundation-reset/2026-08-10-document-migration-record.md`
- Read: `AGENTS.md`, `CLAUDE.md`, `README.md`, `NOTES.md`,
  `docs/project/roadmap.md`, `docs/project/documentation-map.md`,
  `docs/project/current-state.md`, and
  `docs/project/terminology-normalization-table.md`

**Consumes:** The accepted Foundation Reset design and a fresh `WORK_STATE`.

**Produces:** A reviewable, base-revision-bound classification of legacy
documents before any canonical entry point is rewritten.

- [ ] **Step 1: Refresh repository state and reopen the authoritative inputs.**

  Run from the repository root:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  git rev-parse HEAD
  git status --short
  ```

  Record the emitted revision as the migration record's `Base revision`.
  Reopen every file named in this task immediately before changing it. If the
  repository, branch, revision, or worktree is conflicting or unknown, stop
  and preserve that result rather than selecting a value from conversation
  history.

- [ ] **Step 2: Create the archive directory and migration record with this exact shape.**

  Create `docs/history/foundation-reset/` if it does not exist. Use
  `apply_patch` to add the record with these sections and table columns:

  ```markdown
  # Foundation Reset document migration record

  **Status:** Review state; it becomes historical evidence only after the
  Foundation Reset is accepted.

  **Base revision:** `git rev-parse HEAD` output captured before this slice.

  ## Preservation rule

  The record preserves why each prior document remains, changes, or leaves
  default routing. No file is deleted or relocated by this slice.

  ## Classification

  | Path | Classification | Canonical successor or reason to retain | Default agent context after reset | Preservation evidence |
  | --- | --- | --- | --- | --- |
  ```

- [ ] **Step 3: Add the initial classification rows.**

  Use the following decisions, which are already fixed by the accepted design:

  | Path | Classification | Canonical successor or reason to retain | Default agent context after reset |
  | --- | --- | --- | --- |
  | `AGENTS.md` | `rewrite` | Short canonical router | Always-loaded repository guidance |
  | `CLAUDE.md` | `rewrite` | Thin Claude projection with its integrity gate | Claude-only projection |
  | `README.md` | `rewrite` | Human/GitHub entry point to canonical sources | Human entry point only |
  | `docs/project/roadmap.md` | `rewrite` | Ordered v1 execution view derived from `VISION.md` | Read for ordered milestones only |
  | `docs/project/documentation-map.md` | `rewrite` | Canonical navigation table | Read for source routing |
  | `docs/project/current-state.md` | `rewrite` | Exact current local delivery route | Read for status or milestone-dependent decisions |
  | `NOTES.md` | `archive` | Replaced as the active glossary by `CONTEXT.md` | Never default context |
  | `docs/project/terminology-normalization-table.md` | `archive` | Historical working normalization evidence; `CONTEXT.md` owns settled language | Never default context |
  | `docs/operations/agent-operating-model.md` | `retain` | Detailed common operating model referenced by `AGENTS.md` | Read before substantive work |
  | `docs/operations/host-adapters/` | `retain` | Host-specific operational detail | Read only for relevant host work |
  | `contract/` | `retain` | Product and capability-specific contracts | Read only when the task touches the contract |
  | `workflows/` | `retain` | Recurring workflow definitions | Read only for the named workflow |
  | `docs/superpowers/specs/` and `docs/superpowers/plans/` | `retain` | Reviewed intent and execution history | Not default context; read by referenced work |
  | `docs/history/` | `retain` | Historical evidence | Never default context |

  For every `rewrite` row, write the pre-reset path plus the base revision as
  its preservation evidence. For each `archive` row, state explicitly that it
  stays in place in this slice and is merely removed from active routing.

- [ ] **Step 4: Validate the migration boundary before creating successors.**

  Run:

  ```powershell
  Get-Content -Raw 'docs/history/foundation-reset/2026-08-10-document-migration-record.md'
  git diff --check
  ```

  Expected: the record names every active entry point that will be rewritten,
  no planned deletion or relocation appears, and `git diff --check` exits
  successfully. If a newly discovered active document has no classification,
  add a row or stop as `UNKNOWN` before changing an entry point.

## Task 2: Create the vision contract

**Files:**

- Create: `VISION.md`
- Read: `docs/superpowers/specs/2026-08-10-foundation-reset-design.md`

**Consumes:** The accepted vision, v1 evidence gate, and explicit non-goals.

**Produces:** One durable strategic source that a reviewer can use to decide
whether a proposal changes the product's direction or v1 finish line.

- [ ] **Step 1: Create `VISION.md` with the fixed ownership boundary.**

  The document has exactly these top-level sections:

  ```markdown
  # AI Booster Kit Vision Contract

  ## Vision
  ## V1 Completion Gate
  ## Principles
  ## Non-goals
  ```

  Under `## Vision`, reproduce this accepted statement verbatim:

  > Az AI Booster Kit a Felhasználók számára az Agentek világát
  > bizonytalanságból nyugodt, bizonyítható működéssé alakítja. A Platform
  > minden önállóan vagy összehangolva dolgozó modulja review-képes eredményt —
  > vagy szükséges, indokolt stoppot — ad, miközben az irány, a döntés és a
  > kontroll végig az ember kezében marad.

- [ ] **Step 2: State the v1 gate as four independently auditable proofs.**

  Under `## V1 Completion Gate`, require all four of the following:

  1. One end-to-end change-producing task proves clarification, context
     selection, planning, implementation, verification, and review or
     handoff.
  2. One standalone planning task yields a reviewable plan.
  3. One standalone review or test task yields reviewable evidence.
  4. One task correctly yields `STOPPED` or `UNKNOWN`, including reason and
     next safe action.

  End the section with: `No proof may rely on an unapproved external write.`

- [ ] **Step 3: Make modularity and authority visible without duplicating the domain model.**

  Under `## Principles`, state that modules can be invoked independently or
  composed into a flow; `plan -> implement -> verify -> handoff` is the
  default recipe for change-producing work, not a mandatory loop; the human
  retains direction, decision, and control; evidence and explicit uncertainty
  are required; and external actions are never hidden.

  Under `## Non-goals`, list runtime refactoring, automatic agent loops,
  global Codex configuration, connector/MCP/plugin setup, external writes,
  deletion, and automatic Git publication. Do not describe current branch,
  milestone status, implementation mechanics, or glossary definitions in this
  file.

- [ ] **Step 4: Check the document's scope.**

  Run:

  ```powershell
  rg -n '^## ' VISION.md
  rg -n 'current-state|branch|commit|pull request' VISION.md
  ```

  Expected: exactly the four stated top-level sections and no operational
  delivery-state content. A mention of a non-goal Git action is allowed; a
  current Git fact is not.

## Task 3: Create the domain boundary and shared vocabulary

**Files:**

- Create: `DOMAIN.md`
- Create: `CONTEXT.md`
- Read: `VISION.md`, `NOTES.md`,
  `docs/project/terminology-normalization-table.md`, and
  `docs/operations/agent-operating-model.md`

**Consumes:** The vision contract and the legacy vocabulary that must no
longer be a competing active source.

**Produces:** A product-boundary contract plus one stable, opinionated
glossary that use the same vocabulary without duplicating their responsibilities.

- [ ] **Step 1: Create `DOMAIN.md` with these exact top-level sections.**

  ```markdown
  # AI Booster Kit Domain

  ## Product Boundary
  ## Actors
  ## Modules
  ## Invariants
  ## Domain Non-goals
  ```

  `## Product Boundary` says that AI Booster Kit is an agent-agnostic operating
  layer that lets a technical owner use AI-agent capabilities predictably on
  real repository work. The owner's Codex environment is the first pilot and
  reference environment, not the product's only host or purpose.

- [ ] **Step 2: Define actors, modules, and invariants in `DOMAIN.md`.**

  `## Actors` identifies: the `User` as the human outcome owner and final
  decision-maker; an `Agent` as a bounded execution capability that cannot own
  the outcome; and a `Reviewer` as a human or independent reviewer who checks
  evidence without inheriting hidden authority.

  `## Modules` identifies `plan`, `review`, `implement`, and `test` as
  independently callable modules. State that a module declaration always
  names purpose, required input/context, output, scope/authority, verification
  evidence, `STOPPED`/`UNKNOWN` condition, and handoff. State that a `Flow` is
  an explicit composition of modules rather than a mandatory global loop.

  `## Invariants` states all of the following: the human retains direction and
  final control; a material change requires the relevant accepted plan; no
  external action is hidden; a result is review-ready only with proportionate
  evidence; uncertainty remains `UNKNOWN`; unsafe or insufficiently authorized
  work stops visibly; callers and tests cross the same declared interface.

  `## Domain Non-goals` excludes a particular agent host, autonomous outcome
  ownership, silent scope expansion, and a claim that the documentation proves
  host security or external connector capability.

- [ ] **Step 3: Create the compact `CONTEXT.md` glossary.**

  Use only these top-level sections:

  ```markdown
  # AI Booster Kit Context

  ## Purpose
  ## Preferred Vocabulary
  ## Concept Relationships
  ```

  Define the following preferred terms in one or two sentences each:
  `User`, `Agent`, `Module`, `Flow`, `Interface`, `Implementation`, `Seam`,
  `Adapter`, `Depth`, `Leverage`, `Locality`, `Evidence`, `Review-ready
  result`, `Approval`, `Handoff`, `STOPPED`, and `UNKNOWN`.

  Use these required relationships:

  ```text
  User approves scope and authority
    → Agent performs one Module or declared Flow
    → Interface is crossed by callers and tests
    → Evidence supports a review-ready result or an explicit STOPPED/UNKNOWN
    → Handoff exposes the result, evidence, limits, and next bounded action
  ```

  Keep definitions stable and conceptual. Do not include a roadmap, current
  delivery state, implementation steps, host configuration, test commands, or
  duplicate module invariants.

- [ ] **Step 4: Audit separation between the two files.**

  Run:

  ```powershell
  rg -n '^## ' DOMAIN.md CONTEXT.md
  rg -n 'V1 Completion Gate|current-state|GitHub Issues|npm run' DOMAIN.md CONTEXT.md
  ```

  Expected: `DOMAIN.md` carries product boundaries and invariants;
  `CONTEXT.md` carries definitions and relationships; neither carries vision
  gate, tracker configuration, current state, or execution commands.

## Task 4: Add the durable topology decision and engineering-skill documents

**Files:**

- Create: `docs/adr/0001-canonical-agent-guidance-and-document-topology.md`
- Create: `docs/agents/issue-tracker.md`
- Create: `docs/agents/triage-labels.md`
- Create: `docs/agents/domain.md`
- Read: `VISION.md`, `DOMAIN.md`, `CONTEXT.md`,
  `docs/operations/agent-operating-model.md`, and
  `docs/operations/host-adapters/claude-code.md`

**Consumes:** The canonical role split, the GitHub Issues choice, the accepted
label vocabulary, and the existing Claude context-integrity protection.

**Produces:** One ADR explaining the hard-to-reverse topology and three small
engineering-skill configuration documents that do not broaden authority.

- [ ] **Step 1: Create ADR-0001 using this exact decision structure.**

  Use these headings in
  `docs/adr/0001-canonical-agent-guidance-and-document-topology.md`:

  ```markdown
  # ADR-0001: Canonical agent guidance and document topology

  **Status:** Accepted

  ## Context
  ## Decision
  ## Alternatives Considered
  ## Consequences
  ## Reversal Boundary
  ```

  In `## Context`, describe the competing long repository guidance, duplicated
  terminology, and divergent host instruction surfaces that caused avoidable
  work and uncertainty. In `## Decision`, assign the exact owners from the
  File Map, designate `AGENTS.md` as the host-agnostic router, retain
  `CLAUDE.md` only for Claude-specific context integrity, and require
  progressive disclosure through precise pointers. In `## Alternatives
  Considered`, reject keeping the long `AGENTS.md`, making `CLAUDE.md` the
  shared source, and merging vision/domain/context into one file. In
  `## Consequences`, state the migration record and link-maintenance cost. In
  `## Reversal Boundary`, require a new ADR plus proof that no existing
  integrity or routing guarantee is lost before changing the ownership split.

- [ ] **Step 2: Create the safe GitHub Issues configuration.**

  `docs/agents/issue-tracker.md` must contain the following sections:

  ```markdown
  # Issue tracker: GitHub

  **Status:** Configured tracker location; not an authority grant.

  ## Scope
  ## Read boundary
  ## Write boundary
  ## Pull requests as a triage surface
  ## Source of truth
  ```

  State that GitHub Issues in the repository's verified `origin` remote are
  the configured issue tracker, but the remote must be resolved before use.
  In `## Read boundary`, require the repository contract's explicit bounded
  session grant naming literal target, read path, evidence, normalized output,
  and the fact that no write is authorized. In `## Write boundary`, list
  create, comment, label, close, reopen, assign, link, and edit as external
  writes that require fresh operation-specific approval, a pre-read, one
  allowlisted write, and a post-read. Set pull requests as a triage surface to
  `no`. State that GitHub is the issue-lifecycle truth only when a separate
  approved domain adapter assigns it that role; this configuration alone does
  not override the repository's Jira/Git/Confluence truth hierarchy.

- [ ] **Step 3: Create the exact triage-label mapping.**

  `docs/agents/triage-labels.md` has a four-column table with one row each for
  the five canonical roles:

  | Skill role | GitHub label | Meaning | Authority note |
  | --- | --- | --- | --- |
  | `needs-triage` | `needs-triage` | Maintainer evaluation is needed. | Applying it requires approved external write authority. |
  | `needs-info` | `needs-info` | Reporter information is missing. | Applying it requires approved external write authority. |
  | `ready-for-agent` | `ready-for-agent` | The issue is sufficiently specified for an agent. | Applying it requires approved external write authority. |
  | `ready-for-human` | `ready-for-human` | Human implementation is required. | Applying it requires approved external write authority. |
  | `wontfix` | `wontfix` | The issue will not be actioned. | Applying it requires approved external write authority. |

  End the file by stating that a skill maps roles through this table but does
  not gain permission to change a GitHub issue.

- [ ] **Step 4: Create the single-context domain-document consumer rules.**

  `docs/agents/domain.md` must say that this repository is single-context and
  uses root `CONTEXT.md` plus root `docs/adr/`. It must direct an agent to read
  `VISION.md` for scope or v1 decisions; `DOMAIN.md`, then `CONTEXT.md`, for
  behavior, module, boundary, or terminology work; and only ADRs relevant to
  the proposed change. It must require the preferred `CONTEXT.md` term in
  issue titles, plans, tests, and design output, and require an explicit ADR
  conflict notice rather than a silent contradiction. It must not instruct an
  agent to create a `CONTEXT-MAP.md` or a new ADR merely because it is absent.

- [ ] **Step 5: Verify that the setup documents are configuration, not hidden action.**

  Run:

  ```powershell
  rg -n 'gh issue|gh pr|gh api|git push|git commit' docs/agents
  rg -n 'external write|operation-specific approval|session grant' docs/agents
  ```

  Expected: the first command produces no result; the second finds explicit
  authority gates in the tracker and label documents. Any direct external
  command in these files is a stop condition because it would make a future
  action look pre-authorized.

## Task 5: Replace the repository and Claude instruction surfaces

**Files:**

- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Read: `docs/adr/0001-canonical-agent-guidance-and-document-topology.md`,
  `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`,
  `docs/agents/domain.md`, and
  `tools/claude-context-integrity/verify.ps1`

**Consumes:** The accepted ADR and the exact engineering-skill configuration.

**Produces:** A short canonical router with one host-specific projection,
without erasing Claude's direct-on-disk context integrity protection.

The engineering-skill setup normally selects an existing `CLAUDE.md` before
`AGENTS.md`. This repository has both files, and the user-approved topology
explicitly makes `AGENTS.md` canonical; that explicit product decision takes
precedence while `CLAUDE.md` remains a thin projection.

- [ ] **Step 1: Perform the targeted instruction-file safety review.**

  Before writing, reopen the live `AGENTS.md` and `CLAUDE.md`, compare them to
  the migration record, and verify that user approval covers this accepted
  plan. Stop if either source has changed outside this plan's review state or
  if a requested edit would change permissions, sandboxing, hooks, MCP,
  credentials, or external targets.

- [ ] **Step 2: Rewrite `AGENTS.md` as the short canonical router.**

  Use this exact heading structure:

  ```markdown
  # AI Booster Kit — Agent Router

  ## Binding contract
  ## Always-applicable rules
  ## Read by task shape
  ## Agent skills
  ## Authority boundary
  ## Completion rule
  ```

  `## Binding contract` states that `VISION.md` is the durable product contract
  and that the current task must not silently widen it. `## Always-applicable
  rules` requires an explicit scope, evidence boundary, stop condition, and
  proportionate verification for substantive work; separates facts,
  hypotheses, decisions, approvals, and unknowns; and requires
  `docs/operations/agent-operating-model.md` before substantive work.

  `## Read by task shape` must contain this routing table:

  | Trigger | Required reading |
  | --- | --- |
  | Product scope, v1 gate, strategy, or non-goal changes | `VISION.md` |
  | Product behavior, module boundaries, invariants, or terminology | `DOMAIN.md`, then `CONTEXT.md` |
  | Reversing or materially changing a recorded architectural decision | Relevant `docs/adr/` record |
  | GitHub Issues operation | `docs/agents/issue-tracker.md`; `docs/agents/triage-labels.md` when labels matter |
  | Delivery status, roadmap routing, handoff, milestone-dependent work, or external-target decision | `docs/project/current-state.md` |
  | Host-specific behavior | Relevant `docs/operations/host-adapters/` document |
  | Recurring workflow or capability contract | Relevant file under `workflows/` or `contract/` |

  `## Agent skills` must include these three short blocks:

  ```markdown
  ### Issue tracker

  GitHub Issues is the configured tracker; configuration does not authorize an
  external read or write. See `docs/agents/issue-tracker.md`.

  ### Triage labels

  Use the five canonical role-to-label mappings only after authority is
  granted. See `docs/agents/triage-labels.md`.

  ### Domain docs

  This is a single-context repository with root `CONTEXT.md` and
  `docs/adr/`. See `docs/agents/domain.md`.
  ```

  `## Authority boundary` states that read-only work stays within the stated
  scope; reversible local changes require an accepted plan and remain
  uncommitted; deletion, global configuration, credentials, plugins, MCP,
  external writes, commit, push, pull request, and merge require fresh exact
  approval. `## Completion rule` requires either a review-ready result with
  evidence or a visible `STOPPED`/`UNKNOWN` result with reason and next safe
  action.

- [ ] **Step 3: Rewrite `CLAUDE.md` as a projection rather than a duplicate.**

  Use this exact structure:

  ```markdown
  # AI Booster Kit — Claude project projection

  ## Shared router
  ## Claude context-integrity gate
  ## Claude-specific stop rule
  ```

  In `## Shared router`, direct Claude to read the root `AGENTS.md` before
  substantive repository work. Do not use undocumented import syntax or paste
  the router's rules into this file. In `## Claude context-integrity gate`,
  preserve all five existing protections: host statements are observations;
  directly reopen the claimed path; record scope, revision, byte length, and
  SHA-256; run `tools/claude-context-integrity/verify.ps1`; classify no raw
  capture as `UNKNOWN`, any path/read/revision/byte mismatch as `BLOCKED`, and
  transcript/summary/filename claims as insufficient. In `## Claude-specific
  stop rule`, preserve the existing `BLOCKED`, `UNKNOWN`, and `NOT EXECUTED`
  rule when the exact instruction source cannot be proved.

- [ ] **Step 4: Prove the two instruction files have distinct responsibilities.**

  Run:

  ```powershell
  Get-Content -Raw AGENTS.md
  Get-Content -Raw CLAUDE.md
  rg -n 'observe.*validate.*plan.*coordinate.*execute.*verify.*hand off' CLAUDE.md
  rg -n 'claude-context-integrity|SHA-256|byte length' AGENTS.md
  ```

  Expected: `CLAUDE.md` contains no copied shared operating loop; `AGENTS.md`
  contains no Claude-only integrity implementation; `CLAUDE.md` retains the
  direct integrity gate and one explicit pointer to `AGENTS.md`.

## Task 6: Rewire the human and project navigation surfaces

**Files:**

- Modify: `README.md`
- Modify: `docs/project/roadmap.md`
- Modify: `docs/project/documentation-map.md`
- Read: `VISION.md`, `DOMAIN.md`, `CONTEXT.md`, `AGENTS.md`,
  `docs/operations/agent-operating-model.md`, and
  `docs/history/foundation-reset/2026-08-10-document-migration-record.md`

**Consumes:** The canonical docs and migration classifications.

**Produces:** One short human entry point, one non-duplicative roadmap, and
one question-to-source navigation table.

- [ ] **Step 1: Rewrite `README.md` as a concise entry point.**

  The README must contain: a one-paragraph product statement consistent with
  `VISION.md`; links to `VISION.md`, `DOMAIN.md`, `CONTEXT.md`,
  `docs/project/current-state.md`, and `docs/project/documentation-map.md`;
  a statement that the first pilot is the owner's Codex environment but the
  product is agent-agnostic; and a sentence that no external action is implied
  by the documentation. Do not reproduce the vision quote, v1 gate, detailed
  workflow, roadmap table, or agent instruction rules.

- [ ] **Step 2: Rewrite `docs/project/roadmap.md` as the ordered v1 execution view.**

  Use this exact milestone sequence, with each milestone's outcome and exit
  evidence stated in one short paragraph:

  1. `Foundation Reset` — canonical docs, router, projection, migration record,
     and docs verification are present for review.
  2. `Standalone Plan Proof` — one real planning module produces a reviewable
     plan under the authority model.
  3. `Standalone Review/Test Proof` — one real review or test module produces
     proportionate, reviewable evidence.
  4. `Safe Stop Proof` — one real task ends as `STOPPED` or `UNKNOWN` with
     reason and next safe action.
  5. `End-to-End Change Proof` — one real task completes clarification,
     context, plan, implementation, verification, and handoff without an
     unapproved external write.
  6. `V1 Completion Review` — a reviewer verifies all four v1 proofs against
     `VISION.md` and records gaps as `NOT READY` rather than declaring success.

  State that the roadmap derives from `VISION.md`, does not own current
  branch/PR/test facts, and does not authorize a milestone's execution.

- [ ] **Step 3: Rewrite `docs/project/documentation-map.md` as the source-ownership map.**

  Its canonical-source table must include at least these rows:

  | Question | Canonical source |
  | --- | --- |
  | What are the product vision, v1 gate, and non-goals? | `VISION.md` |
  | Who are the actors, what are the modules, and which invariants apply? | `DOMAIN.md` |
  | Which terms and conceptual relationships are preferred? | `CONTEXT.md` |
  | How does an agent choose what to read and finish a task? | `AGENTS.md` |
  | What is true now and what is the next bounded action? | `docs/project/current-state.md` |
  | What is the ordered path to v1? | `docs/project/roadmap.md` |
  | Why is the document topology arranged this way? | `docs/adr/0001-canonical-agent-guidance-and-document-topology.md` |
  | How are GitHub Issues and triage labels consumed safely? | `docs/agents/` |
  | How does the common operating model work? | `docs/operations/agent-operating-model.md` |
  | What is historical evidence only? | `docs/history/` and the migration record |

  Add a short `## Default context rule` stating that historical documents,
  prior designs/plans, `NOTES.md`, and the terminology-normalization table are
  not default agent context. Link to them only from the migration record, not
  from normal reading order.

- [ ] **Step 4: Verify navigation is one-way and non-duplicative.**

  Run:

  ```powershell
  npm run check:docs
  rg -n 'AI Booster Kit a Felhasználók számára|V1 Completion Gate' README.md docs/project/roadmap.md docs/project/documentation-map.md
  ```

  Expected: link checking passes, the full vision and v1 gate remain owned by
  `VISION.md`, and the entry-point documents contain only their own role.

## Task 7: Publish accurate local routing and complete the migration record

**Files:**

- Modify: `docs/project/current-state.md`
- Modify: `docs/history/README.md`
- Modify: `docs/history/foundation-reset/2026-08-10-document-migration-record.md`
- Read: Fresh `WORK_STATE`, final `git diff --name-status`, and all artifacts
  named in the File Map

**Consumes:** Completed documentation changes and verified local state.

**Produces:** A current-state document that reports this slice truthfully and
a closed migration inventory that future agents can audit without treating it
as default instruction.

- [ ] **Step 1: Refresh `WORK_STATE` after all documentation edits.**

  Run:

  ```powershell
  & 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' `
    -RepositoryPath (Get-Location).Path -OutputFormat Markdown
  git diff --name-status
  ```

  Use only the exact output of this command for branch, revision, worktree,
  upstream, pull-request status, and changed-path claims. If any field cannot
  be verified, write `UNKNOWN` for that field and explain the failed lookup.

- [ ] **Step 2: Rewrite `docs/project/current-state.md` to report the local review state.**

  Use these sections in this order:

  ```markdown
  # Current delivery state

  ## Branch and review state
  ## Completed local deliverable
  ## Validation
  ## Known limit
  ## Open stop
  ## Next bounded action
  ```

  `## Branch and review state` records the fresh preflight values and explicitly
  says that no commit, push, pull request, merge, external write, global
  configuration, or runtime change occurred in this slice. `## Completed local
  deliverable` lists the canonical document and routing artifacts actually
  present. `## Validation` lists only commands actually run and their exact
  results. `## Known limit` states that documentation does not prove host
  security, tool availability, connector behavior, or v1 completion. `## Open
  stop` states that no real v1 proof has been executed yet. `## Next bounded
  action` points to the first user-approved proof slice in the rewritten
  roadmap; it must not select or begin that slice automatically.

- [ ] **Step 3: Close the migration record and link it from the history index.**

  Update the migration record's status to `Completed local review state` only
  after all its rows have a classification, successor or retain reason,
  default-context decision, and preservation evidence. Add a final `## Audit
  result` section saying whether any active duplicate owner remains; if one
  remains, name it and retain `UNKNOWN` rather than asserting completion.

  In `docs/history/README.md`, add one bullet under `## Archived evidence`:

  ```markdown
  - [Foundation Reset document migration record](foundation-reset/2026-08-10-document-migration-record.md)
  ```

- [ ] **Step 4: Verify the state documents do not claim publication or a false finish.**

  Run:

  ```powershell
  rg -n 'published|pushed|pull request|merged|complete|v1' docs/project/current-state.md
  Get-Content -Raw 'docs/history/foundation-reset/2026-08-10-document-migration-record.md'
  ```

  Expected: every publication claim is absent or explicitly negated; the only
  completion claim is the documentation slice's local review state; v1 remains
  incomplete until the four proofs in `VISION.md` exist.

## Task 8: Run the documentation verification and prepare the review handoff

**Files:**

- Read: every path listed in the File Map
- No additional file is created unless a failed verification exposes a concrete
  documentation defect that belongs to one of the listed files.

**Consumes:** The final documentation diff and fresh repository state.

**Produces:** Independent evidence that the Foundation Reset is a bounded,
reviewable local change or a precise `STOPPED`/`UNKNOWN` report.

- [ ] **Step 1: Run the narrow documentation and whitespace checks.**

  ```powershell
  npm run check:docs
  git diff --check
  ```

  Expected: both commands exit successfully. A failure is not repaired by
  weakening a link or suppressing a check; reopen the exact file, make the
  smallest correction, and rerun the failed command.

- [ ] **Step 2: Audit source ownership and duplication.**

  Run:

  ```powershell
  rg -n 'AI Booster Kit a Felhasználók számára|V1 Completion Gate' `
    --glob '!docs/superpowers/**' --glob '!docs/history/**' --glob '!marketing/**' .
  rg -n '^# .*Context|^# .*Domain|^# .*Vision' `
    --glob '!docs/superpowers/**' --glob '!docs/history/**' --glob '!marketing/**' .
  rg -n 'NOTES.md|terminology-normalization-table.md' AGENTS.md README.md docs/project/documentation-map.md
  ```

  Expected: the vision and v1 gate are owned only by `VISION.md` among active
  sources; `CONTEXT.md` and `DOMAIN.md` have distinct owners; and neither
  archived-in-place legacy glossary is routed as default context. Review every
  remaining hit manually. A legitimate reference in the migration record does
  not make a legacy document active.

- [ ] **Step 3: Audit scope and security boundaries.**

  Run:

  ```powershell
  git diff --name-only
  git diff -- AGENTS.md CLAUDE.md VISION.md DOMAIN.md CONTEXT.md docs README.md
  ```

  Confirm manually that every changed path is in the File Map, no runtime or
  dependency file changed, no secret appears, no external endpoint or
  credential was added, and no instruction broadens approval, sandbox, MCP,
  plugin, or write authority. Treat any unexpected path or broadening as a
  stop condition until the user reviews it.

- [ ] **Step 4: Hand off the uncommitted review state.**

  The handoff must name: the objective; fresh `WORK_STATE`; every changed file;
  verification commands and exact results; the migration decision; the fact
  that no external action, global configuration change, deletion, commit,
  push, or pull request occurred; known limits; and the next bounded action.
  Do not stage or publish the change. A reviewer must be able to inspect the
  diff without trusting the implementer's summary.

## Spec Coverage Check

| Accepted design requirement | Implementing task |
| --- | --- |
| Vision, v1 gate, modularity, human control, and non-goals | Tasks 2 and 6 |
| Domain boundary, actors, modules, and invariants | Task 3 |
| Stable vocabulary and concept relationships only in `CONTEXT.md` | Task 3 |
| Short `AGENTS.md` router and retained thin `CLAUDE.md` integrity gate | Task 5 |
| GitHub Issues, five triage labels, and single-context domain docs | Task 4 and Task 5 |
| First durable ADR | Task 4 |
| Documentation ownership, migration classification, no deletion/relocation | Tasks 1 and 7 |
| Short README, roadmap derived from vision, current state routing | Tasks 6 and 7 |
| Docs checks, diff checks, duplicate-owner audit, no scope drift | Task 8 |
| No external, runtime, global-config, or Git publication changes | Global Constraints and Task 8 |

## Plan Acceptance Boundary

Approving this plan authorizes only the local, reversible documentation work
described above. It does not authorize a commit, push, pull request, merge,
external GitHub operation, deletion, global Codex configuration change,
plugin/MCP change, or any v1 evidence task beyond the Foundation Reset.

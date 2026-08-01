# AI Booster Kit Team Delivery Loop Design

**Status:** Proposed for user review; implementation has not started.

**Goal:** Define the first reviewable vertical slice of the AI Booster Kit as a human-owned, modular capability platform that can support a team delivery workflow without forcing Agent use.

## Context and boundaries

This design extends the existing common agent operating model, canonical work-artifact templates, lifecycle contract, and readiness-validation layer. It does not replace the existing sync-orchestrator contract and does not authorize Jira, Confluence, GitHub, connector, OAuth, permission, or external-write behavior.

The first slice is documentation and contract focused. It creates one canonical workflow specification, the shared vocabulary needed by that workflow, and one small ready-to-use Quick Task recipe. Runtime controller implementation, a complete Agent catalog, and heavy multi-agent frameworks remain later slices.

The platform is a shared capability area, not a mandatory Agent framework. Its core direction is fixed, while capability modules, recipes, and tuned variants remain composable, optional, versioned, and extensible.

## Non-negotiable principles

- The team workflow owns the operating model; Agents are optional tools within it.
- Every workflow outcome has a human or team owner. An Agent may execute delegated work but never owns final acceptance.
- The controller recommends modes and recipes; it does not silently activate, generate files, widen scope, or replace a User-selected skill/tool.
- The active canonical workflow contract is the first context source. Historical material is not loaded automatically.
- One workflow has one canonical workflow specification. Session state is compact and is not a transcript archive.
- Activation changes one selected framework or recipe at a time, after a late human checkpoint, with a setup snapshot and rollback path.
- `UNKNOWN` is an explicit state and never qualifies as safe by absence of evidence.
- Scope changes require an explicit human/team decision and a linked artifact; decomposition inside the accepted scope is allowed.

## Canonical repository artifacts

| Artifact | Role | Authority |
| --- | --- | --- |
| `workflows/team-delivery-loop.md` | One recurring team workflow and its executable operating contract | Canonical workflow source |
| `NOTES.md` | Small shared vocabulary and team terminology notes | Canonical terminology source |
| `contract/agent-library/quick-task-clarifier-validator.md` | Readiness and fit profile for the first light Agent recipe | Scoped capability contract |
| `docs/superpowers/specs/2026-08-01-ai-booster-kit-team-delivery-loop-design.md` | Reviewed design intent and boundaries | Design record, not default runtime context |

No default `plan.md`, `task.md`, `context.md`, `review.md`, `important.md`, or `starthere.md` files are created by this slice. `Milestone.md`, `Epic.md`, `Task.md`, and scoped `context.md` may exist only when they have their own owner, lifecycle, parent, and contribution to the Roadmap or Project Vision. The vertical work hierarchy remains `Project Vision → Roadmap → Milestone → Epic → Task`.

## Workflow architecture

The canonical workflow is:

```text
trigger
  -> semantic-change classification
  -> adaptive intake
  -> collaboration mode and assistance profile
  -> work-item contract
  -> recommendation brief
  -> one late human checkpoint
  -> scoped activation and artifact generation
  -> validation and evidence
  -> handoff/fan-in or closure
  -> pattern indexing and optional evolution
```

### Adaptive intake

The full path is:

```text
interview -> assessment -> goal shaping -> goal validation -> recommendation -> use
```

The controller may use a fast path when a User already provides a sufficiently clear vision or goal:

```text
existing goal/vision -> goal validation -> optional recommendation -> use
```

Skipped layers are recorded with the reason, evidence basis, and remaining unknowns. `SIGNIFICANT` or `BREAKING` semantic changes require re-evaluation. Cosmetic changes do not trigger the full intake.

### Collaboration modes

All modes can use Agent interview, assessment, goal shaping, validation, and optional downstream recipes. The difference is collaboration context and assistance intensity:

- `human-led`: a person or team leads refinement; Agent support is available but not required;
- `human-agent-co-creation`: the team and Agent work together during refinement;
- `solo-agent-assisted`: one User is actively interviewed and supported by an Agent before later refinement, research, or implementation assistance is selected.

The mode is selected per workflow stage or workstream, not forced across an entire Epic or Milestone.

### Work-item contract

Every bounded work item exposes:

- `owner` and `outcome_owner`;
- `agent_mode`: none, assist, execute, or verify;
- `checkpoint`: none, late, or required;
- DoR/input;
- DoD/output;
- Acceptance Criteria;
- Evidence Requirements;
- `relations` and named dependencies;
- stop and escalation conditions.

The contract depth is weighted by work-item level:

| Level | Required behavior |
| --- | --- |
| Quick Task | One or two concise statements may define DoR, DoD, AC, and minimum evidence. |
| User Story | Independently valuable and realizable outcome with a fuller acceptance and relation model. |
| Epic/Milestone | Roadmap/vision contribution, route and target tracking, full dependency/evidence/relation graph, and support for managed parallel work by 3–6 contributors. |

### Parallelization and handoff

Every Epic/Milestone that uses parallel work has a `parallelization contract` for each workstream: owner, bounded scope, input, output, dependency state, shared-write/conflict boundary, priority/order, and integration point.

Each workstream produces a compact handoff packet before fan-in. The packet includes status, output, DoD/AC result, evidence, unresolved unknowns, scope changes, dependencies, conflicts, and next bounded action. The Epic/Milestone has an `integration_owner`, `review_owner`, fan-in point, integration DoD, and rollback plan.

## Recommendation, activation, and artifact lifecycle

The controller recommendation brief contains the detected workflow/mode, proposed recipe, fit rationale, expected value and overhead, prerequisites, outputs, evidence, impact (`COMPATIBLE`, `DEGRADED`, `BREAKING`, or `UNKNOWN`), alternatives, known limitations, and pattern identity.

The User can choose the proposal, choose another approach, or continue without Agent help. The choice is skippable where no risk requires a decision. A User-selected custom skill/tool has precedence; the controller warns only when evidence indicates material degradation, breakage, or unknown impact.

Activation is scoped and reversible:

```text
recommendation -> User choice -> setup snapshot -> prerequisite check
  -> one recipe activation -> artifact generation -> post-activation validation
  -> tuning
```

An activated recipe starts as a session instance. Explicit User action may save it as a Personal or Team artifact. The base recipe is never implicitly modified; tuning creates a versioned variant or overlay. `DRAFT`, `VALIDATED`, `READY`, `ACTIVE`, `EVOLVING`, and `DEPRECATED` are distinct library states.

## Pattern identity, state, and evolution

Every run and recommendation carries:

```text
workflow_signature + recipe_signature + outcome_signature + pattern_id
```

The registry stores compact, redacted metadata and stable artifact/evidence references, not raw transcripts, credentials, tokens, cookies, or unbounded connector payloads.

Every run ends with a compact closure record containing final status, outputs, DoD/AC, evidence, decisions, overrides, scope differences, follow-ups, signatures, retention choice, and next action. `resume` reopens the closure record, active contract, artifact revisions, and current dependencies; it does not restore the full transcript.

Three consecutive `UNKNOWN` outcomes, negative outcomes, or uses without measurable improvement trigger a setup/evolution review. The controller may propose evolution but never changes a recipe automatically. `/ai-booster-kit evolve` and `$ai-booster-kit evolve` start an explicit interview and evaluation; one framework is evolved at a time, and a new version needs separate User approval.

## First ready-to-use recipe

`Quick Task Clarifier & Validator` is a light recipe for a short task or idea.

It accepts a User statement and available scoped context, uses the fast path when the intent is already clear, otherwise asks a bounded interview, and produces:

- concise DoR;
- concise DoD;
- testable Acceptance Criteria;
- minimum Evidence Requirements;
- named `relations` and dependencies when present;
- an optional downstream recipe recommendation;
- a pattern signature and closure record.

It does not write to external systems, broaden scope, activate additional frameworks, or require a full document set.

## Readiness and verification

The recipe is `READY` only after manifest/contract validation, a synthetic secret-free dry run, positive and negative path checks, missing-input and malformed-input checks, unknown/timeout/partial/stop-path checks, compatibility checks, and rollback/snapshot verification. The first slice uses local fixtures and documentation checks only; it does not claim live connector readiness.

Acceptance of the first slice requires:

- the workflow spec to describe the full lifecycle without contradictory defaults;
- the vocabulary to distinguish facts, decisions, recommendations, unknowns, and evidence;
- the Quick Task recipe to declare its readiness and fit boundaries;
- fast, guided, Agent-assisted, and Agent-free paths to remain possible;
- the three-way User decision and impact warning to be explicit;
- no implicit multi-framework change, scope expansion, external write, or raw transcript persistence;
- the documentation map and link checks to pass.

## Deliberately deferred

- Runtime controller and event watcher implementation;
- full recipe scoring and registry engine;
- heavy hierarchical or graph-based multi-agent recipe;
- Jira–GitHub–Confluence synchronization;
- external writes, OAuth, permission changes, and connector activation;
- automatic promotion of Personal artifacts to Team or Platform scope;
- modification of root `AGENTS.md`.

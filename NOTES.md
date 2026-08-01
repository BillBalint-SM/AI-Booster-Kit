# AI Booster Kit Vocabulary

This file is the compact terminology source for AI Booster Kit workflows. It
defines current terms; it is not a transcript, roadmap, or second workflow
specification.

## Platform and capabilities

- **AI Booster Kit:** a human-centered, modular capability platform for safely discovering, composing, tuning, and applying optional Agent support inside team-owned workflows.
- **Platform Core:** the stable common principles: human outcome ownership, optional Agent use, evidence-first validation, explicit unknowns, scoped activation, rollback, and controlled evolution.
- **Capability module:** an independently useful, composable platform part, such as a controller, an Agent recipe, a validator, a mapper, or a sync adapter.
- **Agent recipe:** a versioned, declarative description of an Agent or multi-Agent capability, including its fit, prerequisites, outputs, limits, and readiness evidence.
- **Controller:** the recommendation and coordination capability that detects workflow need, evaluates fit, prepares a brief, records state, and signals risk. It does not silently activate a recipe or change scope.
- **Workflow mode:** the human collaboration context for a stage or workstream: `human-led`, `human-agent-co-creation`, or `solo-agent-assisted`.
- **Assistance profile:** the optional depth of Agent use: no Agent, interview, validation, research, implementation, verification, or a composed combination.

## Work and decision contracts

- **DoR (Definition of Ready):** the minimum verified input, context, scope, dependency, and ownership conditions needed to start work.
- **DoD (Definition of Done):** the required output, validation, evidence, and handoff conditions needed to close work.
- **Acceptance Criteria (AC):** concrete, testable conditions that define the desired outcome.
- **Evidence Requirements:** the acceptable proof that AC and DoD are met; evidence proves a criterion but is not the criterion itself.
- **Relations:** named, directed links between artifacts or workstreams. Vertical links express hierarchy (`Project Vision → Roadmap → Milestone → Epic → Task`); horizontal links express dependency or meaning such as `depends_on`, `blocks`, `implements`, `validates`, `derived_from`, `parallel_to`, `contradicts`, and `related_to`.
- **Human checkpoint:** a decision-ready, late review point that presents a concise brief rather than raw working output.
- **Scope-change candidate:** a detected goal, value, acceptance, or boundary change that needs explicit human/team acceptance before it alters the active contract.

## Team coordination

- **Parallelization contract:** the per-workstream agreement for owner, bounded scope, input, output, dependency state, shared-write boundary, priority/order, and integration point.
- **Handoff packet:** the compact, structured workstream output used before transfer or fan-in: status, result, AC/DoD state, evidence, unknowns, dependencies, conflicts, and next bounded action.
- **Fan-in:** the controlled integration of parallel workstreams by a named integration owner and review owner.
- **Outcome owner:** the human or team responsible for the goal, scope, priority, and final acceptance. An Agent can own delegated execution but not the outcome.

## State, retention, and learning

- **Session-state:** compact, current run state; it is not a full transcript and may be resumed only after contract and dependency revalidation.
- **Closure record:** the compact final record of a run: status, outputs, DoD/AC, evidence, decisions, overrides, scope differences, follow-ups, retention, and next action.
- **Pattern signature:** the normalized identity of a run: `workflow_signature + recipe_signature + outcome_signature + pattern_id`.
- **UNKNOWN:** insufficient or conflicting evidence. It must remain visible and cannot be treated as safe, ready, or complete.
- **Setup snapshot:** a stable record of the active recipe/setup before activation, tuning, or evolution.
- **Rollback:** restoration of the prior validated setup after a failed or rejected scoped change; it never erases audit evidence.
- **Evolution:** explicit, evidence-based review and versioning of one recipe or framework at a time. Three consecutive unknown, negative, or non-improving outcomes trigger a review signal, not an automatic modification.

## Artifact discipline

- **Canonical workflow specification:** one source under `workflows/` for one recurring workflow.
- **Canonical work artifact:** a feature-specific, reviewable source for vision, scope, requirements, acceptance, decisions, evidence, unknowns, dependencies, and current state.
- **Derived brief:** a decision-ready projection of a canonical artifact; it is disposable and never replaces the source.
- **History:** archived evidence that is loaded only when explicitly needed.

`Milestone.md`, `Epic.md`, `Task.md`, and scoped `context.md` exist only when they have a parent, owner, lifecycle, and explicit contribution to the Project Vision or Roadmap. Default `plan.md`, `task.md`, `context.md`, and `review.md` files are not created merely to hold context.

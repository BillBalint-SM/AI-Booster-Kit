# Team Delivery Loop

**Status:** Canonical workflow specification for the first AI Booster Kit slice.

**Purpose:** Help a team or an individual turn a Project Vision, Roadmap item, Milestone, Epic, or Task into a bounded, human-owned outcome with optional, fit-based Agent support.

**Scope:** This workflow coordinates planning, refinement, research, implementation, validation, review, handoff, closure, resume, and evolution. It extends the [common agent operating model](../docs/operations/agent-operating-model.md) and preserves the [canonical lifecycle](../contract/lifecycle.md). It does not authorize connector activation, external reads or writes, OAuth, permissions, Jira–GitHub–Confluence synchronization, commits, merges, or publication.

**Vocabulary:** Terms have the meanings in the canonical [AI Booster Kit Context](../CONTEXT.md).

## 1. Trigger and entry

The controller may prepare a non-blocking recommendation when one of these events occurs:

- a new Project, Roadmap, Milestone, Epic, or Task appears;
- an existing artifact has a semantic change classified as `SIGNIFICANT` or `BREAKING`;
- a User explicitly asks for controller help, a framework recommendation, or Agent activation;
- the User calls `/ai-booster-kit` or `$ai-booster-kit` with an optional intent: `recommend`, `prepare`, `activate`, `tune`, `validate`, `evolve`, or `resume`.

`NO_TRIGGER` covers formatting and typo-only changes. `LOW` covers wording or metadata refinements that do not change the goal, scope, owner, DoR, DoD, AC, evidence, relation, or dependency. `SIGNIFICANT` changes one of those contract fields. `BREAKING` changes compatibility, an external target, authority, the workflow contract, or a rollback boundary.

Entry input is an existing Vision/Roadmap/work item, a User statement, or an explicit resume reference. The controller records the source, freshness, known facts, unknowns, and current contract hash before recommending work.

## 2. Adaptive intake

The default intake is evidence-based, not ceremonial:

```text
interview -> assessment -> goal shaping -> goal validation -> recommendation -> use
```

When the User already supplies a sufficiently clear goal or vision, the controller uses the fast path:

```text
existing goal/vision -> goal validation -> optional recommendation -> use
```

| Path | Use when | Required result |
| --- | --- | --- |
| `fast` | Goal, value, scope, and essential limits are already clear. | Goal validation and recorded residual unknowns. |
| `guided` | The goal is partly clear but requires targeted clarification. | A bounded interview and a normalized goal. |
| `deep-discovery` | Complexity, unknowns, dependencies, or scope are high. | Full interview, assessment, goal shaping, and validation. |

A skipped layer is recorded with its reason, evidence basis, and remaining unknowns. A controller must never invent missing input or call a skipped layer safe merely because it was not run.

## 3. Collaboration mode and assistance profile

Every stage or workstream has one collaboration mode and one optional assistance profile. All modes may use interview, assessment, goal shaping, goal validation, and downstream recipe recommendations.

| Workflow mode | Human role | Agent role |
| --- | --- | --- |
| `human-led` | A person or team leads refinement and decisions. | Optional analysis, interview, validation, or later execution. |
| `human-agent-co-creation` | The team co-creates the outcome with Agent support. | Active refinement, research, structure, evidence, or execution within a bounded delegation. |
| `solo-agent-assisted` | One User owns the outcome and is guided through discovery. | Active interview and goal shaping before optional later support. |

The assistance profile is `none`, `interview`, `validation`, `research`, `implementation`, `verification`, or a declared composition. Selecting a mode does not force Agent activation.

## 4. Ownership and work-item contract

Every bounded item has an `outcome_owner` who is a person or team. The outcome owner controls goal, priority, scope, acceptance, and external commitments. An Agent may be delegated an execution, research, validation, or review role, but never becomes the final outcome owner. The controller owns routing, checkpoint preparation, state recording, risk signaling, and evolution recommendation. The platform owns only common contracts and retention rules.

Each item records:

- `owner` and `outcome_owner`;
- `agent_mode`: `none`, `assist`, `execute`, or `verify`;
- `checkpoint`: `none`, `late`, or `required`;
- DoR/input;
- DoD/output;
- Acceptance Criteria;
- Evidence Requirements;
- `relations` and named dependencies;
- stop and escalation conditions.

| Level | Required contract |
| --- | --- |
| Quick Task | DoR, DoD, AC, and minimum evidence may each be one or two concise statements. |
| User Story | A functional, independently realizable value unit with a fuller acceptance and relation model. |
| Epic/Milestone | A Vision/Roadmap contribution with full dependency, evidence, and relation mapping; it supports planned parallel work by 3–6 contributors. |

The vertical relationship is `Project Vision -> Roadmap -> Milestone -> Epic -> Task`. Horizontal relations use explicit names such as `depends_on`, `blocks`, `implements`, `validates`, `derived_from`, `parallel_to`, `contradicts`, or `related_to`.

## 5. Parallel work, handoff, and fan-in

An Epic or Milestone that uses parallel work requires a `parallelization contract` for every workstream. It names the owner, bounded scope, input, output, dependency state, shared-write/conflict boundary, priority or sequence, and fan-in point. Work is parallelized only when the expected value outweighs the coordination cost.

Each workstream produces a handoff packet before transfer or fan-in with its identity, status, delivered output, DoD/AC state, evidence references, scope differences, unresolved questions, `UNKNOWN` states, dependencies, conflicts, next bounded action, and integration point.

Every Epic/Milestone fan-in has an `integration_owner`, a `review_owner`, an integration DoD, and a rollback plan. Agents may synthesize, test, or analyze handoffs; final integration acceptance remains human or team owned. Merge, publication, and external writes require their own explicit authority and are outside this workflow slice.

The local M3 fan-in contract validates one handoff packet per linked Epic. Each
packet carries `epicId`, `sourceRevision`, `owner`, `status`, delivered output,
acceptance results, evidence references, unknowns, conflicts, and a next
action. A packet may enter fan-in only with status `READY_FOR_FAN_IN`, matching
the Milestone source revision, no unresolved unknowns, and no unresolved
conflicts. `BLOCKED` and `STOPPED` packets fail closed. The contract also
requires non-empty integration and review owners, integration DoD, and a
rollback plan. This is a pure local validation boundary; it does not merge
branches or verify GitHub/PR approval.

## 6. Controller recommendation and checkpoint

The controller builds a concise recommendation brief with:

- detected workflow, stage, collaboration mode, and assistance profile;
- proposed Agent or multi-Agent recipe, scope, and fit rationale;
- expected value, setup cost, and operating overhead;
- required DoR/input, outputs, artifact requirements, and evidence;
- compatibility and impact: `COMPATIBLE`, `DEGRADED`, `BREAKING`, or `UNKNOWN`;
- known limitations, remaining unknowns, and alternatives;
- workflow, recipe, constraint, and pattern signatures.

The brief presents three non-binding paths:

1. choose the recommendation;
2. choose another approach;
3. continue without Agent help.

The User may choose a custom skill or tool. That choice has precedence over a platform recommendation. The controller does not compete with it; it warns and requires clear acceptance only when evidence indicates `DEGRADED`, `BREAKING`, or `UNKNOWN` impact. A recommendation is normally non-blocking. Material risk, scope drift, or unknown compatibility requires a visible checkpoint before the affected action proceeds.

## 7. Activation, tuning, and retention

The controller may activate only one selected recipe at a time:

```text
recommendation -> User choice -> setup snapshot -> prerequisite check
  -> one recipe activation -> artifact generation -> post-activation validation
  -> tuning
```

`BREAKING` or `UNKNOWN` activation impact requires explicit acceptance. Failed activation has no blind retry or implicit alternative activation. The setup snapshot remains available for rollback and failure evidence remains preserved.

An activation begins as a session instance. The User may explicitly save a validated variant to a Personal or Team library. Base recipes are immutable; tuning creates a versioned variant or overlay. Library states are `DRAFT`, `VALIDATED`, `READY`, `ACTIVE`, `EVOLVING`, and `DEPRECATED`. A deprecated recipe is retained for audit and rollback but is not recommended for new work.

## 8. Status, evidence, scope, and stop conditions

For the product-level `plan`, `implement`, `test`, and `review` Modules, the
pure `composeFlow` interface prepares the declared package and the pure
`assessFlow` interface validates caller-owned Stage/Checkpoint receipts. The
default change composition is used only when explicitly selected. Assessment
may recommend the next Module, but it never invokes it, persists a run, or
converts this broader workflow into a mandatory automatic loop. The complete
receipt contract is in the [Flow Assurance handbook](../docs/handbook/flow-assurance.md).

The workflow preserves these distinct states: `READY`, `READY_WITH_LIMIT`, `NOT READY`, `STOPPED`, `BLOCKED`, `UNKNOWN`, `NOT EXECUTED`, `PARTIAL`, and `COMPLETE_WITH_LIMIT`. A run is `COMPLETE` only when its defined DoD, AC, required evidence, and final acceptance are present.

The controller stops or escalates when there is stale or contradictory context, missing required input, malformed input, unknown capability, a target or authority mismatch, timeout with unknown completion, partial completion, dependency conflict, shared-write conflict, evidence mismatch, or unaccepted scope change. It records the facts, impact, unchanged state, recommendation, and decision options. It does not silently retry, broaden scope, add a tool, or change a framework.

A detected change to goal, value, scope, DoD, AC, compatibility, or an external commitment is a scope-change candidate. It must become an explicit human/team decision and linked artifact before it changes the active contract. Internal decomposition is allowed only when it preserves the accepted value and acceptance boundary.

## 9. Closure, resume, patterns, and evolution

Every run ends with a compact closure record containing final status, outputs, DoD/AC result, evidence references, decisions and overrides, scope differences, follow-up Tasks, retention choice, pattern signatures, and next bounded action. It is not a transcript.

`/ai-booster-kit resume` and `$ai-booster-kit resume` reopen the closure record, the active workflow contract, current artifact revisions, and dependencies. The controller validates that the contract hash, setup, and required evidence remain current before continuing. It does not load history or the original transcript by default.

Every run and recommendation records:

```text
workflow_signature + recipe_signature + outcome_signature + pattern_id
```

The index stores only normalized, redacted metadata and stable artifact or evidence references. It never stores credentials, tokens, cookies, raw transcripts, or unbounded connector payloads.

Three consecutive `UNKNOWN`, negative, or non-improving outcomes produce a setup/evolution review signal. The controller may recommend, but never apply, evolution. `/ai-booster-kit evolve` and `$ai-booster-kit evolve` start an explicit interview and evaluation. One recipe or framework is evolved at a time; a candidate version needs separate User approval before activation.

## 10. Non-goals

This workflow does not:

- mandate Agent use, a schedule, or a checkpoint where the contract does not need one;
- create default `plan.md`, `task.md`, `context.md`, `review.md`, or transcript files;
- modify multiple recipes, frameworks, or setup variants implicitly;
- promote `UNKNOWN` to a safe result;
- overwrite a User-selected skill/tool;
- perform external synchronization, writes, OAuth, permissions, commits, merges, or publication;
- claim runtime controller, connector, or host capability that has not been independently validated.

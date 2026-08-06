# Scenario Contract 02 — Business Decision → Technical Handoff

## Contract status

- User-facing contract: `READY_WITH_LIMIT`
- Runtime basis: `PARTIAL`
- End-to-end Controller/runtime execution: `NOT_EXECUTED`
- Unsupported capabilities: `DESIGN_ONLY` / `NOT_EXECUTED`
- Primary audience: PO/PM
- Secondary audience: Developer
- Topology: strong single-agent session with optional reviewer/human checkpoint
- External writes: not authorized by this contract

## Trigger

Use this scenario before development when the business value, desired result, scope, non-goals, acceptance boundary, or ownership needs to be made explicit. It prevents technical implementation choices from silently redefining the business decision.

Trigger examples:

- “Turn this product idea into a PO/PM-approved Decision Brief before development.”
- “Prepare a Milestone/Epic-ready package without deciding the technical architecture yet.”
- “Create the technical clarification handoff that a developer can use when implementation starts.”
- “Review whether this proposed scope is ready for technical discovery.”

Copy-paste starter prompt:

```text
Run Business Decision → Technical Handoff.

At session start, let me choose exactly one output mode:
1. Decision Brief
2. Milestone/Epic-ready package

Business goal/outcome:
<describe the desired value>

Known scope:
<describe what is in scope>

Known non-goals, constraints, dependencies, and evidence:
<provide what is known; preserve UNKNOWN where needed>

Do not choose implementation architecture. Interview me until the business boundary is explicit, propose Features without adding them to scope automatically, and produce a technical clarification handoff that protects the confirmed goal, scope, Features, and acceptance boundary.
```

## Goal

Create a PO/PM-readable decision package that:

1. fixes the desired value, goal, scope, non-goals, and acceptance boundary before development;
2. records constraints, evidence, unknowns, dependencies, and owner;
3. proposes Features without turning decomposition into automatic scope expansion;
4. provides a developer-ready technical clarification handoff;
5. preserves the business boundary when technical decisions begin.

## Non-goals

- This contract does not select architecture, capability, API, library, or system design.
- It does not decompose automatically to Story/Task level.
- It does not start a new technical session automatically.
- It does not create or update external Epic/Milestone records.
- It does not implement, validate, merge, or apply fixes.

## Session start and mode selection

The User selects one mode at the start:

### Mode A — Decision Brief

The output records:

```text
outcome
business_value
scope
non_goals
owner_alias_snapshot
constraints
acceptance_boundary
evidence
unknowns
dependencies
next_technical_clarification
```

### Mode B — Milestone/Epic-ready package

The output contains the full Decision Brief plus:

- Milestone goal and outcome;
- confirmed Feature catalog;
- primary/additional Feature relationship per Epic;
- Epic-ready boundaries and dependencies;
- owners and next actions;
- evidence and unknowns;
- acceptance and readiness boundaries;
- Milestone and Epic handoff sections;
- next technical clarification handoff.

The selected mode remains in force for the session. Missing inputs produce `READY_WITH_LIMIT` and an explicit next action; the session must not downgrade or switch mode automatically.

## Required inputs

| Input | Required | Notes |
|---|---:|---|
| Selected output mode | Yes | Choose Decision Brief or Milestone/Epic-ready package at start. |
| Business outcome | Yes | Missing value is a visible limit. |
| Business value | Yes | Why the result matters. |
| Current scope | Yes | Preserve exact boundaries. |
| Non-goals | Strongly required | If unknown, record `UNKNOWN` and a next action. |
| Acceptance boundary | Yes | Business conditions for the result. |
| Owner alias | Yes | Use user-local alias contract. |
| Constraints/dependencies | Yes, may be `UNKNOWN` | Do not invent technical facts. |
| Evidence | Optional at start | Evidence gaps remain visible. |

## Process

### 1. Initialize owner identity and choose mode

- Resolve the existing user-local alias or ask once on first use.
- Record the owner alias snapshot in the session/handoff.
- Ask the User to select one output mode.
- Do not change the selected mode later without explicit User request and alias-attributed confirmation.

### 2. Interview the business boundary

Clarify outcome, business value, scope, non-goals, acceptance boundary, owner, constraints, dependencies, evidence, unknowns, and next technical clarification. Use `UNKNOWN` where the fact is not available; finding environment facts is the Agent's responsibility when safely discoverable.

### 3. Propose and confirm Features

- Propose a bounded batch of Features from the confirmed goal, dependencies, and acceptance boundary.
- Mark one Feature `primary` per Epic by default.
- Mark additional Features `additional` and provide a concrete reason.
- Keep all proposals `PROPOSED` until the User confirms, changes, or rejects them.
- Do not create Story/Task scope automatically.

### 4. Produce the selected package

Generate the selected output mode without adding unconfirmed scope. The Milestone/Epic-ready package is ready for delivery planning, not technical implementation.

### 5. Create the technical clarification handoff

The handoff is logically included in or attached beside the Milestone/Epic package. It contains:

```text
stable_milestone_id
stable_epic_id
source_revision
business_goal
confirmed_scope
confirmed_features
acceptance_boundary
technical_question
decision_boundary
constraints
evidence
unknowns
next_role: DEV or technical owner
protected_invariants
next_action
```

No technical session starts automatically. When a DEV begins implementation, the DEV may start a separate technical session from this handoff. That session must first read back and confirm the protected invariants.

### 6. Protect the business boundary

Technical freedom is permitted inside the confirmed boundary. A technical proposal that would alter the goal, scope, Feature, business value, or acceptance boundary enters `SCOPE_CHANGE` rather than being silently accepted.

### 7. Handle delegation

PO/PM or reviewer responsibility may be explicitly delegated for a named decision or scope. Delegation is bounded and alias-attributed. Default delegation record:

```text
requested_by_alias
delegated_role
scope
decision
timestamp                 # ISO 8601 with timezone offset
```

The delegated role may confirm the specifically named business acceptance or `DONE` decision. Broader Epic/Milestone authority requires explicit User wording.

## Question tree

**Q1** - **Output mode**: Is the desired output a Decision Brief or a Milestone/Epic-ready package?

Recommended answer: require an explicit User choice at session start and preserve it for the whole session.

**Q2** - **Business outcome**: What value and working result must exist for this decision to be meaningful?

Recommended answer: state the outcome in observable business terms before discussing implementation.

**Q3** - **Scope and non-goals**: What is included, and what is deliberately excluded?

Recommended answer: write both lists; use `UNKNOWN` for an unresolved boundary and create a next action.

**Q4** - **Acceptance boundary**: What must PO/PM or an explicitly delegated role be able to confirm as true?

Recommended answer: define a business acceptance boundary independent of technical implementation details.

**Q5** - **Feature proposal**: Which Features realize the business outcome without automatic scope expansion?

Recommended answer: propose a batch, mark primary/additional, record additional reasons, and wait for User confirmation.

**Q6** - **Technical handoff**: What question must a DEV answer before implementation, and what must not be changed?

Recommended answer: record the technical question, decision boundary, constraints, evidence, unknowns, next role, and protected invariants.

**Q7** - **Conflict**: Do sources or stakeholders disagree within the same scope?

Recommended answer: preserve `CONFLICT`; do not silently choose a convenient answer or produce a false DONE.

**Q8** - **Scope change**: Would the new information change the outcome, scope, Feature, or acceptance boundary?

Recommended answer: preserve the current revision, produce impact and decision summaries, and obtain PO/PM or explicitly delegated re-confirmation.

**Q9** - **Missing input**: Is a selected-mode field unavailable?

Recommended answer: keep the selected mode, remain `READY_WITH_LIMIT`, show the missing field, and create an explicit next action. Continue only after the required input or an explicit User request/confirmation.

## Output contract

The session produces exactly one selected package mode plus:

- owner alias snapshot;
- business outcome and value;
- scope and non-goals;
- constraints, dependencies, evidence, unknowns, and conflicts;
- acceptance boundary;
- confirmed Feature proposals and reasons for additional Features;
- Milestone/Epic handoff relation and stable IDs;
- next technical clarification handoff;
- protected invariants;
- readiness status and missing fields;
- delegation records if used;
- explicit next action.

## Acceptance criteria

- The User selected one mode at session start, and that mode remains in force.
- The output is understandable to PO/PM without requiring technical architecture decisions.
- No Story/Task decomposition is added automatically.
- Features are proposed and remain `PROPOSED` until User confirmation.
- The technical handoff is attached logically to the relevant Milestone/Epic package.
- A DEV can identify the technical question, decision boundary, constraints, evidence, unknowns, and protected invariants.
- A technical choice cannot silently alter the business goal, scope, Feature, or acceptance boundary.
- Missing inputs remain visible as `READY_WITH_LIMIT` with a next action.
- Delegated acceptance/DONE decisions are scope-bound and alias-attributed.

## Stop conditions

Stop and preserve evidence when:

- the User has not selected an output mode;
- the business outcome or acceptance boundary remains unknown and no safe next action exists;
- a conflict remains unresolved;
- a requested technical choice would change the business boundary;
- scope change lacks explicit re-confirmation;
- a requested action would write externally or implement a change;
- the User explicitly stops the session.

In these branches, the session remains `STOPPED` until the missing mode choice, confirmation, evidence, or authority is supplied.

## Future branches

- automatic connector attachment to GitHub/Jira;
- automatic launch of the technical clarification session;
- architecture decision records and capability selection;
- automatic Story/Task decomposition;
- external PO/PM delegation registry;
- live Epic/Milestone state updates.

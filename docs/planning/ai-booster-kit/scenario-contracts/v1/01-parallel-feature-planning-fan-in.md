# Scenario Contract 01 — Parallel Feature Planning & Fan-in

## Contract status

- User-facing contract: `READY_WITH_LIMIT`
- Runtime basis: `PARTIAL`
- End-to-end Controller/runtime execution: `NOT_EXECUTED`
- Unsupported capabilities: `DESIGN_ONLY` / `NOT_EXECUTED`
- Primary audience: PO/PM
- Secondary audience: Developer, Tester
- Topology: strong single-agent session with optional reviewer/human checkpoint
- External writes: not authorized by this contract

## Trigger

Use this scenario when a Milestone or Epic has a meaningful functional goal that must be clarified into one or more Features, prepared for parallel work, and later combined through a controlled fan-in.

Trigger examples:

- “Break this Epic into the smallest useful Features without silently expanding scope.”
- “Prepare a parallel-ready Feature plan with owners, dependencies, evidence, and a fan-in boundary.”
- “Review the proposed Feature decomposition before any development starts.”
- “We have several Epic handoffs and need to determine whether they are ready for controlled fan-in.”

Copy-paste starter prompt:

```text
Run Parallel Feature Planning & Fan-in for this Milestone/Epic.

Goal:
<describe the intended value and working result>

Known scope:
<describe what is in scope>

Known constraints/dependencies:
<list what is known; use UNKNOWN where evidence is missing>

Propose a bounded batch of Features. Mark exactly one primary Feature per Epic by default; mark any additional Feature with a reason. Do not add a Feature to scope until I confirm or modify it. Prepare Feature owners, dependencies, outputs, acceptance criteria, evidence needs, next actions, Milestone/Epic handoffs, readiness, and explicit conflict/scope-change branches.
```

## Goal

Create a practical, parallel-ready plan in which:

1. the Agent proposes Features from the goal, dependencies, and acceptance boundary;
2. the User confirms, edits, or rejects each proposed Feature;
3. each confirmed Feature has a bounded owner, scope, output, acceptance boundary, evidence, and next action;
4. Milestone/Epic handoffs preserve the plan and enable controlled fan-in;
5. no implementation, external write, or automatic scope expansion occurs.

## Non-goals

- This contract does not implement an Epic, Story, Task, or Bug.
- It does not decompose automatically to Story/Task level.
- It does not select whether implementation or validation is AI-only, human-only, or hybrid.
- It does not create or update GitHub/Jira issues.
- It does not merge branches, apply fixes, or perform external fan-in.
- It does not create a new hierarchy level for Feature.

## Required inputs

| Input | Required | Notes |
|---|---:|---|
| Stable Milestone or Epic ID | Yes | Human-readable hierarchy path is display-only. |
| Goal/outcome | Yes | The intended value and working result. |
| Current scope | Yes | Missing detail keeps the session `READY_WITH_LIMIT`. |
| Known constraints/dependencies | Yes, may be `UNKNOWN` | Unknowns must remain visible. |
| Acceptance boundary | Yes, may be incomplete | Missing parts produce an explicit next action. |
| Current owner alias | Yes | Ask on first use; reuse local user-local alias afterwards. |
| Existing evidence/references | Optional | Never invent evidence or native links. |

## Feature contract

The Agent proposes a batch; the User confirms the final set. Each Feature record contains:

```text
feature_id
feature_role: primary | additional
additional_reason: required when feature_role=additional
epic_id
title
functional_goal
realizable_value
scope
dependencies
feature_owner_alias
output
acceptance_boundary
acceptance_criteria
evidence
unknowns
conflicts
next_action
proposal_status: PROPOSED | CONFIRMED | REJECTED
```

An additional Feature is allowed only for a concrete reason such as dependency, a separate acceptance boundary, or a distinct realizable result. A rejected Feature remains recorded as rejected and does not enter scope.

## Process

### 1. Initialize identity and scope

- Resolve the user-local owner alias.
- On first use, ask once and store only the non-sensitive alias in the user-local config.
- Resolve the stable Milestone/Epic IDs and display hierarchy.
- If a required scope fact is missing, ask for it; do not silently invent it.

### 2. Propose Features

- Read the goal, dependencies, and acceptance boundary.
- Propose a bounded batch of Features.
- Mark one Feature `primary` for each Epic by default.
- Mark each rare additional Feature `additional` and provide its reason.
- Keep all proposed Features `PROPOSED` until the User confirms or changes them.

### 3. Confirm the Feature set

- Present the batch for User confirmation.
- Record confirmed, modified, and rejected proposals.
- Do not add newly discovered scope automatically.
- A new desired value or changed acceptance boundary enters `SCOPE_CHANGE`.

### 4. Build Feature work packets

For every confirmed Feature, produce a work packet with:

- Feature owner alias;
- bounded scope and non-goals;
- dependencies and dependency state;
- expected output;
- acceptance criteria and boundary;
- evidence required and evidence already available;
- unknowns/conflicts;
- next action;
- shared-write and conflict boundary;
- intended fan-in point.

### 5. Produce handoffs

Create or update logically related Milestone and Epic handoff sections. Handoffs are not overwritten; a new revision records impact, decision, confirmation, and `supersedes`.

The Milestone handoff aggregates Epic states. The Epic handoff includes Feature and Story/Task relationships. Story/Task items do not receive separate handoffs by default.

### 6. Delivery and QA gate read-back

The contract records the intended delivery chain:

```text
DEV implementation/validation
    → DEV handoff
    → human Tester tests Epic and Story/Task parts
    → QA gate
    → PO/PM or explicitly delegated role validates business result
    → DONE
```

Implementation and validation modes are outside this contract. The Tester records:

- Tester alias;
- inspected Epic/Story/Task IDs;
- `PASS` or `FAIL`;
- evidence;
- Bug links when applicable;
- optional test environment details.

When a defect is found, the failing Story/Task is the primary Bug link. The Epic is a secondary context link, and is required when the defect affects multiple parts or the Epic itself. The Epic cannot be `DONE`; the next action is an explicit DEV fix and re-test.

### 7. Readiness and controlled fan-in

The plan may be used as `READY_WITH_LIMIT` while integration owner, review owner, or rollback boundary is missing. The readiness check may promote it to `READY_FOR_FAN_IN` only when all of these are present:

- `integration_owner`;
- `review_owner`;
- rollback boundary/plan;
- exact source revision and Epic set;
- one handoff packet per Epic;
- `READY_FOR_FAN_IN` packet status;
- non-empty delivered output, acceptance results, and evidence;
- empty unknown and conflict lists.

No merge or external fan-in is performed by this contract.

## Question tree

**Q1** - **Scope identity**: Which stable Milestone/Epic is being planned, and what is its intended functional result?

Recommended answer: resolve stable IDs first; keep unknown identifiers visible and do not substitute display numbering.

**Q2** - **Feature proposal**: What is the smallest useful Feature set that realizes the Epic goal without expanding scope?

Recommended answer: propose one primary Feature per Epic and only propose additional Features with a concrete dependency, acceptance, or distinct-result reason.

**Q3** - **User confirmation**: Which proposed Features are confirmed, modified, or rejected?

Recommended answer: keep every proposal `PROPOSED` until the User confirms it; rejected items remain outside scope.

**Q4** - **Parallel ownership**: Who owns each confirmed Feature, what is its bounded output, and what does it depend on?

Recommended answer: assign a Feature owner alias and record scope, output, dependency state, evidence, and next action.

**Q5** - **Fan-in readiness**: Are integration owner, review owner, rollback boundary, exact revision, and complete evidence present?

Recommended answer: if any is missing, remain `READY_WITH_LIMIT` and record the missing field and next action.

**Q6** - **Conflict**: Do evidence, handoffs, or decisions contradict each other within the same scope?

Recommended answer: preserve the contradiction as `CONFLICT`; do not fan-in or mark `DONE`.

**Q7** - **Scope change**: Does a new request change the goal, scope, Feature, or acceptance boundary?

Recommended answer: preserve the current plan, create an impact summary, and request explicit PO/PM or delegated-role re-confirmation.

**Q8** - **Unknown**: Is a fact necessary for decomposition or readiness unavailable?

Recommended answer: record `UNKNOWN`, identify the evidence source/owner, and create an explicit next action.

## Output contract

The session produces:

1. a confirmed Feature catalog;
2. one work packet per confirmed Feature;
3. a Milestone handoff aggregate;
4. an Epic handoff with Feature and work item relationships;
5. readiness status and missing-field list;
6. QA gate expectations and Bug-link rules;
7. evidence, unknowns, conflicts, decisions, and next actions;
8. optional reviewer result and explicit reviewer skip record;
9. revision and `supersedes` references.

## Acceptance criteria

- Every Epic has exactly one `primary` Feature unless the User confirms a different explicit structure.
- Every `additional` Feature has a reason and User confirmation.
- Every confirmed Feature has owner, scope, dependency state, output, acceptance boundary, evidence, unknowns, conflicts, and next action fields.
- No proposed Feature silently enters scope.
- Milestone and Epic handoff levels are represented without changing the hierarchy.
- QA pass, Bug failure, PO/PM acceptance, delegated acceptance, and DONE boundaries are explicit.
- `READY_FOR_FAN_IN` is impossible while required integration/review/rollback data or evidence is missing.
- No external write, implementation, merge, Bug creation, or fix is claimed or performed.

## Stop conditions

Stop and preserve evidence when:

- the stable target or source revision is unknown or conflicting;
- the User has not confirmed the proposed Feature set;
- a conflict remains unresolved;
- a scope change is requested without re-confirmation;
- required evidence is unavailable;
- a required owner or rollback boundary is missing at the fan-in gate;
- a requested action would write externally or modify implementation;
- the User explicitly stops the session.

In these branches, the session result is `STOPPED` until the missing confirmation, evidence, or authority is resolved.

## Future branches

- automated Feature decomposition;
- Story/Task-level handoffs;
- connector-backed GitHub/Jira attachment;
- connector-backed Bug creation;
- merge/fan-in execution;
- automatic runtime launch of this scenario.

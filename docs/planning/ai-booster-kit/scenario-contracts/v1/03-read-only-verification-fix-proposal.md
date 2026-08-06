# Scenario Contract 03 — Read-only Verification & Fix Proposal

## Contract status

- User-facing contract: `READY_WITH_LIMIT`
- Runtime basis: `PARTIAL`
- End-to-end Controller/runtime execution: `NOT_EXECUTED`
- Unsupported capabilities: `DESIGN_ONLY` / `NOT_EXECUTED`
- Primary audience: Tester, Developer
- Secondary audience: PO/PM
- Topology: strong single-agent session with optional reviewer/human checkpoint
- External writes: prohibited by this contract

## Trigger

Use this scenario when a proposed change or fix must be checked against expected behavior using read-only evidence, without modifying the target or claiming that an unexecuted fix was applied.

Trigger examples:

- “Probe whether this proposed fix would address the expected behavior, but do not edit anything.”
- “Compare the current observed behavior with the expected behavior and produce an evidence-backed fix proposal.”
- “Run a read-only verification loop against the available repository evidence.”
- “The environment is incomplete; use what can be verified and mark the rest UNKNOWN.”

Copy-paste starter prompt:

```text
Run Read-only Verification & Fix Proposal.

Proposed change or fix:
<describe the proposed change; required>

Expected behavior:
<describe the expected result; required>

Optional environment/context:
<provide if available; do not block solely on its absence>

Use read-only probes only. Run at most three rounds. For each round, separate observed facts, evidence references, inference, fix proposal, confidence/limits, and next action. Do not modify files, create Bugs, or claim that a fix was executed.
```

## Goal

Produce a traceable verification result that separates:

- what was observed;
- what evidence supports the observation;
- how it compares to expected behavior;
- what can and cannot be inferred;
- what minimal fix proposal is evidence-backed;
- what remains unexecuted and what should happen next.

## Non-goals

- No file, repository, configuration, database, Jira, GitHub, or production modification.
- No Bug creation or external issue update by this contract.
- No automatic fix implementation.
- No automatic Story/Task expansion or Story/Task scope creation.
- No claim that a proposed change was applied.
- No requirement for a complete environment when read-only evidence can still answer the bounded question.

## Required and optional inputs

| Input | Required | Notes |
|---|---:|---|
| Proposed change/fix | Yes | The proposal being checked. |
| Expected behavior | Yes | The behavior against which evidence is compared. |
| Target/scope | Yes | Stable target or bounded local scope. |
| Evidence sources | Yes, may be incomplete | Missing evidence becomes `UNKNOWN`. |
| Environment details | Optional | Absence must not block when the question remains probeable. |
| Current owner alias | Yes | Ask on first use, then reuse user-local alias. |

## Process

### 1. Establish the read-only boundary

- Resolve the target and scope.
- Confirm that the proposed action is observation and recommendation only.
- Reject or stop any request to modify the target inside this contract.
- Initialize the local owner alias if needed.

### 2. Validate required inputs

- Require both proposed change and expected behavior.
- If either is missing, ask for it and keep the session `READY_WITH_LIMIT` with an explicit next action.
- Do not switch to another scenario or mode automatically.

### 3. Run up to three rounds

Each round follows the same structure:

```text
round_number: 1 | 2 | 3
target_scope
probe_question
observed_facts
expected_behavior
observed_behavior: PASS | FAIL | UNKNOWN
evidence_refs
delta_or_match
inference
evidence_backed_fix_proposal
confidence_and_limits
next_action
```

The Agent may use the output of a previous round to refine the next read-only probe. No round may write to the target.

### 4. Produce the session result

The session-level result always keeps these fields separate:

```text
session_status: DONE | STOPPED | UNKNOWN
observed_behavior: PASS | FAIL | UNKNOWN
fix_execution: NOT_EXECUTED
```

`session_status: DONE` means the verification session completed its bounded work. It does not mean the system was fixed. A `FAIL` observation may still produce a `DONE` session when the evidence-backed proposal is complete; the unexecuted fix remains explicit.

### 5. Milestone/Epic handoff relation

When the verification is part of a broader delivery slice, the result is linked from the relevant Milestone/Epic handoff as read-only evidence and next action context. It does not create a new hierarchy level, does not create Story/Task scope automatically, and does not rewrite the owning handoff.

### 6. Handle the third-round boundary

After the third unsuccessful, conflicted, or uncertain round:

- use `STOPPED` when the safe limit was reached or further probing would require a new authority/scope;
- use `UNKNOWN` when evidence is insufficient to decide;
- preserve all round records and create an explicit next action;
- never hide the limit by claiming PASS or executed fix.

## Question tree

**Q1** - **Proposed change**: What exact proposed change or fix is being checked?

Recommended answer: require a bounded, inspectable proposal; if absent, remain `READY_WITH_LIMIT` and request it.

**Q2** - **Expected behavior**: What should be observable if the proposal is correct?

Recommended answer: state the expected behavior in testable terms; do not substitute a vague desired outcome.

**Q3** - **Read-only scope**: What target and evidence sources may be inspected without writing?

Recommended answer: resolve a bounded target; stop if the target or authority is ambiguous.

**Q4** - **Observation**: What facts are directly observed, and what is only inferred?

Recommended answer: keep observed facts, evidence references, and inference in separate fields.

**Q5** - **Mismatch**: Does observed behavior differ from expected behavior?

Recommended answer: classify `PASS`, `FAIL`, or `UNKNOWN`; provide a minimal evidence-backed proposal only.

**Q6** - **Conflict**: Do evidence sources contradict one another?

Recommended answer: preserve `CONFLICT`, do not force PASS/FAIL, and stop or create a targeted next action.

**Q7** - **Scope change**: Would the proposed remedy change the original goal, scope, Feature, or acceptance boundary?

Recommended answer: mark the branch as `SCOPE_CHANGE`, stop the verification branch, and return an impact summary for explicit User/PO/PM confirmation.

**Q8** - **Round limit**: Has the third round ended without a conclusive result?

Recommended answer: use `STOPPED` or `UNKNOWN`, preserve the evidence trail, and record the next action.

**Q9** - **Write request**: Has the User asked to apply the fix, create a Bug, or modify an external system?

Recommended answer: do not perform it in this contract; produce a handoff/next action for a separately authorized workflow.

## Output contract

The session produces:

1. input summary and read-only boundary;
2. up to three round records;
3. observed facts and evidence references;
4. expected-versus-observed comparison;
5. inference and confidence/limits;
6. evidence-backed fix proposal;
7. `session_status`, `observed_behavior`, and `fix_execution`;
8. conflicts, unknowns, scope-change impact, and next action;
9. owner alias snapshot and optional reviewer result;
10. no external write claim.

## Acceptance criteria

- Proposed change and expected behavior are required and visible.
- Environment details are optional and non-blocking when the bounded probe remains possible.
- No more than three rounds are run.
- Every round separates facts, evidence, inference, proposal, limits, and next action.
- `fix_execution` is always `NOT_EXECUTED` in this contract.
- A completed session may be `DONE` even when `observed_behavior` is `FAIL`, provided the bounded evidence-backed proposal is complete.
- A third-round failure, conflict, or unknown result becomes `STOPPED` or `UNKNOWN`, never a false PASS.
- No file, external system, Bug, or implementation change is performed.

## Stop conditions

Stop when:

- the proposed change or expected behavior remains missing;
- the target or scope is ambiguous;
- read-only authority is insufficient;
- a requested probe would require a write;
- evidence conflict cannot be resolved within the scope;
- the third round is exhausted;
- a scope change is required but not confirmed;
- the User explicitly stops the session.

## Future branches

- applying a fix in a separate explicitly authorized workflow;
- connector-backed Bug creation;
- automated regression execution;
- environment capture and reproducible test setup;
- more than three rounds under a separately approved contract;
- runtime Controller support for this exact scenario.

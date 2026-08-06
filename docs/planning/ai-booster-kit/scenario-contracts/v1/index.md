# AI Booster Kit — Reusable Scenario Contracts v1

## Package status

- Scope: reusable scenario contracts for planning, handoff, verification, and controlled fan-in.
- Audience: developers, PO/PMs, and testers.
- Contract status: `READY_WITH_LIMIT` — each document is immediately usable as a User-facing session/skill-flow.
- Runtime basis: `PARTIAL` — reusable primitives exist in the `main` baseline.
- End-to-end runtime: `NOT_EXECUTED` — the Controller does not yet launch these complete flows.
- Unsupported runtime steps: `DESIGN_ONLY` or `NOT_EXECUTED` as marked in each contract.
- Owner identity: `NOT_EXECUTED` — the local alias store is specified but not implemented in `main`.
- Planning session confirmation: shared understanding confirmed by User on 2026-08-06.

This package is a design and User-test artifact. It does not change runtime code, create external issues, attach files to GitHub/Jira, create Bugs, or apply fixes.

## Catalog

| Contract | Primary audience | Secondary audience | User-facing status | Runtime basis | End-to-end runtime | Main relation |
|---|---|---|---|---|---|---|
| [Parallel Feature Planning & Fan-in](./01-parallel-feature-planning-fan-in.md) | PO/PM | Developer, Tester | `READY_WITH_LIMIT` | `PARTIAL` | `NOT_EXECUTED` | Milestone/Epic handoff and controlled fan-in |
| [Business Decision → Technical Handoff](./02-business-decision-technical-handoff.md) | PO/PM | Developer | `READY_WITH_LIMIT` | `PARTIAL` | `NOT_EXECUTED` | Business boundary before technical implementation |
| [Read-only Verification & Fix Proposal](./03-read-only-verification-fix-proposal.md) | Tester, Developer | PO/PM | `READY_WITH_LIMIT` | `PARTIAL` | `NOT_EXECUTED` | Evidence-backed observation without writes |

## Canonical hierarchy and Feature meaning

The delivery hierarchy remains:

```text
Roadmap
└── Milestone
    ├── Handoff
    └── Epic
        ├── Handoff
        ├── Story / Task
        └── Bug
```

`Feature` is not a new hierarchy level. It is the functional goal of an Epic: the realizable value and working result that helps the Milestone succeed.

V1 rules:

- Each Feature belongs to exactly one Epic.
- An Epic has exactly one `primary` Feature by default.
- Additional Features are rare and must be marked `additional` with a reason such as dependency, a separate acceptance boundary, or a distinct realizable result.
- The Agent proposes a Feature batch; the User confirms, edits, or rejects each proposed Feature before it enters scope.
- An Epic is not `DONE` while any confirmed Feature or its work items remain unaccepted, unless an explicit `SCOPE_CHANGE` decision removes it from the active scope.

## Shared role model

| Role | Default responsibility |
|---|---|
| Feature owner | DEV or the person who developed the Feature |
| `review_owner` | Tester/QA quality gate |
| `integration_owner` | Controlled fan-in coordination |
| PO/PM | Business acceptance and `DONE` confirmation |
| Reviewer | Optional technical/structural completeness checkpoint |

PO/PM and reviewer responsibilities may be explicitly delegated by the User. Delegation is decision-scoped, never silently global, and is logged with the allowed audit values only:

```text
requested_by_alias
delegated_role
scope
decision
timestamp                 # ISO 8601 with timezone offset
```

The delegation is valid only for the named decision or session. The requester/confirming alias is recorded in the delegation record; the executing owner alias is preserved in the session or handoff owner snapshot.

## Shared status model

The status layers must not be collapsed:

```text
user_facing_contract: READY_WITH_LIMIT
runtime_basis: PARTIAL
end_to_end_runtime: NOT_EXECUTED
owner_identity: NOT_EXECUTED
```

Other statuses have these meanings:

- `PROPOSED`: Agent-suggested Feature or decision not yet confirmed by the User.
- `CONFIRMED`: User-confirmed Feature or decision input.
- `READY_WITH_LIMIT`: the selected session can continue, but visible fields or runtime capabilities are missing.
- `READY_FOR_FAN_IN`: integration owner, review owner, rollback boundary, and all fan-in evidence requirements are complete.
- `DONE`: final User-facing result after the applicable acceptance gate and confirmation.
- `STOPPED`: a safe stop was reached and the next action is explicit.
- `UNKNOWN`: evidence or capability is insufficient to determine the result.
- `CONFLICT`: contradictory evidence or decisions remain within the same scope; no fan-in or `DONE`.
- `SCOPE_CHANGE`: the requested goal, scope, Feature, or acceptance boundary changed; preserve the prior decision and obtain a new confirmation.
- `DESIGN_ONLY`: the contract describes a capability that is not available in the current runtime.
- `NOT_EXECUTED`: the capability or external operation was not run.

`DONE` is the final user-facing outcome. It does not replace intermediate, readiness, safety, or capability statuses.

## Owner identity contract

The first use asks for a display name/local alias and stores it as the default. Later sessions silently reuse it. A change requires explicit `reconfigure owner`; a missing or invalid config may be requested again.

Logical cross-platform shape:

```json
{
  "version": 1,
  "ownerAlias": "..."
}
```

Windows first example:

```text
%LOCALAPPDATA%\AI Booster Kit\owner-identity.json
```

The store is user-local and outside the repository. There is no repository-local fallback. It must not contain tokens, credentials, email addresses, provider identifiers, machine identifiers, repository data, or other sensitive values. A handoff keeps the alias snapshot from the time it was created; later reconfiguration does not rewrite history.

## Handoff and revision contract

- Default handoff levels are Milestone and Epic.
- Roadmap level has a catalog/index, not a default handoff.
- Story/Task level has no separate handoff by default; its information is represented in the Epic handoff.
- A handoff is logically attached to or adjacent to its Milestone/Epic. Actual GitHub/Jira attachment is `DESIGN_ONLY`/`NOT_EXECUTED` unless a supported connector and explicit write authorization exist.
- Stable IDs are identity. Human-readable hierarchy paths such as `#1.1.1` are display paths only.
- Handoffs are never overwritten. A new revision records the new decision, impact, PO/PM confirmation, and a `supersedes` reference to the previous revision.

## Current runtime boundary from `main`

The `main` baseline contains reusable primitives but not the complete User-facing flows:

- fan-in validation exists in `src/context/team-delivery.ts`, while Feature identity, Feature proposal/confirmation, and Controller flow are missing;
- bounded refinement and implementation recipes exist, while the Decision Brief, Milestone/Epic-ready package, and technical handoff entry point are missing;
- bounded validation/debugging recipes and `validation`/`debugging` formations exist, while the three-round exact verification contract is missing;
- owner alias storage and `owner-identity.json` support are absent.

Therefore, the contracts are ready for manual User testing with visible limits, but no document claims end-to-end runtime execution.

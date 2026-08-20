# Booster Mode request and Compass contract

Use this reference only when activating, refreshing, or integrating the
Delivery Compass. Stage Skills use their own `SKILL.md` contracts.

## Request

The deterministic helper accepts one exact JSON object:

| Field | Contract |
| --- | --- |
| `requestVersion` | Exact string `1.0`. |
| `mode` | `AUTO`, `NEW`, `ATTACH`, or `RESUME`. `AUTO` selects `ATTACH` when artifact references are present; otherwise `NEW`. |
| `collaboration` | `INDIVIDUAL` or `TEAM`. |
| `objective` | Non-empty string or `null`. A non-null objective satisfies the `objective` artifact input. |
| `preferredSkill` | Skill ID or `null`. A selected Skill is evaluated independently of registry order. |
| `artifacts` | Unique artifact types with non-empty caller-owned references, explicit state, and optional exact-reference binding. A reference is a pointer, not proof of its bytes. |
| `facts` | Verified observations only. |
| `decisions` | Explicit User decisions and approvals only. |
| `evidence` | Reproducible evidence references. |
| `unknowns` | Missing or contradictory facts that must remain visible. |
| `constraints` | Scope, safety, compatibility, cost, and authority boundaries. |
| `stopReasons` | Reasons the session may not safely proceed. Any item forces `STOPPED`. |

All fields are required, foreign fields are rejected, arrays must be dense,
and list sizes are bounded. The machine-readable schema is
`booster-request.schema.json`; the runtime remains authoritative for cross-field
checks such as unique artifact types and registered Skill IDs.

Artifact state is one of `DECLARED`, `VERIFIED`, `ACCEPTED`, `COMPLETE`,
`COMPLETE_WITH_LIMIT`, `STOPPED`, or `UNKNOWN`. A Skill may consume only
`COMPLETE` or `COMPLETE_WITH_LIMIT` artifacts; declaration alone never makes a
downstream Skill ready. The canonical implementation gate additionally
requires `accepted-plan` in `ACCEPTED` state bound to the exact, complete
`plan-handoff` reference and `repository-verified` in `VERIFIED` state. A
draft, stale, unknown, stopped, incomplete, or incorrectly bound contract
cannot become `READY`.

## Delivery Compass

The helper returns:

- a deterministic `compassId` over the complete normalized request and Skill
  Registry; it is a correlation identity, not a signature;
- session/collaboration mode, observed stage, objective, preferred Skill, and
  completion scope;
- `READY`, `WAITING_FOR_DECISION`, `NEEDS_INPUT`, `COMPLETE`, `STOPPED`, or
  `UNKNOWN`;
- the narrated projection, facts, decisions, evidence, unknowns, and
  constraints;
- one recommendation, all currently available Skills, blockers, next action,
  and Handoff readiness;
- fixed boundaries: `RECOMMENDATION_ONLY`, `executionPerformed: false`, and
  `persistencePerformed: false`.

The helper never invokes a Skill, writes session state, selects an Agent or
Model, grants authority, or performs an external action.

## Artifact progression

The normal individual recipe is:

`planning-show -> accepted-plan + repository-verified -> booster-implement -> booster-test -> booster-review -> booster-handoff`

Team mode inserts `booster-team-align` after planning. This is a recommended
recipe, not a mandatory loop. Set `preferredSkill` to route an independently
invoked Skill from its own declared inputs.

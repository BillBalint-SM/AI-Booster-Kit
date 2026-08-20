# Booster Mode and Delivery Compass

## Product outcome

Booster Mode is the User-controlled product layer around an existing Codex or
Claude Code Agent and its selected Model. It narrates the current delivery
state, exposes the next decision frontier, and recommends one independently
invocable Skill. It is not an Agent, Model, autonomous loop, task dispatcher,
or permission system.

```text
User + existing Agent/Model
          │ explicit activation
          ▼
     Booster Mode
          │ normalize declared state
          ▼
   Delivery Compass ─────► one recommended Skill
          │                       │
          │                 User invokes or rejects
          ▼                       ▼
facts / decisions / evidence / unknowns / artifact references
          │
          └──────────────► refresh, handoff, or visible stop
```

The deterministic Compass core is
[`projectDeliveryCompass(input, registry)`](../../src/booster/compass.ts). The
root `booster` command and the standalone plugin helper call that same public
interface. Neither interface executes or persists work.

## Activate, attach, or resume

After plugin installation, activation is explicit:

| Host | Activation |
| --- | --- |
| Codex | `$ai-booster-kit` |
| Claude Code | `/ai-booster-kit:ai-booster-kit` |

The central Skill performs read-only orientation, builds the request, projects
the Compass, narrates it in the User's language, recommends one Skill, and
stops. A recommended Skill never begins merely because it is `READY`.

Session modes:

| Mode | Use |
| --- | --- |
| `NEW` | Start before delivery artifacts exist. |
| `ATTACH` | Bring existing planning, code, tests, or review work under explicit contracts. Missing earlier artifacts become a recovery recommendation, not invented history. |
| `RESUME` | Continue from an explicitly selected prior Handoff or request. |
| `AUTO` | Select `ATTACH` when artifact references exist; otherwise `NEW`. |

`INDIVIDUAL` keeps the normal path small. `TEAM` inserts an explicit alignment
Skill to declare Roles, artifact ownership, isolation, review gates, and
recovery before implementation.

## Normal recipe and independent use

The normal individual recommendation is:

```text
planning-show
  → User accepts the exact plan + repository readback
    → booster-implement
      → booster-test
        → booster-review
          → booster-handoff
```

Team mode inserts `booster-team-align` after planning. This is a recommendation,
not a compulsory chain. Every Skill is explicit-only and independently
invocable. Set `preferredSkill` in a Compass request when a standalone test,
review, implementation, Handoff, or team-alignment task already has its own
required inputs.

## Skill map

| Skill | Declared outcome | Codex | Claude Code |
| --- | --- | --- | --- |
| `ai-booster-kit` | Project and narrate the Delivery Compass. | `$ai-booster-kit` | `/ai-booster-kit:ai-booster-kit` |
| `planning-show` | Refined scope, criteria, decisions, and `plan-handoff`. | `$planning-show` | `/ai-booster-kit:planning-show` |
| `booster-team-align` | Roles, ownership map, and review gates. | `$booster-team-align` | `/ai-booster-kit:booster-team-align` |
| `booster-implement` | Reviewable diff, implementation evidence, and residual risks. | `$booster-implement` | `/ai-booster-kit:booster-implement` |
| `booster-test` | Validation result, reproducible test evidence, and evidence map. | `$booster-test` | `/ai-booster-kit:booster-test` |
| `booster-review` | Independent review result, evidence, findings, and limits. | `$booster-review` | `/ai-booster-kit:booster-review` |
| `booster-handoff` | Fresh-agent-ready `delivery-handoff`. | `$booster-handoff` | `/ai-booster-kit:booster-handoff` |

Skills connect through the Registry's declared `consumes`, `teamConsumes`,
`gates`, `produces`, `suggests`, and `stops` fields. They do not call each other
through hidden prompt chaining.

## Request and artifact contract

The exact request is documented by the plugin's
[`booster-mode-contract.md`](../../plugins/ai-booster-kit/assets/booster-mode-contract.md)
and [JSON Schema](../../plugins/ai-booster-kit/assets/booster-request.schema.json).
Every top-level field is required; foreign fields, sparse arrays, duplicate
artifact types, unknown versions, unknown Skills, accessors, and oversized
lists fail closed.

An artifact declaration contains:

| Field | Meaning |
| --- | --- |
| `type` | Stable Registry artifact type. |
| `reference` | Caller-owned pointer to the real artifact; not proof of its bytes. |
| `state` | `DECLARED`, `VERIFIED`, `ACCEPTED`, `COMPLETE`, `COMPLETE_WITH_LIMIT`, `STOPPED`, or `UNKNOWN`. |
| `bindsTo` | Exact target reference when a decision must bind a particular artifact; otherwise `null`. |

The canonical implementation gates are intentionally stronger than artifact
presence:

- every consumed plan/team artifact must be `COMPLETE` or
  `COMPLETE_WITH_LIMIT`; `DECLARED` is not runnable evidence;
- the bound `plan-handoff` target must therefore be complete before plan
  acceptance can enable implementation;
- `accepted-plan` must be `ACCEPTED` and its `bindsTo` must equal the exact
  current `plan-handoff.reference`;
- `repository-verified` must be `VERIFIED`;
- draft, stale, stopped, unknown, or incorrectly bound gates cannot make
  implementation `READY`;
- the implementation Skill reopens the real artifacts before editing because
  a Compass declaration is still caller-owned evidence, not authentication.

## Compass result

Every projection includes a deterministic SHA-256 `compassId`, session and
collaboration mode, observed stage, objective, declared facts/decisions/evidence,
unknowns, constraints, one recommendation, all runnable alternatives, blockers,
next action, and Handoff readiness.

| Status | Meaning |
| --- | --- |
| `READY` | The recommended Skill's declared inputs and gates are satisfied. The User still chooses whether to invoke it. |
| `WAITING_FOR_DECISION` | A human gate such as exact plan acceptance is missing or invalid. |
| `NEEDS_INPUT` | A required artifact or verified non-decision gate is missing or invalid. |
| `COMPLETE` | The preferred Skill or full Session's declared outputs are present; `completionScope` says which. |
| `STOPPED` | A declared authority, scope, target, or safety stop prevents continuation. |
| `UNKNOWN` | Evidence is missing/contradictory and no selected Skill can safely proceed. |

The output always states `authority: RECOMMENDATION_ONLY`,
`executionPerformed: false`, and `persistencePerformed: false`. `compassId` is
a correlation identity over the complete normalized request and Registry; it
is not a signature, approval, or trusted receipt.

## Runnable examples

From a repository checkout:

```powershell
npm ci
npm run build
node dist/cli.js booster --input examples/booster/start.json
node dist/cli.js booster --input examples/booster/attach-in-progress.json
node dist/cli.js booster --input examples/booster/after-plan.json
node dist/cli.js booster --input examples/booster/resume-accepted-plan.json
node dist/cli.js booster --input examples/booster/team-after-plan.json
node dist/cli.js booster --input examples/booster/standalone-test.json
node dist/cli.js booster --input examples/booster/stopped.json
node dist/cli.js booster --input examples/booster/complete.json
```

The same self-contained helper ships inside the plugin:

```powershell
node plugins/ai-booster-kit/scripts/booster.mjs --input examples/booster/start.json
```

The package test copies the plugin to a temporary cache directory and proves
that this command still works without repository files, `node_modules`, or a
compiled `dist/` tree.

## Relationship to Module/Flow Assurance

Booster Mode is the human-facing routing and narration layer. The existing
Flow Composer and Flow Assurance remain the stricter internal kernel for an
explicit, receipt-backed default change Flow:

```text
Booster Mode / Compass: orient, recover, or route any independent Skill
Flow Composer:          declare one Module or the explicit default Flow
Flow Assurance:         validate package-bound Stage and Checkpoint receipts
Stage Skill:            perform the separately invoked repository task
```

The Compass does not replace package-bound Flow receipts or authenticated
external approvals. A host can use the Compass alone for lightweight delivery,
then use `compose-flow`/`assess-flow` when exact Stage receipt progression is
needed.

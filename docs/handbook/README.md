# AI Booster Kit Handbook

This handbook is the operator-facing entry point. AI Booster Kit is an
installable Delivery Kit for an existing Codex or Claude Code Agent/Model.
Booster Mode narrates current delivery state and recommends independent Skills;
the lower-level Flow interfaces prepare and assess receipt-backed Module
packages. Neither layer silently runs an Agent, writes to an external system,
commits, publishes, or takes final acceptance away from the User.

## First installed use

Follow [Plugin installation](plugin-installation.md), start a fresh host
session, then activate explicitly:

- Codex: `$ai-booster-kit`
- Claude Code: `/ai-booster-kit:ai-booster-kit`

The result is a narrated [Delivery Compass](booster-mode.md), not an automatic
workflow. The User may invoke the recommended Skill, select a runnable
alternative, continue without the Kit, or stop.

## Local setup

The supported Node versions are declared in [`package.json`](../../package.json).
From the repository root:

```powershell
npm ci
npm run package:booster
npm run build
node dist/cli.js --help
```

Run the full local verification suite with:

```powershell
npm test
npm run check:docs
npm run check:booster-package
```

Project the first local Compass:

```powershell
node dist/cli.js booster --input examples/booster/start.json
```

## First usable Flow

Prepare the explicit default change Flow:

```powershell
node dist/cli.js compose-flow --input examples/flow/default-change.json
```

The JSON result contains four ordered module packets:

```text
plan → User accepts plan → implement → test → review → handoff
```

Only `plan` is initially `READY`; later modules are `PENDING` on declared
artifacts or the human checkpoint. `executionPerformed` remains `false`. The
User or selected host invokes each module, reads back its artifact, and follows
the next packet's `inputBindings`.

The default is optional. It is created only when the input explicitly selects
`default-change`.

Assess its safe progression without running it:

```powershell
node dist/cli.js assess-flow --input examples/flow/assess-default-change.json
```

The first result makes only `plan-1` runnable and publishes the deterministic
`packageId`. After independently completing and reading back the plan, use the
receipt shape in `examples/flow/assess-after-plan.json`. The next assessment is
`WAITING_FOR_APPROVAL` and publishes the exact plan `receiptId` that the human
checkpoint must bind. See [Flow Assurance](flow-assurance.md) for the complete
progression and evidence boundary. The positive fixtures continue through the
accepted checkpoint and terminal Handoff:

```powershell
node dist/cli.js assess-flow --input examples/flow/assess-after-plan-accepted.json
node dist/cli.js assess-flow --input examples/flow/assess-complete.json
```

The first makes concrete stage `implement-2` runnable. The second returns
`COMPLETE` with `handoff.ready: true`; neither command runs a module.

## Run one module

Each module is independently selectable:

```powershell
node dist/cli.js compose-flow --input examples/modules/plan.json
node dist/cli.js compose-flow --input examples/modules/implement.json
node dist/cli.js compose-flow --input examples/modules/test.json
node dist/cli.js compose-flow --input examples/modules/review.json
```

A ready single-module package contains one module and a
`suggestedContinuation`. That suggestion never starts another module
automatically.

## Result states and exit codes

| Result | Meaning | Exit code |
| --- | --- | ---: |
| `READY` | The package input is complete, or the assessment names the next safe stage. | `0` |
| `WAITING_FOR_APPROVAL` | A valid plan is waiting for its exact human checkpoint. | `2` |
| `COMPLETE` / `COMPLETE_WITH_LIMIT` | All stages have receipt-backed terminal evidence. | `0` |
| `STOPPED` | A required input is missing or violates a canonical gate. Supply or correct it before use. | `2` |
| `UNKNOWN` | A required input is explicitly unresolved. Resolve or accept the limit in a separate decision. | `2` |
| Invalid request, receipt, or contract | The JSON shape or canonical contract is invalid. | `3` |
| Invalid command or unreadable path | The command cannot be evaluated. | `4` |

Malformed request envelopes use the existing Controller error shape with
`decision: STOPPED`. Successfully parsed packages use the package-level
`status` field.

## Continue safely

At a module boundary:

1. verify the module artifact through its declared interface;
2. preserve evidence, decisions, limits, and unknowns;
3. take the required human checkpoint when one is declared;
4. either invoke a suggested next module, choose another module, hand off, or
   stop;
5. never infer external authority from a ready local package.

## Handbook map

- [Booster Mode and Delivery Compass](booster-mode.md) — activation, start,
  attach, resume, team mode, Skills, gates, statuses, and examples.
- [Plugin installation and distribution](plugin-installation.md) — Codex and
  Claude Code marketplaces, GitHub installation, validation, and versioning.
- [Skill Registry](skill-registry.md) — descriptor fields, method graph,
  artifact states, exact binding, and extension workflow.
- [Module and Flow reference](module-flow-reference.md) — composition contract,
  mappings, bindings, and optional continuation.
- [Flow Assurance](flow-assurance.md) — identities, receipts, checkpoints,
  states, blockers, Handoff, and security boundary.
- [Architecture](architecture.md) — layers, dependency direction, data
  ownership, invariants, and extension rules.
- [CLI reference](cli-reference.md) — direct invocation, command index, and exit
  conventions.
- [Persistence and local data](persistence-and-local-data.md) — subsystem-owned
  state, paths, and deletion boundary.
- [Verification and Handoff](verification-and-handoff.md) — exact checks,
  review-ready content, recovery, and acceptance boundary.
- [Separation inventory](../project/separation-inventory.md) — retained history,
  generated evidence, optional surfaces, and archive candidates.

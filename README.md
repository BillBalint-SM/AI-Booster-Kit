# AI Booster Kit

AI Booster Kit is an agent-agnostic Delivery Kit: a host-adapted package of
Skills, Plugins, Scripts, contracts, and templates that guides an existing
Agent and Model through individual or team software delivery. Explicit Booster
Mode turns bounded repository work into a review-ready result or an explicit,
justified stop. Its first pilot and reference environment is the owner's Codex
setup; the product is not limited to Codex and does not create a new Agent or
Model.

## Start here

- [Vision Contract](VISION.md) — direction, v1 completion gate, principles, and non-goals.
- [Domain](DOMAIN.md) — product boundary, actors, modules, and invariants.
- [Context](CONTEXT.md) — preferred vocabulary and concept relationships.
- [Current delivery state](docs/project/current-state.md) — routing-only current review state and next bounded action.
- [Documentation map](docs/project/documentation-map.md) — question-to-source routing.
- [Operator handbook](docs/handbook/README.md) — setup, first usable Flow, module commands, states, and safe continuation.
- [Module and Flow reference](docs/handbook/module-flow-reference.md) — public interface, canonical mappings, architecture, and verification seams.
- [Flow Assurance](docs/handbook/flow-assurance.md) — receipt-backed progression, human checkpoint, deterministic identity, and Handoff contract.
- [Architecture](docs/handbook/architecture.md) — module boundaries, dependency direction, data ownership, and extension rules.
- [Booster Mode](docs/handbook/booster-mode.md) — activation, Delivery Compass, Skills, gates, team mode, and runnable examples.
- [Plugin installation](docs/handbook/plugin-installation.md) — GitHub, Codex, Claude Code, package validation, and updates.
- [Skill Registry](docs/handbook/skill-registry.md) — method graph, artifact contracts, gates, and extension procedure.

## Install and activate

Install the canonical marketplace from `BillBalint-SM/AI-Booster-Kit`.

Codex:

```text
codex plugin marketplace add BillBalint-SM/AI-Booster-Kit
codex plugin add ai-booster-kit@ai-booster-kit
```

Claude Code:

```text
/plugin marketplace add BillBalint-SM/AI-Booster-Kit
/plugin install ai-booster-kit@ai-booster-kit
```

Installation adds no Agent or Model and grants no authority. Start a fresh host
session, then explicitly activate `$ai-booster-kit` in Codex or
`/ai-booster-kit:ai-booster-kit` in Claude Code. The Kit narrates the current
Delivery Compass, recommends one independent Skill, and stops for the User's
choice.

## Build and use the repository

```powershell
npm ci
npm run package:booster
npm run build
node dist/cli.js booster --input examples/booster/start.json
node dist/cli.js compose-flow --input examples/flow/default-change.json
node dist/cli.js assess-flow --input examples/flow/assess-default-change.json
```

The command prepares a reviewable local package for the optional default Flow:

```text
plan → User accepts plan → implement → test → review → handoff
```

It does not execute an Agent or perform an external action. Use the independent
examples under [`examples/modules/`](examples/modules/) to prepare only
`plan`, `implement`, `test`, or `review`. Flow Assurance then evaluates
caller-owned receipts and recommends the next safe stage without persistence
or dispatch.

The installable package lives under
[`plugins/ai-booster-kit/`](plugins/ai-booster-kit/). Its standalone Compass
runtime, Registry, Skills, assets, Codex metadata, and Claude metadata are
self-contained and freshness-checked. See the [Booster Mode
guide](docs/handbook/booster-mode.md) for start, attach, resume, team,
standalone-module, stop, and complete examples.

The documentation does not authorize an external action, change a runtime
setting, or publish Git work.

## License

AI Booster Kit is available under the [MIT License](LICENSE).

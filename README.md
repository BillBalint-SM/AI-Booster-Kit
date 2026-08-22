# AI Booster Kit

AI Booster Kit is a small, agent-agnostic software-delivery kit with two
deliberately separate surfaces:

- **Booster** is a Skills-only plugin for existing Codex and Claude Code
  agents. Its seven explicit Skills cover planning, team alignment,
  implementation, testing, review, and handoff.
- **Flow** is the only executable verifier. It deterministically composes a
  bounded delivery package and assesses receipt evidence without executing,
  dispatching, persisting, or publishing work.

Neither surface installs a model, creates an autonomous agent loop, or grants
tool or external-write authority.

## Quick start

Requirements: Node.js 24 or newer.

```text
npm ci
npm run lint
npm test
npm run check:booster-package
npm run check:docs
```

## Use Flow

```text
npm run build
node dist/cli.js compose-flow --input examples/flow/default-change.json
node dist/cli.js assess-flow --input examples/flow/assess-complete.json
node dist/cli.js assess-flow --input examples/flow/assess-complete.json --format markdown
```

Expected non-ready states are reviewable results, not hidden failures. See the
[Flow contract](docs/flow.md) for inputs, statuses, and exit codes.

## Use the Skills

Install the marketplace plugin, then invoke a Skill explicitly. Start with
`$ai-booster-kit` when you want one recommended next route, or invoke a stage
Skill directly when its input gate is already satisfied.

See the [plugin contract](docs/plugin.md) for the seven Skills, host-native
invocations, packaging checks, and the boundary between package validation and
real host installation.

## Current truth

- [Product contract](PRODUCT.md)
- [Current delivery status](STATUS.md)
- [Flow contract](docs/flow.md)
- [Plugin contract](docs/plugin.md)

The tracked authoritative product surface contains no archived roadmap,
superseded plan, website, or research dump. Git history is the archive for
replaced directions; excluded local untracked work is not product guidance.

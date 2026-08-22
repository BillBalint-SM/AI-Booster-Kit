# Plugin contract

The AI Booster Kit plugin is a dual-host, Skills-only distribution. Codex Skill
sources are canonical under `plugins/ai-booster-kit/skills/`; the package
generator derives the Claude Code views under `claude-skills/`.

| Purpose | Codex | Claude Code |
| --- | --- | --- |
| choose one next route | `$ai-booster-kit` | `/ai-booster-kit:ai-booster-kit` |
| plan | `$booster-plan` | `/ai-booster-kit:booster-plan` |
| align team ownership | `$booster-team-align` | `/ai-booster-kit:booster-team-align` |
| implement | `$booster-implement` | `/ai-booster-kit:booster-implement` |
| test | `$booster-test` | `/ai-booster-kit:booster-test` |
| review | `$booster-review` | `/ai-booster-kit:booster-review` |
| hand off | `$booster-handoff` | `/ai-booster-kit:booster-handoff` |

Every Skill is explicit-only. A Skill may recommend another Skill but never
invokes it automatically.

## Package shape

The installable plugin contains only:

- Codex and Claude Code manifests;
- seven Codex Skill sources and seven generated Claude Code views;
- a concise README and the MIT license.

It contains no executable helper, verifier, registry, request schema, model,
agent definition, connector, MCP server, credential material, authentication
implementation, or host configuration. Flow is separate and is not bundled
into the plugin.

Generate or verify the host views with:

```text
npm run package:booster
npm run check:booster-package
```

The package test also requires every Codex Skill to set
`allow_implicit_invocation: false` and every Claude Code view to set
`disable-model-invocation: true`.

## Marketplace interface

The canonical repository is `BillBalint-SM/AI-Booster-Kit`.

The Codex marketplace schema requires an authentication-timing policy; this
repository retains its canonical `ON_INSTALL` catalog value. That metadata is
not a credential or authentication implementation bundled by the plugin. No
clean install has been observed, so actual host prompt behavior remains
unknown.

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

These are the intended host commands. Manifest validation and package
freshness prove repository shape only; they do not prove a clean install,
instruction loading, host parity, authentication, or runtime behavior.

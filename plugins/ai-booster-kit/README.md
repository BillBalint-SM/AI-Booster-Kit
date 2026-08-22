# AI Booster Kit plugin

This is the Skills-only AI Booster Kit distribution for existing Codex and
Claude Code agents. It adds explicit delivery procedures; it does not add a
model, agent runtime, verifier, registry, connector, or external authority.

## Skills

- `ai-booster-kit`: recommend exactly one next Skill and stop;
- `booster-plan`: prepare an implementation-ready plan for acceptance;
- `booster-team-align`: define ownership and independent review gates;
- `booster-implement`: implement one accepted bounded change;
- `booster-test`: verify acceptance criteria with reproducible evidence;
- `booster-review`: independently review the result and evidence;
- `booster-handoff`: package a continuation-ready handoff.

Every Skill is explicitly invoked and may recommend, but never start, another
Skill.

## Install

The canonical marketplace repository is `BillBalint-SM/AI-Booster-Kit`.

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

Start the router explicitly with `$ai-booster-kit` in Codex or
`/ai-booster-kit:ai-booster-kit` in Claude Code. These commands document the
intended host interface; this repository's package checks do not prove a clean
host installation.

The bundled `LICENSE` contains the MIT terms.

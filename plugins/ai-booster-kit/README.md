# AI Booster Kit plugin

AI Booster Kit is a methodology-as-code delivery plugin for existing Codex and
Claude Code Agents and Models. It adds explicit Skills, a deterministic
Delivery Compass, a contract registry, and reusable delivery references. It
does not install a Model, create a custom Agent, run an autonomous loop, or
grant tool or external-write authority.

## Included Skills

- `ai-booster-kit`: activate or refresh narrated Booster Mode;
- `planning-show`: refine an idea into a reviewable planning handoff;
- `booster-team-align`: bind team roles, ownership, and review gates;
- `booster-implement`: implement one accepted bounded change;
- `booster-test`: verify criteria with reproducible evidence;
- `booster-review`: independently review result and evidence;
- `booster-handoff`: package a fresh-agent-ready delivery handoff.

Every Skill is independently invocable. The Compass may recommend a next Skill
but never starts it automatically.

## Install from a GitHub repository

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

Then explicitly activate it:

- Codex: `$ai-booster-kit`
- Claude Code: `/ai-booster-kit:ai-booster-kit`

For local Claude Code validation, run `claude plugin validate .` from the
marketplace repository. Installation and validation are host actions and are
not performed by the package itself.

## Standalone Compass helper

Node.js 20 or newer. Run these commands from the installed plugin root (the
directory containing this README), or replace `scripts/booster.mjs` with the
absolute `<plugin-root>/scripts/booster.mjs` path:

```text
node scripts/booster.mjs --input <request.json>
node scripts/booster.mjs --stdin
```

The helper resolves its Registry inside the installed plugin, so it remains
self-contained after a host copies the plugin into a cache. Exit `0` means
`READY` or `COMPLETE`; exit `2` is a reviewable non-ready state; exit `3`
rejects malformed input; exit `4` reports command or path configuration.

See `assets/booster-mode-contract.md` and
`assets/booster-request.schema.json` for the exact request contract.

## License

AI Booster Kit is distributed under the MIT License. The complete license is
bundled as `LICENSE` in the installed plugin root.

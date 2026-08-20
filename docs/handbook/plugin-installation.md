# Plugin installation and distribution

## What installation does

The repository contains one self-contained plugin at
[`plugins/ai-booster-kit/`](../../plugins/ai-booster-kit/) and two marketplace
manifests:

- Codex: [`.agents/plugins/marketplace.json`](../../.agents/plugins/marketplace.json)
- Claude Code: [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json)

Installation copies/discovers Skills, scripts, Registry, assets, and manifests.
It does not activate Booster Mode, choose or download a Model, create a custom
Agent, alter repository instructions, grant permissions, configure a connector,
or authorize an external action.

The deterministic helper requires Node.js 20 or newer. Skills can still be
read when Node is unavailable, but the central Skill must label the projection
`HELPER_NOT_VERIFIED` instead of claiming a helper-backed result.

## Install from GitHub

The canonical marketplace repository is `BillBalint-SM/AI-Booster-Kit`.

Codex:

```text
codex plugin marketplace add BillBalint-SM/AI-Booster-Kit
codex plugin add ai-booster-kit@ai-booster-kit
codex plugin list
```

Claude Code:

```text
/plugin marketplace add BillBalint-SM/AI-Booster-Kit
/plugin install ai-booster-kit@ai-booster-kit
```

Claude Code officially supports a GitHub `owner/repo` marketplace source and
copies installed plugins into a versioned cache, so plugin runtime files cannot
depend on the surrounding marketplace repository. See Anthropic's
[marketplace guide](https://code.claude.com/docs/en/plugin-marketplaces) and
[plugin reference](https://code.claude.com/docs/en/plugins-reference).

For a private repository, host authentication remains the user's Git/host
responsibility. Do not place credentials in plugin files or command examples.

After installation, start a fresh Codex task or Claude Code session so the host
discovers the installed Skills, then activate explicitly:

- Codex: `$ai-booster-kit`
- Claude Code: `/ai-booster-kit:ai-booster-kit`

## Local marketplace test

From the checkout root:

```text
codex plugin marketplace add <absolute-or-relative-repository-root>
codex plugin add ai-booster-kit@ai-booster-kit
```

Claude Code:

```text
/plugin marketplace add .
/plugin install ai-booster-kit@ai-booster-kit
```

Local installation changes host configuration/cache and therefore remains a
separate User decision. The repository tests validate package shape and a
copied-cache runtime without performing host installation.

## Why there are two generated Skill views

Codex and Claude Code currently express explicit-only invocation differently:

| Host view | Path | Explicit-only contract |
| --- | --- | --- |
| Codex | `plugins/ai-booster-kit/skills/` | `agents/openai.yaml` sets `allow_implicit_invocation: false`; Codex-compatible SKILL frontmatter omits Claude-only fields. |
| Claude Code | `plugins/ai-booster-kit/claude-skills/` | `SKILL.md` includes `disable-model-invocation: true`; the Claude manifest points to this directory. |

[`scripts/package-booster-plugin.mjs`](../../scripts/package-booster-plugin.mjs)
generates the host-specific views, the standalone Compass runtime, the
packaged Registry, and the packaged Planning-Show Skill from canonical sources.
`--check` rejects drift.

## Validate before distribution

Repository checks:

```powershell
npm ci
npm run package:booster
npm run check:booster-package
npm run build
node --test dist/test/booster-plugin-package.test.js dist/test/booster-examples.test.js
```

Codex plugin and Skill validators are run with the bundled `plugin-creator` and
`skill-creator` validation scripts. Claude Code validates the marketplace with:

```text
claude plugin validate .
```

The standalone package smoke test copies only `plugins/ai-booster-kit/` to a
temporary directory and compares its output with the TypeScript public seam.
This proves package self-containment, not host security or installation in an
unknown future host version.

## Version and update policy

Both plugin manifests declare the initial release version `0.1.0`. Every later
release must bump the manifest version because Claude Code uses it for
cache/update resolution. Regenerate and revalidate after every behavior,
Registry, Skill, or packaging change. Do not append ad-hoc files to a cached
installed copy; update the repository source and reinstall through the
marketplace.

The repository and the self-contained installed plugin both carry the MIT
License. `npm run check:booster-package` rejects a stale or missing packaged
license together with other generated-package drift.

Commit, tag, push, GitHub publication, marketplace submission, release, and
installation remain separately authorized actions.

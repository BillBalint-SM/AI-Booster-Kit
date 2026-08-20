# Delivery Kit distribution and methodology patterns

Status: source-backed product research; implementation provenance record
Read date: 2026-08-20
Scope: GitHub Spec Kit, GSD, Matt Pocock's Skills, and Claude Code plugin
distribution. This record authorizes no dependency import or external action.

## Adopted patterns

| Primary source | Verified pattern | AI Booster Kit adaptation | Reuse decision |
| --- | --- | --- | --- |
| [GitHub Spec Kit](https://github.github.com/spec-kit/) and its [repository](https://github.com/github/spec-kit) | A default specification-driven path produces structured artifacts that feed later phases, while integrations and workflows are extensible across many coding Agents. | Registry-declared `consumes`/`produces`, a normal plan-to-handoff recipe, runnable examples, and dual-host packaging. The recipe stays optional and each Skill is independently routable. | Behavior only. Spec Kit is [MIT-licensed](https://github.com/github/spec-kit/blob/main/LICENSE), but no code, prompt, template, or prose was copied. |
| [GSD architecture](https://github.com/gsd-build/get-shit-done/blob/main/docs/ARCHITECTURE.md) and [repository](https://github.com/gsd-build/get-shit-done) | A meta-prompting layer sits between user and coding Agent; workflow files stay small while detailed modes, templates, and references are progressively disclosed. Multi-runtime installation is a product concern. | Booster Mode narrates one decision frontier; stage Skills stay concise; exact mechanics live in the Registry, contract reference, schema, and deterministic helper. Generated host adapters prevent duplicated hand-maintained logic. | Behavior only. GSD is MIT-licensed, but no source content was imported. Long-running autonomous orchestration was explicitly rejected. |
| [Matt Pocock's Skills](https://github.com/mattpocock/skills) | Small, model-agnostic, composable Skills preserve user control. The repository distinguishes explicit user-invoked routers/procedures from reusable discipline and prevents one user procedure from silently starting another. | Seven explicit-only Skills, one router/narrator, `suggests` as data, and a hard stop after recommendation. Stage Skills may be called directly with `preferredSkill`. | Behavior only. The source is MIT-licensed; all AI Booster Kit Skill text and code is original, and no attribution or license was stripped. |
| [Claude Code marketplace guide](https://code.claude.com/docs/en/plugin-marketplaces), [plugin reference](https://code.claude.com/docs/en/plugins-reference), and [plugin creation guide](https://code.claude.com/docs/en/plugins) | GitHub repositories can host marketplaces; plugin Skills are namespaced; installed plugin directories are copied into a cache and cannot depend on files outside the plugin. | Root marketplace manifest, namespaced Claude invocations, self-contained Registry/runtime/assets, copied-cache test, and plugin version policy. | Interface conformance only; no Anthropic code or documentation text copied. |

## Product synthesis

The valuable intersection is not another orchestration Agent. It is a
methodology package with four properties:

1. structured artifacts create stable context between stages;
2. a narrated router reduces user uncertainty without owning the decision;
3. procedures are small, explicit, and independently usable;
4. deterministic local mechanics are packaged and tested separately from LLM
   judgment.

AI Booster Kit adds its own differentiator: artifact state and exact decision
binding, visible `STOPPED`/`UNKNOWN`, one cross-host Compass interface, and a
strict separation between recommendation, execution, persistence, and
authority.

## Rejected patterns

- Mandatory end-to-end process ownership and unattended phase chaining.
- Hidden retry/agent loops, model routing, or workflow state stores.
- Copying third-party prompts/templates/code and disguising provenance.
- Adding a framework dependency only to reproduce a small declarative contract.
- Treating a Skill description, tool availability, or artifact filename as
  approval or verified evidence.

No third-party source file was ported into the implementation. Future reuse of
exact source requires a fresh license/provenance review and preservation of all
applicable notices and modification terms.

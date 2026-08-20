# Skill Registry and extension contract

## Source of truth

[`contract/booster/skill-registry.json`](../../contract/booster/skill-registry.json)
is the canonical method graph. The plugin copy is generated and byte-compared
by `npm run check:booster-package`.

Registry order supplies the normal recommendation order. It is not an
automatic workflow. `preferredSkill` allows any active Skill to be evaluated
independently against its own contract.

## Descriptor fields

| Field | Contract |
| --- | --- |
| `id`, `version`, `module`, `purpose` | Stable identity, semantic contract version, user-facing stage, and outcome. |
| `modes` | `INDIVIDUAL`, `TEAM`, or both. |
| `consumes` | Artifact types required in every supported mode. |
| `teamConsumes` | Extra artifact types required only in Team mode. |
| `gates` | State- and binding-aware authority/evidence gates. |
| `produces` | Artifact types that make the Skill complete. |
| `suggests` | Known Skill IDs that may be offered after completion. No invocation occurs. |
| `stops` | Human-readable conditions the Skill must preserve visibly. |
| `invocation` | Host-native Codex and Claude Code invocation strings. |

A consumed artifact must be `COMPLETE` or `COMPLETE_WITH_LIMIT`; a `DECLARED`
reference is visible context but not runnable input. A gate declares `type`,
accepted `states`, and an optional artifact type in `bindsTo`. When binding is
required, its target must be consumed in every supported mode, must itself be
complete, and the gate artifact's `bindsTo` value must equal the target's exact
`reference`.

The Compass parser rejects malformed Registry objects, foreign fields,
duplicate Skill IDs, duplicate gate types, duplicate strings, unknown suggested
Skill IDs, invalid modes/modules/states, empty outputs, sparse arrays, accessors,
and excessive list sizes.

## Canonical method graph

```text
planning-show
  produces: objective, refined-scope, acceptance-criteria,
            decision-record, plan-handoff

booster-team-align [TEAM]
  consumes: plan contract
  produces: delivery-roles, ownership-map, review-gates

booster-implement
  consumes: plan contract (+ team contract in TEAM)
  gates: accepted-plan[ACCEPTED, binds plan-handoff]
         repository-verified[VERIFIED]
  produces: reviewable-diff, implementation-evidence,
            residual-risk-record

booster-test
  consumes: criteria + implementation result
  produces: validation-result, test-evidence, evidence-map

booster-review
  consumes: criteria + implementation + validation
  produces: review-result, review-evidence, review-limit-record

booster-handoff
  consumes: plan + review
  produces: delivery-handoff
```

## Add or change a Skill

1. Confirm the observable outcome belongs inside `VISION.md` and `DOMAIN.md`.
2. Define its input, output, evidence, authority, stop, and independent-use
   contract before changing the Registry.
3. Add or update the Codex Skill under
   `plugins/ai-booster-kit/skills/<id>/` with a concise `SKILL.md` and
   explicit-only `agents/openai.yaml`.
4. Add the Registry descriptor and host-native invocation strings. Do not add
   a suggestion to an unknown Skill.
5. Add public-seam Compass tests for ready, missing, invalid gate, independent
   selection, stop, and unknown behavior as applicable.
6. Run `npm run package:booster`; this generates the Claude Skill view and
   standalone artifacts.
7. Run the full validation sequence in
   [Plugin installation](plugin-installation.md), including both host
   validators and copied-cache smoke test.
8. Update examples, handbook, package version, research/provenance when needed,
   and the Handoff.

Do not add a custom Agent or Model definition to represent a Skill. Do not let
one explicit user-invoked Skill silently start another. Add deterministic
scripts only when they hide repeatable mechanics behind a small, testable
interface.

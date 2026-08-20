# Separation Inventory

This inventory separates product surfaces, retained evidence, history, and
archive candidates without deleting or moving evidence prematurely. A listing
is not proof that an item is safe to delete.

## Active product path

| Surface | Current role |
| --- | --- |
| `VISION.md`, `DOMAIN.md`, `CONTEXT.md` | Product direction, boundary, and language. |
| `src/`, `contract/`, `workflows/` | Local implementation and canonical operating contracts. |
| `test/`, `scripts/` | Executable evidence and repository checks. |
| `docs/handbook/`, `docs/project/`, `docs/operations/` | Operator knowledge, current routing, and operating guidance. |
| `skills/planning-show/` | Packaged explicit planning procedure; it is not the generic Flow runtime. |
| `plugins/ai-booster-kit/` | Active self-contained Codex/Claude Code distribution: Skills, generated host view, Registry, scripts, and assets. |
| `.agents/plugins/`, `.claude-plugin/` | Active repository marketplace manifests; they do not install the plugin by themselves. |

Generated files retained inside the plugin are not waste:

- `scripts/booster-compass.mjs` is generated from `src/booster/compass.ts`;
- `registry/skill-registry.json` is copied from the canonical Registry;
- packaged Planning-Show files are derived from `skills/planning-show/`;
- `claude-skills/` is the Claude-specific explicit-invocation adapter view.

`npm run check:booster-package` proves freshness. Do not edit generated files
directly or quarantine them as duplicates; installed hosts need the plugin to
remain self-contained.

## Already separated and retained

| Surface | Classification | Reason |
| --- | --- | --- |
| `docs/history/` | Historical evidence | Its own README marks it immutable and outside default context. |
| `.ua/` | Generated mapper evidence | The mapper runbook and freshness checker treat these files as a retained snapshot. |
| `graphify-out/` | Generated mapper evidence | The mapper runbook and freshness checker require this published snapshot. |

Generated mapper files are not ordinary source, but they are not unused. Use
[`scripts/check-mapper-freshness.mjs`](../../scripts/check-mapper-freshness.mjs)
and the [mapper snapshot runbook](../runbooks/mapper-snapshot.md) before any
replacement decision.

## Optional or prototype surfaces

| Surface | Classification | Current handling |
| --- | --- | --- |
| `marketing/` | Brand/research prototype | Keep outside the core runtime path; do not call it unused while current design records still cite it. |
| `website/` | Optional product/hosting prototype | Build and govern separately from the root TypeScript runtime. |
| `research/` | Source research | Retain as evidence; do not load by default. |

## Archive candidates requiring a separate migration

| Candidate | Evidence for candidacy | Required check before moving |
| --- | --- | --- |
| `docs/superpowers/plans/`, `docs/superpowers/specs/` | Dated design/execution intent superseded by the Foundation Reset routing. | Build a migration index and update every active citation. |
| `.superpowers/sdd/2026-07-27-gate-2-jira-sandbox-pilot/` | Old target-specific working records outside canonical routing. | Confirm no active procedure consumes the records. |
| `docs/gate-2/` | Target-specific preflight material; related results already live under history. | Reconcile active links and move with a history index. |
| `output/pdf/ai-agent-tooling-research-design.pdf` | Generated derivative with no active canonical reference found in the audit. | Confirm whether it is a deliverable; otherwise move beside historical research output. |
| `website/examples/d1/` | Starter example with no source reference found in the audit. | Run the website build/tests without it and verify hosting expectations. |

## Separation rules

1. Prove references and consumers with a fresh scan; absence from one scan is
   only a lead.
2. Preserve a migration index when moving historical evidence.
3. Run the affected build, tests, link check, and mapper freshness check.
4. Keep optional product surfaces explicit instead of mixing them into the
   core usage path.
5. Deletion requires a separate exact decision after the move and verification
   evidence are reviewable.

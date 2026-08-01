# Documentation map

This page is the repository’s thematic index. Start from the [root README](../../README.md), then use the [roadmap](roadmap.md) and [current state](current-state.md) before opening a detailed source.

## Reading order

1. **Direction:** [AI Booster Kit Platform Roadmap](roadmap.md)
2. **Delivery now:** [Current delivery state](current-state.md)
3. **How the team works:** [Team Delivery Loop](../../workflows/team-delivery-loop.md)
4. **What is guaranteed:** [Team contract](../../contract/team-contract.md) and [capability matrix](../../contract/capability-matrix.md)
5. **How to operate it:** [Operations](../operations/)
6. **How to execute repeatable procedures:** [Runbooks](../runbooks/)
7. **Why a design exists and how it is implemented:** [Specifications](../superpowers/specs/) and [plans](../superpowers/plans/)
8. **What is historical context only:** [Archive](../history/README.md)

## Canonical source by question

| Question | Canonical source | Keep out of this source |
| --- | --- | --- |
| What is the platform’s direction and next milestone? | [Roadmap](roadmap.md) | Current branch details, implementation transcripts, and duplicated task checklists. |
| What is true right now? | [Current state](current-state.md) | Long-term vision, full history, and unverified assumptions. |
| How should recurring team work run? | [`workflows/`](../../workflows/) | One-off session notes and host-specific instructions. |
| What must an artifact or capability guarantee? | [`contract/`](../../contract/) | Runtime logs, historical reports, and connector payloads. |
| How is a host or operation used? | [`docs/operations/`](../operations/) | Strategic decisions and duplicate workflow definitions. |
| How is a repeatable check performed? | [`docs/runbooks/`](../runbooks/) | Permanent product requirements and current-state claims. |
| Why was a design chosen? | [`docs/superpowers/specs/`](../superpowers/specs/) | Active runtime context and mutable delivery status. |
| In what order is approved work implemented? | [`docs/superpowers/plans/`](../superpowers/plans/) | A second roadmap or a current-state substitute. |
| What happened previously? | [`docs/history/`](../history/) | Default Agent instructions and current decisions. |

## Active entry points

- [Quick Task Clarifier and Validator](../../contract/agent-library/quick-task-clarifier-validator.md) — first bounded Agent capability contract.
- [Agent Formation Library catalog](../../contract/agent-library/formation-catalog.md) — scenario inventory, readiness states, prerequisites, and recommendation boundaries.
- [Bounded Validation recipe](../../contract/agent-library/bounded-validation.md) — READY validation profile and output contract.
- [Bounded Refinement recipe](../../contract/agent-library/bounded-refinement.md) — READY refinement profile and output contract.
- [Bounded Research recipe](../../contract/agent-library/bounded-research.md) — READY research profile, source boundary, and output contract.
- The Controller exposes the local `activate-quick-task --input <request.json> --choice <choice.json> --profile <profile>` command, which issues an ephemeral host-agnostic package only after fresh evaluation and `ACTIVATION_INTENT`; see the approved [design](../superpowers/specs/2026-08-01-ai-booster-kit-quick-task-activation-package-design.md) and [implementation plan](../superpowers/plans/2026-08-01-ai-booster-kit-quick-task-activation-package.md), which remain review artifacts rather than default runtime context.
- [Canonical artifact templates](../../contract/artifacts/canonical-work-artifact-template.md) — common artifact shape.
- [Jira–Confluence–GitHub mapping contract](../../contract/mappings/jira-confluence-github.md) — future synchronization boundary.
- [Host adapter contracts](../operations/host-adapters/) — host-specific projections of the shared model.

## Context rule

The Controller reads the active canonical contract first. Decisions, evidence,
unknowns, deviations, and progress attach to that contract. Briefs,
checklists, reports, and session summaries are derived artifacts. Historical
material is retained for investigation but is not automatically active Agent
context.

Historical evidence is not default agent context.

There is deliberately no second roadmap, generic `vision.md`, or catch-all
`important.md` here. If a topic has an independent owner and lifecycle, it may
receive its own contract or artifact; otherwise it belongs in the canonical
source above.


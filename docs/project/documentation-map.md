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
8. **How the product is positioned and represented:** [Marketing prototype](../../marketing/README.md)
9. **What is historical context only:** [Archive](../history/README.md)

## Canonical source by question

| Question | Canonical source | Keep out of this source |
| --- | --- | --- |
| What is the platform’s direction and next milestone? | [Roadmap](roadmap.md) | Current branch details, implementation transcripts, and duplicated task checklists. |
| What is true right now? | [Current state](current-state.md) | Long-term vision, full history, and unverified assumptions. |
| How should recurring team work run? | [`workflows/`](../../workflows/) | One-off session notes and host-specific instructions. |
| What must an artifact or capability guarantee? | [`contract/`](../../contract/) | Runtime logs, historical reports, and connector payloads. |
| How is a host or operation used? | [`docs/operations/`](../operations/) | Strategic decisions and duplicate workflow definitions. |
| How is M2 activation prepared, saved, and invoked? | [M2 design](../superpowers/specs/2026-08-02-ai-booster-kit-m2-m3-activation-session-design.md), [M2 plan](../superpowers/plans/2026-08-02-ai-booster-kit-m2-activation-boundary.md), and the Controller CLI | Host execution, connector calls, and publication are outside this local boundary. |
| How are M3 contexts and compact session state validated or resumed? | [M2/M3 design](../superpowers/specs/2026-08-02-ai-booster-kit-m2-m3-activation-session-design.md), [M3 plan](../superpowers/plans/2026-08-03-ai-booster-kit-m3-session-context.md), and the Context CLI | Context remains source Markdown; host execution, automatic Git operations, and transcripts are outside this boundary. |
| How is a repeatable check performed? | [`docs/runbooks/`](../runbooks/) | Permanent product requirements and current-state claims. |
| How are main, feature, and dev branches synchronized? | [Three-level branching model](../runbooks/branching.md) | Unverified local cleanliness, stale branch assumptions, and implicit merge claims. |
| Why was a design chosen? | [`docs/superpowers/specs/`](../superpowers/specs/) | Active runtime context and mutable delivery status. |
| In what order is approved work implemented? | [`docs/superpowers/plans/`](../superpowers/plans/) | A second roadmap or a current-state substitute. |
| How is the product positioned and visually represented? | [`marketing/`](../../marketing/) | Delivery status, legal clearance, and unverified product claims. |
| What happened previously? | [`docs/history/`](../history/) | Default Agent instructions and current decisions. |

## Active entry points

- [Quick Task Clarifier and Validator](../../contract/agent-library/quick-task-clarifier-validator.md) — first bounded Agent capability contract.
- [Agent Formation Library catalog](../../contract/agent-library/formation-catalog.md) — scenario inventory, readiness states, prerequisites, and recommendation boundaries.
- [Agent Role Library catalog](../../contract/agent-library/role-catalog.md) — project Role definitions, clean context contracts, handoff contracts, and global Agent–Role assignments.
- [User-facing Agent Profile Library](../../contract/agent-library/agent-profile-catalog.md) — selectable declarative profiles; recommendation-only and not native host activation. The read-only `list-agent-profiles` CLI command exposes this catalog.
- [Bounded Validation recipe](../../contract/agent-library/bounded-validation.md) — READY validation profile and output contract.
- [Bounded Refinement recipe](../../contract/agent-library/bounded-refinement.md) — READY refinement profile and output contract.
- [Bounded Research recipe](../../contract/agent-library/bounded-research.md) — READY research profile, source boundary, and output contract.
- [Bounded Implementation recipe](../../contract/agent-library/bounded-implementation.md) — READY implementation profile with verified-repository, accepted-plan, evidence, and rollback boundaries.
- [Marketing prototype](../../marketing/README.md) — brand direction, naming screens, prototype design tokens, asset governance, and publication boundaries.
- [Bounded Debugging recipe](../../contract/agent-library/bounded-debugging.md) — READY debugging profile with reproduction, root-cause, minimal-fix, regression-evidence, and fail-closed recovery boundaries.
- The read-only `inspect-agent-library` CLI command joins the global Agent inventory, Role coverage matrix, and all Formation projections (with the first projection retained as a compatibility field); it performs no UA/Graphify sync or host activation.
- [Three-level branching model](../runbooks/branching.md) — main/feature/dev roles, immediate next-dev flow, and feature-to-main promotion.
- The Controller exposes the local `activate-quick-task --input <request.json> --choice <choice.json> --profile <profile>` command, which issues an ephemeral host-agnostic package only after fresh evaluation and `ACTIVATION_INTENT`; see the approved [design](../superpowers/specs/2026-08-01-ai-booster-kit-quick-task-activation-package-design.md) and [implementation plan](../superpowers/plans/2026-08-01-ai-booster-kit-quick-task-activation-package.md), which remain review artifacts rather than default runtime context.
- M2 adds `prepare-activation` for a pure host-agnostic activation package and `save-activation` for explicit Personal/Team JSON persistence; see the approved [activation/session design](../superpowers/specs/2026-08-02-ai-booster-kit-m2-m3-activation-session-design.md) and [M2 implementation plan](../superpowers/plans/2026-08-02-ai-booster-kit-m2-activation-boundary.md). These commands do not activate a host, call a connector, or perform Git publication.
- M3 adds strict Milestone/Epic context Markdown and compact session state through `validate-context`, `save-context`, `save-session`, and `resume-session`; see the [M3 plan](../superpowers/plans/2026-08-03-ai-booster-kit-m3-session-context.md). Resume only evaluates caller-supplied evidence and never reconstructs a transcript or runs a host.
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


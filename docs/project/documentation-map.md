# Documentation Map

Use this page to find the one current owner for a question. Start from the
[root README](../../README.md) for human orientation; agents use
[`AGENTS.md`](../../AGENTS.md) for task routing.

## Canonical source by question

| Question | Canonical source |
| --- | --- |
| What are the product vision, v1 gate, principles, and non-goals? | [Vision Contract](../../VISION.md) |
| Who are the actors, what are the modules, and which invariants apply? | [Domain](../../DOMAIN.md) |
| Which terms and conceptual relationships are preferred? | [Context](../../CONTEXT.md) |
| How does an agent choose what to read and finish a task? | [`AGENTS.md`](../../AGENTS.md) |
| What is true now and what is the next bounded action? | [Current delivery state](current-state.md) |
| What is the ordered path to v1? | [Roadmap](roadmap.md) |
| How do I build and use the Kit locally? | [Operator handbook](../handbook/README.md) |
| How do I activate or attach Booster Mode and read the Delivery Compass? | [Booster Mode](../handbook/booster-mode.md) |
| How is the GitHub plugin installed in Codex or Claude Code? | [Plugin installation](../handbook/plugin-installation.md) |
| How do Skills connect, gate, produce artifacts, and extend safely? | [Skill Registry](../handbook/skill-registry.md) |
| What are the module/Flow interfaces and mappings? | [Module and Flow reference](../handbook/module-flow-reference.md) |
| How are Flow progress, receipts, approval, blockers, and Handoff evaluated? | [Flow Assurance](../handbook/flow-assurance.md) |
| How are the code layers, dependencies, and extension boundaries arranged? | [Architecture](../handbook/architecture.md) |
| What CLI commands and exit codes exist? | [CLI reference](../handbook/cli-reference.md) |
| Where can local state exist, and which commands are stateless? | [Persistence and local data](../handbook/persistence-and-local-data.md) |
| Which checks and Handoff facts are required before acceptance? | [Verification and Handoff](../handbook/verification-and-handoff.md) |
| Which external workflow patterns and licenses informed Flow Assurance? | [Agent-workflow product patterns](../../research/2026-08-20-agent-workflow-product-patterns.md) |
| Which methodology/distribution patterns informed the installable Delivery Kit? | [Delivery Kit distribution patterns](../../research/2026-08-20-delivery-kit-distribution-patterns.md) |
| Which files are active, retained evidence, optional, or archive candidates? | [Separation inventory](separation-inventory.md) |
| Why is the document topology arranged this way? | [ADR-0001](../adr/0001-canonical-agent-guidance-and-document-topology.md) |
| Why is there a pure Compass and two generated host Skill views? | [ADR-0002](../adr/0002-dual-host-delivery-kit-and-compass.md) |
| How are GitHub Issues and triage labels consumed safely? | [Agent configuration](../agents/) |
| How does the common operating model work? | [Common Agent Operating Model](../operations/agent-operating-model.md) |
| What is historical evidence only? | [History](../history/) and the [Foundation Reset migration record](../history/foundation-reset/2026-08-10-document-migration-record.md) |

## Reading order

1. Read `VISION.md` when the task can change product direction or the v1 gate.
2. Read `DOMAIN.md`, then `CONTEXT.md`, when the task changes behavior, modules, boundaries, or terminology.
3. Read `AGENTS.md` and the source it routes to for the task shape.
4. Read `docs/project/current-state.md` only for status, handoff, milestone-dependent work, or external-target decisions.
5. Read historical artifacts only when a bounded task needs their evidence.
6. Use the handbook for operator commands; it does not replace the product or authority contracts.

## Default context rule

Historical evidence is not default agent context. Historical documents, prior
designs and plans, `NOTES.md`, and the terminology normalization table remain
available through the migration record when a bounded investigation needs them.

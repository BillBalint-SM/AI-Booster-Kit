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
| Why is the document topology arranged this way? | [ADR-0001](../adr/0001-canonical-agent-guidance-and-document-topology.md) |
| How are GitHub Issues and triage labels consumed safely? | [Agent configuration](../agents/) |
| How does the common operating model work? | [Common Agent Operating Model](../operations/agent-operating-model.md) |
| What is historical evidence only? | [History](../history/) and the [Foundation Reset migration record](../history/foundation-reset/2026-08-10-document-migration-record.md) |

## Reading order

1. Read `VISION.md` when the task can change product direction or the v1 gate.
2. Read `DOMAIN.md`, then `CONTEXT.md`, when the task changes behavior, modules, boundaries, or terminology.
3. Read `AGENTS.md` and the source it routes to for the task shape.
4. Read `docs/project/current-state.md` only for status, handoff, milestone-dependent work, or external-target decisions.
5. Read historical artifacts only when a bounded task needs their evidence.

## Default context rule

Historical evidence is not default agent context. Historical documents, prior
designs and plans, `NOTES.md`, and the terminology normalization table remain
available through the migration record when a bounded investigation needs them.

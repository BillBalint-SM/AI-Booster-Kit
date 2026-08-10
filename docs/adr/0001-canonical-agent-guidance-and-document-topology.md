# ADR-0001: Canonical agent guidance and document topology

**Status:** Accepted

## Context

The repository accumulated a long shared instruction file, a separate Claude
instruction file, a broad roadmap, and overlapping terminology documents.
Their responsibilities were not sufficiently distinct, so an agent could read
more than needed, treat a historical working table as current language, or
duplicate shared behavior in a host-specific file. This created avoidable work
and uncertainty at the beginning of otherwise bounded tasks.

## Decision

AI Booster Kit uses a small, explicit document topology:

- `VISION.md` owns vision, the v1 completion gate, principles, and non-goals.
- `DOMAIN.md` owns the product boundary, actors, modules, and invariants.
- `CONTEXT.md` owns stable preferred vocabulary and concept relationships.
- `AGENTS.md` is the short, canonical, host-agnostic router.
- `CLAUDE.md` is a thin Claude projection and retains only the direct-on-disk
  context-integrity protection that is specific to Claude usage.
- `docs/agents/` owns engineering-skill configuration; it does not grant issue
  tracker authority.
- `docs/adr/` records hard-to-reverse decisions that affect how future work
  finds its source of truth.
- `docs/project/roadmap.md` owns ordered work derived from the vision, while
  `docs/project/current-state.md` owns current delivery routing.

The router uses progressive disclosure through precise read triggers rather
than reproducing strategy, domain language, host detail, or operational rules.
Existing documents are classified in the
[Foundation Reset migration record](../history/foundation-reset/2026-08-10-document-migration-record.md)
and are preserved without deletion or relocation in this slice.

## Alternatives Considered

### Keep the long `AGENTS.md`

Rejected because it mixes durable routing with domain, host, security, and
operational detail. It makes the always-loaded surface larger and leaves fewer
clear signals for what to read on demand.

### Make `CLAUDE.md` the shared source

Rejected because the product is agent-agnostic and the file contains
Claude-specific context-integrity behavior. A host projection cannot own the
shared contract without making other hosts second-class consumers.

### Merge vision, domain, and context into one document

Rejected because strategy, product boundaries, and stable vocabulary change on
different cadences and answer different questions. One file would recreate the
same overloaded routing problem.

## Consequences

Future work has one declared owner for each core question and must repair
links when a documented source moves. Reviewers can check duplication by
reading the source-ownership map and the migration record. Historical material
remains inspectable but is no longer default agent context.

## Reversal Boundary

Changing this ownership split requires a new ADR and evidence that the
replacement preserves the existing routing, authority, and Claude
context-integrity guarantees. A convenience argument, a host claim, or a
successful normal run is not sufficient proof.

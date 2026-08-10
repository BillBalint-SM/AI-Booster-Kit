# Domain Docs

## Layout

This is a single-context repository. Root `CONTEXT.md` is the stable glossary
and root `docs/adr/` holds durable architecture decisions. Do not create a
`CONTEXT-MAP.md` unless a separately approved future topology decision makes
multiple contexts necessary.

## Read by task shape

- Read `VISION.md` for product scope, v1 criteria, strategy, or non-goal decisions.
- Read `DOMAIN.md`, then `CONTEXT.md`, for product behavior, module boundaries, invariants, or terminology.
- Read only ADRs that materially affect the proposed change.

## Vocabulary and conflicts

Use the preferred `CONTEXT.md` term in issue titles, plans, tests, and design
output. If the required concept has no stable term, record the gap for domain
modeling rather than inventing a competing synonym.

If a proposed result conflicts with an ADR, name the conflict explicitly and
request a decision. Do not silently override the ADR or create a new ADR
merely because a relevant record is absent.

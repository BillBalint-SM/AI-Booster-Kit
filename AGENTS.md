# AI Booster Kit agent guide

This file routes work; it does not grant authority.

## Binding sources

1. [PRODUCT.md](PRODUCT.md) defines the product, invariants, V1 gate, and
   non-goals.
2. [STATUS.md](STATUS.md) records current evidence, limits, and the next
   bounded action.
3. [docs/flow.md](docs/flow.md) defines verifier and CLI behavior.
4. [docs/plugin.md](docs/plugin.md) defines the Skills-only package and host
   boundary.

Source and tests control implementation details. Do not restore a superseded
plan or architecture from Git history as current guidance.

## Working contract

- For substantive work, state scope, acceptance criteria, evidence boundary,
  stop condition, and proportionate verification before editing.
- Keep facts, hypotheses, user decisions, approvals, evidence, and unknowns
  distinct.
- Booster remains Skills-only. Flow remains the only executable verifier.
- Do not add a runtime, registry, database, website, connector, automatic
  agent loop, or external target without an explicit product decision.
- Preserve unrelated and dirty work. Reopen controlling artifacts before a
  material claim, implementation, handoff, or external action.
- Expected non-success is visible as `STOPPED` or `UNKNOWN` with its reason and
  next safe action.

## Authority

Read-only inspection may proceed inside the requested scope. Reversible local
changes require an accepted scope. Deletion, credentials, plugins, global
configuration, external writes, commit, push, pull request, merge, release,
history rewrite, and branch deletion require fresh exact authority.

Tool availability is not permission. Before Git publication, re-read branch,
HEAD, remote state, diff, and untracked files.

## Completion

Finish with a review-ready result naming changed artifacts, checks and observed
results, evidence limits, unrelated work preserved, and the next bounded
action; otherwise return visible `STOPPED` or `UNKNOWN`.

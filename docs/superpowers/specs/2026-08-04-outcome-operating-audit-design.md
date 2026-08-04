# Outcome & Operating Audit v1 Design

**Status:** EXECUTED_WITH_LIMIT within a local, read-only evidence boundary.

The written-rule/directive audit and local system map are complete. User-side
unwritten habit, frequency, and time/energy evidence remains `UNKNOWN`, so the
Personal Operations gate is `PARTIAL` and the MVP remains paused.

## Mission

Turn the human-owned vision into a product that is valuable, usable, and
marketable while reducing the user's operating waste. The audit is successful
only when it produces one evidence-gated MVP slice that a Delivery / Technical
Lead can implement and a Reality / Quality Gate can verify.

## Scope

The audit reads the repository's canonical roadmap, current delivery state,
contracts, workflows, Role/Formation catalogs, and existing product surface.
It may normalize terminology and record explicit hypotheses, unknowns, and
dependencies. It does not claim customer, market, payment, or production
evidence that is not present. Any consequential external operation remains
subject to the applicable target, authority, and evidence contract.

The audit is a decision-support artifact, not a second roadmap and not a
replacement for the canonical current-state routing file.

## Role formation

| Role | Owns | Must hand off |
| --- | --- | --- |
| Project Systems Architect | system shape, dependency map, sequencing | bounded execution map |
| Documentation & Business Analysis | vocabulary, source normalization, redundancy register | normalized evidence packet |
| Product & Market Owner | product promise, target, pain, MVP, non-goals, metrics, stop rules | product-outcome contract |
| Delivery / Technical Lead | vertical slice, technical path, test/release/recovery route | implementation-ready slice |
| Personal Operations & Rule Auditor | rule purpose, result, cost, evidence, merge/remove decisions | lean operating system |
| Reality / Quality Gate | independent proof and readiness verdict | `READY`, `NEEDS_EVIDENCE`, or `STOPPED` |

The Vision Owner retains final authority. No Role may silently change the
vision, product boundary, or acceptance criteria.

## Required outputs

1. **Product and market thesis** — target user, painful problem, product
   promise, MVP, non-goals, differentiation hypothesis, success metrics, and
   `stop-if` conditions. Missing market or payment evidence remains `UNKNOWN`.
2. **Project and dependency map** — canonical sources, current capabilities,
   critical dependencies, vertical-slice path, integration boundaries, and
   explicit blockers.
3. **Rule and work-system audit** — one row per rule candidate with purpose,
   produced result or reduced risk, time/energy cost, evidence of continued
   need, and `KEEP`, `MERGE`, `REMOVE_CANDIDATE`, or `UNKNOWN` decision.
4. **First MVP-slice brief** — one bounded user-visible outcome, acceptance
   criteria, evidence plan, implementation dependencies, rollback boundary, and
   explicit non-goals.
5. **Reality / Quality Gate report** — independent checks, failed and unknown
   paths, residual risks, and a decision that does not promote documentation to
   product readiness.

## Acceptance criteria

- Every material claim is labelled `FACT`, `HYPOTHESIS`, `UNKNOWN`, or
  `RECOMMENDATION` and names its repository source or evidence gap.
- The product thesis identifies a concrete target and pain, or explicitly
  stops as `NEEDS_EVIDENCE` instead of inventing a market.
- The MVP slice is vertical, bounded, testable, and has at least one observable
  acceptance proof.
- Every audited rule answers: which goal does it serve, what result or risk
  reduction does it provide, and what proves it is still needed?
- No unsupported capability or unverified external result is promoted to
  product readiness.
- The audit leaves the next implementation decision unambiguous for the
  Vision Owner.

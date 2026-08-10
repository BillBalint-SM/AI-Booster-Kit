# AI Booster Kit Context

## Purpose

This is the stable, preferred vocabulary for AI Booster Kit. Use these terms
in plans, reviews, issue titles, tests, and handoffs. Product boundaries belong
in `DOMAIN.md`; strategic direction belongs in `VISION.md`.

## Preferred Vocabulary

- **Vision Contract:** the durable statement of direction, v1 finish gate,
  principles, and non-goals in `VISION.md`.
- **User:** the human who owns the outcome and makes final scope and authority
  decisions.
- **Agent:** a bounded capability that performs a declared task; it never owns
  the outcome by itself.
- **Module:** an independently invocable capability with a small, declared
  contract.
- **Flow:** an explicit composition of modules for one outcome; it is not an
  implicit global loop.
- **Interface:** the small contract crossed by a module's callers and tests.
- **Implementation:** the complexity hidden behind an interface.
- **Seam:** a deliberate boundary where one implementation can be replaced or
  independently verified.
- **Adapter:** a module that translates one interface or context into another
  without changing the authority boundary.
- **Depth:** the useful complexity a module hides behind its interface.
- **Leverage:** the amount of useful outcome a module produces relative to the
  complexity exposed to its caller.
- **Locality:** keeping related behavior, evidence, and decisions near the
  interface that needs them.
- **Evidence:** a verifiable fact or artifact that supports a claim or an
  acceptance criterion.
- **Review-ready result:** an output whose scope, evidence, limits, and next
  action can be inspected without trusting hidden conversation state.
- **Approval:** an explicit human decision that grants the stated scope and
  authority; it is not inferred from tool availability.
- **Handoff:** the compact record of status, artifacts, evidence, unknowns,
  limits, and the next bounded action.
- **STOPPED:** a safe, deliberate halt because the task may not proceed within
  its authority or evidence boundary.
- **UNKNOWN:** insufficient or conflicting evidence; it is never treated as
  ready, safe, or complete.

## Concept Relationships

```text
User approves scope and authority
  → Agent performs one Module or declared Flow
  → Interface is crossed by callers and tests
  → Evidence supports a review-ready result or an explicit STOPPED/UNKNOWN
  → Handoff exposes the result, evidence, limits, and next bounded action
```

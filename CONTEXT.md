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
- **Delivery Kit:** the installable, host-adapted AI Booster Kit package of
  Skills, Plugins, Scripts, contracts, and templates. It augments the selected
  Agent and Model; it does not create or replace either one.
- **Booster Mode:** the User's explicit activation of the Delivery Kit for one
  project or Delivery Session, before or during software delivery. It guides,
  asks, recommends, and keeps work reviewable without becoming an autonomous
  Agent loop.
- **Delivery Compass:** the narrated, current projection shown in Booster Mode:
  objective, stage, relevant facts, required decisions, evidence, unknowns,
  recommended Module, and next bounded action.
- **Delivery Session:** the bounded body of work observed and guided by one
  Booster Mode activation. It may begin before implementation or attach to work
  already in progress.
- **Skill:** a host-discoverable, independently invocable delivery procedure
  with declared inputs, outputs, evidence, stops, and suggested continuations.
- **Plugin:** an installable host distribution that packages Skills, Scripts,
  metadata, and optional host adapters. Installation grants no authority.
- **Script:** a deterministic local helper that a User, Skill, or approved host
  may invoke; it is not an Agent and cannot decide scope or authority.
- **Skill Registry:** the canonical declarative method graph for Booster Mode:
  Skill identity, host invocation, supported modes, consumed/produced artifact
  types, state/binding-aware gates, stops, and suggested continuations.
- **Artifact Declaration:** a caller-owned type/reference/state/binding record
  supplied to the Delivery Compass. It routes work but does not authenticate
  the referenced bytes or signer.
- **Module:** an independently invocable capability with a small, declared
  contract.
- **Flow:** an explicit composition of modules for one outcome; it is not an
  implicit global loop.
- **Flow Package:** the canonical, recommendation-only declaration of selected
  Modules, bindings, checkpoints, evidence, and Handoff requirements.
- **Flow Assessment:** a pure, reproducible evaluation of a complete Flow
  request and its receipts; it recommends the next safe Module or projects a
  terminal Handoff without execution or persistence.
- **Package Identity:** the SHA-256 correlation identity over the complete
  canonical request and Flow Package; it detects changed input but is not a
  signature or authority grant.
- **Receipt:** a caller-owned immutable record of a Stage result or human
  Checkpoint, bound to one Package Identity. A receipt points to evidence; it
  does not independently verify the referenced bytes.
- **Checkpoint:** a declared human decision boundary. The default Flow's
  `USER_ACCEPTS_PLAN` checkpoint binds the exact current plan receipt before
  implementation may be recommended.
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
User explicitly activates Booster Mode for a Delivery Session
  → Delivery Compass shows current state, decisions, evidence, and next action
  → Skill Registry evaluates declared inputs and exact gates
  → User invokes a Skill, Script, Module, or declared Flow through the existing Agent
  → Interface is crossed by callers and tests
  → Receipt binds Stage evidence or the human Checkpoint to one Package Identity
  → Flow Assessment refreshes the next safe recommendation or preserves STOPPED/UNKNOWN
  → Handoff exposes the result, evidence, limits, and next bounded action
```

# AI Booster Kit Domain

## Product Boundary

AI Booster Kit is an agent-agnostic operating layer that helps a technical
owner use AI-agent capabilities predictably on real repository work. The
owner's Codex environment is the first pilot and reference environment, not
the product's only host or purpose.

The product turns a bounded request into either a review-ready result or a
visible, justified stop. It coordinates work; it does not take outcome
ownership away from the human.

## Actors

- **User:** the human outcome owner and final decision-maker for direction,
  scope, authority, and acceptance.
- **Agent:** a bounded execution capability that performs an approved task but
  cannot own the outcome or silently widen its authority.
- **Reviewer:** a human or independent reviewer who checks evidence and scope
  without inheriting hidden authority from the original agent.

## Modules

`plan`, `review`, `implement`, and `test` are independently callable modules.
A module declaration names its purpose, required input and context, output,
scope and authority, verification evidence, `STOPPED` or `UNKNOWN` condition,
and handoff.

A `Flow` is an explicit composition of modules. It may use the default
`plan -> implement -> verify -> handoff` recipe for change-producing work, but
that recipe is not a global mandatory loop.

## Invariants

- The human retains direction and final control.
- A material change requires its relevant accepted plan.
- No external action is hidden.
- A result is review-ready only with proportionate evidence.
- Insufficient or conflicting evidence remains `UNKNOWN`.
- Unsafe or insufficiently authorized work stops visibly.
- Callers and tests cross the same declared interface.

## Domain Non-goals

- Selecting a particular agent host as the product definition.
- Autonomous outcome ownership or silent scope expansion.
- Treating a document as proof of host security or external connector
  capability.

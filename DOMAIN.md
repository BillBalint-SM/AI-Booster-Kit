# AI Booster Kit Domain

## Product Boundary

AI Booster Kit is an agent-agnostic Delivery Kit: an installable,
host-adapted package of Skills, Plugins, Scripts, contracts, and templates that
helps a technical owner use an existing Agent and Model predictably on real
repository work. It is not a new Agent or Model. The owner's Codex environment
is the first pilot and reference environment, not the product's only host or
purpose.

The product turns a bounded request into either a review-ready result or a
visible, justified stop. It coordinates work; it does not take outcome
ownership away from the human.

The User explicitly activates `Booster Mode` before delivery or while work is
already in progress. Booster Mode presents a narrated `Delivery Compass`, asks
only the questions needed for the current decision frontier, recommends an
independent Skill or Module, and refreshes the projection from declared
artifacts and receipts. Skills connect through explicit input/output contracts
and suggested continuations; they do not call each other through a hidden
autonomous loop.

## Actors

- **User:** the human outcome owner and final decision-maker for direction,
  scope, authority, and acceptance.
- **Agent:** a bounded execution capability that performs an approved task but
  cannot own the outcome or silently widen its authority.
- **Reviewer:** a human or independent reviewer who checks evidence and scope
  without inheriting hidden authority from the original agent.
- **Host:** the existing Codex, Claude Code, or compatible Agent environment
  that discovers the Delivery Kit and supplies the active Agent, Model, tools,
  permissions, and user interface.

## Modules

`plan`, `align`, `review`, `implement`, `test`, and `handoff` are independently
callable delivery modules. The canonical plugin exposes them through explicit
Skills; no module is a custom Agent or Model.
A module declaration names its purpose, required input and context, output,
scope and authority, verification evidence, `STOPPED` or `UNKNOWN` condition,
and handoff.

A `Flow` is an explicit composition of modules. It may use the default
`plan -> implement -> verify -> handoff` recipe for change-producing work, but
that recipe is not a global mandatory loop.

A `FlowPackage` is the canonical, recommendation-only declaration produced for
one Module or explicit Flow. A `Flow Assessment` is a pure evaluation of that
package's complete request plus caller-owned Stage and Checkpoint receipts. It
may identify a runnable next Module or a reviewable terminal Handoff; it does
not invoke a Module, persist a run, or grant authority.

The `Skill Registry` is the canonical method graph for Booster Mode. It declares
each Skill's host invocation, supported collaboration modes, consumed and
produced artifact types, state/binding-aware gates, stop conditions, and
suggested continuations. Registry order is a default recommendation only;
`preferredSkill` supports independent invocation.

## Invariants

- The human retains direction and final control.
- A material change requires its relevant accepted plan.
- A plan checkpoint binds the exact current plan receipt; it is not inferred
  from a stage name or tool availability.
- No external action is hidden.
- A result is review-ready only with proportionate evidence.
- A receipt is a declared observation record and cannot grant authority or
  prove referenced bytes without caller readback.
- Insufficient or conflicting evidence remains `UNKNOWN`.
- Unsafe or insufficiently authorized work stops visibly.
- Callers and tests cross the same declared interface.
- Installing the Delivery Kit does not activate Booster Mode, select a Model,
  or grant tool or external-write authority.
- Activating Booster Mode does not automatically invoke a suggested Skill,
  Script, Module, connector, or external action.
- An implementation recommendation requires an `accepted-plan` in `ACCEPTED`
  state bound to the exact current `plan-handoff`, plus a
  `repository-verified` artifact in `VERIFIED` state.

## Domain Non-goals

- Selecting a particular agent host as the product definition.
- Creating or replacing the Host's Agent or Model.
- Autonomous outcome ownership or silent scope expansion.
- Treating a document as proof of host security or external connector
  capability.

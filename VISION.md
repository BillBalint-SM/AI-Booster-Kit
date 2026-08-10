# AI Booster Kit Vision Contract

## Vision

> Az AI Booster Kit a Felhasználók számára az Agentek világát
> bizonytalanságból nyugodt, bizonyítható működéssé alakítja. A Platform
> minden önállóan vagy összehangolva dolgozó modulja review-képes eredményt —
> vagy szükséges, indokolt stoppot — ad, miközben az irány, a döntés és a
> kontroll végig az ember kezében marad.

## V1 Completion Gate

V1 is complete only when all four real, reviewable proofs exist:

1. An end-to-end change-producing task proves request clarification, context
   selection, planning, implementation, verification, and review or handoff.
2. A standalone planning task produces a reviewable plan.
3. A standalone review or test task produces reviewable evidence.
4. A task correctly finishes as `STOPPED` or `UNKNOWN`, with its reason and
   next safe action.

No proof may rely on an unapproved external write.

## Principles

- **Modular by design:** a user may invoke a module independently or compose
  modules into an explicit flow.
- **A default recipe, not a mandatory loop:** for change-producing work,
  `plan -> implement -> verify -> handoff` is the normal composition.
- **Human control:** the human retains direction, decision, scope, and final
  acceptance throughout the work.
- **Evidence before confidence:** a review-ready result has proportionate,
  inspectable evidence; uncertainty stays explicit.
- **No hidden external action:** an external action is visible and requires the
  authority defined for it.

## Non-goals

- Runtime refactoring or a new runtime capability.
- An automatic agent loop or autonomous outcome ownership.
- Global Codex configuration, hook, plugin, MCP, credential, or connector
  setup.
- An external write, deletion, or automatic Git publication.
- A claim that documentation alone proves host security, host parity, or
  external connector capability.

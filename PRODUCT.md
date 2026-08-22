# Product contract

## Purpose

AI Booster Kit helps a person and an existing AI agent turn bounded
software-delivery work into a reviewable result or an explicit, justified
stop. Direction, scope, decisions, authority, and final acceptance remain with
the person.

## Product shape

| Surface | Responsibility | Boundary |
| --- | --- | --- |
| Booster | Seven explicit delivery Skills for Codex and Claude Code | Skills-only; no runtime, registry, verifier, model, connector, or automatic invocation |
| Flow | Compose module packages and assess immutable stage/checkpoint receipts | Deterministic local verifier; no execution, dispatch, persistence, network, or external write |

Booster and Flow may express the same delivery stages, but neither depends on
the other at runtime. Flow is the only verifier.

## Binding behavior

- A user may invoke `plan`, `implement`, `test`, or `review` independently.
- The explicit `default-change` Flow is `plan -> implement -> test -> review`,
  followed by a receipt-backed handoff.
- Implementation cannot become runnable until the exact plan receipt has an
  accepted `USER_ACCEPTS_PLAN` checkpoint.
- Facts, hypotheses, user decisions, evidence, limits, and unknowns stay
  distinct.
- `STOPPED` and `UNKNOWN` are valid terminal outcomes and retain a reason and
  next safe action.
- No available tool or installed Skill implies authority. External writes,
  destructive actions, commit, push, merge, release, and publication require
  their own explicit authority.

## V1 proof gate

V1 is proven only when current, reviewable evidence covers all four cases:

1. one real change-producing task from clarification through implementation,
   verification, and review or handoff;
2. one standalone planning task with a reviewable plan;
3. one standalone review or test task with reviewable evidence;
4. one correct `STOPPED` or `UNKNOWN` result with reason and next safe action.

Unit tests, fixture receipts, documentation, or an old proof bundle do not by
themselves satisfy this gate for the current product bytes. [STATUS.md](STATUS.md)
records the current evidence verdict.

## Non-goals

- autonomous outcome ownership or an automatic agent loop;
- a general orchestration runtime, task tracker, database, or connector layer;
- global host configuration, credentials, MCP setup, or model selection;
- automatic Git publication, release, or any hidden external action;
- claims of host parity, host security, production readiness, or adoption
  without direct evidence.

## Provenance rule

The owner narrowed the product on 2026-08-22 to a Skills-only Booster plus the
Flow verifier. Source, tests, and the four current documents are authoritative
for that product. Superseded plans and broader architectures remain available
through Git history, not as competing truth in the working tree.

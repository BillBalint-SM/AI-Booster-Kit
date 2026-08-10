# Foundation Reset Design

**Status:** Accepted design. Implementation requires a separate approved plan.

## Purpose

Replace competing instruction and documentation layers with a compact,
modular, evidence-first operating surface for AI Booster Kit. The Foundation
Reset changes documentation and guidance only. It does not change runtime
behavior, credentials, global Codex configuration, external systems, or Git
publication state.

## Vision

> Az AI Booster Kit a Felhasználók számára az Agentek világát bizonytalanságból
> nyugodt, bizonyítható működéssé alakítja. A Platform minden önállóan vagy
> összehangolva dolgozó modulja review-képes eredményt - vagy szükséges,
> indokolt stoppot - ad, miközben az irány, a döntés és a kontroll végig az
> ember kezében marad.

## Product Decisions

- AI Booster Kit remains an agent-agnostic product. The owner's Codex setup is
  its first real pilot and reference environment, not the product's sole
  purpose.
- The v1 primary user is a technical owner working on real repositories with
  Codex.
- The v1 promise is a demonstrable path from a request to either a
  review-ready result or an explicit `STOPPED` or `UNKNOWN` result.
- The product is modular. A user may invoke a `plan`, `review`, `implement`,
  or `test` module independently, or compose modules into an end-to-end flow.
- For change-producing work, `plan -> implement -> verify -> handoff` is the
  default recipe, not a mandatory global loop.
- Every independently invocable module declares its purpose, required input
  and context, output, scope and authority, verification evidence, stop
  condition, and handoff.

## V1 Completion Gate

V1 is complete only when all of the following real, reviewable evidence
exists:

1. One end-to-end change-producing task completes request clarification,
   context selection, planning, implementation, verification, and review or
   handoff.
2. One standalone planning task produces a reviewable plan.
3. One standalone review or test task produces reviewable evidence.
4. One task correctly stops as `STOPPED` or `UNKNOWN` with its reason and
   next safe action.

No proof may rely on an unapproved external write.

## Authority Model

The Foundation Reset preserves a three-level authority model:

1. Read-only diagnosis within the stated task scope may proceed.
2. Reversible local changes may proceed after approval of the relevant plan
   and remain uncommitted for review.
3. Deletion, global configuration, credentials, plugin or MCP changes,
   external writes, commit, push, pull request, and merge require fresh,
   operation-specific approval.

## Canonical Information Architecture

| Artifact | Owns | Does not own |
| --- | --- | --- |
| `VISION.md` | Vision, v1 completion gate, principles, and non-goals | Current delivery state or implementation plan |
| `DOMAIN.md` | Users, problem boundaries, modules, invariants, and non-goals | Term definitions or implementation detail |
| `CONTEXT.md` | Stable domain glossary and concept relationships | Specifications, status, or implementation detail |
| `AGENTS.md` | Host-agnostic routing and always-applicable repository rules | Repeated product, domain, or host-specific detail |
| `CLAUDE.md` | Claude-specific context-integrity rules and a pointer to `AGENTS.md` | The shared operating contract |
| `docs/agents/` | Issue-tracker, triage, and domain-document consumption rules | Authority to perform an external write |
| `docs/adr/` | Hard-to-reverse, surprising, trade-off decisions | Routine implementation history |
| `docs/project/roadmap.md` | Ordered work derived from the vision | A duplicate vision or current status |
| `docs/project/current-state.md` | Current delivery status and next bounded action | Long-term strategy |
| `docs/history/` | Historical evidence | Default agent context |

The `README.md` remains a human and GitHub entry point. It links to the
vision, the current state, and the documentation map without repeating their
content.

## Agent Guidance Design

`AGENTS.md` is the canonical, host-agnostic repository instruction file. It
uses precise context pointers:

- Read `VISION.md` when a task changes product scope, v1 criteria, or
  strategic direction.
- Read `DOMAIN.md`, then `CONTEXT.md`, when changing product behavior,
  module boundaries, or domain terminology.
- Read the common operating model before substantive work.
- Read `docs/agents/issue-tracker.md` before an issue-tracker operation.
- Read relevant ADRs before reversing a recorded architectural decision.
- Read `docs/project/current-state.md` for delivery status, milestone routing,
  or a decision that depends on current external state.

`CLAUDE.md` remains present as a narrow host projection. It preserves the
existing direct-on-disk context-integrity checks and directs Claude to
`AGENTS.md` for shared behavior. It is not deleted until a separate,
evidence-backed decision proves a replacement preserves the same protection.

## Domain and Codebase Language

`CONTEXT.md` uses short, opinionated definitions and names the preferred term
when competing language exists. Its initial glossary covers `User`, `Agent`,
`Module`, `Flow`, `Interface`, `Evidence`, `Review-ready result`, `Approval`,
`Handoff`, `STOPPED`, and `UNKNOWN`.

When code or workflow design needs deeper module language, use `Module`,
`Interface`, `Implementation`, `Seam`, `Adapter`, `Depth`, `Leverage`, and
`Locality` consistently. A module presents one small interface and hides its
implementation complexity behind that interface. Tests cross the same
interface as callers.

## Engineering-Skill Setup

GitHub Issues is the single issue tracker. The canonical triage label strings
are `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and
`wontfix`.

The setup documents state that tracker configuration does not grant permission
to create, comment on, label, close, or otherwise mutate a GitHub issue.
Those actions remain consequential external writes under the authority model.

This repository is a single context. It uses root `CONTEXT.md` and a root
`docs/adr/` directory. No `CONTEXT-MAP.md` is created.

## Migration Policy

1. Preserve all existing documents while the Foundation Reset is under
   review.
2. Classify each active legacy document as `retain`, `rewrite`, `archive`, or
   `unknown` in a Foundation Reset migration record under `docs/history/`.
3. Update active entry points only after their canonical replacement passes
   review.
4. Do not delete or relocate a legacy document in this slice.
5. Keep the roadmap as an ordered v1 execution view derived from `VISION.md`.

## First Architectural Decision Record

The guidance and document topology qualifies for `docs/adr/0001-canonical-agent-guidance-and-document-topology.md` because it is difficult to
reverse, changes how all future work finds its source of truth, and was chosen
from meaningful alternatives.

## Verification

The Foundation Reset is reviewable only when:

- every active source has one declared owner in the documentation map;
- `AGENTS.md` and `CLAUDE.md` do not duplicate shared behavior;
- `npm run check:docs` passes;
- `git diff --check` passes;
- a manual source-of-truth audit finds no active duplicate vision, domain,
  context, roadmap, or delivery-status owner;
- no dependency, runtime, global configuration, external system, or Git
  publication change appears in the final diff.

## Explicit Non-Goals

- Runtime-code refactoring or new runtime capability.
- Deletion or blind archival of existing documentation.
- External GitHub, Jira, Confluence, MCP, plugin, credential, or global Codex
  configuration changes.
- Automatic commit, push, pull-request creation, merge, or deployment.
- A claim of multi-host behavioral or security parity.

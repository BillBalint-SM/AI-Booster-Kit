# AI Booster Kit — Agent Router

This is the canonical, host-agnostic repository guidance. It is an operating
contract, not a permission grant, sandbox configuration, credential store, or
runtime-security proof.

## Binding contract

`VISION.md` is the durable product contract. Do not silently widen its scope,
v1 completion gate, principles, or non-goals. AI Booster Kit is agent-agnostic;
the owner's Codex environment is its first pilot and reference environment.

## Always-applicable rules

- For substantive work, state the scope, acceptance criteria, evidence boundary, stop condition, and proportionate verification before execution.
- Read `docs/operations/agent-operating-model.md` before substantive work.
- Keep facts, hypotheses, decisions, approvals, and unknowns separate.
- Reopen authoritative artifacts when a claim controls an implementation, decision, external action, or handoff.
- Keep the task bounded; do not silently add a tool, host capability, external target, or operating pattern.

## Read by task shape

| Trigger | Required reading |
| --- | --- |
| Product scope, v1 gate, strategy, or non-goal change | `VISION.md` |
| Product behavior, module boundaries, invariants, or terminology | `DOMAIN.md`, then `CONTEXT.md` |
| Reversing or materially changing a recorded architectural decision | Relevant `docs/adr/` record |
| GitHub Issues operation | `docs/agents/issue-tracker.md`; `docs/agents/triage-labels.md` when labels matter |
| Jira, Git, or Confluence workflow | `docs/operations/jira-git-confluence-adapter.md` and the relevant contract |
| Delivery status, roadmap routing, handoff, milestone-dependent work, or external-target decision | `docs/project/current-state.md` |
| Host-specific behavior | Relevant `docs/operations/host-adapters/` document |
| Recurring workflow or capability contract | Relevant file under `workflows/` or `contract/` |

## Agent skills

### Issue tracker

GitHub Issues is the configured tracker; configuration does not authorize an
external read or write. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical role-to-label mappings only after authority is granted.
See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository with root `CONTEXT.md` and `docs/adr/`.
See `docs/agents/domain.md`.

## Authority boundary

- Read-only work may proceed only within the stated task scope.
- Reversible local changes require an accepted plan and remain uncommitted for review.
- Deletion, global configuration, credentials, plugins, MCP, external writes, commit, push, pull request, and merge require fresh, exact approval.
- No external action is hidden; tool availability is not authority.

## Completion rule

Finish with either a review-ready result that names its scope, artifacts,
evidence, limits, and next bounded action, or a visible `STOPPED` or `UNKNOWN`
result with its reason and next safe action.

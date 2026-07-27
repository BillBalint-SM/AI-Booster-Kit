# Codex host adapter

**Status:** Portable team guidance; not a Codex configuration file and not a permission grant.

**Verified:** 2026-07-27 against the [Codex `AGENTS.md` documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [Codex config basics](https://learn.chatgpt.com/docs/config-file/config-basic).

## Layering

Use this adapter after reading the [Common Agent Operating Model](../agent-operating-model.md). If the work touches the Jira/Git/Confluence workflow, also read the [Jira–Git–Confluence Domain Adapter](../jira-git-confluence-adapter.md).

```text
Common agent core
  → Codex-native instruction and execution controls
    → optional domain adapter
      → team workflow
```

The adapter tells a Codex user where the shared behavior can be expressed. It does not authorize a tool call, external write, or permission change.

## Native surfaces

| Concern | Codex-native surface | Use it for | Keep separate |
| --- | --- | --- | --- |
| Durable repository guidance | `AGENTS.md` / `AGENTS.override.md` instruction chain | Shared conventions, lifecycle, acceptance, review, and handoff expectations | It is prompt context, not hard enforcement. |
| Runtime and permission behavior | `~/.codex/config.toml`, trusted project `.codex/config.toml`, profiles, CLI overrides | Model, approval policy, sandbox, MCP, and other client settings | Do not encode credentials or domain approval in repo guidance. |
| Bounded specialization | Codex-native skills and sub-agent mechanisms, where enabled in the current client | Repeatable procedures or isolated bounded work | The current repo does not claim a specific runtime availability or syntax without a host check. |
| Durable state | Version-controlled plans, evidence, decisions, and artifacts | Authoritative handoff and review state | Memory or session history is convenience, not the source of truth. |

Codex discovers global and project guidance in a layered chain; a closer file appears later and can refine earlier guidance. `AGENTS.override.md` takes precedence over `AGENTS.md` at the same directory level. Project `.codex/` layers are loaded only for a trusted project. The current Codex client should be checked before relying on a particular setting, skill, or sub-agent capability.

## Activation protocol

1. Read the common core and identify the task objective, evidence boundary, acceptance criteria, and stop conditions.
2. Choose the smallest Codex instruction scope: global for personal defaults, repository `AGENTS.md` for team-shared repository behavior, and a nested file only for a genuinely narrower directory.
3. Keep approval policy, sandbox, MCP, and other runtime controls in the appropriate Codex configuration surface. Review them independently; an instruction cannot weaken or replace them.
4. If using a sub-agent or skill, issue a bounded packet with an owner, exact input, expected artifact, review rule, and stop condition.
5. Before a consequential action, reread the domain adapter and obtain the operation-specific approval required there.
6. Verify the resulting artifact and record a handoff that a fresh Codex session can reproduce.

## Minimal repository starter

Copy only the following behavior into the repository's chosen Codex instruction file after team review. Keep the file short and link to the maintained documents rather than duplicating them.

```markdown
## Shared agent operating contract

- Read `docs/operations/agent-operating-model.md` before non-trivial work.
- Use `observe → validate → plan → coordinate → execute → verify → hand off`.
- Start with strong single-agent execution; use another pattern only when its input, output, owner, and review gate are explicit.
- Treat facts, hypotheses, decisions, approvals, and unknowns as separate categories.
- Do not write to external systems without fresh, operation-specific approval.
- Reopen authoritative artifacts and verify material results before handoff.
- Record exact artifacts, source references, failures, unknowns, and the next bounded action.
```

This starter is a team decision aid. It does not create `.codex/config.toml`, change approval policy, enable MCP, or grant access.

## Codex-specific stop rules

Stop and classify the task as `BLOCKED`, `UNKNOWN`, or `NOT EXECUTED` when:

- the active instruction chain or trusted-project state cannot be determined;
- the proposed runtime setting would change sandbox, approval, network, or credential boundaries without separate review;
- a sub-agent report is being used as proof without artifact-level verification;
- an external write target, approval, duplicate rule, or read-back contract is missing;
- the required Codex feature or syntax is not verified in the active client.

## Source boundary

This document records the product-facing mapping only. It does not prove that any particular Codex installation loaded these files, exposes a specific sub-agent feature, or can reach a domain connector.

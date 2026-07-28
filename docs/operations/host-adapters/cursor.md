# Cursor host adapter

**Status:** Portable team guidance; not a Cursor rule file, security policy, or permission grant.

**Verified:** 2026-07-27 against the [Cursor Rules documentation](https://cursor.com/docs/rules.md) and [Cursor MCP documentation](https://cursor.com/docs/mcp.md).

## Layering

Use this adapter after reading the [Common Agent Operating Model](../agent-operating-model.md). Add the [Jira–Git–Confluence Domain Adapter](../jira-git-confluence-adapter.md) only when the task actually crosses that domain.

```text
Common agent core
  → Cursor-native rules and execution controls
    → optional domain adapter
      → team workflow
```

Cursor rules are context supplied to the model. Team enforcement, tool allowlists, network controls, and other security controls are separate decisions.

## Native surfaces

| Concern | Cursor-native surface | Use it for | Keep separate |
| --- | --- | --- | --- |
| Repository guidance | `.cursor/rules/*.mdc` Project Rules | Version-controlled, reusable, scoped instructions | MDC metadata and rule application do not replace security controls. |
| Simple compatibility guidance | Root or nested `AGENTS.md` | Readable instructions for straightforward projects | Keep one canonical maintained source where possible; do not silently fork rules. |
| Team-wide guidance | Team Rules in the Cursor dashboard, where the plan supports them | Reviewed organization-wide behavior | Team Rules are plan/admin scope, not created by this repository slice. |
| External tools | MCP configuration and dashboard controls | Bounded retrieval or tool execution | Source verification, least privilege, approvals, network mode, and tool allowlists remain independent. |
| Durable state | Version-controlled plans, evidence, decisions, and artifacts | Reviewable handoff | Cursor memories and chat context are not authoritative evidence. |

Project Rules support `Always`, `Auto Attached`, and `Agent Requested` application modes. Use the narrowest mode that supplies the required context. `AGENTS.md` is a plain alternative for simple guidance and is supported at project and nested-directory scope.

## Activation protocol

1. Read the common core and select the smallest useful pattern before opening a Cursor task.
2. Prefer one short Project Rule for the shared operating contract; use path-scoped rules for specialized instructions.
3. If the repository already has `AGENTS.md`, decide whether Cursor should consume it directly or whether the team will maintain a canonical Project Rule. Do not create conflicting copies.
4. Treat MCP as a separate tool and trust decision: verify its source, inspect permissions, use minimum API-key scope, and confirm approval behavior before any live call.
5. If using parallel agents, assign independent packets and write ownership. Shared mutable files require isolation and a separate integration review.
6. Verify the artifacts and source state, then record the clean handoff before switching context.

## Minimal Project Rule starter

After team review, the following can be adapted into one `.cursor/rules/agent-operating-contract.mdc` file. This repository intentionally does not create that host file automatically.

```mdc
---
description: Shared agent operating contract for this repository
alwaysApply: true
---

Read `docs/operations/agent-operating-model.md` before non-trivial work.

- Follow `observe → validate → plan → coordinate → execute → verify → hand off`.
- Start with strong single-agent execution and promote complexity only with task evidence.
- Keep facts, hypotheses, decisions, approvals, and unknowns visibly separate.
- Do not write to Jira, Git hosting, Confluence, or another external system without fresh, operation-specific approval.
- Reopen authoritative artifacts and verify material results before handoff.
- Record exact artifacts, source references, failures, unknowns, and the next bounded action.
```

The starter is guidance. It does not install or enable MCP, alter Cursor run modes, create a Team Rule, or approve an external operation.

## Cursor-specific stop rules

Stop and classify the task as `BLOCKED`, `UNKNOWN`, or `NOT EXECUTED` when:

- a rule is relevant but its application mode, scope, or precedence is unclear;
- a Team Rule, MCP allowlist, network mode, or tool approval is assumed rather than verified;
- an MCP source, permissions, or API-key boundary has not been reviewed;
- a parallel writer would share mutable state without isolation and integration ownership;
- a model response is being treated as source-state evidence without read-back.

## Source boundary

This document does not prove Cursor Team Rules availability, MCP installation, tool approval behavior, or runtime loading for a particular team or machine. Those are host and administrator facts to verify at activation time.

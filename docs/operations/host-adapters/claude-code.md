# Claude Code host adapter

**Status:** Portable team guidance; not a `CLAUDE.md`, settings file, permission policy, or runtime proof.

**Verified:** 2026-07-27 against [Claude Code memory and `CLAUDE.md`](https://code.claude.com/docs/en/memory) and [Claude Code settings](https://code.claude.com/docs/en/settings).

## Layering

Use this adapter after reading the [Common Agent Operating Model](../agent-operating-model.md). Add the [Jira–Git–Confluence Domain Adapter](../jira-git-confluence-adapter.md) only for work that crosses that domain.

```text
Common agent core
  → Claude Code instructions, rules, and execution controls
    → optional domain adapter
      → team workflow
```

`CLAUDE.md` is context and guidance. Settings, permissions, sandboxing, hooks, MCP, plugins, and managed policy are separate controls.

## Native surfaces

| Concern | Claude Code-native surface | Use it for | Keep separate |
| --- | --- | --- | --- |
| Team-shared repository guidance | `CLAUDE.md` or `.claude/CLAUDE.md` | Project facts, conventions, architecture, and always-needed workflow rules | It shapes behavior; settings provide technical enforcement. |
| Reusing an existing shared contract | `CLAUDE.md` import such as `@AGENTS.md` | One canonical instruction source for compatible agents | Claude Code reads `CLAUDE.md`, not `AGENTS.md` directly. Verify imports and approval prompts. |
| Narrow instructions | `.claude/rules/*.md` | Path-scoped or topic-specific guidance | Do not use rules to encode permissions or credentials. |
| Runtime and authority controls | Project/user/managed settings, permissions, sandbox, hooks, MCP, plugins | Shared tooling and enforceable client behavior | These need separate review, least privilege, and host/admin ownership. |
| Bounded specialization | `.claude/skills/` and `.claude/agents/`, where enabled | Repeatable procedures and bounded sub-agents | A skill or sub-agent report is not independent evidence by itself. |
| Durable state vs convenience memory | Version-controlled artifacts vs auto memory | Plans, decisions, evidence, and handoff vs local learnings | Auto memory is machine-local and lossy; it is not the source of truth. |

Project settings are shared when committed; local settings are machine-specific. Managed settings can enforce controls above project and user scopes. Keep behavior guidance and enforcement visibly separate in review.

## Activation protocol

1. Read the common core and identify the smallest context needed for the task.
2. If the repository has `AGENTS.md`, use a reviewed `CLAUDE.md` import rather than duplicating the full contract. Add Claude-specific guidance only where it is genuinely host-specific.
3. Move path-specific or task-specific detail to `.claude/rules` or an on-demand skill instead of inflating the always-loaded project file.
4. Treat `.claude/settings.json`, permissions, sandbox, hooks, MCP, plugins, and sub-agent definitions as separate implementation and review surfaces. This slice does not create or modify them.
5. Do not treat auto memory as accepted project state. Write material decisions, evidence, and handoff facts to version-controlled artifacts.
6. Verify the resulting artifacts and record the handoff before compaction or context switch.

## Minimal `CLAUDE.md` starter

After team review, adapt the following into a project `CLAUDE.md`. It intentionally references the canonical documents and does not duplicate domain permissions.

```markdown
@AGENTS.md

## Shared agent operating contract

- Read `docs/operations/agent-operating-model.md` before non-trivial work.
- Follow `observe → validate → plan → coordinate → execute → verify → hand off`.
- Start with strong single-agent execution; add sub-agents only with bounded packets and explicit review.
- Keep facts, hypotheses, decisions, approvals, and unknowns visibly separate.
- Do not write to external systems without fresh, operation-specific approval.
- Reopen authoritative artifacts and verify material results before handoff.
- Record exact artifacts, source references, failures, unknowns, and the next bounded action.
```

The import and starter are guidance. They do not change `.claude/settings.json`, permission rules, sandboxing, hooks, MCP, plugins, or auto-memory behavior.

## Claude Code-specific stop rules

Stop and classify the task as `BLOCKED`, `UNKNOWN`, or `NOT EXECUTED` when:

- `CLAUDE.md` imports or loaded files cannot be confirmed;
- a project instruction is being used as a substitute for a settings or permission control;
- auto memory contains the only copy of a material decision or source claim;
- a sub-agent or skill result is being treated as independently verified without reopening artifacts;
- a project/managed setting, hook, MCP server, plugin, or credential boundary is not explicitly reviewed.

## Source boundary

This document does not prove Claude Code version, settings scope, plugin or MCP availability, hook behavior, auto-memory state, or sub-agent runtime behavior for a particular machine.

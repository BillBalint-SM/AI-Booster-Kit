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

## Context-integrity protocol

Treat a host statement such as “`CLAUDE.md` loaded” as a host observation, not as proof that a particular file was read from disk. Before using `CLAUDE.md` content as an authoritative project artifact, independently reopen the exact path from the active repository/worktree with a trusted local read.

Record all of the following:

1. the exact resolved path and repository/worktree revision;
2. whether the path is user-level, project-level, nested, managed, or host-injected context;
3. the direct on-disk read result, including a content hash or equivalent byte-identity evidence when a captured/injected copy is available;
4. the source scope and any ambiguity, mismatch, stale revision, or unavailable read.

Use these classifications:

| Result | Minimum evidence | Action |
| --- | --- | --- |
| `PASS` | The exact path resolves, the direct read succeeds, and the captured context is byte-faithful to the read-back content at the recorded revision. | The file content may be used as verified context, subject to its source scope. |
| `UNKNOWN` | The host claims that `CLAUDE.md` was loaded, but the exact on-disk path, direct read, or comparison evidence is missing. | Preserve the claim as an observation only; do not use it as authoritative file evidence. |
| `BLOCKED` | The path is ambiguous or inaccessible, the read fails, the content differs, or the revision/scope cannot be reconciled. | Stop the affected path and resolve the discrepancy before relying on the content. |

Keep these layers separate:

| Layer | Meaning | What it does not prove |
| --- | --- | --- |
| Host-injected context | Text supplied to the model by the host under a filename or label. | That the named file exists, was read from disk, or is current. |
| User-level instructions | Guidance supplied from the user's or host's user scope. | That project instructions or enforcement settings were loaded. |
| Project instructions | Repository-owned `CLAUDE.md`, `.claude/CLAUDE.md`, nested instructions, or scoped rules verified from the worktree. | Permission, sandbox, hook, MCP, credential, or external-write authority. |
| Permission/enforcement settings | Project/user/managed settings, permissions, sandbox, hooks, MCP, plugins, and tool controls. | The content or provenance of any instruction file. |

Never promote an injected filename, a chat claim, or a successful model response across these layers. If the direct read-back or comparison is not available, preserve the uncertainty in the handoff and keep the affected result `UNKNOWN` or `BLOCKED`.

### Executable verification gate

The repository includes a dependency-free guard at `tools/claude-context-integrity/verify.ps1`. Run it before accepting a host-reported `CLAUDE.md` load:

```powershell
pwsh -NoProfile -NonInteractive -File .\tools\claude-context-integrity\verify.ps1 `
  -ClaimedPath 'C:\path\to\CLAUDE.md' `
  -SourcePath 'C:\path\to\CLAUDE.md' `
  -SourceScope Project `
  -ContextRevision '<git-revision-or-user-scope>' `
  -NoCapturedPayload
```

When the host exposes an exact raw source-block capture, replace `-NoCapturedPayload` with `-CapturedPayloadPath '<exact-captured-source-block>'`. The guard reads both files as raw bytes and emits one JSON result. Exit codes are `0 = PASS`, `10 = UNKNOWN` (no capture), and `20 = BLOCKED` (path/read/mismatch failure). A transcript, assistant summary, or filename claim is not an exact payload capture and must not be supplied as one.

The regression harness is `tools/claude-context-integrity/test-verify.ps1`; it covers exact equality, byte mismatch, and unavailable capture.

## Activation protocol

1. Read the common core and identify the smallest context needed for the task.
2. If the repository has `AGENTS.md`, use a reviewed `CLAUDE.md` import rather than duplicating the full contract. Add Claude-specific guidance only where it is genuinely host-specific.
3. Move path-specific or task-specific detail to `.claude/rules` or an on-demand skill instead of inflating the always-loaded project file.
4. Treat `.claude/settings.json`, permissions, sandbox, hooks, MCP, plugins, and sub-agent definitions as separate implementation and review surfaces. This slice does not create or modify them.
5. Do not treat auto memory as accepted project state. Write material decisions, evidence, and handoff facts to version-controlled artifacts.
6. Run the executable context-integrity guard before treating a host-reported `CLAUDE.md` load as verified file content.
7. Verify the resulting artifacts and record the handoff before compaction or context switch.

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

- `CLAUDE.md` imports or loaded files cannot be confirmed by direct on-disk read-back;
- a host-injected `CLAUDE.md` context does not match the direct read-back content or its revision/scope is ambiguous;
- a project instruction is being used as a substitute for a settings or permission control;
- auto memory contains the only copy of a material decision or source claim;
- a sub-agent or skill result is being treated as independently verified without reopening artifacts;
- a project/managed setting, hook, MCP server, plugin, or credential boundary is not explicitly reviewed.

## Source boundary

This document does not prove Claude Code version, settings scope, plugin or MCP availability, hook behavior, auto-memory state, or sub-agent runtime behavior for a particular machine.

# Host-native adapters and team activation package

**Status:** Approved and executed as a documentation slice on 2026-07-27.

## Objective

Make the domain-independent agent operating model usable across Codex, Cursor, and Claude Code without pretending that a shared markdown contract is a permission grant, a runtime configuration, or an integration proof.

## Scope

In scope:

- one host-native adapter for Codex;
- one host-native adapter for Cursor;
- one host-native adapter for Claude Code;
- one team activation guide with pattern selection, clean-context handoff, and conformance checks;
- links from the Gate 2 handoff to these artifacts;
- official product references verified on 2026-07-27.

Out of scope:

- creating or changing `AGENTS.md`, `.cursor/rules`, `CLAUDE.md`, host settings, MCP servers, hooks, skills, plugins, or sub-agent files in the repository;
- granting Jira, Git, Confluence, connector, or cloud permissions;
- installing products, plugins, dependencies, or credentials;
- executing external reads or writes;
- claiming runtime conformance for a host that was not executed.

## Acceptance criteria

1. Each adapter identifies the native instruction surface, configuration/permission surface, memory or handoff boundary, and the product-specific limitation that must not be abstracted away.
2. Each adapter provides a minimal copy/paste starter that references the common core and domain adapter without duplicating their authority rules.
3. The activation guide makes the order explicit: common core → host adapter → domain adapter → team workflow.
4. The activation guide provides a conscious selection rule for the control-flow patterns and a stop rule for unclear or unverified context.
5. A fresh team member can produce a reproducible handoff without relying on hidden chat memory.
6. Verification finds no host configuration or external source-state change in this slice.

## Risks and controls

| Risk | Control |
| --- | --- |
| Product behavior changes | Keep official links and a verification date in each adapter; mark unverified runtime claims as `UNKNOWN`. |
| Guidance is mistaken for enforcement | Separate instruction, settings, permissions, hooks, MCP, and managed controls in every adapter. |
| Domain rules leak into the common core | Link to the domain adapter; do not copy source truth or write contracts into host docs. |
| Context drift during handoff | Require source references, exact artifacts, unknowns, stop conditions, and next action. |
| Premature multi-agent complexity | Start with strong single-agent execution and promote only on measured task evidence. |

## Verification approach

- inspect the new files and all links;
- check official-source URLs are present for each host;
- check the common core remains domain-independent;
- run whitespace and secret-format scans;
- run `git diff --check`;
- inspect the final diff and commit only the scoped documentation.

## Execution handoff

This slice is executed inline in the approved worktree. No host configuration, credential, permission, connector, or external source state is changed.

# Common Agent Core and Domain Adapter Separation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the domain-independent agent/sub-agent operating model from the Jira–Git–Confluence integration layer.

**Architecture:** `common-agent-core.md` defines agent behavior, coordination patterns, context hygiene, handoff, and pattern selection without naming a source system. `jira-git-confluence-adapter.md` defines the later domain layer for Jira lifecycle truth, Git artifacts, Confluence projections, and source-native write/read-back controls. Host adapters are explicitly out of scope for this slice.

**Tech Stack:** Markdown and existing local Gate 2 evidence. No application code, dependency, credential, host configuration, connector, or external write is changed.

## Global Constraints

- Keep the common core independent from Jira, Git, Confluence, Azure, or any other domain/tool.
- Keep source permissions and source-of-truth rules in the domain adapter, not in the core.
- Preserve the six existing operational patterns and add the image-derived control-flow vocabulary only where it clarifies agent behavior.
- Treat summaries and memory as non-authoritative; require clean context, explicit evidence, and source reopening for material claims.
- Do not create Codex, Cursor, or Claude Code configuration files in this slice.
- Do not change external state; keep changes uncommitted until the handoff is verified.

## Files and responsibilities

- Modify: `docs/operations/agent-operating-model.md` — domain-independent common core.
- Create: `docs/operations/jira-git-confluence-adapter.md` — later integration/domain layer.
- Modify: `docs/operations/g2as-research-validation-runbook.md` — point to core and adapter separately.
- Modify: `docs/history/gate-2/g2ai-pilot-evidence.md` and `docs/history/gate-2/gate-2-results-and-next-steps.md` — update traceable handoff links and scope statements.

## Acceptance criteria

- The common core contains no Jira, Git, Confluence, Jira issue key, project, endpoint, or source-specific permission rule.
- The core defines the agent lifecycle, context hygiene, handoff contract, and pattern-selection vocabulary.
- The adapter contains all Jira/Git/Confluence source-of-truth, approval, write, read-back, audit, and G2AS-specific references.
- The G2AS runbook names both layers and clearly states which claims are local contracts versus runtime evidence.
- No Codex/Cursor/Claude Code host configuration is created or changed.
- A local scan verifies the boundary and no external state changes.

## Execution handoff

This slice was executed inline. The next slice—host-native adapters and shareable team activation files—requires a separate review after this boundary is clean.

## Verification result

- Common core contains no explicit Jira, Confluence, GitHub, G2AS, OAuth, Rovo, or Azure names.
- Domain adapter contains the Jira/Git/Confluence authority, write/read-back, audit/recovery, and G2AS fixture details.
- G2AS runbook links both layers and keeps runtime evidence separate from local contracts.
- No host configuration or external source state changed.

# Agentic operating model — current state and roadmap

**As of:** 2026-07-28
**Repository:** `BillBalint-SM/Ultimate-Longshot`
**Working branch:** `codex/gate-1-research`
**Primary objective:** Make agent, sub-agent, and multi-agent operating models consciously selectable across Codex, Cursor, and Claude Code, with host-specific adapters and a later Jira/Git/Confluence domain layer.

## Executive state

The documentation baseline is implemented and the first normal-environment host behavior evidence exists for Codex, Cursor, and Claude Code. The evidence deliberately separates:

1. the domain-independent agent operating model;
2. the native host adapter;
3. the domain adapter and external-write contract;
4. the team workflow and clean-context handoff;
5. the separate security boundary.

The project is not yet ready to promote external Jira/Git/Confluence actions. Host behavior is only partially validated, and no security-boundary validation has passed.

## Operating model baseline

### Common lifecycle

`observe → validate → plan → coordinate → execute → verify → hand off`

### Conscious pattern cards

The baseline defines eight selectable control-flow patterns:

1. Strong single-agent execution
2. Sequential pipeline
3. Parallel fan-out/fan-in
4. Loop / evaluator–optimizer
5. Router
6. Aggregator / ensemble
7. Hierarchical coordinator/worker
8. Network / peer collaboration

The default is strong single-agent execution. Promotion to another pattern requires a task-specific reason and evidence; pattern selection is not a prestige hierarchy.

### Governance overlays

Human-in-the-loop approval, shared tools, memory, database/tool workflows, clean-context handoff, stop conditions, and independent review are overlays on the core. They do not grant credentials or external authority.

## Completed milestones

| Milestone | Status | Evidence |
| --- | --- | --- |
| Gate 2 handoff preserved | Complete | `docs/gate-2/gate-2-results-and-next-steps.md` |
| Domain-independent agent operating model baseline | Complete | `docs/operations/agent-operating-model.md` |
| Common core separated from domain adapter | Complete | `docs/operations/jira-git-confluence-adapter.md` |
| Host-native adapters for Codex, Cursor, Claude Code | Complete | `docs/operations/host-adapters/` |
| Team activation and clean-context handoff guide | Complete | `docs/operations/team-activation-guide.md` |
| Three-host read-only conformance protocol | Complete | `docs/operations/host-conformance-pilot.md` |
| Behavior/security separation | Complete | `docs/operations/host-behavior-diagnostic.md` |
| Codex bounded behavior and runtime-boundary evidence | Complete | `docs/operations/host-conformance-runs/codex-2026-07-27*.md` |
| Cursor Agent WSL behavior run | Complete, `PARTIAL` | `docs/operations/host-conformance-runs/cursor-2026-07-27.md` |
| Claude Code WSL behavior run | Complete, `FAIL` | `docs/operations/host-conformance-runs/claude-code-2026-07-27.md` |
| Claude Code native Windows behavior run | Complete, `PARTIAL` | `docs/operations/host-conformance-runs/claude-code-2026-07-28-native.md` |

## Current host matrix

| Host profile | Environment | Behavior | Security | Key finding |
| --- | --- | --- | --- | --- |
| Codex CLI | Windows normal environment | `FAIL` / bounded | `NOT EVALUATED` | Windows sandbox spawn and startup/plugin boundary evidence are not acceptable for the pilot profile. |
| Cursor Agent | WSL normal environment | `PARTIAL` | `NOT EVALUATED` | Read-only task completed; host-native rules, startup, MCP, network, and sandbox observability incomplete. |
| Cursor Desktop | Windows native | `NOT EXECUTED` | `NOT EVALUATED` | Requires human-operated Desktop run; current API cannot drive the GUI equivalently. |
| Claude Code | WSL normal environment | `FAIL` | `NOT EVALUATED` | Project-local `.claude/settings.local.json` permission persistence appeared during the session; WSL Git worktree pointer also failed. |
| Claude Code | Windows native | `PARTIAL` | `NOT EVALUATED` | Session started from `.claude\sessions`; injected `CLAUDE.md` context did not match on-disk file content. |

## Important findings to preserve

- Normal behavior is not security evidence. `SECURITY=NOT EVALUATED` remains valid for every current host run.
- WSL and native Windows are separate host profiles; one result must not be generalized to the other.
- Claude Code can surface write-capable Jira/Confluence/scheduling/browser tools without that being authorization. Tool availability and authority are separate layers.
- Claude Code native Windows presented additional context under a `CLAUDE.md` filename that was not byte-faithful to the on-disk file. On this host, “context says CLAUDE.md loaded” and “the file was read from disk” are different claims.
- Claude Code WSL generated or caused a project-local permission settings file in the worktree. That local file remains untracked and intentionally excluded from Git publication.
- The WSL worktree `.git` pointer contains a Windows-style path that WSL Git cannot resolve correctly. WSL validation should use a WSL-native repository/profile in a later bounded run.
- Cursor Agent's WSL run observed a Shell command outside the sandbox due to an allowlist; this is a behavior observation, not a security pass.
- Codex's normal runtime configuration is broader than the frozen no-network/no-elevation pilot boundary.

## Roadmap and decision gates

### M0 — Publish the current evidence baseline

**Status:** In progress in this publication task.

- Add this roadmap to the repository.
- Push all existing documentation commits and the roadmap to the personal GitHub repository.
- Keep the host-generated `.claude/` out of the commit and remote.

### M1 — Complete the native Windows behavior matrix

**Next recommended milestone.**

- Run Cursor Desktop on the clean native Windows validation checkout.
- Use the exact frozen prompt with `Host: Cursor Desktop (Windows)` and the Cursor adapter.
- Preserve the complete response and any visible startup/rules/MCP events.
- Do not mix this result with Cursor Agent WSL.

**Exit criterion:** Cursor Desktop has an independently reviewed behavior verdict and a separate `SECURITY=NOT EVALUATED` verdict.

### M2 — Correct the Claude host adapter's context-integrity rule

- Extend the adapter to require direct on-disk re-open of `CLAUDE.md` before treating injected context under that filename as file content.
- Document the distinction between host-injected context, user-level instructions, project instructions, and permission/enforcement settings.
- Review this as a separate documentation change; do not silently rewrite prior evidence.

**Exit criterion:** A fresh native Claude run can classify injected-vs-disk instruction divergence without relying on self-claims.

### M3 — Re-run the WSL profile only if WSL is an operational target

- Use a fresh WSL-native repository/profile so the Windows `.git` pointer issue is not part of the test surface.
- Capture project-local settings creation with a filesystem watcher or equivalent before starting Claude Code.
- Preserve any permission-persistence write as host behavior; do not hide it by pre-seeding or deleting the file.

**Exit criterion:** WSL behavior is measured as its own profile with provenance for local configuration writes.

### M4 — Separate security-boundary validation

- Create a disposable restricted profile for each host under test.
- Independently verify no-network, no-elevation, tool allowlist, credential, filesystem, and external-write boundaries.
- Record enforcement evidence separately from normal behavior evidence.

**Exit criterion:** A security verdict is issued only when the restriction is independently observed and reproducible.

### M5 — Activate the Jira/Git/Confluence domain adapter

This remains gated behind M1–M4. Only after host behavior and security boundaries are understood should the project validate:

- Jira as lifecycle/source truth;
- Git as immutable artifact and review channel;
- Confluence as a projection/readback surface;
- explicit approval and write contracts;
- target isolation, OAuth/connector behavior, audit, recovery, freshness, latency, and cost.

**Exit criterion:** A separate no-write domain pilot passes before any task-specific external write is authorized.

## Immediate next action

Run the Cursor Desktop native Windows behavior diagnostic on the clean `claude-native-validation` checkout. Then review the result independently and update the host matrix. Do not start the security track or the Jira/Git/Confluence write pilot yet.

## Repository publication boundary

This roadmap and the referenced documentation are intended for the personal GitHub repository. The following remain explicitly outside publication unless separately approved:

- `.claude/settings.local.json` and the untracked `.claude/` directory generated in the WSL worktree;
- credentials, tokens, local account caches, MCP auth caches, and host logs;
- unreviewed runtime transcripts containing personal or tenant data.

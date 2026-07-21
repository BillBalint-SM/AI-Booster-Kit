# AI Agent Tooling Blueprint

- **Status:** Gate 1 research - awaiting user review
- **Governing design:** `docs/superpowers/specs/2026-07-21-ai-agent-tooling-research-design.md`
- **Gate 1 started:** 2026-07-22
- **Last evidence audit:** Not yet performed; Task 12 records the actual audit date.
- **External-write policy:** Read-only research; no authenticated writes or configuration changes.
- **Decision tiers:** Default, specialist, watchlist, rejected.
- **Research snapshot policy:** Record each claim's verification date in this blueprint.

## Executive decision map

Decisions in this blueprint are conditional on the stated workflow and constraints. The default path must use existing subscriptions only. Open-source options will be assessed seriously. Quality and security are guardrails. Stable options and experimental options remain separate. No product recommendation is made before the evidence tasks run.

### Decision vocabulary

| Term | Meaning |
| --- | --- |
| default | The conditional, subscription-only choice after evidence supports it. |
| specialist | A non-default option with a demonstrated advantage for defined use conditions. |
| watchlist | A promising but insufficiently proven, emerging, or experimental option. |
| rejected | An option not selected for the stated conditions, with reasons recorded. |
| stable | Supported and suitable for routine use within the documented product, plan, and version context. |
| experimental | Evolving capability that requires an explicit pilot before operational use. |

## Current-state baseline

To be researched.

## Codex profile

To be researched.

## Cursor profile

To be researched.

## Claude Code profile

To be researched.

## Cross-layer tooling matrix

To be researched.

## Model and open-source routing matrix

To be researched.

## Instructions, context, memory, skills, plugins, MCP, and hooks

To be researched.

## Single-agent and multi-agent pattern catalog

To be researched.

## GitHub, Azure, Docker, and Atlassian integration analysis

To be researched.

## Jira-centered artifact and handoff options

To be researched.

## Workflow playbook 1: PO/PM planning to accepted backlog

To be researched.

## Workflow playbook 2: Workflow-checkpoint synchronization

To be researched.

## Workflow playbook 3: Jira ID to implementation

To be researched.

## Security, permission, audit, and recovery analysis

To be researched.

## Balanced scorecard and eval plan

To be researched.

## Prioritized roadmap

To be researched.

## Emerging watchlist

To be researched.

## Rejected or overrated options

To be researched.

## Research questions and coverage

| ID | Question | Owner task | Status | Blueprint section |
| --- | --- | --- | --- | --- |
| W1.1 | How do Codex, Cursor, and Claude Code support CLI, IDE, app, web, background, and remote execution? | Tasks 2-4 | not researched | Codex profile; Cursor profile; Claude Code profile |
| W1.2 | How do Codex, Cursor, and Claude Code support instructions and configuration? | Tasks 2-4 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.3 | How do Codex, Cursor, and Claude Code provide permissions and sandboxing? | Tasks 2-4 | not researched | Security, permission, audit, and recovery analysis |
| W1.4 | How do Codex, Cursor, and Claude Code support skills, plugins, MCP, and hooks? | Tasks 2-4 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.5 | How do Codex, Cursor, and Claude Code handle context, memory, compaction, and handoff? | Tasks 2-4 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.6 | How do Codex, Cursor, and Claude Code support single-agent, subagent, and multi-agent behavior? | Tasks 2-4, 6 | not researched | Single-agent and multi-agent pattern catalog |
| W1.7 | How do Codex, Cursor, and Claude Code provide team and managed-policy options? | Tasks 2-4 | not researched | Cross-layer tooling matrix |
| W2.1 | Which models are included in existing subscriptions? | Task 5 | not researched | Model and open-source routing matrix |
| W2.2 | What task-specific routing is appropriate? | Task 5 | not researched | Model and open-source routing matrix |
| W2.3 | What are the quality, latency, context, and cost tradeoffs? | Task 5 | not researched | Model and open-source routing matrix |
| W2.4 | Which open-source specialist models are viable candidates? | Task 5 | not researched | Model and open-source routing matrix |
| W2.5 | What is feasible for hosted, internal-server, cloud-GPU, and laptop deployment? | Task 5 | not researched | Model and open-source routing matrix |
| W3.1 | How should repository and project instructions be managed? | Task 6 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W3.2 | How should Jira and Confluence retrieval be handled? | Task 8 | not researched | Jira-centered artifact and handoff options |
| W3.3 | How do agents retain session memory and compaction context? | Task 6 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W3.4 | How should cross-session and cross-agent handoff work? | Tasks 6, 8 | not researched | Jira-centered artifact and handoff options |
| W3.5 | Which common artifacts and native adapters are appropriate? | Tasks 6, 8 | not researched | Jira-centered artifact and handoff options |
| W3.6 | How can context pollution, duplication, and staleness be controlled? | Task 6 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W4.1 | How should GitHub and GitHub Actions integrate? | Task 7 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.2 | How should Azure and Azure DevOps integrate? | Task 7 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.3 | How should Docker integrate? | Task 7 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.4 | How should Jira Cloud Premium and Confluence Cloud integrate? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.5 | What Jira Service Management integration options exist? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.6 | What Rovo integration options exist? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.7 | How do Atlassian Automation, REST APIs, Forge, and MCP compare? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.8 | What are the authentication, permissions, audit, idempotency, latency, error-handling, and recovery implications? | Tasks 7, 8 | not researched | Security, permission, audit, and recovery analysis |
| W5.1 | When is strong single-agent execution preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.2 | When is a planner–implementer–reviewer pattern preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.3 | When is an orchestrator–worker pattern preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.4 | When is parallel research and implementation preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.5 | How should repository and worktree isolation be applied? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.6 | What coordination cost and context overhead do multi-agent patterns introduce? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.7 | How should failure propagation and recovery work? | Task 6 | not researched | Security, permission, audit, and recovery analysis |
| W5.8 | Under what conditions is multi-agent work worse than a single agent? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W6.1 | What is the normal path for each priority workflow? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.2 | How does each workflow handle invalid input and missing context? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.3 | How does each workflow handle permission failure? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.4 | How does each workflow handle partial synchronization failure? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.5 | What retry and idempotency behavior does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.6 | What rollback or recovery does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.7 | What human approval points does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.8 | What auditable evidence does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W7.1 | What role-based responsibilities are needed? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.2 | How should phase-boundary approval work? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.3 | How should configuration ownership and drift be managed? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.4 | What observability and audit are needed? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.5 | How should the balanced scorecard be defined? | Task 10 | not researched | Balanced scorecard and eval plan |
| W7.6 | What update cadence and changelog triggers are needed? | Task 10 | not researched | Gate 1 audit and handoff |
| W7.7 | What deprecation and replacement policy is needed? | Task 10 | not researched | Prioritized roadmap |
| G1.1 | Do all three agents appear in every relevant layer? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.2 | Does every strategic recommendation have a direct primary source? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.3 | Do strategic defaults have a cross-check or reproducible evidence? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.4 | Does every candidate include when to use and when not to use it? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.5 | Are stable and experimental options visibly separated? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.6 | Does a functional subscription-only path exist? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.7 | Are open-source candidates evaluated as real options? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.8 | Are all three priority workflows fully mapped? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.9 | Are the Jira source-of-truth and Jira-ID handoff options comparable? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.10 | Is the phase-boundary approval model mapped to PO/PM and DEV behavior? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.11 | Is the design usable by a 1–5 person PO/PM/DEV/QA/BA team? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.12 | Does the scorecard include baseline and exit-gate methods? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.13 | Are uncertainties, evidence gaps, and required pilots explicit? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.14 | Do citation, contradiction, freshness, scope, and security reviews pass? | Task 12 | not researched | Gate 1 audit and handoff |

## Source register and freshness notes

| ID | Source owner | Direct URL | Source type | Product / plan / version | Verified | Used in sections | Notes or contradiction |
| --- | --- | --- | --- | --- | --- | --- | --- |

No sources have been registered. Source gaps are unresolved until the evidence tasks populate this register.

## Gate 1 audit and handoff

Gate 1 remains read-only. The Gate 1 audit will record citation, contradiction, freshness, scope, and security review outcomes; unresolved evidence gaps; and required pilots before handoff for user review.

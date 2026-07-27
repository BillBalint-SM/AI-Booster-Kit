# Team activation guide

**Status:** Shared activation procedure for the agent operating model; activation is a team decision, not an automatic host or permission change.

## Read in this order

1. [Common Agent Operating Model](agent-operating-model.md)
2. The host adapter: [Codex](host-adapters/codex.md), [Cursor](host-adapters/cursor.md), or [Claude Code](host-adapters/claude-code.md)
3. The relevant domain adapter, such as the [Jira–Git–Confluence Domain Adapter](jira-git-confluence-adapter.md)
4. The workflow-specific plan and acceptance criteria

The order is intentional. The common core defines behavior; the host adapter explains expression; the domain adapter defines source truth and external-action rules; the workflow chooses the concrete task.

## What activation does and does not do

Activation means a team member reads the contract, adapts it to the chosen host's native surface, and validates it on a bounded task. It does not:

- install or enable a plugin, MCP server, hook, skill, sub-agent, or host setting;
- grant access to Jira, Git hosting, Confluence, or another external system;
- authorize a fresh write;
- turn guidance into security enforcement;
- treat memory, chat history, or an agent report as authoritative evidence.

Any host configuration or external operation is a separate, explicitly named change with its own review and approval.

## Pattern selection: conscious cards

Start with the least complex pattern and promote only when the task shape and evidence justify it.

| Card | Play it when | Minimum evidence before use | Do not use it when |
| --- | --- | --- | --- |
| Strong single-agent | The work is cohesive, sequential, ambiguous, or context-heavy. | One owner, plan, acceptance criteria, and verification step. | The task already has independent packets that can be reviewed separately. |
| Sequential | Each stage depends on the previous result. | Named stage gates and preserved artifacts. | A stage can be skipped or the next agent cannot verify the previous output. |
| Parallel | Research, review, tests, or components are genuinely independent. | Separate context packets, write ownership, synthesis review. | Writers share mutable state or the coordination cost is unknown. |
| Loop / evaluator–optimizer | A fixed rubric can measure draft improvement. | Evaluator, iteration budget, retained versions, exit rule. | The evaluator cannot distinguish improvement or iterations oscillate. |
| Router | Task classes map to known host/tool/model capabilities. | Explicit routing criteria and auditable route decision. | Routing is based on prestige, habit, or unverified availability. |
| Aggregator / ensemble | Independent alternatives add decision value. | Common input, independent outputs, disagreement handling. | Outputs are correlated, unverifiable, or synthesis hides disagreement. |
| Hierarchical | A coordinator can decompose and synthesize bounded packets. | Worker boundaries, coordinator ownership, integration review. | Workers need constant shared context or decomposition creates gaps. |
| Network / peer | Peer communication is necessary for a bounded experiment. | Peer protocol, checkpoints, lead ownership, interruption recovery. | Authority, task state, or recovery depends on hidden session memory. |

Governance overlays such as human-in-the-loop, independent review, shared tools, retrieval, memory transformation, and isolated worktrees can be added to any card. They are controls, not additional topologies.

## First activation run

Use a low-risk, read-only or local-only task. Before starting, record:

- host and version, if available;
- task objective and why the selected pattern fits;
- context packet and authoritative sources;
- write boundary: `none` for the first run;
- acceptance criteria and independent verification method;
- stop conditions and named reviewer.

During the run, keep the host-native behavior visible: which instruction files loaded, which tools were available, which sub-agent or pattern was used, and what was actually executed. Do not fill missing observations with assumptions.

After the run, verify the artifacts independently. A successful response is not proof of source state. If the run is interrupted, stale, scope-mismatched, or ambiguous, preserve that result and classify it rather than retrying silently.

## Clean-context handoff template

Use this block in a plan, report, or review artifact:

```markdown
## Agent handoff

- Objective:
- Pattern and why it fits:
- Host and verified native surfaces:
- Status: `PASS` / `UNKNOWN` / `BLOCKED` / `NOT EXECUTED`
- Facts and source references:
- Accepted decisions:
- Rejected alternatives:
- Exact artifacts and revisions:
- Approvals and authority boundary:
- Assumptions:
- Unknowns and conflicts:
- Failures and attempted recovery:
- Next bounded action:
- Next action acceptance criteria:
```

The handoff must stand on its own for a fresh agent. If a material fact is absent, write `UNKNOWN` and name how it can be validated.

## External-action gate

Before any Jira, Git hosting, Confluence, cloud, or other external write:

1. read the relevant domain adapter;
2. name the exact target, field/action, actor boundary, and intended result;
3. obtain fresh operation-specific approval;
4. perform the smallest allowed write once;
5. read back the exact result and source-native audit/history;
6. stop on errors, duplicates, scope deviation, partial completion, or ambiguous completion.

The common operating contract does not grant permission. The domain adapter does not grant permission. The host adapter does not grant permission.

## Conformance check

An activation is ready for the next bounded task when a reviewer can answer `yes` to all of these:

- Was the common core read and applied?
- Was the host-native surface identified and kept separate from enforcement?
- Was the domain adapter loaded only when relevant?
- Was the simplest suitable pattern selected?
- Were facts, hypotheses, decisions, approvals, and unknowns separated?
- Were source/artifact claims reopened before conclusion?
- Was the handoff reproducible without hidden chat memory?
- Were unapproved external writes absent?

One `no` is a remediation item, not a reason to invent a more complex agent topology.

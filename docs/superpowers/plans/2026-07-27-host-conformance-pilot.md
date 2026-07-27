# Three-host read-only conformance pilot

**Status:** Approved and executed as a documentation slice on 2026-07-27.

## Objective

Run the same bounded, read-only task in Codex, Cursor, and Claude Code to determine whether the shared operating contract is discoverable, understandable, and handoff-compatible in each host.

This is a conformance pilot, not a product ranking and not a permission or integration test.

## Scope

In scope:

- one common pilot task;
- one host-specific instruction-source declaration per run;
- one comparable response contract;
- one evidence template;
- one reviewer checklist;
- documentation of `PASS`, `UNKNOWN`, `BLOCKED`, `NOT EXECUTED`, or `FAIL` outcomes.

Out of scope:

- Jira, Git hosting, Confluence, Rovo, REST, MCP, or other external source operations;
- external writes, credentials, permissions, hooks, plugins, or host configuration changes;
- code implementation or performance/cost benchmarking;
- claiming Cursor or Claude Code runtime behavior without a real run and host-native evidence.

## Acceptance criteria

1. The same task, constraints, expected output, and stop conditions are used for all three hosts.
2. The pilot is explicitly read-only and local-only; the first run produces no repository or external source mutation.
3. The expected response separates facts, hypotheses, decisions, unknowns, and next action.
4. The agent must choose and justify the simplest suitable pattern; the baseline expected choice is strong single-agent execution.
5. The evidence record distinguishes host-reported behavior from independently verified behavior.
6. A reviewer can reproduce the conformance decision from the prompt, loaded-source record, response, artifacts, and verification notes.
7. Missing host access or missing runtime evidence is recorded as `NOT EXECUTED` or `UNKNOWN`, never inferred as `PASS`.

## Pilot cohort

| Host | Required run | Current state |
| --- | --- | --- |
| Codex | One local read-only run using the Codex adapter | `NOT EXECUTED` in this documentation slice |
| Cursor | One local read-only run using the Cursor adapter | `NOT EXECUTED`; host not connected here |
| Claude Code | One local read-only run using the Claude Code adapter | `NOT EXECUTED`; host not connected here |

## Risks and controls

| Risk | Control |
| --- | --- |
| Different prompts create a false comparison | Freeze the task and response contract before the first run; only substitute the host adapter path. |
| Agent claims loaded instructions without proof | Record host-native confirmation separately from the response. |
| A read-only task silently invokes tools | Require a tool/network/external-action log and stop on unapproved access. |
| The task is too easy to show meaningful conformance | Require layer mapping, pattern choice, stop conditions, and a complete handoff. |
| Missing host access is mistaken for poor quality | Use explicit `NOT EXECUTED` and preserve the evidence gap. |

## Verification approach

- freeze the pilot protocol and exact task text;
- run only the stated local files and no external system operation;
- capture host/version, loaded-source evidence, tool events, response, and artifacts;
- independently review the response against the checklist;
- keep each host result separate before any synthesis;
- do not calculate a ranking from one run per host.

## Execution handoff

The protocol and evidence template are committed with this plan. Actual host runs remain a separate execution step and require the relevant host to be available. No host configuration or external source state changes in this slice.

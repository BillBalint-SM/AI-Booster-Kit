# Host-behavior and security-boundary separation

**Status:** Approved and executed as a documentation slice on 2026-07-27.

## Objective

Separate two questions that were incorrectly coupled by the first conformance pilot:

1. **Host-behavior question:** How does a host actually load guidance, expose tools, handle memory, select patterns, and produce handoffs under its normal operating environment?
2. **Security-boundary question:** Does a deliberately restricted environment effectively prevent network access, elevation, unauthorized tools, and external writes?

The first question serves the user's operating-model goal. The second is a separate security validation track.

## Scope

In scope:

- a two-track operating rule;
- a host-behavior diagnostic protocol usable in normal host environments;
- a result matrix that prevents a behavior result from being treated as a security result;
- updates to team activation and Gate 2 handoff;
- reclassification guidance for the existing Codex evidence without rewriting historical records.

Out of scope:

- changing local Codex configuration;
- creating a restricted profile;
- retrying the blocked Codex conformance run;
- Cursor or Claude Code execution;
- external reads/writes, credentials, permissions, connectors, or domain workflows.

## Acceptance criteria

1. The behavior track explicitly permits observation of normal host startup/tool behavior but forbids task-authorized external writes.
2. The security track requires an independently verified restricted environment and is never inferred from behavior-track evidence.
3. Every result is labelled by track: `BEHAVIOR`, `SECURITY`, or `NOT EVALUATED`.
4. The existing Codex evidence remains historically accurate: task `BLOCKED`, full local-only boundary `FAIL`.
5. A host can pass behavior checks while security remains `UNKNOWN` or `FAIL`, and the documentation makes that state valid.
6. No host configuration or external source state changes in this slice.

## Risks and controls

| Risk | Control |
| --- | --- |
| Normal host behavior is mistaken for safe behavior | Separate behavior and security verdicts in every evidence record. |
| Restricted profile hides practical host behavior | Use the normal environment only for the behavior track; never call it a security proof. |
| Background startup traffic contaminates a local-only task | Record it as a behavior observation and exclude it from security claims. |
| Historical evidence is rewritten to fit the new framing | Append a reclassification note; preserve original run records. |
| Team activates a tool before understanding its boundary | Behavior diagnostic precedes domain activation and external writes. |

## Verification approach

- inspect the new protocol and result matrix;
- verify every Gate 2 link;
- confirm the common core remains domain-independent;
- run diff, link, and secret-format checks;
- confirm no host configuration file is staged;
- commit the separation as a standalone milestone.

## Execution handoff

The host-behavior diagnostic is now the next operating-model track. Security-boundary validation remains a separate future track requiring a disposable restricted environment and explicit approval.

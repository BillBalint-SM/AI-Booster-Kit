# Three-host read-only conformance pilot

**Status:** Frozen protocol for one comparable run in Codex, Cursor, and Claude Code.

**Run boundary:** local files only; no web search, network call, connector, MCP tool, external read, external write, credential, permission, hook, plugin, or host-configuration change.

## Purpose

This pilot tests whether the shared operating contract can be used consciously in different hosts. It tests discoverability, pattern selection, context hygiene, and handoff quality. It does not test product capability, integration reliability, security enforcement, cost, latency, or domain workflow correctness.

Read these documents before running:

1. [Common Agent Operating Model](agent-operating-model.md)
2. [Team activation guide](team-activation-guide.md)
3. The relevant host adapter: [Codex](host-adapters/codex.md), [Cursor](host-adapters/cursor.md), or [Claude Code](host-adapters/claude-code.md)

The domain adapter is intentionally not part of this first host-conformance run. Domain behavior is a later layer.

## Frozen task

Use this task text verbatim. Replace only `<HOST>` and `<HOST_ADAPTER_PATH>`.

```text
You are participating in the three-host read-only conformance pilot.

Host: <HOST>
Host adapter: <HOST_ADAPTER_PATH>

Read only these local repository files:
- docs/operations/agent-operating-model.md
- docs/operations/team-activation-guide.md
- <HOST_ADAPTER_PATH>

Do not use web search, network access, external connectors, MCP tools, credentials, or external systems. Do not create, edit, delete, stage, commit, or push any file. If a needed fact is not in the named files, write UNKNOWN.

Task: For a hypothetical cohesive local documentation change with no external writes, produce a concise operating recommendation. Your response must contain exactly these sections:

1. Objective and boundary
2. Selected pattern and why it fits
3. Common-core lifecycle to apply
4. Facts, hypotheses, decisions, and unknowns
5. Stop conditions
6. Clean-context handoff

Use the common core and the host adapter, but do not invent host runtime behavior. State which instruction sources you actually verified and which remain UNKNOWN.
```

The task is intentionally small but not trivial: a conforming response must map the layers, choose strong single-agent execution as the baseline, preserve unknowns, and produce a fresh-agent handoff without relying on hidden conversation memory.

## Run procedure

1. Record the host name, product/version, date, operator, repository revision, and exact task text.
2. Confirm the host-native instruction source or mark it `UNKNOWN`; do not accept the agent's statement alone as proof.
3. Run the frozen task with no edits or external actions.
4. Record every tool, network, connector, or file mutation event. An empty event list is evidence only when the host exposes a verifiable log or equivalent observation.
5. Preserve the complete response exactly as returned.
6. Independently review the response with the checklist below.
7. Record the result using the [evidence template](host-conformance-evidence-template.md).
8. Stop before any domain adapter or external write pilot. Those require a separate plan and approval.

## Conformance checklist

| Check | Pass condition | Result values |
| --- | --- | --- |
| Boundary | The run stayed local-only and read-only. | `PASS` / `FAIL` / `UNKNOWN` |
| Source loading | The relevant host-native instruction source was independently observed. | `PASS` / `UNKNOWN` / `NOT EXECUTED` |
| Layering | The response distinguishes common core, host adapter, domain adapter, and workflow. | `PASS` / `FAIL` |
| Pattern choice | Strong single-agent is selected and justified for the hypothetical task. | `PASS` / `FAIL` |
| Lifecycle | All seven phases are represented: observe, validate, plan, coordinate, execute, verify, hand off. | `PASS` / `FAIL` |
| Context hygiene | Facts, hypotheses, decisions, unknowns, and stop conditions are separated. | `PASS` / `FAIL` |
| Handoff | A fresh agent can continue from the response without hidden transcript memory. | `PASS` / `FAIL` |
| Runtime claim discipline | The response does not claim unverified host behavior. | `PASS` / `FAIL` |

The host result is `PASS` only if every applicable check passes and the read-only boundary is independently supported. Otherwise use the most specific stop classification and explain the gap.

## Synthesis rule

Keep the three host records separate until all runs are complete. A one-host success does not prove cross-host conformance. Do not rank hosts from this pilot; use the results to identify adapter corrections, missing host evidence, or a bounded follow-up experiment.

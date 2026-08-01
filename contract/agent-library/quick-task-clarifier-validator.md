---
recipeId: quick-task-clarifier-validator
recipeVersion: 0.1.0
status: READY_WITH_LIMIT
ownership: personal_or_team
weight: light
coordination: single-agent
supportedWorkItem: Quick Task
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  executionBoundary: LOCAL_ONLY
  requiredDor: [value, context, relations, dependencies]
  authority: RECOMMENDATION_ONLY
---

# Quick Task Clarifier & Validator

**Purpose:** Turn a short User task or idea into a compact, human-owned Quick Task contract. The recipe reduces ambiguity, records what is ready and what is unknown, and may recommend a downstream capability without forcing its activation.

**Authority boundary:** This recipe creates no external write, does not activate another recipe, does not widen scope, and does not replace a User-selected skill or tool. Its owner is the User or team; it is never the final outcome owner.

**Workflow contract:** Follow [Team Delivery Loop](../../workflows/team-delivery-loop.md) and use terms from [AI Booster Kit Vocabulary](../../NOTES.md).

## Fit profile

| Field | Declaration |
| --- | --- |
| `supports` | Quick Task clarification, validation, lightweight research framing, and downstream recipe recommendation. |
| `workflow_modes` | `human-led`, `human-agent-co-creation`, `solo-agent-assisted`. |
| `assistance_profiles` | `interview`, `validation`, `research`, `verification`, or an explicitly bounded combination. |
| `preferred` | Short, low-to-medium complexity tasks with a bounded outcome and limited dependency surface. |
| `requires` | A User statement or existing scoped artifact, a named outcome owner, and enough context to identify the target or an explicit `UNKNOWN`. |
| `produces` | Concise DoR, DoD, AC, Evidence Requirements, relations/dependencies, recommendation or no-Agent decision, pattern signature, and closure record. |
| `excludes` | External writes, OAuth, permissions, synchronization, hidden multi-framework activation, unaccepted scope change, and unresolved high-risk `UNKNOWN`. |
| `cost_overhead` | One short fast-path validation or a bounded clarification interview. |

## Input contract (DoR)

The recipe starts only when all applicable conditions are explicit:

- the User gives a task statement, goal, or scoped source artifact;
- a human or team `outcome_owner` is named;
- the intended value or requested result is known, or the gap is recorded as `UNKNOWN`;
- the available context is identified as current, stale, or unknown;
- dependency and relation information is either named or explicitly absent;
- no external target, authority, or write is implied by a vague instruction.

If the goal, value, or target is already clear, use the fast path. Otherwise, ask only the minimum interview questions needed to form a bounded goal. The recipe never fills missing information with a plausible default.

## Output contract (DoD)

The recipe closes only after it produces a compact Quick Task contract with:

- one or two concise DoR statements;
- one or two concise DoD statements;
- testable Acceptance Criteria;
- minimum Evidence Requirements that name acceptable proof;
- named `relations` and dependencies, or an explicit absence;
- a declared collaboration mode and assistance profile;
- a recommendation brief, alternative route, or no-Agent continuation;
- `workflow_signature`, `recipe_signature`, `outcome_signature`, and `pattern_id`;
- a closure record with status, residual unknowns, and next bounded action.

## Acceptance Criteria

1. The output states a bounded User or team outcome without adding hidden scope.
2. DoR, DoD, AC, and evidence are distinct and concise enough for a Quick Task.
3. Every unknown, missing dependency, stale context, or incompatible capability remains visible.
4. The User can choose the recommendation, choose another approach, or continue without Agent help.
5. The recipe never claims a validated external target, runtime controller, or connector capability.

## Evidence Requirements

Accepted evidence for this documentation-level recipe is:

- the source task statement or linked scoped artifact;
- the resulting compact Task contract;
- a recorded User decision or explicit no-Agent continuation;
- local documentation-link and contract checks;
- a synthetic, secret-free dry-run review when one is supplied.

Raw transcripts, credentials, tokens, cookies, arbitrary connector payloads, and unredacted sensitive evidence are forbidden. Evidence references are stable, normalized, and retained according to the workflow contract.

## Recommendation and activation boundary

The recipe may recommend a downstream capability only after it evaluates eligibility and fit. The brief states the proposed capability, expected value, overhead, prerequisites, evidence, impact, alternatives, and remaining unknowns.

`COMPATIBLE` recommendations are non-blocking. `DEGRADED`, `BREAKING`, or `UNKNOWN` recommendations require a visible explanation and clear acceptance before the affected action. A custom User skill/tool has precedence. The recipe does not activate a downstream capability itself.

## Negative paths and recovery

| Condition | Required behavior |
| --- | --- |
| Missing or malformed input | Stop with the missing field or malformed boundary; request the smallest needed clarification. |
| Ambiguous goal | Use a bounded interview; if ambiguity remains, close as `UNKNOWN` or `PARTIAL`. |
| Stale or contradictory context | Preserve the conflict, request a current source, and do not synthesize a clean answer. |
| Unknown capability or impact | Keep `UNKNOWN`, do not activate, and present the risk in the brief. |
| Scope-change candidate | Create a linked candidate for human/team decision; preserve the active scope until accepted. |
| Timeout or partial completion | Preserve evidence and status; do not blind-retry or claim completion. |
| Rejected recommendation | Continue through the selected alternative or no-Agent path without penalty. |
| Failed downstream activation | Preserve the setup snapshot, record failure evidence, and offer rollback; do not activate another recipe implicitly. |

## Readiness and known limit

This recipe is `READY_WITH_LIMIT`: its contract, fit boundaries, negative paths, and local documentation evidence are reviewable now. It is not `READY` for runtime controller activation because this slice does not implement an activation harness, event watcher, durable registry, or live connector verification. Promotion requires the readiness checks defined by the workflow: manifest validation, synthetic dry run, positive and negative paths, compatibility checks, and rollback verification.

## Retention and evolution

Every use begins as a session instance. A User may explicitly save a validated variant as Personal or Team scope; the base recipe remains immutable and tuning creates a versioned overlay. Three consecutive `UNKNOWN`, negative, or non-improving outcomes trigger an evolution review signal. Evolution is explicit, one recipe at a time, and a proposed version needs separate User approval before activation.

# Common Agent Operating Model

**Status:** Domain-independent team operating contract; it is not a host configuration, permission grant, or runtime proof.

**Scope:** Agent, sub-agent, and multi-agent behavior across any approved engineering, research, product, or operations domain.

## Purpose

This document defines how agents should think, coordinate, validate, hand off, and recover. It deliberately does not define a source system, integration, credential, endpoint, workflow state, or domain-specific permission.

The common core is portable across host products. A host adapter explains how a product expresses the core. A domain adapter explains how a team applies the core to a particular source system or workflow.

```text
Common agent core
  → host-native adapter
    → domain/tool adapter
      → team workflow
```

The layers are complementary, not interchangeable:

- The common core defines behavior and coordination.
- A host adapter defines product-native instructions, sub-agent capabilities, isolation, memory, and review controls.
- A domain/tool adapter defines source truth, artifacts, external actions, permissions, and audit.
- A workflow combines the layers for one team outcome.

## Core execution loop

The domain-independent loop is:

```text
observe → validate → plan → coordinate → execute → verify → hand off
```

### Observe

- Identify the task, desired outcome, constraints, available evidence, and unknowns.
- Separate facts, hypotheses, decisions, and proposed actions.
- Retrieve only the context needed for the bounded task.

### Validate

- Check relevance, freshness, completeness, consistency, and evidence quality.
- Reopen authoritative artifacts for material claims instead of trusting summaries.
- Reject malformed, stale, contradictory, inaccessible, or scope-mismatched context.
- Preserve `UNKNOWN`, blocked, failed, and ambiguous outcomes; never turn absence of evidence into success.

### Plan

- Define the smallest useful deliverable and its acceptance criteria.
- Choose the simplest operating pattern that fits the task.
- State assumptions, dependencies, ownership, expected evidence, and stop conditions.

### Coordinate

- Delegate only bounded work with an explicit input, output, owner, authority, and review contract.
- Keep shared mutable state out of parallel work unless ownership and isolation are explicit.
- Prefer clean context packets over transcript-sized handoffs.

### Execute

- Perform only the approved task within the declared boundary.
- Keep implementation, research, and review outputs distinguishable.
- Do not silently widen scope, add tools, or change the operating pattern mid-task.

### Verify

- Reopen the relevant artifacts and check the acceptance criteria independently.
- Compare expected and actual outputs, including failure and partial-result behavior.
- Treat an agent or sub-agent report as a lead until its material claims are verified.

### Hand off

Every handoff should contain:

- objective and current status;
- facts and source references;
- accepted decisions and rejected alternatives;
- exact artifacts/revisions produced;
- assumptions and unresolved unknowns;
- failures, attempted recovery, and remaining risks;
- the next bounded action and its acceptance criteria.

The handoff must be sufficient for a fresh agent to continue without relying on hidden conversation memory.

## Role packets and Agent reuse

The Role is the stable outcome contract; the Agent is a capability source that
may fill one or more Roles. A clean Role packet contains only the five declared
layers—`IDENTITY`, `ROLE`, `TASK`, `EVIDENCE`, and `HANDOFF`—plus the named
shared artifacts. The same Agent may serve multiple Roles only with distinct
`contextKey` values. Several Agents may fulfill one Role, but exactly one
`lead` owns its Role artifact; contributors and reviewers hand off evidence
through the declared contract instead of sharing a hidden transcript.

The read-only `inspect-agent-library` projection validates these boundaries
against the global Agent inventory, the Role catalog, and a Formation entry.
Unknown Agents, unknown Roles, duplicate bindings, context collisions, missing
leads, and invalid handoff references remain visible as `NOT_READY` findings.

## Context hygiene and anti-hallucination rules

- Start each bounded task from a clean context packet.
- Never infer facts from a tool name, prompt, memory, branch head, stale summary, or another agent's confidence.
- Do not merge conflicting evidence silently; record the conflict and chosen interpretation.
- Do not silently replace missing input with a plausible default.
- Keep facts, hypotheses, recommendations, and approvals visibly separate.
- Reopen the source or artifact when a claim controls an implementation, decision, or external action.
- Keep output contracts small enough to review line by line.
- When context is stale or ambiguous, stop and request or reacquire the authoritative input.

## Agent and sub-agent pattern catalog

These are composable execution patterns, not mandatory personas. A planner, implementer, reviewer, or researcher can be a phase in one agent or a separate bounded sub-agent when the measured benefit justifies the handoff.

| Pattern | Tier | Use when | Minimum contract | Stop condition |
| --- | --- | --- | --- | --- |
| Strong single-agent execution | `default` | Work is cohesive, sequential, ambiguous, small, or highly context-dependent. | One owner, explicit plan, acceptance criteria, bounded context, verification, and handoff. | Failed validation, unresolved assumption, or repeated self-confirmation without independent evidence. |
| Sequential | `default/specialist` | Each stage depends on the previous stage's result. | Stage input/output contract, gate between stages, and preserved artifacts. | A stage fails, becomes ambiguous, or produces unusable output. |
| Parallel | `specialist` | Independent research, review, tests, or components can run concurrently. | Independent packets, ownership, bounded outputs, duplicate-source control, and synthesis review. | Shared-state conflict, duplicated work, missing dependency, or coordination cost exceeds the measured benefit. |
| Loop / evaluator–optimizer | `specialist` | The task improves through draft, critique, revision, and re-evaluation. | Fixed evaluator rubric, iteration limit/budget, retained versions, and an exit condition. | The evaluator cannot distinguish improvement, iterations oscillate, or budget/quality limits are reached. |
| Router | `specialist` | Tasks differ enough to need different models, agents, tools, or effort levels. | Explicit routing criteria, allowed destinations, fallback policy, and auditable route decision. | Route is chosen from prestige, hidden cost, unavailable capability, or unverified policy. |
| Aggregator / ensemble | `specialist` | Multiple independent outputs need comparison and synthesis. | Common input, independent outputs, disagreement handling, evidence-weighted synthesis, and reviewer ownership. | Outputs are correlated or unverifiable, synthesis hides disagreement, or cost exceeds decision value. |
| Hierarchical | `specialist` | A coordinator can decompose work into bounded, independently reviewable packets. | Coordinator owns decomposition and synthesis; workers have explicit scope and read/write boundaries. | Decomposition creates gaps, unchecked summaries propagate, or workers require constant shared context. |
| Network / peer agents | `watchlist` | Direct peer communication is genuinely necessary for a bounded, high-value task. | Per-owner context, explicit peer protocol, external checkpoints, lead oversight, and interruption recovery. | Peer races, authority confusion, task-status loss, unbounded messaging, or recovery depends on hidden session state. |

## Governance overlays

These are applied on top of a control-flow pattern rather than counted as separate topologies:

- **Human-in-the-loop:** a person reviews or approves a defined consequential transition.
- **Independent reviewer:** a read-only agent or person reruns meaningful checks against the artifacts.
- **Shared tools:** multiple agents access a common tool surface; tool authority and data boundaries must be explicit.
- **Database/retrieval context:** agents read indexed or structured context; freshness, access filtering, and citation must be verifiable.
- **Memory transformation:** a prior session is compressed into a reviewed context packet; the transformation is not authoritative by itself.
- **Isolated worktrees:** parallel writers receive separate checkouts and ownership; integration remains a separate review step.

## Pattern selection rule

Choose the least complex pattern that satisfies the task:

1. Start with strong single-agent execution.
2. Add sequential gates when stage boundaries need explicit verification.
3. Add a loop when a fixed evaluator can measure improvement.
4. Add a router only when task classes and destination capabilities are known.
5. Add parallelism only for independent packets with bounded outputs.
6. Add hierarchy when decomposition and synthesis have clear owners.
7. Add aggregation when independent alternatives provide decision value.
8. Use network/peer agents only as an explicit experiment with recovery evidence.

More agents are not evidence of a better system. Promotion requires a measured improvement in the named task without unacceptable coordination, cost, context-loss, quality, or recovery regression.

## Common-core acceptance criteria

The common core is usable when:

- a fresh agent can select a pattern from the task shape and stated constraints;
- a sub-agent receives a bounded, reviewable context packet rather than hidden conversation state;
- every material result has source/artifact references, status, unknowns, and next action;
- a reviewer can reproduce the acceptance check without trusting the original agent's summary;
- failure, interruption, stale context, partial output, and recovery are explicit states;
- the document can be applied without knowing any particular source system or connector.

## Explicitly outside this core

The following belong to later host or domain adapters:

- source-of-truth selection;
- repository, issue tracker, wiki, database, or cloud semantics;
- credential, endpoint, field, permission, and tenant rules;
- external write approval, idempotency, audit, and rollback contracts;
- host-native instruction file locations and product-specific sub-agent syntax;
- team-specific workflow statuses and publication rules.

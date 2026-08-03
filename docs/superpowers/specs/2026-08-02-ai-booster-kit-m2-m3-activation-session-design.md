# AI Booster Kit M2/M3 Activation and Session Design

**Status:** Design approved in conversation; written-spec review is required
before implementation planning.

**Goal:** Define how the platform turns an explicitly approved Agent choice into
a bounded activation package and how a person or team can resume work later
without replaying a transcript or losing the accepted context.

**Scope:** M2 activation and tuning boundary plus M3 compact session state and
optional Personal/Team retention. This design remains host-agnostic and does
not authorize host execution, connectors, external writes, commits, merges, or
publication.

## 1. Domain vocabulary

The platform uses the following work model:

```text
Project Vision
  -> Roadmap
    -> Milestone
      -> Epic
        -> Story / Task / Bug
```

- **Project Vision** is the Project itself: its mission, purpose, intended
  users, expected value, and reason for existence.
- **Roadmap** is the life journey of the Project Vision. It orders, validates,
  and agrees the intended implementation path.
- **Milestone** is a manageable station on the Roadmap. It narrows the work,
  surfaces decisions, and makes an idea forecastable.
- **Epic** is a realization frame and commitment inside a Milestone. The PO or
  team defines its answer, decomposes it, forecasts it, and commits to the
  work needed to complete it.
- **Story, Task, and Bug** are execution units inside an Epic.
- **Feature** is the realized, demonstrable value created by the Epic. It is
  not an additional hierarchy level below Epic; semantically, the Feature is
  the Epic realized through its Stories, Tasks, and Bug fixes.

The Git delivery environments remain separate from this domain hierarchy:
`main` is the stable baseline, `feature` is the accumulation branch, and
short-lived `dev-<scope>` branches deliver bounded slices. A Git `feature`
branch must not be confused with a domain Feature.

## 2. Design decisions

1. M2 activation is a host-agnostic activation package and adapter handoff,
   not host execution.
2. The shared Team store is repository-backed, versioned, and delivered by an
   explicit branch/PR flow. It is not a hidden runtime database or automatic
   external synchronization.
3. A Milestone has one shared Milestone-context. Each independently parallel
   Epic has its own linked Epic-context.
4. Context is human-readable Markdown with strict structured metadata. Any
   machine graph, JSON snapshot, or summary is derived and never replaces the
   context source.
5. `EPHEMERAL`, `PERSONAL`, and `TEAM` are explicit retention choices over the
   same contract family, not three unrelated storage implementations.
6. Base recipes remain immutable. Tuning creates one versioned variant or
   overlay at a time and preserves the previous setup for rollback.
7. Session state is compact operational state, not a transcript archive.

## 3. Context and artifact roles

### Milestone-context

The shared planning context for a Roadmap station. It records the agreed
Milestone goal, scope, non-goals, decisions, forecast, dependencies, evidence,
unknowns, acceptance boundary, and links to its Epics.

### Epic-context

The delivery context for one Epic. It records the Epic outcome and scope,
parent Milestone, committed Stories/Tasks/Bugs, acceptance criteria,
dependencies, ownership, evidence requirements, decisions, unknowns, current
state, and the Feature value expected when the Epic is realized.

### Activation package (M2)

A bounded description of one approved recipe activation or tuning operation.
It references the applicable Milestone/Epic-context revision and does not
duplicate the full context.

### Session state (M3)

The compact state needed to pause and resume a bounded run. It references the
current context and activation package; it does not become a second source of
truth for scope or requirements.

### Handoff packet

A compact transfer record for one workstream. It records status, output,
DoD/AC state, evidence, unknowns, dependencies, conflicts, and the next
bounded action. It is derived from the relevant Epic-context and session state.

All durable artifacts must have an owner, parent relation, lifecycle, source
revision, and explicit retention scope. A generic `context.md` is not created
by default; a scoped Milestone- or Epic-context exists only when it has that
parent, owner, lifecycle, and contribution to the Project Vision/Roadmap.

## 4. Retention model

| Choice | Behavior | Resume/team visibility |
| --- | --- | --- |
| `EPHEMERAL` | Emit the package or state for the current operation only; no file is written. | Cannot be resumed after disposal; no team visibility. |
| `PERSONAL` | Save to an explicit user-owned local target after validation. | Available to that User; not promoted automatically. |
| `TEAM` | Save a validated Milestone/Epic-context or session state to an explicit repository-relative target. | Shared through the repository revision and explicit branch/PR delivery. |

The platform never promotes `PERSONAL` to `TEAM` automatically. A Team save
does not authorize a commit, PR, merge, connector call, or external publication;
those remain separate delivery actions with their own approval and read-back.

## 5. M2 activation and tuning boundary

### Input

M2 requires:

- a current Milestone- or Epic-context reference and revision/hash;
- a fresh `ACTIVATION_INTENT` from the human checkpoint;
- one selected recipe and exact recipe version;
- an optional bounded tuning change;
- an explicit retention choice;
- the applicable owner, scope, evidence, and rollback boundary.

### Output

The activation package declares:

- the target Project/Milestone/Epic references;
- the context revision and recipe identity;
- the selected recipe and one tuning delta, if any;
- the prior setup snapshot;
- the new variant or overlay identity;
- required prerequisites and post-activation validation;
- expected evidence and remaining unknowns;
- rollback reference and stop conditions;
- the host-adapter handoff, if one is later requested;
- which operations were performed and which were not performed;
- the selected retention scope.

### Required behavior

- Only one recipe or framework changes in one operation.
- The base recipe is never edited implicitly.
- A second concurrent mutation is rejected as a conflict.
- A stale context, recipe-version mismatch, malformed input, unknown
  capability, missing rollback boundary, or unaccepted scope change stops the
  operation with explicit evidence.
- There is no blind retry, implicit alternative recipe, or silent fallback.
- Host execution, generated host files, connectors, external reads/writes,
  commit, merge, and publication remain outside this boundary.
- A Team package is linked to the relevant Epic-context and Milestone-context;
  it does not copy the whole planning history into the package.

## 6. M3 compact session state and resume

### State content

M3 stores only the information needed to continue safely:

- session identity, owner, and retention scope;
- Milestone/Epic-context IDs and revisions;
- affected Story/Task/Bug references;
- activation package and recipe/variant references;
- setup snapshot and rollback reference;
- current status and progress;
- accepted decisions and overrides;
- evidence references;
- `UNKNOWN` states, deviations, dependencies, and conflicts;
- next bounded action and its acceptance criteria.

It excludes full transcripts, raw prompts, credentials, tokens, cookies,
unbounded connector payloads, and agent confidence without evidence.

### Resume verification

Resume must, in order:

1. resolve the referenced Milestone-context and Epic-context revisions;
2. verify parent links and the affected Story/Task/Bug membership;
3. verify accepted scope, AC, dependencies, repository, branch, worktree, and
   base revision where implementation is involved;
4. compare context, recipe, and setup hashes;
5. reopen the required evidence and check the stop conditions;
6. continue only from the recorded next bounded action.

Stale, contradictory, missing, malformed, or unknown state returns
`STOPPED`/`UNKNOWN`. The controller does not auto-merge contexts, rewrite
decisions, retry an ambiguous operation, or invent missing input.

## 7. PO-to-team delivery flow

```text
PO session
  -> Milestone-context
    -> Epic-context A
    -> Epic-context B
    -> Epic-context C
  -> explicit repository/branch delivery
  -> developer dev-<scope> branches
  -> Story/Task/Bug execution
  -> handoff and controlled fan-in
```

The PO can work through the shared Milestone and Epic decisions once. The
developers consume the validated Epic-context for their bounded work instead
of replaying the PO conversation. Each parallel Epic has its own context and
ownership boundary; shared mutable context changes are coordinated through the
integration owner and review owner.

The repository workflow remains:

- a PO or team context slice is prepared on a short-lived `dev-<scope>` branch;
- its PR targets `feature`;
- after integration, developers create new bounded `dev-<scope>` branches
  from the current `feature` branch;
- `feature` reaches `main` only through the separately approved promotion
  flow.

## 8. Failure and safety behavior

The platform stops before mutation or handoff when it detects stale or
contradictory context, missing parent links, malformed state, target mismatch,
unknown capability, unsupported host, dependency conflict, shared-write
conflict, evidence mismatch, timeout with unknown completion, or unaccepted
scope change.

Every stop preserves the unchanged prior setup, the observed evidence, the
impact, the reason, and the next bounded decision. It does not silently retry,
broaden an allowlist, alter another recipe, or turn `UNKNOWN` into `READY`.

## 9. Acceptance and verification

### M2 exit evidence

- validated activation package contract;
- explicit Ephemeral/Personal/Team behavior;
- one-at-a-time mutation enforcement;
- immutable base recipe and preserved setup snapshot;
- rollback test after a failed tuning attempt;
- stale, malformed, unsupported, and unknown stop-path tests;
- proof that no host or external operation was performed.

### M3 exit evidence

- resumable session-state schema;
- retention and redaction rules;
- repository-backed Team revision and parent-link validation;
- stale-context and hash-mismatch stop tests;
- PO Milestone-context to Epic-context to developer resume test;
- parallel Epic isolation test;
- successful resume and safe-stop behavior.

## 10. Explicit non-goals

This design does not implement or authorize:

- actual Codex, Claude Code, or Cursor execution;
- Jira, GitHub, or Confluence synchronization;
- automatic commits, PRs, merges, or publication;
- connector credentials or permissions;
- transcript reconstruction;
- automatic recipe evolution;
- simultaneous mutation of multiple recipes or frameworks.

## 11. Existing contracts this design extends

- [Roadmap](../../project/roadmap.md)
- [Current delivery state](../../project/current-state.md)
- [Team Delivery Loop](../../../workflows/team-delivery-loop.md)
- [AI Booster Kit Vocabulary](../../../NOTES.md)
- [Canonical Lifecycle](../../../contract/lifecycle.md)
- [Canonical artifact templates](../../../contract/artifacts/canonical-work-artifact-template.md)
- [Human Checkpoint and Activation Intent design](2026-08-01-ai-booster-kit-human-checkpoint-activation-intent-design.md)
- [Quick Task Activation Package design](2026-08-01-ai-booster-kit-quick-task-activation-package-design.md)

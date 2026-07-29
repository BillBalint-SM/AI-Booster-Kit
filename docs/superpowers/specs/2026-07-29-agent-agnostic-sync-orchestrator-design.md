# Agent-agnostic contract-first sync orchestrator

**Status:** Design approved in conversation on 2026-07-29; implementation not started.

**Scope:** A team-shareable operating standard and an allowlisted two-way documentation and delivery synchronisation capability for Codex, Claude Code, Cursor, Jira, Confluence, and GitHub.

## 1. Problem and outcome

The team needs one shared operating contract that can be used across Codex, Claude Code, and Cursor without pretending that their instruction discovery, permissions, sandboxing, MCP, skill, plugin, context, and UI semantics are identical.

The same contract must support a two-way human-documentation workflow with one
canonical vocabulary across the agent hosts, Jira, Confluence, and GitHub:

    Feature vision and planning
            ↓
    Milestone (Jira issue type/work item)
            ↓
    Canonical Work Artifact (Milestone content)
            ↓
    Milestone decomposition: Epic → Story / Task / Bug
            ↓
    Finalize and accept the Jira and Confluence projections
            ↓
    Sprint/Board committed child scope in Jira To Do
            ↓
    Verified implementation start / last check-review
            ↓
    Jira In Progress
            ↓
    GitHub branch, PR, checks, and review evidence
            ↓
    Jira and Confluence read-back

The canonical Jira work-item hierarchy is `Milestone → Epic → Story / Task /
Bug`. The `Canonical Work Artifact` is not an additional execution work item;
it is the structured, reviewable content of a Milestone and its linked
projections.

The product outcome is not identical host UI or identical model output. It is a stable, auditable team behaviour contract, consistent lifecycle semantics, explicit evidence, and predictable external state transitions.

## 2. Design principles

- A human-readable canonical contract is the source of truth for shared operating semantics.
- Native host adapters preserve Codex, Claude Code, and Cursor semantics instead of creating a universal executable configuration format.
- Jira owns work-item lifecycle and status; GitHub owns code and delivery evidence; Confluence is a versioned documentation projection; an agent session is execution context, not final authority.
- Allowlisted auto-sync is the default automation mode.
- External writes are idempotent, bounded, read-back verified, and auditable.
- Unknown, ambiguous, stale, conflicting, or unsupported evidence fails closed.
- Dependencies, problems, and clarification needs are orthogonal metadata, not invented lifecycle statuses.
- Main is protected; parallel work integrates through short-lived branches and pull requests.
- A normal host run is not security-boundary evidence.

## 3. Architecture

The system has five cooperating layers.

### 3.1 Canonical Contract

The repository stores an operator-readable Markdown contract with small declarative metadata blocks. It defines roles, canonical lifecycle semantics, backlog and planning rules, acceptance/test/review expectations, evidence and traceability requirements, stop conditions, the user decision protocol, and supported host and connector capabilities.

The contract is guidance and orchestration input. It is not a permission policy, sandbox, hook, MCP authorization, credential store, or security proof.

### 3.2 Contract compiler and native adapter generator

The compiler validates the canonical contract and produces host-native projections for Codex, Claude Code, and Cursor.

Only declared, known, and semantically compatible capabilities are generated. Arbitrary executable skills, plugins, MCP servers, hooks, or configuration files are not silently rewritten or enabled. Each capability receives an explicit status:

- supported;
- supported_with_limits;
- unsupported;
- unknown;
- requires_approval.

Every generated adapter records the source contract revision, target host, target version context, and known limitations.

### 3.3 Canonical work hierarchy and Execution Set model

The work model separates the durable team standard, roadmap-level outcomes,
structured planning content, and executable work items.

A Team Contract is the durable team-level operating standard.

A Milestone is a Jira issue type/work item for a critical event, decision,
deliverable, or dependency completion that visibly moves a project forward. A
project should keep the list lean, roughly 5–10 key checkpoints, with clear,
outcome-based names and links to the related Epics, work items, and
dependencies.

A Canonical Work Artifact is the Milestone's feature-specific, reviewable
single source of truth. It records the vision, scope, non-goals, requirements,
implementation plan, test plan, acceptance criteria, review points, decisions,
evidence, unknowns, dependencies, and the current project context and state.
Its authoritative Jira representation is the Milestone Description field. The
generated Markdown artifacts are attached to that Milestone, while Confluence
contains the concise roadmap-style projection and the relevant artifact
sections. The artifact is content, not a separate Jira execution item.

Each Milestone is decomposed into multiple Epics. Every Epic has exactly one
Milestone parent and should be independently executable where possible, so
parallel work does not create unnecessary bottlenecks. An Epic is a
developer-independent implementation unit. Dependencies between Epics are
represented with Jira relationships such as `blocks`, `is blocked by`,
`relates to`, or an explicit sequencing link; they are not represented by a
fake lifecycle status.

Each Epic contains Story, Task, and Bug child work items. These child work
items are the developer-facing execution units shown on the Board. An Epic may
reach Done only after all of its child Story/Task/Bug items are implemented,
reviewed, tested, documented, and summarized. A Milestone is a roadmap-level
outcome and requires its own acceptance/completion evidence in addition to the
existence of planning documentation.

An Execution Set is an owner- or agent-scoped set of related child work items
and delivery evidence. It normally maps to one Epic or to a bounded subset of
one Epic's Story/Task/Bug children. It contains an executionSetId, owner,
agentHost, Jira board and project, an optional Jira Sprint mapping, issue set,
branch or worktree, base revision, affected paths, dependencies, acceptance
boundary, target environment, and linked pull requests.

An Execution Set is a coordination and traceability unit, not a Jira issue
type, not automatically a branch, and not automatically a Jira Sprint.

### 3.4 Allowlisted sync orchestrator

The orchestrator consumes canonical events, validates identity and scope, applies the smallest declared external change, verifies the read-back state, and records the result.

It owns event correlation, Jira/Confluence/GitHub identity mapping, allowlist evaluation, idempotency, state-transition validation, local outbox and replay rules, external read-back, audit, and user-facing stop decisions.

### 3.5 Native connectors and audit

Jira, Confluence, GitHub, and each agent host remain separate trust and permission boundaries. Connector identities, scopes, audits, and recovery paths are not merged into the canonical contract.

## 4. Canonical contract and repository shape

The initial logical repository shape is:

    contract/
      team-contract.md
      capability-matrix.md
      lifecycle.md
      adapters/
        codex.md
        claude-code.md
        cursor.md
      artifacts/
        milestone-template.md
        canonical-work-artifact-template.md
        epic-template.md
        work-item-template.md
        review-template.md
      mappings/
        jira-confluence-github.md

The common source is Markdown with declarative metadata. Native adapters are derived projections and are not independent authorities.

The canonical model distinguishes:

- milestone: roadmap-level Jira work item and parent of the implementation hierarchy;
- canonicalWorkArtifact: structured Milestone content and linked documentation projections;
- epic: independently executable child of exactly one Milestone;
- workItem: Story, Task, or Bug child of exactly one Epic;
- boardStatus: the project-native Jira lifecycle status;
- planningState: backlog readiness and selection context;
- executionSet: owner, scope, Sprint mapping, branch/worktree, and evidence;
- attentionState: dependency, problem, clarification, or sync flag;
- syncState: the technical synchronisation state;
- evidenceRefs: immutable or externally read-back references.

## 5. Jira Board, backlog, and lifecycle

The first project profile uses the actual Board columns as canonical lifecycle states:

- To Do;
- In Progress;
- Review;
- Ready for Deploy;
- Ready for Test;
- Testing;
- Done.

The meanings are:

- To Do: accepted and executable work with no active implementation;
- In Progress: implementation or concrete development work is active;
- Review: implementation is complete and under review;
- Ready for Deploy: review succeeded and the item can be deployed to the test environment;
- Ready for Test: deployment completed and QA can begin;
- Testing: test or QA execution is active;
- Done: the defined completion evidence is satisfied.

Backlog planning is a separate dimension. Project-native values such as Draft, Selected for Development, and Waiting for Test are mapped through the project profile and are not assumed to be universal cross-project lifecycle states.

The model does not introduce Blocked, Rejected, or Awaiting Clarification as Board statuses. Cancelled is not a general lifecycle status. A Deleted terminal state may be represented only when the project explicitly defines it; the orchestrator never deletes automatically.

### 5.1 Jira hierarchy, finalization, and implementation start

Planning and artifact authoring remain editable while the Milestone, its
Canonical Work Artifact, and its decomposition are being refined. A finalization
and acceptance action is required before authoritative Jira and Confluence
records are created or updated from the accepted structure. Raw planning chat is
never treated as a publishable artifact.

Finalization creates or reconciles the following hierarchy:

    Milestone → Epic → Story / Task / Bug

The Milestone receives the Canonical Work Artifact in its Description field and
the generated Markdown files as attachments. Its Confluence projection is
roadmap-oriented. The Epic and Story/Task/Bug records receive only the scoped,
traceable content needed for execution, with parent links back to the
Milestone hierarchy.

Only the team-committed Story/Task/Bug scope is placed into the relevant Jira
Sprint and Board. Those child work items enter To Do when they are ready for
implementation; the Milestone and Epic remain visible as their planning and
aggregation parents.

Before the first real implementation event, the orchestrator performs a
verified implementation-start check. It reconciles the selected child scope
with the Milestone vision, Epic boundary, acceptance criteria, dependencies,
repository, branch/worktree, and current roadmap context. Only a passing
check, followed by evidence of actual implementation, may move the child work
item from To Do to In Progress.

### 5.2 Orthogonal problem and dependency handling

- A dependency is a Jira dependency link, flag, documented cause, and next resolution step. The current lifecycle status does not change automatically merely because the dependency exists.
- A review failure records the problem and returns the work item to To Do.
- A testing failure records the defect or problem and returns the work item to To Do.
- A clarification need creates a flag/comment/question when the target is verified; it does not create a new lifecycle status.
- The previous status, evidence, cause, and next action remain traceable after a rollback to To Do.

## 6. Sprint, Execution Set, and GitHub branching

Jira Sprint remains a board-native planning container for the team's committed
Story/Task/Bug scope. It is an optional mapping on an Execution Set, not the
identity of a Git branch and not a per-developer container. An Execution Set
provides the developer- or agent-specific scope within that planning context;
it normally maps to one Epic or a bounded subset of one Epic's child work
items.

The branching strategy is trunk-based development with short-lived feature branches, protected main, required checks, required reviews, and merge queue where available.

Branch rules:

- Direct push to main is disabled.
- A small work item normally maps to one branch, one worktree, and one pull request.
- A cohesive Execution Set may contain several branches and pull requests.
- A branch name contains the stable work-item identity, for example feature/GDEAI-22912-short-description.
- An Execution Set branch is optional and is used only as a temporary integration branch for strongly coupled changes.
- Developer branches are not long-lived alternatives to main.
- Agent sessions are associated with an Execution Set and branch/worktree; they do not receive an untracked branch automatically.

Independent work goes through separate PRs to protected main. Dependent work uses stacked PRs with an explicit dependency order. Strongly coupled work may use a temporary integration branch. The integration branch is not a permanent second main and must return its independently reviewable changes through PRs.

Shared contracts, APIs, schemas, and affected-path ownership are identified before parallel implementation. Feature flags may keep incomplete functionality from changing active behaviour while the code is integrated.

The merge queue validates the merge result against the current target branch and queued changes. It is the preferred protection against a PR being green only against a stale main.

## 7. Event model and sync flow

Agent, Git, and GitHub events enter a canonical envelope before any connector write.

    host or Git event
      → native adapter
      → canonical event envelope
      → local outbox
      → identity, scope, and allowlist validation
      → connector operation
      → read-back verification
      → audit and sync result

Example events include milestone_created, canonical_work_artifact_updated,
milestone_finalized, decomposition_accepted, jira_projection_created,
implementation_ready, execution_set_created, implementation_start_check_passed,
branch_created, implementation_started, commit_created,
pull_request_opened, review_passed, deployment_completed, testing_started,
testing_passed, epic_completed, and milestone_completed.

The implementation_start_check_passed event requires a verified Milestone and
Epic trace, accepted Story/Task/Bug scope, dependencies, repository,
branch/worktree, and current roadmap context. The implementation_started event
then requires a verified Execution Set, base revision, actor, and actual
implementation event. Planning chat alone does not move Jira to In Progress.

Initial transition mapping:

- decomposition_accepted → the committed Story/Task/Bug scope is created or reconciled in To Do;
- implementation_start_check_passed plus implementation_started → In Progress;
- review_started → Review;
- review_passed → Ready for Deploy;
- deployment_completed → Ready for Test;
- testing_started → Testing;
- testing_passed → Done;
- review_failed → To Do plus problem/flag;
- testing_failed → To Do plus defect/flag;
- dependency_detected → current status plus dependency/flag;
- clarification_needed → current status plus Jira flag/comment.

Board lifecycle transitions apply to Story/Task/Bug execution items. Epic and
Milestone status is derived or explicitly reconciled from child evidence and
roadmap acceptance; a parent is not marked Done merely because its description
or documentation exists.

The exact project transition identifiers are resolved from the current Jira project; visible text is not used as identity.

Each event records executionSetId, artifactId, correlationId, source, actor, eventType, sourceRevision, timestamp, beforeState, afterState, evidenceRefs, and idempotencyKey.

## 8. Allowlist, idempotency, and recovery

The allowlist may permit issue creation and named Jira field updates in one project, forward Jira transitions, canonical Confluence section creation or versioned update in one space, GitHub PR/commit/check/review evidence reads, declared Jira/Confluence/GitHub links, and audit/evidence references.

It never silently permits deletion, permission or workflow configuration changes, arbitrary fields, backward status transitions, ambiguous identity resolution, raw transcript publication, or production mutation.

The sync layer uses stable identity and idempotency keys. Replay must not create duplicate issues, pages, links, or transitions. A timeout with unknown external completion is reconciled by read-back; it is not blindly retried.

## 9. User-facing stop and decision protocol

Every stop immediately produces a structured user-facing signal:

    SYNC STOP
    Situation
    Target
    Detected problem
    Evidence
    Expected impact
    What remains unchanged
    Risk
    Recommendation
    Decision options

The orchestrator gives a recommendation and explains the outcome of each option.

For a bounded, non-destructive, still-allowlisted operation, the User may choose Continue or Stop. Continue records explicit accepted risk, exact scope, compensating control, expiry, and mandatory read-back. It is one bounded decision, not a global or permanent bypass.

Continuation is not offered when the target, authority, or write boundary cannot be made safe by a decision: wrong tenant/project/space/repository, unverifiable credential or scope, deletion or permission change, unverified external write authority, or unresolved ambiguous mapping.

A stop is not a Jira Blocked status. If the Jira target is already verified and the operation is allowlisted, the orchestrator may add a flag, comment, or dependency link; otherwise it only retains local evidence and waits for correction.

## 10. Cross-host conformance and performance

The hosts must produce equivalent canonical semantics, not identical internal execution.

Conformance checks cover canonical artifact fidelity, native adapter completeness, lifecycle-event equivalence, allowlist enforcement, duplicate and replay handling, stale and conflicting evidence, read-back verification, user-facing stop behaviour, and recovery behaviour.

Performance is measured before fixed targets are chosen. The initial scorecard records artifact fidelity, adapter completeness, sync freshness and latency distributions, duplicate write rate, conflict detection rate, read-back verification rate, recovery success rate, unsupported capability rate, human clarification rate, token/compute/connector cost, and review/test rework.

Activation order:

    canonical contract tests
      → Codex local conformance
      → Codex sandbox sync
      → Claude Code/Cursor adapter conformance
      → Claude Code/Cursor sandbox sync
      → comparable cross-host pilot

## 11. Security, identity, and rollout

Human user, agent host, sync orchestrator, Jira identity, Confluence identity, GitHub App or repository identity, and CI/CD identity remain separate trust boundaries.

A broad human credential is not used for unattended sync. New projects, spaces, repositories, connector scopes, host adapters, capabilities, and production actions require separate approval.

Rollout proceeds from local contract validation to read-only connector discovery, then a non-production sandbox with a narrow allowlist. Codex is the first live host; Claude Code and Cursor follow after adapter conformance and sandbox evidence.

## 12. V1 scope

V1 is a Codex-first, runnable vertical slice containing:

- canonical Markdown contract and declarative metadata;
- Milestone, Canonical Work Artifact, Epic, Story/Task/Bug, and Execution Set records;
- local event outbox and canonical event envelope;
- Codex native adapter;
- allowlisted Jira and Confluence projections;
- GitHub branch/worktree/PR evidence mapping;
- Jira status transitions for the actual Board profile;
- read-back, audit, idempotency, conflict, and stop handling;
- Claude Code and Cursor adapter validation, without requiring all three hosts to perform live writes in the first release.

V1 does not include arbitrary executable capability conversion, production writes, automatic merge or deployment, raw transcript publication, or hard performance targets before baseline measurement.

## 13. V1 acceptance criteria

V1 is accepted only when:

1. A finalized Milestone contains the Canonical Work Artifact in its Jira
   Description, has the generated Markdown attachment, and has a concise
   roadmap-style Confluence projection.
2. Finalization creates or reconciles the hierarchy Milestone → Epic → Story /
   Task / Bug with traceable parent links and no ambiguous mapping.
3. Only the team-committed Story/Task/Bug scope is placed into a Jira Sprint
   and enters the Board in To Do.
4. The implementation-start check verifies the Milestone/Epic/child scope and
   actual repository context before a real implementation event moves a child
   work item from To Do to In Progress.
5. A pull request maps to Review and preserves GitHub evidence.
6. Review, deploy, test, and completion events map to the actual Board statuses.
7. Review or test failure returns the work item to To Do with documented
   evidence and a flag or linked problem.
8. Dependency and clarification conditions do not create a fake lifecycle
   status.
9. Replay does not create duplicate external objects or transitions.
10. Wrong identity, missing scope, ambiguous mapping, unknown external
    completion, unsupported capability, and over-broad write requests produce
    the User-facing stop protocol.
11. Every external write is allowlisted, read-back verified, and auditable.
12. The same canonical artifact is semantically comparable across Codex,
    Claude Code, and Cursor adapters.

## 14. Current pilot boundary

GDEAI-22912 is a candidate pilot reference, but its current Jira record has no Description or Acceptance Criteria and no development link. It is not sufficient as an implementation input until a canonical Work Artifact supplies the missing scope and acceptance boundary. No Jira change is implied by this design.

## 15. Design exclusions

- No forced universal cross-agent executable configuration schema.
- No raw private-session auto-sync.
- No long-lived developer branches or permanent integration branch.
- No automatic destructive Jira, Confluence, GitHub, permission, or production action.
- No claim that normal host behaviour proves security isolation.

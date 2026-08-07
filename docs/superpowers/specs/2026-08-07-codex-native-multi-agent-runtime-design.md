# Codex-Native Multi-Agent Runtime Design

- **Date:** 2026-08-07
- **Status:** User-approved design; implementation not started
- **Delivery boundary:** Agent-Agnostic Execution Contract plus one Codex-native,
  read-only reference runtime
- **Authority:** Local execution only; no external write, publication, API model
  connection, or cross-host capability claim

## 1. Objective

Build the missing execution layer between an accepted Controller activation and
an evidence-backed outcome. The layer must turn one accepted goal into a
validated, bounded execution graph; coordinate Codex-native subagents; preserve
canonical run state outside agent transcripts; validate every handoff; and
produce a traceable final result.

The first delivery is not a fixed list of named agents or a universal
multi-agent workflow. It consists of:

1. an **Agent-Agnostic Execution Contract** that describes a run without
   depending on a scenario-specific role name or host-specific agent identity;
2. a **Deterministic Contract Kernel** that validates contracts, state
   transitions, graph mutations, results, budgets, and recovery decisions;
3. a **Codex-Native Multi-Agent Runtime** in which the active main Codex task
   acts as orchestrator and uses only Codex app subagent capabilities; and
4. one bounded, read-only repository-audit reference run with a strong
   single-agent comparator.

## 2. Problem statement and corrected abstraction

The existing Controller can recognize bounded scenarios, recommend a formation,
prepare an activation boundary, retain compact context, validate fan-in packets,
and launch one bounded Codex process. It does not provide a general scheduler,
task ledger, dynamic execution graph, structured subagent communication,
checker loop, or Codex-app-native orchestration protocol.

The prior formation names and role names are examples, not platform facts. The
design keeps the following concepts separate:

| Concept | Meaning |
| --- | --- |
| Scenario | The user outcome and its domain constraints: what and why. |
| Execution pattern | A reusable coordination primitive such as sequential, fan-out/fan-in, or maker-checker. |
| Execution graph | The concrete composition of nodes and dependencies for one run. |
| Role | A run-bound specialization assigned to one worker. |
| Runtime | The governed environment that executes, validates, records, and recovers the run. |

A single run may combine multiple patterns. A single-agent run is the one-node
case of the same contract and kernel, not a separate product architecture.

## 3. Accepted design decisions

### 3.1 Bounded adaptive graph

The accepted envelope is immutable. The execution graph may grow during a run,
but only by adding new `PENDING` nodes within pre-authorized limits. A graph
mutation cannot widen the goal, acceptance criteria, source allowlist, tool
scope, write authority, retention, or budget.

Every accepted mutation creates a new graph revision and records:

- the reason for the mutation;
- the evidence that triggered it;
- the new dependencies;
- the remaining budget consumed; and
- the validation decision.

Completed nodes cannot be edited, deleted, or silently re-run.

### 3.2 Deterministic kernel and advisory orchestrator

The Deterministic Contract Kernel owns authority enforcement and canonical run
state. The main Codex task acts as the Orchestrator Agent and owns decomposition,
delegation, follow-up requests, result collection, and final synthesis.

The orchestrator and workers may propose work, but they cannot directly grant
authority, mutate the canonical ledger, declare their own result accepted, or
spawn outside the accepted envelope. The Kernel validates each proposed state
change before it becomes canonical.

### 3.3 Codex-only model boundary

The project does not build or operate an LLM integration. It does not use the
OpenAI API, Agents SDK, an external model endpoint, an API key, or another agent
platform. All model work occurs through the Codex app's native main-agent and
subagent threads.

Repository TypeScript code never starts a model or subagent. It exposes local,
deterministic validation and persistence operations that the main Codex task
invokes through its available local tools.

The contract remains agent-agnostic; the only runtime implemented and claimed
by this slice is Codex-native. Claude Code, Cursor, and other host adapters are
out of scope.

### 3.4 Personal canonical state

The reference run uses `PERSONAL` retention. Activation supplies an explicit,
existing, user-owned parent directory. The Kernel creates one child directory
named by `runId` below that parent.

`TEAM` promotion is a separate reviewed action. It may contain only normalized
execution receipts, evidence maps, decisions, unknowns, and limits. Raw prompts,
transcripts, hidden reasoning, credentials, arbitrary tool payloads, and
personal paths must not be promoted.

`EPHEMERAL` remains valid for simple non-resumable runs. An ephemeral run cannot
claim checkpoint or recovery support.

## 4. Architecture and responsibility boundaries

```text
Accepted user decision
  -> existing Controller activation intent
  -> Agent-Agnostic Execution Contract
  -> Deterministic Contract Kernel validation
  -> main Codex task as Orchestrator Agent
       -> Codex-native worker threads
       -> Codex-native checker thread
       -> optional bounded repair worker
  -> Kernel-validated synthesis inputs
  -> evidence-backed final handoff
```

### 4.1 Existing Controller

The Controller remains responsible for scenario recognition, recommendation,
prerequisite evaluation, user acknowledgement, and activation intent. It does
not schedule workers or own active run state.

### 4.2 Agent-Agnostic Execution Contract

The contract defines the immutable goal, scope, acceptance criteria, authority,
limits, and evidence obligations. It does not embed a host transcript, model
endpoint, credential, fixed team name, or developer-instruction body.

### 4.3 Deterministic Contract Kernel

The Kernel is a local TypeScript module with pure validation and explicit
persistence boundaries. It is responsible for:

- envelope and graph validation;
- node and run state transitions;
- task and result envelope validation;
- graph-mutation admission;
- budget and stop-policy enforcement;
- append-only event recording;
- checkpoint and resume decisions; and
- artifact and evidence-reference integrity.

It does not interpret unrestricted natural language, select a model, run an
agent, synthesize findings, or infer missing evidence.

### 4.4 Codex-native Orchestrator

The active main Codex task:

- loads a validated envelope;
- proposes the initial graph;
- delegates ready work through native Codex subagent operations;
- sends typed task packets;
- waits for, steers, inspects, or interrupts workers as allowed by the host;
- passes exact worker payloads to the Kernel;
- submits bounded graph-mutation proposals;
- gives the checker only accepted result artifacts; and
- synthesizes the final handoff from accepted inputs.

The main task is the sole orchestration owner. Workers do not recursively spawn
agents. They may request follow-up work through their result envelope.

## 5. Canonical contracts

### 5.1 Execution envelope

The envelope contains:

```text
runId
contractVersion
goal
scope
nonGoals
acceptanceCriteria
sourceRevision
retention
allowedNodeTypes
authority
toolScope
sourceAllowlist
graphLimits
budget
stopConditions
requiredEvidence
allowedFinalStates
envelopeHash
```

The envelope hash is derived deterministically from the validated envelope
excluding the hash field itself. Every graph, task, result, event, checkpoint,
and artifact manifest binds to the same `runId` and `envelopeHash`.

### 5.2 Execution graph

```text
graphId
runId
envelopeHash
graphRevision
nodes[]
edges[]
graphHash
```

The MVP supports four node types:

- `AGENT_TASK`;
- `DETERMINISTIC_CHECK`;
- `HUMAN_CHECKPOINT`; and
- `SYNTHESIS`.

Worker tool use remains inside an `AGENT_TASK` tool scope. A general standalone
tool-node abstraction is not part of the first slice.

Graph validation rejects cycles, missing or foreign dependencies, duplicate
node identities, unsupported node types, completed-node mutation, depth or
parallelism overflow, and any authority widening.

### 5.3 Node and run states

Node states:

```text
PENDING -> READY -> RUNNING -> RESULT_RECEIVED
RESULT_RECEIVED -> SUCCEEDED | REJECTED
RUNNING -> STOPPED | UNKNOWN
```

Run states:

```text
PREPARED -> READY -> RUNNING
RUNNING -> WAITING_FOR_HUMAN
WAITING_FOR_HUMAN -> RUNNING
RUNNING | WAITING_FOR_HUMAN -> COMPLETE | COMPLETE_WITH_LIMIT | STOPPED | UNKNOWN
```

`BLOCKED` is not an internal retry state. It remains reserved for a genuine
external dependency or authority condition and cannot be substituted for a
Kernel stop.

### 5.4 Task packet

```text
runId
taskId
nodeId
envelopeHash
graphRevision
objective
scope
prohibitedActions
contextRefs
sourceAllowlist
toolScope
expectedOutput
acceptanceCriteria
budget
stopConditions
```

A worker receives only the context required for its node. It does not
automatically receive the complete user conversation, unrelated repository
context, another worker's raw response, or hidden reasoning.

### 5.5 Result envelope

```text
runId
taskId
nodeId
envelopeHash
graphRevision
status
summary
claims[]
artifactRefs[]
evidenceRefs[]
unknowns[]
conflicts[]
followupRequest
observedLimits[]
```

Worker result status is one of `READY_FOR_VALIDATION`, `STOPPED`, or `UNKNOWN`.
A worker cannot declare its node `SUCCEEDED`; only the Kernel can accept a
validated result.

The worker's final message must be one parseable Result Envelope JSON object.
The main agent passes it unchanged to the Kernel. A free-text summary cannot be
silently rewritten into a canonical result.

Each claim has a stable `claimId`, a non-empty `statement`, a state of
`SUPPORTED`, `CONFLICTED`, or `UNKNOWN`, and one or more evidence-reference IDs
when the state is `SUPPORTED`. A `followupRequest` is either `null` or a bounded
object containing a reason, objective, required evidence, and proposed scope;
the proposed scope must be a subset of the original node scope.

Evidence references resolve through the run's evidence index. Each index entry
contains an `evidenceId`, evidence kind, immutable source revision, normalized
locator, and content hash where content is persisted. Repository-file evidence
also records a repository-relative path and exact line start and end. A worker
cannot make an unsupported claim valid merely by placing an arbitrary string in
`evidenceRefs`.

## 6. Personal run store

```text
<explicit-personal-root>/<runId>/
  envelope.json
  graph.json
  events.jsonl
  checkpoint.json
  evidence-index.json
  artifacts/
    manifest.json
    task-<nodeId>-result.json
    final-handoff.md
```

Properties:

- `envelope.json` is immutable;
- `events.jsonl` is append-only;
- `graph.json` is the latest accepted graph revision;
- `checkpoint.json` is replaced only after a validated state transition;
- `evidence-index.json` resolves normalized evidence identities and locators;
- `artifacts/manifest.json` binds artifact identities to content hashes;
- accepted result and handoff artifacts are content-hashed;
- the main Codex task may write only by invoking Kernel operations;
- workers have no run-store or repository write authority; and
- raw transcripts and hidden reasoning are forbidden content.

Existing-target conflict, path traversal, symlink escape, malformed content,
hash mismatch, or write ambiguity stops the operation. No fallback path is
chosen automatically.

## 7. Codex-native execution protocol

1. The main task obtains the accepted activation intent and proposes an
   execution envelope.
2. The Kernel validates and persists the immutable envelope.
3. The main task proposes the initial graph; the Kernel validates revision 1.
4. The Kernel marks dependency-satisfied nodes `READY`.
5. The main task records dispatch intent, then spawns only the allowed Codex
   workers with exact Task Packets.
6. Each worker returns one Result Envelope JSON object.
7. The main task passes the exact response to the Kernel.
8. The Kernel validates identity, revision, schema, authority, evidence, and
   status before accepting the result.
9. Fan-in and checker work use only accepted result artifacts.
10. If the checker identifies one bounded evidence gap, the main task may
    propose one repair node. The Kernel admits or rejects it against the
    envelope.
11. The synthesis node receives accepted results and the accepted checker
    verdict, then creates the final handoff.
12. The Kernel records the final state only after acceptance criteria and
    required evidence have been evaluated.

## 8. Failure, cancellation, and recovery

There is no blind or automatic retry.

| Condition | Required behavior |
| --- | --- |
| Malformed result | Mark the node `REJECTED`; preserve the exact validation error. |
| Foreign run, stale revision, or hash mismatch | Stop the run; do not use any part of the result. |
| Scope or tool-authority violation | Stop the run; partial content is not admissible. |
| Worker timeout | Preserve a checkpoint and mark the node `STOPPED`. |
| Worker returns `UNKNOWN` | Preserve `UNKNOWN`; do not promote it to success. |
| Required node fails | Admit a repair node only when the envelope allows it; otherwise stop. |
| Optional node fails | Permit `COMPLETE_WITH_LIMIT` only if all required acceptance criteria still hold. |
| Budget is exhausted | Start no new node; choose `COMPLETE_WITH_LIMIT` or `STOPPED` from the contract. |
| User cancels | Interrupt active workers where the host allows it and preserve stopped state. |
| Checker finds a conflict | Use `UNKNOWN` or a human checkpoint; do not auto-resolve it. |

A repair attempt has a new node identity, cites the failed node and evidence,
and consumes the remaining budget. The first reference envelope permits at most
one repair node and one checker-repair cycle.

Checkpoints are written after initial graph acceptance, each accepted node
result, every accepted graph mutation, the checker verdict, and before a stop
or cancellation.

Resume validates the envelope hash, graph hash, source revision, artifact
hashes, remaining budget, and current host evidence. A `SUCCEEDED` node is never
re-run. If Codex cannot authoritatively recover a prior worker thread state, the
node and run remain `UNKNOWN`; a new run or repair decision requires explicit
authorization.

Local checkpoint behavior can be proven deterministically. Resume across an
actual Codex app interruption remains unproven until a separate live conformance
run passes.

## 9. First read-only reference run

### 9.1 Goal

Determine, from exact repository evidence, which current AI Booster Kit
contracts can support the Codex-Native Multi-Agent Runtime MVP, what is missing,
and which claims remain `UNKNOWN`.

### 9.2 Fixed envelope for this run

- source: the verified local repository revision only;
- repository write scope: `NONE`;
- external source and external write scope: `NONE`;
- retention: `PERSONAL`;
- maximum parallel workers: `2`;
- maximum repair nodes: `1`;
- maximum checker-repair cycles: `1`;
- accepted final states: `COMPLETE`, `COMPLETE_WITH_LIMIT`, `STOPPED`, and
  `UNKNOWN`;
- every material claim requires an exact repository file reference and, when
  stable, a line reference.

These values constrain only the reference run. They are not universal platform
defaults.

### 9.3 Initial graph

1. Worker A inspects the Controller, formation, activation, and current bounded
   execution contracts.
2. Worker B inspects context, persistence, fan-in, checkpoint, and resume
   contracts.
3. A checker validates completeness, provenance, contradictions, unsupported
   claims, and visible unknowns.
4. One repair worker may collect a specifically named missing repository fact.
5. The main task synthesizes a readiness and gap brief from accepted artifacts.

The reference run proves orchestration mechanics and evidence transport. It
does not by itself prove cross-session resume, write-capable execution, or
general superiority of multi-agent work.

## 10. Verification strategy

### 10.1 Deterministic checks

Tests cover:

- valid envelope and graph acceptance;
- cycle, foreign dependency, duplicate node, and unsupported node rejection;
- graph limits and authority non-expansion;
- every illegal node and run transition;
- malformed, stale, foreign, duplicate, and over-budget results;
- scope, source, and tool violations;
- exactly one allowed repair node;
- timeout, cancellation, and unknown-host recovery;
- completed-node resume behavior;
- append-only event integrity and write conflicts;
- path traversal, repository escape, and symlink targets;
- forbidden transcript-, prompt-, or reasoning-shaped persisted fields; and
- deterministic hashes and reconstruction from the ledger.

Verification order:

```powershell
npm run lint
npm test
npm run check:docs
git diff --check
```

The narrowest relevant test runs before the complete gates.

### 10.2 Codex-native conformance run

The reference run must preserve the envelope and graph hashes, task identities,
Codex thread references, dispatch and completion events, accepted result hashes,
checker verdict, graph revisions, and final handoff. Time and token metrics are
recorded only when the Codex app exposes them as actual evidence; otherwise they
remain `UNKNOWN`.

### 10.3 Strong single-agent comparator

The same audit runs once without subagents, using the same repository revision,
scope, acceptance criteria, source allowlist, and write authority. The comparison
reports:

- evidence completeness;
- detected conflicts and gaps;
- unsupported claims and preserved unknowns;
- elapsed time when measurable;
- token use when measurable;
- coordination overhead;
- context isolation; and
- final acceptance-criteria coverage.

The multi-agent run is not required to win. A measured conclusion that its
coordination cost exceeds its value for this task is a valid result.

## 11. Acceptance criteria

The first slice is accepted when:

1. the Contract Kernel passes all positive and negative tests;
2. the Codex app executes the two-worker fan-out/fan-in reference graph;
3. every worker and checker response is deterministically validated;
4. only accepted artifacts enter checker and synthesis nodes;
5. graph growth remains within the accepted envelope;
6. the append-only ledger reconstructs the complete run;
7. every material final claim resolves to accepted evidence;
8. a comparable strong single-agent control result exists;
9. no repository or external write occurs during the reference run; and
10. no API key, external LLM, SDK model integration, or other host adapter is
    introduced.

The individual audit run may finish `COMPLETE`. The delivered runtime remains
`READY_WITH_LIMIT` until live Codex interruption-and-resume conformance is
separately proven.

## 12. Non-goals

The first slice does not include:

- OpenAI API, Agents SDK, or external model integration;
- Claude Code, Cursor, or generic host execution adapters;
- write-capable worker agents;
- automatic Git commit, push, pull request, merge, or publication;
- `AGENTS.md`, global Codex configuration, or agent-profile mutation;
- an unbounded agent loop;
- a general workflow-designer UI;
- automatic `PERSONAL` to `TEAM` promotion; or
- a live cross-session resume capability claim.

## 13. Existing assets and implementation boundary

The implementation should reuse rather than duplicate:

- Controller formation and recommendation contracts in `src/controller/`;
- activation intent and retention types in `src/controller/types.ts`;
- explicit-target, conflict-safe storage behavior in
  `src/context/storage.ts` and `src/controller/activation-storage.ts`;
- compact session and source-revision validation in `src/context/resume.ts`;
- existing fan-in validation concepts in `src/context/team-delivery.ts`; and
- the repository's native Node test and TypeScript toolchain.

The new deterministic execution contracts belong in a cohesive
`src/execution/` module rather than expanding the Controller into a scheduler.
The implementation plan will fix exact file responsibilities, function
signatures, CLI commands, fixtures, and test order after this written design is
reviewed.

## 14. Sources and evidence status

- OpenAI, [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents):
  current Codex-native subagent availability, orchestration behavior, thread
  visibility, inherited permissions, and custom-agent configuration.
- Anthropic, [How we built our multi-agent research
  system](https://www.anthropic.com/engineering/multi-agent-research-system):
  orchestrator-worker research pattern, parallelism, evaluation, state, and
  coordination-cost evidence.
- MindStudio, [How to build a multi-agent
  workflow](https://www.mindstudio.ai/blog/how-to-build-multi-agent-workflow):
  bounded workers, persistent structured state, failure policy, review, and
  observability guidance.
- Kimi, [Multi-agent systems](https://www.kimi.com/resources/multi-agent):
  composable hierarchical, cooperative, adversarial, heterogeneous, and
  graph-based pattern taxonomy.

The latter three are engineering and vendor accounts, not normative standards.
Product capability claims for this slice rely on current Codex host evidence
and official OpenAI documentation. Local tests prove repository contracts only;
the live reference run proves only the exact Codex app profile and envelope it
records.

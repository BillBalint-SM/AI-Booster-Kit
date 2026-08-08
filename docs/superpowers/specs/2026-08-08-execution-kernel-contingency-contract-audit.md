# Execution Kernel contingency contract audit

**Status:** research and design-input audit; no runtime implementation is
authorized by this document.

**Audited source:** `492d44158869cde4e94e9a0bcc1396616e908bb1`

**Scope:** the Agent-Agnostic Multi-Agent Execution Kernel, its Codex-native
host adapter/runbook, persistence model, and first read-only reference-run
boundary. No external model, API, connector, external read, or external write
was used.

## Executive verdict

The current Kernel is a useful proof of deterministic envelope, graph, result,
artifact, and final-handoff validation, but it is **not yet a complete
operational execution contract**. The observed source-revision mismatch is one
instance of a larger missing layer: the system has no closed, phase-aware
reason registry and no total transition function that maps every detectable
outcome to one canonical node state, run state, evidence requirement, and
retry rule.

Four findings block a trustworthy new multi-agent reference run:

1. A valid worker envelope with `status: STOPPED` or `status: UNKNOWN` is still
   admitted through `RESULT_RECEIVED -> SUCCEEDED`; the status is parsed but is
   not routed. This contradicts the design rule that only the Kernel may accept
   a result as success. [S2] [S5]
2. Source/worktree identity is checked only by the read-only resume evaluator.
   It is not bound to a dispatch, is not verified before spawn/dispatch, and a
   mismatch cannot be terminalized truthfully through `stop-execution`. [S2]
   [S7] [S12]
3. Dispatch, wall-clock, active parallelism, cancellation, and host-thread
   liveness are not enforced as one atomic admission boundary. A run-level stop
   does not terminalize active nodes or prove that native Codex workers were
   interrupted. [S2] [S3] [S4] [S7] [S12]
4. Individual JSON snapshots are hash-checked and mostly replaced atomically,
   but the multi-file mutations are not transactional and there is no
   single-writer lock or crash-recovery journal. A process failure can leave an
   event, graph, checkpoint, artifact, manifest, and final handoff at different
   logical points. [S8]

The correct next unit of work is therefore not a new ad-hoc stop code. It is a
**Contingency Contract** consisting of:

- a closed reason registry with explicit extension rules;
- a total node/run transition table;
- a per-dispatch host/workspace binding attestation;
- two-phase dispatch and verified cancellation semantics;
- enforced budgets and concurrency leases;
- transactional or recoverable persistence;
- evidence resolution, not merely evidence-shape validation; and
- negative, crash, race, replay, and host-conformance tests.

## Research boundary and source map

This audit uses repository source as the primary authority. Historical plans
and the runbook are treated as intended behavior, not proof of implementation.
The failed reference attempt is used only as a normalized incident observation:
the packet required revision `492d441...`, a spawned controller observed a
different revision, and no worker payload was admitted to the run.

| ID | Source and relevance |
| --- | --- |
| S1 | `src/execution/types.ts:190-216,280-321` — result statuses, event vocabulary, resume and final/comparison types. |
| S2 | `src/execution/cli.ts:14-16,42-117,153-204,236-315` — command admission, allowlists, result routing, stop/finalize ordering, thread-ref validation, input reading, and CLI error projection. |
| S3 | `src/execution/graph.ts:45-86,285-355` — graph/hash validation, transitions, readiness, and current parallel limit. |
| S4 | `src/execution/ledger.ts:19-52,138-176,203-255` — event set, active-thread replay, node/run event semantics, and checkpoint projection. |
| S5 | `src/execution/handoff.ts:90-127,142-191,247-281,298-310` — result status parsing and syntactic identity, evidence, scope, follow-up, and safe-content checks. |
| S6 | `src/execution/finalize.ts:13-35,85-134` — handoff identity, final event creation, required-node and claim acceptance rules. |
| S7 | `src/execution/resume.ts:8-47` — source revision, terminal, budget, and thread-visibility resume decisions. |
| S8 | `src/execution/storage.ts:105-225,240-255,285-355,442-457` — staged creation, append/snapshot ordering, artifact/final writes, read-back hashes, symlink checks, and unresolved replacements. |
| S9 | `src/execution/compare.ts:7-29` — comparison identity and final-handoff prerequisite. |
| S10 | `docs/superpowers/specs/2026-08-07-codex-native-multi-agent-runtime-design.md:234-245,295-310,376-396` — intended states, Kernel-only acceptance, error/recovery, and resume behavior. |
| S11 | `docs/superpowers/plans/2026-08-07-agent-agnostic-execution-contract-kernel.md:473-488,784-784,1068-1090,1207-1217` — intended transitions, event vocabulary, resume/comparison rules, and CLI contract. |
| S12 | `docs/operations/codex-native-multi-agent-runbook.md:31-36,53-85,87-117` — immutable source gate, host dispatch sequence, rejection, failure, resume, privacy, and declared limits. |

## Fact, inference, decision, recommendation

### Facts

- The result schema explicitly accepts `READY_FOR_VALIDATION`, `STOPPED`, and
  `UNKNOWN`, while the accept command always writes the artifact and transitions
  the node to `SUCCEEDED`. [S1] [S2] [S5]
- The node type includes `UNKNOWN`, but the event vocabulary contains
  `NODE_STOPPED` and no `NODE_UNKNOWN`. A rejection event is defined as
  `RUNNING -> REJECTED`, while the intended graph path also includes
  `RESULT_RECEIVED -> REJECTED`. [S1] [S4] [S10]
- `stop-execution` accepts four host/user reasons only. It emits a run event but
  performs no node transition and no native interrupt verification. [S2]
- `maxDispatches` is checked during resume only; `maxWallClockMs` has no runtime
  enforcement; and `maxParallel` counts `READY` agent nodes, not active
  `RUNNING` dispatches. [S3] [S7]
- The CLI reads the entire input into memory before JSON parsing and before the
  canonical result-size check. [S2] [S5]
- Evidence validation checks source metadata, kind, scope-shaped path, and
  locator shape, but it does not reopen the claimed file, verify the line range
  against content, or prove that the worker observed the declared checkout.
  [S5]
- Run creation is staged atomically, but later logical mutations span multiple
  files and writes. The ledger append is not part of the same atomic commit as
  graph/checkpoint/artifact/manifest changes. [S8]

### Inferences

- A truthful source mismatch, spawn ambiguity, timeout, cancellation, or late
  response can produce different realities in the Codex host and canonical
  run. Regex-valid agent references are identifiers, not liveness or ownership
  proof.
- A generic CLI output of `{state: "STOPPED"}` for validation/configuration
  exceptions can be mistaken for a persisted terminal run even when no run
  event changed. [S2]
- Hash validation detects many corruptions at load time, but detection without
  a recovery protocol leaves the operator with an ambiguous run rather than a
  deterministic repair or quarantine path.
- A comparison can rely on present final-handoff files even if a crash prevented
  the corresponding terminal ledger event, because comparison checks loaded
  handoffs rather than a terminal event invariant. [S2] [S8] [S9]

### Decisions required before implementation

1. Is the append-only ledger the sole canonical authority, with all snapshots
   rebuilt from it, or will mutations use a transaction/recovery journal across
   ledger, graph, checkpoint, manifest, and artifacts?
2. Which host facts can Codex-native operations actually attest directly:
   workspace identity, checked-out revision, dirty-scope status, agent ID,
   completion state, and interrupt result? Unobservable facts must remain
   `UNKNOWN` rather than becoming self-attested passes.
3. Is a replacement worker ever permitted in the same run? Recommendation: no
   implicit replacement; require a new task/node identity and explicit recovery
   authorization, or start a new run.
4. Does a worker-declared `STOPPED` stop the whole run, or only that node when it
   is optional? Recommendation: required node -> run `STOPPED`; optional node ->
   node `STOPPED`, and the run may later become `COMPLETE_WITH_LIMIT` only if all
   acceptance criteria remain supported.

### Recommendations

- Treat `REJECTED`, `STOPPED`, `UNKNOWN`, and `COMPLETE_WITH_LIMIT` as different
  semantics, never aliases.
- Make every mutating command call one shared transition decision function and
  one persistence commit boundary.
- Perform source/host/budget/terminal checks immediately before dispatch
  admission, not only at preparation or resume.
- Never retry an ambiguous host or persistence result. Reconcile first; retry
  only when identity and prior effect are proven absent.

## Canonical outcome semantics

| Outcome | Meaning | Canonical mutation | Exit/reporting rule |
| --- | --- | --- | --- |
| `REJECTED_INPUT` | A command or payload was inadmissible; no accepted operation occurred. | No node/run state change. Optionally append a sanitized audit rejection only if a valid run identity is established. | Non-zero; output `operation: REJECTED`, not a persisted `STOPPED` claim. |
| `STOPPED` | A known condition makes authorized continuation impossible and the prior effect is determinate. | Terminalize affected active node(s), then run if required; record reason and evidence. | Stable terminal state; no implicit retry. |
| `UNKNOWN` | The host or storage effect cannot be proven present or absent. | Quarantine affected node/run; retain identities and reconciliation action. | Non-zero/attention state; no retry, finalize, or comparison as success. |
| `REJECTED` node | A response was correlated but failed result/evidence/authority validation. | Node terminal `REJECTED`; required node stops run. | Raw payload is not persisted; sanitized code and digest/size may be. |
| `COMPLETE_WITH_LIMIT` | All acceptance criteria are supported, but an allowed non-fatal limitation remains. | Terminal finalization only after required-node/evidence gates. | Success-with-limit; limits are explicit and comparable. |
| `COMPLETE` | All criteria and required nodes succeeded with no unknowns or limits. | Terminal finalization. | Success. |

## Closed reason registry contract

The registry is closed for a schema version: a command cannot invent an
arbitrary uppercase reason. Adding a new reason requires a schema-versioned
registry entry and tests. Unknown/unmapped observations use a single safe
`UNCLASSIFIED_<PHASE>_OUTCOME` that always maps to `UNKNOWN`; they never default
to success or a determinate stop.

Every entry must define:

- `code`, `phase`, `subject` (`COMMAND`, `RUN`, `NODE`, `HOST`, `STORAGE`);
- `determinacy` (`KNOWN_ABSENT`, `KNOWN_PRESENT`, `AMBIGUOUS`);
- allowed prior node/run states and resulting node/run states;
- required normalized evidence fields and forbidden sensitive fields;
- retry/reconcile policy, operator action, and whether finalization/comparison
  is allowed; and
- whether the condition is a contract rejection, operational stop, unknown,
  accepted limit, or integrity/security incident.

### Required reason families

| Family | Representative codes | Default disposition |
| --- | --- | --- |
| Preparation/configuration | `COMMAND_ARGUMENTS_INVALID`, `INPUT_JSON_INVALID`, `ENVELOPE_INVALID`, `GRAPH_INVALID`, `TARGET_ALREADY_EXISTS` | `REJECTED_INPUT`; no run mutation unless run identity was already accepted. |
| Source/worktree identity | `SOURCE_REVISION_MISMATCH`, `WORKTREE_DIRTY_IN_SCOPE`, `WORKSPACE_IDENTITY_MISMATCH`, `SOURCE_UNREADABLE` | Known mismatch -> `STOPPED`; unreadable/ambiguous identity -> `UNKNOWN`. |
| Host capability/instructions | `HOST_PROFILE_UNSUPPORTED`, `HOST_CAPABILITY_UNKNOWN`, `HOST_INSTRUCTION_STATE_UNKNOWN`, `AUTHORITY_NOT_PROVEN` | Known unsupported/denied -> `STOPPED`; uncertain -> `UNKNOWN`. |
| Spawn/routing/identity | `SPAWN_REJECTED`, `SPAWN_FAILED_CONFIRMED`, `SPAWN_OUTCOME_UNKNOWN`, `AGENT_ID_MISSING`, `AGENT_ID_MISMATCH`, `WRONG_AGENT_ROUTE` | Confirmed absent -> `STOPPED`; possibly spawned -> `UNKNOWN`. |
| Dispatch/correlation | `DISPATCH_BUDGET_EXHAUSTED`, `PARALLELISM_EXHAUSTED`, `DISPATCH_IDENTITY_CONFLICT`, `DISPATCH_OUTCOME_UNKNOWN`, `LATE_RESULT`, `DUPLICATE_RESULT` | Pre-effect limit -> reject/stop; ambiguous effect -> `UNKNOWN`; exact duplicate -> idempotent no-op. |
| Result transport/schema | `RESULT_TOO_LARGE`, `RESULT_JSON_INVALID`, `RESULT_FIELDS_INVALID`, `RESULT_FOREIGN`, `RESULT_STALE`, `RESULT_STATUS_STOPPED`, `RESULT_STATUS_UNKNOWN` | Malformed/correlated -> node `REJECTED`; explicit status -> node/run stop or unknown by requiredness. |
| Evidence/semantic scope | `EVIDENCE_MISSING`, `EVIDENCE_HASH_MISMATCH`, `EVIDENCE_PATH_MISSING`, `EVIDENCE_LINE_INVALID`, `EVIDENCE_SCOPE_VIOLATION`, `CLAIM_UNSUPPORTED`, `CONTENT_FORBIDDEN` | Node `REJECTED`; integrity ambiguity may elevate run to `UNKNOWN`. |
| Deadline/budget | `WALL_CLOCK_EXPIRED`, `WAIT_TIMEOUT_CONFIRMED_ACTIVE`, `WAIT_TIMEOUT_THREAD_UNKNOWN`, `REPAIR_BUDGET_EXHAUSTED`, `NODE_BUDGET_EXHAUSTED` | Known pre-dispatch exhaustion -> `STOPPED`; uncertain in-flight effect -> `UNKNOWN`; optional limit only under final acceptance rules. |
| Cancellation/interrupt | `USER_CANCEL_REQUESTED`, `INTERRUPT_CONFIRMED`, `INTERRUPT_FAILED`, `INTERRUPT_OUTCOME_UNKNOWN`, `LATE_RESULT_AFTER_CANCEL` | Only confirmed termination permits `STOPPED`; otherwise `UNKNOWN`. |
| Persistence/integrity | `WRITER_CONFLICT`, `PARTIAL_MUTATION`, `LEDGER_CORRUPT`, `SNAPSHOT_DIVERGED`, `MANIFEST_DIVERGED`, `PENDING_REPLACEMENT`, `STORAGE_UNAVAILABLE` | No retry; quarantine as `UNKNOWN` or integrity incident until reconciled. |
| Resume/recovery | `TERMINAL_RUN`, `ACTIVE_THREAD_MISSING`, `RUNTIME_EVIDENCE_STALE`, `RECOVERY_IDENTITY_MISMATCH`, `NO_RESUMABLE_WORK` | Read-only decision plus explicit mutation command if terminalization is authorized. |
| Finalize/compare | `FINALIZATION_PRECONDITION_FAILED`, `FINALIZATION_ALREADY_EXISTS`, `PARTIAL_FINALIZATION`, `RUNS_NOT_COMPARABLE`, `TERMINAL_LEDGER_MISSING` | Reject before effect; partial/ambiguous -> `UNKNOWN`. |
| Security/privacy/permission | `PATH_ESCAPE`, `SYMLINK_BOUNDARY`, `SENSITIVE_CONTENT`, `AUTHORITY_EXCEEDED`, `PERMISSION_DENIED`, `UNTRUSTED_INSTRUCTION` | Reject/stop; any uncertain external effect -> `UNKNOWN`. |
| Operator/version | `UNSUPPORTED_SCHEMA_VERSION`, `UNSUPPORTED_RUNTIME_VERSION`, `OPERATOR_PROTOCOL_VIOLATION`, `CLOCK_INVALID` | Reject or stop before dispatch; no compatibility fallback. |

## Total transition contract

The following table is the minimum total decision surface. `R` means required
node and `O` optional node. Every event not listed for the current state is
`REJECTED_INPUT` with no mutation. A terminal run rejects every later mutation
except read-only inspect/compare and a separately designed reconciliation
operation.

| Current node/run | Observation | Node result | Run result | Required evidence / note |
| --- | --- | --- | --- | --- |
| no run | invalid preparation | none | none | Sanitized validation code; no `STOPPED` run claim. |
| no run | valid preparation fully persisted | initial readiness | `READY` | Envelope/graph/storage identity read-back. |
| `READY` / active | source or workspace known mismatch | `STOPPED` if node selected | `STOPPED` | Host binding attestation with expected/observed normalized identities. |
| `READY` / active | source/workspace cannot be observed | `UNKNOWN` if selected | `UNKNOWN` | Missing observation and reconciliation action. |
| `READY` / active | dispatch limit/concurrency/deadline exhausted before spawn | unchanged or `STOPPED` by policy | active or `STOPPED` | No host effect occurred. |
| `READY` / active | dispatch intent durably recorded | `DISPATCHING` or equivalent lease state | `RUNNING` | Correlation ID; no agent ref yet. |
| dispatching / active | spawn returns verified agent ref | `RUNNING` | `RUNNING` | Host profile, agent ref, source binding, observed time. |
| dispatching / active | spawn confirmed absent | `STOPPED` | `STOPPED` for R; active/limit for O | Confirmed no worker exists. |
| dispatching / active | spawn effect ambiguous | `UNKNOWN` | `UNKNOWN` | Never replacement-spawn blindly. |
| `RUNNING` / active | valid `READY_FOR_VALIDATION` result | `RESULT_RECEIVED`, then `SUCCEEDED` only after resolved evidence | active | Exact correlation, digest, evidence read-back. |
| `RUNNING` / active | valid worker `STOPPED` | `STOPPED` | `STOPPED` for R; active for O | Worker reason is validated but Kernel decides terminal scope. |
| `RUNNING` / active | valid worker `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | Reconciliation required. |
| `RUNNING` / active | malformed/foreign/stale result with safe correlation | `REJECTED` | `STOPPED` for R; active for O | Sanitized rejection; no raw payload. |
| `RUNNING` / active | payload cannot safely establish identity | unchanged or quarantined | `UNKNOWN` | Do not attach untrusted payload to a guessed node. |
| `RUNNING` / active | wait timeout, thread proven active | remains `RUNNING` or cancellation substate | `WAITING_FOR_HUMAN`/policy | Timeout alone is not termination. |
| `RUNNING` / active | thread no longer observable and completion unknown | `UNKNOWN` | `UNKNOWN` | Preserve task/agent refs. |
| `RUNNING` / active | user cancellation + interrupt confirmed | `STOPPED` | `STOPPED` when all active work is confirmed terminated | Interrupt receipt. |
| `RUNNING` / active | user cancellation + interrupt ambiguous/failed | `UNKNOWN` | `UNKNOWN` | Never report confirmed stop. |
| terminal node / active | exact same correlated result repeats | unchanged | unchanged | Idempotent only when canonical digest is identical. |
| terminal node / active | different result for same correlation | unchanged | `UNKNOWN` or integrity stop | Conflicting effect; no overwrite. |
| active run | storage mutation partly committed | unknown until journal reconciliation | `UNKNOWN` | No command retry before recovery read-back. |
| active run | all required criteria resolved; optional node stopped | terminal nodes | `COMPLETE_WITH_LIMIT` only if criteria all supported | Explicit accepted limit. |
| active run | finalization preconditions pass and commit is atomic | unchanged | requested terminal state | Terminal event and handoff become visible together. |
| terminal run | any mutating command or late result | unchanged | unchanged | Reject; record sanitized late observation only if designed. |
| two terminal runs | identity and terminal invariants match | unchanged | unchanged | Comparison allowed; metrics may remain `UNKNOWN`. |
| any run | unclassified phase outcome | affected node `UNKNOWN` | `UNKNOWN` | Registry extension required before automated recovery. |

## Contingency coverage matrix

Status meanings: `COVERED` = deterministic implementation and relevant test
exist; `PARTIAL` = some detection exists but disposition/evidence/recovery is
incomplete; `MISSING` = no contract path; `CONTRADICTED` = implementation can
produce a state forbidden by design; `UNKNOWN` = Codex-host fact is not yet
proven observable.

Audit snapshot: **61 contingency classes** — 5 `COVERED`, 28 `PARTIAL`,
19 `MISSING`, 6 `CONTRADICTED`, and 3 host facts `UNKNOWN`. A covered row means
the named present behavior is covered; its Required test column may still add
hardening beyond the current contract.

| ID | Trigger / real situation | Detection and deterministic reaction required | Terminal / code / retry | Current status and evidence | Required test |
| --- | --- | --- | --- | --- | --- |
| P01 | Invalid CLI flags or missing input | Reject before run lookup/mutation; distinguish command rejection from run stop. | none / `COMMAND_ARGUMENTS_INVALID` / correct and resubmit | `CONTRADICTED`: CLI reports `state: STOPPED` for configuration failure. [S2] | Assert no run event/files change and output says rejected. |
| P02 | Malformed JSON | Stream-size cap, parse safely, reject without raw persistence. | none or node `REJECTED` if safely correlated / `INPUT_JSON_INVALID` / no blind retry | `PARTIAL`: safe parse error exists, but input is accumulated without a byte cap. [S2] | Oversized invalid stream, truncated UTF-8, deep JSON, no memory blow-up. |
| P03 | Envelope/graph invalid, cyclic, over node/depth limits | Validate before target creation; preserve exact code. | none / family-specific / fix input | `COVERED` for structure, hash, cycle, node/depth checks. [S3] | Existing positives plus each boundary and one-over limit. |
| P04 | Target run already exists | Fail before overwrite. | none / `TARGET_ALREADY_EXISTS` / use new run ID | `COVERED`: staged creation and existence conflict. [S8] | Concurrent same-ID creation by two processes. |
| P05 | Unsupported schema/runtime version | Reject explicitly; no permissive fallback. | none / `UNSUPPORTED_*_VERSION` / upgrade intentionally | `PARTIAL`: exact schema literals exist; runtime compatibility policy is not part of the run. [S1] [S5] | Older/newer schema and unsupported stable runtime. |
| S01 | Expected source SHA differs from active checkout | Check immediately before each dispatch and persist normalized attestation. | node/run `STOPPED` / `SOURCE_REVISION_MISMATCH` / new run or corrected checkout | `MISSING`: resume-only textual decision; no stop code or dispatch binding. [S2] [S7] | Exact incident reproduction; assert zero spawn and truthful terminal state. |
| S02 | Audited path dirty after pinned commit | Resolve scoped Git status before dispatch. | node/run `STOPPED` / `WORKTREE_DIRTY_IN_SCOPE` / clean or new immutable source | `MISSING`: runbook requires it; Kernel has no runtime field/check. [S12] | Scoped dirty, unrelated dirty, untracked in-scope, submodule/worktree case. |
| S03 | Correct SHA in a different repository/worktree | Bind normalized repository/workspace identity plus revision. | `STOPPED` / `WORKSPACE_IDENTITY_MISMATCH` / correct target | `MISSING`: generic repository locator and self-declared revision are insufficient. [S5] [S7] | Same SHA-shaped value in wrong repo; sibling worktree. |
| S04 | Source cannot be read or Git state is ambiguous | Do not infer mismatch; preserve unknown observation. | `UNKNOWN` / `SOURCE_UNREADABLE` / reconcile only | `MISSING` | Git unavailable, unsafe directory, detached/unborn/partial state. |
| H01 | Host profile/capability unsupported | Preflight against declared host profile and required native operations. | `STOPPED` / `HOST_PROFILE_UNSUPPORTED` / change host/plan | `PARTIAL`: runbook describes Codex-only actions; Kernel carries no verified capability receipt. [S12] | Host conformance fixture with missing spawn/wait/interrupt. |
| H02 | Capability, sandbox, instruction loading, or authority state unobservable | Keep separate host-behavior and security verdicts. | `UNKNOWN` / `HOST_CAPABILITY_UNKNOWN` / human decision | `UNKNOWN`: cannot be proven from regex agent refs or worker self-report. | Codex-native conformance probe; negative self-attestation test. |
| H03 | Worker sees different instructions/context than controller | Validate immutable packet identity and forbid worker from widening scope/authority. | reject/stop or `UNKNOWN` if effect ambiguous | `PARTIAL`: packet/result identities exist; instruction-load evidence does not. [S5] | Missing/extra host instruction, malicious repo instruction, scope escalation. |
| A01 | Spawn fails before any worker exists | Record dispatch intent first; prove absence; terminalize selected node/run. | `STOPPED` / `SPAWN_FAILED_CONFIRMED` / no implicit replacement | `PARTIAL`: run-level code exists, node/intent evidence does not. [S2] [S12] | Native spawn rejection with zero agent ID. |
| A02 | Spawn returns no/invalid agent ID but may have created worker | Mark ambiguous; interrupt any observed candidate; do not redispatch. | `UNKNOWN` / `SPAWN_OUTCOME_UNKNOWN` / reconcile | `MISSING`; current runbook groups missing ID with stop. [S12] | Host call timeout/no ID after side effect. |
| A03 | Wrong agent/team/route receives task | Verify returned agent identity against intended packet and capability class. | `STOPPED` if no work; `UNKNOWN` if work may run / `WRONG_AGENT_ROUTE` | `MISSING` | Misrouted packet and reused agent ref. |
| A04 | Worker spawns child despite prohibition | Detect host topology if observable; interrupt and quarantine. | `UNKNOWN` or security stop / `UNAUTHORIZED_DELEGATION` | `UNKNOWN`: prohibition is textual, not Kernel-enforced. [S12] | Host conformance observation and unobservable-case handling. |
| D01 | Dispatch budget exhausted | Check and reserve atomically before spawn. | pre-effect reject/`STOPPED` / `DISPATCH_BUDGET_EXHAUSTED` | `MISSING`: checked only during resume and only with `>` after effects. [S7] | At limit, one-over, concurrent last slot. |
| D02 | Active parallelism exhausted | Count/lease actual dispatching and running agent nodes. | unchanged / `PARALLELISM_EXHAUSTED` / wait for known completion | `CONTRADICTED`: current limit counts `READY`, not active workers. [S3] | Two concurrent dispatch commands against last slot. |
| D03 | Process crashes after spawn but before dispatch event | Two-phase intent/confirmation; startup reconciliation. | `UNKNOWN` / `DISPATCH_OUTCOME_UNKNOWN` | `MISSING`: current runbook spawns then records agent ID. [S12] | Fault injection between host return and ledger append. |
| D04 | Process crashes after dispatch event but before graph snapshot | Replay or journal must reconstruct one canonical state. | reconciled `RUNNING` or `UNKNOWN` / `PARTIAL_MUTATION` | `PARTIAL`: load detects disagreement; no repair protocol. [S2] [S8] | Kill after append, before graph/checkpoint write. |
| D05 | Duplicate exact dispatch command | Same correlation/digest becomes idempotent no-op; never spawn twice. | unchanged / `DUPLICATE_DISPATCH` / no retry needed | `MISSING`: second command sees non-READY and rejects, but cannot prove host duplication. [S2] | Concurrent duplicate and replay after response loss. |
| D06 | Conflicting dispatch for same node/task | Quarantine; preserve both normalized identities. | `UNKNOWN` / `DISPATCH_IDENTITY_CONFLICT` | `PARTIAL`: ledger-head conflict exists; no host reconciliation. [S8] | Same node with different agent refs. |
| R01 | Valid `READY_FOR_VALIDATION` result | Correlate, resolve evidence, commit receive+accept atomically. | node `SUCCEEDED` / no retry | `PARTIAL`: validation exists; multi-step persistence is not atomic. [S2] [S5] [S8] | Crash at every boundary and exact replay. |
| R02 | Valid worker `STOPPED` result | Route status; validate reason/follow-up; Kernel decides node/run scope. | node `STOPPED`; run by requiredness / `RESULT_STATUS_STOPPED` | `CONTRADICTED`: accepted as `SUCCEEDED`. [S1] [S2] [S5] | Required and optional worker stop envelopes. |
| R03 | Valid worker `UNKNOWN` result | Route to node/run unknown and reconciliation action. | node/run `UNKNOWN` / `RESULT_STATUS_UNKNOWN` | `CONTRADICTED`: accepted as `SUCCEEDED`. [S1] [S2] [S5] | Unknown envelope can never unlock dependents. |
| R04 | Malformed, foreign, stale, oversized, forbidden result with safe identity | Reject node, stop required run, store no raw payload. | node `REJECTED`; run `STOPPED` / exact validation code | `PARTIAL`: separate reject command exists; accept does not atomically perform intended rejection path. [S2] [S11] | Each rejection class through real CLI input. |
| R05 | Result identity cannot be safely established | Do not guess a node or persist raw content; mark run unknown only if a host effect exists. | `UNKNOWN` or command rejection / `RESULT_IDENTITY_UNRESOLVED` | `MISSING`: generic CLI `STOPPED` output does not mutate run. [S2] | Foreign run/node and malicious identity fields. |
| R06 | Exact duplicate result after lost acknowledgement | Compare canonical digest; return prior accepted outcome. | unchanged / idempotent receipt | `PARTIAL`: artifact collision rejects; no semantic idempotent receipt. [S8] | Identical replay before/after terminal. |
| R07 | Different second result for same task/node | Preserve conflict; never overwrite accepted artifact. | run `UNKNOWN` or integrity stop / `RESULT_CONFLICT` | `PARTIAL`: artifact conflict exists without total run disposition. [S8] | Same task identity, different digest. |
| R08 | Late result after node/run terminal, cancel, or graph repair | Reject as late; never mutate graph/evidence/final output. | unchanged / `LATE_RESULT` | `MISSING`: mutating commands lack a shared terminal-run guard. [S2] | Late result after STOPPED, UNKNOWN, COMPLETE, and repair. |
| E01 | Evidence source/kind/scope locator malformed | Reject deterministically. | node `REJECTED` / evidence/scope code | `COVERED` for syntactic source/kind/scope shape. [S5] | Negative paths, duplicate IDs, forbidden content. |
| E02 | Claimed repository file/line does not exist or content hash differs | Reopen pinned source and resolve exact line/content before acceptance. | node `REJECTED` / `EVIDENCE_PATH_MISSING` or `EVIDENCE_HASH_MISMATCH` | `MISSING`: locator is not dereferenced. [S5] | Missing file, past-EOF line, changed content, symlink escape. |
| E03 | Worker self-asserts correct revision while running elsewhere | Evidence resolver uses controller-observed host binding, not worker claim. | `STOPPED`/`UNKNOWN` by observability | `MISSING`; this is the reference incident class. [S5] [S7] | Wrong checkout with syntactically valid result evidence. |
| E04 | Command/artifact evidence ID exists but payload is absent/untracked | Resolve manifest/hash and accepted predecessor ownership. | reject or `UNKNOWN` on storage ambiguity | `PARTIAL`: accepted artifact hashes are read; evidence index is created empty and evidence is derived from results. [S8] | Missing artifact, untracked artifact, duplicate evidence ID. |
| E05 | Claim is supported syntactically but evidence does not semantically prove it | Maker-checker or deterministic domain resolver must validate criterion-specific proof. | node `REJECTED` or checker conflict | `PARTIAL`: reference existence is checked, semantic entailment is not Kernel-proven. [S5] [S6] | Evidence from wrong line/content but valid hash and scope. |
| T01 | Wall-clock budget expires before dispatch | Compare monotonic elapsed budget and reject before spawn. | `STOPPED` / `WALL_CLOCK_EXPIRED` | `MISSING`: budget field is declared but not enforced. [S1] [S7] | Boundary, clock skew, process restart accounting. |
| T02 | Wait timeout while thread is known active | Timeout is observation, not termination; ask/interrupt per policy. | running/waiting or `UNKNOWN`, never automatic success | `CONTRADICTED`: stop command maps timeout directly to run `UNKNOWN` while leaving node running. [S2] | Active thread at timeout, then later completes. |
| T03 | Thread disappears or host cannot report it | Preserve task/agent identity; run unknown. | node/run `UNKNOWN` / `ACTIVE_THREAD_MISSING` | `PARTIAL`: resume returns read-only `UNKNOWN` but persists no state. [S7] | Missing from both lists and stale host snapshot. |
| C01 | User cancels before any spawn | Confirm no active worker; stop selected work. | `STOPPED` / `USER_CANCELLED_BEFORE_DISPATCH` | `MISSING`: generic cancel code lacks phase. [S2] | Cancel pre-intent and after intent-before-spawn. |
| C02 | User cancels with active workers; interrupts confirmed | Record one interrupt receipt per active agent, terminalize nodes then run. | `STOPPED` / `INTERRUPT_CONFIRMED` | `MISSING`: current stop event carries no node/receipt and active refs remain. [S2] [S4] | All interrupts confirmed; one worker already completed. |
| C03 | Interrupt fails or response is ambiguous | Never claim all workers stopped. | node/run `UNKNOWN` / `INTERRUPT_FAILED` or `INTERRUPT_OUTCOME_UNKNOWN` | `CONTRADICTED`: `USER_CANCELLED` maps directly to run STOPPED. [S2] | Mixed interrupt outcomes and late completion. |
| B01 | Repair/node/graph budget exhausted | Reserve/check at mutation boundary; optional limit only if acceptance survives. | stop/limit / exact budget code | `PARTIAL`: graph structural limits exist; repair-cycle exhaustion checked only on resume. [S3] [S7] | Concurrent repair proposal and at-limit mutation. |
| B02 | Checker asks for out-of-scope or unevidenced repair | Reject mutation; preserve checker output/conflict. | node/run stop or limit / `REPAIR_SCOPE_VIOLATION` | `PARTIAL`: graph mutation validates accepted evidence/scope, but full terminal policy is absent. [S2] | Cross-scope repair, duplicate repair, checker re-run. |
| B03 | Fan-in has missing/rejected/unknown predecessor | Synthesis remains pending; cannot prepare/dispatch/finalize as success. | active, stop, or unknown by predecessor status | `PARTIAL`: readiness requires `SUCCEEDED`, but STOPPED/UNKNOWN result misrouting can unlock it. [S2] [S3] | Each predecessor terminal state and optional-node policy. |
| X01 | Two controller processes mutate one run | Acquire single-writer lease or use compare-and-swap transactional append. | loser rejected; ambiguous write -> `UNKNOWN` / `WRITER_CONFLICT` | `MISSING`: read/check/append is raceable; no lock. [S8] | Parallel dispatch/result/finalize processes. |
| X02 | Crash during ledger append/checkpoint/graph update | Recover from committed transaction/journal; partial append is quarantined. | recovered or `UNKNOWN` / `PARTIAL_MUTATION` | `PARTIAL`: hash/replay detects many mismatches, no automated recovery. [S8] | Power-loss fault after every filesystem call. |
| X03 | Crash during result file/manifest/event update | Artifact visibility and node acceptance become one commit. | recovered or `UNKNOWN` | `PARTIAL`: orphan result yields manifest-review ambiguity. [S8] | Orphan file, manifest-only, accepted-event-only permutations. |
| X04 | Crash during final JSON/Markdown/manifest/event update | Terminal handoff and terminal ledger state become one commit. | recovered or `UNKNOWN` / `PARTIAL_FINALIZATION` | `PARTIAL`: partial file detection exists; event is appended later. [S2] [S8] | Every partial finalization permutation. |
| X05 | Ledger/hash/manifest corruption or manual edit | Fail closed; preserve forensic copy; no silent repair. | run `UNKNOWN`/integrity incident | `PARTIAL`: many hashes and untracked files are detected, but recovery is missing. [S4] [S8] | Bit flips, truncated line, reordered event, untracked file. |
| X06 | Symlink/path escape/storage root swap | Resolve real paths and reject links/escape at every open, including evidence files. | reject/stop / security code | `PARTIAL`: run storage checks are strong; repository evidence resolution is absent. [S8] | Junction/symlink swap and TOCTOU race. |
| U01 | Same-session resume with matching source and visible threads | Rebuild from canonical state and return ready/completed work without rerun. | `RESUME` | `PARTIAL`: read-only evaluation exists; runtime evidence is minimal and not freshness-bounded. [S7] | Exact state, stale timestamp, duplicate/foreign agent refs. |
| U02 | Cross-session resume | Require a separately proven host/session capability; otherwise stop/unknown. | `UNKNOWN` / `CROSS_SESSION_THREAD_UNPROVEN` | `UNKNOWN` and explicitly not executed by runbook. [S12] | New task/session cannot claim prior thread liveness. |
| U03 | Resume detects mismatch/budget/terminal state | Return decision and optionally invoke explicit terminalization/reconciliation command. | no hidden mutation | `PARTIAL`: decision is correct but canonical run remains unchanged. [S7] | Operator follows decision; later commands remain blocked. |
| F01 | Finalize before required success/evidence coverage | Reject with no file/event mutation. | unchanged / finalization precondition code | `COVERED` for core required-node/claim rules. [S6] | Each unsupported, duplicate, unknown, limit case. |
| F02 | Finalize twice or mutate after terminal | Exact duplicate returns prior receipt; conflict rejects; all other mutations barred. | terminal unchanged | `PARTIAL`: existing handoff conflicts, but shared terminal mutation guard is absent. [S2] [S8] | Duplicate exact/different final, repair/result/dispatch after terminal. |
| F03 | Compare handoff files without matching terminal ledger/checkpoint | Require terminal event, checkpoint, artifact, and handoff agreement for both runs. | comparison rejected / `TERMINAL_LEDGER_MISSING` | `MISSING`: comparison checks identity and final-handoff presence only. [S9] | Handoff present after pre-event crash. |
| F04 | Runs differ in identity, source, criteria, or evidence policy | Reject comparison and report normalized mismatch dimensions. | unchanged / `RUNS_NOT_COMPARABLE` | `COVERED` at aggregate identity; diagnostic detail is limited. [S9] | One mismatch per identity field. |
| Q01 | Sensitive data, raw prompt/transcript, credential, arbitrary Personal path | Reject before persistence/logging; sanitize error evidence. | reject/stop / security code | `PARTIAL`: content/storage policies exist; error/evidence taxonomy is incomplete. [S5] [S12] | Secret corpus, encoded variants, absolute paths, accessor objects. |
| Q02 | Authority/scope/permission is widened during recovery | Stop; require fresh explicit authorization; never auto-broaden. | `STOPPED` / `AUTHORITY_EXCEEDED` | `PARTIAL`: result/follow-up scope checks exist; recovery workflow not modeled. [S5] | Replacement worker, expanded path, write request. |
| O01 | Operator runs commands out of order or against wrong run/node | Shared state/identity gate rejects without mutation and shows exact next valid actions. | rejected / `OPERATOR_PROTOCOL_VIOLATION` | `PARTIAL`: individual state checks exist; output often masquerades as STOPPED. [S2] | Full command permutation and wrong-run matrix. |
| O02 | Clock moves backward/forward or timestamps are stale | Use monotonic duration plus recorded wall time; reject invalid/future host evidence. | `UNKNOWN` or reject / `CLOCK_INVALID` | `MISSING`: ISO shape is checked; freshness and monotonic budget are not. [S7] | Clock skew, resume after restart, future observation. |

## Recovery and idempotency rules

1. **No blind retry.** After one unexpected or ambiguous outcome, stop the
   command sequence, preserve normalized evidence, reload canonical state, and
   reconcile the exact correlation ID.
2. **Exact duplicate:** same operation type, run/node/task/correlation identity,
   canonical payload digest, and expected prior state returns the original
   receipt without a new event or host action.
3. **Conflicting duplicate:** same identity with a different digest or target is
   an integrity conflict; do not overwrite, merge, or choose the later value.
4. **Replacement worker:** never reuse the same dispatch identity. A replacement
   requires a new graph mutation/node/task identity and reason, or a new run,
   plus explicit authorization after the original effect is known.
5. **Late response:** a result after cancellation, repair replacement, or run
   terminalization cannot change accepted evidence or reopen the run.
6. **Storage ambiguity:** commands are read-only until journal/ledger recovery
   establishes one committed prefix. Do not delete orphan files automatically.
7. **Operator correction:** fixing configuration/source/host state does not
   retroactively resume a terminal run. Resume only a non-terminal run whose
   immutable identity and host facts still match.

## Required host/workspace binding

The canonical source identity remains host-agnostic, but every native dispatch
needs a separate, normalized host binding:

```text
dispatchBindingVersion
runId / nodeId / taskId / dispatchCorrelationId
hostProfileId / hostSessionId (opaque, normalized)
workspaceIdentity (opaque repository/worktree identity; no Personal path)
expectedSourceRevision / observedSourceRevision
auditedScopeDirtyState: CLEAN | DIRTY | UNKNOWN
agentRef: null before spawn, normalized ref after spawn
spawnOutcome: INTENDED | CONFIRMED | ABSENT | UNKNOWN
observedAt / evidenceDigest
```

The binding must be controller-observed. A worker may echo it for correlation,
but cannot establish its own checkout, authority, sandbox, or host liveness.

## Two-phase dispatch protocol

1. Load and validate the run; reject terminal or ambiguous storage state.
2. Resolve source/workspace/host capability and dirty-scope evidence.
3. Atomically reserve dispatch, parallel, wall-clock, and node budgets.
4. Persist `DISPATCH_INTENDED` with correlation ID and null agent ref.
5. Call the Codex-native spawn operation exactly once.
6. Persist one of `DISPATCH_CONFIRMED`, `SPAWN_ABSENT`, or
   `SPAWN_OUTCOME_UNKNOWN` with normalized host evidence.
7. Only `DISPATCH_CONFIRMED` moves the node to `RUNNING` and permits a result.
8. Cancellation separately records request, one outcome per active agent, node
   transitions, then the run transition. `STOPPED` requires confirmed absence
   of active work; otherwise the result is `UNKNOWN`.

## Persistence invariant

Choose and implement one of these before the next live pipeline:

- **Ledger authority:** one durable append is the only commit point; graph,
  checkpoint, manifest, evidence index, and final views are reproducible
  projections rebuilt after a crash; artifact content is content-addressed and
  referenced only by a committed event.
- **Recovery journal:** every logical mutation writes a prepared transaction,
  durable content, and a committed marker under a single-writer lease; startup
  deterministically completes or quarantines the transaction.

In either model, loaders must distinguish recoverable projection drift from
canonical ledger corruption. Silent deletion, overwrite, rollback, or choosing
the newest file is forbidden.

## Verification programme

### Contract tests

- Generate tests from the reason registry so every code has allowed phases,
  prior states, node/run disposition, evidence schema, retry policy, and at
  least one negative case.
- Generate a state-machine matrix: every node event against every node state,
  every run event/command against every run state, required and optional nodes.
- Verify worker statuses separately: `READY_FOR_VALIDATION`, `STOPPED`, and
  `UNKNOWN` can never share the same transition path.

### Fault and race tests

- Inject failure after every ledger, graph, checkpoint, artifact, manifest,
  evidence-index, final JSON, and final Markdown filesystem action.
- Run concurrent dispatch, result admission, repair, stop, and finalize
  processes against one run.
- Exercise acknowledgement loss and exact/conflicting duplicate commands.
- Exercise timeout/cancel with workers completing before, during, and after
  interrupt.

### Security and boundary tests

- Path traversal, symlink/junction swap, storage-root replacement, unsafe file
  type, untracked artifact, malformed accessor object, oversized/deep input,
  secret-like content, arbitrary URL, and absolute Personal path.
- Source evidence from a wrong repository, sibling worktree, dirty scoped path,
  deleted/renamed file, invalid line range, and content/hash mismatch.

### Codex-native host conformance

- Prove which native observations are actually available for spawn identity,
  task/workspace binding, completion, wait timeout, interrupt, and cross-session
  visibility.
- Record unsupported/unobservable facts as `UNKNOWN`; do not replace evidence
  with agent self-report.
- Run the reference pipeline only after the exact host profile passes the
  required behavioral contract. This remains behavior evidence, not a sandbox
  or security-boundary certification.

## Prioritized implementation slices

Each slice is independently reviewable and must remain uncommitted until the
user gives separate commit approval.

1. **Outcome and reason semantics:** introduce the reason registry and canonical
   command outcome; stop reporting non-mutating command rejection as persisted
   `STOPPED`.
2. **Total state routing:** add terminal-run guards, node `UNKNOWN` event/path,
   correct `RESULT_RECEIVED -> REJECTED`, and route worker `STOPPED`/`UNKNOWN`
   without accepting them as success.
3. **Source and host binding:** implement normalized per-dispatch workspace,
   source, dirty-scope, host-profile, and agent identity evidence.
4. **Two-phase dispatch and cancellation:** durable intent/confirmation,
   verified interrupt receipts, late-result handling, and no blind replacement.
5. **Budget and concurrency admission:** reserve dispatch/repair/parallel slots,
   enforce monotonic wall-clock deadlines, and cover races.
6. **Recoverable persistence:** select ledger authority or recovery journal,
   add single-writer control, and make result/finalization visibility atomic.
7. **Evidence resolver:** reopen pinned repository/artifact/command evidence and
   verify content, path, line, hash, source, and predecessor ownership.
8. **Resume/finalize/compare invariants:** explicit reconciliation command,
   terminal ledger/handoff agreement, idempotent duplicate receipts, and no
   post-terminal mutation.
9. **Generated negative/chaos/host suite:** reason/state matrix, crash points,
   races, cancellation, security boundaries, and exact Codex-native conformance.
10. **Reference rerun:** create a new run from one clean immutable source only
    after slices 1-9 pass. Preserve the failed attempt as evidence; do not edit
    it into a successful run.

## Exit criteria for a new real reference run

The new Codex-native Multi-Agent Pipeline may start only when all are true:

- source revision, repository/worktree identity, and in-scope cleanliness are
  controller-observed and bound to every dispatch;
- all reason codes and transitions used by the run exist in the registry;
- worker `STOPPED` and `UNKNOWN` envelopes cannot become `SUCCEEDED`;
- dispatch/wall-clock/parallel/repair budgets are reserved and enforced before
  side effects;
- spawn, timeout, cancellation, interrupt, late, duplicate, and ambiguous
  outcomes have tested deterministic dispositions;
- persistence crash and concurrent-writer tests establish one recoverable
  canonical state;
- evidence is resolved against the pinned source rather than trusted as a
  worker assertion;
- terminal runs reject later mutation and comparison requires terminal
  ledger/checkpoint/handoff agreement;
- the exact Codex host profile has passed the required native behavior probes;
  and
- the full repository gate and focused contingency suite pass on the same
  immutable revision.

## Bounded conclusion

The current multi-agent run must remain unpromoted. Its source mismatch was a
successful proof that the packet stop condition mattered, but it also exposed
that the Kernel could not represent and persist the real host outcome. The
next safe deliverable is the reviewed implementation plan for slices 1-3,
followed by sequential implementation in the main task. A fresh real pipeline
run belongs only after the broader contingency contract, recovery boundary,
and host-conformance gates are implemented and verified.

# Source/worktree and host-evidence binding design

**Status:** review draft incorporating the accepted design decisions;
implementation has not started.

**Approved source baseline:**
`daae4ee413b6de47777a43ca091efba97da0ac00`

**Delivery slice:** Source/Worktree + Host Evidence binding, implemented before
two-phase Dispatch and verified cancellation.

**Execution boundary:** local and read-only. This design does not call an
external model, API, connector, or service and does not invoke a Codex worker.

## Governing inputs

This design closes the per-dispatch source and host binding gap identified by
the [Execution Kernel contingency contract audit](2026-08-08-execution-kernel-contingency-contract-audit.md).
It preserves the host and Kernel boundaries in the
[Codex-native multi-agent runtime design](2026-08-07-codex-native-multi-agent-runtime-design.md)
and consumes, without weakening, the runtime receipt, workspace identity, and
read-only SQLite session from the
[transactional persistence and runtime-binding design](2026-08-08-transactional-persistence-runtime-binding-design.md).

Repository source and accepted repository designs are authoritative for this
slice. No version-sensitive external library or service decision is made, so
Context7 or another external documentation source is not required.

## Objective

Provide one deterministic, agent-agnostic admission answer immediately before
a future dispatch:

> Is this exact task, from this exact run and graph revision, still bound to
> the expected source, clean audited worktree scope, current controller
> session, and required Codex-native host capabilities?

The answer is a read-only `DispatchReadinessReceipt`. It is evidence for a
future dispatch decision, not the dispatch decision itself.

## Success statement

This slice succeeds when the Kernel can inspect a prepared node and return
exactly one of `READY`, `STOPPED`, or `UNKNOWN` while proving all of the
following without repository or execution-database mutation:

- the run, node, task packet, envelope, and graph revision are exact;
- the observed Git worktree is the workspace already bound to the run;
- every node source is observed at its expected immutable revision;
- every explicit audited path is clean;
- the host receipt belongs to the same controller runtime and host session;
- all required Codex-native controller capabilities are supported, with
  authority and instruction state observed; and
- every output is bounded, canonical, digest-bound, normalized, and free of
  raw personal paths or host output.

## Non-goals

This slice does not:

- spawn, wait for, message, or interrupt an agent;
- reserve dispatch, wall-clock, or parallelism budget;
- write an operation intent, event, graph transition, checkpoint, or receipt
  to SQLite;
- consume a readiness receipt or make it single-use;
- implement two-phase dispatch, cancellation, reconciliation, or retry;
- resolve worker evidence or accept a worker result;
- certify sandboxing, security-boundary enforcement, plugin isolation, or
  hidden host behavior;
- support Claude Code, Cursor, a remote repository, or a network filesystem;
- perform the immutable-SHA multi-agent reference run; or
- add an external LLM, model API, cloud service, credential, or paid runtime.

## Accepted design decisions

1. The Kernel defines an agent-agnostic host-evidence contract and initially
   admits only the `CODEX_APP_NATIVE_V1` profile.
2. Host evidence is collected by the controller from native host observations.
   A worker result or self-report can never create or upgrade host evidence.
3. One host receipt is created per controller session. It cannot cross a host
   session, controller, runtime receipt, or run.
4. Git source state is reobserved for every readiness inspection. A later
   dispatch must reobserve it again before consuming the receipt.
5. Every source observation requires an explicit `auditedPaths` list. A sole
   `.` means the entire worktree; there is no implicit default.
6. Staged, unstaged, untracked, renamed, deleted, or dirty-submodule state in
   scope is `DIRTY`. Ignored files are excluded. Unobservable state is
   `UNKNOWN`, never clean.
7. The run's stored workspace identity and runtime receipt remain the
   authoritative local expectations. This slice does not create a competing
   workspace or session truth.
8. The module is deep: source observation, host receipt validation, and
   readiness assembly are separate cohesive units behind small interfaces.
   The CLI is only an adapter.
9. Readiness is ephemeral in this slice. Two-phase Dispatch will persist and
   consume the complete receipt set atomically in the next slice.
10. The current random `cli-host-*` runtime value is not Codex session
    evidence. Newly prepared Codex runs must instead bind the domain-separated
    digest of the allowlisted host-provided `CODEX_THREAD_ID`; there is no
    random or caller-supplied fallback.

## Module architecture

The implementation uses nine cohesive modules and two canonical policy
artifacts:

| Module | Single responsibility | May mutate? |
| --- | --- | --- |
| `src/execution/binding/source-observer.ts` | Validate one observation request, invoke bounded Git commands, and return one canonical `SourceBindingObservation`. | No |
| `src/execution/binding/source-path.ts` | Validate explicit audited path syntax, resolve filesystem boundaries, and reuse the canonical workspace identity. | No |
| `src/execution/binding/bounded-process.ts` | Enforce child timeout and output ceilings without shell execution or retry. | No |
| `src/execution/binding/git-observer.ts` | Invoke the fixed Git executable and parse the closed machine-readable identity/status records for the source observer. | No |
| `src/execution/binding/codex-host-observer.ts` | Observe only the allowlisted Codex task/session identity and normalize the Codex-native capability input. | No |
| `src/execution/binding/host-receipt.ts` | Validate controller-observed host facts and create/parse one canonical `HostEvidenceReceipt`. | No |
| `src/execution/binding/readiness.ts` | Bind the loaded run, prepared task, host receipt, and source observations into one deterministic `DispatchReadinessReceipt`. | No |
| `src/execution/binding/types.ts` | Own the closed binding types and exact schema versions. | No |
| `src/execution/binding/policy.ts` | Parse and digest the exact canonical binding policy without duplicating its values. | No |
| `contract/execution/binding-policy.json` | Hold reviewed limits, required capability names, and the admitted host profile. | No |
| `contract/execution/binding-policy.schema.json` | Publish the agent-agnostic exact-shape policy contract. | No |

Only `git-observer.ts`, called by `source-observer.ts`, may execute Git. It uses
the bounded process unit with an argument array and a fixed executable name;
it never invokes a shell or constructs a command string. Binding modules do not
import the SQLite driver. The CLI opens the existing execution store through
the read-only session adapter, and the assembler receives already loaded
canonical data.

Only `codex-host-observer.ts` may read host process environment, and it may
read exactly `CODEX_THREAD_ID`. It neither enumerates nor copies environment
variables. The raw UUID is validated, immediately domain-hashed, and never
returned, logged, persisted, or included in an error.

The public module interface remains small:

- `observeExecutionSource(request, policy)`;
- `observeCodexHostSession(request, policy)`;
- `createExecutionHostReceipt(request, runBinding, policy)`;
- `parseExecutionHostReceipt(value, policy)`; and
- `inspectExecutionDispatchReadiness(request, run, preparedNode, policy)`.

All parameters are explicit. No flag parameter switches a function between
read and write, full and scoped, or Codex and another host mode.

## Canonical contracts

All objects use exact-key validation, plain objects, canonical JSON, SHA-256
digests, closed enums, unique bounded arrays, and schema-owned version values.
Unknown keys are rejected. Rejected values are not echoed in an error.

### Host capability observation

Each entry in `capabilities` has exactly these fields:

| Field | Contract |
| --- | --- |
| `capabilityId` | One of `SPAWN_AGENT`, `WAIT_AGENT`, `INTERRUPT_AGENT`, `OBSERVE_AGENT_IDENTITY`, `BIND_WORKSPACE`. |
| `state` | `SUPPORTED`, `UNSUPPORTED`, or `UNKNOWN`. |
| `authorityState` | `PROVEN`, `DENIED`, or `UNKNOWN`. This is operation authority, not a sandbox claim. |
| `instructionState` | `OBSERVED` or `UNKNOWN`. It records whether the controlling task reopened and applied the active on-disk host instructions. |
| `evidenceCode` | Exactly `NATIVE_CAPABILITY_OBSERVED`, `NATIVE_CAPABILITY_UNSUPPORTED`, or `NATIVE_CAPABILITY_UNOBSERVABLE`; never raw tool output or prose. |

The five capability entries occur exactly once and are sorted by
`capabilityId` before hashing. A `SUPPORTED` state does not override denied or
unknown authority and does not prove a security boundary.
`SUPPORTED`, `UNSUPPORTED`, and `UNKNOWN` respectively require the observed,
unsupported, and unobservable evidence code; inconsistent pairs are rejected.

### `HostEvidenceReceipt`

| Field | Contract |
| --- | --- |
| `receiptVersion` | Exact value `1.0`. |
| `receiptId` | SHA-256 identity of the canonical hashless receipt. |
| `hostProfileId` | Bounded normalized profile identifier matching `^[A-Z][A-Z0-9_]{2,63}$`. The initial creation path emits and the policy admits only `CODEX_APP_NATIVE_V1`; any other valid identifier remains representable but unsupported. |
| `hostSessionId` | Domain-separated SHA-256 digest of the allowlisted host-provided Codex thread ID, or `null` when the identity is unavailable or malformed. Readiness requires a non-null value equal to the normalized host session identity in the run's stored runtime receipt. |
| `controllerId` | Must equal the run's canonical controller ID. |
| `runtimeReceiptId` | Must equal the run's stored runtime receipt ID. |
| `capabilities` | The complete sorted capability set defined above. |
| `observedAt` | Strict UTC RFC 3339 timestamp supplied by the controller observation. |
| `evidenceDigest` | SHA-256 digest over the normalized profile, session, controller, runtime, capabilities, and observation timestamp under the `execution-host-evidence-v1` domain. |

The receipt ID is derived from every other field, including
`evidenceDigest`; it is not random. Repeating the same normalized observation
therefore returns the same receipt. Changing any field returns a different
identity. The receipt contains no agent ID because it proves controller-session
capability before a worker exists.

### Source observation request

The request is transient input and is not itself a receipt. It contains:

- `sourceId`, which must identify a source used by the selected node;
- `workspaceRoot`, an absolute local directory used only for observation;
- `expectedSourceRevision`, which must equal both the envelope revision and
  the selected `ExecutionSource.sourceRevision`; and
- a non-empty explicit `auditedPaths` array.

`workspaceRoot` is never copied to canonical output, logs, errors, or a digest
input in its raw caller-supplied form. The observer resolves it once, rejects a
symbolic-link or reparse-point root, and requires its normalized identity to
equal the workspace identity stored with the run.

Each audited path is repository-relative, slash-normalized, and must remain
inside the resolved worktree. Absolute paths, drive-qualified paths, empty
segments, `..`, NUL bytes, non-canonical separators, and a symlink or junction
escape are rejected. `.` is permitted only as the sole array element and means
the complete worktree.

### `SourceBindingObservation`

| Field | Contract |
| --- | --- |
| `observationVersion` | Exact value `1.0`. |
| `observationId` | SHA-256 identity of the canonical hashless observation. |
| `sourceId` | Exact selected node source ID. |
| `repositoryIdentityDigest` | Digest of normalized Git common-directory identity, object format, and repository boundary; no remote URL. `null` when Git cannot establish the repository identity. |
| `worktreeIdentityDigest` | Digest of the normalized top-level and per-worktree Git-directory identities. This distinguishes sibling worktrees at the same SHA. `null` when the worktree identity is unobservable. |
| `workspaceIdentityDigest` | Digest computed by the existing workspace identity contract and compared with the execution database, or `null` when the root cannot be safely resolved. |
| `expectedSourceRevision` | Immutable revision required by the envelope source. |
| `observedSourceRevision` | Exact commit object ID returned by Git, or `null` when it cannot be established. |
| `auditedPaths` | Sorted, unique, normalized explicit pathspecs. |
| `dirtyState` | `CLEAN`, `DIRTY`, or `UNKNOWN`. |
| `sourceStateDigest` | Digest of the normalized repository/worktree/workspace identities, expected and observed revision, audited pathspecs, dirty state, reason codes, and normalized porcelain records. |
| `observedAt` | Strict UTC RFC 3339 observation timestamp. |
| `reasonCodes` | Sorted unique source/workspace reasons. Empty only for a fully matching clean observation. |
| `evidenceDigest` | SHA-256 over the complete normalized observation evidence under the `execution-source-evidence-v1` domain. |

`observationId` is derived from every other output field. Raw absolute paths,
remote URLs, Git stderr, usernames, machine names, and repository content do
not occur in canonical output. Identity digests may contain resolved local path
material only as one-way digest input under a domain separator.

If Git cannot establish the relevant identity or commit, the unobservable
identity fields and `observedSourceRevision` are `null`, `dirtyState` is
`UNKNOWN`, and the reason set includes `SOURCE_UNREADABLE`. This is distinct
from an observed but different identity or commit, which includes the relevant
known mismatch reason and is a stop.

### `DispatchReadinessReceipt`

| Field | Contract |
| --- | --- |
| `receiptVersion` | Exact value `1.0`. |
| `receiptId` | SHA-256 identity of the canonical hashless receipt. |
| `state` | `READY`, `STOPPED`, or `UNKNOWN`. |
| `runId` | Exact loaded run ID. |
| `nodeId` | Exact selected node ID. |
| `taskId` | Deterministic task ID from the freshly built task packet. |
| `envelopeHash` | Exact immutable envelope hash. |
| `graphRevision` | Exact loaded graph revision used to create the task packet. |
| `controllerId` | Exact canonical run controller ID. |
| `runtimeReceiptId` | Exact stored runtime receipt ID. |
| `hostEvidenceReceiptId` | ID of the validated host receipt. |
| `hostSessionId` | Host session digest from the host receipt, or `null` when unobservable. `READY` requires the same non-null value in the stored runtime receipt. |
| `sourceObservationIds` | Observation IDs sorted by their source IDs. |
| `sourceStateDigests` | State digests in the same source order. |
| `reasonCodes` | Complete sorted unique readiness reasons. |
| `observedAt` | Strict UTC RFC 3339 assembly timestamp. |
| `evidenceDigest` | SHA-256 over every normalized binding and disposition field under the `execution-dispatch-readiness-v1` domain. |

The receipt ID is derived from every other field. A parser recomputes every
digest and rejects tampering. The receipt references, but does not embed, the
host and source evidence. Two-phase Dispatch must receive all referenced
objects, revalidate their IDs, and persist them in one transaction if it later
accepts dispatch intent.

## Source and worktree observation

The observer performs the following bounded read-only sequence against the
exact caller-selected local directory:

1. Validate audited path syntax, then resolve and validate the root and path
   boundaries without changing process current directory. An absent or
   unreadable otherwise well-formed root is an unknown observation; a
   symlink/reparse or containment violation is rejected input.
2. Run Git with `GIT_OPTIONAL_LOCKS=0`, disabled optional locks, no shell, a
   fixed timeout, and bounded stdout/stderr capture.
3. Resolve `--show-toplevel`, `--git-common-dir`, `--git-dir`, object format,
   and `HEAD^{commit}`; canonicalize the identities; compare the workspace
   identity with the database-bound value.
4. Require the resolved top level to be the supplied workspace root. Never
   search a parent, select a fallback repository, or modify `safe.directory`.
5. Invoke machine-readable `git status --porcelain=v2 -z --untracked-files=all
   --ignored=no -- <explicit-pathspecs>` and parse only the closed porcelain-v2
   record set.
6. Normalize the status records without file content, preserve rename/source
   path semantics, classify submodule dirtiness, and compute the state digest.
7. Return one canonical observation. No command may modify the index, worktree,
   Git configuration, or repository metadata.

Any staged or unstaged index/worktree status, untracked path, rename, deletion,
type change, unmerged record, or dirty submodule in the audited scope produces
`DIRTY`. Ignored files do not. An unsupported record, truncated output,
timeout, unreadable repository, unsupported Git behavior, or parse uncertainty
produces `UNKNOWN` and never `CLEAN`.

The first reference run must use `auditedPaths: ["."]`. A narrower list is
valid only when a later task's accepted scope deliberately permits unrelated
dirty paths; the explicit path list remains visible in the receipt.

## Host-receipt semantics

The Codex controller constructs one normalized observation from its actual
native session capabilities. The CLI observes the current task identity only
through the allowlisted `CODEX_THREAD_ID`, validates its UUID shape, derives
`SHA-256("execution-codex-host-session-v1\\0" + value)`, and binds the digest
to the canonical run and stored runtime receipt. The receipt is a digest-bound
record of what the controller observed; it is not cryptographic proof from the
Codex service and is not a sandbox or authorization certificate.

The existing `prepare-execution` implementation currently creates a random
`cli-host-*` value. That value proves only that a CLI invocation generated a
nonce and cannot satisfy this contract. As a bounded prerequisite, run
preparation for `CODEX_APP_NATIVE_V1` must use the same direct host observer and
store the derived digest in its runtime receipt. This changes only the metadata
of newly prepared runs. It does not rewrite or upgrade an existing run and does
not make readiness inspection mutating.

If `CODEX_THREAD_ID` is absent or malformed, the host receipt preserves
`hostSessionId: null` and readiness returns
`HOST_SESSION_IDENTITY_UNKNOWN/UNKNOWN`. If the current and stored identities
are both valid normalized digests but differ, the receipt preserves the newly
observed digest and readiness returns
`HOST_SESSION_IDENTITY_MISMATCH/STOPPED`. A legacy `cli-host-*` value is
unproven rather than a comparable digest and remains
`HOST_SESSION_IDENTITY_UNKNOWN/UNKNOWN`. There is no random ID, command-line
override, prior-receipt reuse, or compatibility fallback. Legacy runs remain
inspectable but are not dispatch-ready.

A host receipt is `READY`-eligible only when every required capability is
`SUPPORTED`, every corresponding authority state is `PROVEN`, and every
instruction state is `OBSERVED`. The validator never:

- infers support from a visible tool name alone when invocation semantics are
  unknown;
- promotes worker statements or task text to controller evidence;
- crosses host sessions or runtime receipts;
- accepts a caller-provided or worker-provided raw host-session ID;
- treats a successful normal run as security-boundary proof; or
- converts an absent observation into `SUPPORTED`.

Claude Code, Cursor, another Codex profile, or a changed capability catalog is
`HOST_PROFILE_UNSUPPORTED` until its own reviewed profile and conformance
contract exists.

## Readiness assembly flow

The read-only CLI and assembler perform this sequence:

1. Open the exact database and run with the existing read-only session path.
2. Load the canonical run, runtime receipt, graph, and selected node.
3. Reject the command without a receipt if the run is terminal, the node is
   absent, the node is not `READY`, or the node is not dispatchable.
4. Build a fresh task packet from the loaded envelope, graph, node, and accepted
   predecessor artifacts. This establishes `taskId`, `envelopeHash`, and
   `graphRevision` from canonical state rather than caller claims.
5. Parse and validate the complete host receipt against the run controller,
   runtime receipt, and host session.
6. Require exactly one source observation request for every unique source ID in
   the task packet and reject foreign, missing, or duplicate source IDs.
7. Observe every source in deterministic source-ID order and retain all
   resulting reason codes.
8. Assemble one readiness receipt with the precedence `STOPPED` > `UNKNOWN` >
   `READY`.
9. Close the read-only session and write exactly one bounded JSON response to
   stdout. Diagnostic details go to neither stdout nor repository artifacts.

Readiness has no time-to-live guess. It is valid only as an observation bound
to its exact state digests. Slice 2 must remeasure all source state immediately
before dispatch admission. Any changed digest, graph revision, controller,
runtime receipt, host session, or terminal state rejects consumption as stale;
it does not refresh or retry implicitly.

## Disposition and reason mapping

Malformed JSON, extra or missing fields, invalid identifiers, invalid paths,
or a node/run command precondition failure is command rejection: non-zero
exit, no readiness receipt, and no state mutation. Byte-limit overflow is the
specific registered rejection `COMMAND_INPUT_TOO_LARGE`.

For a structurally admissible observation, every detected reason is retained
and the final state follows this closed mapping:

| Reason | Readiness state |
| --- | --- |
| `SOURCE_REVISION_MISMATCH` | `STOPPED` |
| `WORKTREE_DIRTY_IN_SCOPE` | `STOPPED` |
| `WORKSPACE_IDENTITY_MISMATCH` | `STOPPED` |
| `SOURCE_UNREADABLE` | `UNKNOWN` |
| `HOST_PROFILE_UNSUPPORTED` | `STOPPED` |
| `HOST_CAPABILITY_UNSUPPORTED` | `STOPPED` |
| `HOST_CAPABILITY_UNKNOWN` | `UNKNOWN` |
| `HOST_INSTRUCTION_STATE_UNKNOWN` | `UNKNOWN` |
| `AUTHORITY_NOT_PROVEN` | `STOPPED`; authority was observably denied |
| `AUTHORITY_STATE_UNKNOWN` | `UNKNOWN` |
| `HOST_SESSION_IDENTITY_MISMATCH` | `STOPPED`; both session identities are proven and differ |
| `HOST_SESSION_IDENTITY_UNKNOWN` | `UNKNOWN` |

A required unsupported capability yields
`HOST_CAPABILITY_UNSUPPORTED/STOPPED`. A supported capability with denied authority yields
`AUTHORITY_NOT_PROVEN/STOPPED`. Unknown authority yields
`AUTHORITY_STATE_UNKNOWN/UNKNOWN`. Two valid but different session digests
yield `HOST_SESSION_IDENTITY_MISMATCH/STOPPED`. An absent, malformed, or legacy
session identity yields `HOST_SESSION_IDENTITY_UNKNOWN/UNKNOWN`. Each reason
therefore has one determinacy and one disposition in the closed registry.

Known stop reasons dominate unknown reasons because continuation is already
known to be inadmissible, but all reasons remain visible. The system never
reports `READY` if any reason exists.

## CLI contract

Two read-only commands are added to the execution CLI:

### Create host receipt

`create-execution-host-receipt --database <path> --run <run-id>`

Stdin contains the exact host profile, controller observation timestamp, and
five capability observations. Controller and runtime receipt identities are
loaded from the run. The current Codex host-session identity is directly
observed and compared with the run; none of these identities can be supplied
or overridden by stdin. Stdout is exactly one `HostEvidenceReceipt` on success.

### Inspect dispatch readiness

`inspect-execution-dispatch-readiness --database <path> --run <run-id> --node <node-id>`

Stdin contains exactly the host receipt plus one transient source observation
request per task-packet source. Stdout is exactly one
`DispatchReadinessReceipt` on an admissible `READY`, `STOPPED`, or `UNKNOWN`
inspection.

Both commands use the existing execution CLI error projection and a shared
byte-bounded input reader. They open SQLite read-only and do not acquire or
change a controller lease. They expose no `--force`, `--retry`, `--fallback`,
or scope-expansion option.

## Binding policy and hard limits

`contract/execution/binding-policy.json` is canonical and digest-validated. The
initial reviewed policy is:

| Limit | Value | Rationale |
| --- | ---: | --- |
| `policyVersion` | `1.0` | Closed initial schema. |
| `policyId` | `execution-binding-policy-v1` | Stable receipt identity. |
| `gitCommandTimeoutMs` | 15000 | Bounded local Git inspection without a hidden retry. |
| `maxGitOutputBytes` | 1048576 | Matches the existing 1 MiB canonical input boundary and prevents unbounded capture. |
| `maxAuditedPaths` | 256 | Supports broad scoped tasks while bounding argument and parser work. |
| `maxAuditedPathBytes` | 1024 | Rejects pathological individual path input before Git. |
| `maxTotalAuditedPathBytes` | 65536 | Bounds aggregate argument and canonical receipt size. |
| `maxHostEvidenceInputBytes` | 1048576 | Matches the existing command-input ceiling. |
| `maxReadinessInputBytes` | 1048576 | Bounds the combined host receipt and transient source requests before parse. |
| `requiredHostCapabilities` | the five closed capability IDs | No capability is optional for Codex-native Dispatch. |
| `admittedHostProfiles` | `CODEX_APP_NATIVE_V1` only | Other hosts remain unsupported until reviewed. |

The implementation plan must test each boundary at below, exact, and over
limit. A failed or timed-out Git command is not retried. Exceeding output or
input limits cannot return a partial receipt.

## Security and trust boundaries

- The source root and audited paths are untrusted input. Resolution, type,
  symlink/reparse, containment, and exact-workspace checks occur before Git
  status is trusted.
- Git repository files, configuration, hooks, attributes, output, and errors
  are untrusted data. The observer does not execute repository commands, hooks,
  aliases, external diff tools, or pagers.
- Host observation input is untrusted controller input until exact schema,
  profile, session, runtime, authority, instruction, and digest validation
  completes.
- `CODEX_THREAD_ID` is the only allowlisted environment observation. It is
  normal host evidence, not service-signed attestation; its raw value cannot
  leave the observer.
- The execution database and runtime receipt are reopened through existing
  integrity checks; they are not caller claims.
- A digest proves canonical content identity, not authorship, service
  attestation, sandbox enforcement, or absence of compromise.
- Errors contain a stable code and actionable category but never input values,
  raw paths, Git output, repository content, environment values, or secrets.
- No environment dump, connector payload, transcript, prompt, hidden reasoning,
  credential, cookie, token, or personal identifier is accepted into a receipt.

## Test and verification strategy

Behavior changes are test-driven. Tests use real temporary local Git
repositories/worktrees and the real SQLite adapter; Git and database behavior
are not mocked.

### Focused contract and integration cases

- deterministic creation, parsing, hashing, and tamper rejection for all three
  receipt types;
- clean full-worktree observation at the exact expected commit;
- explicit path scope that remains clean while an unrelated path is dirty;
- staged, unstaged, untracked, renamed, deleted, type-changed, unmerged, and
  dirty-submodule cases;
- ignored content excluded from dirty classification;
- sibling worktree at the same SHA rejected by worktree/workspace identity;
- different repository at the same SHA rejected by workspace identity;
- detached HEAD admitted when it resolves to the exact expected commit;
- unborn HEAD, unreadable repository, unsupported record, truncated output,
  timeout, and output overflow remain `UNKNOWN` or command rejection as
  specified;
- absolute, traversal, drive-qualified, duplicate, oversized, symlink, and
  junction-escape audited paths rejected before receipt creation;
- supported, unsupported, unknown, denied-authority, unknown-authority, and
  unknown-instruction host capability cases;
- present, absent, malformed, changed, and legacy-random host-session identity
  cases without revealing the raw host value;
- controller, runtime receipt, host session, run, node, task, envelope, graph,
  source ID, and source revision mismatches;
- `STOPPED` precedence over `UNKNOWN` while preserving all sorted reasons;
- byte-stable output independent of input array ordering after normalization;
- absence of raw absolute paths, Git output, host prose, secrets, and personal
  data from receipts and error output;
- repository status, `HEAD`, index, config, object database, and database bytes
  unchanged before and after every success and failure case; and
- existing single-phase `record-execution-dispatch` and `stop-execution`
  rejection behavior remains unchanged.

### Quality gates

Run the narrowest binding tests first, then:

1. complete repository test suite;
2. TypeScript build and lint;
3. documentation checks and `git diff --check`;
4. dependency and vulnerability audit when the implementation changes the
   dependency graph; and
5. all four repository CI runtime lanes, preserving authoritative versus
   conformance labels.

Passing local tests prove only this local binding contract. They do not prove a
live Codex host run or any security boundary.

## User and business-owner impact

The intended platform user performs no manual Git parsing, receipt hashing,
model selection, API-key setup, cloud configuration, or host-specific file
editing. The Codex controller gathers its native session observation, and the
Kernel creates the receipts automatically. A scoped task must still name its
audited paths; the immutable reference run uses the whole worktree.

The business owner incurs no new model-token, external API, hosted database,
or connector cost in this slice. Runtime cost is limited to bounded local Git
processes, CPU, memory, and small local receipt payloads. Operational
obligations are versioned policy maintenance, Git/Windows/Linux/macOS
conformance testing, Codex host-profile review when native behavior changes,
clear stop/unknown UX, and support for diagnosing sanitized local failures.

No claim is made that the Codex application will preserve this profile forever.
A changed tool, session, instruction, permission, or identity behavior must
remain `UNKNOWN` or `UNSUPPORTED` until the profile is reviewed and tested.

## Acceptance criteria

Implementation is complete only when all of the following are demonstrated:

1. The same normalized controller observation deterministically creates the
   same valid `HostEvidenceReceipt` for one exact run/session binding.
2. A readiness receipt binds the exact run, node, task ID, envelope hash, graph
   revision, controller, runtime receipt, host session, host evidence, source
   observations, and source state digests.
3. Every source has an explicit audited path list; no default scope exists.
4. `READY` is possible only from the exact database-bound workspace, expected
   revision, clean audited scope, supported host profile, supported required
   capabilities, proven authority, and observed instruction state.
5. Known mismatches are `STOPPED`; unobservable facts are `UNKNOWN`; malformed
   or inadmissible commands create no receipt.
6. A sibling worktree or another repository cannot pass merely because its
   commit ID matches.
7. Receipts and errors contain no personal raw path, raw Git or host output,
   repository content, transcript, secret, or unbounded input.
8. Every successful and failed inspection leaves the repository, worktree,
   index, Git configuration, object store, and execution database unchanged.
9. Existing single-phase Dispatch and stop commands remain rejected.
10. Focused tests, the full suite, lint/build, documentation checks, and the
    repository's authoritative and conformance CI lanes pass.
11. Newly prepared Codex runs bind the directly observed normalized Codex task
    identity; legacy random, absent, malformed, or cross-session identities
    cannot become `READY` and are never silently replaced.

## Stop conditions

Implementation stops and preserves evidence if:

- the exact base revision, worktree, database, run, or accepted design differs
  from this document;
- the implementation would touch the dirty primary worktree;
- Git observation requires a repository write, global configuration change,
  shell command, hook execution, fallback repository, or hidden retry;
- Codex-native capability, authority, instruction, workspace, or session state
  cannot be observed as designed;
- a receipt would need raw personal paths, host output, secrets, or unbounded
  content;
- the read-only session path mutates SQLite, a Git fixture cannot distinguish
  wrong-worktree behavior, or a test cannot distinguish `STOPPED` from
  `UNKNOWN`; or
- the slice expands into dispatch, cancellation, another host, external model,
  connector, external read/write, or security certification.

## Handoff to Slice 2

Slice 2 may begin only after this design has a reviewed file-and-test-level
implementation plan and Slice 1 passes its acceptance criteria. Its two-phase
Dispatch transaction will:

1. receive the readiness receipt and every referenced host/source observation;
2. reload the exact run and node under mutation authority;
3. reobserve source state and reject any changed state digest;
4. revalidate session, controller, runtime, graph, task, terminal, budget, and
   parallelism conditions;
5. atomically persist the complete evidence set and one unique dispatch intent;
6. invoke exactly one Codex-native spawn outside the transaction; and
7. persist a verified host receipt or an `UNKNOWN` outcome without blind retry.

Until that slice exists, a `READY` receipt authorizes no host effect.

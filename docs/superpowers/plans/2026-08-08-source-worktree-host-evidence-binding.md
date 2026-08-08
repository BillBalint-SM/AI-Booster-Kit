# Source/worktree and host-evidence binding implementation plan

> **Execution rule:** implement this plan sequentially in the main task with
> `superpowers:executing-plans` and `superpowers:test-driven-development`.
> Do not delegate implementation. Every task must finish its own RED, PASS,
> focused review, and work-state check before the next task starts.

**Goal:** Add a read-only, fail-closed binding layer that proves an exact
prepared execution node is still attached to its database-bound workspace,
expected immutable Git revision, clean explicit path scope, current Codex task
session, controller, runtime receipt, and required host capabilities.

**Architecture:** Implement one deep `src/execution/binding/` module with a
canonical policy parser, a Codex host-session observer, a host-receipt
validator, a path-safe real-Git source observer, and a pure readiness
assembler. Extend run preparation only enough to replace the unproven random
`cli-host-*` value with the directly observed normalized Codex task identity.
Add two read-only CLI commands; neither command writes SQLite, Git, or the
worktree. Two-phase Dispatch remains absent and blocked.

**Tech stack:** Existing TypeScript 5.9.2 ESM/NodeNext project, Node 24 LTS
authoritative CI lanes, Node 26 conformance-only lanes, `node:test`, local Git,
and the existing real `better-sqlite3` adapter. No dependency addition or
upgrade is planned.

**Approved design:**
[Source/worktree and host-evidence binding design](../specs/2026-08-08-source-worktree-host-evidence-binding-design.md)

**Approved baseline:** `daae4ee413b6de47777a43ca091efba97da0ac00`

## Global constraints

- Start every execution or resumption from a fresh `WORK_STATE` preflight in
  the isolated `dev-source-host-binding` worktree. Stop on a different branch,
  HEAD, repository, unexpected changed path, upstream, or PR state.
- The dirty primary `main` worktree is out of scope. Do not pull, clean,
  rewrite, or edit it.
- If this plan conflicts with the approved design, stop and amend the reviewed
  artifact. Do not reinterpret the design in code.
- Keep all new source/host/readiness operations local and read-only. No Codex
  spawn, wait, message, interrupt, model API, connector, external read/write,
  dispatch intent, lease mutation, budget reservation, or retry is permitted.
- The existing SQLite database, runtime receipt, workspace identity, envelope,
  graph, and task-packet builders remain canonical. Do not duplicate or
  weaken their validation.
- Repository roots, audited paths, Git repositories, Git output, host input,
  environment values, and receipt JSON are untrusted data.
- Read exactly one environment key, `CODEX_THREAD_ID`, inside the Codex host
  observer. Never enumerate or log environment values. Never emit the raw
  thread ID.
- Use `execFile`/argument arrays and a fixed `git` executable. No shell,
  string-built command, alias, pager, hook, fallback repository, config write,
  `safe.directory` change, hidden retry, or process-wide current-directory
  change is permitted.
- All canonical inputs use exact-key validation and all outputs use canonical
  JSON plus domain-separated SHA-256 identities. A digest proves content
  identity, not host authorship or a security boundary.
- `STOPPED`, `UNKNOWN`, and command rejection remain distinct. Every reason
  code has one determinacy and one registry disposition.
- Tests use real temporary Git repositories/worktrees and the real SQLite
  adapter for behavior claims. A controlled real child process may test timeout
  and output ceilings; it is not a substitute for real Git semantic tests.
- Add no mock Git, mock SQLite, fake database, production fallback, permissive
  parser, default scope, default function parameter, or flag-controlled
  multi-mode function.
- Do not weaken, skip, delete, or replace existing tests. Test failures stop the
  current task after preserving the failure evidence and identifying the
  failed assumption.
- Commit commands are intentionally absent. Uncommitted changes remain review
  state until the user explicitly authorizes a commit. Push, PR, and merge each
  require their applicable fresh approval; merge always requires a separate
  approval.

## Planned file structure

### Canonical policy and types

- Create `contract/execution/binding-policy.json`.
- Create `contract/execution/binding-policy.schema.json`.
- Create `src/execution/binding/types.ts`.
- Create `src/execution/binding/policy.ts`.
- Modify `src/execution/reasons.ts`.

### Host binding

- Create `src/execution/binding/codex-host-observer.ts`.
- Create `src/execution/binding/host-receipt.ts`.
- Modify `src/execution/runtime-receipt.ts` only for the normalized host-session
  contract required by new runs.
- Modify `src/execution/cli.ts` so `prepare-execution` records the directly
  observed normalized Codex task identity and never creates `cli-host-*`.

### Source binding

- Modify `src/execution/workspace-storage.ts` to expose the existing normalized
  read-only workspace identity calculation without duplicating it.
- Create `src/execution/binding/source-path.ts`.
- Create `src/execution/binding/bounded-process.ts`.
- Create `src/execution/binding/git-observer.ts`.
- Create `src/execution/binding/source-observer.ts`.

### Readiness and CLI

- Create `src/execution/binding/readiness.ts`.
- Create `src/execution/cli-input.ts` for shared pre-parse byte bounds.
- Modify `src/execution/cli.ts` for the two read-only execution commands.
- Modify `src/cli.ts` for command routing and help.

### Tests and controlled fixtures

- Create `test/execution-binding-policy.test.ts`.
- Create `test/execution-codex-host-observer.test.ts`.
- Create `test/execution-host-receipt.test.ts`.
- Create `test/execution-source-path.test.ts`.
- Create `test/execution-source-observer.test.ts`.
- Create `test/execution-dispatch-readiness.test.ts`.
- Create `test/execution-binding-cli.test.ts`.
- Create `test/helpers/execution-git-fixture.ts`.
- Create `test/fixtures/execution/bounded-process-worker.ts`.
- Modify `test/execution-reasons.test.ts`.
- Modify `test/execution-runtime-receipt.test.ts`.
- Modify `test/execution-workspace-storage.test.ts`.
- Modify `test/execution-cli.test.ts`.
- Modify `test/helpers/transactional-execution-store.ts` only to provide a
  synthetic normalized host-session identity and a real Git workspace when a
  binding test requires it.

### Operator documentation after evidence exists

- Modify `docs/operations/codex-native-multi-agent-runbook.md`.
- Modify `docs/project/current-state.md`.

No package, dependency-lock, TypeScript configuration, workflow, database
schema, persistence table, or migration change is planned.

## Acceptance coverage map

| Design acceptance | Primary tasks |
| --- | --- |
| Closed policy, types, reasons, digests, and limits | 1 |
| Direct Codex task/session observation and new-run binding | 2 |
| Deterministic host receipt and capability/authority/instruction states | 3 |
| Explicit audited paths and filesystem boundary safety | 4 |
| Exact Git identity, revision, dirty state, and bounded process behavior | 5 |
| Exact run/node/task/source/session readiness disposition | 6 |
| Read-only CLI, bounded stdin, no repository/database mutation | 7 |
| Full suite, four CI lanes, docs, diff/privacy/security review | 8 |

---

### Task 1: Pin the binding policy, schemas, types, and total reason semantics

**Files:**

- Create: `contract/execution/binding-policy.json`
- Create: `contract/execution/binding-policy.schema.json`
- Create: `src/execution/binding/types.ts`
- Create: `src/execution/binding/policy.ts`
- Create: `test/execution-binding-policy.test.ts`
- Modify: `src/execution/reasons.ts`
- Modify: `test/execution-reasons.test.ts`

**Required interfaces:**

```ts
export type HostProfileId = string;
export type HostCapabilityId =
  | "SPAWN_AGENT"
  | "WAIT_AGENT"
  | "INTERRUPT_AGENT"
  | "OBSERVE_AGENT_IDENTITY"
  | "BIND_WORKSPACE";

export interface ExecutionBindingPolicy {
  policyVersion: "1.0";
  policyId: "execution-binding-policy-v1";
  policyDigest: string;
  gitCommandTimeoutMs: number;
  maxGitOutputBytes: number;
  maxAuditedPaths: number;
  maxAuditedPathBytes: number;
  maxTotalAuditedPathBytes: number;
  maxHostEvidenceInputBytes: number;
  maxReadinessInputBytes: number;
  requiredHostCapabilities: readonly HostCapabilityId[];
  admittedHostProfiles: readonly ["CODEX_APP_NATIVE_V1"];
}

export function parseExecutionBindingPolicy(value: unknown): ExecutionBindingPolicy;
```

- [ ] Add tests first for the exact policy shape, fixed values, sorted and
  complete five-capability set, only admitted Codex profile, deterministic
  policy digest, unknown/missing/duplicate fields, wrong types, zero/negative,
  fractional, unsafe integer, reordered canonical input, and changed digest.
- [ ] Add reason-registry RED tests for exactly five new codes:
  `COMMAND_INPUT_TOO_LARGE` is a known-absent preparation rejection;
  `HOST_CAPABILITY_UNSUPPORTED` is a known-present host stop;
  `AUTHORITY_STATE_UNKNOWN` is an ambiguous host `MARK_UNKNOWN`; and
  `HOST_SESSION_IDENTITY_MISMATCH` is a known-present host stop while
  `HOST_SESSION_IDENTITY_UNKNOWN` is an ambiguous host `MARK_UNKNOWN`.
  Confirm `AUTHORITY_NOT_PROVEN` remains known-present `STOP_KNOWN`.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-binding-policy.test.js dist/test/execution-reasons.test.js
  ```

  Expected: build/test fails only because the new policy/types/reasons are not
  implemented.
- [ ] Add exact policy JSON and schema using the approved limits: 15000 ms Git
  timeout, 1 MiB Git output, 256 paths, 1024 bytes per path, 65536 aggregate
  path bytes, and 1 MiB for each host/readiness input.
- [ ] Parse manually with existing plain-object/exact-key conventions; do not
  add a validator dependency or duplicate JSON values in TypeScript.
- [ ] Add the minimum closed binding type surface. Keep receipt constructors
  out of `types.ts`.
- [ ] Extend the reason registry with one unambiguous definition per new code
  and no changes to unrelated reason dispositions.
- [ ] Run PASS and the immediate regressions:

  ```powershell
  npm run build
  node --test dist/test/execution-binding-policy.test.js dist/test/execution-reasons.test.js
  npm run lint
  ```

- [ ] Inspect the diff for policy/schema disagreement, hidden defaults, reason
  aliases, unrelated registry churn, and generated noise.

**Stop:** Any required state needs one code to produce both `STOPPED` and
`UNKNOWN`, the policy cannot be parsed without a new dependency, or a value
must be guessed outside the approved design.

---

### Task 2: Bind new runs to the directly observed Codex task session

**Files:**

- Create: `src/execution/binding/codex-host-observer.ts`
- Create: `test/execution-codex-host-observer.test.ts`
- Modify: `src/execution/runtime-receipt.ts`
- Modify: `src/execution/cli.ts`
- Modify: `test/execution-runtime-receipt.test.ts`
- Modify: `test/execution-cli.test.ts`

**Required interfaces:**

```ts
export interface CodexHostSessionObservation {
  hostProfileId: "CODEX_APP_NATIVE_V1";
  hostSessionId: string | null;
  state: "OBSERVED" | "UNKNOWN";
  reasonCode: "HOST_SESSION_IDENTITY_UNKNOWN" | null;
  observedAt: string;
}

export function observeCodexHostSession(request: {
  threadId: string | undefined;
  observedAt: string;
}): CodexHostSessionObservation;

export function currentCodexHostSessionObservation(
  observedAt: string,
): CodexHostSessionObservation;
```

- [ ] Write RED tests for canonical UUID input, uppercase/lowercase
  normalization, deterministic domain-separated SHA-256 output, different UUID
  producing a different digest, absent/malformed/oversized values producing
  `null/UNKNOWN`, strict timestamp validation, and raw UUID absence from JSON,
  error messages, and source-visible output.
- [ ] Add runtime/CLI RED tests proving `prepare-execution` stores the digest
  derived from a synthetic child `CODEX_THREAD_ID`, creates no `cli-host-*`,
  fails before database/directory creation when the variable is absent or
  malformed, and never accepts a CLI or stdin host-session override.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-codex-host-observer.test.js dist/test/execution-runtime-receipt.test.js dist/test/execution-cli.test.js
  ```

- [ ] Implement one pure normalizer and one thin current-host adapter. Only the
  thin adapter reads `process.env.CODEX_THREAD_ID`; it reads no other key.
- [ ] Domain-hash the normalized UUID as specified in the design, immediately
  discard the raw value, and return only the digest or `null`.
- [ ] Change `prepare-execution` to require an observed non-null session digest
  before opening the persistence session. Keep lower-level storage-session
  interfaces explicit for synthetic tests and future host adapters.
- [ ] Preserve runtime receipt schema version `1.0`: the stored field remains a
  bounded string, but newly prepared Codex runs use a 64-hex digest.
- [ ] Run PASS and inspect a real temporary database runtime receipt without
  printing its raw canonical JSON:

  ```powershell
  npm run build
  node --test dist/test/execution-codex-host-observer.test.js dist/test/execution-runtime-receipt.test.js dist/test/execution-cli.test.js
  npm run lint
  ```

- [ ] Review that no environment enumeration, raw UUID, fallback nonce,
  database side effect on failure, or unrelated preparation change exists.

**Stop:** `CODEX_THREAD_ID` is absent in the actual Codex host used for the
future reference run, its format differs from the locally observed UUID
contract, or a correct binding would require persisting a raw host value.

---

### Task 3: Create and validate deterministic host-evidence receipts

**Files:**

- Create: `src/execution/binding/host-receipt.ts`
- Create: `test/execution-host-receipt.test.ts`

**Required interfaces:**

```ts
export function createExecutionHostReceipt(
  request: CreateExecutionHostReceiptRequest,
  runBinding: ExecutionHostRunBinding,
  policy: ExecutionBindingPolicy,
): HostEvidenceReceipt;

export function parseExecutionHostReceipt(
  value: unknown,
  policy: ExecutionBindingPolicy,
): HostEvidenceReceipt;
```

- [ ] Write RED tests for the exact top-level and capability-entry fields;
  complete unique capability set; input-order normalization; supported,
  unsupported, and unknown capability states; proven, denied, and unknown
  authority; observed and unknown instruction state; evidence-code/state
  agreement; safe unsupported profile representation; nullable host session;
  exact controller/runtime binding; timestamp; receipt/evidence digest
  stability; and every one-field tamper.
- [ ] Test hostile extra keys, raw tool text, transcript/prompt/reasoning,
  credential-shaped keys/content, raw UUIDs, arbitrary absolute paths,
  oversized identifiers/arrays, duplicate capabilities, and invalid digest
  casing without echoing rejected values.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-host-receipt.test.js
  ```

- [ ] Implement exact validation with the existing canonical execution JSON and
  digest primitives. Use a separate domain for `evidenceDigest`; derive
  `receiptId` from the complete hashless receipt.
- [ ] Creation may represent an unsupported profile and an unknown session so
  readiness can return a truthful receipt state. It must not treat either as
  admitted or synthesize capability support.
- [ ] Parse by recomputing both digests and revalidating the complete normalized
  object. Do not trust a receipt merely because its ID is 64 hex characters.
- [ ] Run PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-host-receipt.test.js
  npm run lint
  ```

- [ ] Review for worker self-attestation paths, profile fallback, raw host data,
  security-boundary claims, and any random receipt identity.

**Stop:** A structurally valid unknown or unsupported host observation cannot
be represented without claiming support, or validation needs raw Codex output.

---

### Task 4: Enforce explicit audited-path and filesystem boundaries

**Files:**

- Create: `src/execution/binding/source-path.ts`
- Create: `test/execution-source-path.test.ts`
- Create: `test/helpers/execution-git-fixture.ts`
- Modify: `src/execution/workspace-storage.ts`
- Modify: `test/execution-workspace-storage.test.ts`

**Required interfaces:**

```ts
export interface ResolvedSourcePathScope {
  workspaceRoot: string;
  workspaceIdentityDigest: string;
  auditedPaths: readonly string[];
}

export async function resolveExecutionSourcePathScope(
  request: ResolveExecutionSourcePathScopeRequest,
  policy: ExecutionBindingPolicy,
): Promise<ResolvedSourcePathScope | UnknownSourcePathScope>;
```

- [ ] Create a real temporary Git fixture helper that initializes a repository,
  configures only synthetic local author data, commits synthetic files, and can
  create a sibling worktree and submodule without using a remote.
- [ ] Write RED tests for `auditedPaths: ["."]`, one and multiple normalized
  repository-relative paths, sorting, and exact database-bound workspace
  identity.
- [ ] Test empty/default/duplicate scopes; `.` mixed with another path;
  absolute, UNC, drive-qualified, backslash, NUL, empty-segment, dot-segment,
  traversal, path-count, individual-byte, and aggregate-byte violations.
- [ ] Test a symlink/reparse root and any existing audited ancestor that crosses
  a symlink or junction boundary. Use platform-aware skips only where the OS
  denies creating the fixture; a denied fixture is recorded as a platform
  limitation, not a pass.
- [ ] Test that a missing or unreadable otherwise well-formed workspace returns
  an unknown source scope with no raw path, while structural or containment
  violations reject input with `PATH_ESCAPE` or `SYMLINK_BOUNDARY`.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-source-path.test.js
  ```

- [ ] Implement syntax validation before filesystem access, then `lstat` and
  `realpath` containment checks. Reuse the existing workspace normalization
  contract rather than reimplementing platform case/separator rules.
- [ ] Extract one read-only workspace identity observer from the existing
  storage-location implementation, make the existing storage resolver consume
  it, and prove all prior workspace-storage behavior remains unchanged. Do not
  create a second path-normalization algorithm.
- [ ] Keep absolute paths transient inside the source observation pipeline.
  Only the existing workspace digest and normalized audited paths may cross the
  canonical receipt/CLI boundary.
- [ ] Run PASS on the current platform and lint:

  ```powershell
  npm run build
  node --test dist/test/execution-workspace-storage.test.js dist/test/execution-source-path.test.js
  npm run lint
  ```

- [ ] Review for TOCTOU-sensitive assumptions, path-value leakage, wildcard
  pathspec behavior, implicit scope, and Windows junction handling.

**Stop:** The implementation must allow path traversal, follow an unverified
reparse boundary, expose a personal path, or silently treat an unreadable root
as clean.

---

### Task 5: Observe exact Git identity, revision, and dirty state with bounded real processes

**Files:**

- Create: `src/execution/binding/bounded-process.ts`
- Create: `src/execution/binding/git-observer.ts`
- Create: `src/execution/binding/source-observer.ts`
- Create: `test/execution-source-observer.test.ts`
- Create: `test/fixtures/execution/bounded-process-worker.ts`
- Modify: `test/helpers/execution-git-fixture.ts`

**Required interfaces:**

```ts
export async function observeExecutionSource(
  request: ObserveExecutionSourceRequest,
  runBinding: ExecutionSourceRunBinding,
  policy: ExecutionBindingPolicy,
): Promise<SourceBindingObservation>;
```

- [ ] First test the bounded child-process primitive with a real controlled
  child: exact-under, exact-limit, one-byte-over stdout/stderr, timeout,
  non-zero exit, spawn failure, NUL bytes, and confirmed child termination.
  The production call site remains fixed to `git`.
- [ ] Write real-Git RED tests for a clean whole worktree and clean explicit
  subset; staged, unstaged, untracked, rename, delete, type change, unmerged,
  ignored, and dirty-submodule cases; and unrelated dirty content outside an
  explicit audited subset.
- [ ] Add exact identity cases: matching commit, mismatched commit, detached
  matching HEAD, unborn HEAD, sibling worktree at the same commit, and another
  repository at the same commit/tree content but a different workspace.
- [ ] Add malformed/unsupported/truncated/overflow/error cases that prove
  `SOURCE_UNREADABLE/UNKNOWN`, nullable unobservable identity fields, and no
  partial receipt. A controlled process fixture proves timeout/overflow;
  semantic classifications continue to use real Git.
- [ ] Snapshot before/after Git `HEAD`, index, config, object refs, worktree
  content/status, and relevant metadata. Prove every success/failure leaves the
  fixture unchanged.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-source-observer.test.js
  ```

- [ ] Invoke Git with explicit arguments including `--no-pager`,
  `--no-optional-locks`, `--literal-pathspecs`, `-C <root>`, and command-specific
  arguments. Set only bounded child environment controls such as
  `GIT_OPTIONAL_LOCKS=0`, `GIT_TERMINAL_PROMPT=0`, `GIT_PAGER=cat`, and disable
  filesystem monitor behavior for status. Do not run repository hooks or
  external diffs.
- [ ] Resolve top level, Git/common directories, object format, and
  `HEAD^{commit}`. Require the resolved top level to equal the selected
  workspace; never walk to a parent or change `safe.directory`.
- [ ] Parse `git status --porcelain=v2 -z --untracked-files=all --ignored=no
  --ignore-submodules=none --no-ahead-behind` with explicit literal pathspecs.
  Use explicit rename behavior so user configuration cannot change receipt
  semantics. Reject unknown record types rather than ignoring them.
- [ ] Hash normalized internal status records into `sourceStateDigest`; do not
  expose filenames or raw Git output in the receipt. Domain-hash repository,
  worktree, source-evidence, and observation identities separately.
- [ ] Run PASS and the path regression:

  ```powershell
  npm run build
  node --test dist/test/execution-source-path.test.js dist/test/execution-source-observer.test.js
  npm run lint
  ```

- [ ] Review command arguments, environment, parser byte accounting, NUL rename
  ordering, submodule fields, Git-config influence, raw output leakage, and
  before/after mutation evidence.

**Stop:** Git observation changes repository state, requires a shell/config
write/fallback, a documented porcelain record cannot be parsed unambiguously,
or timeout/overflow cannot prove child termination.

---

### Task 6: Assemble the total read-only dispatch-readiness receipt

**Files:**

- Create: `src/execution/binding/readiness.ts`
- Create: `test/execution-dispatch-readiness.test.ts`
- Modify: `test/helpers/transactional-execution-store.ts`

**Required interfaces:**

```ts
export function assembleExecutionDispatchReadiness(
  request: AssembleExecutionDispatchReadinessRequest,
  policy: ExecutionBindingPolicy,
): DispatchReadinessReceipt;

export function parseExecutionDispatchReadinessReceipt(
  value: unknown,
  policy: ExecutionBindingPolicy,
): DispatchReadinessReceipt;
```

- [ ] Write RED tests using a real SQLite run, fresh task packet, production
  host receipt, and real Git source observations. The fully matching case must
  return deterministic `READY` bound to exact run/node/task/envelope/graph,
  controller, runtime receipt, host session, host receipt, source observation,
  and source state digests.
- [ ] Test command-precondition rejection without receipt for absent node,
  non-`READY` node, terminal run, stale task/envelope/graph identities,
  non-agent/SYNTHESIS node, foreign/missing/duplicate source, wrong controller,
  and wrong runtime receipt.
- [ ] Test every disposition: source revision/worktree/workspace known mismatch;
  source unreadable; host profile unsupported; capability unsupported/unknown;
  authority denied/unknown; instruction unknown; host session null or legacy
  as `UNKNOWN`; and two proven but different session digests as `STOPPED`.
- [ ] Test `STOPPED > UNKNOWN > READY`, complete sorted deduplicated reasons,
  stable source ordering, fixed-time byte stability, nullable host session,
  exact digests, every one-field tamper, and no `READY` with any reason.
- [ ] Snapshot database bytes and repository state before/after each assembly
  case and prove zero mutation.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-dispatch-readiness.test.js
  ```

- [ ] Build the task packet from canonical loaded state. Caller input cannot
  provide task ID, envelope hash, graph revision, controller, runtime receipt,
  or stored workspace identity.
- [ ] Keep assembly pure: it receives validated receipts/observations and makes
  no Git, SQLite, filesystem, clock, or host call. The CLI orchestration layer
  supplies one explicit assembly timestamp.
- [ ] Compute state from typed determinacy, not from reason-string ordering.
  Parse by recomputing the complete evidence and receipt identities.
- [ ] Run PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-host-receipt.test.js dist/test/execution-source-observer.test.js dist/test/execution-dispatch-readiness.test.js
  npm run lint
  ```

- [ ] Review every accepted field against the approved receipt schema and
  confirm readiness grants no authority and performs no dispatch mutation.

**Stop:** Any caller claim can override canonical run/task identity, a reason
has more than one disposition, or readiness requires writing an intent/receipt.

---

### Task 7: Expose bounded read-only CLI commands and prove end-to-end non-mutation

**Files:**

- Create: `src/execution/cli-input.ts`
- Create: `test/execution-binding-cli.test.ts`
- Modify: `src/execution/cli.ts`
- Modify: `src/cli.ts`
- Modify: `test/execution-cli.test.ts`

**Required command surface:**

```text
create-execution-host-receipt --database <path> --run <run-id>
inspect-execution-dispatch-readiness --database <path> --run <run-id> --node <node-id>
```

- [ ] Write RED tests for exact help/routing/arguments and exit semantics:
  valid host receipt exits 0; readiness `READY` exits 0; `STOPPED` or `UNKNOWN`
  exits 2; structural/input rejection emits the existing sanitized
  `{operation:"REJECTED", mutation:"NONE", error:{code}}` shape and exits 3
  or 4 according to the existing command contract.
- [ ] Write shared bounded-reader RED tests for empty, valid, malformed,
  chunked multibyte UTF-8, exact-byte, one-byte-over, and stream-error inputs.
  Overflow must return `COMMAND_INPUT_TOO_LARGE` before JSON parse and without
  retaining further chunks.
- [ ] Apply the persistence policy's existing `maxCommandInputBytes` to current
  execution JSON commands and the binding policy's exact host/readiness limits
  to the new commands. Add regression tests for prepare/result/repair/finalize
  boundary behavior without changing valid inputs.
- [ ] Build a real end-to-end temporary run whose newly stored runtime receipt
  is bound to a synthetic child `CODEX_THREAD_ID`, create the host receipt, and
  inspect whole-worktree readiness against a real clean Git repository.
- [ ] Add negative end-to-end cases for dirty worktree, wrong revision, sibling
  worktree, another repository, missing/malformed/changed session identity,
  unsupported profile, unknown capability, and over-limit stdin.
- [ ] Hash the SQLite file and snapshot repository/Git state before and after
  every new command. Prove read-only open and both commands change nothing.
- [ ] Confirm `record-execution-dispatch` and `stop-execution` still return
  `OPERATOR_PROTOCOL_VIOLATION` with no mutation.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-binding-cli.test.js dist/test/execution-cli.test.js
  ```

- [ ] Implement one byte-counting JSON reader that destroys/pauses the input on
  overflow and never echoes content. Do not add a fallback file-input path.
- [ ] Implement host-receipt CLI orchestration by loading the run through the
  existing read-only session, directly observing the current Codex session,
  and passing canonical run binding to the receipt creator.
- [ ] Implement readiness CLI orchestration by loading the exact read-only
  session/run, building a fresh task packet, parsing the host receipt, observing
  each explicit source request in deterministic order, and assembling one
  receipt.
- [ ] Add only the two exact routes/help lines to `src/cli.ts`; do not broaden
  authority or expose mutable flags.
- [ ] Run PASS plus all execution CLI/storage regressions:

  ```powershell
  npm run build
  node --test dist/test/execution-binding-cli.test.js dist/test/execution-cli.test.js
  npm run test:execution-storage
  npm run lint
  ```

- [ ] Review stdout/stderr, exit codes, stream cleanup, database open mode,
  clock injection, command flags, raw paths, host values, repository data, and
  absence of any dispatch/spawn path.

**Stop:** Read-only SQLite changes bytes, overflow is detected only after full
buffering/parse, the raw thread ID reaches a process argument/output, or either
new command can invoke a host effect.

---

### Task 8: Complete cross-platform verification and operator handoff

**Files:**

- Modify: `docs/operations/codex-native-multi-agent-runbook.md`
- Modify: `docs/project/current-state.md`
- Review: every changed file from Tasks 1-7

- [ ] Reopen the approved design and this plan. Build a criterion-to-test table
  from actual test names; do not infer coverage from file presence.
- [ ] Update the runbook with the exact read-only sequence, explicit
  `auditedPaths`, exit states, sanitized remediation, direct Codex session
  observation, legacy-session limit, and the statement that `READY` performs
  no dispatch and grants no authority.
- [ ] Update `current-state.md` only after all local evidence passes. Keep it to
  branch/PR, delivered behavior, validation, known limit/open stop, and the
  next bounded action: Slice 2 two-phase Dispatch + verified cancellation.
- [ ] Run the complete local gate:

  ```powershell
  npm ci
  npm audit
  npm run lint
  npm run build
  npm run test:execution-storage
  npm test
  npm run check:docs
  git diff --check
  ```

  Expected on the current Windows Node 26.7 host: all tests pass with only
  explicitly documented platform fixtures skipped; `npm audit` has no
  unresolved vulnerability; lane remains `CONFORMANCE_ONLY`.
- [ ] Run targeted privacy/security searches for environment enumeration,
  raw host IDs, personal absolute paths, shell execution, `safe.directory`,
  fallback/retry, secrets, transcripts, prompts, and hidden reasoning. Inspect
  every match in context; text search alone is not proof.
- [ ] Review the complete diff for scope creep, line-ending churn, generated
  output, package/lock changes, workflow changes, database/schema changes,
  unexpected current-state edits, raw test paths, and secret exposure.
- [ ] Rerun WORK_STATE. Confirm exact repository, branch, HEAD, expected dirty
  paths, upstream, and no unexpected PR before presenting review state.
- [ ] After user-authorized publication only, push the branch and require all
  existing GitHub checks: Node 24 authoritative on Ubuntu/Windows, Node 26
  conformance-only on Ubuntu/Windows, website, and documentation. A local pass
  is not CI evidence.
- [ ] Do not merge. Present the exact diff, local evidence, CI state, known
  limits, and rollback boundary for a separate user decision.

**Stop:** Any local gate fails, CI is missing/failing, Git/Node behavior differs
across lanes without a truthful disposition, a raw/sensitive value appears,
the primary dirty worktree is touched, or publication/merge lacks explicit
authority.

## Planned verification evidence

The final Slice 1 handoff must include:

- exact branch and immutable source HEAD;
- policy and schema digests;
- focused RED and PASS commands for all eight tasks;
- full local test/lint/build/docs/audit results;
- real Git repository/worktree and real SQLite non-mutation evidence;
- current Windows host Git/Node versions as observations, not requirements;
- GitHub four-lane authoritative/conformance results after publication;
- normalized unknowns/skips and their concrete remediation;
- confirmation that no worker was spawned and no dispatch intent exists; and
- the next bounded Slice 2 entry condition.

## Primary implementation references

- [Git status official documentation](https://git-scm.com/docs/git-status) —
  porcelain v2 records, `-z` machine format, rename/original path ordering,
  untracked/ignored handling, and submodule fields.
- [Git command official documentation](https://git-scm.com/docs/git) — global
  command options and explicit repository execution.
- [Node.js 24 child-process documentation](https://nodejs.org/docs/latest-v24.x/api/child_process.html#child_processexecfilefile-args-options-callback)
  — no-shell `execFile`, timeout, termination signal, and byte-bounded output.
- [Node.js 24 filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromisesrealpathpath-options)
  — `lstat`/`realpath` behavior used for boundary checks.

The locally observed planning host is Git `2.55.0.windows.3` and Node `26.7.0`.
Those values are evidence about this environment, not new version
requirements. Repository runtime policy remains the only Node authority.

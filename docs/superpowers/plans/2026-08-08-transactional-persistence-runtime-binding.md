# Transactional Persistence and Runtime Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Execution Kernel's mutable multi-file Personal run storage with one workspace-local transactional SQLite authority, and bind every accepted mutation to an exact policy-admitted runtime session receipt.

**Architecture:** Build the new persistence kernel beside the existing file-backed implementation, prove it through real SQLite integration, concurrency, crash, backup, migration, recovery, and import tests, then perform one explicit consumer cutover. The append-only event ledger remains semantic authority; graph, checkpoint, artifact, quota, and controller views are projections committed in the same short transaction. Unsupported runtimes stop before any durable filesystem mutation, and Node 26 evidence remains conformance-only.

**Tech Stack:** TypeScript 5.9.2, ESM/NodeNext, Node.js 24 LTS authoritative lane, Node.js 26 conformance-only lane, `better-sqlite3` 13.0.3, `@types/better-sqlite3` 9.6.0, `node:test`, SQLite rollback journal, GitHub Actions on Windows and Ubuntu.

## Global Constraints

- The approved design is [Transactional persistence and stable runtime binding design](../specs/2026-08-08-transactional-persistence-runtime-binding-design.md). If this plan conflicts with that design, stop and amend the plan; do not silently reinterpret the design.
- Execution starts only after a fresh `WORK_STATE` preflight confirms the intended repository, `dev-transactional-persistence` branch, source revision, worktree, upstream, and PR state. The dirty primary `main` worktree is out of scope.
- Native Codex dispatch, source/worktree attestation, external models, connector reads or writes, Team synchronization, cloud storage, encryption, and a user-facing installer remain out of scope.
- Keep the existing file-backed implementation active until Task 11. Tasks 1-10 build and prove the new store beside it; they must not dual-write or mutate legacy run directories.
- Only `src/execution/persistence/sqlite-adapter.ts` may import `better-sqlite3` in production code. Tests may import it only from `test/helpers/sqlite-test-harness.ts` for real fault and corruption setup.
- Do not hold a SQLite transaction open across filesystem backup work, child-process orchestration, Codex operations, or any future host effect.
- Do not add retry, wait, fallback, lock stealing, automatic replay, automatic repair, automatic restore activation, backup pruning, or legacy conversion.
- Runtime and storage policy are canonical, versioned JSON under `contract/execution/`. TypeScript parses the policy; it does not duplicate its values in another source file.
- The accepted runtime policy for this slice is:
  - `AUTHORITATIVE`: Node `>=24.18.0 <25` with a non-false LTS marker;
  - `CONFORMANCE_ONLY`: Node `>=26.7.0 <27` with no authoritative evidence label;
  - everything else: `UNSUPPORTED_RUNTIME_VERSION` before directory creation or persistent database open.
- The accepted exact dependency changes are `better-sqlite3@13.0.3`, `@types/better-sqlite3@9.6.0`, and `@types/node@24.13.3`. Keep TypeScript, Ajv, and YAML at their existing versions unless a demonstrated compatibility failure requires a separately reviewed change.
- `better-sqlite3` does not expose a public `sqlite3_limit()` API. The adapter therefore enforces smaller application-owned text, BLOB, and SQL bounds before binding data, verifies SQLite compile-time maxima are not below policy, uses only fixed prepared SQL, and sets `max_page_count` for the physical database ceiling. Do not claim that the engine's compiled maxima were lowered.
- Storage policy `execution-storage-policy-1.0` uses these initial hard values:

  ```json
  {
    "maxCommandInputBytes": 1048576,
    "maxResultEnvelopeBytes": 131072,
    "maxArtifactBytes": 262144,
    "maxTransactionPayloadBytes": 1048576,
    "maxRunArtifactBytes": 16777216,
    "maxLedgerBytes": 16777216,
    "maxEventsPerRun": 10000,
    "maxWorkspaceBytes": 1073741824,
    "maxBackupAggregateBytes": 3221225472,
    "maxCanonicalTextBytes": 1048576,
    "maxCanonicalBlobBytes": 1048576,
    "maxPreparedSqlBytes": 262144
  }
  ```

- These values become accepted only if the measurement test proves every current reference fixture is at or below 25% of its applicable limit and all exact-boundary and one-byte-over tests pass. Failure stops implementation for a policy decision; it does not silently raise a limit.
- Every behavior change is test-first: capture the focused RED result, implement the minimum behavior, capture the focused PASS result, then run `npm run lint`, `npm run check:docs`, and the relevant existing suite.
- Real SQLite behavior is required for transaction, lock, crash, backup, migration, restore, and corruption evidence. Do not mock the database, driver, filesystem, or child process for those checks.
- Every error must map to the closed execution reason registry and must omit raw SQL, secrets, arbitrary absolute paths, native binding paths, transcripts, connector payloads, and environment dumps.
- Each `git commit` command below is an authorization gate, not standing permission. Execute it only after the user explicitly authorizes commits for this implementation plan. Push, PR, and merge require their own applicable approvals; merge always requires a separate approval.
- After every commit, branch switch, push, PR update, merge, or other external-state change, rerun the work-state preflight before continuing.

## Planned File Structure

### Canonical contracts

- Create `contract/execution/persistence-policy.json` for the runtime and storage policy values.
- Create `contract/execution/persistence-policy.schema.json` for the agent-agnostic exact-shape contract.

### Runtime admission and evidence

- Create `src/execution/runtime-policy.ts` for strict policy parsing and lane admission.
- Create `src/execution/runtime-receipt.ts` for normalized runtime, driver, native binding, policy, lock, and Kernel evidence.
- Create `src/execution/workspace-storage.ts` for platform-managed workspace identity and storage location resolution.

### Transactional persistence kernel

- Create `src/execution/persistence/sqlite-adapter.ts` as the sole production driver boundary.
- Create `src/execution/persistence/schema.ts` for schema version 1 and fixed prepared SQL.
- Create `src/execution/persistence/session.ts` for admission-first session bootstrap and deterministic close.
- Create `src/execution/persistence/store.ts` for canonical reads and run creation.
- Create `src/execution/persistence/mutations.ts` for event/projection/checkpoint transactions.
- Create `src/execution/persistence/results.ts` for atomic result, artifact, and quota persistence.
- Create `src/execution/persistence/finalization.ts` for final handoff persistence and deterministic export.
- Create `src/execution/persistence/recovery.ts` for read-only audit and explicit reconciliation operations.
- Create `src/execution/persistence/backup.ts` for verified backup and staging restore.
- Create `src/execution/persistence/migrations.ts` for forward-only migration admission and receipts.
- Create `src/execution/persistence/legacy-import.ts` for explicit immutable legacy import.
- Create `src/execution/legacy-storage.ts` by retaining only the validated read path from the old file store.
- Replace `src/execution/storage.ts` with a small public facade only during Task 11.

### Tests and fixtures

- Create focused tests named `test/execution-runtime-policy.test.ts`, `test/execution-runtime-receipt.test.ts`, `test/execution-workspace-storage.test.ts`, `test/execution-sqlite-adapter.test.ts`, `test/execution-transactional-store.test.ts`, `test/execution-storage-concurrency.test.ts`, `test/execution-storage-results.test.ts`, `test/execution-storage-finalization.test.ts`, `test/execution-storage-recovery.test.ts`, `test/execution-storage-crash.test.ts`, `test/execution-storage-backup.test.ts`, `test/execution-storage-migrations.test.ts`, `test/execution-storage-import.test.ts`, and `test/performance/execution-storage-limits.test.ts`.
- Create `test/helpers/transactional-execution-store.ts` for synthetic session/run setup.
- Create `test/helpers/sqlite-test-harness.ts` as the only test driver import.
- Create `test/fixtures/execution/sqlite-writer-worker.ts` and `test/fixtures/execution/sqlite-crash-worker.ts` for real child-process evidence.

### Consumer, CI, and operator surfaces

- Modify `src/execution/types.ts`, `src/execution/reasons.ts`, `src/execution/command-outcome.ts`, `src/execution/cli.ts`, and `src/cli.ts` during the cutover.
- Modify `package.json`, `package-lock.json`, `tsconfig.json`, `.github/workflows/ci.yml`, and `.github/workflows/docs.yml`.
- Modify the affected execution tests and helpers only when Task 11 changes the public storage locator.
- Update `docs/operations/codex-native-multi-agent-runbook.md`, `docs/project/documentation-map.md`, and `docs/project/current-state.md` after the implementation evidence exists.

## Acceptance Coverage Map

| Design criterion | Primary tasks |
| --- | --- |
| Runtime admission and exact receipt | 1, 2, 3, 12 |
| Atomic ledger/projection/checkpoint/artifact/quota | 4, 5, 6, 7 |
| Controller lease and fencing | 5, 8 |
| Crash and recovery dispositions | 8 |
| Projection reproducibility | 5, 7, 8 |
| Backup, migration, and staging restore | 9 |
| Immutable legacy import | 10 |
| Limits and content safety | 3, 6, 12 |
| CLI and consumer cutover without dual-write | 11 |
| Cross-platform authoritative/conformance evidence and documentation | 12 |

---

### Task 1: Pin the agent-agnostic policy and runtime lanes

**Files:**

- Create: `contract/execution/persistence-policy.json`
- Create: `contract/execution/persistence-policy.schema.json`
- Create: `src/execution/runtime-policy.ts`
- Create: `test/execution-runtime-policy.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`

**Interfaces:**

```ts
export type ExecutionRuntimeLane = "AUTHORITATIVE" | "CONFORMANCE_ONLY";

export interface ExecutionRuntimeObservation {
  nodeVersion: string;
  ltsName: string | false;
}

export type ExecutionRuntimeAdmission =
  | { accepted: true; lane: ExecutionRuntimeLane; policyId: string; policyDigest: string }
  | { accepted: false; code: "UNSUPPORTED_RUNTIME_VERSION"; mutation: "NONE" };

export function parseExecutionPersistencePolicy(value: unknown): ExecutionPersistencePolicy;
export function admitExecutionRuntime(
  policy: ExecutionRuntimePolicy,
  observation: ExecutionRuntimeObservation,
): ExecutionRuntimeAdmission;
```

- [ ] Write `test/execution-runtime-policy.test.ts` first. Cover exact admission of `24.18.0` LTS, later Node 24 LTS patch admission, Node 26.7.0 conformance-only admission, Node 24 with a false LTS marker rejection, Node 26 never receiving `AUTHORITATIVE`, malformed versions, Node 22/23/25/27, prerelease versions, unknown policy fields, and a changed policy digest.
- [ ] Run the focused test and capture RED because the policy parser and admission functions do not exist:

  ```powershell
  npm run build
  node --test dist/test/execution-runtime-policy.test.js
  ```

- [ ] Add the exact JSON policy and schema. The JSON contains `contractVersion`, `runtimePolicy`, `storagePolicy`, every ID, every numeric value from Global Constraints, and no optional or extra fields.
- [ ] Enable `resolveJsonModule` in `tsconfig.json`, import the JSON with an import attribute, validate its exact shape, and compute separate canonical SHA-256 digests for the runtime and storage subdocuments.
- [ ] Implement a strict numeric `major.minor.patch` parser. Do not add a semver dependency and do not accept prerelease/build syntax.
- [ ] Install and exact-lock the accepted dependencies through the normal package flow:

  ```powershell
  npm install --save-exact better-sqlite3@13.0.3
  npm install --save-dev --save-exact @types/better-sqlite3@9.6.0 @types/node@24.13.3
  ```

- [ ] Change `package.json#engines.node` to `>=24.18.0 <25 || >=26.7.0 <27`. Confirm in tests and documentation that `engines` is an install compatibility range; the policy admission result is the evidence authority.
- [ ] Inspect the complete `package-lock.json` diff, verify the driver integrity entry, confirm no unrelated version changed, and run:

  ```powershell
  npm audit
  npm run build
  node --test dist/test/execution-runtime-policy.test.js
  npm run lint
  ```

  Expected: audit has no unresolved accepted-risk finding; focused test passes on the current Node 26 host while injected Node 24 observations receive the correct lane.
- [ ] Review the diff for generated noise, install scripts, unexpected transitive dependencies, licenses, and native-binary scope.
- [ ] If commit authorization exists, create the bounded commit:

  ```powershell
  git add package.json package-lock.json tsconfig.json contract/execution/persistence-policy.json contract/execution/persistence-policy.schema.json src/execution/runtime-policy.ts test/execution-runtime-policy.test.ts
  git commit -m "feat(execution): define persistence runtime policy"
  ```

### Task 2: Resolve workspace storage without mutation and create exact runtime receipts

**Files:**

- Create: `src/execution/workspace-storage.ts`
- Create: `src/execution/runtime-receipt.ts`
- Create: `test/execution-workspace-storage.test.ts`
- Create: `test/execution-runtime-receipt.test.ts`

**Interfaces:**

```ts
export interface ExecutionWorkspaceStorageLocation {
  workspaceId: string;
  workspaceIdentityDigest: string;
  storageDirectory: string;
  databasePath: string;
}

export interface ExecutionRuntimeReceipt {
  receiptVersion: "1.0";
  receiptId: string;
  sessionId: string;
  lane: ExecutionRuntimeLane;
  node: { version: string; lts: string | false; modules: string; napi: string };
  libraries: { v8: string; uv: string; openssl: string; sqlite: string };
  platform: { os: NodeJS.Platform; arch: string };
  driver: { name: "better-sqlite3"; version: "13.0.3"; bindingSha256: string };
  kernelRevision: string;
  dependencyLockSha256: string;
  runtimePolicyId: string;
  runtimePolicySha256: string;
  storagePolicyId: string;
  storagePolicySha256: string;
  hostSessionId: string;
  observedAt: string;
}

export interface ExecutionStorageDriverObservation {
  name: "better-sqlite3";
  version: "13.0.3";
  bindingSha256: string;
  sqliteVersion: string;
}

export function createExecutionRuntimeReceipt(
  request: CreateExecutionRuntimeReceiptRequest,
): ExecutionRuntimeReceipt;
```

- [ ] Write workspace-location RED tests for deterministic workspace IDs, path case normalization on Windows, equivalent separator normalization, app-data containment, repository-path rejection, UNC rejection, relative path rejection, symlink/reparse-point rejection, non-directory rejection, and zero directory creation.
- [ ] Write runtime-receipt RED tests for all required versions and digests, stable canonical receipt identity, exact session identity, Node 26 conformance labeling, one changed field producing a new receipt ID, and absence of raw executable, package, native binding, repository, home, or user path strings.
- [ ] Run RED:

  ```powershell
  npm run build
  node --test dist/test/execution-workspace-storage.test.js dist/test/execution-runtime-receipt.test.js
  ```

- [ ] Implement `resolveExecutionWorkspaceStorage()` as a read-only function. It accepts explicit `platform`, normalized workspace root observation, and platform app-data root; it returns the digest-derived location but never calls `mkdir` or opens a database.
- [ ] Use the application directory name `ai-booster-kit/execution-workspaces/<workspaceId>` on POSIX and `AI Booster Kit\execution-workspaces\<workspaceId>` on Windows. The database filename is `execution.sqlite`.
- [ ] Reject Windows UNC paths and storage roots outside the observed local app-data root. On non-Windows profiles, accept only the observed XDG data root or the observed `~/.local/share` root. Treat locality that cannot be established by the active host profile as `HOST_CAPABILITY_UNKNOWN`; do not infer a security guarantee from a path string.
- [ ] Keep `runtime-receipt.ts` pure and driver-independent. It accepts an explicit `ExecutionStorageDriverObservation`, validates the exact driver name/version, binding digest, and SQLite version, then creates the receipt. The real observation is produced by Task 3 only after runtime admission.
- [ ] Read and hash `package-lock.json`; accept `kernelRevision`, `sessionId`, `hostSessionId`, and `observedAt` as explicit inputs. Validate all identifiers before canonicalization.
- [ ] Run focused PASS and secret/path assertions:

  ```powershell
  npm run build
  node --test dist/test/execution-workspace-storage.test.js dist/test/execution-runtime-receipt.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/workspace-storage.ts src/execution/runtime-receipt.ts test/execution-workspace-storage.test.ts test/execution-runtime-receipt.test.ts
  git commit -m "feat(execution): bind workspace and runtime identity"
  ```

### Task 3: Build the narrow SQLite adapter and schema

**Files:**

- Create: `src/execution/persistence/sqlite-adapter.ts`
- Create: `src/execution/persistence/schema.ts`
- Create: `test/helpers/sqlite-test-harness.ts`
- Create: `test/execution-sqlite-adapter.test.ts`
- Create: `test/performance/execution-storage-limits.test.ts`

**Interfaces:**

```ts
export interface ExecutionSqliteDatabase {
  databasePath: string;
  sqliteVersion: string;
  schemaVersion: number;
  close(): void;
}

export function openExecutionSqliteDatabase(
  request: ExecutionSqliteOpenRequest,
): ExecutionSqliteDatabase;

export function runImmediateExecutionTransaction<T>(
  database: ExecutionSqliteDatabase,
  operation: () => T,
): T;
```

- [ ] Write RED integration tests that create a real persistent database and assert exact read-back of `journal_mode=delete`, `synchronous=2`, `foreign_keys=1`, `trusted_schema=0`, and `busy_timeout=0`; schema version 1; all required tables, keys, foreign keys, uniqueness rules, and append-only triggers; deterministic close; read-only open; unsupported newer schema rejection; and normalized writer conflict errors.
- [ ] Define schema version 1 with these tables: `storage_metadata`, `runtime_receipts`, `runs`, `controller_leases`, `execution_events`, `run_projections`, `artifacts`, `operation_intents`, `quota_usage`, `backup_receipts`, `migration_receipts`, `import_receipts`, and `recovery_audits`.
- [ ] Store canonical JSON and its SHA-256 together for receipts, envelopes, events, projections, artifacts, and operation evidence. Use composite run-scoped keys where identity is run-local. Require every mutating row to reference a runtime receipt and every run mutation to carry a fencing token.
- [ ] Add triggers that reject update/delete of `execution_events` and update of immutable receipt bodies. Do not expose general SQL execution through the adapter interface.
- [ ] Expose a closed, driver-neutral prepared-statement bundle only to the other `persistence/` modules. Do not expose the driver's `Database` or `Statement` objects, `exec`, `prepare`, `pragma`, or arbitrary SQL execution to controllers, CLI, graph, result, finalization, or host modules.
- [ ] Load the exact packaged platform export (`better-sqlite3/win32-x64`, `better-sqlite3/win32-arm64`, `better-sqlite3/linux-x64`, `better-sqlite3/linux-arm64`, `better-sqlite3/linuxmusl-x64`, `better-sqlite3/linuxmusl-arm64`, `better-sqlite3/darwin-x64`, or `better-sqlite3/darwin-arm64`) rather than a build fallback. Hash the matching `prebuilds/<platform>-<arch>.node` regular file, open `:memory:`, read `sqlite_version()`, and return the driver observation without persisting its raw path. Unsupported platform/architecture or missing prebuild stops with `HOST_PROFILE_UNSUPPORTED` before durable storage mutation.
- [ ] Configure the driver with constructor `timeout: 0`; set and read back all accepted pragmas; compute `max_page_count` from the actual page size and `maxWorkspaceBytes`; query `PRAGMA compile_options` and fail if compiled `MAX_LENGTH` or `MAX_SQL_LENGTH` is below policy.
- [ ] Keep every prepared SQL string as a module constant in `schema.ts`. Add a test that measures every statement and proves it is at or below `maxPreparedSqlBytes`; no request field may become SQL text.
- [ ] Add the performance/fixture measurement test. It measures current envelopes, graphs, result envelopes, events, final handoffs, and the largest synthetic allowed artifact, then asserts each current fixture is at or below 25% of the applicable v1 hard limit.
- [ ] Run RED, implement the adapter, then run PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-sqlite-adapter.test.js dist/test/performance/execution-storage-limits.test.js
  npm run lint
  ```

- [ ] Prove the import boundary:

  ```powershell
  rg -n 'from "better-sqlite3"|require\("better-sqlite3"\)' src test
  ```

  Expected: one production hit in `sqlite-adapter.ts` and one test hit in `sqlite-test-harness.ts`.
- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/sqlite-adapter.ts src/execution/persistence/schema.ts test/helpers/sqlite-test-harness.ts test/execution-sqlite-adapter.test.ts test/performance/execution-storage-limits.test.ts
  git commit -m "feat(execution): add transactional sqlite boundary"
  ```

### Task 4: Bootstrap admitted sessions and persist canonical runs

**Files:**

- Create: `src/execution/persistence/session.ts`
- Create: `src/execution/persistence/store.ts`
- Create: `test/helpers/transactional-execution-store.ts`
- Create: `test/execution-transactional-store.test.ts`
- Modify: `src/execution/types.ts`
- Modify: `src/execution/resume.ts`
- Modify: `src/execution/compare.ts`
- Modify: `src/execution/finalize.ts`

**Interfaces:**

```ts
export interface ExecutionStoreSession {
  workspaceId: string;
  databasePath: string;
  runtimeReceipt: ExecutionRuntimeReceipt;
  database: ExecutionSqliteDatabase;
}

export interface TransactionalExecutionRun {
  workspaceId: string;
  databasePath: string;
  runId: string;
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  checkpoint: ExecutionCheckpoint;
  lastEventHash: string;
}

export interface ExecutionRunView {
  envelope: ExecutionEnvelope;
  graph: ExecutionGraph;
  events: readonly ExecutionEvent[];
  checkpoint: ExecutionCheckpoint;
  artifacts: readonly ExecutionArtifactRef[];
  evidenceRefs: readonly ExecutionEvidenceRef[];
  acceptedResults: readonly ExecutionResultEnvelope[];
  finalHandoff: FinalExecutionHandoff | null;
}

export interface TransactionalLoadedExecutionRun extends ExecutionRunView {
  workspaceId: string;
  databasePath: string;
  runId: string;
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
}

export function openExecutionStoreSession(request: ExecutionStoreSessionRequest): ExecutionStoreSession;
export function closeExecutionStoreSession(session: ExecutionStoreSession): void;
export function createTransactionalExecutionRun(session: ExecutionStoreSession, request: CreateExecutionRunRequest): TransactionalExecutionRun;
export function loadTransactionalExecutionRun(session: ExecutionStoreSession, runId: string): TransactionalLoadedExecutionRun;
```

- [ ] Write RED tests proving an unsupported runtime leaves the previously absent app-data root absent; an admitted runtime creates exactly one workspace directory and database; the immutable runtime receipt is inserted before the run; run creation atomically inserts envelope, `RUN_CREATED`, `GRAPH_ACCEPTED`, projection, checkpoint, quota, and controller rows; duplicate run ID commits nothing; and close/reopen yields the same canonical run.
- [ ] Add tests that mutate the database through the test harness to create a hash mismatch, missing receipt, foreign workspace ID, or impossible projection and prove the normal loader rejects rather than choosing a convenient representation.
- [ ] Implement session bootstrap in this order: parse policy, observe and admit runtime, resolve the future location without mutation, create the in-memory driver observation and receipt, create the workspace directory, open/configure the persistent database, bootstrap schema, validate metadata, insert-or-read the immutable receipt, return the session.
- [ ] Ensure every error before the explicit directory-creation step leaves no directory. If directory creation succeeds but database bootstrap fails, preserve the failed path as evidence and return `STORAGE_UNAVAILABLE`; do not silently remove or retry it.
- [ ] Implement run creation as one immediate transaction with an initial fencing token of `1`. Use the existing envelope, graph, event, ledger replay, and checkpoint validators before binding values.
- [ ] Implement canonical load from rows, verify every stored digest, replay the ledger, assert projection/checkpoint equality, and return no driver-specific objects.
- [ ] Introduce the storage-neutral `ExecutionRunView`. Make the existing file-backed `LoadedExecutionRun` extend it, and narrow resume, comparison, and finalization functions to consume the view they actually need. This is a type-only compatibility change; existing file storage and CLI behavior must remain unchanged.
- [ ] Run focused PASS and the unchanged legacy storage tests:

  ```powershell
  npm run build
  node --test dist/test/execution-transactional-store.test.js dist/test/execution-storage.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/session.ts src/execution/persistence/store.ts src/execution/types.ts src/execution/resume.ts src/execution/compare.ts src/execution/finalize.ts test/helpers/transactional-execution-store.ts test/execution-transactional-store.test.ts
  git commit -m "feat(execution): persist admitted execution runs"
  ```

### Task 5: Enforce controller ownership, fencing, and atomic graph transitions

**Files:**

- Create: `src/execution/persistence/mutations.ts`
- Create: `test/execution-storage-concurrency.test.ts`
- Create: `test/fixtures/execution/sqlite-writer-worker.ts`
- Modify: `src/execution/reasons.ts`
- Modify: `src/execution/command-outcome.ts`
- Modify: `test/execution-reasons.test.ts`

**Interfaces:**

```ts
export interface ExecutionMutationAuthority {
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  expectedLedgerHead: string;
  expectedGraphRevision: number;
}

export function commitExecutionGraphTransition(
  session: ExecutionStoreSession,
  request: CommitExecutionGraphTransitionRequest,
): TransactionalLoadedExecutionRun;

export function readExecutionControllerLease(
  session: ExecutionStoreSession,
  runId: string,
): ExecutionControllerLease;
```

- [ ] Add closed reasons `STALE_FENCING_TOKEN` and `CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED`. Define exact persistence phase, storage/run subject, determinacy, `RECONCILE_ONLY` or `NEVER` retry policy, evidence fields, and operator action. Update the exact reason-list test before production code.
- [ ] Write RED tests for one atomic event+graph+checkpoint change, stale ledger head, stale graph revision, wrong controller, stale fencing token, second controller without reconciliation, and an invalid projection causing total rollback.
- [ ] Write a real two-process race. Both workers receive the same database, run, controller/token, ledger head, and graph revision. Exactly one commits; the loser returns `WRITER_CONFLICT` or the exact stale-head rejection after the winner commits. The resulting ledger must have one valid next prefix and no duplicate sequence.
- [ ] Implement mutation admission inside `BEGIN IMMEDIATE`: reread ownership, fencing token, runtime receipt, ledger head, graph revision, and quota before inserts. Never trust a pre-transaction read as the decision.
- [ ] Insert events and update graph/checkpoint/quota/lease observation in the same transaction. All stored events identify the runtime receipt and fencing token used for the mutation.
- [ ] Do not implement ownership transfer in this task. Expose only the current lease read and fenced mutation path; Task 8 adds transfer after a matching read-only recovery audit. Time passage alone never changes ownership.
- [ ] Run focused and registry PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-storage-concurrency.test.js dist/test/execution-reasons.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/mutations.ts src/execution/reasons.ts src/execution/command-outcome.ts test/execution-storage-concurrency.test.ts test/execution-reasons.test.ts test/fixtures/execution/sqlite-writer-worker.ts
  git commit -m "feat(execution): fence transactional run mutations"
  ```

### Task 6: Commit results, artifacts, content checks, and quotas together

**Files:**

- Create: `src/execution/persistence/results.ts`
- Create: `test/execution-storage-results.test.ts`
- Modify: `src/execution/reasons.ts`
- Modify: `src/execution/command-outcome.ts`
- Modify: `test/execution-reasons.test.ts`

**Interfaces:**

```ts
export function commitAcceptedExecutionResult(
  session: ExecutionStoreSession,
  request: CommitAcceptedExecutionResultRequest,
): { run: TransactionalLoadedExecutionRun; artifact: ExecutionArtifactRef };

export function commitTerminalExecutionResult(
  session: ExecutionStoreSession,
  request: CommitTerminalExecutionResultRequest,
): TransactionalLoadedExecutionRun;

export function commitRejectedExecutionResult(
  session: ExecutionStoreSession,
  request: CommitRejectedExecutionResultRequest,
): TransactionalLoadedExecutionRun;
```

- [ ] Add reasons `ARTIFACT_TOO_LARGE` and `STORAGE_QUOTA_EXCEEDED` to the closed registry and exact mapping tests. Reuse `RESULT_TOO_LARGE`, `CONTENT_FORBIDDEN`, `SENSITIVE_CONTENT`, and `WRITER_CONFLICT` where their existing meanings are exact.
- [ ] Write RED tests for a successful accepted result transaction containing `NODE_RESULT_RECEIVED`, result artifact, evidence references, `NODE_RESULT_ACCEPTED`, final graph, checkpoint, quota, and lease observation; terminal STOPPED and UNKNOWN worker results; explicit rejection; duplicate artifact; and stale authority.
- [ ] Add exact positive, boundary, and one-byte-over tests for command input, result, artifact, transaction payload, per-run artifacts, ledger bytes, event count, canonical text/BLOB, and physical workspace ceiling. Every over-limit test asserts no new event, artifact, quota reservation, projection, or receipt.
- [ ] Add a synthetic forbidden-content corpus covering token/password/cookie/authorization fields, raw prompt/transcript/reasoning fields, raw connector payloads, environment dumps, arbitrary absolute paths, and unnecessary personal fields. Assert rejection happens before a transaction and error output contains neither the value nor its path.
- [ ] Use `test/helpers/sqlite-test-harness.ts` to install a temporary SQLite trigger that aborts after artifact insertion. Call the real accepted-result function and prove that artifact, events, projection, checkpoint, and quota all roll back. Drop the trigger only after evidence is captured.
- [ ] Implement complete parsing and byte measurement before `BEGIN IMMEDIATE`; inside the transaction recheck mutable quota and authority, reserve quota, insert the content-addressed artifact, append both events, update projections, and commit once.
- [ ] Do not persist artifact content outside SQLite. Store canonical bytes, media type, byte length, digest, owning event sequence, runtime receipt, and fencing token.
- [ ] Run focused PASS and existing handoff/content tests:

  ```powershell
  npm run build
  node --test dist/test/execution-storage-results.test.js dist/test/execution-handoff.test.js dist/test/execution-validation.test.js dist/test/execution-reasons.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/results.ts src/execution/reasons.ts src/execution/command-outcome.ts test/execution-storage-results.test.ts test/execution-reasons.test.ts
  git commit -m "feat(execution): commit results and quotas atomically"
  ```

### Task 7: Finalize from the ledger and generate deterministic exports

**Files:**

- Create: `src/execution/persistence/finalization.ts`
- Create: `test/execution-storage-finalization.test.ts`

**Interfaces:**

```ts
export function commitFinalExecutionHandoff(
  session: ExecutionStoreSession,
  request: CommitFinalExecutionHandoffRequest,
): TransactionalLoadedExecutionRun;

export async function exportExecutionRunSnapshot(
  session: ExecutionStoreSession,
  request: ExportExecutionRunSnapshotRequest,
): Promise<ExecutionRunExportReceipt>;
```

- [ ] Write RED tests proving final JSON, final Markdown, the terminal event, graph/checkpoint projection, artifact metadata, and quota commit together; duplicate finalization is rejected; invalid handoff commits nothing; and the final view is regenerated from the accepted ledger prefix plus content-addressed artifacts.
- [ ] Write export tests proving export reads one committed snapshot, writes to a new explicit destination, includes database/workspace/run/schema/ledger-head identity, is byte-deterministic for the same snapshot, never advances the run, and cannot overwrite or become a second authority.
- [ ] Inject a real SQLite abort during final artifact insertion and prove no partial finalization. Inject a filesystem export failure and prove the committed run remains unchanged and no export receipt is accepted.
- [ ] Implement finalization as one immediate transaction using existing final handoff validation/rendering. Store both final artifacts in SQLite and append the terminal event in that transaction.
- [ ] Implement export after the read transaction closes. Write to a new staging directory, verify every output digest, then rename the staging directory to a new destination. Existing destinations fail with `TARGET_ALREADY_EXISTS`; incomplete export staging is preserved for inspection rather than treated as success.
- [ ] Run focused and existing finalization PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-storage-finalization.test.js dist/test/execution-resume-finalize.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/finalization.ts test/execution-storage-finalization.test.ts
  git commit -m "feat(execution): finalize from transactional ledger"
  ```

### Task 8: Audit restart state, prove crash prefixes, and reconcile explicitly

**Files:**

- Create: `src/execution/persistence/recovery.ts`
- Create: `test/execution-storage-recovery.test.ts`
- Create: `test/execution-storage-crash.test.ts`
- Create: `test/fixtures/execution/sqlite-crash-worker.ts`
- Modify: `src/execution/reasons.ts`
- Modify: `test/execution-reasons.test.ts`

**Interfaces:**

```ts
export type ExecutionRecoveryDisposition =
  | "HEALTHY"
  | "PROJECTION_REBUILD_REQUIRED"
  | "PENDING_EFFECT_RECONCILIATION_REQUIRED"
  | "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED"
  | "STORAGE_CORRUPT"
  | "UNSUPPORTED_SCHEMA_OR_RUNTIME";

export function openExecutionRecoverySession(
  request: ExecutionRecoverySessionRequest,
): ExecutionRecoverySession;

export function auditExecutionStorage(
  session: ExecutionRecoverySession,
): ExecutionRecoveryAudit;

export function rebuildExecutionProjections(
  session: ExecutionStoreSession,
  request: RebuildExecutionProjectionsRequest,
): ExecutionReconciliationReceipt;

export function reconcileExecutionControllerOwnership(
  session: ExecutionStoreSession,
  request: ReconcileExecutionControllerRequest,
): { controllerId: string; fencingToken: number; reconciliationReceiptId: string };
```

- [ ] Add reasons `PROJECTION_REBUILD_REQUIRED`, `PENDING_EFFECT_RECONCILIATION_REQUIRED`, and `STORAGE_CORRUPT`. Keep schema/runtime incompatibility mapped to the existing exact reasons. Update the closed registry test first.
- [ ] Write one RED case for each of the six recovery dispositions. Cover path/workspace mismatch, `PRAGMA integrity_check` failure, bad ledger order/hash, missing artifact, artifact digest mismatch, projection divergence, unsupported newer schema, unsupported runtime receipt, pending operation intent, and an active lease owned by a previous or different controller session.
- [ ] Implement `openExecutionRecoverySession()` as a separate admission-first inspection path. It may open an existing database sufficiently to allow documented SQLite rollback-journal recovery and inspection, but it never creates a workspace, bootstraps a schema, migrates, inserts a runtime receipt, accepts a newer schema for mutation, or returns a mutable `ExecutionStoreSession`.
- [ ] Assert audit is Kernel-read-only: after SQLite performs any documented rollback-journal recovery during open, capture database and logical state digests before and after the Kernel audit and prove they match. No audit path may insert a recovery receipt; the caller persists a receipt only through an explicit reconciliation command.
- [ ] Build the crash worker with real SQLite. Terminate child processes after event insert, projection update, artifact insert, quota update, and commit. Reopen and audit each database. Every pre-commit termination yields the previous prefix; post-commit termination yields the next prefix; no case yields a midpoint or automatic replay.
- [ ] Seed a durable `*_INTENDED` operation without a receipt, restart, and prove the result is `PENDING_EFFECT_RECONCILIATION_REQUIRED` with no host invocation and no automatic retry.
- [ ] Implement projection rebuild as a separate fenced transaction that requires the matching prior audit ID, replays the complete ledger, replaces only derived projections, verifies the new result, and writes a reconciliation receipt. It must not edit events or artifacts.
- [ ] Implement ownership reconciliation as a separate transaction that consumes a matching prior audit, writes a reconciliation receipt, changes controller identity, and increments the fencing token exactly once. Prove the former controller and token can never mutate afterward. A repeated or mismatched audit ID must fail without mutation.
- [ ] Run focused PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-storage-recovery.test.js dist/test/execution-storage-crash.test.js dist/test/execution-reasons.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/recovery.ts src/execution/reasons.ts test/execution-storage-recovery.test.ts test/execution-storage-crash.test.ts test/execution-reasons.test.ts test/fixtures/execution/sqlite-crash-worker.ts
  git commit -m "feat(execution): make storage recovery explicit"
  ```

### Task 9: Verify backups, forward migrations, and staging restore

**Files:**

- Create: `src/execution/persistence/backup.ts`
- Create: `src/execution/persistence/migrations.ts`
- Create: `test/execution-storage-backup.test.ts`
- Create: `test/execution-storage-migrations.test.ts`
- Modify: `src/execution/reasons.ts`
- Modify: `src/execution/command-outcome.ts`
- Modify: `test/execution-reasons.test.ts`

**Interfaces:**

```ts
export async function createVerifiedExecutionBackup(
  session: ExecutionStoreSession,
  request: CreateExecutionBackupRequest,
): Promise<ExecutionBackupReceipt>;

export async function stageExecutionRestore(
  request: StageExecutionRestoreRequest,
): Promise<ExecutionRestoreStagingReceipt>;

export async function migrateExecutionStorage(
  session: ExecutionStoreSession,
  request: MigrateExecutionStorageRequest,
): Promise<ExecutionMigrationReceipt>;
```

- [ ] Add reasons `BACKUP_INVALID` and `MIGRATION_FAILED` to the closed registry and exact operational mapping tests.
- [ ] Write RED backup tests using the real driver `.backup(destination)` promise. Verify a successful backup with a separate connection, `integrity_check`, schema, workspace ID, policy digest, file digest, file size, and sidecar receipt. Verify backup quota, existing destination, unwritable destination, truncated backup, foreign workspace, and sidecar failure.
- [ ] Write RED migration tests using a synthetic schema-1 database and a test migration registry. Cover additive automatic migration after verified backup, backup failure preventing any migration SQL, SQL failure rolling back `user_version` and all rows, unknown newer schema rejection, missing migration gap, changed migration digest, and destructive classification requiring explicit approval.
- [ ] Implement backup with no active write transaction. A backup is valid only after independent reopen and verification. Persist its receipt in the active database only after verification; write the canonical sidecar to a new file and verify its digest. Any partial artifact remains unregistered and cannot authorize migration.
- [ ] Implement migrations as a strictly ordered registry of `{fromVersion, toVersion, risk, digest, statements}`. Run accepted SQL and `user_version` update inside one exclusive SQLite transaction after the backup receipt is reread and matched. No downgrade function exists.
- [ ] Implement restore staging only. It copies through SQLite backup semantics into a new staging database, verifies all identities and integrity, and returns a staging receipt. Do not implement active-database overwrite, rename, deletion, or activation in this slice.
- [ ] Run focused PASS:

  ```powershell
  npm run build
  node --test dist/test/execution-storage-backup.test.js dist/test/execution-storage-migrations.test.js dist/test/execution-reasons.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/persistence/backup.ts src/execution/persistence/migrations.ts src/execution/reasons.ts src/execution/command-outcome.ts test/execution-storage-backup.test.ts test/execution-storage-migrations.test.ts test/execution-reasons.test.ts
  git commit -m "feat(execution): verify backup and migration boundaries"
  ```

### Task 10: Import immutable legacy runs without converting them

**Files:**

- Create: `src/execution/legacy-storage.ts`
- Create: `src/execution/persistence/legacy-import.ts`
- Create: `test/execution-storage-import.test.ts`
- Modify: `src/execution/reasons.ts`
- Modify: `src/execution/command-outcome.ts`
- Modify: `test/execution-reasons.test.ts`

**Interfaces:**

```ts
export interface LegacyLoadedExecutionRun extends ExecutionRunView {
  runDirectory: string;
}

export function readLegacyExecutionRun(
  runDirectory: string,
): Promise<LegacyLoadedExecutionRun>;

export function importLegacyExecutionRun(
  session: ExecutionStoreSession,
  request: ImportLegacyExecutionRunRequest,
): Promise<ExecutionImportReceipt>;
```

- [ ] Move a copy of the current validated file read path into `legacy-storage.ts`; omit `mkdir`, write, append, rename, replacement, and manifest mutation helpers. Keep `src/execution/storage.ts` unchanged until Task 11.
- [ ] Add reason `LEGACY_IMPORT_INVALID` and exact registry/mapping tests.
- [ ] Write RED tests that hash every source directory entry before import and after success/failure. Cover valid import, malformed JSON, invalid event chain, projection mismatch, artifact mismatch, untracked file, path escape, symlink, duplicate destination run ID, source identity mismatch, policy limit, forbidden content, and injected destination transaction failure.
- [ ] Validate the full legacy run, source file list, canonical digests, run identity, envelope/graph/event/checkpoint agreement, artifacts, source binding, content policy, and destination quota before beginning the import transaction.
- [ ] Import receipt fields are `receiptVersion`, receipt ID/digest, normalized source identity digest, sorted source file digests, source run/envelope/graph/ledger identities, destination workspace/schema/policy, runtime receipt, imported byte/event/artifact counts, and observation time. Do not persist the raw source path.
- [ ] Commit the entire imported run, events, projections, artifacts, quota, ownership state, and import receipt once. On any failure, commit no destination run. Never rename, delete, rewrite, annotate, or mark the legacy source.
- [ ] Run focused PASS and the still-unchanged legacy tests:

  ```powershell
  npm run build
  node --test dist/test/execution-storage-import.test.js dist/test/execution-storage.test.js dist/test/execution-reasons.test.js
  npm run lint
  ```

- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/legacy-storage.ts src/execution/persistence/legacy-import.ts src/execution/reasons.ts src/execution/command-outcome.ts test/execution-storage-import.test.ts test/execution-reasons.test.ts
  git commit -m "feat(execution): import immutable legacy runs"
  ```

### Task 11: Cut the Kernel and CLI over once, with no dual-write

**Files:**

- Modify: `src/execution/storage.ts`
- Modify: `src/execution/types.ts`
- Modify: `src/execution/cli.ts`
- Modify: `src/cli.ts`
- Modify: `test/helpers/completed-execution-run.ts`
- Modify: `test/execution-storage.test.ts`
- Modify: `test/execution-resume-finalize.test.ts`
- Modify: `test/execution-cli.test.ts`
- Modify: any other execution test returned by `rg -l 'runDirectory|appendRunEvent|saveGraphSnapshot|saveAcceptedResult|saveFinalExecutionHandoff' src test`

**Interfaces:**

```ts
export interface ExecutionRunLocator {
  databasePath: string;
  workspaceId: string;
  runId: string;
}

export interface PersonalExecutionRun extends ExecutionRunLocator {
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
  checkpoint: ExecutionCheckpoint;
  lastEventHash: string;
}

export interface LoadedExecutionRun extends ExecutionRunLocator, ExecutionRunView {
  controllerId: string;
  fencingToken: number;
  runtimeReceiptId: string;
}
```

- [ ] Rewrite public-storage tests first to expect a database/run locator, runtime receipt, controller ID, and fencing token rather than a run directory. Remove assertions that treat `graph.json`, `checkpoint.json`, `events.jsonl`, or `artifacts/manifest.json` as current authority.
- [ ] Define the transitional developer CLI exactly:
  - `prepare-execution --workspace <absolute-workspace> --app-data-root <absolute-local-data-root> --controller-id <id>`;
  - read commands: `--database <absolute-database> --run <run-id>` plus command-specific read arguments;
  - mutating commands: the read locator plus `--controller-id <id> --fencing-token <positive-integer>`;
  - compare: `--single-database`, `--single-run`, `--multi-database`, `--multi-run`.
- [ ] The prepare command returns `workspaceId`, `databasePath`, `runId`, `controllerId`, `fencingToken`, `runtimeReceiptId`, and lane. Node 26 returns `CONFORMANCE_ONLY`; it must not claim authoritative evidence.
- [ ] Replace the old storage module with a small facade over session/store/mutation/result/finalization APIs. Remove exported file mutation functions. Retain legacy file access only through explicitly named `readLegacyExecutionRun` and `importLegacyExecutionRun` paths.
- [ ] Refactor each CLI command to call one command-specific transactional function. Result acceptance, terminal result, rejection, repair, and finalization must each contain one storage commit rather than event/snapshot/artifact sequences.
- [ ] Preserve the v2 rules that single-phase dispatch recording and unverified stop recording are rejected. Do not implement host dispatch in this cutover.
- [ ] Rewrite `completed-execution-run.ts` to use one admitted temporary workspace database and explicit authority. Update all affected tests without weakening their semantic assertions.
- [ ] Prove removal of the old write surface:

  ```powershell
  rg -n 'appendRunEvent|saveGraphSnapshot|saveAcceptedResult|saveFinalExecutionHandoff|events\.jsonl|checkpoint\.json|artifacts/manifest\.json' src
  ```

  Expected: no production mutable-file persistence hits; legacy read constants may remain only in `legacy-storage.ts`.
- [ ] Run the entire execution suite, then the repository suite:

  ```powershell
  npm run build
  node --test dist/test/execution-*.test.js dist/test/conformance/*.test.js dist/test/performance/*.test.js
  npm run lint
  npm test
  ```

- [ ] Review the cutover diff specifically for dual writes, compatibility shims that hide errors, driver leakage, raw database paths in canonical receipts, and weakened negative tests.
- [ ] If commit authorization exists:

  ```powershell
  git add src/execution/storage.ts src/execution/types.ts src/execution/cli.ts src/cli.ts test/helpers/completed-execution-run.ts test/execution-storage.test.ts test/execution-resume-finalize.test.ts test/execution-cli.test.ts
  git add --update src/execution test
  git commit -m "refactor(execution): cut over to transactional persistence"
  ```

### Task 12: Prove both runtime lanes, document operations, and close the gate

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/docs.yml`
- Modify: `docs/operations/codex-native-multi-agent-runbook.md`
- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/current-state.md`
- Modify: `package.json` only if a focused execution-storage script is needed
- Create: `test/execution-runtime-lane.test.ts`

**Interfaces:**

```text
EXECUTION_EXPECTED_RUNTIME_LANE=AUTHORITATIVE
EXECUTION_EXPECTED_RUNTIME_LANE=CONFORMANCE_ONLY
```

The environment value is a test expectation supplied by the CI matrix. It is not trusted evidence by itself; the test compares it with the independently observed and persisted runtime receipt.

- [ ] Change CI to a four-entry include matrix:

  ```yaml
  strategy:
    fail-fast: false
    matrix:
      include:
        - os: ubuntu-latest
          node: 24
          lane: AUTHORITATIVE
        - os: windows-latest
          node: 24
          lane: AUTHORITATIVE
        - os: ubuntu-latest
          node: 26
          lane: CONFORMANCE_ONLY
        - os: windows-latest
          node: 26
          lane: CONFORMANCE_ONLY
  ```

- [ ] Each matrix entry runs `npm ci`, dependency/native binding observation, lint, build, focused persistence tests, crash/concurrency tests, and the full repository suite with `EXECUTION_EXPECTED_RUNTIME_LANE` set from the matrix. Keep website validation in one separate Ubuntu/Node 24 job to avoid multiplying unrelated work.
- [ ] Change documentation CI to Node 24. Keep pull-request and `main` triggers intact.
- [ ] Add an actual-runtime test that reads `process.version` and `process.release.lts`, opens a temporary admitted session, and verifies the stored receipt lane matches `EXECUTION_EXPECTED_RUNTIME_LANE`. An unset lane is allowed only for local focused development and cannot produce authoritative completion evidence.
- [ ] Document the practical operating contract in the existing runbook: zero database configuration for future end users, developer Node/runtime requirements, platform-managed location, local-filesystem-only boundary, plaintext database and backup possibility, no encryption claim or warning, no Team/cloud sync, backup/migration/restore behavior, quotas, recovery dispositions, and explicit legacy import.
- [ ] Update the documentation map to link the approved design, this plan, policy contract, and runbook without duplicating roadmap state.
- [ ] Run local verification. The current shell Node 26.7.0 can produce only conformance evidence. The Codex bundled Node 24.14.0 is below the policy minimum and must be rejected. If no admitted Node 24 binary is available locally through the explicit `AI_BOOSTER_NODE24` path, record the authoritative local lane as `NOT EXECUTED`; do not relabel Node 26.

  ```powershell
  npm ci
  npm audit
  npm run lint
  npm run check:docs
  npm test
  git diff --check
  ```

- [ ] When an admitted local Node 24 binary is available, run the same gate explicitly:

  ```powershell
  & $env:AI_BOOSTER_NODE24 --version
  & $env:AI_BOOSTER_NODE24 ./node_modules/typescript/bin/tsc
  & $env:AI_BOOSTER_NODE24 --test dist/test/*.test.js dist/test/conformance/*.test.js dist/test/performance/*.test.js
  ```

  Expected: exact Node 24 receipt and `AUTHORITATIVE`. If `AI_BOOSTER_NODE24` is absent or below `24.18.0`, stop the local authoritative claim and use approved CI evidence after publication authorization.
- [ ] Run a focused secret/path scan over changed code, tests, fixtures, policy, and docs. Inspect all error snapshots and receipt fixtures manually for raw paths, SQL, tokens, cookies, authorization values, prompts, transcripts, and environment dumps.
- [ ] Review the complete diff for scope creep, line-ending churn, generated noise, native artifacts, database files, backup files, temporary crash files, and unintended workflow/permission changes. No `.sqlite`, journal, backup, native `.node`, or test temp artifact may be tracked.
- [ ] Only after all required Node 24 authoritative and Node 26 conformance checks pass, update `docs/project/current-state.md` with the exact revision, validation evidence, known limits, any remaining `NOT EXECUTED` host evidence, and the next bounded action. Native Dispatch and the new reference run remain blocked until this gate is complete.
- [ ] If commit authorization exists:

  ```powershell
  git add .github/workflows/ci.yml .github/workflows/docs.yml docs/operations/codex-native-multi-agent-runbook.md docs/project/documentation-map.md docs/project/current-state.md package.json package-lock.json test/execution-runtime-lane.test.ts
  git commit -m "docs(execution): close transactional persistence gate"
  ```

- [ ] Rerun the work-state preflight and report branch, HEAD, worktree, upstream, PR state, exact checks, Node/runtime receipts, dependency audit, remaining limits, and whether publication approval is still required.

## Final Stop Gate

Do not begin native Codex Dispatch or the immutable-SHA Multi-Agent Pipeline reference run unless all of these are true:

- Node 24 authoritative and Node 26 conformance lanes both pass on the required Windows/Ubuntu matrix;
- every committed mutation is receipt-bound and fencing-checked;
- crash, recovery, projection replay, backup, migration, staging restore, import, quota, and forbidden-content evidence is green against real SQLite;
- the old file mutation API is absent and legacy directories are read-only;
- documentation states plaintext and unsupported Team/cloud/encryption boundaries accurately;
- the complete diff is reviewed and the accepted implementation revision is immutable.

If any item is missing, report the exact state as `STOPPED`, `UNKNOWN`, `NOT EXECUTED`, or `PARTIAL`; do not promote it to readiness.

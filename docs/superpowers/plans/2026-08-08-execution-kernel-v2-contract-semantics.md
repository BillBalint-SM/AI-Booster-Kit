# Execution Kernel v2 Contract Semantics Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the versioned, closed, deterministic semantics core that every later Execution Kernel v2 storage, host, dispatch, result, recovery, and evidence operation must consume.

**Architecture:** Keep the semantics core pure and storage-independent. A version gate classifies v1 as legacy read-only and v2 as the only mutable contract; a closed reason registry supplies normalized operational meaning; one total transition reducer derives node/run disposition; graph, ledger, and CLI validation consume those central decisions instead of maintaining local copies.

**Tech Stack:** TypeScript 5.9, Node.js 26.x as currently declared by the repository, native `node:test`, existing SHA-256/canonical JSON helpers; no new dependency.

## Global Constraints

- Current mutable execution contract version is exactly `2.0`.
- Contract version `1.0` is legacy read-only; no constructor or mutating command may create, upgrade, or mutate a v1 run.
- This slice does not implement the future v1 historical file loader; it exposes the classification and mutation guard that loader must use.
- No external LLM, model API, workflow engine, connector, network call, or external write is permitted.
- No persistence-backend, source-binding, host-binding, dispatch, cancellation, evidence-resolution, resume-reconciliation, or reference-run implementation belongs in this slice.
- Command rejection and persisted run state are distinct: invalid input returns `operation: "REJECTED"` and `mutation: "NONE"`; it must not claim persisted `STOPPED` state.
- Reason codes are closed for v2. An unmapped phase observation is normalized to its registered `UNCLASSIFIED_<PHASE>_OUTCOME` and resolves to `UNKNOWN`; arbitrary uppercase strings are invalid.
- Terminal runs reject every later mutating operation without changing the ledger, graph, checkpoint, manifest, or artifacts.
- Every behavior change starts from one targeted failing test, adds the minimum implementation, and passes its focused test before the next task.
- Commit commands in this plan are review checkpoints only; do not stage or commit without separate explicit user approval.

## Scope, acceptance, risks, and stop conditions

**Acceptance criteria**

1. Every newly created envelope, packet, result, event, checkpoint, handoff, and comparison uses version `2.0`.
2. Version `1.0` is classifiable as `LEGACY_READ_ONLY` and is rejected by the mutable-version guard with `EXECUTION_LEGACY_CONTRACT_READ_ONLY`.
3. Every reason used by the v2 semantics core is present in one closed registry with phase, subject, determinacy, disposition, retry policy, required evidence field names, and finalization/comparison permissions.
4. Unknown registry codes fail validation; unclassified host observations use a registered phase-specific unknown code.
5. The transition reducer is total over every node state, run state, required/optional flag, and registered core observation.
6. Worker statuses `STOPPED` and `UNKNOWN` cannot resolve to node `SUCCEEDED`.
7. Terminal run mutation attempts return a no-mutation rejection.
8. Graph and ledger validation call the shared transition semantics; they do not retain conflicting private transition maps.
9. CLI configuration and contract errors produce canonical rejected-operation output without fabricating persisted run state.
10. Focused tests, the complete repository test suite, lint, documentation checks, and diff checks pass.

**Primary risks**

- A mechanical version change can accidentally make v1 fixtures look like v2 history. Keep one explicit v1 legacy fixture and update only active fixtures.
- Moving transition authority can leave a second transition table in graph or ledger. The final source scan must prove one semantic authority.
- A broad reason union without registry metadata recreates the current arbitrary-code weakness. The type must be derived from the registry data.
- CLI output changes can be confused with persistent run transitions. Tests must inspect storage before and after rejected commands.
- Transactional result routing cannot be completed safely before the persistence slice. This plan defines and tests the pure decision but does not add a partial multi-file mutation path.

**Stop conditions**

- Stop if implementation requires choosing SQLite, a recovery journal, or another persistence backend.
- Stop if a Codex host fact or interrupt/spawn behavior would need to be assumed.
- Stop if v1 historical files would need to be rewritten, deleted, upgraded, or loaded as writable state.
- Stop if a new dependency appears necessary.
- Stop on a conflicting worktree, branch, HEAD, unrecognized existing edit, or failing baseline unrelated to this slice.

## File map

| File | Responsibility |
| --- | --- |
| `src/execution/version.ts` | Current/legacy contract version classification and mutable-version guard. |
| `src/execution/reasons.ts` | Closed v2 reason registry and reason lookup/parsing. |
| `src/execution/semantics.ts` | Pure total node/run transition decision and terminal guard. |
| `src/execution/command-outcome.ts` | Canonical accepted/rejected CLI operation result types and constructors. |
| `src/execution/types.ts` | v2 artifact literals, `DISPATCHING` state, and shared semantic types only. |
| `src/execution/validation.ts` | Creates/parses only mutable v2 envelopes through the version gate. |
| `src/execution/graph.ts` | Delegates node-transition legality to `semantics.ts`. |
| `src/execution/ledger.ts` | Validates reason codes and event transitions through the shared registry/reducer. |
| `src/execution/handoff.ts` | Emits/parses v2 packet/result literals; exposes result status to the pure reducer without routing persistence. |
| `src/execution/finalize.ts` | Emits/parses v2 handoff literals. |
| `src/execution/compare.ts` | Emits v2 comparison literal. |
| `src/execution/cli.ts` | Canonical no-mutation rejection output and terminal mutation gate. |
| `test/fixtures/execution/legacy-v1-envelope.json` | One synthetic secret-free v1 historical envelope fixture. |
| `test/execution-version.test.ts` | v1 read-only/v2 mutable version policy. |
| `test/execution-reasons.test.ts` | Registry closure and metadata completeness. |
| `test/execution-semantics.test.ts` | Generated total transition and terminal-guard matrix. |
| `test/execution-command-outcome.test.ts` | Canonical command response contract. |
| `test/execution-contract.test.ts` | v2 envelope integration and legacy rejection. |
| `test/execution-graph.test.ts` | Shared transition-authority integration. |
| `test/execution-storage.test.ts` | Read-back proves newly created run artifacts are v2. |
| `test/execution-cli.test.ts` | Rejected operation output and zero-mutation CLI evidence. |
| `test/helpers/execution-fixtures.ts` | Active v2 fixture data only. |
| `test/helpers/completed-execution-run.ts` | Active v2 result/handoff fixture data only. |

---

### Task 1: Freeze v2 mutable and v1 read-only version semantics

**Files:**

- Create: `src/execution/version.ts`
- Create: `test/execution-version.test.ts`
- Create: `test/fixtures/execution/legacy-v1-envelope.json`

**Interfaces:**

- Produces: `CURRENT_EXECUTION_CONTRACT_VERSION`, `LEGACY_EXECUTION_CONTRACT_VERSION`, `ExecutionContractVersion`, `ExecutionVersionDisposition`, `classifyExecutionContractVersion(value)`, and `assertMutableExecutionContractVersion(value)`.
- Consumed later by: envelope validation, storage load routing, every mutating CLI command, and future historical inspection.

- [ ] **Step 1: Add the failing version-policy test and synthetic legacy fixture**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertMutableExecutionContractVersion,
  classifyExecutionContractVersion,
} from "../src/execution/version.js";

test("execution version policy keeps v1 read-only and v2 mutable", () => {
  assert.equal(classifyExecutionContractVersion("1.0"), "LEGACY_READ_ONLY");
  assert.equal(classifyExecutionContractVersion("2.0"), "CURRENT_MUTABLE");
  assert.throws(
    () => assertMutableExecutionContractVersion("1.0"),
    /EXECUTION_LEGACY_CONTRACT_READ_ONLY/,
  );
  assert.doesNotThrow(() => assertMutableExecutionContractVersion("2.0"));
  assert.throws(
    () => classifyExecutionContractVersion("3.0"),
    /EXECUTION_CONTRACT_VERSION_UNSUPPORTED/,
  );
});
```

The JSON fixture must contain the current synthetic v1 envelope shape with
`"contractVersion": "1.0"`, the existing `"a"`-repeated source revision, no
Personal path, and no host or credential data.

- [ ] **Step 2: Build and run the focused test to prove RED**

Run: `npm run build && node --test dist/test/execution-version.test.js`

Expected: build fails because `src/execution/version.ts` does not exist.

- [ ] **Step 3: Implement the exact version interface**

```ts
import { ExecutionContractError } from "./types.js";

export const CURRENT_EXECUTION_CONTRACT_VERSION = "2.0" as const;
export const LEGACY_EXECUTION_CONTRACT_VERSION = "1.0" as const;

export type ExecutionContractVersion =
  | typeof LEGACY_EXECUTION_CONTRACT_VERSION
  | typeof CURRENT_EXECUTION_CONTRACT_VERSION;

export type ExecutionVersionDisposition =
  | "LEGACY_READ_ONLY"
  | "CURRENT_MUTABLE";

export function classifyExecutionContractVersion(value: unknown): ExecutionVersionDisposition {
  if (value === LEGACY_EXECUTION_CONTRACT_VERSION) return "LEGACY_READ_ONLY";
  if (value === CURRENT_EXECUTION_CONTRACT_VERSION) return "CURRENT_MUTABLE";
  throw new ExecutionContractError(
    "EXECUTION_CONTRACT_VERSION_UNSUPPORTED",
    "execution contract version is unsupported",
  );
}

export function assertMutableExecutionContractVersion(value: unknown): void {
  const disposition = classifyExecutionContractVersion(value);
  if (disposition === "LEGACY_READ_ONLY") {
    throw new ExecutionContractError(
      "EXECUTION_LEGACY_CONTRACT_READ_ONLY",
      "execution contract version 1.0 is historical read-only state",
    );
  }
}
```

- [ ] **Step 4: Run the focused test to prove GREEN**

Run: `npm run build && node --test dist/test/execution-version.test.js`

Expected: PASS.

- [ ] **Step 5: Review the task diff and pause at the commit gate**

Run: `git diff --check && git diff -- src/execution/version.ts test/execution-version.test.ts test/fixtures/execution/legacy-v1-envelope.json`

Expected: only the three named files, no secrets, no line-ending churn.

Commit only after explicit approval: `git add src/execution/version.ts test/execution-version.test.ts test/fixtures/execution/legacy-v1-envelope.json && git commit -m "feat: define execution contract v2 version boundary"`

---

### Task 2: Add the closed v2 reason registry

**Files:**

- Create: `src/execution/reasons.ts`
- Create: `test/execution-reasons.test.ts`

**Interfaces:**

- Produces: `ExecutionReasonCode`, `ExecutionReasonDefinition`, `executionReasonRegistry`, `parseExecutionReasonCode(value)`, and `executionReason(code)`.
- Consumes: node/run state types from `types.ts` only as type imports.
- Registry source of truth: the accepted reason families in `docs/superpowers/specs/2026-08-08-execution-kernel-contingency-contract-audit.md#required-reason-families`.

- [ ] **Step 1: Add a failing registry-closure test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  executionReason,
  executionReasonRegistry,
  parseExecutionReasonCode,
} from "../src/execution/reasons.js";

test("execution reason registry is closed and every definition is actionable", () => {
  const definitions = Object.values(executionReasonRegistry);
  assert.equal(definitions.length, new Set(definitions.map((entry) => entry.code)).size);
  assert.ok(definitions.length > 0);
  for (const definition of definitions) {
    assert.notEqual(definition.phase, "");
    assert.notEqual(definition.subject, "");
    assert.notEqual(definition.determinacy, "");
    assert.notEqual(definition.disposition, "");
    assert.notEqual(definition.retryPolicy, "");
    assert.ok(Array.isArray(definition.requiredEvidenceFields));
    assert.ok(Array.isArray(definition.forbiddenEvidenceFields));
    assert.ok(Array.isArray(definition.allowedNodeStates));
    assert.ok(Array.isArray(definition.allowedRunStates));
    assert.notEqual(definition.operatorAction, "");
  }
  assert.equal(executionReason("RESULT_STATUS_STOPPED").disposition, "STOP_KNOWN");
  assert.equal(executionReason("RESULT_STATUS_UNKNOWN").disposition, "MARK_UNKNOWN");
  assert.equal(executionReason("COMMAND_ARGUMENTS_INVALID").disposition, "REJECT_INPUT");
  assert.throws(() => parseExecutionReasonCode("ARBITRARY_REASON"));
});
```

- [ ] **Step 2: Run the focused test to prove RED**

Run: `npm run build && node --test dist/test/execution-reasons.test.js`

Expected: build fails because the registry module does not exist.

- [ ] **Step 3: Define the registry types and exact code families**

```ts
import type { ExecutionNodeState, ExecutionRunState } from "./types.js";

export type ExecutionPhase =
  | "PREPARATION"
  | "SOURCE"
  | "HOST"
  | "DISPATCH"
  | "RESULT"
  | "EVIDENCE"
  | "DEADLINE"
  | "CANCELLATION"
  | "PERSISTENCE"
  | "RESUME"
  | "FINALIZATION"
  | "SECURITY"
  | "OPERATOR";

export type ExecutionReasonSubject = "COMMAND" | "RUN" | "NODE" | "HOST" | "STORAGE";
export type ExecutionDeterminacy = "KNOWN_ABSENT" | "KNOWN_PRESENT" | "AMBIGUOUS";
export type ExecutionDisposition =
  | "REJECT_INPUT"
  | "STOP_KNOWN"
  | "MARK_UNKNOWN"
  | "REJECT_NODE"
  | "IDEMPOTENT_NOOP"
  | "WAIT_NOOP"
  | "ACCEPT_LIMIT";
export type ExecutionRetryPolicy =
  | "NEVER"
  | "CORRECT_AND_RESUBMIT"
  | "WAIT_FOR_OBSERVATION"
  | "RECONCILE_ONLY"
  | "RETURN_PRIOR_RECEIPT";
export type ExecutionOperatorAction =
  | "NONE"
  | "CORRECT_INPUT"
  | "SELECT_NEW_RUN"
  | "WAIT_FOR_OBSERVATION"
  | "RECONCILE"
  | "PROVIDE_AUTHORITY"
  | "INSPECT_STORAGE";

export interface ExecutionReasonDefinition {
  code: string;
  phase: ExecutionPhase;
  subject: ExecutionReasonSubject;
  determinacy: ExecutionDeterminacy;
  disposition: ExecutionDisposition;
  retryPolicy: ExecutionRetryPolicy;
  requiredEvidenceFields: readonly string[];
  forbiddenEvidenceFields: readonly string[];
  allowedNodeStates: readonly (ExecutionNodeState | null)[];
  allowedRunStates: readonly (ExecutionRunState | null)[];
  requiredNodeResult: ExecutionNodeState | null;
  optionalNodeResult: ExecutionNodeState | null;
  requiredRunResult: ExecutionRunState | null;
  optionalRunResult: ExecutionRunState | null;
  operatorAction: ExecutionOperatorAction;
  finalizationAllowed: boolean;
  comparisonAllowed: boolean;
}
```

Use this exact v2 operational reason-code set. Do not include state names,
event names, subject enum values, internal `ExecutionContractError` codes, or
audit coverage labels:

```ts
export const executionReasonCodes = [
  "COMMAND_ARGUMENTS_INVALID",
  "INPUT_JSON_INVALID",
  "ENVELOPE_INVALID",
  "GRAPH_INVALID",
  "TARGET_ALREADY_EXISTS",
  "SOURCE_REVISION_MISMATCH",
  "WORKTREE_DIRTY_IN_SCOPE",
  "WORKSPACE_IDENTITY_MISMATCH",
  "SOURCE_UNREADABLE",
  "HOST_PROFILE_UNSUPPORTED",
  "HOST_CAPABILITY_UNKNOWN",
  "HOST_INSTRUCTION_STATE_UNKNOWN",
  "AUTHORITY_NOT_PROVEN",
  "SPAWN_REJECTED",
  "SPAWN_FAILED_CONFIRMED",
  "SPAWN_OUTCOME_UNKNOWN",
  "AGENT_ID_MISSING",
  "AGENT_ID_MISMATCH",
  "WRONG_AGENT_ROUTE",
  "UNAUTHORIZED_DELEGATION",
  "DISPATCH_BUDGET_EXHAUSTED",
  "PARALLELISM_EXHAUSTED",
  "DISPATCH_IDENTITY_CONFLICT",
  "DISPATCH_OUTCOME_UNKNOWN",
  "DUPLICATE_DISPATCH",
  "LATE_RESULT",
  "DUPLICATE_RESULT",
  "RESULT_TOO_LARGE",
  "RESULT_JSON_INVALID",
  "RESULT_FIELDS_INVALID",
  "RESULT_FOREIGN",
  "RESULT_STALE",
  "RESULT_STATUS_STOPPED",
  "RESULT_STATUS_UNKNOWN",
  "RESULT_IDENTITY_UNRESOLVED",
  "RESULT_CONFLICT",
  "EVIDENCE_MISSING",
  "EVIDENCE_HASH_MISMATCH",
  "EVIDENCE_PATH_MISSING",
  "EVIDENCE_LINE_INVALID",
  "EVIDENCE_SCOPE_VIOLATION",
  "CLAIM_UNSUPPORTED",
  "CONTENT_FORBIDDEN",
  "WALL_CLOCK_EXPIRED",
  "WAIT_TIMEOUT_CONFIRMED_ACTIVE",
  "WAIT_TIMEOUT_THREAD_UNKNOWN",
  "REPAIR_BUDGET_EXHAUSTED",
  "NODE_BUDGET_EXHAUSTED",
  "REPAIR_SCOPE_VIOLATION",
  "USER_CANCEL_REQUESTED",
  "USER_CANCELLED_BEFORE_DISPATCH",
  "INTERRUPT_CONFIRMED",
  "INTERRUPT_FAILED",
  "INTERRUPT_OUTCOME_UNKNOWN",
  "LATE_RESULT_AFTER_CANCEL",
  "WRITER_CONFLICT",
  "PARTIAL_MUTATION",
  "LEDGER_CORRUPT",
  "SNAPSHOT_DIVERGED",
  "MANIFEST_DIVERGED",
  "PENDING_REPLACEMENT",
  "STORAGE_UNAVAILABLE",
  "PARTIAL_FINALIZATION",
  "TERMINAL_RUN",
  "ACTIVE_THREAD_MISSING",
  "RUNTIME_EVIDENCE_STALE",
  "RECOVERY_IDENTITY_MISMATCH",
  "NO_RESUMABLE_WORK",
  "CROSS_SESSION_THREAD_UNPROVEN",
  "FINALIZATION_PRECONDITION_FAILED",
  "FINALIZATION_ALREADY_EXISTS",
  "RUNS_NOT_COMPARABLE",
  "TERMINAL_LEDGER_MISSING",
  "PATH_ESCAPE",
  "SYMLINK_BOUNDARY",
  "SENSITIVE_CONTENT",
  "AUTHORITY_EXCEEDED",
  "PERMISSION_DENIED",
  "UNTRUSTED_INSTRUCTION",
  "UNSUPPORTED_SCHEMA_VERSION",
  "UNSUPPORTED_RUNTIME_VERSION",
  "OPERATOR_PROTOCOL_VIOLATION",
  "CLOCK_INVALID",
  "UNCLASSIFIED_PREPARATION_OUTCOME",
  "UNCLASSIFIED_DISPATCH_OUTCOME",
  "UNCLASSIFIED_RESULT_OUTCOME",
  "UNCLASSIFIED_FINALIZATION_OUTCOME",
] as const;

export type ExecutionReasonCode = typeof executionReasonCodes[number];

export const executionReasonRegistry: Readonly<
  Record<ExecutionReasonCode, ExecutionReasonDefinition>
> = defineExecutionReasonRegistry();
```

`defineExecutionReasonRegistry()` returns one explicit definition for every
code above, using the accepted audit's 14 family defaults and its named
exceptions. The four `UNCLASSIFIED_*` definitions use `AMBIGUOUS`,
`MARK_UNKNOWN`, `RECONCILE_ONLY`, and deny finalization and comparison. The
function validates at module initialization that every array code occurs once,
every object key is in the array, and each definition's `code` equals its key.

- [ ] **Step 4: Add exact registry membership assertions**

The test must assert the registry contains, at minimum, every code named in the
audit's `Required reason families` table and that the set has no additional
arbitrary code. Use one literal expected array in the test so removal or typo is
observable during review.

- [ ] **Step 5: Run the focused registry test to prove GREEN**

Run: `npm run build && node --test dist/test/execution-reasons.test.js`

Expected: PASS with unknown-code rejection.

- [ ] **Step 6: Review and pause at the commit gate**

Run: `git diff --check && git diff -- src/execution/reasons.ts test/execution-reasons.test.ts`

Expected: one registry module and one focused test; no CLI, graph, ledger, or storage edits.

Commit only after explicit approval: `git add src/execution/reasons.ts test/execution-reasons.test.ts && git commit -m "feat: add closed execution reason registry"`

---

### Task 3: Implement the pure total transition reducer and terminal guard

**Files:**

- Create: `src/execution/semantics.ts`
- Create: `test/execution-semantics.test.ts`
- Modify: `src/execution/types.ts`

**Interfaces:**

- Consumes: `ExecutionReasonCode`, registry metadata, current node/run states, and required/optional node classification.
- Produces: `decideExecutionTransition(input)`, `assertExecutionRunMutable(runState)`, and `assertExecutionNodeTransition(from, to)`.
- Does not consume storage paths, event sequence numbers, timestamps, agent references, or host calls.

- [ ] **Step 1: Extend only the shared v2 semantic state types**

Change the node-state union to include `DISPATCHING` between `READY` and
`RUNNING`. Change all v2 artifact-version literals in `types.ts` from `1.0` to
`2.0`. Do not add a v1/v2 union to mutable artifact types.

- [ ] **Step 2: Add the failing status-routing and terminal tests**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertExecutionRunMutable,
  decideExecutionTransition,
} from "../src/execution/semantics.js";

test("required worker stop and unknown can never become success", () => {
  assert.deepEqual(
    decideExecutionTransition({
      reasonCode: "RESULT_STATUS_STOPPED",
      nodeRequired: true,
      nodeState: "RUNNING",
      runState: "RUNNING",
    }),
    {
      outcome: "STOPPED",
      nextNodeState: "STOPPED",
      nextRunState: "STOPPED",
      mutation: "NODE_AND_RUN",
      reconciliationRequired: false,
    },
  );
  assert.deepEqual(
    decideExecutionTransition({
      reasonCode: "RESULT_STATUS_UNKNOWN",
      nodeRequired: true,
      nodeState: "RUNNING",
      runState: "RUNNING",
    }),
    {
      outcome: "UNKNOWN",
      nextNodeState: "UNKNOWN",
      nextRunState: "UNKNOWN",
      mutation: "NODE_AND_RUN",
      reconciliationRequired: true,
    },
  );
});

test("terminal execution runs reject mutation without changing state", () => {
  for (const state of ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"] as const) {
    assert.throws(() => assertExecutionRunMutable(state), /TERMINAL_RUN/);
  }
});
```

- [ ] **Step 3: Run the focused test to prove RED**

Run: `npm run build && node --test dist/test/execution-semantics.test.js`

Expected: build fails because the reducer module does not exist and `DISPATCHING` is not yet fully supported.

- [ ] **Step 4: Implement the exact pure decision surface**

```ts
export interface ExecutionTransitionInput {
  reasonCode: ExecutionReasonCode;
  nodeRequired: boolean | null;
  nodeState: ExecutionNodeState | null;
  runState: ExecutionRunState | null;
}

export interface ExecutionTransitionDecision {
  outcome: "REJECTED_INPUT" | "STOPPED" | "UNKNOWN" | "REJECTED" | "UNCHANGED" | "COMPLETE_WITH_LIMIT";
  nextNodeState: ExecutionNodeState | null;
  nextRunState: ExecutionRunState | null;
  mutation: "NONE" | "NODE" | "RUN" | "NODE_AND_RUN";
  reconciliationRequired: boolean;
}

export function decideExecutionTransition(input: ExecutionTransitionInput): ExecutionTransitionDecision;
export function assertExecutionRunMutable(runState: ExecutionRunState): void;
```

The reducer rules must cover these core cases exactly:

| Input disposition/context | Node result | Run result |
| --- | --- | --- |
| `REJECT_INPUT` | unchanged | unchanged |
| `RESULT_STATUS_STOPPED`, required running node | `STOPPED` | `STOPPED` |
| `RESULT_STATUS_STOPPED`, optional running node | `STOPPED` | unchanged |
| `RESULT_STATUS_UNKNOWN`, any running node | `UNKNOWN` | `UNKNOWN` |
| correlated result validation rejection, required node | `REJECTED` | `STOPPED` |
| correlated result validation rejection, optional node | `REJECTED` | unchanged |
| exact duplicate/idempotent receipt | unchanged | unchanged |
| wait timeout with thread confirmed active | unchanged | unchanged |
| unclassified phase outcome | affected node `UNKNOWN` when safely identified | `UNKNOWN` |
| any mutation against terminal run | no mutation; throw `TERMINAL_RUN` |
| reason invalid for the supplied phase/state | no mutation; throw `OPERATOR_PROTOCOL_VIOLATION` |

- [ ] **Step 5: Add generated totality assertions**

The test must iterate all exported node states, run states, required/optional
values, and every registry definition. Each combination must either return one
valid decision or throw exactly `OPERATOR_PROTOCOL_VIOLATION`/`TERMINAL_RUN`;
it must never return `undefined`, fall through, or produce `SUCCEEDED` for
`RESULT_STATUS_STOPPED` or `RESULT_STATUS_UNKNOWN`.

- [ ] **Step 6: Run focused tests to prove GREEN**

Run: `npm run build && node --test dist/test/execution-semantics.test.js dist/test/execution-reasons.test.js`

Expected: PASS.

- [ ] **Step 7: Review and pause at the commit gate**

Run: `git diff --check && git diff -- src/execution/types.ts src/execution/semantics.ts test/execution-semantics.test.ts`

Expected: pure state/types/decision changes only; no filesystem or CLI behavior.

Commit only after explicit approval: `git add src/execution/types.ts src/execution/semantics.ts test/execution-semantics.test.ts && git commit -m "feat: add total execution transition semantics"`

---

### Task 4: Route graph and ledger validation through the shared semantics

**Files:**

- Modify: `src/execution/graph.ts`
- Modify: `src/execution/ledger.ts`
- Modify: `test/execution-graph.test.ts`
- Create: `test/execution-ledger-semantics.test.ts`

**Interfaces:**

- Graph consumes a single exported `assertExecutionNodeTransition(from, to)` helper from `semantics.ts`.
- Ledger consumes `parseExecutionReasonCode` and the same transition helper.
- Neither module defines a private reason-code regex or a second state-transition table.

- [ ] **Step 1: Add failing integration tests**

Add tests proving:

```ts
assert.doesNotThrow(() => assertExecutionNodeTransition("READY", "DISPATCHING"));
assert.doesNotThrow(() => assertExecutionNodeTransition("DISPATCHING", "RUNNING"));
assert.doesNotThrow(() => assertExecutionNodeTransition("RUNNING", "UNKNOWN"));
assert.throws(() => assertExecutionNodeTransition("UNKNOWN", "SUCCEEDED"));
```

Create a ledger event with `reasonCode: "ARBITRARY_REASON"` and assert
`parseExecutionEvent` rejects it. Create a valid `NODE_UNKNOWN` event from
`RUNNING` to `UNKNOWN` with `RESULT_STATUS_UNKNOWN` and assert it parses.

- [ ] **Step 2: Run focused graph/ledger tests to prove RED**

Run: `npm run build && node --test dist/test/execution-graph.test.js dist/test/execution-ledger-semantics.test.js`

Expected: FAIL because graph/ledger still own v1 transition and regex behavior.

- [ ] **Step 3: Replace local semantic authority**

Required v2 transition edges:

```ts
PENDING -> READY
READY -> DISPATCHING
DISPATCHING -> RUNNING | STOPPED | UNKNOWN
RUNNING -> RESULT_RECEIVED | REJECTED | STOPPED | UNKNOWN
RESULT_RECEIVED -> SUCCEEDED | REJECTED | STOPPED | UNKNOWN
SUCCEEDED | REJECTED | STOPPED | UNKNOWN -> no successor
```

Add the v2 event names `DISPATCH_INTENDED`, `DISPATCH_CONFIRMED`, and
`NODE_UNKNOWN`. Keep persistence of those events out of this task; only their
schema and transition validation are introduced.

- [ ] **Step 4: Make ledger reason parsing registry-backed**

Delete the local arbitrary-uppercase acceptance rule. `null` remains legal only
for events whose schema explicitly requires no reason. Every non-null reason is
parsed through `parseExecutionReasonCode` and validated against the event phase.

- [ ] **Step 5: Run focused tests to prove GREEN**

Run: `npm run build && node --test dist/test/execution-graph.test.js dist/test/execution-ledger-semantics.test.js`

Expected: PASS.

- [ ] **Step 6: Prove one semantic authority remains**

Run: `rg -n "const transitions|reasonCodePattern" src/execution`

Expected: no private graph transition table and no reason-code regex; semantic definitions resolve to `semantics.ts` and `reasons.ts` only.

- [ ] **Step 7: Review and pause at the commit gate**

Run: `git diff --check && git diff -- src/execution/graph.ts src/execution/ledger.ts test/execution-graph.test.ts test/execution-ledger-semantics.test.ts`

Commit only after explicit approval: `git add src/execution/graph.ts src/execution/ledger.ts test/execution-graph.test.ts test/execution-ledger-semantics.test.ts && git commit -m "refactor: centralize execution transition validation"`

---

### Task 5: Migrate active artifacts and fixtures to v2 without rewriting history

**Files:**

- Modify: `src/execution/validation.ts`
- Modify: `src/execution/handoff.ts`
- Modify: `src/execution/finalize.ts`
- Modify: `src/execution/compare.ts`
- Modify: `test/helpers/execution-fixtures.ts`
- Modify: `test/helpers/completed-execution-run.ts`
- Modify: focused execution tests that assert active artifact version literals
- Modify: `test/execution-contract.test.ts`
- Modify: `test/execution-storage.test.ts`

**Interfaces:**

- All active constructors emit v2.
- All active parsers accept v2 only.
- v1 classification remains available only through `version.ts`; no active fixture is silently dual-version.

- [ ] **Step 1: Change active fixture expectations to v2 and prove RED**

Change `referenceEnvelopeInput.contractVersion`, packet/result/event/checkpoint,
handoff, and comparison expectations from `1.0` to `2.0`. Add an assertion that
passing the legacy fixture to `createExecutionEnvelope` throws
`EXECUTION_LEGACY_CONTRACT_READ_ONLY`.

Run: `npm run build && node --test dist/test/execution-contract.test.js dist/test/execution-storage.test.js dist/test/execution-handoff.test.js dist/test/execution-compare.test.js`

Expected: FAIL on current v1 constructors/parsers.

- [ ] **Step 2: Update constructors and parsers to exact v2 literals**

Use `CURRENT_EXECUTION_CONTRACT_VERSION` for envelope creation and the literal
`2.0` types for subordinate artifacts. `createExecutionEnvelope` must call
`assertMutableExecutionContractVersion` before hashing. Do not add any migration
or coercion from `1.0` to `2.0`.

- [ ] **Step 3: Prove newly stored runs contain only v2 active artifacts**

Extend the storage test to read `envelope.json`, `events.jsonl`, and
`checkpoint.json` and assert exact `2.0` version values. It must also confirm the
legacy fixture was not changed by the test.

- [ ] **Step 4: Run focused migration tests to prove GREEN**

Run: `npm run build && node --test dist/test/execution-contract.test.js dist/test/execution-storage.test.js dist/test/execution-handoff.test.js dist/test/execution-resume-finalize.test.js dist/test/execution-compare.test.js`

Expected: PASS.

- [ ] **Step 5: Scan for accidental active v1 literals**

Run: `rg -n 'Version: "1\.0"|contractVersion: "1\.0"|Version, \["1\.0"\]' src/execution test --glob '!test/fixtures/execution/legacy-v1-envelope.json'`

Expected: no active execution artifact literal remains at v1.

- [ ] **Step 6: Review and pause at the commit gate**

Run: `git diff --check && git diff --stat && git diff -- src/execution test`

Expected: version-literal migration plus the explicit legacy fixture test; no historical run artifact rewrite.

Commit only after explicit approval: `git add src/execution test && git commit -m "feat: move active execution artifacts to contract v2"`

---

### Task 6: Route v2 worker statuses without promoting stop or unknown to success

**Files:**

- Modify: `src/execution/types.ts`
- Modify: `src/execution/handoff.ts`
- Modify: `src/execution/cli.ts`
- Modify: `test/execution-handoff.test.ts`
- Modify: `test/execution-cli.test.ts`

**Interfaces:**

- `ExecutionResultEnvelope` adds `reasonCode: ExecutionReasonCode | null`.
- `READY_FOR_VALIDATION` requires `reasonCode: null`.
- `STOPPED` requires `reasonCode: "RESULT_STATUS_STOPPED"` in this slice.
- `UNKNOWN` requires `reasonCode: "RESULT_STATUS_UNKNOWN"` in this slice.
- `routeExecutionResultStatus(status, nodeRequired, nodeState, runState)` delegates to `decideExecutionTransition` and returns the exact node/run decision.

- [ ] **Step 1: Add failing Result Envelope status tests**

Extend the result-template assertion with `reasonCode: null`. Add these focused
parser cases:

```ts
assert.throws(
  () => parseExecutionResult({ ...validResult, status: "STOPPED", reasonCode: null }, maxBytes),
  /RESULT_STATUS_STOPPED/,
);
assert.throws(
  () => parseExecutionResult({ ...validResult, status: "UNKNOWN", reasonCode: null }, maxBytes),
  /RESULT_STATUS_UNKNOWN/,
);
assert.equal(
  parseExecutionResult(
    { ...validResult, status: "STOPPED", reasonCode: "RESULT_STATUS_STOPPED" },
    maxBytes,
  ).status,
  "STOPPED",
);
```

- [ ] **Step 2: Add failing CLI routing tests**

For a required running node, submit one valid v2 `STOPPED` Result Envelope and
assert:

- the command never prints `SUCCEEDED`;
- the node ends in `STOPPED`;
- the run ends in `STOPPED`;
- the final node event is `NODE_STOPPED` with `RESULT_STATUS_STOPPED`;
- the worker result is not written as a successful result artifact; and
- dependent nodes remain non-ready.

In an independent temporary run, submit one valid v2 `UNKNOWN` Result Envelope
and assert node/run `UNKNOWN`, a `NODE_UNKNOWN` event with
`RESULT_STATUS_UNKNOWN`, no success artifact, and no newly ready dependent.

- [ ] **Step 3: Run focused tests to prove RED**

Run:

```powershell
npm run build
node --test dist/test/execution-handoff.test.js dist/test/execution-cli.test.js
```

Expected: FAIL because the v1 result shape has no reason field and the current
CLI routes every validated status through `RESULT_RECEIVED -> SUCCEEDED`.

- [ ] **Step 4: Add strict status/reason correlation**

Add `reasonCode` to the exact result key list and parser. Parse non-null values
through `parseExecutionReasonCode`. Reject these mismatches before any run
mutation:

| Status | Allowed reason |
| --- | --- |
| `READY_FOR_VALIDATION` | `null` |
| `STOPPED` | `RESULT_STATUS_STOPPED` |
| `UNKNOWN` | `RESULT_STATUS_UNKNOWN` |

The next Result Admission plan may add validated domain-specific worker reasons;
this slice deliberately allows only the two closed status reasons.

- [ ] **Step 5: Route status before the success admission path**

In `runAcceptExecutionResult`, branch immediately after correlation and
validation:

- `READY_FOR_VALIDATION` continues to the existing receive/validate/accept path;
- `STOPPED` uses the pure reducer, appends `NODE_STOPPED`, writes the matching
  graph state, and appends `RUN_STOPPED` only when the reducer returns a run
  mutation;
- `UNKNOWN` uses the pure reducer, appends `NODE_UNKNOWN`, writes the matching
  graph state, and appends `RUN_UNKNOWN`;
- neither terminal-status branch calls `saveAcceptedResult`; and
- neither branch can unlock readiness, because readiness reconciliation occurs
  only after `SUCCEEDED`.

Use the current storage primitives exactly as they exist. Do not claim atomic
visibility; the persistence plan remains responsible for replacing this
multi-file mutation sequence with one recoverable commit.

- [ ] **Step 6: Run focused tests to prove GREEN**

Run:

```powershell
npm run build
node --test dist/test/execution-handoff.test.js dist/test/execution-cli.test.js dist/test/execution-semantics.test.js
```

Expected: PASS and no worker terminal status reaches `SUCCEEDED`.

- [ ] **Step 7: Review and pause at the commit gate**

Run: `git diff --check && git diff -- src/execution/types.ts src/execution/handoff.ts src/execution/cli.ts test/execution-handoff.test.ts test/execution-cli.test.ts`

Commit only after explicit approval: `git add src/execution/types.ts src/execution/handoff.ts src/execution/cli.ts test/execution-handoff.test.ts test/execution-cli.test.ts && git commit -m "fix: route stopped and unknown worker results"`

---

### Task 7: Add canonical CLI rejection output and terminal mutation guard

**Files:**

- Create: `src/execution/command-outcome.ts`
- Create: `test/execution-command-outcome.test.ts`
- Modify: `src/execution/cli.ts`
- Modify: `test/execution-cli.test.ts`

**Interfaces:**

- Produces: `operationalReasonForContractError(code)`, `rejectedExecutionCommand(code)`, and `acceptedExecutionCommand(state, details)`.
- CLI mutating commands consume `assertExecutionRunMutable` immediately after load and before building an event or writing a file.
- Rejection response is output-only; this task does not persist rejected payloads.

- [ ] **Step 1: Add the failing canonical-outcome test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { rejectedExecutionCommand } from "../src/execution/command-outcome.js";

test("command rejection never claims a persisted run state", () => {
  assert.deepEqual(rejectedExecutionCommand("COMMAND_ARGUMENTS_INVALID"), {
    operation: "REJECTED",
    mutation: "NONE",
    error: { code: "COMMAND_ARGUMENTS_INVALID" },
  });
});
```

- [ ] **Step 2: Add failing CLI zero-mutation assertions**

Update the malformed-result test to expect:

```json
{
  "operation": "REJECTED",
  "mutation": "NONE",
  "error": { "code": "RESULT_FIELDS_INVALID" }
}
```

Capture `events.jsonl`, `graph.json`, `checkpoint.json`, and the artifact
manifest before the malformed command; read them again afterwards and assert
byte-for-byte equality.

Add one terminal-run test that finalizes a synthetic completed run, invokes a
mutating CLI command, expects `TERMINAL_RUN`, and proves all run files are
unchanged.

- [ ] **Step 3: Run focused tests to prove RED**

Run: `npm run build && node --test dist/test/execution-command-outcome.test.js dist/test/execution-cli.test.js`

Expected: FAIL because current errors print `{ state: "STOPPED" }`.

- [ ] **Step 4: Implement the canonical command response constructors**

```ts
import type { ExecutionReasonCode } from "./reasons.js";
import type { ExecutionRunState } from "./types.js";

export interface RejectedExecutionCommand {
  operation: "REJECTED";
  mutation: "NONE";
  error: { code: ExecutionReasonCode };
}

export function rejectedExecutionCommand(code: ExecutionReasonCode): RejectedExecutionCommand {
  return { operation: "REJECTED", mutation: "NONE", error: { code } };
}

export function operationalReasonForContractError(code: string): ExecutionReasonCode {
  const exact: Readonly<Record<string, ExecutionReasonCode>> = {
    EXECUTION_COMMAND_CONFIGURATION_INVALID: "COMMAND_ARGUMENTS_INVALID",
    EXECUTION_INPUT_JSON_INVALID: "INPUT_JSON_INVALID",
    EXECUTION_RUN_TARGET_CONFLICT: "TARGET_ALREADY_EXISTS",
    EXECUTION_RESULT_FIELDS_INVALID: "RESULT_FIELDS_INVALID",
    EXECUTION_RESULT_TOO_LARGE: "RESULT_TOO_LARGE",
    EXECUTION_RESULT_FOREIGN: "RESULT_FOREIGN",
    EXECUTION_RESULT_STALE: "RESULT_STALE",
    EXECUTION_RESULT_EVIDENCE_INVALID: "EVIDENCE_MISSING",
    EXECUTION_RESULT_SCOPE_VIOLATION: "EVIDENCE_SCOPE_VIOLATION",
    EXECUTION_RESULT_CONTENT_FORBIDDEN: "CONTENT_FORBIDDEN",
    EXECUTION_RUNS_NOT_COMPARABLE: "RUNS_NOT_COMPARABLE",
  };
  const mapped = exact[code];
  if (mapped !== undefined) return mapped;
  if (code.startsWith("EXECUTION_ENVELOPE_") || code === "EXECUTION_PREPARE_INPUT_INVALID") return "ENVELOPE_INVALID";
  if (code.startsWith("EXECUTION_GRAPH_") || code === "EXECUTION_NODE_TRANSITION_INVALID") return "GRAPH_INVALID";
  if (code.startsWith("EXECUTION_STORAGE_") || code === "EXECUTION_PERSONAL_ROOT_INVALID") return "STORAGE_UNAVAILABLE";
  if (code === "EXECUTION_LEDGER_INVALID" || code === "EXECUTION_CHECKPOINT_INVALID") return "LEDGER_CORRUPT";
  if (code === "EXECUTION_ACCEPTANCE_INCOMPLETE" || code === "EXECUTION_FINAL_HANDOFF_INVALID") return "FINALIZATION_PRECONDITION_FAILED";
  return "UNCLASSIFIED_PREPARATION_OUTCOME";
}

export function acceptedExecutionCommand(
  state: ExecutionRunState,
  details: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return { operation: "ACCEPTED", state, ...details };
}
```

All parameters remain explicit; do not add defaults or a success/failure flag.

- [ ] **Step 5: Integrate rejection and terminal guards**

`configurationFailure` returns `COMMAND_ARGUMENTS_INVALID`. Contract errors are
mapped through `operationalReasonForContractError`; a later phase-aware command
passes its phase-specific `UNCLASSIFIED_*` fallback explicitly rather than
guessing from an arbitrary error string.

Call `assertExecutionRunMutable` in:

- `runRecordExecutionDispatch`;
- `runAcceptExecutionResult`;
- `runRejectExecutionResult`;
- `runProposeExecutionRepair`;
- `runStopExecution`; and
- `runFinalizeExecution`.

Do not add the guard to read-only prepare-node, resume-check, or compare paths.

- [ ] **Step 6: Run focused tests to prove GREEN**

Run: `npm run build && node --test dist/test/execution-command-outcome.test.js dist/test/execution-cli.test.js`

Expected: PASS with byte-identical storage after rejected commands.

- [ ] **Step 7: Review and pause at the commit gate**

Run: `git diff --check && git diff -- src/execution/command-outcome.ts src/execution/cli.ts test/execution-command-outcome.test.ts test/execution-cli.test.ts`

Commit only after explicit approval: `git add src/execution/command-outcome.ts src/execution/cli.ts test/execution-command-outcome.test.ts test/execution-cli.test.ts && git commit -m "fix: separate command rejection from run state"`

---

### Task 8: Verify the Contract Semantics Core as one bounded delivery slice

**Files:**

- Modify only if validation proves necessary: files already owned by Tasks 1-7
- Do not modify: `src/execution/storage.ts`, reference-run artifacts, host runbooks, `package.json`, or lockfiles

- [ ] **Step 1: Run all focused execution semantics tests**

Run:

```powershell
npm run build
node --test dist/test/execution-version.test.js dist/test/execution-reasons.test.js dist/test/execution-semantics.test.js dist/test/execution-ledger-semantics.test.js dist/test/execution-command-outcome.test.js dist/test/execution-contract.test.js dist/test/execution-graph.test.js dist/test/execution-cli.test.js dist/test/execution-storage.test.js dist/test/execution-handoff.test.js dist/test/execution-resume-finalize.test.js dist/test/execution-compare.test.js
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run repository gates**

Run:

```powershell
npm run lint
npm test
npm run check:docs
git diff --check
```

Expected: all commands exit zero. Report any intentional platform skip exactly;
do not convert it into a pass claim.

- [ ] **Step 3: Run semantic source scans**

Run:

```powershell
rg -n "const transitions|reasonCodePattern" src/execution
rg -n 'Version: "1\.0"|contractVersion: "1\.0"' src/execution test --glob '!test/fixtures/execution/legacy-v1-envelope.json'
rg -n 'state: "STOPPED".*error|operation: "REJECTED"' src/execution test
```

Expected:

- no private transition table or open reason regex;
- no active v1 artifact literal outside the single legacy fixture path;
- rejected-operation output exists and configuration errors do not fabricate
  `STOPPED` state.

- [ ] **Step 4: Review scope and security**

Inspect the complete diff for:

- accidental changes to the two preparatory research files;
- raw prompts, transcripts, tokens, credentials, Personal paths, or arbitrary URLs;
- storage-backend or host-behavior implementation;
- generated noise or line-ending churn;
- weakened tests; and
- changes outside the declared file map.

- [ ] **Step 5: Run the work-state preflight and hand off for review**

Run:

```powershell
& C:\Users\littl\.agents\tools\work-state-preflight.ps1 -RepositoryPath (Get-Location).Path -OutputFormat Markdown
```

Expected: intended repository and branch, known HEAD, dirty review state limited
to the accepted preparation documents and this implementation slice, no
unexpected PR or upstream change.

- [ ] **Step 6: Pause at the final commit gate**

Do not stage or commit automatically. Present the focused test evidence,
repository gates, semantic scans, work-state record, and exact diff for user
review. If explicit commit approval is later given, create one bounded commit
for the accepted Contract Semantics Core and immediately refresh WORK_STATE.

## Completion boundary

Completion of this plan establishes only the shared v2 semantic foundation. It
does not establish transactional persistence, source/worktree binding, Codex
host identity, two-phase dispatch, verified cancellation, evidence resolution,
resume recovery, or readiness for a real Multi-Agent Pipeline run.

After this plan is reviewed, the next planning decision is the persistence
invariant and stable Node binding. Once that decision is fixed, the independent
Input/CLI, Source/Worktree, Host Evidence, Persistence, and Generated Contract
Test plans can be written against these frozen interfaces.

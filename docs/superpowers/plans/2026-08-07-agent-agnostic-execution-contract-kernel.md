# Agent-Agnostic Execution Contract Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic execution-contract, graph, handoff, ledger, checkpoint, resume, finalization, comparison, and CLI layer required by the Codex-native reference runtime without starting any model or agent.

**Architecture:** Add one cohesive `src/execution/` module beside the existing Controller and Context modules. The Controller still ends at accepted activation intent; the new Kernel validates immutable envelopes and bounded graph changes, persists a Personal append-only run ledger, and exposes single-purpose CLI commands that the main Codex task can invoke around native subagent operations.

**Tech Stack:** Node.js 26.x, TypeScript 5.9, ESM/NodeNext, `node:test`, `node:assert/strict`, native `node:crypto`, native `node:fs/promises`, and the existing repository CLI conventions. No new dependency.

## Global Constraints

- The approved design is `docs/superpowers/specs/2026-08-07-codex-native-multi-agent-runtime-design.md`.
- The project declares Node `>=26 <27`; verification under another Node major is recorded as separate local evidence.
- Do not add OpenAI API, Agents SDK, external model, API-key, MCP, connector, or subprocess-based model integration.
- Repository TypeScript must never spawn or select an agent. Only the main Codex task performs native delegation.
- Preserve the existing Controller, activation, context, retention, and fan-in behavior; reuse their boundaries without creating a second Controller.
- The first persisted runtime is `PERSONAL`. `TEAM` promotion and write-capable agents remain outside this plan.
- The run store rejects transcript-, prompt-, secret-, credential-token-, cookie-, password-, API-key-, authorization-, and hidden-reasoning-shaped fields and content. The exact telemetry field `tokenUsage` is allowed and contains only a non-negative count or `null`, never token text.
- All functions take explicit parameters; do not add default parameter values or flag parameters that switch behavior.
- Every error must use a stable execution error code and a sanitized message that does not echo private goals, raw worker output, or absolute Personal paths.
- No automatic retry, authority expansion, fallback path, or silent state repair.
- Leave `AGENTS.md`, `.codex/`, global Codex configuration, agent profiles, skills, plugins, and external systems unchanged.
- Commit steps in this plan are review boundaries. Run them only after the user separately authorizes commits; otherwise stop after the preceding verification step with changes uncommitted.
- Before execution, use `superpowers:using-git-worktrees` from a fresh, verified `main` and create a unique `dev-execution-kernel` worktree. Do not move or overwrite the current dirty files.

## Delivery Split

This is slice 1 of 2. It ends with a locally tested deterministic Kernel and built CLI. The dependent plan `docs/superpowers/plans/2026-08-07-codex-native-multi-agent-reference-run.md` performs the live Codex-native multi-agent run and strong single-agent comparison.

## File Map

| File | Responsibility |
| --- | --- |
| `src/execution/types.ts` | Canonical envelope, graph, node, handoff, evidence, event, checkpoint, runtime, and comparison types. |
| `src/execution/identity.ts` | Canonical JSON and SHA-256 identities for execution artifacts. |
| `src/execution/validation.ts` | Strict unknown-input parsing and forbidden-content checks. |
| `src/execution/graph.ts` | DAG validation, bounded mutation, readiness, and node transitions. |
| `src/execution/handoff.ts` | Task-packet construction and exact Result Envelope admission. |
| `src/execution/ledger.ts` | Hash-chained event creation, replay, and run reconstruction. |
| `src/execution/storage.ts` | Explicit Personal run-directory and content-hashed artifact persistence. |
| `src/execution/resume.ts` | Fail-closed resume evaluation against source and host evidence. |
| `src/execution/finalize.ts` | Acceptance-criteria evaluation, final-handoff admission, and deterministic Markdown rendering. |
| `src/execution/compare.ts` | Single-agent versus multi-agent evidence and overhead comparison. |
| `src/execution/cli.ts` | Single-purpose packet, dispatch, result, stop, resume, finalization, and comparison command handlers. |
| `src/cli.ts` | Top-level help text and dispatch only. |
| `test/helpers/execution-fixtures.ts` | Shared, synthetic, secret-free envelope and graph fixtures; never a current-state source. |
| `test/execution-*.test.ts` | Focused positive, negative, persistence, resume, CLI, and comparison tests. |
| `docs/project/current-state.md` | Routing update after deterministic verification; Codex-native runtime remains `NOT_EXECUTED`. |

---

### Task 1: Immutable Execution Envelope, identities, and strict input parsing

**Files:**
- Create: `src/execution/types.ts`
- Create: `src/execution/identity.ts`
- Create: `src/execution/validation.ts`
- Create: `test/helpers/execution-fixtures.ts`
- Create: `test/execution-contract.test.ts`

**Interfaces:**
- Consumes: existing `RetentionScope` semantics from `src/controller/types.ts`, but declares execution-owned types instead of importing Controller recipes.
- Produces: `createExecutionEnvelope(input: ExecutionEnvelopeInput): ExecutionEnvelope`, `parseExecutionEnvelope(value: unknown): ExecutionEnvelope`, `executionDigest(value: unknown): string`, and `ExecutionContractError`.

- [ ] **Step 1: Write the failing contract tests**

Create `test/execution-contract.test.ts` with a fully populated read-only input and explicit negative cases:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { createExecutionEnvelope, parseExecutionEnvelope } from "../src/execution/validation.js";
import { referenceEnvelopeInput } from "./helpers/execution-fixtures.js";
```

Create `test/helpers/execution-fixtures.ts` and place this synthetic fixture in it:

```ts
import type { ExecutionEnvelopeInput } from "../../src/execution/types.js";

const referenceRevision = "a".repeat(40);

export const referenceEnvelopeInput: ExecutionEnvelopeInput = {
  contractVersion: "1.0",
  runId: "run-codex-audit-multi",
  goal: "Audit current execution-readiness contracts from repository evidence.",
  scope: ["src/controller", "src/context", "contract/agent-library"],
  nonGoals: ["repository writes", "external sources", "model API access"],
  acceptanceCriteria: [
    { criterionId: "criterion-controller", statement: "Controller assets are traced to exact repository evidence." },
    { criterionId: "criterion-context", statement: "Context and resume assets are traced to exact repository evidence." },
    { criterionId: "criterion-gaps", statement: "Missing capabilities and unknowns remain visible." },
  ],
  sourceRevision: referenceRevision,
  retention: "PERSONAL",
  allowedNodeTypes: ["AGENT_TASK", "DETERMINISTIC_CHECK", "SYNTHESIS"],
  authority: { repositoryWrite: "NONE", externalWrite: "NONE", agentExecution: "CODEX_NATIVE_ONLY" },
  toolScope: ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
  sources: [{ sourceId: "repo", kind: "REPOSITORY", locator: "AI Booster Kit", sourceRevision: referenceRevision }],
  graphLimits: { maxNodes: 5, maxParallel: 2, maxDepth: 4, maxRepairNodes: 1, maxCheckerRepairCycles: 1 },
  budget: { maxDispatches: 4, maxResultBytes: 131072, maxWallClockMs: 1800000 },
  stopConditions: ["source revision mismatch", "scope violation", "malformed result"],
  requiredEvidenceKinds: ["REPOSITORY_FILE", "ARTIFACT"],
  allowedFinalStates: ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"],
};
```

Continue `test/execution-contract.test.ts` with the behavioral tests:

```ts

test("execution envelope: creates and parses one stable read-only contract", () => {
  const created = createExecutionEnvelope(referenceEnvelopeInput);
  assert.match(created.envelopeHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(parseExecutionEnvelope(JSON.parse(JSON.stringify(created))), created);
  assert.equal(createExecutionEnvelope({ ...referenceEnvelopeInput }).envelopeHash, created.envelopeHash);
});

test("execution envelope: rejects extra, unsafe, widened, and malformed input", () => {
  const created = createExecutionEnvelope(referenceEnvelopeInput);
  assert.throws(() => parseExecutionEnvelope({ ...created, transcript: "forbidden" }), /EXECUTION_ENVELOPE_FIELDS_INVALID/);
  assert.throws(() => createExecutionEnvelope({ ...referenceEnvelopeInput, goal: "token: do-not-store" }), /EXECUTION_CONTENT_FORBIDDEN/);
  assert.throws(() => createExecutionEnvelope({ ...referenceEnvelopeInput, authority: { ...referenceEnvelopeInput.authority, repositoryWrite: "WRITE" as never } }), /EXECUTION_AUTHORITY_INVALID/);
  assert.throws(() => parseExecutionEnvelope({ ...created, envelopeHash: "0".repeat(64) }), /EXECUTION_ENVELOPE_HASH_MISMATCH/);
});
```

- [ ] **Step 2: Run the focused test and verify the missing module failure**

Run:

```powershell
npm run build
node --test dist/test/execution-contract.test.js
```

Expected: build fails because `src/execution/validation.ts` and `src/execution/types.ts` do not exist.

- [ ] **Step 3: Define the canonical execution types**

Create `src/execution/types.ts` with these exact public unions and records:

```ts
export type ExecutionRetention = "EPHEMERAL" | "PERSONAL" | "TEAM";
export type ExecutionNodeType = "AGENT_TASK" | "DETERMINISTIC_CHECK" | "HUMAN_CHECKPOINT" | "SYNTHESIS";
export type ExecutionNodeState = "PENDING" | "READY" | "RUNNING" | "RESULT_RECEIVED" | "SUCCEEDED" | "REJECTED" | "STOPPED" | "UNKNOWN";
export type ExecutionRunState = "PREPARED" | "READY" | "RUNNING" | "WAITING_FOR_HUMAN" | "COMPLETE" | "COMPLETE_WITH_LIMIT" | "STOPPED" | "UNKNOWN";
export type ExecutionFinalState = Extract<ExecutionRunState, "COMPLETE" | "COMPLETE_WITH_LIMIT" | "STOPPED" | "UNKNOWN">;
export type ExecutionToolCapability = "FILESYSTEM_READ" | "LOCAL_SHELL_READ";
export type EvidenceKind = "REPOSITORY_FILE" | "COMMAND_OUTPUT" | "ARTIFACT";

export interface AcceptanceCriterion { criterionId: string; statement: string; }
export interface ExecutionAuthority { repositoryWrite: "NONE"; externalWrite: "NONE"; agentExecution: "CODEX_NATIVE_ONLY"; }
export interface ExecutionSource { sourceId: string; kind: "REPOSITORY"; locator: string; sourceRevision: string; }
export interface ExecutionGraphLimits { maxNodes: number; maxParallel: number; maxDepth: number; maxRepairNodes: number; maxCheckerRepairCycles: number; }
export interface ExecutionBudget { maxDispatches: number; maxResultBytes: number; maxWallClockMs: number; }

export interface ExecutionEnvelopeInput {
  contractVersion: "1.0";
  runId: string;
  goal: string;
  scope: readonly string[];
  nonGoals: readonly string[];
  acceptanceCriteria: readonly AcceptanceCriterion[];
  sourceRevision: string;
  retention: ExecutionRetention;
  allowedNodeTypes: readonly ExecutionNodeType[];
  authority: ExecutionAuthority;
  toolScope: readonly ExecutionToolCapability[];
  sources: readonly ExecutionSource[];
  graphLimits: ExecutionGraphLimits;
  budget: ExecutionBudget;
  stopConditions: readonly string[];
  requiredEvidenceKinds: readonly EvidenceKind[];
  allowedFinalStates: readonly ExecutionFinalState[];
}

export interface ExecutionEnvelope extends ExecutionEnvelopeInput { envelopeHash: string; }

export class ExecutionContractError extends Error {
  constructor(readonly code: string, message: string) { super(`${code}: ${message}`); }
}
```

Continue this file in later tasks; do not place validation functions in it.

- [ ] **Step 4: Add canonical identity without changing Controller hashing**

Create `src/execution/identity.ts`:

```ts
import { createHash } from "node:crypto";

export function canonicalExecutionJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalExecutionJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalExecutionJson(record[key])}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("execution identity does not support undefined");
  return serialized;
}

export function executionDigest(value: unknown): string {
  return createHash("sha256").update(canonicalExecutionJson(value)).digest("hex");
}
```

Do not refactor the existing private Controller digest in this slice.

- [ ] **Step 5: Implement strict envelope creation and parsing**

Create `src/execution/validation.ts` with exact-key validation, plain-object checks, unique non-empty arrays, positive-integer bounds, SHA-256 validation, source-revision equality, read-only authority, and recursive forbidden-content inspection. Deny exact credential-shaped keys such as `apiKey`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `password`, `prompt`, `transcript`, and `reasoning`; deny credential-marker content such as `token:`; explicitly allow the schema-owned numeric/null `tokenUsage` metric. Export:

```ts
export function createExecutionEnvelope(input: ExecutionEnvelopeInput): ExecutionEnvelope;
export function parseExecutionEnvelope(value: unknown): ExecutionEnvelope;
export function assertSafeExecutionContent(value: unknown): void;
```

Use these stable codes:

```ts
const codes = {
  fields: "EXECUTION_ENVELOPE_FIELDS_INVALID",
  content: "EXECUTION_CONTENT_FORBIDDEN",
  authority: "EXECUTION_AUTHORITY_INVALID",
  source: "EXECUTION_SOURCE_INVALID",
  limits: "EXECUTION_LIMITS_INVALID",
  hash: "EXECUTION_ENVELOPE_HASH_MISMATCH",
} as const;
```

`createExecutionEnvelope` validates the hashless input, computes `executionDigest(input)`, and returns a new object. `parseExecutionEnvelope` validates exact envelope keys, recomputes the hash from a copy without `envelopeHash`, and rejects mismatch. Do not echo rejected values in errors.

- [ ] **Step 6: Run the focused tests**

Run:

```powershell
npm run build
node --test dist/test/execution-contract.test.js
```

Expected: PASS.

- [ ] **Step 7: Review and optionally commit the contract slice**

Run:

```powershell
git diff -- src/execution/types.ts src/execution/identity.ts src/execution/validation.ts test/helpers/execution-fixtures.ts test/execution-contract.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add src/execution/types.ts src/execution/identity.ts src/execution/validation.ts test/helpers/execution-fixtures.ts test/execution-contract.test.ts
git commit -m "feat: add execution envelope contract"
```

---

### Task 2: Execution graph, bounded mutation, and state transitions

**Files:**
- Modify: `src/execution/types.ts`
- Create: `src/execution/graph.ts`
- Modify: `test/helpers/execution-fixtures.ts`
- Create: `test/execution-graph.test.ts`

**Interfaces:**
- Consumes: `ExecutionEnvelope`, `ExecutionNodeType`, `ExecutionNodeState`, and `executionDigest` from Task 1.
- Produces: `createExecutionGraph`, `validateExecutionGraph`, `readyExecutionNodes`, `transitionExecutionNode`, and `applyExecutionGraphMutation`.

- [ ] **Step 1: Write failing graph and mutation tests**

Create `test/execution-graph.test.ts` with an initial two-worker graph plus checker and synthesis nodes. The test must assert initial readiness, exact transition legality, graph hash stability, cycle rejection, foreign dependency rejection, and one-repair-only behavior:

```ts
test("execution graph: validates fan-out, fan-in, checker, and synthesis dependencies", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  assert.equal(graph.graphRevision, 1);
  assert.deepEqual(readyExecutionNodes(graph).map((node) => node.nodeId), ["audit-controller", "audit-context"]);
  assert.match(graph.graphHash, /^[a-f0-9]{64}$/);
});

test("execution graph: rejects cycles, illegal transitions, completed-node mutation, and a second repair", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  assert.throws(() => transitionExecutionNode(graph, { nodeId: "audit-controller", from: "PENDING", to: "RUNNING" }, envelope), /EXECUTION_NODE_TRANSITION_INVALID/);
  assert.throws(() => createExecutionGraph({ ...referenceGraphDraft, edges: [...referenceGraphDraft.edges, { fromNodeId: "synthesis", toNodeId: "audit-controller" }] }, envelope), /EXECUTION_GRAPH_CYCLE/);
});

test("execution graph: one admitted repair holds a ready synthesis until repair succeeds", () => {
  const graphWithReadySynthesis = completeThroughChecker(createExecutionGraph(referenceGraphDraft, createExecutionEnvelope(referenceEnvelopeInput)));
  const mutated = applyExecutionGraphMutation(
    graphWithReadySynthesis,
    referenceRepairProposal,
    createExecutionEnvelope(referenceEnvelopeInput),
    referenceRepairProposal.evidenceRefs,
  );
  assert.equal(mutated.nodes.find((node) => node.nodeId === "synthesis")?.state, "PENDING");
  assert.equal(mutated.nodes.find((node) => node.nodeId === "repair-1")?.state, "READY");
});
```

Implement `completeThroughChecker` as a local test helper using only public node transitions, and define `referenceRepairProposal` in the test with one `PENDING` `AGENT_TASK`, `repairOf: "checker"`, plus edges `checker -> repair-1` and `repair-1 -> synthesis`.

- [ ] **Step 2: Run the focused test and verify missing graph exports**

Run:

```powershell
npm run build
node --test dist/test/execution-graph.test.js
```

Expected: build fails because `src/execution/graph.ts` does not exist.

- [ ] **Step 3: Add exact graph and node types**

Append to `src/execution/types.ts`:

```ts
export interface ExecutionEdge { fromNodeId: string; toNodeId: string; }

export interface ExecutionNode {
  nodeId: string;
  type: ExecutionNodeType;
  required: boolean;
  state: ExecutionNodeState;
  objective: string;
  role: string | null;
  repairOf: string | null;
  scope: readonly string[];
  prohibitedActions: readonly string[];
  contextRefs: readonly string[];
  sourceIds: readonly string[];
  toolScope: readonly ExecutionToolCapability[];
  acceptanceCriterionIds: readonly string[];
}

export interface ExecutionGraphDraft {
  graphId: string;
  runId: string;
  nodes: readonly ExecutionNode[];
  edges: readonly ExecutionEdge[];
}

export interface ExecutionGraph extends ExecutionGraphDraft {
  envelopeHash: string;
  graphRevision: number;
  graphHash: string;
}

export interface GraphMutationProposal {
  proposalId: string;
  expectedGraphRevision: number;
  reason: string;
  evidenceRefs: readonly string[];
  nodes: readonly ExecutionNode[];
  edges: readonly ExecutionEdge[];
}

export interface NodeTransition { nodeId: string; from: ExecutionNodeState; to: ExecutionNodeState; }
```

All new mutation nodes must enter as `PENDING`, have a non-null `repairOf`, and reference an existing terminal node.

Append the complete initial test graph to `test/helpers/execution-fixtures.ts`. Add `ExecutionGraphDraft` to its type imports:

```ts
export const referenceGraphDraft: ExecutionGraphDraft = {
  graphId: "graph-codex-audit-multi",
  runId: referenceEnvelopeInput.runId,
  nodes: [
    {
      nodeId: "audit-controller",
      type: "AGENT_TASK",
      required: true,
      state: "PENDING",
      objective: "Inspect Controller, formation, activation, and bounded execution contracts.",
      role: "controller-auditor",
      repairOf: null,
      scope: ["src/controller", "contract/agent-library"],
      prohibitedActions: ["repository writes", "external sources", "agent spawning"],
      contextRefs: [],
      sourceIds: ["repo"],
      toolScope: ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
      acceptanceCriterionIds: ["criterion-controller", "criterion-gaps"],
    },
    {
      nodeId: "audit-context",
      type: "AGENT_TASK",
      required: true,
      state: "PENDING",
      objective: "Inspect context, persistence, fan-in, checkpoint, and resume contracts.",
      role: "context-auditor",
      repairOf: null,
      scope: ["src/context"],
      prohibitedActions: ["repository writes", "external sources", "agent spawning"],
      contextRefs: [],
      sourceIds: ["repo"],
      toolScope: ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
      acceptanceCriterionIds: ["criterion-context", "criterion-gaps"],
    },
    {
      nodeId: "checker",
      type: "AGENT_TASK",
      required: true,
      state: "PENDING",
      objective: "Check accepted audit results for completeness, provenance, contradictions, and visible unknowns.",
      role: "evidence-checker",
      repairOf: null,
      scope: ["src/controller", "src/context", "contract/agent-library"],
      prohibitedActions: ["repository writes", "external sources", "agent spawning", "unvalidated worker output"],
      contextRefs: [],
      sourceIds: ["repo"],
      toolScope: ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
      acceptanceCriterionIds: ["criterion-controller", "criterion-context", "criterion-gaps"],
    },
    {
      nodeId: "synthesis",
      type: "SYNTHESIS",
      required: true,
      state: "PENDING",
      objective: "Create the final readiness and gap handoff from accepted worker and checker artifacts.",
      role: "orchestrator-synthesis",
      repairOf: null,
      scope: ["src/controller", "src/context", "contract/agent-library"],
      prohibitedActions: ["repository writes", "external sources", "agent spawning", "unvalidated worker output"],
      contextRefs: [],
      sourceIds: ["repo"],
      toolScope: ["FILESYSTEM_READ"],
      acceptanceCriterionIds: ["criterion-controller", "criterion-context", "criterion-gaps"],
    },
  ],
  edges: [
    { fromNodeId: "audit-controller", toNodeId: "checker" },
    { fromNodeId: "audit-context", toNodeId: "checker" },
    { fromNodeId: "checker", toNodeId: "synthesis" },
  ],
};
```

The optional fifth node is admitted only through `GraphMutationProposal` as a repair of one terminal worker or checker node. It is not present in revision 1.

`maxDispatches` counts only `AGENT_TASK` dispatches to Codex subagents; main-task `SYNTHESIS` execution does not consume it. `maxCheckerRepairCycles` counts a checker-initiated repair proposal admitted by the Kernel. The checker is not re-run: the accepted repair artifact becomes an additional predecessor of the still-pending synthesis node, which receives the accepted checker verdict and the accepted repair result.

- [ ] **Step 4: Implement DAG validation and readiness**

Create `src/execution/graph.ts` with these signatures:

```ts
export function createExecutionGraph(draft: ExecutionGraphDraft, envelope: ExecutionEnvelope): ExecutionGraph;
export function validateExecutionGraph(value: unknown, envelope: ExecutionEnvelope): ExecutionGraph;
export function readyExecutionNodes(graph: ExecutionGraph): readonly ExecutionNode[];
export function transitionExecutionNode(graph: ExecutionGraph, transition: NodeTransition, envelope: ExecutionEnvelope): ExecutionGraph;
export function applyExecutionGraphMutation(
  graph: ExecutionGraph,
  proposal: GraphMutationProposal,
  envelope: ExecutionEnvelope,
  acceptedEvidenceRefs: readonly string[],
): ExecutionGraph;
```

Use Kahn topological traversal for cycle and depth validation. Count simultaneously ready `AGENT_TASK` nodes for `maxParallel`. Define the only valid node transitions in one constant:

```ts
const transitions: Readonly<Record<ExecutionNodeState, readonly ExecutionNodeState[]>> = {
  PENDING: ["READY"],
  READY: ["RUNNING"],
  RUNNING: ["RESULT_RECEIVED", "STOPPED", "UNKNOWN"],
  RESULT_RECEIVED: ["SUCCEEDED", "REJECTED"],
  SUCCEEDED: [],
  REJECTED: [],
  STOPPED: [],
  UNKNOWN: [],
};
```

After a node becomes `SUCCEEDED`, recompute dependency readiness and promote eligible `PENDING` nodes to `READY` in the returned graph. Every returned graph gets a recomputed `graphHash`; only accepted mutation increments `graphRevision`.

An accepted repair mutation may add a predecessor only to a downstream node that is still `PENDING` or `READY`. If a new pending repair predecessor makes a `READY` downstream node unsatisfied, `applyExecutionGraphMutation` atomically recalculates that node to `PENDING` within the new graph revision. This dependency-derived demotion is not a general node transition: it is allowed only inside the one accepted repair mutation, may never target `RUNNING` or terminal nodes, and must be covered by the graph-mutation ledger event. After the repair succeeds, ordinary readiness recomputation promotes synthesis again.

Mutation validation is additive and fail-closed: require the exact expected revision and accepted evidence references; preserve every existing node and edge byte-for-byte; admit only new unique IDs; require each new node type, scope, tool scope, source ID, acceptance criterion, and prohibited-action boundary to be a subset of the immutable envelope and originating node; reject budget, authority, retention, source, or final-state changes; and re-run node-count, repair-count, checker-cycle, parallelism, depth, and cycle limits. A proposal cannot alter a terminal node, remove a dependency, replace an artifact, or introduce a human checkpoint that was not already allowed.

Use stable error codes `EXECUTION_GRAPH_INVALID`, `EXECUTION_GRAPH_CYCLE`, `EXECUTION_GRAPH_LIMIT_EXCEEDED`, `EXECUTION_GRAPH_MUTATION_INVALID`, and `EXECUTION_NODE_TRANSITION_INVALID`.

- [ ] **Step 5: Run focused graph tests**

Run:

```powershell
npm run build
node --test dist/test/execution-graph.test.js
```

Expected: PASS.

- [ ] **Step 6: Review and optionally commit the graph slice**

Run:

```powershell
git diff -- src/execution/types.ts src/execution/graph.ts test/helpers/execution-fixtures.ts test/execution-graph.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add src/execution/types.ts src/execution/graph.ts test/helpers/execution-fixtures.ts test/execution-graph.test.ts
git commit -m "feat: add bounded execution graph"
```

---

### Task 3: Typed Task Packets, Result Envelopes, evidence, and admission

**Files:**
- Modify: `src/execution/types.ts`
- Create: `src/execution/handoff.ts`
- Create: `test/execution-handoff.test.ts`

**Interfaces:**
- Consumes: validated envelopes and graphs from Tasks 1-2.
- Produces: `buildExecutionTaskPacket`, `parseExecutionResult`, `validateResultForNode`, `ExecutionEvidenceRef`, `ExecutionClaim`, and `ExecutionArtifactRef`.

- [ ] **Step 1: Write failing handoff and evidence tests**

Create `test/execution-handoff.test.ts`. Cover one exact Task Packet, one supported Result Envelope, and malformed, foreign, stale, oversized, unsupported-claim, arbitrary-evidence, forbidden-content, and widened-follow-up cases:

```ts
test("execution handoff: builds the worker packet from the accepted envelope and graph", () => {
  const packet = buildExecutionTaskPacket(envelope, graph, "audit-controller", []);
  assert.equal(packet.runId, envelope.runId);
  assert.equal(packet.envelopeHash, envelope.envelopeHash);
  assert.equal(packet.graphRevision, graph.graphRevision);
  assert.equal(packet.expectedOutput, "RESULT_ENVELOPE_V1");
  assert.deepEqual(packet.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"]);
});

test("execution handoff: accepts only supported claims with resolved evidence", () => {
  const result = parseExecutionResult(validWorkerResult, envelope.budget.maxResultBytes);
  assert.deepEqual(validateResultForNode(result, envelope, graph, "audit-controller"), result);
  assert.throws(() => parseExecutionResult({ ...validWorkerResult, transcript: "forbidden" }, envelope.budget.maxResultBytes), /EXECUTION_RESULT_FIELDS_INVALID/);
  assert.throws(() => validateResultForNode({ ...result, graphRevision: 0 }, envelope, graph, "audit-controller"), /EXECUTION_RESULT_STALE/);
});
```

Use a real repository-file evidence object in `validWorkerResult`:

```ts
{
  evidenceId: "evidence-controller-types",
  kind: "REPOSITORY_FILE",
  sourceId: "repo",
  sourceRevision: envelope.sourceRevision,
  locator: { path: "src/controller/types.ts", lineStart: 20, lineEnd: 30 },
  sha256: null,
}
```

Define the complete result fixture in the same test file with `resultVersion: "1.0"`, the current run/task/node/envelope/graph identities, `status: "READY_FOR_VALIDATION"`, one `SUPPORTED` `criterion-controller` claim citing `evidence-controller-types`, empty artifact/unknown/conflict/limit arrays, and `followupRequest: null`. Compute the task ID with `buildExecutionTaskPacket`; never duplicate the digest formula in the fixture.

- [ ] **Step 2: Run the focused test and verify missing handoff exports**

Run:

```powershell
npm run build
node --test dist/test/execution-handoff.test.js
```

Expected: build fails because `src/execution/handoff.ts` does not exist.

- [ ] **Step 3: Add the exact handoff, evidence, and result types**

Append to `src/execution/types.ts`:

```ts
export interface ExecutionArtifactRef { artifactId: string; nodeId: string | null; sha256: string; }

export interface RepositoryEvidenceLocator { path: string; lineStart: number; lineEnd: number; }
export interface CommandEvidenceLocator { commandId: string; outputArtifactId: string; }
export interface ArtifactEvidenceLocator { artifactId: string; }

export type ExecutionEvidenceRef =
  | { evidenceId: string; kind: "REPOSITORY_FILE"; sourceId: string; sourceRevision: string; locator: RepositoryEvidenceLocator; sha256: string | null }
  | { evidenceId: string; kind: "COMMAND_OUTPUT"; sourceId: string; sourceRevision: string; locator: CommandEvidenceLocator; sha256: string }
  | { evidenceId: string; kind: "ARTIFACT"; sourceId: string; sourceRevision: string; locator: ArtifactEvidenceLocator; sha256: string };

export interface ExecutionClaim {
  claimId: string;
  criterionId: string;
  statement: string;
  state: "SUPPORTED" | "CONFLICTED" | "UNKNOWN";
  evidenceRefs: readonly string[];
}

export interface ExecutionFollowupRequest {
  reason: string;
  objective: string;
  requiredEvidence: readonly string[];
  proposedScope: readonly string[];
}

export interface ExecutionTaskPacket {
  packetVersion: "1.0";
  runId: string;
  taskId: string;
  nodeId: string;
  envelopeHash: string;
  graphRevision: number;
  objective: string;
  scope: readonly string[];
  prohibitedActions: readonly string[];
  contextRefs: readonly ExecutionArtifactRef[];
  sourceIds: readonly string[];
  toolScope: readonly ExecutionToolCapability[];
  expectedOutput: "RESULT_ENVELOPE_V1";
  acceptanceCriterionIds: readonly string[];
  budget: ExecutionBudget;
  stopConditions: readonly string[];
}

export interface ExecutionContextArtifact {
  artifactRef: ExecutionArtifactRef;
  result: ExecutionResultEnvelope;
}

export interface PreparedExecutionNode {
  taskPacket: ExecutionTaskPacket;
  contextArtifacts: readonly ExecutionContextArtifact[];
}

export interface ExecutionResultEnvelope {
  resultVersion: "1.0";
  runId: string;
  taskId: string;
  nodeId: string;
  envelopeHash: string;
  graphRevision: number;
  status: "READY_FOR_VALIDATION" | "STOPPED" | "UNKNOWN";
  summary: string;
  claims: readonly ExecutionClaim[];
  artifactRefs: readonly ExecutionArtifactRef[];
  evidenceRefs: readonly ExecutionEvidenceRef[];
  unknowns: readonly string[];
  conflicts: readonly string[];
  followupRequest: ExecutionFollowupRequest | null;
  observedLimits: readonly string[];
}
```

- [ ] **Step 4: Implement exact worker packet construction**

Create `src/execution/handoff.ts` and export:

```ts
export function buildExecutionTaskPacket(
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  nodeId: string,
  contextRefs: readonly ExecutionArtifactRef[],
): ExecutionTaskPacket;

export function parseExecutionResult(value: unknown, maxResultBytes: number): ExecutionResultEnvelope;

export function validateResultForNode(
  result: ExecutionResultEnvelope,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  nodeId: string,
): ExecutionResultEnvelope;
```

`buildExecutionTaskPacket` accepts only a `READY` `AGENT_TASK` or `SYNTHESIS` node. `AGENT_TASK` packets are sent to native Codex subagents; `SYNTHESIS` packets are executed by the main Codex task and are never delegated. Derive `taskId` as `executionDigest({ runId, nodeId, graphRevision })`; do not use timestamps or random values. Every context artifact reference must come from an incoming predecessor node that is `SUCCEEDED`; therefore a synthesis packet can cite only Kernel-accepted worker and checker artifacts. The storage-backed node preparation in Task 6 resolves those references to exact accepted Result Envelopes and verifies their hashes before returning `PreparedExecutionNode`.

`parseExecutionResult` measures `Buffer.byteLength(canonicalExecutionJson(value), "utf8")`, applies exact-key validation, recursively rejects forbidden content, and validates SHA-256 fields. `validateResultForNode` checks run, packet, envelope, graph revision, node identity, source identity, scope subset, evidence-line bounds, unique IDs, criterion identity, and claim-evidence resolution. Every claim's `criterionId` must occur in the node packet's `acceptanceCriterionIds` and the immutable envelope.

Rules:

- `SUPPORTED` requires at least one resolved evidence ID.
- `CONFLICTED` requires at least one conflict and may cite opposing evidence.
- `UNKNOWN` must not cite evidence as proof.
- repository paths must be normalized, relative, and inside an allowed node scope;
- `followupRequest.proposedScope` must be a subset of node scope; and
- the exact worker payload is returned unchanged after validation.

Use stable codes `EXECUTION_TASK_INVALID`, `EXECUTION_RESULT_FIELDS_INVALID`, `EXECUTION_RESULT_TOO_LARGE`, `EXECUTION_RESULT_FOREIGN`, `EXECUTION_RESULT_STALE`, `EXECUTION_RESULT_EVIDENCE_INVALID`, `EXECUTION_RESULT_SCOPE_VIOLATION`, and `EXECUTION_RESULT_CONTENT_FORBIDDEN`.

- [ ] **Step 5: Run focused handoff tests**

Run:

```powershell
npm run build
node --test dist/test/execution-handoff.test.js
```

Expected: PASS.

- [ ] **Step 6: Review and optionally commit the handoff slice**

Run:

```powershell
git diff -- src/execution/types.ts src/execution/handoff.ts test/execution-handoff.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add src/execution/types.ts src/execution/handoff.ts test/execution-handoff.test.ts
git commit -m "feat: add typed execution handoffs"
```

---

### Task 4: Hash-chained ledger and explicit Personal run storage

**Files:**
- Modify: `src/execution/types.ts`
- Create: `src/execution/ledger.ts`
- Create: `src/execution/storage.ts`
- Create: `test/execution-storage.test.ts`

**Interfaces:**
- Consumes: validated envelopes, graphs, results, artifacts, and `executionDigest`.
- Produces: `createExecutionEvent`, `replayExecutionEvents`, `createPersonalExecutionRun`, `loadExecutionRun`, `appendRunEvent`, `saveGraphSnapshot`, `saveAcceptedResult`, and `saveExecutionCheckpoint`.

- [ ] **Step 1: Write failing storage and ledger tests against a real temporary directory**

Create `test/execution-storage.test.ts` using `mkdtemp`, `readFile`, `realpath`, `symlink`, and `rm`. Cover creation, immutable envelope, append-only event order, graph snapshot replacement, result and manifest hashes, exact reload, duplicate event, conflicting run directory, traversal, symlink parent, malformed JSONL, and transcript-shaped artifact rejection:

```ts
test("execution storage: creates one Personal run and replays its hash-chained ledger", async () => {
  await withTemporaryDirectory(async (root) => {
    const created = await createPersonalExecutionRun(root, envelope, graph, "2026-08-07T15:00:00.000Z");
    await appendRunEvent(created.runDirectory, createExecutionEvent({
      runId: envelope.runId,
      eventType: "NODE_DISPATCHED",
      nodeId: "audit-controller",
      beforeState: "READY",
      afterState: "RUNNING",
      graphRevision: 1,
      evidenceRefs: [],
      taskId: "task-controller",
      threadRef: "codex-agent:controller",
      reasonCode: null,
    }, 3, created.lastEventHash, "2026-08-07T15:00:01.000Z"));
    const loaded = await loadExecutionRun(created.runDirectory);
    assert.equal(loaded.events.length, 3);
    assert.equal(loaded.envelope.envelopeHash, envelope.envelopeHash);
  });
});
```

- [ ] **Step 2: Run the focused test and verify missing storage exports**

Run:

```powershell
npm run build
node --test dist/test/execution-storage.test.js
```

Expected: build fails because ledger and storage modules do not exist.

- [ ] **Step 3: Add event, checkpoint, and snapshot types**

Append to `src/execution/types.ts`:

```ts
export type ExecutionEventType = "RUN_CREATED" | "GRAPH_ACCEPTED" | "NODE_READY" | "NODE_DISPATCHED" | "NODE_RESULT_RECEIVED" | "NODE_RESULT_ACCEPTED" | "NODE_RESULT_REJECTED" | "NODE_STOPPED" | "GRAPH_MUTATION_ACCEPTED" | "CHECKPOINT_WRITTEN" | "RUN_FINALIZED" | "RUN_STOPPED" | "RUN_UNKNOWN";

export interface ExecutionEventInput {
  runId: string;
  eventType: ExecutionEventType;
  nodeId: string | null;
  beforeState: ExecutionNodeState | ExecutionRunState | null;
  afterState: ExecutionNodeState | ExecutionRunState;
  graphRevision: number;
  evidenceRefs: readonly string[];
  taskId: string | null;
  threadRef: string | null;
  reasonCode: string | null;
}

export interface ExecutionEvent extends ExecutionEventInput {
  eventVersion: "1.0";
  sequence: number;
  recordedAt: string;
  previousEventHash: string | null;
  eventHash: string;
}

export interface ExecutionCheckpoint {
  checkpointVersion: "1.0";
  runId: string;
  envelopeHash: string;
  graphHash: string;
  graphRevision: number;
  runState: ExecutionRunState;
  dispatchesUsed: number;
  checkerRepairCyclesUsed: number;
  acceptedArtifactRefs: readonly ExecutionArtifactRef[];
  activeThreadRefs: readonly string[];
  lastEventSequence: number;
  lastEventHash: string;
}

export interface LoadedExecutionRun {
  runDirectory: string;
  envelope: ExecutionEnvelope;
  graph: ExecutionGraph;
  events: readonly ExecutionEvent[];
  checkpoint: ExecutionCheckpoint;
  evidenceRefs: readonly ExecutionEvidenceRef[];
  artifactRefs: readonly ExecutionArtifactRef[];
}
```

- [ ] **Step 4: Implement the hash-chained event ledger**

Create `src/execution/ledger.ts`:

```ts
export function createExecutionEvent(
  input: ExecutionEventInput,
  sequence: number,
  previousEventHash: string | null,
  recordedAt: string,
): ExecutionEvent;

export function parseExecutionEvent(value: unknown): ExecutionEvent;
export function replayExecutionEvents(events: readonly ExecutionEvent[], envelope: ExecutionEnvelope, initialGraph: ExecutionGraph): ExecutionCheckpoint;
```

`eventHash` is `executionDigest` of the complete event without `eventHash`. Replay requires contiguous sequences starting at 1, exact previous hashes, the same run ID, valid state transitions, nondecreasing graph revision, and a first `RUN_CREATED` event followed by `GRAPH_ACCEPTED`. During exclusive run initialization, `createPersonalExecutionRun` writes both initial ledger events before returning: sequence 1 moves `null` to `PREPARED`; sequence 2 moves `PREPARED` to `READY` and binds graph revision 1. The returned `lastEventHash` is the `GRAPH_ACCEPTED` hash. A partial initialization remains an explicit conflicting target for review; it is never silently repaired or overwritten. Any replay mismatch throws `EXECUTION_LEDGER_INVALID` without attempting repair.

- [ ] **Step 5: Implement explicit Personal storage**

Create `src/execution/storage.ts` with:

```ts
export async function createPersonalExecutionRun(
  personalRoot: string,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  recordedAt: string,
): Promise<{ runDirectory: string; lastEventHash: string }>;

export async function loadExecutionRun(runDirectory: string): Promise<LoadedExecutionRun>;
export async function appendRunEvent(runDirectory: string, event: ExecutionEvent): Promise<void>;
export async function saveGraphSnapshot(runDirectory: string, graph: ExecutionGraph): Promise<void>;
export async function saveAcceptedResult(runDirectory: string, result: ExecutionResultEnvelope): Promise<ExecutionArtifactRef>;
export async function saveExecutionCheckpoint(runDirectory: string, checkpoint: ExecutionCheckpoint): Promise<void>;
```

Implementation rules:

- Require an absolute existing Personal root that is a real directory and not a symbolic link.
- Derive the child path from the already validated `runId`; create it with `mkdir(..., { recursive: false })`.
- Create initial files with `flag: "wx"` and mode `0o600` where supported.
- Keep `events.jsonl` as one JSON object plus newline per event; open in append mode only after replaying the current file and checking the next event's sequence and previous hash.
- Write replacement snapshots to a sibling `.next` file, validate the written content, then rename it over the target. A leftover `.next` file stops load with `EXECUTION_STORAGE_AMBIGUOUS`.
- `saveAcceptedResult` writes canonical JSON to `artifacts/task-<nodeId>-result.json` with `flag: "wx"`, hashes the exact bytes, and updates `artifacts/manifest.json` through the same checked replacement path.
- `loadExecutionRun` revalidates every file, replays the ledger, verifies all manifest hashes, and rejects snapshot/ledger disagreement.
- Never return absolute paths in an error message or CLI result.

Use stable codes `EXECUTION_PERSONAL_ROOT_INVALID`, `EXECUTION_RUN_TARGET_CONFLICT`, `EXECUTION_STORAGE_ESCAPE`, `EXECUTION_STORAGE_SYMLINK`, `EXECUTION_STORAGE_AMBIGUOUS`, `EXECUTION_STORAGE_CONFLICT`, and `EXECUTION_LEDGER_INVALID`.

- [ ] **Step 6: Run focused storage tests**

Run:

```powershell
npm run build
node --test dist/test/execution-storage.test.js
```

Expected: PASS. If the real symlink creation check cannot run on the host, report the exact Windows privilege error and do not replace it with a mock.

- [ ] **Step 7: Review and optionally commit the storage slice**

Run:

```powershell
git diff -- src/execution/types.ts src/execution/ledger.ts src/execution/storage.ts test/execution-storage.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add src/execution/types.ts src/execution/ledger.ts src/execution/storage.ts test/execution-storage.test.ts
git commit -m "feat: add personal execution ledger"
```

---

### Task 5: Resume, finalization, and single-versus-multi comparison

**Files:**
- Modify: `src/execution/types.ts`
- Modify: `src/execution/storage.ts`
- Create: `src/execution/resume.ts`
- Create: `src/execution/finalize.ts`
- Create: `src/execution/compare.ts`
- Modify: `test/execution-storage.test.ts`
- Create: `test/execution-resume-finalize.test.ts`
- Create: `test/execution-compare.test.ts`

**Interfaces:**
- Consumes: complete validated `LoadedExecutionRun` values and explicit current host evidence.
- Produces: `evaluateExecutionResume`, `finalizeExecutionRun`, and `compareExecutionRuns` without invoking Codex or mutating a run during resume/comparison.

- [ ] **Step 1: Write failing resume and finalization tests**

Create `test/execution-resume-finalize.test.ts` with exact current-runtime evidence and supported acceptance claims:

Build `resumableRun` through the real temporary Personal store with the two worker results accepted and `checker` ready, but not dispatched. Build `completedRun` separately with worker, checker, and synthesis results accepted. Define `finalHandoff` for `completedRun` with the same run/envelope/graph identities, exactly one `SUPPORTED` claim per acceptance criterion, only accepted evidence IDs, empty `unknowns` and `limits`, `metrics: { elapsedMs: { state: "UNKNOWN", value: null }, tokenUsage: { state: "UNKNOWN", value: null } }`, and a non-empty `nextAction`. Do not construct either `LoadedExecutionRun` through a type assertion.

```ts
test("execution resume: resumes only the same source and known Codex thread state", () => {
  const decision = evaluateExecutionResume(resumableRun, {
    sourceRevision: resumableRun.envelope.sourceRevision,
    availableThreadRefs: ["codex-agent:controller", "codex-agent:context"],
    activeThreadRefs: [],
    observedAt: "2026-08-07T15:30:00.000Z",
  });
  assert.deepEqual(decision, { decision: "RESUME", runId: resumableRun.envelope.runId, readyNodeIds: ["checker"], completedNodeIds: ["audit-controller", "audit-context"] });
});

test("execution resume: preserves UNKNOWN for an unavailable active thread and stops stale source", () => {
  assert.equal(evaluateExecutionResume(resumableRun, { ...runtime, availableThreadRefs: [] }).decision, "UNKNOWN");
  assert.equal(evaluateExecutionResume(resumableRun, { ...runtime, sourceRevision: "stale" }).decision, "STOPPED");
});

test("execution finalization: requires one supported claim per acceptance criterion", () => {
  const result = finalizeExecutionRun(completedRun, finalHandoff, "2026-08-07T15:31:00.000Z");
  assert.equal(result.state, "COMPLETE");
  assert.throws(() => finalizeExecutionRun(completedRun, { ...finalHandoff, claims: finalHandoff.claims.slice(1) }, "2026-08-07T15:31:00.000Z"), /EXECUTION_ACCEPTANCE_INCOMPLETE/);
});
```

- [ ] **Step 2: Write the failing comparator tests**

Create `test/execution-compare.test.ts`:

Build `singleRun` and `multiRun` through the same real storage helper. Give them different run IDs and graphs but the same canonical comparison identity. The single graph has one `SYNTHESIS` node executed by `main`; the multi graph uses the four-node reference graph. Persist validated final handoffs with unknown host metrics in both stores.

```ts
test("execution comparison: compares evidence and overhead without claiming unavailable metrics", () => {
  const report = compareExecutionRuns(singleRun, multiRun);
  assert.equal(report.comparable, true);
  assert.equal(report.goalIdentityMatch, true);
  assert.deepEqual(report.metrics.tokenUsage, { single: null, multi: null, state: "UNKNOWN" });
  assert.equal(report.metrics.dispatchCount.multi, 3);
  assert.equal(report.metrics.dispatchCount.single, 0);
});

test("execution comparison: rejects different goals, revisions, scope, or authority", () => {
  assert.throws(() => compareExecutionRuns(singleRun, { ...multiRun, envelope: { ...multiRun.envelope, sourceRevision: "other" } }), /EXECUTION_RUNS_NOT_COMPARABLE/);
});
```

- [ ] **Step 3: Run the focused tests and verify missing modules**

Run:

```powershell
npm run build
node --test dist/test/execution-resume-finalize.test.js dist/test/execution-compare.test.js
```

Expected: build fails because resume, finalization, and comparison modules do not exist.

- [ ] **Step 4: Add runtime, handoff, resume, and comparison types**

Append to `src/execution/types.ts`:

```ts
export interface ExecutionResumeRuntime {
  sourceRevision: string;
  availableThreadRefs: readonly string[];
  activeThreadRefs: readonly string[];
  observedAt: string;
}

export type ExecutionResumeDecision =
  | { decision: "RESUME"; runId: string; readyNodeIds: readonly string[]; completedNodeIds: readonly string[] }
  | { decision: "STOPPED" | "UNKNOWN"; runId: string; reasons: readonly string[]; preservedState: true };

export interface ExecutionMetricMeasurement {
  state: "MEASURED" | "UNKNOWN";
  value: number | null;
}

export interface ExecutionHostMetrics {
  elapsedMs: ExecutionMetricMeasurement;
  tokenUsage: ExecutionMetricMeasurement;
}

export interface FinalExecutionHandoff {
  handoffVersion: "1.0";
  runId: string;
  envelopeHash: string;
  graphHash: string;
  state: ExecutionFinalState;
  summary: string;
  claims: readonly ExecutionClaim[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  limits: readonly string[];
  metrics: ExecutionHostMetrics;
  nextAction: string;
}

export interface ExecutionComparisonReport {
  comparisonVersion: "1.0";
  comparable: true;
  singleRunId: string;
  multiRunId: string;
  goalIdentityMatch: true;
  metrics: {
    supportedClaimCount: { single: number; multi: number };
    conflictCount: { single: number; multi: number };
    unknownCount: { single: number; multi: number };
    dispatchCount: { single: number; multi: number };
    repairCount: { single: number; multi: number };
    elapsedMs: { single: number | null; multi: number | null; state: "MEASURED" | "UNKNOWN" };
    tokenUsage: { single: number | null; multi: number | null; state: "MEASURED" | "UNKNOWN" };
  };
}
```

Extend `LoadedExecutionRun` with `finalHandoff: FinalExecutionHandoff | null`. Add the following storage function and cover exact-byte hashing, create-once semantics, manifest verification, forbidden-content rejection, and re-load in `test/execution-storage.test.ts`:

```ts
export async function saveFinalExecutionHandoff(
  runDirectory: string,
  handoff: FinalExecutionHandoff,
  markdown: string,
): Promise<{ canonicalRef: ExecutionArtifactRef; markdownRef: ExecutionArtifactRef }>;
```

Write canonical JSON to `artifacts/final-handoff.json` and the deterministic human projection to `artifacts/final-handoff.md`, both with `flag: "wx"`. Use `nodeId: null` in both artifact references and update the checked artifact manifest with two distinct hashes. Before either write, require `markdown === renderFinalExecutionHandoffMarkdown(handoff)`; partial creation of only one file stops with `EXECUTION_STORAGE_AMBIGUOUS`. `loadExecutionRun` must parse and validate JSON, regenerate Markdown, verify exact bytes and both manifest hashes, and expose the typed handoff. Each `MEASURED` metric requires a non-negative finite value; each `UNKNOWN` metric requires `value: null`. The Kernel never fabricates either metric or requires both metrics to have the same evidence state.

- [ ] **Step 5: Implement fail-closed resume**

Create `src/execution/resume.ts`:

```ts
export function evaluateExecutionResume(run: LoadedExecutionRun, runtime: ExecutionResumeRuntime): ExecutionResumeDecision;
```

Validate source revision, envelope/graph/checkpoint hashes, replayed event state, artifact hashes, dispatch and checker-repair budget, and terminal run state. Completed nodes are returned, never re-run. If a checkpoint lists an active thread that is absent from both runtime thread lists, return `UNKNOWN`. If source revision or identity changed, return `STOPPED`. Do not write or repair files.

- [ ] **Step 6: Implement final-handoff admission**

Create `src/execution/finalize.ts`:

```ts
export function validateFinalExecutionHandoff(value: unknown, run: LoadedExecutionRun): FinalExecutionHandoff;
export function renderFinalExecutionHandoffMarkdown(handoff: FinalExecutionHandoff): string;
export function finalizeExecutionRun(run: LoadedExecutionRun, handoff: FinalExecutionHandoff, recordedAt: string): { state: ExecutionFinalState; handoffHash: string; event: ExecutionEvent };
```

Require every envelope acceptance criterion ID to have exactly one `SUPPORTED` handoff claim with resolved accepted evidence. A `COMPLETE` run may have limits but no unknown or conflicted acceptance claim. `COMPLETE_WITH_LIMIT` requires all criteria supported plus at least one declared limit. `STOPPED` and `UNKNOWN` require a non-empty next action and may not masquerade as accepted completion. Render Markdown with stable section order, sorted claim/evidence IDs, LF line endings, no absolute Personal path, and no raw payload. `finalizeExecutionRun` remains pure; the CLI writes the validated JSON and Markdown through `saveFinalExecutionHandoff`, appends both returned artifact IDs to `RUN_FINALIZED`, and then writes the final checkpoint.

- [ ] **Step 7: Implement comparable-run reporting**

Create `src/execution/compare.ts`:

```ts
export function compareExecutionRuns(singleRun: LoadedExecutionRun, multiRun: LoadedExecutionRun): ExecutionComparisonReport;
```

Comparable runs must have the same canonical identity computed from goal, scope, non-goals, acceptance criteria, source revision, sources, authority, and required evidence kinds. Do not require equal graph limits or run IDs. Compute claims, conflicts, unknowns, subagent dispatches, and repairs from accepted artifacts and ledger events. Count a dispatch only when the dispatched graph node is `AGENT_TASK`; main-task `SYNTHESIS` execution is therefore zero subagent dispatches. Use `null` plus `UNKNOWN` for elapsed or token metrics unless both validated final handoffs contain measured host evidence.

- [ ] **Step 8: Run focused resume, finalization, and comparison tests**

Run:

```powershell
npm run build
node --test dist/test/execution-resume-finalize.test.js dist/test/execution-compare.test.js
```

Expected: PASS.

- [ ] **Step 9: Review and optionally commit the recovery slice**

Run:

```powershell
git diff -- src/execution/types.ts src/execution/storage.ts src/execution/resume.ts src/execution/finalize.ts src/execution/compare.ts test/execution-storage.test.ts test/execution-resume-finalize.test.ts test/execution-compare.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add src/execution/types.ts src/execution/storage.ts src/execution/resume.ts src/execution/finalize.ts src/execution/compare.ts test/execution-storage.test.ts test/execution-resume-finalize.test.ts test/execution-compare.test.ts
git commit -m "feat: add execution recovery and comparison"
```

---

### Task 6: Single-purpose execution CLI surface

**Files:**
- Create: `src/execution/cli.ts`
- Modify: `src/cli.ts:1-120`
- Create: `test/execution-cli.test.ts`

**Interfaces:**
- Consumes: all Kernel operations from Tasks 1-5.
- Produces: built CLI commands `prepare-execution`, `prepare-execution-node`, `record-execution-dispatch`, `accept-execution-result`, `propose-execution-repair`, `stop-execution`, `check-execution-resume`, `finalize-execution`, and `compare-execution-runs`.

- [ ] **Step 1: Write a failing built-CLI end-to-end test**

Create `test/execution-cli.test.ts` using a real temporary Personal root and spawned `dist/cli.js`. Assert help, exact arguments, success outputs, stdin Result Envelope admission, stale result rejection, sanitized paths, resume, finalization, and comparison:

```ts
test("built execution CLI: prepares, dispatches, accepts, resumes, and finalizes one Personal run", async () => {
  await withTemporaryDirectory(async (root) => {
    const runDirectory = join(root, referenceEnvelopeInput.runId);
    const prepared = await runBuiltCli(["prepare-execution", "--personal-root", root], JSON.stringify({ envelope: referenceEnvelopeInput, graph: referenceGraphDraft }));
    assert.equal(prepared.code, 0);
    const preparedOutput = JSON.parse(prepared.stdout) as { state: string; runId: string };
    assert.deepEqual(preparedOutput, { state: "READY", runId: "run-codex-audit-multi" });

    const packet = await runBuiltCli(["prepare-execution-node", "--run", runDirectory, "--node", "audit-controller"], null);
    assert.equal(packet.code, 0);
    const preparedNode = JSON.parse(packet.stdout) as PreparedExecutionNode;
    assert.equal(preparedNode.taskPacket.packetVersion, "1.0");
    assert.deepEqual(preparedNode.contextArtifacts, []);
    const dispatched = await runBuiltCli(["record-execution-dispatch", "--run", runDirectory, "--node", "audit-controller", "--task", preparedNode.taskPacket.taskId, "--thread-ref", "codex-agent:controller"], null);
    assert.equal(dispatched.code, 0);

    const accepted = await runBuiltCli(["accept-execution-result", "--run", runDirectory], JSON.stringify(validWorkerResult));
    assert.equal(accepted.code, 0);
    assert.equal(JSON.parse(accepted.stdout).state, "SUCCEEDED");
  });
});
```

The helper must support optional stdin without shell interpolation:

```ts
function runBuiltCli(argv: readonly string[], stdin: string | null): Promise<CliResult> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, ["dist/cli.js", ...argv], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
    if (stdin === null) child.stdin.end(); else child.stdin.end(`${stdin}\n`);
    // collect stdout/stderr and resolve on close exactly like existing CLI tests
  });
}
```

- [ ] **Step 2: Run the focused CLI test and verify unknown commands**

Run:

```powershell
npm run build
node --test dist/test/execution-cli.test.js
```

Expected: CLI assertions fail because execution commands are not routed.

- [ ] **Step 3: Implement command handlers in a cohesive execution CLI module**

Create `src/execution/cli.ts` and export one function per command, with no mode flag:

```ts
export async function runPrepareExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number>;
export async function runPrepareExecutionNode(argv: readonly string[]): Promise<number>;
export async function runRecordExecutionDispatch(argv: readonly string[]): Promise<number>;
export async function runAcceptExecutionResult(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number>;
export async function runProposeExecutionRepair(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number>;
export async function runStopExecution(argv: readonly string[]): Promise<number>;
export async function runCheckExecutionResume(argv: readonly string[]): Promise<number>;
export async function runFinalizeExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number>;
export async function runCompareExecutionRuns(argv: readonly string[]): Promise<number>;
```

Exact arguments:

```text
prepare-execution --personal-root <directory>              # preparation JSON on stdin
prepare-execution-node --run <directory> --node <nodeId>
record-execution-dispatch --run <directory> --node <nodeId> --task <taskId> --thread-ref <normalizedActorRef>
accept-execution-result --run <directory>                 # one JSON object on stdin
propose-execution-repair --run <directory>                # one proposal JSON object on stdin
stop-execution --run <directory> --code <allowlistedStopCode>
check-execution-resume --run <directory> --runtime <file>
finalize-execution --run <directory>                      # one FinalExecutionHandoff JSON object on stdin
compare-execution-runs --single <directory> --multi <directory>
```

All success and stopped outputs are one JSON object on stdout. Validation and path/configuration errors use exit codes 3 and 4 respectively, stderr remains empty for expected stops, and outputs never include absolute Personal paths or raw input. `prepare-execution-node` is read-only and returns `PreparedExecutionNode`: the exact Task Packet plus hash-verified accepted predecessor Result Envelopes. It fails closed if a predecessor is not `SUCCEEDED`, an artifact is missing, or a manifest hash differs. `record-execution-dispatch` validates the exact task ID and node type. For `AGENT_TASK`, the orchestrator passes `codex-agent:<actual-agent-id>` only after native Codex spawn returns that ID. For `SYNTHESIS`, the only accepted actor reference is the literal `main`, recorded immediately before the main task performs the packet. Store the normalized actor reference in the `NODE_DISPATCHED` event; do not store a worker prompt or transcript. `stop-execution` accepts only `CODEX_SPAWN_FAILED`, `CODEX_WAIT_TIMEOUT`, `USER_CANCELLED`, or `HOST_THREAD_UNKNOWN`.

Map stop reasons conservatively. `CODEX_SPAWN_FAILED` before an agent ID exists and `USER_CANCELLED` after known active agents were confirmed interrupted end in `STOPPED`. `CODEX_WAIT_TIMEOUT` and `HOST_THREAD_UNKNOWN` always end in `UNKNOWN`; a later `check-execution-resume` call may evaluate fresh explicit host evidence but never rewrites the historical stop event. The CLI never treats lack of visibility as a successful stop; it appends node/run stop or unknown events and checkpoints the preserved state.

`accept-execution-result` performs the full state sequence for worker, checker, and main-task synthesis nodes. First parse size, exact fields, safe content, and identities without storing the payload. For a structurally admissible current-node result, transition `RUNNING -> RESULT_RECEIVED` and append `NODE_RESULT_RECEIVED`; then run node, scope, evidence, and claim validation. On rejection, append `NODE_RESULT_REJECTED`, transition to `REJECTED`, store no result artifact, checkpoint, and stop according to the envelope. On acceptance, write the exact validated result artifact, append `NODE_RESULT_ACCEPTED`, transition to `SUCCEEDED`, recompute newly ready nodes, append one `NODE_READY` event per promotion, save the graph and checkpoint, and emit only normalized IDs and state. A payload that cannot safely establish current run/node identity causes a sanitized run stop without storing raw input. `finalize-execution` accepts only the Final Execution Handoff after the synthesis node is `SUCCEEDED`, persists canonical `final-handoff.json` plus deterministic `final-handoff.md`, appends both artifact IDs to `RUN_FINALIZED`, and writes the terminal checkpoint. No CLI command invokes a model or agent.

- [ ] **Step 4: Add top-level routing and help text only**

Modify `src/cli.ts` imports and `dispatchCli` without moving existing command implementations:

```ts
if (command === "prepare-execution") return runPrepareExecution(argv.slice(1), process.stdin);
if (command === "prepare-execution-node") return runPrepareExecutionNode(argv.slice(1));
if (command === "record-execution-dispatch") return runRecordExecutionDispatch(argv.slice(1));
if (command === "accept-execution-result") return runAcceptExecutionResult(argv.slice(1), process.stdin);
if (command === "propose-execution-repair") return runProposeExecutionRepair(argv.slice(1), process.stdin);
if (command === "stop-execution") return runStopExecution(argv.slice(1));
if (command === "check-execution-resume") return runCheckExecutionResume(argv.slice(1));
if (command === "finalize-execution") return runFinalizeExecution(argv.slice(1), process.stdin);
if (command === "compare-execution-runs") return runCompareExecutionRuns(argv.slice(1));
```

Add the nine command names and one-line purposes to `helpText`. Do not add a generic `execution <mode>` command.

- [ ] **Step 5: Run focused and adjacent CLI tests**

Run:

```powershell
npm run build
node --test dist/test/execution-cli.test.js dist/test/context-storage-cli.test.js dist/test/controller-activation-execution-cli.test.js
```

Expected: PASS.

- [ ] **Step 6: Review and optionally commit the CLI slice**

Run:

```powershell
git diff -- src/execution/cli.ts src/cli.ts test/execution-cli.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add src/execution/cli.ts src/cli.ts test/execution-cli.test.ts
git commit -m "feat: expose execution kernel CLI"
```

---

### Task 7: Full verification and deterministic-kernel delivery state

**Files:**
- Modify: `docs/project/current-state.md`

**Interfaces:**
- Consumes: all implemented behavior and fresh verification evidence from Tasks 1-6.
- Produces: an accurate routing statement that the deterministic Kernel is locally complete while Codex-native orchestration is still `NOT_EXECUTED`.

- [ ] **Step 1: Run every focused execution test together**

Run:

```powershell
npm run build
node --test dist/test/execution-contract.test.js dist/test/execution-graph.test.js dist/test/execution-handoff.test.js dist/test/execution-storage.test.js dist/test/execution-resume-finalize.test.js dist/test/execution-compare.test.js dist/test/execution-cli.test.js
```

Expected: PASS with no skip added to hide an environment or behavior failure.

- [ ] **Step 2: Run complete repository gates**

Run:

```powershell
npm run lint
npm run build
npm test
npm run check:docs
git diff --check
```

Expected: PASS. Record the exact test count, Node version, commands, and any declared-runtime mismatch.

- [ ] **Step 3: Perform security and scope review**

Run:

```powershell
rg -n "OpenAI|api[_-]?key|token|secret|transcript|prompt|reasoning|spawn|child_process|Agents SDK|mcp" src/execution test/execution-*.test.ts
git diff --stat
git status --short
git diff -- src/execution src/cli.ts test docs/project/current-state.md
```

Expected:

- no model/API/agent spawn path under `src/execution/`;
- security words appear only in denylist logic, test fixtures, or explicit non-goals;
- no unrelated files or generated noise;
- the pre-existing dirty documents remain untouched.

- [ ] **Step 4: Update current delivery routing from actual evidence**

Modify `docs/project/current-state.md` only after Step 2 passes. Add:

- deterministic Agent-Agnostic Execution Contract Kernel delivered locally;
- exact test and documentation evidence;
- `PERSONAL` run-store support and negative boundaries;
- Codex-native live orchestration and comparator state `NOT_EXECUTED`;
- next bounded action: execute the dependent Codex-native reference-run plan.

Do not claim subagent execution, live resume, cross-host support, or multi-agent improvement.

- [ ] **Step 5: Re-run documentation and diff gates**

Run:

```powershell
npm run check:docs
git diff --check
& 'C:\Users\littl\.agents\tools\work-state-preflight.ps1' -RepositoryPath (Get-Location).Path -OutputFormat Markdown
```

Expected: PASS and a fresh work-state record with the exact implementation branch and dirty review files.

- [ ] **Step 6: Final review and optional slice commit**

Review every changed file and the final test output. With explicit commit approval only:

```powershell
git add src/execution src/cli.ts test/execution-contract.test.ts test/execution-graph.test.ts test/execution-handoff.test.ts test/execution-storage.test.ts test/execution-resume-finalize.test.ts test/execution-compare.test.ts test/execution-cli.test.ts docs/project/current-state.md
git commit -m "feat: add deterministic execution kernel"
```

After any commit, run the work-state preflight again before publication or starting the dependent reference-run plan. Do not push or create a pull request without separate authorization.

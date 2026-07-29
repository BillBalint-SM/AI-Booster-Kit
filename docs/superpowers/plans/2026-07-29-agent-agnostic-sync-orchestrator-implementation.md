# Agent-agnostic contract-first sync orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Codex-first, locally runnable vertical slice that turns an accepted Milestone and its Canonical Work Artifact into an allowlisted, auditable Jira/Confluence projection, verifies implementation start, and reads GitHub delivery evidence back into the canonical lifecycle.

**Architecture:** Start from a shared Markdown contract with declarative YAML metadata and compile it into native Codex, Claude Code, and Cursor projections. Keep the domain model, hierarchy finalization, lifecycle policy, event outbox, identity/allowlist checks, connectors, and host adapters behind narrow TypeScript interfaces. V1 uses dry-run and local HTTP contract fixtures by default; live Jira/Confluence/GitHub writes remain explicit, target-verified sandbox operations.

**Tech Stack:** Node.js 22 LTS, TypeScript 5.x with ESM, `node:test`, Markdown with YAML frontmatter, JSON Schema validation through Ajv, native `fetch`, JSONL local outbox storage, and GitHub Actions-compatible CLI execution.

## Global Constraints

- Governing design: `docs/superpowers/specs/2026-07-29-agent-agnostic-sync-orchestrator-design.md`.
- Canonical Jira hierarchy: `Milestone → Epic → Story / Task / Bug`.
- `Canonical Work Artifact` is Milestone content, not an additional Jira execution work item.
- Jira Board lifecycle is exactly `To Do → In Progress → Review → Ready for Deploy → Ready for Test → Testing → Done` for the initial project profile.
- `Blocked`, `Rejected`, and `Awaiting Clarification` are not lifecycle statuses; dependencies, problems, clarification, and sync stops are orthogonal flags, comments, and links.
- Jira Sprint is a board-native planning container; `Execution Set` is an owner/agent scope and evidence mapping, not a per-developer Sprint and not automatically a branch.
- Planning remains editable until explicit finalization and acceptance. Raw session transcripts never publish externally.
- Only allowlisted fields, forward transitions, named Jira project, named Confluence space, and named GitHub repository may be written.
- Every external write is idempotent, read-back verified, and audited. Unknown completion is reconciled by read-back rather than blindly retried.
- Wrong tenant/project/space/repository, unverifiable credentials or scopes, ambiguous mappings, deletion, permission changes, backward transitions, and unsupported host capabilities produce the structured user-facing `SYNC STOP` protocol.
- Continue decisions are bounded, non-destructive, allowlisted, expiry-bound, compensating-controlled, and read-back verified. Hard-stop cases do not offer an override.
- Connector tests use a real local HTTP fixture server and contract assertions; they do not mock away failure handling.
- No production write, automatic merge, automatic deployment, permission mutation, deletion, or raw private-session publication is part of V1.
- Do not create a commit unless the user explicitly requests it; leave implementation changes reviewable in the working tree.

---

## File and module map

The repository currently contains design/research Markdown and no application runtime. The first implementation therefore creates a small, focused TypeScript runtime rather than refactoring an existing codebase.

### Runtime and contract files

- Create `package.json`: ESM package metadata, build/test/lint/CLI scripts, and pinned runtime dependencies.
- Create `tsconfig.json`: strict TypeScript compilation for `src/` and `test/` into `dist/`.
- Create `contract/team-contract.md`: one human-maintained team standard and its contract metadata.
- Create `contract/capability-matrix.md`: Codex/Claude Code/Cursor capability states and limitations.
- Create `contract/lifecycle.md`: canonical Board statuses, event meanings, and orthogonal attention states.
- Create `contract/adapters/codex.md`, `contract/adapters/claude-code.md`, and `contract/adapters/cursor.md`: generated native projections with source revision metadata.
- Create `contract/artifacts/milestone-template.md`, `contract/artifacts/canonical-work-artifact-template.md`, `contract/artifacts/epic-template.md`, `contract/artifacts/work-item-template.md`, and `contract/artifacts/review-template.md`: shared authoring templates.
- Create `contract/mappings/jira-confluence-github.md`: the explicit project/space/repository mapping and allowlisted field/transition table.

### Domain and contract modules

- Create `src/domain/model.ts`: canonical TypeScript types for Milestone, Canonical Work Artifact, Epic, Story/Task/Bug, Execution Set, board state, attention state, evidence, project profile, and target identity.
- Create `src/domain/schema.ts`: JSON Schemas for the domain records and event payloads.
- Create `src/domain/validate.ts`: strict schema validation with actionable path-specific errors.
- Create `src/contract/markdown.ts`: YAML-frontmatter and Markdown body parsing.
- Create `src/contract/compile.ts`: semantic validation and native host projection generation.
- Create `src/contract/errors.ts`: typed, secret-safe contract errors.

### Planning, lifecycle, and event modules

- Create `src/planning/finalize.ts`: draft-to-finalized Milestone projection intents and hierarchy reconciliation.
- Create `src/planning/traceability.ts`: parent/child and artifact-to-evidence trace checks.
- Create `src/lifecycle/profile.ts`: project-specific Jira Board profile and planning-state mapping.
- Create `src/lifecycle/transitions.ts`: forward transition policy and failure rollback mapping.
- Create `src/lifecycle/start-check.ts`: verified implementation-start / last check-review.
- Create `src/events/envelope.ts`: canonical event envelope and stable idempotency key.
- Create `src/events/outbox.ts`: append-only local JSONL event storage and applied-result records.
- Create `src/events/reconcile.ts`: timeout/unknown-completion read-back reconciliation.

### Orchestrator, connectors, adapters, and CLI

- Create `src/orchestrator/identity.ts`: tenant/project/space/repository identity resolution.
- Create `src/orchestrator/allowlist.ts`: operation, field, transition, and target enforcement.
- Create `src/orchestrator/stop.ts`: structured `SYNC STOP` construction and Continue/Stop decision handling.
- Create `src/orchestrator/sync.ts`: event-to-connector orchestration with read-back and audit results.
- Create `src/connectors/types.ts`: narrow Jira, Confluence, and GitHub gateway contracts.
- Create `src/connectors/jira.ts`: allowlisted Jira issue/field/transition/attachment operations and read-back.
- Create `src/connectors/confluence.ts`: versioned roadmap projection and attachment operations with read-back.
- Create `src/connectors/github.ts`: branch, pull request, check, review, and deployment evidence reads.
- Create `src/evidence/github.ts`: normalization of GitHub evidence into canonical evidence references.
- Create `src/evidence/readback.ts`: authority-specific read-back assertions.
- Create `src/adapters/types.ts`: host adapter contract and capability state.
- Create `src/adapters/codex.ts`, `src/adapters/claude-code.ts`, and `src/adapters/cursor.ts`: native adapter projections and conformance metadata.
- Create `src/cli.ts`: `validate`, `finalize`, `sync`, and `conformance` commands with dry-run as the default.
- Create `src/errors.ts`: common safe error serialization and exit-code mapping.

### Tests, fixtures, and operational documentation

- Create `test/fixtures/valid-milestone.md`, `test/fixtures/invalid-milestone.md`, and `test/fixtures/ambiguous-mapping.md`: deterministic contract and stop fixtures.
- Create `test/fixtures/project-profile.json`: the GDEAI-like initial Board profile without live credentials.
- Create `test/fixtures/connector-server.ts`: local HTTP server implementing success, validation error, timeout, partial completion, and stale read-back responses.
- Create `test/domain.test.ts`, `test/contract.test.ts`, `test/planning.test.ts`, `test/lifecycle.test.ts`, `test/events.test.ts`, `test/orchestrator.test.ts`, `test/connectors.test.ts`, `test/adapters.test.ts`, `test/evidence.test.ts`, and `test/e2e.test.ts`: behavior-level tests for each module and the vertical slice.
- Create `test/fixtures/events/implementation-started.json`: a verified implementation-start event used by the CLI smoke path.
- Create `test/conformance/host-conformance.test.ts`: identical canonical scenarios across the three adapters.
- Create `test/performance/baseline.test.ts`: local latency/throughput measurements without pre-claiming hard targets.
- Create `docs/runbooks/sync-orchestrator-v1-sandbox.md`: setup, target verification, dry-run, bounded sandbox activation, read-back, stop handling, and recovery procedure.

Each implementation task below ends in a runnable test gate. The files named in later tasks consume only interfaces defined in earlier tasks.

---

### Task 1: Bootstrap the runtime and shared contract layout

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/errors.ts`
- Create: `src/cli.ts`
- Create: all files under `contract/` listed in the file map
- Test: `test/bootstrap.test.ts`

**Interfaces:**
- Produces `npm run build`, `npm test`, `npm run lint`, and `npm run cli -- <command>` scripts used by every later task.
- Produces `runCli(argv: readonly string[]): Promise<number>` as the stable CLI dispatcher used by every later task.

- [ ] **Step 1: Add the package scripts and ESM entrypoint.**

  Use this script contract so PowerShell and GitHub Actions run the same commands:

  ```json
  {
    "type": "module",
    "scripts": {
      "build": "tsc",
      "lint": "tsc --noEmit",
      "test": "npm run build && node --test dist/test/*.test.js",
      "cli": "node dist/cli.js"
    }
  }
  ```

  Add `yaml`, `ajv`, `typescript`, and `@types/node` with exact versions selected during bootstrap and recorded in `package-lock.json`.

- [ ] **Step 2: Configure strict compilation.**

  `tsconfig.json` must set `target` to `ES2022`, `module` and `moduleResolution` to `NodeNext`, `strict` to `true`, `noUncheckedIndexedAccess` to `true`, `exactOptionalPropertyTypes` to `true`, `rootDir` to `.`, `outDir` to `dist`, and exclude `dist`, `.tmp-*`, and `node_modules`.

- [ ] **Step 3: Add the initial contract documents.**

  `contract/team-contract.md` must declare `contractId`, `contractVersion`, `sourceRevision`, and `canonicalVocabulary`. `contract/lifecycle.md` must list the seven Board statuses in order and define `attentionState` separately. `contract/mappings/jira-confluence-github.md` must contain named placeholders only as explicit configuration errors, never as silently usable targets; the initial test profile uses `GDEAI`, `gdemikk.atlassian.net`, a named Confluence space key, and a named GitHub repository only when supplied through the project profile.

- [ ] **Step 4: Add a bootstrap test.**

  `test/bootstrap.test.ts` must execute the built CLI with `--help` and assert exit code `0` plus the four command names. Contract parsing and canonical vocabulary assertions belong to Task 3 after the parser exists.

  ```ts
  assert.match(stdout, /validate/);
  assert.match(stdout, /finalize/);
  assert.match(stdout, /sync/);
  assert.match(stdout, /conformance/);
  ```

- [ ] **Step 5: Run the first quality gate.**

  Run:

  ```powershell
  npm install
  npm run lint
  npm test
  ```

  Expected: TypeScript passes, the bootstrap test passes, and no external connector is contacted.

### Task 2: Define and validate the canonical domain model

**Files:**
- Create: `src/domain/model.ts`
- Create: `src/domain/schema.ts`
- Create: `src/domain/validate.ts`
- Test: `test/domain.test.ts`

**Interfaces:**
- Produces `WorkItemType = "milestone" | "epic" | "story" | "task" | "bug"`.
- Produces `BoardStatus = "To Do" | "In Progress" | "Review" | "Ready for Deploy" | "Ready for Test" | "Testing" | "Done"`.
- Produces `validateCanonicalRecord(record: unknown, schemaName: SchemaName): ValidatedRecord`.

- [ ] **Step 1: Write failing validation tests for the hierarchy.**

  Add tests asserting that a valid record with `milestoneId`, `epicId`, and `workItemIds` passes, while an Epic with two Milestone parents, a Story without an Epic parent, and an Execution Set spanning two Epics fail with path-specific errors.

- [ ] **Step 2: Define the canonical types.**

  Use these core shapes and keep optionality explicit:

  ```ts
  export type WorkItemType = "milestone" | "epic" | "story" | "task" | "bug";
  export type BoardStatus = "To Do" | "In Progress" | "Review" | "Ready for Deploy" | "Ready for Test" | "Testing" | "Done";
  export type AttentionState = "none" | "dependency" | "problem" | "clarification" | "sync_stop";

  export interface CanonicalWorkArtifact {
    artifactId: string;
    milestoneId: string;
    vision: string;
    scope: string[];
    nonGoals: string[];
    requirements: string[];
    implementationPlan: string[];
    testPlan: string[];
    acceptanceCriteria: string[];
    reviewPoints: string[];
    decisions: string[];
    evidenceRefs: string[];
    unknowns: string[];
    dependencies: string[];
    projectContext: string;
    currentState: string;
  }

  export interface Milestone {
    canonicalId: string;
    summary: string;
    description: CanonicalWorkArtifact;
    parentCanonicalId: null;
    boardStatus: BoardStatus;
  }

  export interface Epic {
    canonicalId: string;
    summary: string;
    parentMilestoneId: string;
    boardStatus: BoardStatus;
  }

  export interface ChildWorkItem {
    canonicalId: string;
    type: "story" | "task" | "bug";
    summary: string;
    parentEpicId: string;
    boardStatus: BoardStatus;
    acceptanceCriteria: string[];
  }

  export interface ExecutionSet {
    executionSetId: string;
    epicId: string;
    workItemIds: string[];
    owner: string;
    agentHost: "codex" | "claude-code" | "cursor";
    jiraProjectKey: string;
    jiraBoardId: string;
    sprintId?: string;
    branchName: string;
    worktreePath: string;
    baseRevision: string;
    affectedPaths: string[];
    dependencyIds: string[];
    acceptanceBoundary: string[];
    targetEnvironment: string;
    pullRequestUrls: string[];
  }
  ```

- [ ] **Step 3: Encode JSON Schemas.**

  Add schemas for `milestone`, `canonicalWorkArtifact`, `epic`, `workItem`, `executionSet`, `projectProfile`, and `canonicalEvent`. Enforce non-empty IDs, exact enum values, one `parentMilestoneId` per Epic, one `parentEpicId` per Story/Task/Bug, and no additional undeclared properties in connector payloads.

- [ ] **Step 4: Implement actionable validation.**

  `validateCanonicalRecord` must return the validated typed value or throw `ValidationError` containing the schema name, JSON path, expected constraint, and redacted received type. It must never include token, credential, or full external response values.

- [ ] **Step 5: Run the domain gate.**

  Run `npm test -- --test-name-pattern="domain"`. Expected: valid hierarchy records pass; missing/duplicate parent relationships, invalid statuses, and undeclared properties fail with actionable messages.

### Task 3: Parse the Markdown contract and compile native host projections

**Files:**
- Create: `src/contract/errors.ts`
- Create: `src/contract/markdown.ts`
- Create: `src/contract/compile.ts`
- Modify: `contract/adapters/codex.md`, `contract/adapters/claude-code.md`, `contract/adapters/cursor.md`
- Test: `test/contract.test.ts`

**Interfaces:**
- Consumes `contract/team-contract.md` and the domain validators from Task 2.
- Produces `parseMarkdownContract(text: string, sourcePath: string): ContractDocument`.
- Produces `validateContractPath(path: string): Promise<ValidationSummary>` and wires it into the `validate` CLI command.
- Produces `compileNativeAdapter(contract: ContractDocument, host: AgentHost): NativeAdapterProjection`.

  Define the cross-task shapes here:

  ```ts
  export type AgentHost = "codex" | "claude-code" | "cursor";
  export type CapabilityState = "supported" | "supported_with_limits" | "unsupported" | "unknown" | "requires_approval";

  export interface CapabilityDeclaration {
    name: string;
    state: CapabilityState;
    limitation: string;
  }

  export interface CapabilityReport extends CapabilityDeclaration {
    targetHost: AgentHost;
  }

  export interface ContractDocument {
    contractId: string;
    contractVersion: string;
    sourceRevision: string;
    metadata: Record<string, string | string[]>;
    body: string;
    capabilities: CapabilityDeclaration[];
  }

  export interface ValidationSummary {
    valid: boolean;
    sourcePath: string;
    contractId: string;
    canonicalVocabulary: string[];
    errors: string[];
  }

  export interface NativeAdapterProjection {
    sourceContractRevision: string;
    targetHost: AgentHost;
    generatedAt: string;
    content: string;
    capabilities: CapabilityReport[];
  }
  ```

- [ ] **Step 1: Write failing parser tests.**

  Test one valid frontmatter document, one document without frontmatter, one document with invalid YAML, and one document with an unsupported capability. Assert that failures identify `sourcePath` and the exact frontmatter key or Markdown section.

- [ ] **Step 2: Implement frontmatter parsing.**

  Parse the first `---` block with the `yaml` package and retain the Markdown body separately. Reject multiple frontmatter blocks, missing `contractId`, missing `contractVersion`, and unknown top-level metadata keys. Do not execute Markdown, YAML, hooks, skills, MCP configuration, or generated adapter content.

- [ ] **Step 3: Implement semantic compilation.**

  `compileNativeAdapter` must preserve the canonical terms, lifecycle semantics, stop protocol, source contract revision, target host, and limitations. It may render host-specific headings or instruction locations, but it must reject arbitrary executable capabilities and mark each capability as `supported`, `supported_with_limits`, `unsupported`, `unknown`, or `requires_approval`.

- [ ] **Step 4: Generate and verify the three adapter projections.**

  Each generated file must include `sourceContractRevision`, `targetHost`, `generatedAt`, and a capability table. The same Milestone/Epic/Story/Task/Bug vocabulary and seven Board statuses must appear in all three projections. The generated files are projections, not independent authorities.

- [ ] **Step 5: Run contract conformance.**

  Run `npm test -- --test-name-pattern="contract"`. Expected: valid documents compile for all three hosts; invalid metadata and unsupported executable capability requests stop before any connector call.

### Task 4: Finalize the Milestone and reconcile the Jira hierarchy

**Files:**
- Create: `src/planning/finalize.ts`
- Create: `src/planning/traceability.ts`
- Modify: `contract/artifacts/milestone-template.md`
- Modify: `contract/artifacts/canonical-work-artifact-template.md`
- Modify: `contract/artifacts/epic-template.md`
- Modify: `contract/artifacts/work-item-template.md`
- Create: `test/fixtures/valid-milestone.md`
- Create: `test/fixtures/invalid-milestone.md`
- Test: `test/planning.test.ts`

**Interfaces:**
- Consumes `ContractDocument`, `CanonicalWorkArtifact`, `Milestone`, `Epic`, and child work-item types from Task 2.
- Produces `finalizeMilestone(input: FinalizeInput): FinalizationResult`.
- Produces `assertHierarchyTraceability(input: HierarchyInput): TraceabilityResult`.

  Define:

  ```ts
  export interface FinalizeInput {
    milestone: Milestone;
    canonicalWorkArtifact: CanonicalWorkArtifact;
    epics: Epic[];
    workItems: ChildWorkItem[];
    acceptanceDecision: "accepted";
    sourceContractRevision: string;
  }

  export interface FinalizationResult {
    milestone: Milestone;
    canonicalWorkArtifact: CanonicalWorkArtifact;
    epics: Epic[];
    workItems: ChildWorkItem[];
    confluenceProjection: ConfluenceProjectionIntent;
    attachments: AttachmentIntent[];
    events: EventInput[];
  }
  ```

- [ ] **Step 1: Write failing finalization tests.**

  Test that finalization rejects missing vision, missing acceptance criteria, an Epic without exactly one Milestone parent, a Story/Task/Bug without an Epic parent, and an Execution Set that references work from multiple Epics. Test that a valid input produces one Milestone, two Epics, and three child work items with stable IDs.

- [ ] **Step 2: Define the projection intent.**

  `FinalizationResult` must contain `milestone`, `canonicalWorkArtifact`, `epics`, `workItems`, `confluenceProjection`, `attachments`, and `events`. Each external record must carry a stable `canonicalId`, `parentCanonicalId`, and `sourceContractRevision`; no network action occurs in this module.

- [ ] **Step 3: Implement the draft-to-finalized boundary.**

  Refuse finalization when the artifact is still marked draft or when the acceptance decision is absent. On success, render the full artifact into the Milestone Description, render concise child scopes into Epic and Story/Task/Bug descriptions, and create a roadmap-oriented Confluence projection. Preserve non-goals, dependencies, unknowns, and review points.

- [ ] **Step 4: Implement parent and child aggregation rules.**

  `assertHierarchyTraceability` must prove every Epic belongs to exactly one Milestone, every Story/Task/Bug belongs to exactly one Epic, every child has acceptance criteria, and every dependency has a named link target. It must not use a Blocked status to represent a dependency.

- [ ] **Step 5: Run planning tests.**

  Run `npm test -- --test-name-pattern="planning"`. Expected: no external object is created, valid finalization is deterministic on replay, and invalid hierarchy input fails before an event is emitted.

### Task 5: Implement the Jira Board profile and verified implementation start

**Files:**
- Create: `src/lifecycle/profile.ts`
- Create: `src/lifecycle/transitions.ts`
- Create: `src/lifecycle/start-check.ts`
- Modify: `contract/lifecycle.md`
- Create: `test/fixtures/project-profile.json`
- Test: `test/lifecycle.test.ts`

**Interfaces:**
- Produces `loadProjectProfile(path: string): ProjectProfile`.
- Produces `evaluateTransition(input: TransitionInput): TransitionDecision`.
- Produces `runImplementationStartCheck(input: StartCheckInput): StartCheckResult`.

  Define `ProjectProfile` with `jiraProjectKey`, `jiraBoardId`, `statusNames`,
  `transitionNames`, `planningStateMappings`, `allowedFields`, and
  `targetIdentities`. Define `TransitionInput` with `projectProfile`,
  `fromStatus`, `toStatus`, `attentionState`, and `evidenceRefs`. Define
  `StartCheckInput` with `milestoneId`, `epicId`, `workItemIds`,
  `acceptanceCriteria`, `dependencyIds`, `repository`, `branchName`,
  `worktreePath`, `baseRevision`, `actor`, and `roadmapRevision`. The result
  shapes must expose `passed: boolean`, `checks`, and `failures`.

- [ ] **Step 1: Write failing lifecycle tests.**

  Assert the allowed forward mappings `To Do → In Progress → Review → Ready for Deploy → Ready for Test → Testing → Done`, review/test failure to `To Do`, and dependency/clarification updates that preserve the current status. Assert that `Blocked`, `Rejected`, and `Awaiting Clarification` are rejected as Board statuses.

- [ ] **Step 2: Add the initial project profile fixture.**

  Store the Board ID, project key, exact visible status labels, transition lookup names, planning-state mappings, and allowed fields in `test/fixtures/project-profile.json`. Keep tenant URL, Confluence space, repository, and credentials outside fixtures and require them through a runtime profile.

- [ ] **Step 3: Implement transition evaluation.**

  `evaluateTransition` must reject backward transitions, unknown status identity, wrong project profile, and transitions without required evidence. It returns the exact target status and the evidence requirements without calling Jira.

- [ ] **Step 4: Implement the last check-review.**

  `runImplementationStartCheck` must verify Milestone/Epic/child trace, accepted scope, acceptance criteria, dependency links, target repository, branch/worktree, base revision, actor, and current roadmap context. It returns `passed: true` only when all checks pass; planning chat alone returns `passed: false` with named failures.

- [ ] **Step 5: Run lifecycle tests.**

  Run `npm test -- --test-name-pattern="lifecycle"`. Expected: exact Board semantics pass, unsupported statuses fail, and no transition is applied by the policy module itself.

### Task 6: Add the canonical event envelope and local outbox

**Files:**
- Create: `src/events/envelope.ts`
- Create: `src/events/outbox.ts`
- Create: `src/events/reconcile.ts`
- Test: `test/events.test.ts`

**Interfaces:**
- Produces `createCanonicalEvent(input: EventInput): CanonicalEvent`.
- Produces `OutboxStore.append(event: CanonicalEvent): Promise<void>`.
- Produces `OutboxStore.readPending(): Promise<CanonicalEvent[]>`.
- Produces `OutboxStore.markApplied(idempotencyKey: string, result: SyncResult): Promise<void>`.
- Produces `reconcileUnknownCompletion(input: ReconciliationInput): Promise<ReconciliationResult>`.

  Define `EventInput` as the event fields listed in the approved design except
  for derived `idempotencyKey` and `timestamp`. Define `CanonicalEvent` as
  `EventInput` plus those two derived fields. Define `SyncResult` with
  `state: "planned" | "applied" | "not_applied" | "stopped" | "unknown"`,
  `correlationId`, `evidenceRefs`, and `errorCode`. Define
  `ReconciliationInput` with `canonicalId`, `idempotencyKey`, and a
  `readBack(): Promise<ReadBackState>` function; define
  `ReconciliationResult.state` as `"applied" | "not_applied" | "unknown"`.

- [ ] **Step 1: Write failing event tests.**

  Assert that an event contains `executionSetId`, `artifactId`, `correlationId`, `source`, `actor`, `eventType`, `sourceRevision`, `timestamp`, `beforeState`, `afterState`, `evidenceRefs`, and `idempotencyKey`. Assert that the same canonical input produces the same idempotency key and that missing authority evidence is rejected.

- [ ] **Step 2: Implement envelope validation and stable keys.**

  Compute the idempotency key from canonical event type, canonical object ID, source revision, target identity, and requested operation. Exclude tokens, timestamps, and transient response bodies. Validate the envelope with the domain schema before persistence.

- [ ] **Step 3: Implement append-only JSONL persistence.**

  Store one event record per line and one applied-result record per line under a caller-provided local data directory. Use atomic append semantics, reject malformed existing lines, and never delete or rewrite prior evidence.

- [ ] **Step 4: Implement unknown-completion reconciliation.**

  On timeout, query the connector read-back function once for the stable canonical identity. Return `applied`, `not_applied`, or `unknown`; only `applied` or `not_applied` may be marked resolved. `unknown` produces a sync stop and remains pending.

- [ ] **Step 5: Run event tests.**

  Run `npm test -- --test-name-pattern="events"`. Expected: replay is duplicate-safe, malformed outbox evidence fails loudly, and unknown external completion never causes a blind retry.

### Task 7: Enforce target identity, allowlists, and the user-facing stop protocol

**Files:**
- Create: `src/orchestrator/identity.ts`
- Create: `src/orchestrator/allowlist.ts`
- Create: `src/orchestrator/stop.ts`
- Create: `test/fixtures/ambiguous-mapping.md`
- Test: `test/orchestrator.test.ts`

**Interfaces:**
- Produces `resolveTargetIdentity(input: TargetIdentityInput): ResolvedTarget`.
- Produces `assertAllowlistedOperation(input: AllowlistInput): AllowlistDecision`.
- Produces `createSyncStop(input: SyncStopInput): SyncStop`.
- Produces `applyContinueDecision(stop: SyncStop, decision: ContinueDecision): BoundedContinuation`.

  Define `TargetIdentityInput` with `tenantUrl`, `projectKey`, `spaceKey`,
  `repositoryOwner`, and `repositoryName`; `ResolvedTarget` with stable IDs
  for each resolved system; `AllowlistInput` with `operation`, `target`,
  `fields`, `transition`, `actorScope`, and `capability`; `AllowlistDecision`
  with `allowed: boolean` and `reasons`; `SyncStop` with the eleven structured
  user-facing fields from the approved design; `ContinueDecision` with
  `scope`, `compensatingControl`, `expiresAt`, and `actor`; and
  `BoundedContinuation` with the same scope plus mandatory `readBackPlan`.

- [ ] **Step 1: Write failing stop tests.**

  Cover wrong tenant, wrong project, wrong Confluence space, wrong repository, missing scope, ambiguous mapping, unknown timeout, stale read-back, capability proof failure, and an over-broad field request. Assert that every result contains Situation, Target, Detected problem, Evidence, Expected impact, What remains unchanged, Risk, Recommendation, and Decision options.

- [ ] **Step 2: Implement exact target resolution.**

  Resolve tenant/project/space/repository from explicit stable IDs or an exact configured URL. Zero matches and multiple matches are errors. Visible names alone are not identity. Never force login or broaden a target during resolution.

- [ ] **Step 3: Implement allowlist evaluation.**

  Check operation, target, field, transition direction, connector capability, and actor scope. Reject delete, permission-change, workflow-change, production mutation, raw transcript publication, and backward status transition requests before connector invocation.

- [ ] **Step 4: Implement bounded Continue.**

  Continue is valid only for a non-destructive allowlisted operation with verified target and authority. Persist the accepted-risk scope, compensating control, expiry, actor, and required read-back. Do not expose a global bypass flag.

- [ ] **Step 5: Run orchestrator tests.**

  Run `npm test -- --test-name-pattern="orchestrator"`. Expected: all hard-stop cases halt before any connector method is called; bounded Continue produces a single scoped decision object.

### Task 8: Implement connector contracts and local external-system fixtures

**Files:**
- Create: `src/connectors/types.ts`
- Create: `src/connectors/jira.ts`
- Create: `src/connectors/confluence.ts`
- Create: `src/connectors/github.ts`
- Create: `test/fixtures/connector-server.ts`
- Test: `test/connectors.test.ts`

**Interfaces:**
- Produces `JiraGateway`, `ConfluenceGateway`, and `GitHubGateway` interfaces consumed by Task 10.
- Produces `JiraGateway.applyProjection(intent: JiraProjectionIntent): Promise<ConnectorResult>`.
- Produces `JiraGateway.readBack(canonicalId: string): Promise<ReadBackState>`.
- Produces `ConfluenceGateway.applyProjection(intent: ConfluenceProjectionIntent): Promise<ConnectorResult>`.
- Produces `GitHubGateway.readEvidence(reference: GitHubReference): Promise<GitHubEvidence>`.

  Define `JiraProjectionIntent` with `canonicalId`, `workItemType`,
  `parentCanonicalId`, `fields`, `attachmentPaths`, and `requestedTransition`;
  `ConfluenceProjectionIntent` with `canonicalMilestoneId`, `spaceId`,
  `pageId`, `body`, and `attachmentPaths`; `ConnectorResult` with
  `state`, `externalId`, `correlationId`, and `readBackRequired`;
  `ReadBackState` with `target`, `canonicalId`, `externalId`, `fields`,
  `status`, `version`, and `observedAt`; and `GitHubEvidence` with repository,
  branch, pull request, check, review, deployment, and verification fields.

- [ ] **Step 1: Write connector contract tests against a real local HTTP server.**

  The fixture server must return success, `401`, `403`, `404`, `409`, `429`, timeout, partial completion, and stale read-back cases. Tests must assert request method, target path, allowlisted field body, correlation ID, and absence of credential values in logs.

- [ ] **Step 2: Define narrow gateway payloads.**

  Jira intents may create/reconcile the Milestone, Epic, Story/Task/Bug, attachment, named field, parent link, dependency link, flag/comment, and forward Board transition only. Confluence intents may create/reconcile the roadmap projection, versioned section, and Markdown attachment. GitHub is read-only in V1 for branch/PR/check/review/deployment evidence.

- [ ] **Step 3: Implement Jira projection and read-back.**

  Use native `fetch` with an injected base URL and credential provider. Resolve the project profile before writing. Send only declared fields, preserve external IDs, inspect response status/body metadata, and perform a read-back assertion against the expected canonical identity and state.

- [ ] **Step 4: Implement Confluence projection and read-back.**

  Create or version the roadmap projection under the allowlisted space, attach the generated Markdown, and assert page identity, version, artifact revision, and parent Milestone reference on read-back.

- [ ] **Step 5: Implement GitHub evidence reads.**

  Read the named repository's branch, pull request, check-run, review, and deployment evidence. Reject results from another repository or ambiguous PR mapping. Normalize evidence without treating GitHub as Jira lifecycle authority.

- [ ] **Step 6: Run connector tests.**

  Run `npm test -- --test-name-pattern="connectors"`. Expected: success responses are read-back verified; authorization, rate, timeout, partial, stale, and target-mismatch responses return typed failures without unsafe retries.

### Task 9: Implement the three native host adapters and conformance scenarios

**Files:**
- Create: `src/adapters/types.ts`
- Create: `src/adapters/codex.ts`
- Create: `src/adapters/claude-code.ts`
- Create: `src/adapters/cursor.ts`
- Modify: `contract/adapters/codex.md`, `contract/adapters/claude-code.md`, `contract/adapters/cursor.md`
- Test: `test/adapters.test.ts`
- Test: `test/conformance/host-conformance.test.ts`

**Interfaces:**
- Produces `HostAdapter.compile(contract: ContractDocument): NativeAdapterProjection`.
- Produces `HostAdapter.emitEvent(input: HostEventInput): CanonicalEvent`.
- Produces `HostAdapter.capabilityReport(): CapabilityReport`.

  Define `HostEventInput` with `host`, `eventType`, `artifactId`,
  `executionSetId`, `sourceRevision`, `actor`, and `evidenceRefs`. The
  `HostAdapter` interface must expose exactly `compile`, `emitEvent`, and
  `capabilityReport`; it must not expose a generic external write method.

- [ ] **Step 1: Define the host adapter contract.**

  Every adapter must report host name, version context, supported capabilities, limitations, source contract revision, and the native instruction/configuration projection location. The shared event output must use the same canonical `eventType`, `artifactId`, `executionSetId`, and evidence shapes.

- [ ] **Step 2: Implement Codex as the V1 live adapter.**

  Map the contract into Codex-scope instructions and the local event emission path. Require an explicit accepted Milestone/Execution Set context before emitting `implementation_started`; do not infer start from planning text or an unverified shell command.

- [ ] **Step 3: Implement Claude Code and Cursor as validation adapters.**

  Generate native-readable projections and conformance reports. Mark unsupported or unverified capabilities explicitly; do not perform live writes from these adapters in the first release.

- [ ] **Step 4: Add identical cross-host scenarios.**

  Run the same fixture through all adapters and compare canonical outputs for: valid finalized Milestone, child scope in To Do, verified implementation start, review failure to To Do, dependency flag, ambiguous target stop, and GitHub evidence read-back.

- [ ] **Step 5: Run adapter tests.**

  Run `npm test -- --test-name-pattern="adapter|conformance"`. Expected: host-specific projections differ only where declared, canonical lifecycle and stop semantics remain equivalent, and unsupported capabilities never become silently enabled.

### Task 10: Compose the orchestrator and expose safe CLI commands

**Files:**
- Modify: `src/orchestrator/sync.ts`
- Modify: `src/cli.ts`
- Test: `test/e2e.test.ts`

**Interfaces:**
- Produces `SyncOrchestrator.handle(event: CanonicalEvent, mode: "dry_run" | "sandbox"): Promise<SyncResult>`.
- CLI commands:
  - `node dist/cli.js validate --contract contract/team-contract.md`
  - `node dist/cli.js finalize --input test/fixtures/valid-milestone.md --dry-run`
  - `node dist/cli.js sync --event test/fixtures/events/implementation-started.json --dry-run`
  - `node dist/cli.js conformance`

- [ ] **Step 1: Write the failing vertical-slice test.**

  Feed a finalized Milestone with two Epics, committed Story/Task/Bug children, one Execution Set, and a verified GitHub PR evidence record through the orchestrator. Assert the ordered results: projection intents, child To Do, passed start check, In Progress transition, Review evidence, read-back, and audit records.

- [ ] **Step 2: Implement orchestration order.**

  `handle` must load the contract and project profile, validate the event, resolve identity, enforce the allowlist, append to the outbox, invoke the smallest connector operation, read back the expected state, mark the event applied, and emit a safe audit record. Connector writes are skipped in `dry_run` and represented as explicit planned operations.

- [ ] **Step 3: Implement partial-failure behavior.**

  On connector error, preserve the outbox event, return the typed failure and `SYNC STOP` where required, and leave external state untouched unless read-back proves the write completed. Never advance Jira status based on an unverified intended action.

- [ ] **Step 4: Implement CLI exit codes and redaction.**

  Use exit code `0` for verified success, `2` for validation/allowlist stop, `3` for unknown external completion, and `4` for configuration/credential errors. Console output may include target IDs and correlation IDs, but never tokens, passwords, authorization headers, or raw private transcripts.

- [ ] **Step 5: Run the vertical slice.**

  Run:

  ```powershell
  npm run lint
  npm test
  npm run cli -- validate --contract contract/team-contract.md
  npm run cli -- finalize --input test/fixtures/valid-milestone.md --dry-run
  npm run cli -- conformance
  ```

  Expected: all local tests pass, dry-run emits no network request, and conformance reports all three hosts as semantically comparable with declared limitations.

### Task 11: Normalize GitHub delivery evidence and authority-specific read-back

**Files:**
- Create: `src/evidence/github.ts`
- Create: `src/evidence/readback.ts`
- Test: `test/evidence.test.ts`
- Modify: `src/connectors/github.ts`

**Interfaces:**
- Produces `collectGitHubEvidence(input: GitHubEvidenceInput): Promise<CanonicalEvidence[]>`.
- Produces `assertAuthorityReadBack(input: AuthorityReadBackInput): ReadBackDecision`.

  Define `GitHubEvidenceInput` with the resolved repository, branch, pull
  request, required check names, review requirements, and base revision;
  `CanonicalEvidence` with `source`, `externalId`, `url`, `observedRevision`,
  `observedAt`, and `verificationState`; `AuthorityReadBackInput` with
  `authority`, `expected`, and `actual`; and `ReadBackDecision` with
  `verified: boolean`, `differences`, and `nextAction`.

- [ ] **Step 1: Write failing evidence tests.**

  Test a matching PR with green required checks and approved review, a stale PR against an old base revision, a failed check, an unmapped PR, and a PR from the wrong repository. Assert that only the matching repository and canonical work-item IDs produce accepted evidence.

- [ ] **Step 2: Normalize source evidence.**

  Convert branch, commit, PR, check, review, and deployment references into immutable `evidenceRefs` with source, external ID, URL, observed revision, timestamp, and verification state. Preserve the source authority; do not copy GitHub status into Jira without lifecycle policy approval.

- [ ] **Step 3: Implement read-back assertions.**

  Jira read-back verifies project, issue key, parent links, status, fields, and attachment revision. Confluence read-back verifies space, page identity, version, and artifact revision. GitHub read-back verifies repository, branch/PR linkage, checks, review, and base revision.

- [ ] **Step 4: Run evidence tests.**

  Run `npm test -- --test-name-pattern="evidence"`. Expected: stale, failed, wrong-target, and ambiguous evidence is retained as non-authoritative evidence or a stop, never as a false completion.

### Task 12: Add performance baseline, security review, and sandbox runbook

**Files:**
- Create: `test/performance/baseline.test.ts`
- Create: `docs/runbooks/sync-orchestrator-v1-sandbox.md`
- Create: `docs/runbooks/sync-orchestrator-v1-design-deviation.md` only when implementation evidence conflicts with the approved design; the deviation must record the evidence and stop implementation pending a new design decision
- Test: all existing tests plus the performance baseline

**Interfaces:**
- Produces a machine-readable local baseline for contract parse, validation, finalization, outbox append, dry-run orchestration, and fixture read-back.
- Produces an operator runbook that names the verification gates and recovery actions without exposing credentials.

- [ ] **Step 1: Write the baseline test.**

  Measure at least 30 local iterations for contract parse/validation and at least 10 dry-run orchestration iterations. Record median, p95, failure count, fixture response class, CPU time where available, and test environment. Do not assert a hard target before this baseline exists.

- [ ] **Step 2: Add security-path tests.**

  Assert redaction of authorization headers and credential-provider errors, rejection of untrusted target URLs, rejection of production targets in the V1 profile, rejection of delete/permission/workflow operations, and non-publication of raw transcript content.

- [ ] **Step 3: Write the sandbox runbook.**

  Document: local validation; exact tenant/project/space/repository resolution; read-only discovery; dry-run finalization; explicit sandbox allowlist; accepted-risk Continue format; expected read-back; outbox recovery; unknown-completion stop; rollback by correction rather than destructive deletion; and deactivation of the sandbox profile.

- [ ] **Step 4: Run the complete quality gate.**

  Run:

  ```powershell
  npm run lint
  npm test
  npm run cli -- validate --contract contract/team-contract.md
  npm run cli -- conformance
  ```

  Expected: all tests pass, the performance baseline is stored as evidence, the runbook contains no credentials, and the working tree contains only the planned files plus pre-existing user changes.

---

## Spec coverage and handoff

The task sequence covers the approved spec as follows:

- Sections 1–2: Tasks 1–4 preserve the common vocabulary, Milestone hierarchy, artifact boundary, and team contract.
- Sections 3–4: Tasks 1–3 and 9 implement the contract, compiler, and native adapters.
- Section 5: Task 5 implements Board statuses, backlog/planning dimensions, finalization, and verified implementation start.
- Section 6: Task 4 and the Execution Set fields in Tasks 2 and 10 implement Epic-scoped parallel execution and branch/worktree traceability.
- Sections 7–8: Tasks 6–8 and 10 implement events, outbox, allowlist, idempotency, recovery, connectors, and read-back.
- Section 9: Task 7 and Task 10 implement structured stop/Continue decisions.
- Sections 10–11: Tasks 9 and 12 implement cross-host conformance, baseline measurement, security paths, and sandbox rollout.
- Sections 12–15: Tasks 1, 4, 8–12 implement the Codex-first V1 boundary and preserve the explicit exclusions.

Before implementation starts, inspect the current Git status again and work in an isolated worktree created with the `superpowers:using-git-worktrees` skill. Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` for execution, with a review gate after each task. Live connector activation requires a separately verified sandbox target and explicit operation-level approval at the point of write.

# Agent Role Formation Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the 70 global Codex Agent definitions, map them to explicit project Roles, extend the host-agnostic Formation contract with many-to-many Agent–Role bindings, project a read-only coverage report, and validate clean context and handoff boundaries.

**Architecture:** The global `C:\Users\littl\.codex\agents\*.toml` files remain the source of Agent identity and instructions. The repository adds a host-agnostic Role catalog and a runtime read-only inventory/projection layer that joins stable Agent IDs to Role assignments and Formation bindings. A Role may have one lead plus contributors/reviewers, and one Agent may hold multiple Roles only through unique role-scoped context keys; no transcript or prompt content is copied into the repository projection.

**Tech Stack:** TypeScript ESM, Node.js `fs/promises` and `crypto`, YAML frontmatter via the existing `yaml` dependency, Node test runner, Markdown contracts, and the existing CLI dispatch.

## Global Constraints

- Preserve the repository's local-only and recommendation-only boundary; no host activation, connector call, external write, Git publication, UA sync, or Graphify sync.
- Read the global Agent directory only; never modify, move, or copy global Agent TOML files.
- Store only normalized metadata, stable source paths, SHA-256 hashes, Role bindings, context contracts, and handoff contracts; do not store full `developer_instructions` text.
- Keep `main` as the verified implementation base; leave changes uncommitted for review.
- Keep every material status, conflict, unknown, missing mapping, and source mismatch explicit.
- Do not add a dependency; use the existing `yaml` package and Node built-ins.
- Every behavior change follows RED → GREEN → REFACTOR with a focused test run before broader validation.

---

### Task 1: Read-only global Agent inventory normalizer

**Files:**
- Create: `src/controller/agent-inventory.ts`
- Test: `test/controller-agent-inventory.test.ts`
- Test fixtures: `test/fixtures/agents/valid-agent.toml`, `test/fixtures/agents/second-agent.toml`, `test/fixtures/agents/duplicate-name.toml`, `test/fixtures/agents/malformed-agent.toml`

**Interfaces:**
- `loadAgentInventory(sourceDirectory: string): Promise<AgentInventory>` reads sorted `.toml` files, computes SHA-256 hashes, extracts only the first-level `name` and `description` assignments, and never writes.
- `parseAgentDefinition(source: string, sourcePath: string, sourceSha256: string): AgentDefinition` validates one source file and derives a stable `agentId` from the filename without `.toml`.
- `AgentInventoryError` reports the exact source path and rejected field without echoing `developer_instructions`.
- `AgentInventory` returns `sourceDirectory`, `sourceKind: "CODEX_GLOBAL_TOML"`, `agentCount`, and sorted `agents`.

- [x] **Step 1: Write failing inventory tests** for valid metadata, ordering, hashes, malformed metadata, duplicates, and empty directories.
- [x] **Step 2: Run the focused test** and preserve the expected missing-module RED evidence.
- [x] **Step 3: Implement the minimal parser and loader** with explicit errors, sorted directory reads, and SHA-256 hashing.
- [x] **Step 4: Run the focused inventory tests** and confirm all positive and negative cases pass.
- [x] **Step 5: Run an actual read-only inventory against `C:\Users\littl\.codex\agents`**; verified `agentCount` is `70` and no source files are changed.

**Acceptance:** All 70 current global Agent TOMLs normalize deterministically with stable IDs, names, descriptions, and hashes; malformed or incomplete sources stop with actionable errors; no prompt body is persisted or printed.

### Task 2: Role catalog and Agent–Role coverage analysis

**Files:**
- Create: `contract/agent-library/role-catalog.md`
- Create: `src/controller/agent-role.ts`
- Test: `test/controller-agent-role.test.ts`

**Interfaces:**
- `loadRoleCatalog(sourcePath: string): Promise<RoleCatalog>` and `parseRoleCatalog(source: string, sourcePath: string): RoleCatalog` validate strict YAML frontmatter.
- `RoleDefinition` contains `roleId`, `displayName`, `purpose`, `requiredCapabilities`, `contextContract`, and `handoffContract`.
- `RoleAssignment` contains `roleId`, `agentId`, `mode: "lead" | "contributor" | "reviewer" | "fallback"`, `contextKey`, and `writeScope: "NONE" | "ROLE_ARTIFACT"`.
- `analyzeAgentRoleCoverage(inventory: AgentInventory, catalog: RoleCatalog): AgentRoleCoverageReport` reports `READY` or `NOT_READY`, role coverage, multi-Role Agents, unassigned Agents, missing Agent IDs, unknown Roles, duplicate assignments, lead conflicts, context violations, and handoff violations.
- The catalog defines the project Roles `project-systems-architect`, `documentation-business-analysis`, `product-market-owner`, `delivery-technical-lead`, `personal-operations-rule-auditor`, `reality-quality-gate`, and `on-demand-domain-specialist`.

- [x] **Step 1: Write failing parser and coverage tests** for valid Roles, multi-Role reuse, unknown references, duplicates, lead conflicts, and uncovered Roles.
- [x] **Step 2: Run the focused Role tests** and preserve the expected missing-module RED evidence.
- [x] **Step 3: Add the strict Role catalog contract** with explicit context and handoff fields for every Role.
- [x] **Step 4: Implement parser and coverage analysis** with deterministic sorting and explicit findings instead of silent filtering.
- [x] **Step 5: Run the focused Role tests** and confirm the many-to-many and conflict cases pass.

**Acceptance:** The Role catalog is reviewable, every intended project Role has an outcome and stop conditions, the coverage report distinguishes valid multi-Role reuse from conflicts, and all missing/unassigned/conflicting entries remain visible.

### Task 3: Extend the Formation contract with many-to-many bindings

**Files:**
- Modify: `src/controller/types.ts`
- Modify: `src/controller/formation.ts`
- Modify: `contract/agent-library/formation-catalog.md`
- Test: `test/controller-formation.test.ts`

**Interfaces:**
- Add `FormationAgentBinding` with `roleId`, `agentId`, `mode`, and `contextKey`.
- Add `agentBindings: readonly FormationAgentBinding[]` to `FormationEntry` and require it in every catalog entry.
- Validate non-empty IDs, supported modes, unique `(roleId, agentId, contextKey)` tuples, and unique context keys per Agent within one Formation.
- Keep existing Formation scenario, authority, execution boundary, and identity semantics unchanged.

- [x] **Step 1: Write failing Formation tests** for multi-Agent bindings, distinct contexts, duplicate tuples, and cross-Role collisions.
- [x] **Step 2: Run the focused Formation tests** and preserve the missing-field RED evidence.
- [x] **Step 3: Implement types/parser validation** and add explicit `agentBindings` to all existing Formation entries with real Agent IDs.
- [x] **Step 4: Run the Formation parser tests**; existing formation identity semantics remain unchanged.

**Acceptance:** The Formation contract natively represents one-to-many and many-to-many Agent–Role assignments while preserving all existing bounded formation behavior.

### Task 4: Read-only Formation projection and inspection CLI

**Files:**
- Modify: `src/controller/agent-role.ts`
- Modify: `src/cli.ts`
- Modify: `README.md`
- Modify: `docs/project/documentation-map.md`
- Test: `test/controller-agent-library-cli.test.ts`

**Interfaces:**
- `projectFormation(inventory: AgentInventory, catalog: RoleCatalog, formation: FormationEntry): FormationProjection` joins source-backed Agents, Role assignments, and Formation bindings without writing.
- `inspect-agent-library --source-dir <path> --role-catalog <path> --formation-catalog <path>` emits one JSON report containing inventory, coverage, projection, and validation results.
- The CLI returns `0` only for a fully valid local projection, `2` for a valid but incomplete/unknown projection, `3` for source/catalog validation failure, and `4` for argument errors.
- Output contains source paths and hashes but excludes prompt bodies and secret-like values.

- [x] **Step 1: Write failing CLI tests** for exact argument validation, valid fixture projection, and missing source directory.
- [x] **Step 2: Run the focused CLI tests** and preserve the unavailable-command RED evidence.
- [x] **Step 3: Implement projection and CLI dispatch** with explicit error-code mapping and stable JSON field ordering.
- [x] **Step 4: Run focused CLI tests**; fixture projection passes with source-backed bindings.
- [x] **Step 5: Run the CLI against the real 70-Agent directory**; verified READY coverage and projection with terminal-only evidence.

**Acceptance:** A fresh operator can run one read-only command and receive a deterministic, source-backed inventory, Role coverage matrix, Formation projection, and validation verdict.

### Task 5: Context boundaries and handoff contract validation

**Files:**
- Modify: `src/controller/agent-role.ts`
- Modify: `contract/agent-library/role-catalog.md`
- Modify: `docs/operations/agent-operating-model.md`
- Test: `test/controller-agent-role.test.ts`

**Interfaces:**
- Every Role declares the five context layers `IDENTITY`, `ROLE`, `TASK`, `EVIDENCE`, and `HANDOFF`, plus isolated context behavior and shared artifact names.
- Every Role declares a handoff producer, accepted input shape, required evidence, and stop conditions.
- Validation rejects missing layers, empty handoff payloads, missing handoff consumers, duplicate context keys across Role assignments for the same Agent, multiple synthesis owners, and shared write scope without a declared artifact owner.
- Multi-Agent Role projection requires exactly one `lead` or one explicit `synthesisOwner`; contributors and reviewers remain read-only unless the Role explicitly permits a Role artifact owner.

- [x] **Step 1: Add failing boundary tests** for missing context layer, duplicate cross-Role context, multiple leads, and shared write ownership.
- [x] **Step 2: Run the focused boundary tests** and confirm each fails for the intended validation reason.
- [x] **Step 3: Implement the boundary validators** and add the operating-model clean-packet rule.
- [x] **Step 4: Run the focused boundary tests** and confirm valid role reuse and multi-Agent collaboration remain accepted.

**Acceptance:** The same Agent can safely serve multiple Roles, several Agents can jointly fulfill one Role, and the validator prevents hidden context contamination, ambiguous ownership, and unsafe shared writes.

### Task 6: Negative-path suite and full verification gate

**Files:**
- Modify: `test/controller-agent-inventory.test.ts`
- Modify: `test/controller-agent-role.test.ts`
- Modify: `test/controller-formation.test.ts`
- Modify: `test/controller-agent-library-cli.test.ts`
- Modify: `docs/superpowers/plans/2026-08-04-agent-role-formation-coverage.md`

**Interfaces:**
- Negative tests cover malformed metadata, duplicate IDs/names, unknown Agent/Role references, duplicate bindings, context collisions, missing leads, missing handoff contracts, unreadable paths, invalid CLI argument order, secret-like prompt exclusion, and incomplete projection status.
- The final verification sequence is `npm run build`, `npm run lint`, focused controller tests, `npm test`, `npm run check:docs`, and `git diff --check`.

- [x] **Step 1: Run each negative test in isolation** and preserve the expected RED/GREEN evidence.
- [x] **Step 2: Fix only in-scope bugs revealed by the tests** and keep the change bounded.
- [x] **Step 3: Run the full repository gate**; build, lint, docs, and 357/357 tests passed with exit code 0.
- [x] **Step 4: Review the final diff** for generated noise, prompt/secrets leakage, unrelated changes, and missing six-task coverage.
- [x] **Step 5: Re-run the work-state preflight**; the isolated worktree remains dirty for review, with no commit/push/UA/Graphify operation.

**Acceptance:** All six requested task areas are implemented and evidenced; the full local gate passes; the real 70-Agent inventory is read successfully; all unresolved coverage or source issues are explicit; the work remains uncommitted and local-only.

---

## Ready-for-work gate

- [x] Current repository, branch, `HEAD`, worktree, upstream, and PR state verified immediately before edits.
- [x] Global Agent source is read-only and exact path is explicit.
- [x] Role and Formation contracts have stable IDs, explicit context layers, handoff schemas, and stop conditions.
- [x] Many-to-many semantics are tested before implementation.
- [x] CLI/report is read-only and secret-free.
- [x] Negative paths and full verification commands are named.
- [x] No UA/Graphify synchronization is in scope.

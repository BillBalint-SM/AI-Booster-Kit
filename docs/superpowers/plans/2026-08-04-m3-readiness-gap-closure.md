# M3 Readiness-Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the proven M3 contract, resume-integrity, team-handoff, and documentation gaps without falsely promoting host execution, GitHub permissions, or external synchronization to READY.

**Architecture:** Keep M3 local and deterministic. The context bundle becomes the validated unit: one Milestone plus every linked Epic, with one selected Epic as the developer execution scope. Add a pure local team-delivery handoff validator and an explicit canonical Milestone-artifact identity mapping. Do not add host execution, connector calls, Git operations, PR enforcement, or a shared service.

**Tech Stack:** TypeScript, Node.js `>=22 <23`, Node test runner, YAML/Markdown contracts, existing `npm` scripts, Graphify code-only output, Understand Anything deterministic local output.

## Global Constraints

- Preserve the current three-level branch model; work only on the verified `dev-m3-session-context-review` slice until a later delivery decision.
- Do not create a commit, push, PR, merge, rebase, or external write without separate explicit approval.
- Do not claim that a local Team file enforces GitHub/PR owner approval; it only records the required authority.
- Do not activate a host or add a semantic-extraction backend; Graphify remains code-only and UA remains deterministic/local.
- A `READY` claim must name its scope. `MAPPER_FRESHNESS=READY` is a snapshot gate, not product or runtime readiness.
- Existing user changes are preserved; no reset, clean, checkout, deletion, or broad refactor is allowed.

## Acceptance Criteria

1. Resume validates the complete Milestone bundle before selecting a developer Epic; missing, duplicate, foreign, stale, or malformed linked Epics stop safely.
2. The Milestone context has an explicit `canonicalArtifactId` mapping to the existing `CanonicalWorkArtifact.artifactId`; mismatched artifact or Milestone identity is rejected.
3. Two independent Epic lanes can produce validated handoff packets with shared source revision, explicit integration/review owners, DoD, rollback, conflicts, and next action; invalid fan-in stops.
4. The local saver remains repository-relative and fail-closed for path/content conflicts, while documentation and result wording no longer imply PR or permission enforcement.
5. M3 tests cover positive resume, missing sibling Epic, duplicate/foreign Epic, stale Milestone stopping every lane, identity mismatch, handoff conflict, and rollback-required fan-in.
6. Roadmap/current-state/capability wording is accurate: no broad READY promotion, no stale `304/304`, no mapper-readiness ambiguity, and no claim of host execution or PR enforcement.
7. Build, lint, tests, docs, and diff checks pass locally. Node 22 remains a required CI/release gate because the current machine exposes Node 26.4.0 only.
8. After an explicitly approved stable commit, Graphify → UA → `npm run check:mappers` is rerun against that same source revision.

## Ordered Work Chain

### Task 0: Reconfirm baseline and freeze the evidence boundary

**Files:**
- Read: `docs/project/current-state.md`
- Read: `docs/project/roadmap.md`
- Read: `contract/capability-matrix.md`
- Read: `docs/runbooks/mapper-snapshot.md`

- [x] **Step 1: Record the machine-verified baseline**

Run from the active checkout:

```powershell
& C:\Users\littl\.agents\tools\work-state-preflight.ps1 -RepositoryPath (Get-Location).Path -OutputFormat Markdown
```

Expected baseline: clean `dev-m3-session-context-review`, HEAD `d69c21a19d4f69cb49daa7266e42e73ebdc1ab3b`, no upstream, no PR, local+remote evidence.

- [x] **Step 2: Preserve the status boundary**

Treat the following as historical/confirmed evidence, not implementation authorization: local `318/318` under Node 26.4.0, `npm run check:mappers` `READY`, and the four read-only global-agent audits. No host, connector, GitHub, or PR execution is part of this package.

### Task 1: Make the M3 context bundle the validated resume unit

**Files:**
- Modify: `src/context/resume.ts:5-68`
- Modify: `src/cli.ts:379-393`
- Test: `test/session-state.test.ts:58-110`
- Test: `test/e2e.test.ts:302-324`
- Test: `test/context-validation.test.ts:80-94`

**Interfaces:**
- Consumes: `MilestoneContext`, `EpicContext`, `SessionState`, `WorkContext`, and existing `validateMilestoneContext`.
- Produces: resume evaluation that rejects an incomplete Milestone bundle before developer-scope evaluation.

- [x] **Step 1: Add failing bundle-integrity tests**

Add tests that call `evaluateSessionResume` with:

```ts
evaluateSessionResume(developerA, [m3Milestone, epicA], runtime);
evaluateSessionResume(developerA, [m3Milestone, epicA, { ...epicA }], runtime);
evaluateSessionResume(developerA, [m3Milestone, { ...epicA, epicId: "foreign-epic" }], runtime);
```

Each case must return `STOPPED` with preserved state. Keep the existing two-Epic positive and changed-Milestone tests as the positive gate.

- [x] **Step 2: Run the focused test before implementation**

Run:

```powershell
npm run build
node --test dist/test/session-state.test.js dist/test/e2e.test.js dist/test/context-validation.test.js
```

Expected: the new incomplete-bundle assertions fail before the implementation changes.

- [x] **Step 3: Validate the full bundle in the resume path**

Update `evaluateSessionResume` so it resolves one current Milestone and all supplied Epic contexts, calls `validateMilestoneContext(milestone, epics)`, and converts `ContextError` into a preserved `STOPPED` result. Only after that validation may it select the session’s one Epic.

Update `loadManifestContexts`/manifest validation so a developer resume supplies the complete set of Milestone-linked Epic paths. Do not silently discard sibling Epics.

- [x] **Step 4: Run the focused test after implementation**

Run the same focused command. Expected: all positive, missing, duplicate, foreign, stale, and malformed bundle tests pass.

### Task 2: Add explicit canonical Milestone-artifact identity

**Files:**
- Modify: `src/context/types.ts:13-37`
- Modify: `src/context/markdown.ts:1-90`
- Modify: `src/context/validation.ts:7-37,93-110`
- Create: `src/context/identity.ts`
- Modify: `test/context-markdown.test.ts`
- Modify: `test/context-validation.test.ts`
- Modify: `test/session-state.test.ts`
- Modify: `test/e2e.test.ts`

**Interfaces:**
- Consumes: `MilestoneContext` and `CanonicalWorkArtifact`.
- Produces: `validateCanonicalMilestoneArtifact(context: MilestoneContext, artifact: CanonicalWorkArtifact): void`.

- [x] **Step 1: Add failing identity tests**

Require a `canonicalArtifactId` on `MilestoneContext` and assert that:

```ts
validateCanonicalMilestoneArtifact(milestone, artifact); // valid
validateCanonicalMilestoneArtifact({ ...milestone, canonicalArtifactId: "other" }, artifact); // throws
validateCanonicalMilestoneArtifact({ ...milestone, milestoneId: "other" }, artifact); // throws
```

The validator must compare `canonicalArtifactId` to `artifact.artifactId` and `milestoneId` to `artifact.milestoneId`. It must not perform I/O or GitHub/API lookups.

- [x] **Step 2: Add the closed Markdown field**

Add `canonicalArtifactId` to the Milestone context schema, parser, serializer, exact-key checks, and fixtures. Keep Epic contexts unchanged except for the already existing `milestoneId` parent link.

- [x] **Step 3: Implement the pure identity validator**

Create `src/context/identity.ts` with the exact exported function above. Throw `ContextError` with actionable mismatch text; do not accept empty or whitespace-only identifiers.

- [x] **Step 4: Run context tests and verify deterministic round-trip**

Run:

```powershell
npm run build
node --test dist/test/context-markdown.test.js dist/test/context-validation.test.js dist/test/session-state.test.js dist/test/e2e.test.js
```

Expected: Markdown round-trip remains byte-stable for normalized output and all identity mismatch cases stop.

### Task 3: Turn the Team Delivery Loop handoff/fan-in prose into a local contract

**Files:**
- Create: `src/context/team-delivery.ts`
- Create: `test/team-delivery.test.ts`
- Read/modify: `workflows/team-delivery-loop.md:82-128`

**Interfaces:**
- Consumes: validated Milestone/Epic bundle and `sourceRevision`.
- Produces:

```ts
export type HandoffStatus = "READY_FOR_FAN_IN" | "BLOCKED" | "STOPPED";

export interface ParallelizationContract {
  milestoneId: string;
  sourceRevision: string;
  integrationOwner: string;
  reviewOwner: string;
  integrationDoD: readonly string[];
  rollbackPlan: readonly string[];
  epicIds: readonly string[];
}

export interface HandoffPacket {
  epicId: string;
  sourceRevision: string;
  owner: string;
  status: HandoffStatus;
  deliveredOutput: readonly string[];
  acceptanceResults: readonly string[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  conflicts: readonly string[];
  nextAction: string;
}

export function validateTeamDeliveryFanIn(
  contract: ParallelizationContract,
  packets: readonly HandoffPacket[],
  milestone: MilestoneContext,
  epics: readonly EpicContext[],
): void;
```

- [x] **Step 1: Add failing fan-in contract tests**

Cover one packet per linked Epic, duplicate packet, foreign Epic, source-revision mismatch, missing integration owner/review owner, missing DoD/rollback, unresolved conflict, and successful two-Epic fan-in.

- [x] **Step 2: Implement pure structural validation**

Reject incomplete or contradictory fan-in with `ContextError`. The validator must not merge branches, alter files, call a host, or infer that a PR was approved. A `BLOCKED` or `STOPPED` packet cannot produce a successful fan-in result.

- [x] **Step 3: Align the workflow specification with the implementation**

Document the exact packet fields, observable statuses, conflict stop, rollback requirement, and the boundary that integration acceptance remains human-owned.

- [x] **Step 4: Run the focused team-delivery test**

Run:

```powershell
npm run build
node --test dist/test/team-delivery.test.js dist/test/session-state.test.js dist/test/e2e.test.js
```

Expected: the two-Epic success path and every invalid fan-in path pass.

### Task 4: Correct the authority and persistence claim without faking Git/PR enforcement

**Files:**
- Modify: `src/context/storage.ts:9-55` only if result wording needs an explicit local-boundary field
- Modify: `test/context-storage-cli.test.ts`
- Modify: `docs/superpowers/specs/2026-08-02-ai-booster-kit-m2-m3-activation-session-design.md:91-110`
- Modify: `docs/project/current-state.md:27-65`
- Modify: `docs/project/roadmap.md:96-110`

- [x] **Step 1: Add a negative boundary test**

Prove that Team persistence remains repository-relative, rejects traversal, rejects symlink/absolute targets, and detects content conflict. Do not add a caller-supplied approval token that would pretend to verify GitHub or PR state.

- [x] **Step 2: Make the wording exact**

Replace claims that M3 “enforces owner-approved PR writes” with: M3 declares `ARTIFACT_OWNER_THROUGH_APPROVED_PR` as the required authority and preserves the repository-relative local artifact boundary; Git/PR approval is not locally verified or enforced.

- [x] **Step 3: Re-run storage and CLI checks**

Run:

```powershell
npm run build
node --test dist/test/context-storage-cli.test.js dist/test/context-markdown.test.js
```

Expected: local persistence remains safe and deterministic, while no test claims external authority verification.

### Task 5: Normalize roadmap, capability, and stale evidence wording

**Files:**
- Modify: `docs/project/roadmap.md:76-110,302-365`
- Modify: `docs/project/current-state.md:27-77`
- Modify: `contract/capability-matrix.md:9-19`
- Modify: `README.md:52-55`
- Modify: `docs/superpowers/plans/2026-08-03-ai-booster-kit-m3-session-context.md:24-30`
- Modify: `docs/superpowers/specs/2026-08-01-ai-booster-kit-quick-task-activation-package-design.md:1-105` only where implementation status is stale

- [x] **Step 1: Add explicit readiness scope wording**

Keep M2/M3 `COMPLETE_WITH_LIMIT` at broad capability level. State bounded scopes explicitly: local contract, recommendation-only, package preparation, repository-file persistence, and pure resume. Do not promote host runtime or shared-service behavior.

- [x] **Step 2: Correct stale evidence**

Remove the roadmap’s `304/304` as current proof; point to current-state for the current full-suite count. Describe mapper `READY` as same-source-revision freshness only. Update capability matrix rows so local declarative projection/conformance is `supported_with_limits` while native host behavior remains `unknown` until separately proven.

- [x] **Step 3: Define the ordered next milestones**

Add the following sequence without claiming execution:

1. M3-A: context-bundle and resume integrity.
2. M3-B: canonical identity and team handoff/fan-in evidence.
3. M3-C: declared-runtime verification and readiness review.
4. M4-H: Codex-first host activation/execution, then Claude Code, then Cursor.
5. Evaluation/evolve, debugging injection, and lifecycle synchronization afterward.

### Task 6: Execute quality gates and refresh derived mappings only after a stable revision

**Files:**
- Read/verify: `package.json`, `.github/workflows/ci.yml`
- Generated outputs: `graphify-out/`, `.ua/` only after stable source revision and explicit mapping gate authorization

- [x] **Step 1: Run local implementation gates**

Run:

```powershell
npm run build
npm run lint
npm test
npm run check:docs
git diff --check
```

Expected: all pass under the available local Node 26.4.0 runtime; record that this is not Node 22 proof.

- [x] **Step 2: Review the final diff and scope**

Confirm only M3 contract, context, handoff, tests, and truthfulness documentation changed. Confirm no host adapter execution, external connector, Git operation, secret, generated noise, or permission claim was added.

- [ ] **Step 3: Obtain explicit commit approval**

Do not commit or push as part of this plan until the user approves the reviewed implementation and the current preflight is refreshed.

- [ ] **Step 4: After stable commit, refresh the mapping gate**

Run Graphify code-only first, then deterministic UA against the same source revision, then:

```powershell
npm run check:mappers
```

Expected: Graphify and UA source revisions match, `MAPPER_FRESHNESS=READY`, and the result is recorded as a navigation projection only.

## Explicitly Out of Scope

- Native Codex/Claude Code/Cursor execution or credential/backend activation.
- Git branch creation, commit, push, PR creation, merge, or automatic Git operations.
- Real GitHub/PR approval enforcement or shared external artifact service.
- Evaluation/evolve, debugging context injection, Jira–GitHub–Confluence synchronization.
- Broad `READY` promotion based only on local tests, documentation, or mapper freshness.

## Plan Self-Review

- The package closes the two concrete M3 integrity gaps first: incomplete bundle validation and disconnected canonical identity.
- Existing two-Epic/stale-Milestone e2e evidence is retained and expanded rather than duplicated blindly.
- Team fan-in becomes a pure local contract; no external authority is fabricated.
- Node 22, publication, and mapper freshness remain separate gates.
- Every implementation task has a focused test command before the full-suite gate.

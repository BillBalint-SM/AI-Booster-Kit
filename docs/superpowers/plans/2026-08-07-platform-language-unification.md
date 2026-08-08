# Platform Language Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved Platform Language the single active vocabulary for documentation, contracts, runtime types, validation, and tests without changing historical facts or performing an external write.

**Architecture:** Deliver the work in two reviewable slices. Slice 1 introduces `docs/project/platform-language.md`, a deterministic terminology gate, and direct active documentation references while retaining explicit, test-covered runtime exceptions. Slice 2 replaces runtime terminology with concrete Specification, Feature-refinement, status-axis, and optional Jira-projection types, then removes every exception.

**Tech Stack:** TypeScript 5.9, Node.js 26, Node test runner, AJV 8, YAML 2, Markdown, npm scripts.

## Global Constraints

- The canonical source is English-only: `docs/project/platform-language.md`.
- `Vision -> Roadmap -> Milestone -> Epic -> Work Item`; a Work Item is `Story`, `Task`, or `Bug`.
- A Feature is an Epic's functional value, not a hierarchy level. Each Epic has one primary Feature; every additional Feature has an explicit reason.
- Handoff is the umbrella name for `Milestone_Specification`, `Epic_Specification`, `Feature_Specification`, `Story_Specification`, `Task_Specification`, and `Bug_Specification`.
- Do not create a generic polymorphic runtime `WorkArtifact` merely because Work Artifact is a group term.
- All internal lifecycle values are named axes. Use `DONE` only on the applicable Platform axis; `Done` is allowed only as an explicit `jira_board_status` mapping value.
- `SCOPE_CHANGED` requires a recorded scope-change decision; preserve the previous revision and require re-evaluation of the changed boundary.
- An absent primary Feature or an additional Feature without a reason requires a Feature refinement session. The runtime must not invent either value.
- An Epic remains `NOT_STARTED` before work begins; a started Epic without a successful current Specification is `UNDER_SPECIFICATION`.
- Jira projection is optional and fail-closed. This work performs no Jira, GitHub, Confluence, filesystem-external, or other external write.
- Preserve historical wording and facts under `docs/history/`; repair structural links only. Do not retrofit historical files solely for metadata.
- Canonical, generated, and machine-checked Markdown has `document_type`, `status`, and `language_version: 1.0.0` frontmatter. Generated documents additionally have `generated_from`, `source_revision`, and `generated_at`.
- Keep the current two untracked review artifacts until their contents have been transferred: `docs/project/terminology-normalization-table.md` and `docs/superpowers/specs/2026-08-07-platform-language-unification-design.md`.
- Do not commit, push, create a PR, merge, or delete an unapproved user artifact without a separate explicit user approval.

---

## File structure and ownership

| Path | Responsibility |
| --- | --- |
| `docs/project/platform-language.md` | Canonical English definitions and machine-readable terminology policy. |
| `scripts/check-terminology.mjs` | Deterministic active-corpus, metadata, reference, and deprecated-term gate. |
| `test/terminology-gate.test.ts` | Positive and negative fixture-level coverage for the gate. |
| `src/domain/model.ts`, `src/domain/schema.ts`, `src/domain/validate.ts` | Concrete Platform domain types and AJV schemas. |
| `src/domain/feature-refinement.ts` | Pure Feature completeness assessment and required refinement result. |
| `src/planning/finalize.ts`, `src/planning/traceability.ts` | Finalization and hierarchy rules using Specifications, Feature evidence, and Platform delivery status. |
| `src/context/*.ts` | Revision, session, readiness, resolution, and fan-in state using named axes. |
| `src/lifecycle/*.ts`, `src/connectors/jira.ts`, `src/orchestrator/allowlist.ts` | Optional, profile-driven Jira native-status projection; no core lifecycle ownership. |
| `contract/`, `workflows/`, `docs/operations/`, `docs/runbooks/`, `docs/planning/`, `marketing/`, `website/` | Active projections that directly cite the canonical source instead of duplicating competing vocabulary. |
| `test/` and `test/fixtures/` | Runtime, contract, documentation, and negative-path evidence. |

## Slice 1 — Language Foundation

### Task 1: Add the canonical language source and executable policy

**Files:**
- Create: `docs/project/platform-language.md`
- Create: `scripts/check-terminology.mjs`
- Create: `test/terminology-gate.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: YAML frontmatter from `docs/project/platform-language.md`.
- Produces: `npm run check:terminology`, exit code `0` on compliance and `1` with one actionable error per violation.

- [ ] **Step 1: Write the failing terminology-gate tests.**

```ts
test("terminology gate accepts declared Platform language and a native Jira mapping", async () => {
  const result = await runGate(fixtureRoot("valid"));
  assert.equal(result.exitCode, 0, result.stderr);
});

test("terminology gate rejects a deprecated active term and an unqualified status", async () => {
  const result = await runGate(fixtureRoot("deprecated"));
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /CanonicalWorkArtifact/);
  assert.match(result.stderr, /bare internal status 'Done'/);
});

test("terminology gate rejects missing generated provenance and a missing direct reference", async () => {
  const result = await runGate(fixtureRoot("invalid-metadata"));
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /generated_at/);
  assert.match(result.stderr, /platform-language\.md/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the executable does not exist.**

Run: `npm run build; node --test dist/test/terminology-gate.test.js`

Expected: `FAIL` with the missing `scripts/check-terminology.mjs` gate or its expected output.

- [ ] **Step 3: Create the canonical policy source.**

```yaml
---
document_type: platform_language
status: ACTIVE
language_version: 1.0.0
active_roots:
  - README.md
  - contract
  - workflows
  - docs/operations
  - docs/project
  - docs/runbooks
  - docs/planning
  - marketing
  - website
  - skills
deprecated_active_terms:
  - CanonicalWorkArtifact
  - canonicalWorkArtifact
  - BoardStatus
  - boardStatus
  - HandoffPacket
  - SCOPE_CHANGE
legacy_exception_paths:
  - src
  - test
required_direct_references:
  - README.md
  - docs/project/documentation-map.md
generated_required_fields:
  - generated_from
  - source_revision
  - generated_at
---
```

Below the frontmatter, define the hierarchy, Feature rules, six Specification/Handoff names, Work Artifact grouping, all eight status axes and values, `SCOPE_CHANGED`, revision preservation, optional Jira mapping, and the no-generic-WorkArtifact runtime boundary exactly as approved.

- [ ] **Step 4: Implement the deterministic gate.**

```js
const deprecatedTerms = policy.deprecated_active_terms;
const excludedRoots = new Set(["docs/history", "node_modules", "dist", ".git"]);

for (const path of collectMarkdownFiles(repositoryRoot, policy.active_roots, excludedRoots)) {
  const document = parseFrontmatter(await readFile(path, "utf8"), path);
  assertLanguageMetadata(document, path, policy);
  assertNoDeprecatedActiveTerms(document.body, path, deprecatedTerms, policy.legacy_exception_paths);
  assertNamedStatusAxes(document.body, path, policy);
}
assertDirectReferences(repositoryRoot, policy.required_direct_references);
```

The implementation must accept `--root <path>` for isolated tests, sort file paths and errors for deterministic output, permit `Done` only inside a declared `jira_board_status` mapping, and report `<relative-path>: <rule>: <detail>`. It must not mutate a document.

- [ ] **Step 5: Register the gate.**

```json
"check:terminology": "node scripts/check-terminology.mjs"
```

- [ ] **Step 6: Run the focused tests and the repository gate.**

Run: `npm run build; node --test dist/test/terminology-gate.test.js; npm run check:terminology`

Expected: all three commands pass after the active corpus has been normalized in Tasks 2–3; before then, preserve the reported violations as the migration checklist rather than adding broad ignores.

### Task 2: Normalize canonical navigation, contracts, workflow, and artifact templates

**Files:**
- Modify: `README.md`
- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/roadmap.md`
- Modify: `workflows/team-delivery-loop.md`
- Modify: `contract/team-contract.md`
- Modify: `contract/lifecycle.md`
- Delete: `contract/artifacts/canonical-work-artifact-template.md`
- Modify: `contract/artifacts/milestone-template.md`
- Modify: `contract/artifacts/epic-template.md`
- Modify: `contract/artifacts/work-item-template.md`
- Modify: `contract/artifacts/review-template.md`
- Modify: `contract/mappings/jira-confluence-github.md`
- Modify: `contract/adapters/codex.md`
- Modify: `contract/adapters/claude-code.md`
- Modify: `contract/adapters/cursor.md`

**Interfaces:**
- Consumes: the Platform Language policy from Task 1.
- Produces: direct links to `docs/project/platform-language.md`; native Jira labels only inside mapping examples.

- [ ] **Step 1: Add failing direct-reference assertions.**

```ts
assert.match(await readFile(resolve("README.md"), "utf8"), /platform-language\.md/);
assert.match(await readFile(resolve("docs/project/documentation-map.md"), "utf8"), /Platform Language/);
assert.doesNotMatch(activeContractText, /\bCanonicalWorkArtifact\b|\bBoardStatus\b|\bHandoffPacket\b|\bSCOPE_CHANGE\b/);
```

- [ ] **Step 2: Replace competing hierarchy and lifecycle prose with a concise direct reference.**

Use this exact explanatory boundary wherever a summary is needed:

```md
Terminology and status-axis definitions are governed by the [Platform Language](../docs/project/platform-language.md).
Jira labels are optional `jira_board_status` projection values; they are not Platform delivery lifecycle values.
```

Adjust the relative target per file. In `contract/lifecycle.md`, replace the fixed seven-label lifecycle with Platform delivery completion rules and a declared profile mapping example containing `DONE: Done`.

- [ ] **Step 3: Rename the artifact templates and their public language.**

Create `contract/artifacts/milestone-specification-template.md` from the substantive content of `canonical-work-artifact-template.md`; make `milestone-template.md` refer to `Milestone_Specification`; add Feature fields to `epic-template.md`:

```md
## Features

- Primary Feature: `<Feature_Specification stable ID and realizable value>`
- Additional Features: `<optional; each entry includes an explicit reason>`
```

Keep template revision status explicit, and do not use a generic artifact name as a runtime type.

- [ ] **Step 4: Remove the retired template with a patch after the replacement is reviewed.**

Apply a deletion patch for `contract/artifacts/canonical-work-artifact-template.md`. Do not leave a redirect file; active sources must link directly to `milestone-specification-template.md`.

- [ ] **Step 5: Run the documentation gates.**

Run: `npm run check:docs; npm run check:terminology`

Expected: PASS with no active deprecated term or broken direct reference.

### Task 3: Normalize Planning-show and all active scenario/operational projections

**Files:**
- Modify: `skills/planning-show/SKILL.md`
- Modify: `skills/planning-show/agents/openai.yaml`
- Modify: `docs/planning/ai-booster-kit/scenario-contracts/v1/index.md`
- Modify: `docs/planning/ai-booster-kit/scenario-contracts/v1/01-parallel-feature-planning-fan-in.md`
- Modify: `docs/planning/ai-booster-kit/scenario-contracts/v1/02-business-decision-technical-handoff.md`
- Modify: `docs/planning/ai-booster-kit/scenario-contracts/v1/03-read-only-verification-fix-proposal.md`
- Modify: every Markdown source found by `scripts/check-terminology.mjs` beneath `docs/operations/`, `docs/runbooks/`, `marketing/`, and `website/` that it reports
- Modify: `test/planning-show-contracts.test.ts`

**Interfaces:**
- Consumes: `platform_session_status`, `session_resolution`, `readiness_status`, `execution_status`, `observed_behavior`, and `revision_status` from the canonical source.
- Produces: scenario contracts where final session lifecycle, resolution, observation, execution, and readiness are distinct fields.

- [ ] **Step 1: Write the failing scenario-contract assertions.**

```ts
assert.match(contract03Text, /platform_session_status:\s*NEW \| RESUMABLE \| DONE \| STOPPED/);
assert.match(contract03Text, /session_resolution:\s*UNKNOWN \| CONFLICT \| SCOPE_CHANGED/);
assert.match(contract03Text, /`SCOPE_CHANGED` requires a recorded scope-change decision/);
assert.doesNotMatch(contractText, /\bSCOPE_CHANGE\b/);
```

- [ ] **Step 2: Replace each overloaded `session_status` block.**

```yaml
platform_session_status: NEW | RESUMABLE | DONE | STOPPED
session_resolution: UNKNOWN | CONFLICT | SCOPE_CHANGED
readiness_status: PROPOSED | CONFIRMED | READY_WITH_LIMIT | READY_FOR_FAN_IN
execution_status: NOT_EXECUTED | PARTIAL | COMPLETE_WITH_LIMIT
observed_behavior: PASS | FAIL | UNKNOWN
revision_status: DRAFT | ACCEPTED | STALE | SUPERSEDED
```

State that `CONFLICT` and `SCOPE_CHANGED` prevent fan-in and Platform `DONE` until their named decisions are resolved; do not describe them as session lifecycle values.

- [ ] **Step 3: Add frontmatter only to canonical, generated, or machine-checked active documents.**

For Planning-show contracts and authored specifications use:

```yaml
---
document_type: scenario_contract
status: ACTIVE
language_version: 1.0.0
---
```

For generated documents add all three provenance fields. Do not add metadata solely to a historical document.

- [ ] **Step 4: Run focused and corpus checks.**

Run: `npm run build; node --test dist/test/planning-show-contracts.test.js dist/test/docs-links.test.js; npm run check:docs; npm run check:terminology`

Expected: PASS; the active-corpus gate output is empty.

### Task 4: Retire the working sources only after content and links prove transferred

**Files:**
- Delete: `NOTES.md`
- Delete: `docs/project/terminology-normalization-table.md`
- Modify: `docs/project/roadmap.md`
- Modify: `contract/agent-library/quick-task-clarifier-validator.md`
- Modify: `workflows/team-delivery-loop.md`
- Modify: `docs/superpowers/specs/2026-08-02-ai-booster-kit-m2-m3-activation-session-design.md`
- Modify: `docs/superpowers/specs/2026-08-01-ai-booster-kit-team-delivery-loop-design.md`
- Modify: `docs/superpowers/plans/2026-08-01-ai-booster-kit-team-delivery-loop.md`

**Interfaces:**
- Consumes: `rg -l 'NOTES\.md|terminology-normalization-table\.md'` results.
- Produces: no active broken link and no redirect document.

- [ ] **Step 1: Prove the replacement source is complete.**

Run: `rg -n 'Vision|Roadmap|Milestone|Epic|Feature|Work Item|Handoff|platform_delivery_status|SCOPE_CHANGED' docs/project/platform-language.md`

Expected: each approved definition and status axis is present in the canonical English source.

- [ ] **Step 2: Repair only structural references.**

Replace links to `NOTES.md` with direct links to `docs/project/platform-language.md`. In older design/plan documents, make no wording migration; retain their historical statements and repair only a now-broken link.

- [ ] **Step 3: Delete the two superseded working documents with an explicit patch.**

Apply a deletion patch for `NOTES.md` and `docs/project/terminology-normalization-table.md` only after Step 1 and Step 2 pass. Expected: exactly those two approved files are removed; no history path is removed.

- [ ] **Step 4: Prove link and term integrity.**

Run: `rg -l 'NOTES\.md|terminology-normalization-table\.md' --glob '!docs/history/**' .; npm run check:docs; npm run check:terminology`

Expected: the search has no result, and both gates pass.

## Slice 2 — Runtime Terminology

### Task 5: Replace the domain model and schemas with concrete Specification and Feature types

**Files:**
- Create: `src/domain/feature-refinement.ts`
- Modify: `src/domain/model.ts`
- Modify: `src/domain/schema.ts`
- Modify: `src/domain/validate.ts`
- Modify: `test/domain.test.ts`
- Modify: `test/context-validation.test.ts`
- Modify: `test/e2e.test.ts`
- Modify: `test/performance/baseline.test.ts`

**Interfaces:**
- Produces:

```ts
export type PlatformDeliveryStatus = "NOT_STARTED" | "IN_PROGRESS" | "UNDER_SPECIFICATION" | "DONE";
export type ReadinessStatus = "PROPOSED" | "CONFIRMED" | "READY_WITH_LIMIT" | "READY_FOR_FAN_IN";
export type RevisionStatus = "DRAFT" | "ACCEPTED" | "STALE" | "SUPERSEDED";
export interface FeatureSpecification { specificationId: string; epicId: string; role: "primary" | "additional"; value: string; additionalReason: string | null; readinessStatus: ReadinessStatus; revisionStatus: RevisionStatus; }
export interface MilestoneSpecification { specificationId: string; milestoneId: string; revisionStatus: RevisionStatus; /* existing Milestone content fields */ }
export interface Epic { canonicalId: string; primaryFeature: FeatureSpecification | null; additionalFeatures: readonly FeatureSpecification[]; platformDeliveryStatus: PlatformDeliveryStatus; jiraBoardStatus?: string; }
export interface FeatureRefinementRequirement { epicId: string; reasons: readonly ("MISSING_PRIMARY_FEATURE" | "MISSING_ADDITIONAL_FEATURE_REASON")[]; nextAction: "FEATURE_REFINEMENT_SESSION"; }
```

- [ ] **Step 1: Write failing domain tests for Feature completeness and status axes.**

```ts
assert.deepEqual(assessEpicFeatureRefinement(epicWithoutPrimary), {
  epicId: "epic-1",
  reasons: ["MISSING_PRIMARY_FEATURE"],
  nextAction: "FEATURE_REFINEMENT_SESSION",
});
assert.throws(() => assertEpicFeatureReady(epicWithReasonlessAdditional), /FEATURE_REFINEMENT_SESSION/);
assert.throws(() => validateCanonicalRecord({ ...epic, platformDeliveryStatus: "Done" }, "epic"), /platformDeliveryStatus/);
```

- [ ] **Step 2: Implement `feature-refinement.ts` as a pure assessment.**

```ts
export function assessEpicFeatureRefinement(epic: Epic): FeatureRefinementRequirement | null {
  const reasons = [
    ...(epic.primaryFeature === null ? ["MISSING_PRIMARY_FEATURE" as const] : []),
    ...epic.additionalFeatures.filter((feature) => feature.additionalReason === null).map(() => "MISSING_ADDITIONAL_FEATURE_REASON" as const),
  ];
  return reasons.length === 0 ? null : { epicId: epic.canonicalId, reasons, nextAction: "FEATURE_REFINEMENT_SESSION" };
}
```

- [ ] **Step 3: Rename the concrete Milestone record throughout model and schema.**

Replace `CanonicalWorkArtifact` and `canonicalWorkArtifact` with `MilestoneSpecification` and `milestoneSpecification`; rename schema key `canonicalWorkArtifact` to `milestoneSpecification`; replace `description` with `specification`; remove `BoardStatus` and `boardStatus` from core records. Require `primaryFeature` and `additionalFeatures` keys so absence is observable; permit `primaryFeature: null` only until semantic Feature-refinement validation.

- [ ] **Step 4: Add semantic lifecycle validation.**

`DONE` must reject when the Milestone Specification is not `ACCEPTED`, any Feature is not `CONFIRMED`, a Work Item is not accepted, acceptance evidence is empty, final acceptance is absent, or a Feature-refinement requirement remains. `NOT_STARTED` and `UNDER_SPECIFICATION` remain valid non-final states.

- [ ] **Step 5: Run domain and affected context tests.**

Run: `npm run build; node --test dist/test/domain.test.js dist/test/context-validation.test.js dist/test/e2e.test.js dist/test/performance/baseline.test.js`

Expected: PASS with no `CanonicalWorkArtifact`, `BoardStatus`, or bare core `Done` import.

### Task 6: Migrate planning, traceability, and finalization to the new completion boundary

**Files:**
- Modify: `src/planning/finalize.ts`
- Modify: `src/planning/traceability.ts`
- Modify: `src/context/identity.ts`
- Modify: `test/planning.test.ts`
- Modify: `test/e2e.test.ts`
- Modify: `test/performance/baseline.test.ts`

**Interfaces:**
- Consumes: `MilestoneSpecification`, `FeatureSpecification`, `assertEpicFeatureReady`, and `PlatformDeliveryStatus` from Task 5.
- Produces: finalization only for an accepted `Milestone_Specification` and fully confirmed Feature/Work Item set.

- [ ] **Step 1: Write failing finalization tests.**

```ts
assert.throws(() => finalizeMilestone({ ...input, epics: [{ ...input.epics[0]!, primaryFeature: null }] }), /FEATURE_REFINEMENT_SESSION/);
assert.throws(() => finalizeMilestone({ ...input, milestone: { ...input.milestone, platformDeliveryStatus: "UNDER_SPECIFICATION" } }), /cannot finalize/);
assert.equal(finalizeMilestone(acceptedInput).milestone.platformDeliveryStatus, "DONE");
```

- [ ] **Step 2: Rename `FinalizeInput` and result fields.**

```ts
export interface FinalizeInput {
  milestone: Milestone;
  milestoneSpecification: MilestoneSpecification;
  epics: readonly Epic[];
  workItems: readonly ChildWorkItem[];
  finalAcceptance: "accepted";
  sourceSpecificationRevision: string;
}
```

The generated attachment remains local intent only and uses the stable Specification ID in its filename.

- [ ] **Step 3: Enforce traceability without a Board lifecycle dependency.**

Remove `assertAllowedBoardStatus`. For each Epic call `assertEpicFeatureReady`; retain parent, uniqueness, Work Item acceptance-criteria, dependency, and execution-set checks. Errors must name the Epic ID and `FEATURE_REFINEMENT_SESSION` next action.

- [ ] **Step 4: Update rendering headings.**

Render `# <Milestone_Specification ID>`, `## Primary Feature`, `## Additional Features`, `## Revision status`, `## Platform delivery status`, and `## Acceptance evidence`. Never render the retired term as a heading.

- [ ] **Step 5: Run the planning suites.**

Run: `npm run build; node --test dist/test/planning.test.js dist/test/e2e.test.js dist/test/performance/baseline.test.js`

Expected: PASS; finalization produces no external action.

### Task 7: Separate session, revision, resolution, readiness, and fan-in status axes

**Files:**
- Modify: `src/context/types.ts`
- Modify: `src/context/validation.ts`
- Modify: `src/context/markdown.ts`
- Modify: `src/context/resume.ts`
- Modify: `src/context/team-delivery.ts`
- Modify: `src/context/storage.ts`
- Modify: `src/cli.ts`
- Modify: `test/session-state.test.ts`
- Modify: `test/context-markdown.test.ts`
- Modify: `test/context-storage-cli.test.ts`
- Modify: `test/team-delivery.test.ts`

**Interfaces:**
- Produces:

```ts
export type PlatformSessionStatus = "NEW" | "RESUMABLE" | "DONE" | "STOPPED";
export type SessionResolution = "UNKNOWN" | "CONFLICT" | "SCOPE_CHANGED" | null;
export interface SessionState { platformSessionStatus: PlatformSessionStatus; sessionResolution: SessionResolution; readinessStatus: ReadinessStatus; executionStatus: ExecutionStatus; observedBehavior: ObservedBehavior | null; }
export interface EpicSpecificationHandoff { specificationId: string; epicId: string; readinessStatus: ReadinessStatus; revisionStatus: RevisionStatus; ownerAlias: string; }
```

- [ ] **Step 1: Write failing state migration tests.**

```ts
assert.throws(() => validateSessionState({ ...session, status: "COMPLETE" }), /status/);
assert.equal(validateSessionState({ ...session, platformSessionStatus: "RESUMABLE", sessionResolution: null }).platformSessionStatus, "RESUMABLE");
assert.throws(() => validateSessionState({ ...session, sessionResolution: "SCOPE_CHANGED", scopeChangeDecision: null }), /scope-change decision/);
```

- [ ] **Step 2: Replace overloaded fields and names.**

Rename `ContextState` to `RevisionStatus`; use `revisionStatus` in Context envelopes. Replace `SessionState.status` with the exact named fields above. Replace `HandoffPacket`/`HandoffStatus` with a concrete Epic Specification handoff record and `readinessStatus`; do not introduce a generic Handoff runtime union.

- [ ] **Step 3: Preserve safe resume behavior.**

`RESUMABLE` may evaluate for resume. `DONE` and `STOPPED` return `STOPPED`; `UNKNOWN`, `CONFLICT`, or `SCOPE_CHANGED` resolution returns its named result with preserved state. `SCOPE_CHANGED` requires a non-empty recorded decision and an explicit re-evaluation next action.

- [ ] **Step 4: Require fan-in inputs by their actual axes.**

`READY_FOR_FAN_IN` requires integration owner, review owner, rollback boundary, accepted revision, confirmed Features, and required evidence. `CONFLICT` or `SCOPE_CHANGED` must reject fan-in and must not be converted to `DONE`.

- [ ] **Step 5: Run context and CLI tests.**

Run: `npm run build; node --test dist/test/session-state.test.js dist/test/context-markdown.test.js dist/test/context-storage-cli.test.js dist/test/team-delivery.test.js`

Expected: PASS, including malformed, missing scope-decision, conflict, and unresolved-unknown negative paths.

### Task 8: Make Jira a profile-driven optional projection rather than the core lifecycle

**Files:**
- Modify: `src/lifecycle/profile.ts`
- Modify: `src/lifecycle/transitions.ts`
- Modify: `src/connectors/jira.ts`
- Modify: `src/orchestrator/allowlist.ts`
- Modify: `src/contract/markdown.ts`
- Modify: `src/contract/compile.ts`
- Modify: `test/fixtures/project-profile.json`
- Modify: `test/lifecycle.test.ts`
- Modify: `test/connectors.test.ts`
- Modify: `test/contract.test.ts`
- Modify: `test/adapters.test.ts`
- Modify: `test/orchestrator.test.ts`

**Interfaces:**
- Produces:

```ts
export interface JiraProjectionProfile {
  boardStatusMappings: Readonly<Record<PlatformDeliveryStatus, string>>;
  transitionNames: Readonly<Record<string, string>>;
}
export interface ProjectProfile { jira: JiraProjectionProfile | null; }
export function projectJiraBoardStatus(profile: ProjectProfile, status: PlatformDeliveryStatus): string;
```

- [ ] **Step 1: Write failing lifecycle tests.**

```ts
assert.equal(projectJiraBoardStatus(profile, "DONE"), "Done");
assert.throws(() => projectJiraBoardStatus({ ...profile, jira: null }, "DONE"), /Jira projection is not configured/);
assert.throws(() => loadProjectProfileFrom(incompleteMappingProfile), /complete Platform delivery mapping/);
```

- [ ] **Step 2: Implement the optional mapping boundary.**

Move the literal native labels and transition names into `JiraProjectionProfile`. Validate that a non-null profile maps every `PlatformDeliveryStatus` exactly once to non-empty native labels. Core domain records retain no required Jira status. A caller requesting projection with `jira: null` or incomplete mappings receives an explicit error before connector intent evaluation.

- [ ] **Step 3: Update connector and contract validation to use the mapping.**

Replace fixed ordered `BoardStatus` comparisons with profile-resolved native values. Preserve existing target identity, allowlist, and read-back rules. No code path may call a connector because of this migration.

- [ ] **Step 4: Run lifecycle, contract, connector, and orchestrator tests.**

Run: `npm run build; node --test dist/test/lifecycle.test.js dist/test/contract.test.js dist/test/adapters.test.js dist/test/connectors.test.js dist/test/orchestrator.test.js`

Expected: PASS; `DONE -> Done` succeeds only with a complete explicit mapping and a missing mapping fails closed.

### Task 9: Remove legacy exceptions and validate the complete migration

**Files:**
- Modify: `docs/project/platform-language.md`
- Modify: `scripts/check-terminology.mjs`
- Modify: `package.json`
- Modify: `docs/project/current-state.md`
- Modify: all remaining active files reported by `rg` or `npm run check:terminology`
- Test: every affected `test/*.test.ts`

**Interfaces:**
- Consumes: a passing Slice 1 documentation corpus and all Slice 2 runtime migrations.
- Produces: zero legacy exception paths and an enforced repository quality gate.

- [ ] **Step 1: Write the failing final gate test.**

```ts
test("terminology gate rejects retired runtime identifiers after migration", async () => {
  const result = await runGate(fixtureRoot("retired-runtime-identifier"));
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /HandoffPacket|CanonicalWorkArtifact|BoardStatus|SCOPE_CHANGE/);
});
```

- [ ] **Step 2: Remove every `legacy_exception_paths` entry and prohibit retired identifiers.**

The final policy has no source/test exception. `Done` remains permitted only in the declared native Jira mapping fixture or mapping examples, never as a Platform status.

- [ ] **Step 3: Update current delivery routing as a factual completion record.**

In `docs/project/current-state.md`, record the exact local commit only after it exists; before commit, state the implementation as uncommitted review state. Record the passing commands, the explicit no-external-write boundary, and any unsupported runtime capability as `NOT_EXECUTED`.

- [ ] **Step 4: Run complete verification from a clean build output.**

Run: `npm run lint; npm run build; npm test; npm run check:docs; npm run check:terminology; rg -n --glob '!docs/history/**' --glob '!docs/superpowers/**' 'CanonicalWorkArtifact|canonicalWorkArtifact|BoardStatus|boardStatus|HandoffPacket|SCOPE_CHANGE' src test contract workflows docs README.md skills marketing website scripts`

Expected: every command succeeds and the final search has no output. Any source snapshot mapper result remains reported separately; it is not silently promoted to a terminology-gate result.

- [ ] **Step 5: Perform the final diff and scope review.**

Run: `git diff --check; git diff --name-status; git diff -- docs/project/platform-language.md scripts/check-terminology.mjs src/domain src/context src/lifecycle src/planning`

Expected: no whitespace error, no secret-bearing data, no external-write behavior, no unapproved deletion beyond `NOTES.md` and the terminology table, and no historical wording rewrite.

## Self-review

### Spec coverage

- One English canonical source, direct references, metadata, generated provenance, active-corpus gate, and history exclusion: Tasks 1–4.
- Delivery hierarchy, Feature ownership/refinement, six Handoff Specifications, Work Artifact boundary, `NOT_STARTED`/`UNDER_SPECIFICATION`/`IN_PROGRESS`/`DONE`: Tasks 5–6.
- Named status axes, `SCOPE_CHANGED`, revision preservation, resume and fan-in behavior: Task 7.
- Optional fail-closed Jira mapping and no external write: Task 8.
- Legacy exception removal, full quality gates, and factual current-state update: Task 9.

### Placeholder scan

This plan contains none of the red-flag placeholder patterns. The only corpus-wide file selection is deterministic: `scripts/check-terminology.mjs` reports the exact active Markdown paths, which Task 3 must normalize before its required gate passes.

### Type consistency

`PlatformDeliveryStatus`, `ReadinessStatus`, `RevisionStatus`, `FeatureSpecification`, `MilestoneSpecification`, and `FeatureRefinementRequirement` are defined in Task 5 and consumed with those exact names in Tasks 6–8. `PlatformSessionStatus` and `SessionResolution` are defined in Task 7 and are not reused as delivery lifecycle types. `JiraProjectionProfile` is defined in Task 8 and is the only source for native Jira labels.

## Completion evidence

Implementation is complete only when `npm run lint`, `npm test`, `npm run check:docs`, and `npm run check:terminology` pass; the final retired-term search is empty outside approved history; the diff review confirms no external write; and the user has reviewed the resulting uncommitted changes. Commit, push, PR, and merge are separate approvals.

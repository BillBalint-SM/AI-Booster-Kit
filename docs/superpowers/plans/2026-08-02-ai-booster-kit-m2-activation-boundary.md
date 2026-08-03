# AI Booster Kit M2 Activation Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit, host-agnostic activation and tuning boundary with
Ephemeral/Personal/Team retention while preserving the existing v1 Quick Task
ephemeral command.

**Architecture:** Keep `activate-quick-task` as the already-validated
recommendation-to-ephemeral-package path. Add a pure M2 boundary builder that
wraps that package with a Milestone/Epic context reference, one tuning delta,
setup snapshot, rollback reference, and retention choice. Add a separate
explicit local saver for Personal or Team package files; no host execution,
connector, commit, merge, or publication is performed.

**Tech Stack:** TypeScript 5.9, NodeNext, Node.js `>=22 <23`, built-in Node
filesystem/crypto/process APIs, existing Controller identity helpers, and
Node's built-in test runner. No dependency additions.

## Global Constraints

- `Project Vision -> Roadmap -> Milestone -> Epic -> Story/Task/Bug` remains the domain hierarchy; Feature is the Epic's realized and demonstrable value, not another child level.
- `main`, `feature`, and `dev-<scope>` are Git delivery environments and must not be confused with the domain Feature.
- The base recipe remains immutable; one operation may create one versioned tuning overlay only.
- The prior setup is required and remains available for rollback.
- `EPHEMERAL` produces no file; `PERSONAL` and `TEAM` require a separate explicit save operation.
- Team targets must be repository-relative and must not be silently redirected, overwritten, committed, merged, or published.
- Unknown, stale, malformed, unsupported, conflicting, or unacknowledged input fails closed without retry or implicit alternative activation.
- The current `activate-quick-task` command and its v1 output contract remain unchanged.
- Do not modify `AGENTS.md`, add credentials, call a host runtime, call a connector, access a network, or create a commit, push, or PR without fresh explicit approval.

## File structure

| File | Responsibility |
| --- | --- |
| `src/controller/types.ts` | Add closed M2 context-reference, retention, tuning, setup-snapshot, package, and save-result types. |
| `src/controller/activation-boundary.ts` | Pure validation and deterministic M2 package construction. |
| `src/controller/activation-storage.ts` | Explicit Personal/Team JSON save with target-boundary and duplicate rules. |
| `src/controller/identity.ts` | Add a deterministic activation-package fingerprint helper. |
| `src/cli.ts` | Add `prepare-activation` and `save-activation` without changing existing Controller commands. |
| `test/controller-activation-boundary.test.ts` | Pure package, tuning, retention, snapshot, rollback, and conflict tests. |
| `test/controller-activation-storage.test.ts` | Safe Personal/Team save, duplicate, traversal, and Ephemeral rejection tests. |
| `test/controller-activation-boundary-cli.test.ts` | Built CLI success and fail-closed path tests. |
| `docs/project/documentation-map.md` | Route the M2 contract and commands. |
| `docs/project/current-state.md` | Record the bounded M2 result and remaining host/persistence limits. |

## Interfaces

Add these closed interfaces to `src/controller/types.ts`:

~~`
export type RetentionScope = "EPHEMERAL" | "PERSONAL" | "TEAM";
export type ActivationContextKind = "MILESTONE" | "EPIC";

export interface ContextReference {
  kind: ActivationContextKind;
  contextId: string;
  sourceRevision: string;
}

export type TuningRequest =
  | { state: "NONE" }
  | { state: "REQUESTED"; change: string; rationale: string };

export interface ActivationSetupSnapshot {
  recipeId: string;
  recipeVersion: string;
  variantId: string;
  fingerprint: string;
}

export interface ActivationBoundaryInput {
  basePackage: QuickTaskActivationPackage;
  context: ContextReference;
  retention: RetentionScope;
  tuning: TuningRequest;
  setupSnapshot: ActivationSetupSnapshot;
}

export interface ActivationBoundaryPackage {
  activationVersion: "2.0";
  state: "ACTIVATION_PACKAGE_PREPARED";
  packageId: string;
  retention: RetentionScope;
  context: ContextReference;
  basePackage: QuickTaskActivationPackage;
  tuning: TuningRequest;
  setupSnapshot: ActivationSetupSnapshot;
  rollback: { state: "AVAILABLE"; restoreSetupFingerprint: string };
  operations: {
    packagePrepared: true;
    hostActivationPerformed: false;
    artifactGenerationPerformed: false;
    persistencePerformed: false;
  };
}

export interface ActivationSaveResult {
  state: "PERSONAL_PACKAGE_SAVED" | "TEAM_PACKAGE_SAVED";
  packageId: string;
  retention: "PERSONAL" | "TEAM";
  targetPath: string;
  persistencePerformed: true;
}

export function createActivationBoundaryPackage(
  input: ActivationBoundaryInput,
): ActivationBoundaryPackage;
export function saveActivationPackage(
  targetPath: string,
  packageValue: ActivationBoundaryPackage,
  repositoryRoot: string | undefined,
): Promise<ActivationSaveResult>;
~~`

### Task 1: Add the pure M2 boundary contract

**Files:**

- Modify: `src/controller/types.ts`
- Modify: `src/controller/identity.ts`
- Create: `src/controller/activation-boundary.ts`
- Create: `test/controller-activation-boundary.test.ts`

- [x] **Step 1: Write failing contract tests**

Test a valid v1 package wrapped with:

~~`
const input = {
  basePackage,
  context: { kind: "EPIC", contextId: "EPIC-1", sourceRevision: "revision-1" },
  retention: "TEAM",
  tuning: { state: "REQUESTED", change: "Use the bounded implementation role.", rationale: "The Epic contains code changes." },
  setupSnapshot: { recipeId: "quick-task-clarifier-validator", recipeVersion: "0.1.0", variantId: "baseline", fingerprint: "setup-1" },
} as const;
~~`

Assert `activationVersion`, `ACTIVATION_PACKAGE_PREPARED`, the exact context,
retention, tuning, rollback reference, and all false execution flags. Call the
builder twice and assert deep equality and a stable 64-character package ID.

Cover rejection of empty context IDs/revisions, invalid retention, empty
tuning change/rationale, missing setup fingerprint, a setup recipe mismatch,
an already non-ephemeral base package, and a second tuning delta represented by
an object with extra keys. Errors must use stable `ACTIVATION_*` codes and must
not echo arbitrary context content.

- [x] **Step 2: Run the focused test to verify failure**

Run:

~~`
npm run build
node --test dist/test/controller-activation-boundary.test.js
~~`

Expected: FAIL because the M2 types, fingerprint helper, and builder do not
exist.

- [x] **Step 3: Implement the closed types and deterministic fingerprint**

Add the interfaces above. Add `activationPackageFingerprint(value: unknown)`
to `src/controller/identity.ts` using the existing canonical JSON digest
pattern. The fingerprint input must include context, retention, tuning, setup
snapshot, and the base package identity; it must not include time, environment,
randomness, absolute paths, or raw transcripts.

- [x] **Step 4: Implement the pure boundary builder**

In `src/controller/activation-boundary.ts`, validate the base package's
`EPHEMERAL` v1 state, context identifiers, retention literal, tuning union,
and setup snapshot. Require the snapshot recipe ID/version to match the base
package recipe. Return one immutable `ACTIVATION_PACKAGE_PREPARED` object with
`rollback.state === "AVAILABLE"` and `restoreSetupFingerprint` equal to the
input snapshot fingerprint. Do not read files, write files, call the clock,
access the environment, or mutate the input.

- [x] **Step 5: Run the pure M2 tests**

Run:

~~`
npm run build
node --test dist/test/controller-activation-boundary.test.js
~~`

Expected: PASS for positive, deterministic, malformed, mismatch, and
multi-mutation paths.

### Task 2: Add explicit Personal/Team package saving

**Files:**

- Create: `src/controller/activation-storage.ts`
- Create: `test/controller-activation-storage.test.ts`

- [x] **Step 1: Write failing storage tests**

Use a temporary directory. Assert that `PERSONAL` writes one JSON document and
returns `PERSONAL_PACKAGE_SAVED`; `TEAM` writes only to a target below the
explicit repository root and returns `TEAM_PACKAGE_SAVED`; identical repeated
saves return the same result without changing content; and an existing target
with a different package is rejected.

Assert that `EPHEMERAL` is rejected, a Team path escaping the repository root
is rejected, a directory target is rejected, and the writer never writes a
second file or an automatic sidecar. Inspect the resulting JSON to confirm
that no host activation, host file generation, connector, commit, or merge
claim is present.

- [x] **Step 2: Run the focused storage test to verify failure**

Run:

~~`
npm run build
node --test dist/test/controller-activation-storage.test.js
~~`

Expected: FAIL because the explicit storage module does not exist.

- [x] **Step 3: Implement the bounded writer**

Implement `saveActivationPackage` with `node:fs/promises` and `node:path`.
Require the requested save scope to match `packageValue.retention` and reject
Ephemeral packages. For Team, resolve both paths and require the target to be
inside the explicit repository root; for Personal, require a non-empty
explicit target. Create no parent directory implicitly. If the target is
absent, write one UTF-8 JSON document ending in one newline. If it exists,
return success only when its parsed package ID and content match; otherwise
fail with `ACTIVATION_TARGET_CONFLICT`. Never delete or overwrite a different
artifact.

- [x] **Step 4: Run storage tests**

Run:

~~`
npm run build
node --test dist/test/controller-activation-storage.test.js
~~`

Expected: PASS for Personal, Team, duplicate, traversal, conflict, and
Ephemeral paths.

### Task 3: Expose explicit M2 CLI operations

**Files:**

- Modify: `src/cli.ts`
- Create: `test/controller-activation-boundary-cli.test.ts`

The new commands are:

~~`
npm run cli -- prepare-activation --input <request.json> --choice <choice.json> --profile <profile> --context-kind <MILESTONE|EPIC> --context-id <id> --context-revision <revision> --retention <EPHEMERAL|PERSONAL|TEAM> --tuning <tuning.json>
npm run cli -- save-activation --input <package.json> --target <path> --repository-root <path>
~~`

`prepare-activation` requires all arguments, including a tuning JSON file with
`{"state":"NONE"}` when no tuning is requested. It reuses the existing fresh
recipe evaluation, checkpoint resolution, and v1 package builder; it then
wraps the v1 result through the pure M2 builder. It emits exactly one JSON
package and never writes a file.

`save-activation` requires an explicit target. It parses the M2 package,
requires `PERSONAL` or `TEAM` retention, requires `--repository-root` for
Team, and emits one save result. It never performs host execution or Git
operations.

- [x] **Step 1: Write failing built-CLI tests**

Cover one successful package for each retention scope, one successful Team
save under a temporary repository root, and these stops: missing argument,
invalid context kind, invalid retention, malformed tuning, stale checkpoint,
non-activation choice, empty context ID, Ephemeral save, Team target escape,
target conflict, and extra argument. Assert non-zero exit, one safe JSON
result, no stderr content, and no secret/request echo.

- [x] **Step 2: Run the CLI tests to verify failure**

Run:

~~`
npm run build
node --test dist/test/controller-activation-boundary-cli.test.js
~~`

Expected: FAIL because the new commands are not dispatched.

- [x] **Step 3: Add strict dispatch and safe error mapping**

Add help text and exact argument parsing to `src/cli.ts`. Keep
`activate-quick-task`, `resolve-checkpoint`, and `quick-task` branches
unchanged. Read only explicit input paths, parse JSON separately, map
Controller and M2 errors to stable safe stop codes, and never include raw
paths, input content, fingerprints, credentials, or arbitrary values in error
messages.

- [x] **Step 4: Run the built CLI tests**

Run:

~~`
npm run build
node --test dist/test/controller-activation-boundary-cli.test.js dist/test/controller-activation-package-cli.test.js dist/test/controller-cli.test.js
~~`

Expected: PASS with the old activation command unchanged.

### Task 4: Update routing documentation and verify M2

**Files:**

- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/current-state.md`
- Modify: `docs/project/roadmap.md`

- [x] **Step 1: Add M2 routing and contract links**

Route the new M2 design, plan, package preparation, and explicit save behavior
from the documentation map. Update the roadmap capability row and M2 exit
evidence without marking host execution, connector behavior, or publication
ready.

- [x] **Step 2: Refresh current-state from a fresh preflight**

Run:

~~`
& C:\Users\littl\.agents\tools\work-state-preflight.ps1 -RepositoryPath (Get-Location).Path -OutputFormat Markdown
~~`

Record the verified branch, HEAD, worktree, upstream, and PR status. State
exactly which M2 behavior is implemented and which host/external limits remain.

- [x] **Step 3: Run M2 quality gates**

Run:

~~`
npm run lint
npm run check:docs
npm run test
git diff --check
~~`

Expected: all commands exit `0`. Review the final diff for secret exposure,
generated noise, unrelated domain changes, and any accidental write authority.
Leave the worktree uncommitted pending explicit publication approval.

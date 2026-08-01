# M1 Ready Validation Recipe and Output Contract Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Promote the bounded validation formation to the first fully `READY` scenario by adding a linked, strictly validated recipe and profile-specific output contract.

**Architecture:** Extend the declarative formation catalog with an explicit recipe path for every entry; candidate entries use `null`, while the ready validation entry links to one local Markdown recipe. Add a focused validation-recipe parser that rejects unknown metadata, unsafe boundaries, missing output sections, and non-canonical unknown/result policies. The recommendation layer recognizes `READY` entries as `RECOMMEND` and exposes the validated recipe path without activating or reading external targets.

**Tech Stack:** TypeScript 5.9, Node.js 22, `yaml` 2.9, Node built-in test runner, existing Markdown-frontmatter conventions.

## Global Constraints

- Promote only `bounded-validation`; research, refinement, implementation, and debugging remain `CANDIDATE`.
- The recipe is local, recommendation-only, and side-effect-free; no host activation, persistence, connector call, or external read is introduced.
- The output contract must preserve `UNKNOWN` and end in explicit `NOT_STARTED` state before validation runs.
- Recipe identity, path, version, and catalog status must agree; no implicit recipe mapping is allowed.
- Existing Quick Task, checkpoint, activation, and CLI behavior must remain green.

---

### Task 1: Add failing recipe and promotion tests

**Files:**
- Create: `test/controller-formation-recipe.test.ts`
- Modify: `test/controller-formation.test.ts`
- Modify: `test/controller-formation-recommendation.test.ts`
- Modify: `test/controller-cli.test.ts`

**Coverage:**
- Parse the valid validation recipe and preserve its profile-specific input/output contract.
- Reject unknown metadata, missing output sections, unsafe execution boundary, and non-canonical unknown/result policies.
- Confirm the catalog exposes `bounded-validation` as `READY` with a non-null recipe path and other scenario entries as candidates.
- Confirm validation requests now return `RECOMMEND` and the CLI exits successfully while candidate scenarios remain candidates.

**Red check:** Run `npm run build` and the focused tests after adding the assertions; observe missing recipe types/parser or the old candidate status before implementation.

### Task 2: Add the linked validation recipe contract

**Files:**
- Create: `contract/agent-library/bounded-validation.md`
- Modify: `contract/agent-library/formation-catalog.md`

**Contract:** Declare `bounded-validation` version `0.1.0`, status `READY`, local-only recommendation authority, LOW/MEDIUM eligibility, required input sections (`claim`, `acceptance-criteria`, `evidence-sources`, `known-limits`), output sections (`validation-result`, `evidence-map`, `explicit-stop-or-pass`), explicit acceptance criteria/evidence requirements, relations, recovery, `PRESERVE_AS_UNKNOWN`, and `NOT_STARTED` result state. Link this recipe from the catalog; leave the four other scenario recipe paths null.

### Task 3: Implement strict recipe parsing and READY recommendation wiring

**Files:**
- Modify: `src/controller/types.ts`
- Modify: `src/controller/formation.ts`
- Modify: `src/controller/formation-recommendation.ts`
- Create: `src/controller/formation-recipe.ts`

**Interfaces:**

```ts
export async function loadValidationRecipe(sourcePath: string): Promise<ValidationRecipe>;
export function parseValidationRecipe(source: string, sourcePath: string): ValidationRecipe;
```

The catalog parser validates `recipePath` and permits `null` only for candidates. The recommendation layer returns `RECOMMEND` for `READY` or `READY_WITH_LIMIT` entries and includes the explicit recipe path. The recipe parser validates exact frontmatter keys and rejects executable or unsafe declarations.

### Task 4: Verify, publish, and route the next gap

**Checks:**
- Run focused recipe/catalog/recommendation/CLI tests, full suite, documentation-link check, and `git diff --check`.
- Review for recipe/catalog identity mismatch, raw request leakage, unintended activation, and generated noise.
- Commit, push, create a ready PR, wait for green CI, merge, and return to clean `main`.
- Update current-state so the next gap is the next ready scenario recipe/profile contract, not validation.

**Acceptance criteria:** One catalog entry is genuinely `READY` and linked to a validated profile-specific recipe; its recommendation and CLI path return `RECOMMEND`; all four remaining scenarios remain explicit candidates; all negative paths fail closed; and all existing behavior remains green.

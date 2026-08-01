# M1-A Agent Formation Library Catalog and Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a strict, host-agnostic formation catalog contract and validator that provides one ready Quick Task entry plus bounded candidates for research, refinement, implementation, debugging, and validation.

**Architecture:** Keep the existing Quick Task recipe parser and evaluator unchanged. Add a separate YAML-frontmatter catalog parser with typed formation entries, exact nested-key validation, duplicate identity rejection, and a hard `LOCAL_ONLY`/`RECOMMENDATION_ONLY` safety boundary. The catalog is declarative evidence for the later scenario-aware Controller slice; it does not activate or execute formations.

**Tech Stack:** TypeScript 5.9, Node.js 22, `yaml` 2.9, Node built-in test runner, Markdown link checker.

## Global Constraints

- Preserve `UNKNOWN`, `CANDIDATE`, `READY_WITH_LIMIT`, and `NOT READY` as distinct states.
- Do not add external writes, OAuth, permissions, connector calls, persistence, or host-specific activation.
- Reject unknown metadata, missing required dimensions, duplicate identities, unsafe execution boundaries, and malformed lists.
- Keep the existing Quick Task controller behavior and checkpoint contract backward compatible.
- Validate with the narrowest tests first, then build, full tests, documentation links, and diff review.

---

### Task 1: Correct the roadmap evidence for the completed activation package

**Files:**
- Modify: `docs/project/roadmap.md:104`

**Change:** Mark `Quick Task Activation Package` as `COMPLETE_WITH_LIMIT`, cite `src/controller/activation-package.ts`, `src/cli.ts`, and its focused tests, and state that host adaptation/execution and explicit package saving remain separate boundaries.

**Verification:** Run `git diff --check` and `npm run check:docs` after the implementation tasks complete.

### Task 2: Define the M1-A catalog contract

**Files:**
- Create: `contract/agent-library/formation-catalog.md`

**Contract:** Use one YAML frontmatter block with catalog identity/version/status and six entries. The entries are `quick-task-clarifier-validator` (`READY_WITH_LIMIT`) and five `CANDIDATE` entries for `research`, `refinement`, `implementation`, `debugging`, and `validation`. Every entry declares scenario, weight, complexity, topology, roles, required input, expected output, acceptance criteria/evidence, relations, prerequisites, recovery, identity, `LOCAL_ONLY`, and `RECOMMENDATION_ONLY`. The body remains descriptive documentation and is not executable input.

### Task 3: Write failing catalog parser tests

**Files:**
- Create: `test/controller-formation.test.ts`

**Tests:**
- Parse the six-entry catalog and preserve the stable identity fields.
- Reject an unknown root, entry, or nested key.
- Reject a missing required dimension and a malformed empty list.
- Reject duplicate `formationId` or duplicate `identity.key` values.
- Reject `EXTERNAL_WRITE` and any authority other than `RECOMMENDATION_ONLY`.
- Reject unsupported status or enum values while preserving `UNKNOWN` only where the contract explicitly allows it.

**Red check:** Run `npm run build` after adding the tests and confirm the new imports fail because the catalog parser does not exist yet. Implement only after observing that expected failure.

### Task 4: Implement the typed catalog validator

**Files:**
- Modify: `src/controller/types.ts`
- Create: `src/controller/formation.ts`

**Interfaces:**

```ts
export async function loadFormationCatalog(sourcePath: string): Promise<FormationCatalog>;
export function parseFormationCatalog(source: string, sourcePath: string): FormationCatalog;
export class FormationCatalogError extends Error;
```

The parser extracts exactly one frontmatter block, parses YAML with duplicate-key rejection, validates exact keys and typed values, verifies non-empty required arrays, and checks catalog-wide uniqueness before returning a typed immutable-shaped value. It must fail with the source field path and a specific reason; it must never infer or repair invalid metadata.

### Task 5: Verify the M1-A slice and update current routing state

**Files:**
- Modify: `docs/project/roadmap.md`
- Modify: `docs/project/current-state.md`

**Checks:**
- Run the focused formation tests, TypeScript build, full test suite, documentation-link check, and `git diff --check` under Node 22.23.2.
- Review the final diff for scope, generated noise, line-ending churn, unsafe boundaries, and secrets.
- Update current-state with the current branch/PR routing, the completed M1-A catalog/validator evidence, the remaining M1-B scenario-recognition limit, and the next bounded action.

**Acceptance criteria:** The catalog parses into six unique entries; the five bounded candidates are visible; every required dimension is validated; all listed negative paths fail closed; existing controller behavior remains green; and the diff is reviewable without external side effects.

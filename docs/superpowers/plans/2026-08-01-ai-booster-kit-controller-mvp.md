# AI Booster Kit Controller MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local deterministic Controller command that recommends the existing Quick Task recipe without Agent activation, session persistence, generated artifacts, or external access.

**Architecture:** A small `src/controller/` domain module parses a closed request and the canonical Markdown recipe, derives SHA-256 identifiers, and evaluates explicit rules without I/O. The existing CLI gets one local `quick-task --input <path>` branch that prints a single JSON object.

**Tech Stack:** TypeScript 5.9, NodeNext, Node.js 22 supported runtime, built-in crypto/filesystem/test APIs, and the existing `yaml` dependency.

## Global Constraints

- The Controller is advisory: no activation, generated work artifact, session persistence, or external I/O.
- Input is closed `requestVersion: "1.0"` JSON; unknown fields fail closed.
- `contract/agent-library/quick-task-clarifier-validator.md` is the only recipe source; do not add a JSON registry.
- The evaluator has no filesystem, clock, network, environment, or random dependency.
- Preserve `RECOMMEND`, `PREPARE`, `NO_AGENT`, `NO_FIT`, `STOPPED`, and `UNKNOWN` distinctly.
- A custom tool has precedence; unknown compatibility requires acknowledgement.
- The command accepts only `LOCAL_ONLY`; no connector, OAuth, read, write, permission, or sync behavior is added.
- Do not change `AGENTS.md`, add dependencies, or commit without explicit User approval.
- Node 26 checks are not proof of the repository's supported `>=22 <23` runtime.

## File structure

| File | Responsibility |
| --- | --- |
| `contract/agent-library/quick-task-clarifier-validator.md` | Canonical recipe and `controller` metadata. |
| `src/controller/types.ts` | Request, recipe, decision, response, and error types. |
| `src/controller/request.ts` | Closed JSON request parser. |
| `src/controller/recipe.ts` | Strict YAML recipe loader. |
| `src/controller/identity.ts` | Canonical JSON and SHA-256 identities. |
| `src/controller/evaluate.ts` | Pure decision evaluator. |
| `src/cli.ts` | The local CLI adapter. |
| `test/controller-*.test.ts` | Behavior and built-CLI tests. |
| `test/fixtures/controller/*.json` | Synthetic request fixtures. |

### Task 1: Add machine-readable recipe metadata and loader

**Files:**
- Modify: `contract/agent-library/quick-task-clarifier-validator.md`
- Create: `src/controller/types.ts`
- Create: `src/controller/recipe.ts`
- Create: `test/controller-recipe.test.ts`

**Interfaces:**

```ts
export interface QuickTaskRecipe {
  recipeId: "quick-task-clarifier-validator";
  recipeVersion: "0.1.0";
  status: "READY_WITH_LIMIT";
  supportedWorkItem: "Quick Task";
  controller: {
    version: 1;
    eligibleComplexities: readonly ["LOW", "MEDIUM"];
    executionBoundary: "LOCAL_ONLY";
    requiredDor: readonly ["value", "context", "relations", "dependencies"];
    authority: "RECOMMENDATION_ONLY";
  };
}
export function parseQuickTaskRecipe(source: string, sourcePath: string): QuickTaskRecipe;
export function loadQuickTaskRecipe(sourcePath: string): Promise<QuickTaskRecipe>;
```

- [ ] **Step 1: Write failing recipe tests** — Parse the canonical recipe to the exact object above. Reject malformed YAML, unknown top-level/controller keys, invalid status, non-`LOCAL_ONLY` boundary, missing DoR item, and complexity order changes. Use `assert.throws(() => parseQuickTaskRecipe(source, "fixtures/recipe.md"), /Quick Task recipe rejected/)`.
- [ ] **Step 2: Prove red** — Run `npm run build; node --test dist/test/controller-recipe.test.js`. Expected: module/export failure.
- [ ] **Step 3: Add canonical metadata** — Add only this frontmatter block to the recipe, retaining `READY_WITH_LIMIT` and all prose:

```yaml
controller:
  version: 1
  eligibleComplexities: [LOW, MEDIUM]
  executionBoundary: LOCAL_ONLY
  requiredDor: [value, context, relations, dependencies]
  authority: RECOMMENDATION_ONLY
```

- [ ] **Step 4: Implement loader** — Parse exactly one leading YAML frontmatter block with `yaml`; require plain objects, exact own keys, exact literals/array order, and no symbol/inherited fields. Throw a dedicated safe recipe error containing only source path, field path, and category, never recipe content.
- [ ] **Step 5: Prove green** — Run `npm run build; node --test dist/test/controller-recipe.test.js`. Expected: PASS.

### Task 2: Add the closed request contract and identities

**Files:**
- Modify: `src/controller/types.ts`
- Create: `src/controller/request.ts`
- Create: `src/controller/identity.ts`
- Create: `test/controller-request.test.ts`
- Create: `test/fixtures/controller/eligible-quick-task.json`
- Create: `test/fixtures/controller/incomplete-quick-task.json`
- Create: `test/fixtures/controller/high-complexity-quick-task.json`
- Create: `test/fixtures/controller/no-agent-quick-task.json`
- Create: `test/fixtures/controller/custom-tool-quick-task.json`

**Interfaces:**

```ts
export interface QuickTaskRequest {
  requestVersion: "1.0";
  workItemType: "Quick Task";
  goal: string;
  outcomeOwner: string;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  executionBoundary: "LOCAL_ONLY";
  value?: { state: "KNOWN"; statement: string } | { state: "UNKNOWN" };
  context?: { state: "CURRENT" | "STALE"; reference: string } | { state: "UNKNOWN" };
  relations?: { state: "KNOWN"; items: readonly string[] } | { state: "ABSENT" | "UNKNOWN"; items: readonly [] };
  dependencies?: { state: "KNOWN"; items: readonly string[] } | { state: "ABSENT" | "UNKNOWN"; items: readonly [] };
  preferences?: { continuation: "NO_AGENT" | "CUSTOM_TOOL" };
}
export function parseQuickTaskRequest(value: unknown): QuickTaskRequest;
export function requestFingerprint(request: QuickTaskRequest): string;
export function recipeSignature(recipe: QuickTaskRecipe): string;
export function patternId(request: QuickTaskRequest, recipe: QuickTaskRecipe, decision: ControllerDecision, impact: ControllerImpact): string;
```

- [ ] **Step 1: Write failing parser tests** — Parse the eligible fixture. Reject blank goal/owner, wrong version/type/complexity/boundary, unknown root/nested/symbol keys, invalid declaration state, and empty `KNOWN` relation/dependency lists.
- [ ] **Step 2: Create secret-free fixtures** — The eligible input is low/local, with known value/current local context and explicit absent links. The incomplete input omits value/context. Create high-complexity, no-Agent, and custom-tool variants; use neither credentials nor external URLs.
- [ ] **Step 3: Prove red** — Run `npm run build; node --test dist/test/controller-request.test.js`. Expected: missing parser/identity exports.
- [ ] **Step 4: Implement parser and hashes** — Follow own-key/prototype/array validation in `src/capabilities/manifest.ts`; use sorted-key canonical JSON plus `createHash("sha256")`. Full normalized request belongs only in `requestFingerprint`. Exclude goal, owner, value/context text, and item text from `patternId`; include type, recipe ID/version, decision, impact, complexity, and relation/dependency states.
- [ ] **Step 5: Add stability assertions and prove green** — Reorder source properties and expect identical identities; mutate goal/context and expect only `requestFingerprint` to change; mutate complexity/dependency state and expect `patternId` to change. Run `npm run build; node --test dist/test/controller-request.test.js`. Expected: PASS without rejected values in errors.

### Task 3: Implement the pure Controller evaluator

**Files:**
- Modify: `src/controller/types.ts`
- Create: `src/controller/evaluate.ts`
- Create: `test/controller-evaluate.test.ts`

**Interfaces:**

```ts
export type ControllerDecision = "RECOMMEND" | "PREPARE" | "NO_AGENT" | "NO_FIT" | "STOPPED";
export type ControllerImpact = "COMPATIBLE" | "DEGRADED" | "BREAKING" | "UNKNOWN";
export interface ControllerResponse {
  decision: ControllerDecision;
  impact: ControllerImpact;
  requiresAcknowledgement: boolean;
  reasons: readonly string[];
  requiredClarifications: readonly { field: "value" | "context" | "relations" | "dependencies"; rationale: string; severity: "REQUIRED"; decisionImpact: "BLOCKS_RECOMMENDATION" }[];
  recipe: { recipeId: "quick-task-clarifier-validator"; recipeVersion: "0.1.0"; status: "READY_WITH_LIMIT" };
  requestFingerprint: string;
  recipeSignature: string;
  patternId: string;
}
export function evaluateQuickTask(request: QuickTaskRequest, recipe: QuickTaskRecipe): ControllerResponse;
```

- [ ] **Step 1: Write failing decision tests** — Assert eligible gives `RECOMMEND`/`COMPATIBLE`; incomplete gives ordered `PREPARE` clarifications; high complexity gives `NO_FIT`; no-Agent gives `NO_AGENT` without acknowledgement; custom-tool gives `NO_AGENT`/`UNKNOWN` with acknowledgement; repeated calls are deeply equal; an incompatible recipe stops safely.
- [ ] **Step 2: Prove red** — Run `npm run build; node --test dist/test/controller-evaluate.test.js`. Expected: evaluator missing.
- [ ] **Step 3: Implement precedence** — Stop incompatible recipe metadata; honor no-Agent/custom-tool preference; return no-fit for `HIGH`; return prepare for missing, stale, or unknown DoR values in recipe declaration order; recommend only complete low/medium local work. Build every field from validated input and hashes; add no scoring, defaulting, I/O, or hidden state.
- [ ] **Step 4: Prove green** — Run `npm run build; node --test dist/test/controller-evaluate.test.js`. Expected: PASS and full-response equality.

### Task 4: Add the JSON-only CLI boundary

**Files:**
- Modify: `src/cli.ts`
- Create: `test/controller-cli.test.ts`

**Interface:** `npm run cli -- quick-task --input <explicit-local-file>`.

- [ ] **Step 1: Write failing built-CLI tests** — Use the repository's `spawn(process.execPath, ["dist/cli.js", ...argv])` pattern. Assert one JSON object on stdout and empty stderr: eligible/no-Agent/custom-tool exit `0`; incomplete/high exit `2`; malformed JSON returns `STOPPED` and `3`; unreadable input returns `STOPPED` and `4`. In a temporary directory containing only input, compare `readdir` before/after to prove no session/output artifact.
- [ ] **Step 2: Prove red** — Run `npm run build; node --test dist/test/controller-cli.test.js`. Expected: `quick-task` unknown.
- [ ] **Step 3: Implement isolated branch** — Accept exactly `quick-task --input <path>`. Read the named request plus fixed canonical recipe, parse/evaluate, and emit one newline-terminated JSON result. Map recommend/no-Agent to `0`, prepare/no-fit to `2`, and stopped to `3`. Catch only expected Controller errors, emit safe `STOPPED` JSON, use `4` for malformed args/unreadable path, and rethrow unexpected code failures. Do not change existing CLI behavior.
- [ ] **Step 4: Prove green** — Run `npm run build; node --test dist/test/controller-cli.test.js`. Expected: PASS and unchanged temporary directory.

### Task 5: Route and verify the bounded capability

**Files:**
- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/current-state.md`
- Review: all changed files

- [ ] **Step 1: Update routing after tests pass** — Add one documentation-map entry for the design and local capability. Update current-state with delivered behavior, checks, `READY_WITH_LIMIT`, Node compatibility caveat, and next action: separately review activation/session persistence. Do not claim live activation or connector readiness.
- [ ] **Step 2: Run narrow verification** — Run `npm run build` then `node --test dist/test/controller-recipe.test.js dist/test/controller-request.test.js dist/test/controller-evaluate.test.js dist/test/controller-cli.test.js`. Expected: PASS.
- [ ] **Step 3: Run repository gates** — Run `npm run lint`, `npm run build`, `npm run check:docs`, `npm test`, and `git diff --check`. Expected: PASS; report Node 26 as unsupported-engine evidence if still active.
- [ ] **Step 4: Review and hand off** — Run `git status --short`, `git diff --stat`, and `git diff -- contract/agent-library/quick-task-clarifier-validator.md src/controller src/cli.ts test docs/project`. Confirm no dependency/root-instruction/external path/raw request/session output change. Report evidence and leave changes uncommitted without a new explicit commit instruction.

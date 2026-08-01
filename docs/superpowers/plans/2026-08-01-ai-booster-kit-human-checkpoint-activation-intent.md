# AI Booster Kit Human Checkpoint and Activation Intent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, local human checkpoint that turns an explicit User choice into a non-persistent activation, alternative, or no-Agent Intent without activating an Agent or generating any artifact.

**Architecture:** `evaluateQuickTask` continues to own recommendation policy and adds a resolvable checkpoint only to a `RECOMMEND` response. A new closed choice parser and pure resolver validate choice semantics, acknowledgement, and the re-evaluated request/recipe signatures; `src/cli.ts` adapts them through `resolve-checkpoint --input <request.json> --choice <choice.json>` and emits exactly one JSON object.

**Tech Stack:** TypeScript 5.9, NodeNext, Node.js `>=22 <23`, built-in Node filesystem/process/test APIs, and the existing `yaml` dependency.

## Global Constraints

- The Controller remains advisory: this slice must not activate Agents, generate files, persist sessions, store patterns, call connectors, or access a network.
- Only a current `RECOMMEND` response exposes a resolvable checkpoint; `NO_AGENT`, `PREPARE`, `NO_FIT`, and `STOPPED` never do.
- The checkpoint has exactly `ACCEPT_RECOMMENDATION`, `REQUEST_ALTERNATIVE`, and `CONTINUE_WITHOUT_AGENT` choices.
- Input is closed, plain-object JSON. Unknown, inherited, symbol, malformed, and content-bearing error values fail closed without echoing input content.
- Re-evaluate the supplied request and canonical Markdown recipe before resolution; require exact current SHA-256 `requestFingerprint` and `recipeSignature` values from the explicit choice input.
- `ACCEPT_RECOMMENDATION` requires `acknowledgement: true` when the current impact is `UNKNOWN`, `DEGRADED`, or `BREAKING`; `UNKNOWN` is currently possible in Controller output, while `DEGRADED` and `BREAKING` remain reserved policy values.
- `REQUEST_ALTERNATIVE` requires a non-empty rationale; an alternative recipe is never selected implicitly.
- Preserve deterministic output: identical request, canonical recipe, and choice must produce deep-equal Intent JSON with no clock, random ID, environment, or persistent state.
- Do not add dependencies, modify `AGENTS.md`, change the existing `quick-task` no-write behavior, commit, push, or alter PR #10 without a fresh explicit User instruction.
- Run validation on the isolated Node 22 runtime at `C:\Users\littl\AppData\Local\AI-Booster-Kit\node-v22.23.2-win-x64` when it is still available.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/controller/types.ts` | Checkpoint, closed choice, Intent, and resolver-result TypeScript contracts. |
| `src/controller/checkpoint.ts` | Construct an exact three-option checkpoint from a `RECOMMEND` response only. |
| `src/controller/choice.ts` | Parse and validate the closed JSON choice object. |
| `src/controller/resolve.ts` | Pure signature, acknowledgement, and choice-to-Intent resolver. |
| `src/controller/evaluate.ts` | Attach a checkpoint only to the valid recommendation response. |
| `src/cli.ts` | Add the local `resolve-checkpoint` adapter and safe STOPPED mapping. |
| `test/controller-checkpoint.test.ts` | Checkpoint eligibility, exact choices, and deterministic response coverage. |
| `test/controller-choice.test.ts` | Closed choice parser and input-safety coverage. |
| `test/controller-resolve.test.ts` | Intent, stale-signature, alternative, no-Agent, and risk-acknowledgement coverage. |
| `test/controller-cli.test.ts` | Built CLI resolution and no-write integration coverage. |
| `test/fixtures/controller/*.json` | Secret-free request and choice fixtures. |
| `docs/project/documentation-map.md` | One routing sentence for the new local capability and reviewed artifacts. |
| `docs/project/current-state.md` | Current delivered behavior, validation, limit, and next bounded action after a fresh Git preflight. |

### Task 1: Define and emit the `RECOMMEND`-only checkpoint

**Files:**

- Modify: `src/controller/types.ts`
- Create: `src/controller/checkpoint.ts`
- Modify: `src/controller/evaluate.ts`
- Modify: `test/controller-evaluate.test.ts`
- Create: `test/controller-checkpoint.test.ts`

**Interfaces:**

```ts
export type CheckpointChoice =
  | "ACCEPT_RECOMMENDATION"
  | "REQUEST_ALTERNATIVE"
  | "CONTINUE_WITHOUT_AGENT";

export interface ControllerCheckpoint {
  decision: "RECOMMEND";
  impact: ControllerImpact;
  requiresAcknowledgement: boolean;
  choices: readonly [
    "ACCEPT_RECOMMENDATION",
    "REQUEST_ALTERNATIVE",
    "CONTINUE_WITHOUT_AGENT",
  ];
  recipe: ControllerResponse["recipe"];
  requestFingerprint: string;
  recipeSignature: string;
}

export interface ControllerResponse {
  // Preserve all current fields.
  checkpoint?: ControllerCheckpoint;
}

export function createCheckpoint(response: Omit<ControllerResponse, "checkpoint">): ControllerCheckpoint | undefined;
```

- [ ] **Step 1: Write the failing checkpoint tests**

```ts
assert.deepEqual(response.checkpoint?.choices, [
  "ACCEPT_RECOMMENDATION",
  "REQUEST_ALTERNATIVE",
  "CONTINUE_WITHOUT_AGENT",
]);
assert.equal(response.checkpoint?.requestFingerprint, response.requestFingerprint);
assert.equal(response.checkpoint?.recipeSignature, response.recipeSignature);
assert.equal(noAgent.checkpoint, undefined);
assert.equal(prepare.checkpoint, undefined);
assert.equal(noFit.checkpoint, undefined);
```

Also call `evaluateQuickTask` twice with the eligible fixture and assert deep equality of the entire response, including its checkpoint.

- [ ] **Step 2: Prove the test is red**

Run: `npm run build; node --test dist/test/controller-checkpoint.test.js`

Expected: FAIL because `checkpoint` and `createCheckpoint` do not exist.

- [ ] **Step 3: Implement the isolated checkpoint constructor**

```ts
const checkpointChoices = [
  "ACCEPT_RECOMMENDATION",
  "REQUEST_ALTERNATIVE",
  "CONTINUE_WITHOUT_AGENT",
] as const;

export function createCheckpoint(response: Omit<ControllerResponse, "checkpoint">): ControllerCheckpoint | undefined {
  if (response.decision !== "RECOMMEND") return undefined;
  return {
    decision: "RECOMMEND",
    impact: response.impact,
    requiresAcknowledgement: response.requiresAcknowledgement,
    choices: checkpointChoices,
    recipe: response.recipe,
    requestFingerprint: response.requestFingerprint,
    recipeSignature: response.recipeSignature,
  };
}
```

Construct the existing evaluator response first, then add `checkpoint: createCheckpoint(response)` only when the helper returns a value. Do not duplicate the checkpoint fields in decision branches and do not change current decision precedence.

- [ ] **Step 4: Prove the focused tests are green**

Run: `npm run build; node --test dist/test/controller-evaluate.test.js dist/test/controller-checkpoint.test.js`

Expected: PASS; all non-`RECOMMEND` outcomes have no checkpoint.

### Task 2: Parse the explicit, closed choice input

**Files:**

- Modify: `src/controller/types.ts`
- Create: `src/controller/choice.ts`
- Create: `test/controller-choice.test.ts`
- Create: `test/fixtures/controller/accept-recommendation.json`
- Create: `test/fixtures/controller/request-alternative.json`
- Create: `test/fixtures/controller/continue-without-agent.json`

**Interfaces:**

```ts
export type CheckpointChoiceInput =
  | {
      choice: "ACCEPT_RECOMMENDATION";
      expectedRequestFingerprint: string;
      expectedRecipeSignature: string;
      acknowledgement?: true;
    }
  | {
      choice: "REQUEST_ALTERNATIVE";
      expectedRequestFingerprint: string;
      expectedRecipeSignature: string;
      rationale: string;
    }
  | {
      choice: "CONTINUE_WITHOUT_AGENT";
      expectedRequestFingerprint: string;
      expectedRecipeSignature: string;
    };

export class ControllerCheckpointError extends Error {}
export function parseCheckpointChoice(value: unknown): CheckpointChoiceInput;
```

- [ ] **Step 1: Write failing closed-parser tests**

```ts
assert.deepEqual(parseCheckpointChoice(validAccept), validAccept);
assert.throws(() => parseCheckpointChoice({ ...validAlternative, rationale: "" }), /rationale must be a non-empty string/);
assert.throws(() => parseCheckpointChoice({ ...validAccept, acknowledgement: false }), /acknowledgement must be true/);
assert.throws(() => parseCheckpointChoice({ ...validNoAgent, extra: "do-not-echo" }), (error) =>
  error instanceof Error && /extra is not allowed/.test(error.message) && !error.message.includes("do-not-echo"),
);
```

Cover each choice's exact allowed key set, unknown choice, non-plain object, inherited key, non-lowercase-hex or non-64-character expected signature, blank rationale, and signature values that appear nowhere in an error message.

- [ ] **Step 2: Prove the test is red**

Run: `npm run build; node --test dist/test/controller-choice.test.js`

Expected: FAIL because `parseCheckpointChoice` does not exist.

- [ ] **Step 3: Implement the parser with choice-specific exact keys**

```ts
const signature = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new ControllerCheckpointError(`${field} must be a lowercase SHA-256 digest`);
  }
  return value;
};
```

Reuse the established plain-object, own-key, and non-empty-string validation style from `src/controller/request.ts`. Choose the exact key set after validating `choice`: accept permits `choice`, both expected signatures, and optional `acknowledgement: true`; alternative requires those three common keys plus `rationale`; no-Agent permits only the three common keys. Return a discriminated union and never retain extra fields.

- [ ] **Step 4: Create fixtures after the parser contract is green**

Create the three files with syntactically valid 64-character lowercase hexadecimal signature placeholders only for parser tests. In integration tests, derive the actual expected signatures from the first `quick-task` JSON response rather than coupling a fixture to an implementation hash.

- [ ] **Step 5: Prove the focused tests are green**

Run: `npm run build; node --test dist/test/controller-choice.test.js`

Expected: PASS with no input content echoed in rejection messages.

### Task 3: Resolve a fresh checkpoint into an output-only Intent

**Files:**

- Modify: `src/controller/types.ts`
- Create: `src/controller/resolve.ts`
- Create: `test/controller-resolve.test.ts`

**Interfaces:**

```ts
export type ControllerIntent =
  | {
      state: "ACTIVATION_INTENT";
      decision: "RECOMMEND";
      impact: ControllerImpact;
      choice: "ACCEPT_RECOMMENDATION";
      recipe: ControllerResponse["recipe"];
      requestFingerprint: string;
      recipeSignature: string;
      activationPerformed: false;
      artifactGenerationPerformed: false;
    }
  | {
      state: "ALTERNATIVE_REQUESTED";
      decision: "RECOMMEND";
      impact: ControllerImpact;
      choice: "REQUEST_ALTERNATIVE";
      rationale: string;
      recipe: ControllerResponse["recipe"];
      requestFingerprint: string;
      recipeSignature: string;
      activationPerformed: false;
      artifactGenerationPerformed: false;
    }
  | {
      state: "NO_AGENT_CONTINUATION";
      decision: "RECOMMEND";
      impact: ControllerImpact;
      choice: "CONTINUE_WITHOUT_AGENT";
      recipe: ControllerResponse["recipe"];
      requestFingerprint: string;
      recipeSignature: string;
      activationPerformed: false;
      artifactGenerationPerformed: false;
    };

export function resolveCheckpoint(response: ControllerResponse, choice: CheckpointChoiceInput): ControllerIntent;
```

- [ ] **Step 1: Write failing resolver tests for valid choices**

```ts
const response = evaluateQuickTask(eligibleRequest, recipe);
const expected = response.checkpoint;
assert.ok(expected);
assert.equal(resolveCheckpoint(response, accept(expected)).state, "ACTIVATION_INTENT");
assert.equal(resolveCheckpoint(response, alternative(expected, "Use a research-oriented recipe.")).state, "ALTERNATIVE_REQUESTED");
assert.equal(resolveCheckpoint(response, noAgent(expected)).state, "NO_AGENT_CONTINUATION");
```

For each result assert both `activationPerformed` and `artifactGenerationPerformed` are `false`, identifiers equal the re-evaluated response, and two calls with equal values are deeply equal.

- [ ] **Step 2: Add failing safety tests**

```ts
assert.throws(() => resolveCheckpoint(response, accept({ ...expected, expectedRequestFingerprint: differentDigest })), /CHECKPOINT_REQUEST_FINGERPRINT_MISMATCH/);
assert.throws(() => resolveCheckpoint(response, accept({ ...expected, expectedRecipeSignature: differentDigest })), /CHECKPOINT_RECIPE_SIGNATURE_MISMATCH/);
assert.throws(() => resolveCheckpoint(noFitResponse, noAgent(expected)), /CHECKPOINT_NOT_RESOLVABLE/);
assert.throws(() => resolveCheckpoint(riskyRecommendResponse, accept(riskyCheckpoint)), /CHECKPOINT_ACKNOWLEDGEMENT_REQUIRED/);
```

Build `riskyRecommendResponse` as an in-memory validated-shape `RECOMMEND` response with `impact: "UNKNOWN"` and `requiresAcknowledgement: true`; then prove that the same choice with `acknowledgement: true` returns `ACTIVATION_INTENT`. Repeat that assertion for `DEGRADED` and `BREAKING`. This tests the generic policy without falsely claiming that the current evaluator produces those recommendation impacts.

- [ ] **Step 3: Prove the tests are red**

Run: `npm run build; node --test dist/test/controller-resolve.test.js`

Expected: FAIL because `resolveCheckpoint` does not exist.

- [ ] **Step 4: Implement the fail-closed resolver**

```ts
const riskAcknowledgementRequired = (impact: ControllerImpact): boolean =>
  impact === "UNKNOWN" || impact === "DEGRADED" || impact === "BREAKING";

export function resolveCheckpoint(response: ControllerResponse, choice: CheckpointChoiceInput): ControllerIntent {
  if (response.decision !== "RECOMMEND" || response.checkpoint === undefined) {
    throw new ControllerCheckpointError("CHECKPOINT_NOT_RESOLVABLE");
  }
  if (choice.expectedRequestFingerprint !== response.requestFingerprint) {
    throw new ControllerCheckpointError("CHECKPOINT_REQUEST_FINGERPRINT_MISMATCH");
  }
  if (choice.expectedRecipeSignature !== response.recipeSignature) {
    throw new ControllerCheckpointError("CHECKPOINT_RECIPE_SIGNATURE_MISMATCH");
  }
  if (choice.choice === "ACCEPT_RECOMMENDATION" && riskAcknowledgementRequired(response.impact) && choice.acknowledgement !== true) {
    throw new ControllerCheckpointError("CHECKPOINT_ACKNOWLEDGEMENT_REQUIRED");
  }
  // Return one explicit immutable Intent shape per discriminant.
}
```

Use only the fresh response values in returned identities. Copy alternative rationale only for `ALTERNATIVE_REQUESTED`; do not add timestamps, generated IDs, files, or persistence.

- [ ] **Step 5: Prove the focused tests are green**

Run: `npm run build; node --test dist/test/controller-resolve.test.js`

Expected: PASS, including stale request, stale recipe, non-resolvable, and all three risk-impact acknowledgement cases.

### Task 4: Add the local JSON-only resolution CLI

**Files:**

- Modify: `src/cli.ts`
- Modify: `test/controller-cli.test.ts`

**Interface:** `npm run cli -- resolve-checkpoint --input <explicit-local-request.json> --choice <explicit-local-choice.json>`.

- [ ] **Step 1: Write failing built-CLI tests**

```ts
const initial = JSON.parse((await runBuiltCli(["quick-task", "--input", requestPath])).stdout);
await writeFile(choicePath, JSON.stringify({
  choice: "ACCEPT_RECOMMENDATION",
  expectedRequestFingerprint: initial.checkpoint.requestFingerprint,
  expectedRecipeSignature: initial.checkpoint.recipeSignature,
}));
const before = await readdir(root);
const result = await runBuiltCli(["resolve-checkpoint", "--input", requestPath, "--choice", choicePath]);
assert.equal(result.code, 0);
assert.equal(JSON.parse(result.stdout).state, "ACTIVATION_INTENT");
assert.deepEqual(await readdir(root), before);
```

Add integrations for `REQUEST_ALTERNATIVE` with rationale, `CONTINUE_WITHOUT_AGENT`, a missing-rationale choice, altered request content using the old fingerprint, a malformed choice JSON, and a `PREPARE` request. Assert every stopped result is one stdout JSON object with `decision: "STOPPED"`, empty stderr, no temporary-directory change, and a non-zero exit.

- [ ] **Step 2: Prove the test is red**

Run: `npm run build; node --test dist/test/controller-cli.test.js`

Expected: FAIL because `resolve-checkpoint` is an unknown command.

- [ ] **Step 3: Implement an isolated CLI branch**

```ts
if (command === "resolve-checkpoint") return runResolveCheckpoint(argv.slice(1));

async function runResolveCheckpoint(argv: readonly string[]): Promise<number> {
  // Accept exactly: --input <path> --choice <path>.
  // Read both explicit files, parse closed JSON, re-load the canonical recipe,
  // re-evaluate, resolve, emit one JSON Intent, and return 0.
  // Map expected controller/checkpoint failures to safe STOPPED JSON and 3.
}
```

Accept no alternative argument order, extra option, inline JSON, output path, or session option. Reuse the established safe unreadable-path and malformed-JSON behavior, create a distinct safe error code for choice path/JSON failure, and preserve every pre-existing command's output and exit behavior.

- [ ] **Step 4: Prove the CLI tests are green**

Run: `npm run build; node --test dist/test/controller-cli.test.js`

Expected: PASS with one JSON object per path and no file other than test-created request/choice inputs.

### Task 5: Update routing and run proportionate verification

**Files:**

- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/current-state.md`
- Review: all changed source, test, fixture, and documentation files

- [ ] **Step 1: Update the documentation map after the implementation is green**

Add one concise sentence that the Controller also has a local, output-only `resolve-checkpoint` command and link the approved design and plan. Do not make these planning artifacts default runtime context.

- [ ] **Step 2: Refresh the routing-only current state from live local Git evidence**

Run: `git branch --show-current; git log --oneline -5; git status --short`

Then revise only current-state’s Controller paragraph, validation, known limit, and next bounded action to reflect the actual branch/PR publication status discovered by that command. State that checkpoint resolution creates no activation, persistence, artifact, connector, or external action; retain `READY_WITH_LIMIT`; name actual checks; set the next slice to separately designed activation execution or session persistence. Do not copy raw inputs, test output, or transcript into the document.

- [ ] **Step 3: Run narrow verification on Node 22**

Run:

```powershell
$node22 = 'C:\Users\littl\AppData\Local\AI-Booster-Kit\node-v22.23.2-win-x64'
& "$node22\npm.cmd" run build
& "$node22\node.exe" --test dist/test/controller-evaluate.test.js dist/test/controller-checkpoint.test.js dist/test/controller-choice.test.js dist/test/controller-resolve.test.js dist/test/controller-cli.test.js
```

Expected: all selected tests PASS.

- [ ] **Step 4: Run repository gates on Node 22**

Run:

```powershell
$node22 = 'C:\Users\littl\AppData\Local\AI-Booster-Kit\node-v22.23.2-win-x64'
& "$node22\npm.cmd" run lint
& "$node22\npm.cmd" run check:docs
& "$node22\npm.cmd" test
git diff --check
```

Expected: all commands exit `0`; record if the isolated Node 22 path is unavailable rather than treating a Node 26 run as engine-compatible evidence.

- [ ] **Step 5: Perform scope review and hand off without publication**

Run:

```powershell
git status --short
git diff --stat
git diff -- src/controller src/cli.ts test/controller-*.test.ts test/fixtures/controller docs/project
```

Confirm the diff has no dependency, root instruction, contract recipe, external path, raw request, artifact-output, session-store, or connector change. Report changed files, test evidence, remaining `READY_WITH_LIMIT` boundaries, and leave all changes uncommitted until the User explicitly authorizes a commit.

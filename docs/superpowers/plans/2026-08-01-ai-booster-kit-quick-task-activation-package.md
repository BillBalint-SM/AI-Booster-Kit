# AI Booster Kit Quick Task Activation Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit `activate-quick-task` command that re-evaluates a local Quick Task checkpoint and issues a deterministic, host-agnostic, ephemeral Agent Activation Package for one selected profile.

**Architecture:** The command receives the original request, explicit checkpoint choice, and required profile; it reloads the canonical recipe, evaluates the request, resolves the choice, and passes only a fresh `ACTIVATION_INTENT` to a pure package builder. The builder emits one JSON package with validated request declarations and a profile-specific operating contract. No host runtime, artifact writer, session store, connector, network call, or persistence layer is added.

**Tech Stack:** TypeScript 5.9, NodeNext, Node.js `>=22 <23`, built-in Node filesystem/process/test APIs, existing SHA-256 identity helpers, and the existing `yaml` dependency.

## Global Constraints

- The Controller remains advisory: this slice must not activate Agents, generate files, persist sessions, store patterns, call connectors, or access a network.
- The command must re-load the canonical Quick Task recipe and re-evaluate the original request before package issuance; a previously emitted Intent is never sufficient by itself.
- A package is issued only from a current `ACTIVATION_INTENT` created by the exact three-choice checkpoint flow.
- Exactly four explicit profiles are supported: `clarify`, `research`, `planning`, and `validation`; no default or inferred profile exists.
- Missing profile-specific information remains `UNKNOWN`; the package must not fabricate DoR, DoD, AC, evidence, facts, targets, findings, or completion.
- The successful package status is `EPHEMERAL_PACKAGE_ISSUED`; `hostActivationPerformed`, `artifactGenerationPerformed`, and `persistencePerformed` are all `false`.
- The package builder is pure: no filesystem, clock, random identifier, environment, network, connector, or host dependency.
- Invalid command shape, unreadable files, malformed JSON, invalid profile, stale signatures, non-activation choices, and missing acknowledgements fail closed with one safe JSON result on stdout and a non-zero exit.
- Errors must not echo request content, raw context, credentials, arbitrary file contents, or signature values.
- Do not add dependencies, modify `AGENTS.md`, alter existing `quick-task` or `resolve-checkpoint` behavior, commit, push, or create a PR without a fresh explicit User instruction.
- Run validation on the isolated Node 22 runtime at `C:\Users\littl\AppData\Local\AI-Booster-Kit\node-v22.23.2-win-x64` when it is available.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/controller/types.ts` | Add the closed activation-profile, package-input, profile-contract, package, and activation-package error types. |
| `src/controller/activation-package.ts` | Parse the required profile and build the deterministic package from a fresh activation intent. |
| `src/cli.ts` | Add the explicit `activate-quick-task` command, strict argument handling, local JSON reads, fresh evaluation/resolution, and safe JSON error mapping. |
| `test/controller-activation-package.test.ts` | Verify profile parsing, pure package construction, deterministic output, request projection, profile contracts, and fail-closed builder behavior. |
| `test/controller-activation-package-cli.test.ts` | Verify the built CLI's fresh re-evaluation, four profiles, invalid inputs, non-activation choices, output shape, exit codes, and no-write behavior. |
| `docs/project/documentation-map.md` | Add one routing sentence for the new local Activation Package command and approved artifacts. |
| `docs/project/current-state.md` | Refresh the routing-only current delivery state after implementation and live Git preflight. |

### Task 1: Define the pure Activation Package contract and profile catalogue

**Files:**

- Modify: `src/controller/types.ts`
- Create: `src/controller/activation-package.ts`
- Create: `test/controller-activation-package.test.ts`

**Interfaces:**

```ts
export type ActivationProfile = "clarify" | "research" | "planning" | "validation";

export type ActivationIntent = Extract<ControllerIntent, { state: "ACTIVATION_INTENT" }>;

export interface QuickTaskActivationInput {
  goal: string;
  outcomeOwner: string;
  value: Exclude<QuickTaskRequest["value"], undefined>;
  context: Exclude<QuickTaskRequest["context"], undefined>;
  relations: LinkDeclaration;
  dependencies: LinkDeclaration;
}

export interface ActivationProfileContract {
  requiredSections: readonly string[];
  unknownPolicy: "PRESERVE_AS_UNKNOWN";
  resultState: "NOT_STARTED";
}

export interface QuickTaskActivationPackage {
  activationVersion: "1.0";
  state: "EPHEMERAL_PACKAGE_ISSUED";
  retention: "EPHEMERAL";
  profile: ActivationProfile;
  recipe: ControllerRecipeIdentity;
  intent: {
    state: "ACTIVATION_INTENT";
    requestFingerprint: string;
    recipeSignature: string;
  };
  agent: {
    role: "quick-task-clarifier-validator";
    mode: "assist";
    input: QuickTaskActivationInput;
    outputContract: ActivationProfileContract;
    instructions: readonly string[];
    stopConditions: readonly string[];
    executionBoundary: "LOCAL_ONLY";
  };
  operations: {
    packageIssued: true;
    hostActivationPerformed: false;
    artifactGenerationPerformed: false;
    persistencePerformed: false;
  };
}

export class ControllerActivationPackageError extends Error {}
export function parseActivationProfile(value: unknown): ActivationProfile;
export function createQuickTaskActivationPackage(
  request: QuickTaskRequest,
  intent: ActivationIntent,
  profile: ActivationProfile,
): QuickTaskActivationPackage;
```

- [ ] **Step 1: Write the failing profile and package tests**

```ts
const profiles = ["clarify", "research", "planning", "validation"] as const;
const intent = resolveCheckpoint(response, acceptedChoice(response));

for (const profile of profiles) {
  const result = createQuickTaskActivationPackage(request, intent, profile);
  assert.equal(result.state, "EPHEMERAL_PACKAGE_ISSUED");
  assert.equal(result.profile, profile);
  assert.deepEqual(result.operations, {
    packageIssued: true,
    hostActivationPerformed: false,
    artifactGenerationPerformed: false,
    persistencePerformed: false,
  });
  assert.equal(result.agent.outputContract.unknownPolicy, "PRESERVE_AS_UNKNOWN");
  assert.equal(result.agent.outputContract.resultState, "NOT_STARTED");
}

assert.throws(() => parseActivationProfile(undefined), /profile is required/);
assert.throws(() => parseActivationProfile("default"), /profile must be one of/);
assert.deepEqual(
  createQuickTaskActivationPackage(request, intent, "planning"),
  createQuickTaskActivationPackage(request, intent, "planning"),
);
```

Also assert that the package input contains only `goal`, `outcomeOwner`, `value`, `context`, `relations`, and `dependencies`; it contains no preferences, timestamps, generated IDs, transcript, result, or completion claim. Assert the exact required-section arrays for all four profiles:

```ts
const expectedSections = {
  clarify: ["DoR", "DoD", "Acceptance Criteria", "evidence", "relations", "dependencies", "closure"],
  research: ["research question", "known facts", "UNKNOWNs", "hypotheses", "source/evidence plan", "findings", "residual unknowns"],
  planning: ["goal framing", "options", "dependencies", "steps", "risks", "decision points", "residual unknowns"],
  validation: ["claims", "acceptance conditions", "evidence plan", "findings", "differences", "residual unknowns"],
} as const;
```

Prove the builder rejects an `ALTERNATIVE_REQUESTED` or `NO_AGENT_CONTINUATION` value, an activation intent whose request fingerprint does not equal `requestFingerprint(request)`, and a request missing any of the six projected activation-input declarations. Error messages must contain stable codes and no request values.

- [ ] **Step 2: Run the focused tests to confirm they fail**

Run:

```powershell
npm run build
node --test dist/test/controller-activation-package.test.js
```

Expected: FAIL because the activation package types, parser, and builder do not exist yet.

- [ ] **Step 3: Add the closed profile and package types**

Add the interfaces above to `src/controller/types.ts`. Use the existing discriminated `ControllerIntent`, `QuickTaskRequest`, `LinkDeclaration`, and `ControllerRecipeIdentity` types rather than duplicating their fields. Keep package operation flags as literal `true`/`false` types so TypeScript prevents a future success result from claiming host activation or persistence.

- [ ] **Step 4: Implement deterministic profile definitions and the pure builder**

In `src/controller/activation-package.ts`, define one immutable profile catalogue with the exact required-section arrays above and profile-specific instructions. Each profile must include these deterministic instructions:

```ts
const commonInstructions = [
  "Preserve the supplied goal and outcome owner; do not expand scope.",
  "Treat missing or conflicting information as UNKNOWN; do not infer completion.",
  "Return only the selected profile contract and distinguish facts, hypotheses, decisions, and unknowns.",
] as const;
```

Use profile-specific instruction additions that name the selected contract. Use the same stop conditions for every profile:

```ts
const stopConditions = [
  "STOP on scope expansion, external action, unresolved contradiction, or invented completion.",
  "STOP when required evidence is unavailable and report the affected field as UNKNOWN.",
] as const;
```

`parseActivationProfile` must accept only the four literal strings and reject missing, non-string, and unknown values. `createQuickTaskActivationPackage` must:

1. reject every intent state other than `ACTIVATION_INTENT`;
2. compare `intent.requestFingerprint` with the existing `requestFingerprint(request)` helper;
3. reject absent `value`, `context`, `relations`, or `dependencies` declarations rather than manufacturing them;
4. copy only the six allowed request declarations into `agent.input`;
5. select the immutable profile contract and instructions by the required explicit profile;
6. return the exact `EPHEMERAL_PACKAGE_ISSUED` shape with all three execution flags set to `false`.

Do not read files, access the clock or environment, generate IDs, mutate input objects, or include profile results in the package.

- [ ] **Step 5: Run the focused pure-package tests**

Run:

```powershell
npm run build
node --test dist/test/controller-activation-package.test.js
```

Expected: PASS, including all four profiles, deterministic deep equality, exact input projection, unknown-preservation contract, and builder rejection paths.

### Task 2: Add the explicit `activate-quick-task` CLI command

**Files:**

- Modify: `src/cli.ts`
- Create: `test/controller-activation-package-cli.test.ts`

**Interface:**

```text
npm run cli -- activate-quick-task --input <request.json> --choice <choice.json> --profile <profile>
```

The parser accepts exactly six arguments after the command, in that order: `--input`, path, `--choice`, path, `--profile`, literal profile. It accepts no output path, inline JSON, save flag, session flag, alternative argument order, or extra argument.

- [ ] **Step 1: Write failing built-CLI tests for successful activation-package issuance**

Create `test/controller-activation-package-cli.test.ts` with a temporary directory and the existing eligible request fixture. First run the existing built `quick-task` command, derive the actual checkpoint fingerprints from its JSON response, and write one explicit accepted choice file. For each profile, run:

```ts
const result = await runBuiltCli([
  "activate-quick-task",
  "--input", inputPath,
  "--choice", choicePath,
  "--profile", profile,
]);

assert.equal(result.code, 0);
assert.equal(result.stderr, "");
const packageResult = JSON.parse(result.stdout);
assert.equal(packageResult.state, "EPHEMERAL_PACKAGE_ISSUED");
assert.equal(packageResult.profile, profile);
assert.equal(packageResult.operations.hostActivationPerformed, false);
```

Assert stdout parses as exactly one JSON object, the package has no result field, and the temporary directory contains only the test-created request and choice files.

- [ ] **Step 2: Add failing CLI safety-path tests**

Cover each of these cases with a non-zero exit, empty stderr, one stdout JSON object, `state` absent or equal to `STOPPED` according to the error shape, and no filesystem change:

- missing `--profile`;
- invalid profile `default`;
- extra argument after a valid profile;
- unreadable request path;
- malformed request JSON;
- malformed choice JSON;
- stale request fingerprint;
- stale recipe signature;
- `REQUEST_ALTERNATIVE` choice;
- `CONTINUE_WITHOUT_AGENT` choice;
- a valid request that evaluates to `PREPARE`;
- a valid request with `preferences.continuation: NO_AGENT`;
- a risky in-memory resolution that lacks acknowledgement where the resolver already enforces that gate.

For the stale-request case, write the valid choice from the initial checkpoint, mutate only the request goal, then invoke `activate-quick-task`; the command must re-evaluate and stop rather than trust the old checkpoint. Assert no error output contains the goal, path contents, or signature value.

- [ ] **Step 3: Run the new CLI tests to confirm they fail**

Run:

```powershell
npm run build
node --test dist/test/controller-activation-package-cli.test.js
```

Expected: FAIL because `activate-quick-task` is not yet dispatched.

- [ ] **Step 4: Implement the strict CLI dispatch and command adapter**

In `src/cli.ts`:

1. add `activate-quick-task` to `helpText`;
2. dispatch the exact command name to `runActivateQuickTask`;
3. validate the exact argument order and return `COMMAND_CONFIGURATION_INVALID` with exit `4` for any mismatch;
4. read only the two explicit paths with the existing `readFile` and system-error classification;
5. parse request and choice JSON separately without echoing source content;
6. parse the required profile with `parseActivationProfile`;
7. reload `contract/agent-library/quick-task-clarifier-validator.md` through `loadQuickTaskRecipe`;
8. call `evaluateQuickTask(parseQuickTaskRequest(requestInput), recipe)`;
9. call `resolveCheckpoint(response, parseCheckpointChoice(choiceInput))`;
10. require `intent.state === "ACTIVATION_INTENT"` before calling the builder;
11. call `createQuickTaskActivationPackage` and write exactly one JSON object plus one newline with `process.stdout.write(JSON.stringify(package) + "\\n");`;
12. map request, recipe, evaluation, checkpoint, and activation-package failures to one safe `STOPPED` JSON object and non-zero exit `3`.

Use stable error codes such as `ACTIVATION_PROFILE_INVALID`, `ACTIVATION_INTENT_REQUIRED`, `ACTIVATION_INPUT_PATH_UNREADABLE`, `ACTIVATION_CHOICE_PATH_UNREADABLE`, `ACTIVATION_INPUT_JSON_INVALID`, and `ACTIVATION_CHOICE_JSON_INVALID`. Do not change the existing `quick-task` or `resolve-checkpoint` branches.

- [ ] **Step 5: Run the built CLI tests**

Run:

```powershell
npm run build
node --test dist/test/controller-activation-package-cli.test.js dist/test/controller-cli.test.js
```

Expected: PASS for the new activation command and all pre-existing Controller CLI behavior, including output-only resolution.

### Task 3: Add routing documentation and refresh current delivery state

**Files:**

- Modify: `docs/project/documentation-map.md`
- Modify: `docs/project/current-state.md`

- [ ] **Step 1: Add the documentation-map routing sentence**

Add one concise sentence stating that the Controller now exposes the explicit local `activate-quick-task --input <request.json> --choice <choice.json> --profile <profile>` command, which issues an ephemeral host-agnostic package only after fresh evaluation and `ACTIVATION_INTENT`. Link the approved design and implementation plan. State that these remain review artifacts and are not default runtime context.

- [ ] **Step 2: Refresh current-state from a fresh Git preflight**

Run:

```powershell
& C:\Users\littl\.agents\tools\work-state-preflight.ps1 -RepositoryPath (Get-Location).Path -OutputFormat Markdown
```

Then update only the routing-relevant current-state sections to reflect the actual branch, HEAD, worktree, upstream, and PR status. Record that the Activation Package command issues no host activation, generated artifact, persistence, connector call, external read, or external write. Keep the capability `READY_WITH_LIMIT` and name the next bounded slices as separately designed host adaptation/execution or explicit package saving.

- [ ] **Step 3: Run documentation checks**

Run:

```powershell
npm run check:docs
```

Expected: PASS with all newly added relative links resolved.

### Task 4: Run the complete verification and scope review

**Files:**

- Review: `src/controller/types.ts`
- Review: `src/controller/activation-package.ts`
- Review: `src/cli.ts`
- Review: `test/controller-activation-package.test.ts`
- Review: `test/controller-activation-package-cli.test.ts`
- Review: `docs/project/documentation-map.md`
- Review: `docs/project/current-state.md`

- [ ] **Step 1: Run the focused Controller test set on Node 22**

Run:

```powershell
$node22 = 'C:\Users\littl\AppData\Local\AI-Booster-Kit\node-v22.23.2-win-x64'
& "$node22\npm.cmd" run build
& "$node22\node.exe" --test dist/test/controller-evaluate.test.js dist/test/controller-checkpoint.test.js dist/test/controller-choice.test.js dist/test/controller-resolve.test.js dist/test/controller-activation-package.test.js dist/test/controller-activation-package-cli.test.js dist/test/controller-cli.test.js
```

Expected: all selected tests PASS.

- [ ] **Step 2: Run the repository quality gates on Node 22**

Run:

```powershell
$node22 = 'C:\Users\littl\AppData\Local\AI-Booster-Kit\node-v22.23.2-win-x64'
& "$node22\npm.cmd" run lint
& "$node22\npm.cmd" run check:docs
& "$node22\npm.cmd" test
git diff --check
```

Expected: every command exits `0`. If the isolated Node 22 path is unavailable, record the exact limitation and do not present another Node version as engine-compatible evidence.

- [ ] **Step 3: Review the final diff and current state**

Run:

```powershell
git status --short
git diff --stat
git diff -- src/controller/types.ts src/controller/activation-package.ts src/cli.ts test/controller-activation-package.test.ts test/controller-activation-package-cli.test.ts docs/project/documentation-map.md docs/project/current-state.md
```

Confirm that the diff contains no dependency, root instruction, host adapter, connector, network, output-directory, session-store, package-save, multi-Agent, or external-target change; no raw request content or secret-like value is logged; and no existing command behavior changed. Leave the worktree uncommitted until the User explicitly authorizes publication.

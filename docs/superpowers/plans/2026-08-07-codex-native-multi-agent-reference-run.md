# Codex-Native Multi-Agent Reference Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for repository preparation. Use Codex-native subagents only in Task 4, where the accepted runtime contract explicitly requires two parallel workers, one checker, and at most one bounded repair worker.

**Goal:** Execute and preserve the first read-only Codex-native reference run of the Agent-Agnostic Execution Contract, then compare it with a strong single-agent control performed under the same source, scope, acceptance criteria, authority, and evidence rules.

**Architecture:** The deterministic Kernel from the companion plan remains the only canonical state authority. A small reference adapter produces two run preparations from the same audit contract: a one-node main-task control and a bounded four-node multi-agent graph. The active Codex task executes the control itself, orchestrates native Codex subagents for the multi-agent graph, passes exact JSON payloads through the Kernel CLI, and keeps canonical run data in an explicit Personal directory. Repository promotion contains only a reviewed normalized receipt and happens only after a separate user decision.

**Tech Stack:** Existing Node.js 26.x/TypeScript Kernel, one dependency-free Node `.mjs` reference adapter, `node:test`, PowerShell orchestration commands, native Codex app subagent operations, Git, and the existing documentation checks. No API model, external LLM, Agents SDK, connector, MCP, plugin, or new dependency.

## Global Constraints

- The approved design is `docs/superpowers/specs/2026-08-07-codex-native-multi-agent-runtime-design.md`.
- This plan depends on complete, green implementation of `docs/superpowers/plans/2026-08-07-agent-agnostic-execution-contract-kernel.md`.
- Preferred branch sequence: review and integrate the Kernel slice to fresh `main`, then use `superpowers:using-git-worktrees` to create a unique `dev-codex-native-reference-run` worktree. If the Kernel is not on `main`, stop unless the user explicitly approves a stacked branch rooted at the exact reviewed Kernel commit; record that base in the handoff.
- All reasoning workers run inside the Codex app. Repository code creates contracts and validates state; it never starts, selects, or calls an agent.
- Execute the strong single-agent control first. Do not show its substantive findings to multi-agent workers or the checker.
- During both audit runs: repository write `NONE`, external read/write `NONE`, source allowlist `repo` only, retention `PERSONAL`, and no agent recursively spawns another agent.
- Use the same committed source revision, goal, scope, non-goals, acceptance criteria, source locator, authority, and required evidence kinds in both runs.
- The multi-agent graph has two parallel workers, one checker, main-task synthesis, and at most one checker-initiated repair worker. Maximum parallel subagents is two.
- A malformed, foreign, stale, oversized, scope-widening, or forbidden result stops the affected run. Do not rewrite a worker answer into compliance, retry blindly, or widen authority.
- Worker and checker prompts contain only `PreparedExecutionNode` JSON plus a short instruction to return one Result Envelope JSON object. Never persist prompts, transcripts, hidden reasoning, raw collaboration messages, or arbitrary tool output.
- `TEAM` promotion is not implied by a successful Personal run. It requires a separate review of exact hashes and separate explicit user approval.
- Do not modify `AGENTS.md`, agent profiles, skills, plugins, global Codex configuration, or external systems.
- Commit, push, PR, and merge are separate approval boundaries. This plan may prepare changes for review but does not authorize publication.
- Context7 and external documentation are not used: this plan exercises project-internal contracts and currently available Codex-native host operations, not version-sensitive third-party APIs.

## Stop Conditions

Stop without retry or fallback when any of the following occurs:

- Kernel plan or required tests are not green;
- the live host cannot report a stable semantic Node runtime;
- source revision changes, audited paths are dirty, or the active worktree is ambiguous;
- the Personal root is absent and creation is not authorized by the accepted execution plan;
- a target run directory already exists;
- native Codex spawn fails or does not return an agent ID;
- an active agent cannot be authoritatively identified after interruption;
- a worker result is not one exact JSON object;
- Kernel validation rejects a packet, result, graph mutation, artifact, checkpoint, or final handoff;
- a worker accesses an external source, writes a repository file, requests broader scope, or attempts delegation;
- the checker reports an unresolved conflict that cannot be represented honestly as `UNKNOWN` or `COMPLETE_WITH_LIMIT`; or
- the user cancels.

On a host failure, call `stop-execution` once with the exact allowlisted code, interrupt known active agents where possible, preserve Personal evidence, and report the stopped or unknown state. Do not auto-restart.

## File Map

| File | Responsibility |
| --- | --- |
| `scripts/create-codex-native-reference-preparation.mjs` | Produces exact single- or multi-agent preparation JSON from mandatory run ID, source revision, and repository locator. |
| `test/execution-reference-adapter.test.ts` | Validates both preparations through the real Kernel and covers argument, identity, graph, and no-write boundaries. |
| `docs/operations/codex-native-multi-agent-runbook.md` | Human-operable Codex-native sequence, stop protocol, Personal evidence map, and promotion boundary. |
| `%LOCALAPPDATA%\AI Booster Kit\execution-runs\<runId>` | Canonical Personal run store; never added to Git. |
| `docs/history/host-conformance/<date>-codex-native-readonly-audit.md` | Optional normalized TEAM receipt created only after explicit promotion approval. |
| `docs/project/current-state.md` | Routing status updated only from verified live evidence and only after promotion approval. |

---

### Task 1: Add the bounded reference-preparation adapter

**Files:**
- Create: `scripts/create-codex-native-reference-preparation.mjs`
- Create: `test/execution-reference-adapter.test.ts`

**Interfaces:**
- Consumes: mandatory `--mode`, `--run-id`, `--source-revision`, and `--repository-locator` arguments.
- Produces: one compact JSON object `{ envelope, graph }` on stdout and no files.

- [ ] **Step 1: Write failing adapter tests**

Create `test/execution-reference-adapter.test.ts`. Spawn the source script with `process.execPath`, parse stdout, and validate it through `createExecutionEnvelope` and `createExecutionGraph`:

```ts
test("reference adapter: creates comparable single and multi preparations", () => {
  const sourceRevision = "b".repeat(40);
  const single = runReferenceAdapter("SINGLE_AGENT", "run-reference-single", sourceRevision);
  const multi = runReferenceAdapter("MULTI_AGENT", "run-reference-multi", sourceRevision);

  const singleEnvelope = createExecutionEnvelope(single.envelope);
  const multiEnvelope = createExecutionEnvelope(multi.envelope);
  const singleGraph = createExecutionGraph(single.graph, singleEnvelope);
  const multiGraph = createExecutionGraph(multi.graph, multiEnvelope);

  assert.equal(singleGraph.nodes.length, 1);
  assert.equal(singleGraph.nodes[0]?.type, "SYNTHESIS");
  assert.deepEqual(
    multiGraph.nodes.map((node) => node.nodeId),
    ["audit-controller", "audit-context", "checker", "synthesis"],
  );
  assert.deepEqual(
    {
      goal: singleEnvelope.goal,
      scope: singleEnvelope.scope,
      nonGoals: singleEnvelope.nonGoals,
      acceptanceCriteria: singleEnvelope.acceptanceCriteria,
      sourceRevision: singleEnvelope.sourceRevision,
      sources: singleEnvelope.sources,
      authority: singleEnvelope.authority,
      requiredEvidenceKinds: singleEnvelope.requiredEvidenceKinds,
    },
    {
      goal: multiEnvelope.goal,
      scope: multiEnvelope.scope,
      nonGoals: multiEnvelope.nonGoals,
      acceptanceCriteria: multiEnvelope.acceptanceCriteria,
      sourceRevision: multiEnvelope.sourceRevision,
      sources: multiEnvelope.sources,
      authority: multiEnvelope.authority,
      requiredEvidenceKinds: multiEnvelope.requiredEvidenceKinds,
    },
  );
});

test("reference adapter: requires exact arguments and emits no write authority", () => {
  const failed = spawnSync(process.execPath, [scriptPath, "--mode", "MULTI_AGENT"], { encoding: "utf8" });
  assert.notEqual(failed.status, 0);
  const prepared = runReferenceAdapter("MULTI_AGENT", "run-reference-multi", "b".repeat(40));
  assert.deepEqual(prepared.envelope.authority, {
    repositoryWrite: "NONE",
    externalWrite: "NONE",
    agentExecution: "CODEX_NATIVE_ONLY",
  });
  assert.deepEqual(prepared.envelope.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"]);
});
```

The test helper must pass all four arguments explicitly, require exit code zero, reject stderr, and parse exactly one JSON object. Do not use a shell.

- [ ] **Step 2: Run the focused test and observe the missing script failure**

Run:

```powershell
npm run build
node --test dist/test/execution-reference-adapter.test.js
```

Expected: FAIL because the adapter script does not exist.

- [ ] **Step 3: Implement the dependency-free reference adapter**

Create `scripts/create-codex-native-reference-preparation.mjs` with one strict argument parser and two single-purpose graph builders. Required rules:

- reject missing, duplicate, unknown, or empty arguments;
- accept mode only as `SINGLE_AGENT` or `MULTI_AGENT`;
- require run IDs to match `^[a-z0-9][a-z0-9-]{2,79}$`;
- require a 40- or 64-character lowercase hexadecimal source revision;
- emit no timestamps, random values, environment values, paths, or files;
- use the same goal, scope, non-goals, three acceptance criteria, source, authority, evidence kinds, stop conditions, and allowed final states for both modes;
- set retention to `PERSONAL`;
- single mode: one ready-root `SYNTHESIS` node, `maxNodes: 1`, `maxParallel: 1`, `maxRepairNodes: 0`, `maxCheckerRepairCycles: 0`, `maxDispatches: 0`;
- multi mode: the exact two-worker/checker/synthesis graph from the Kernel test fixture, `maxNodes: 5`, `maxParallel: 2`, `maxRepairNodes: 1`, `maxCheckerRepairCycles: 1`, `maxDispatches: 4`;
- both modes: `maxResultBytes: 131072` and `maxWallClockMs: 1800000`; and
- all initial nodes enter as `PENDING`; the Kernel derives readiness.

End with exactly:

```js
process.stdout.write(`${JSON.stringify({ envelope, graph })}\n`);
```

The script must not import network, child-process, filesystem-write, model, or agent libraries.

- [ ] **Step 4: Run positive and negative adapter checks**

Run:

```powershell
npm run build
node --test dist/test/execution-reference-adapter.test.js
node scripts/create-codex-native-reference-preparation.mjs --mode MULTI_AGENT --run-id run-reference-smoke --source-revision bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb --repository-locator "AI Booster Kit"
```

Expected: test PASS; manual command emits one JSON object containing no hash fields because the Kernel binds them.

- [ ] **Step 5: Review and optionally commit the adapter slice**

Run:

```powershell
git diff -- scripts/create-codex-native-reference-preparation.mjs test/execution-reference-adapter.test.ts
git diff --check
```

With explicit commit approval only:

```powershell
git add scripts/create-codex-native-reference-preparation.mjs test/execution-reference-adapter.test.ts
git commit -m "test: add codex native reference preparation"
```

---

### Task 2: Add the Codex-native operating runbook and freeze the run revision

**Files:**
- Create: `docs/operations/codex-native-multi-agent-runbook.md`

**Interfaces:**
- Consumes: the approved design, built Kernel commands, native Codex collaboration operations, and the reference adapter.
- Produces: one non-duplicative operating procedure that links to the canonical design and names exact run, stop, evidence, and promotion steps.

- [ ] **Step 1: Write the runbook**

Create `docs/operations/codex-native-multi-agent-runbook.md` with these sections:

1. purpose and non-goals;
2. prerequisite Kernel commands and required green checks;
3. immutable source gate;
4. Personal-root gate;
5. single-agent control sequence;
6. two-worker, checker, optional repair, and main-synthesis sequence;
7. exact Result Envelope-only response rule;
8. dispatch/spawn failure matrix;
9. resume decision boundary;
10. comparison procedure;
11. normalized TEAM-promotion allowlist; and
12. limitations: no external model, no cross-session conformance proof, no write-capable agent, no cross-host claim.

Link to the approved design and both implementation plans instead of restating their full schemas. Include the exact nine Kernel CLI commands and the reference-adapter command. State that Codex collaboration operations are host actions performed by the main task, not repository functions.

- [ ] **Step 2: Run documentation checks**

Run:

```powershell
npm run check:docs
git diff --check
```

Expected: PASS.

- [ ] **Step 3: Run all pre-live gates**

Run:

```powershell
npm run lint
npm run build
npm test
npm run check:docs
git diff --check
```

Expected: PASS. Preserve exact Node version and test counts.

- [ ] **Step 4: Obtain the immutable-revision approval boundary**

Present the adapter, test, runbook, full gate results, and exact diff to the user. The live reference run requires these files and the Kernel to exist at one immutable Git revision. Therefore stop here unless the user separately authorizes the necessary commit or points to an already committed equivalent revision.

With commit approval only, commit every still-uncommitted reviewed preparation file together:

```powershell
git add scripts/create-codex-native-reference-preparation.mjs test/execution-reference-adapter.test.ts docs/operations/codex-native-multi-agent-runbook.md
git commit -m "feat: add codex native reference run"
```

Do not push or merge.

- [ ] **Step 5: Re-run work-state and exact source gates after the commit**

Run:

```powershell
& (Join-Path $env:USERPROFILE '.agents\tools\work-state-preflight.ps1') -RepositoryPath (Get-Location).Path -OutputFormat Markdown
$sourceRevision = (git rev-parse HEAD).Trim()
$nodeVersion = (& node --version).Trim()
if ($nodeVersion -notmatch '^v\d+\.\d+\.\d+$') { throw "Reference run requires a detectable stable Node runtime" }
git status --short -- src/controller src/context src/execution contract/agent-library scripts/create-codex-native-reference-preparation.mjs docs/operations/codex-native-multi-agent-runbook.md
git show --no-patch --format='%H' HEAD
npm run build
```

Expected: preflight identifies the intended repository, branch, HEAD, and upstream; the scoped status output is empty; `git show` equals `$sourceRevision`; build passes. Any mismatch stops the run.

- [ ] **Step 6: Validate or create the explicit Personal root**

Use the literal user-local target, never `$HOME`, `~`, or a repository directory:

```powershell
$personalRoot = Join-Path $env:LOCALAPPDATA 'AI Booster Kit\execution-runs'
$parentRoot = Split-Path -Parent $personalRoot
if (-not (Test-Path -LiteralPath $parentRoot -PathType Container)) { throw "Personal parent root is missing: $parentRoot" }
if (-not (Test-Path -LiteralPath $personalRoot)) { New-Item -ItemType Directory -LiteralPath $personalRoot | Out-Null }
$resolvedPersonalRoot = (Resolve-Path -LiteralPath $personalRoot).Path
```

Then let `prepare-execution` perform its own non-symlink and path-containment validation. If the parent is missing, stop and request direction rather than creating a broader directory tree.

---

### Task 3: Execute the strong single-agent control first

**Files:**
- Create outside repository: `%LOCALAPPDATA%\AI Booster Kit\execution-runs\run-codex-audit-single-<shortRevision>`
- Modify repository: none

**Interfaces:**
- Consumes: the exact committed source, single preparation, and main Codex task.
- Produces: one Kernel-validated Personal run with no subagent dispatches.

- [ ] **Step 1: Prepare the control run without exposing findings**

Run:

```powershell
$shortRevision = $sourceRevision.Substring(0, 12)
$singleRunId = "run-codex-audit-single-$shortRevision"
$singleRunDirectory = Join-Path $resolvedPersonalRoot $singleRunId
if (Test-Path -LiteralPath $singleRunDirectory) { throw "Single control run target already exists" }
$singlePreparation = & node scripts/create-codex-native-reference-preparation.mjs --mode SINGLE_AGENT --run-id $singleRunId --source-revision $sourceRevision --repository-locator 'AI Booster Kit'
$singlePreparation | & node dist/cli.js prepare-execution --personal-root $resolvedPersonalRoot
```

Expected: normalized `READY` JSON for `$singleRunId`; no repository file changes.

- [ ] **Step 2: Prepare and record the main-task synthesis node**

Run:

```powershell
$singlePreparedNode = & node dist/cli.js prepare-execution-node --run $singleRunDirectory --node synthesis | ConvertFrom-Json
& node dist/cli.js record-execution-dispatch --run $singleRunDirectory --node synthesis --task $singlePreparedNode.taskPacket.taskId --thread-ref main
```

Expected: the prepared context array is empty and the node becomes `RUNNING`. This is main-task execution, so it consumes zero subagent dispatch budget.

- [ ] **Step 3: Perform the complete audit in the main Codex task**

The main task reads only the packet scope at `$sourceRevision` and produces one exact Result Envelope JSON object. It must:

- inspect Controller/formation/activation/bounded-execution evidence;
- inspect context/persistence/fan-in/checkpoint/resume evidence;
- identify missing capabilities and unknowns;
- cite normalized repository paths and stable line ranges;
- make no repository or external write;
- use no external source; and
- keep all material claims within the three accepted criteria.

Do not invoke `spawn_agent`, reuse any prior audit conclusions, or reveal this result to later workers.

- [ ] **Step 4: Admit the exact control result and finalize**

Pipe the exact Result Envelope through stdin, without manually normalizing a rejected response:

```powershell
$singleResultJson | & node dist/cli.js accept-execution-result --run $singleRunDirectory
$singleFinalHandoffJson | & node dist/cli.js finalize-execution --run $singleRunDirectory
```

The final handoff must derive every claim and evidence reference from the accepted synthesis result. Mark elapsed or token metrics `MEASURED` only if the Codex host provides exact evidence; otherwise store each unavailable metric as `UNKNOWN` with `null` value.

- [ ] **Step 5: Read back and preserve the control state**

Run:

```powershell
$singleRuntime = Join-Path $env:TEMP "execution-runtime-$singleRunId.json"
@{ sourceRevision = $sourceRevision; availableThreadRefs = @('main'); activeThreadRefs = @(); observedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress | Set-Content -LiteralPath $singleRuntime -Encoding utf8NoBOM
& node dist/cli.js check-execution-resume --run $singleRunDirectory --runtime $singleRuntime
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $singleRunDirectory 'artifacts\final-handoff.json'), (Join-Path $singleRunDirectory 'artifacts\final-handoff.md')
git status --short -- src/controller src/context contract/agent-library
```

Expected: terminal run is not resumable as active work, final handoff hash exists, and audited repository paths remain clean. Remove the exact temporary runtime file only after its content is no longer needed; never use a wildcard.

---

### Task 4: Execute the Codex-native Multi-Agent Pipeline

**Files:**
- Create outside repository: `%LOCALAPPDATA%\AI Booster Kit\execution-runs\run-codex-audit-multi-<shortRevision>`
- Modify repository: none

**Interfaces:**
- Consumes: two root `PreparedExecutionNode` objects, exact Codex agent IDs, accepted worker artifacts, one checker packet, and optionally one Kernel-admitted repair packet.
- Produces: one validated fan-out/fan-in run with main-task synthesis.

- [ ] **Step 1: Prepare the multi-agent run and two root packets**

Run:

```powershell
$multiRunId = "run-codex-audit-multi-$shortRevision"
$multiRunDirectory = Join-Path $resolvedPersonalRoot $multiRunId
if (Test-Path -LiteralPath $multiRunDirectory) { throw "Multi-agent run target already exists" }
$multiPreparation = & node scripts/create-codex-native-reference-preparation.mjs --mode MULTI_AGENT --run-id $multiRunId --source-revision $sourceRevision --repository-locator 'AI Booster Kit'
$multiPreparation | & node dist/cli.js prepare-execution --personal-root $resolvedPersonalRoot
$controllerPacket = & node dist/cli.js prepare-execution-node --run $multiRunDirectory --node audit-controller
$contextPacket = & node dist/cli.js prepare-execution-node --run $multiRunDirectory --node audit-context
$controllerPreparedNode = $controllerPacket | ConvertFrom-Json
$contextPreparedNode = $contextPacket | ConvertFrom-Json
$controllerTaskId = $controllerPreparedNode.taskPacket.taskId
$contextTaskId = $contextPreparedNode.taskPacket.taskId
```

Expected: both context arrays are empty; task IDs, envelope hash, and graph revision are exact and distinct where required.

- [ ] **Step 2: Spawn exactly two independent native Codex workers**

Use native `spawn_agent` twice, with read-only ownership and no delegated write scope:

- Worker A owns inspection of `src/controller` and `contract/agent-library` only.
- Worker B owns inspection of `src/context` only.
- Both receive their exact `PreparedExecutionNode` JSON.
- Both are told they are not alone, must not modify files, must not spawn agents, must not use external sources, and must return only one Result Envelope JSON object.

After each spawn returns an actual agent ID, immediately record it:

```powershell
& node dist/cli.js record-execution-dispatch --run $multiRunDirectory --node audit-controller --task $controllerTaskId --thread-ref "codex-agent:$controllerAgentId"
& node dist/cli.js record-execution-dispatch --run $multiRunDirectory --node audit-context --task $contextTaskId --thread-ref "codex-agent:$contextAgentId"
```

If either spawn fails or a dispatch cannot be recorded, interrupt every known active worker, call `stop-execution --code CODEX_SPAWN_FAILED`, and stop. Do not spawn a replacement.

- [ ] **Step 3: Wait, validate, and admit both worker results independently**

Use native waits in intervals no longer than 60 seconds and keep the user informed during ongoing work. Do not pass one worker's result to the other. For each completed worker:

1. preserve the exact final response;
2. require exactly one JSON object and no surrounding prose;
3. pipe it unchanged to `accept-execution-result`;
4. stop on rejection rather than editing the payload; and
5. verify the saved artifact hash from the Personal manifest.

Only after both nodes are `SUCCEEDED` may the checker become `READY`.

- [ ] **Step 4: Prepare and run the checker on accepted artifacts only**

Run:

```powershell
$checkerPreparedNode = & node dist/cli.js prepare-execution-node --run $multiRunDirectory --node checker
```

Expected: `contextArtifacts` contains exactly the two accepted predecessor Result Envelopes and hashes. Spawn one native checker with that exact prepared object. Its objective is completeness, provenance, contradictions, unsupported claims, and visible unknowns. It must not access raw worker conversation, modify files, use external sources, or spawn agents.

Record the returned checker agent ID, wait, and admit its exact Result Envelope through the same dispatch and acceptance commands.

- [ ] **Step 5: Admit at most one checker-initiated repair**

If `followupRequest` is `null`, skip this step. If it is non-null:

1. verify it names one concrete missing repository fact and stays inside existing scope;
2. construct one `GraphMutationProposal` whose new `AGENT_TASK` node has `repairOf: "checker"`;
3. add edges `checker -> repair-1` and `repair-1 -> synthesis` without removing `checker -> synthesis`;
4. pipe the exact proposal to `propose-execution-repair`;
5. prepare the admitted repair node;
6. spawn exactly one native repair worker;
7. record its actual agent ID and admit its exact result; and
8. do not re-run the checker.

A rejected proposal, a second follow-up, or an unresolved conflict becomes a stop or visible final limit; it never widens the graph.

- [ ] **Step 6: Execute main-task synthesis from accepted context**

Run:

```powershell
$synthesisPreparedNode = & node dist/cli.js prepare-execution-node --run $multiRunDirectory --node synthesis
$synthesisPreparedNodeValue = $synthesisPreparedNode | ConvertFrom-Json
& node dist/cli.js record-execution-dispatch --run $multiRunDirectory --node synthesis --task $synthesisPreparedNodeValue.taskPacket.taskId --thread-ref main
```

Expected: context includes accepted worker results, the accepted checker verdict, and the accepted repair result only when repair occurred. The main task produces one synthesis Result Envelope, pipes it unchanged to `accept-execution-result`, constructs the Final Execution Handoff solely from accepted evidence, and calls `finalize-execution`.

- [ ] **Step 7: Read back the multi-agent ledger and run state**

Create a temporary runtime JSON listing `main` and every actual normalized Codex agent reference as available, with no active threads. Run:

```powershell
& node dist/cli.js check-execution-resume --run $multiRunDirectory --runtime $multiRuntime
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $multiRunDirectory 'artifacts\final-handoff.json'), (Join-Path $multiRunDirectory 'artifacts\final-handoff.md')
git status --short -- src/controller src/context contract/agent-library
```

Verify from the ledger and checkpoint:

- two parallel root agent dispatches;
- one checker dispatch;
- zero or one repair dispatch;
- one main synthesis execution;
- no exceeded node, parallelism, dispatch, repair, or wall-clock budget;
- exact thread references and artifact hashes;
- no rejected artifact used as context; and
- no repository change in audited scope.

Cross-session resume remains `NOT_EXECUTED`; this read-back proves only same-session deterministic state reconstruction.

---

### Task 5: Compare the control and multi-agent runs without a superiority claim

**Files:**
- Modify repository: none
- Read Personal: both run directories

**Interfaces:**
- Consumes: two terminal `LoadedExecutionRun` values with matching comparison identity.
- Produces: one deterministic comparison report on stdout and a human evaluation tied to its hashable inputs.

- [ ] **Step 1: Run the Kernel comparator**

Run:

```powershell
$comparisonJson = & node dist/cli.js compare-execution-runs --single $singleRunDirectory --multi $multiRunDirectory
$comparison = $comparisonJson | ConvertFrom-Json
$comparisonJson
```

Expected: `comparable: true` and `goalIdentityMatch: true`. A different source, scope, authority, criteria, or evidence contract is a failed comparison, not a warning.

- [ ] **Step 2: Evaluate the bounded outcome**

Report facts separately from judgment:

- supported claim count;
- conflict and unknown counts;
- unique accepted repository evidence count;
- subagent dispatch count;
- repair count;
- measured elapsed/token values only where both runs contain evidence, otherwise `UNKNOWN`;
- whether the checker found a material issue absent from the control;
- whether the multi-agent handoff materially improved coverage, contradiction detection, or evidence traceability; and
- coordination overhead and any information loss.

Possible conclusion values are `MULTI_AGENT_BETTER_FOR_THIS_RUN`, `NO_MATERIAL_GAIN`, `SINGLE_AGENT_BETTER_FOR_THIS_RUN`, or `INCONCLUSIVE`. None is a universal architecture verdict.

- [ ] **Step 3: Perform final local scope and security checks**

Run:

```powershell
rg -n "api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|secret|transcript|prompt|reasoning|cookie|password" "$singleRunDirectory" "$multiRunDirectory"
git status --short
git diff --check
```

Expected: no forbidden Personal content; repository status differs only by already reviewed plan/implementation work; no run artifact exists under Git. If the denylist scan finds a match, inspect only the normalized field location, stop promotion, and do not paste the value into logs or chat.

---

### Task 6: Review and optionally promote a normalized TEAM receipt

**Files:**
- Create only after approval: `docs/history/host-conformance/<date>-codex-native-readonly-audit.md`
- Modify only after approval: `docs/project/current-state.md`

**Interfaces:**
- Consumes: exact run IDs, envelope/graph/final-handoff hashes, comparison output, verification commands, and known limits.
- Produces: a human-reviewed repository receipt with no raw agent content.

- [ ] **Step 1: Present the promotion packet and request a separate decision**

Before any TEAM write, present:

- exact committed source revision;
- single and multi run IDs and final states;
- envelope, graph, ledger-tip, accepted artifact, final-handoff, and comparison hashes;
- normalized accepted claims and repository evidence map;
- rejected decisions, unknowns, conflicts, limits, and failures;
- exact test and read-back commands;
- assurance that Personal raw prompts/transcripts were never stored; and
- proposed receipt path and current-state wording.

Ask for explicit approval to promote only this normalized allowlisted material. If approval is withheld, leave repository files unchanged and hand off the Personal paths and hashes.

- [ ] **Step 2: Create the normalized receipt after approval only**

The receipt may contain:

- source revision and Codex host profile;
- contract and graph identities;
- normalized agent references, not conversation content;
- event and artifact hashes;
- accepted claim-to-evidence mappings;
- final states, comparison metrics, and bounded conclusion;
- exact known limits and `NOT_EXECUTED` claims; and
- verification commands.

It must not contain prompts, transcripts, hidden reasoning, raw tool output, arbitrary absolute Personal paths, credentials, account data, or external URLs collected by workers.

- [ ] **Step 3: Update current routing truth conservatively**

Modify `docs/project/current-state.md` to record:

- deterministic Kernel and exact reference run complete only if their evidence passed;
- Codex-native two-worker/checker/main-synthesis profile verified for this read-only envelope;
- comparator conclusion for this run only;
- cross-session resume, write-capable execution, other hosts, and external connectors still `NOT_EXECUTED` or `UNKNOWN`; and
- next bounded action.

The delivered runtime remains `READY_WITH_LIMIT` until separate interruption-and-resume conformance passes.

- [ ] **Step 4: Verify the promoted diff**

Run:

```powershell
npm run check:docs
git diff --check
rg -n "api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|secret|transcript|prompt|reasoning|cookie|password" docs/history/host-conformance docs/project/current-state.md
git diff -- docs/history/host-conformance docs/project/current-state.md
& (Join-Path $env:USERPROFILE '.agents\tools\work-state-preflight.ps1') -RepositoryPath (Get-Location).Path -OutputFormat Markdown
```

Expected: documentation checks pass, the diff contains only normalized promotion material, and work state is fresh.

- [ ] **Step 5: Optional commit and publication boundaries**

With separate commit approval only:

```powershell
git add docs/history/host-conformance docs/project/current-state.md
git commit -m "docs: record codex native reference run"
```

After a commit, re-run work-state preflight. Do not push, open a PR, or merge without their own explicit authorization.

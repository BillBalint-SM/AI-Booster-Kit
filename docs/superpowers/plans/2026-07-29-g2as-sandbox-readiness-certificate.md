# G2AS Sandbox Readiness Certificate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, read-only G2AS Sandbox Readiness Certificate generator that evaluates a fixed Jira–Confluence–GitHub evidence bundle and emits equivalent Markdown and JSON `READY`, `NOT READY`, or `STOPPED` results without any external write.

**Architecture:** Add a narrow `src/readiness/` module family above the existing target-identity and safe-evidence utilities. The runtime accepts one literal, secret-free G2AS manifest and host-collected normalized observations; it does not contain an OAuth client, browser driver, generic search, or connector write path. A pure evaluator produces the complete certificate, a renderer serializes it deterministically, and a CLI command writes only local output files.

**Tech Stack:** Node.js 22 LTS, TypeScript 5.9 ESM, `node:test`, existing Ajv/YAML dependencies, native `node:crypto` and `node:fs/promises`; no new runtime dependency.

## Global Constraints

- Governing design: `docs/superpowers/specs/2026-07-29-g2as-sandbox-readiness-certificate-design.md`.
- The only accepted target is `https://pte-politechnika.atlassian.net`, Jira project `G2AS`, Confluence space `G2AS`, and GitHub repository `BillBalint-SM/ultimate-longshot-gate2-sandbox`.
- Frozen traceability facts are Jira issue `G2AS-1`, Confluence page `31752193`, Git SHA `d0971f75c526250f9ee65b8b3b044a4788b31a46`, and fixtures `docs/fixtures/G2AS-1.md` and `docs/fixtures/G2AS-1.json`.
- The only certificate decisions are `READY`, `NOT READY`, and `STOPPED`; per-check states are `verified`, `unknown`, and `mismatch`.
- The generator accepts host-collected normalized observations only. It does not perform OAuth, MCP, browser, REST, Rovo, Jira, Confluence, or GitHub I/O.
- Every observation names its declared read path as `mcp` or `tenant_aware_chrome`; test-only in-memory fixtures must not be emitted as a live read path.
- Do not accept credentials, authorization headers, cookies, raw page bodies, raw MCP payloads, transcripts, arbitrary URLs, additional target records, wildcards, or unknown object properties.
- Target mismatch, ambiguity, unverifiable scope/capability, broadening request, forbidden path, and a second unknown identical read-back are hard `STOPPED` conditions. No code path offers `Continue` for a hard stop.
- The generated certificate must state `externalWriteCount: 0`. Local Markdown/JSON output is permitted and must be explicit through a supplied output directory.
- Reuse existing secret-safe error and fingerprinting conventions. Do not log or render source values that are not approved native IDs or fixed target values.
- No default parameter values; make every parameter explicit. Do not add catch-all recovery that masks an error.
- Tests use fixtures and in-memory adapters only. A real read-only G2AS run remains a later, separately authorized execution step.
- Do not create a git commit unless the user explicitly requests one; leave implementation changes reviewable in the working tree.
- Approved clarification: Jira and Confluence evidence must expose the exact credential-free HTTPS `tenantOrigin`; traceability evidence must expose the resolved Git SHA for the Jira link, the resolved Jira key for the Confluence Jira reference, and the resolved Git SHA for the Confluence Git reference. Hostname-only and non-empty-link-ID evidence cannot produce `READY`.

---

## File and module map

### Contract and fixture inputs

- Create `contract/readiness/g2as-sandbox-target.json`: exact, secret-free target and frozen traceability manifest.
- Create `test/fixtures/readiness/ready.json`: complete normalized evidence bundle.
- Create `test/fixtures/readiness/not-ready.json`: safe incomplete evidence bundle with one `unknown` check.
- Create `test/fixtures/readiness/stopped.json`: safe target-isolation hard-stop evidence bundle.
- Create `test/fixtures/readiness/unsafe-observation.json`: rejected credential/transcript fixture.

### Runtime

- Create `src/readiness/types.ts`: all certificate, manifest, observation, adapter, and decision discriminated-union types.
- Create `src/readiness/manifest.ts`: strict parsing and literal-target validation for the checked-in manifest.
- Create `src/readiness/observations.ts`: strict normalized observation-bundle parsing, safe evidence validation, and injected read-only adapter contract.
- Create `src/readiness/evaluate.ts`: pure per-source and cross-system readiness decision logic.
- Create `src/readiness/render.ts`: deterministic JSON-safe value and Markdown rendering from one evaluated certificate.
- Create `src/readiness/run.ts`: local orchestration from manifest plus observation adapter to rendered certificate values; this module has no network or credential interface.
- Modify `src/cli.ts`: add the `readiness` command, strict argument parsing, local input reads, local output writes, and terminal-state exit codes.

### Tests and documentation

- Create `test/readiness-manifest.test.ts`: literal target, unknown-field, URL, and unsafe-content rejection tests.
- Create `test/readiness-observations.test.ts`: adapter/bundle validation, no-live-path, and evidence-safe tests.
- Create `test/readiness-evaluate.test.ts`: `READY`, `NOT READY`, `STOPPED`, traceability, and no-write tests.
- Create `test/readiness-render.test.ts`: JSON/Markdown semantic equivalence and fingerprint-only rendering tests.
- Create `test/readiness-cli.test.ts`: built CLI output, exit-code, and local-output tests.
- Modify `test/bootstrap.test.ts`: include `readiness` in CLI help assertions.
- Modify `contract/team-contract.md`: add a `Sandbox readiness certificate` local-read capability that does not claim connector synchronization or external write support.
- Create `docs/runbooks/g2as-sandbox-readiness-certificate.md`: collection protocol, output interpretation, hard-stop handling, and the explicit future live-read approval gate.

---

### Task 1: Define the fixed G2AS manifest and strict readiness types

**Files:**
- Create: `contract/readiness/g2as-sandbox-target.json`
- Create: `src/readiness/types.ts`
- Create: `src/readiness/manifest.ts`
- Test: `test/readiness-manifest.test.ts`

**Interfaces:**
- Produces `G2asReadinessManifest`, `SourceName`, `CheckState`, `CertificateDecision`, and `ReadPath` for every later task.
- Produces `parseG2asReadinessManifest(value: unknown): G2asReadinessManifest`.
- Produces `loadG2asReadinessManifest(path: string): Promise<G2asReadinessManifest>` for the CLI in Task 4.

- [ ] **Step 1: Write the manifest-validation tests.**

  Add tests that load the literal manifest and assert the four fixed chain
  values. Add negative tests for a second target record, an extra object field,
  `http:`, credentials in a URL, a wildcard, and a `token` key. Each failure
  must identify only the rejected field category, never the received value.

  ```ts
  assert.throws(
    () => parseG2asReadinessManifest({ ...validManifest, extraTarget: "x" }),
    /approved fields/,
  );
  assert.throws(
    () => parseG2asReadinessManifest({ ...validManifest, tenantUrl: "https://u:p@pte-politechnika.atlassian.net" }),
    /credential-free HTTPS/,
  );
  ```

- [ ] **Step 2: Run the focused test before implementation.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/readiness-manifest.test.js
  ```

  Expected: FAIL because the readiness modules do not yet exist.

- [ ] **Step 3: Add the exact manifest.**

  Create one JSON object with exactly these keys:

  ```json
  {
    "version": 1,
    "tenantUrl": "https://pte-politechnika.atlassian.net",
    "jira": { "projectKey": "G2AS", "issueKey": "G2AS-1", "expectedStatus": "To Do" },
    "confluence": { "spaceKey": "G2AS", "pageId": "31752193" },
    "github": {
      "repository": "BillBalint-SM/ultimate-longshot-gate2-sandbox",
      "branch": "main",
      "commit": "d0971f75c526250f9ee65b8b3b044a4788b31a46",
      "fixturePaths": ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"]
    }
  }
  ```

- [ ] **Step 4: Implement strict parser and types.**

  In `src/readiness/types.ts`, define:

  ```ts
  export type SourceName = "jira" | "confluence" | "github" | "traceability";
  export type CheckState = "verified" | "unknown" | "mismatch";
  export type CertificateDecision = "READY" | "NOT READY" | "STOPPED";
  export type ReadPath = "mcp" | "tenant_aware_chrome";

  export interface G2asReadinessManifest {
    version: 1;
    tenantUrl: string;
    jira: { projectKey: "G2AS"; issueKey: "G2AS-1"; expectedStatus: "To Do" };
    confluence: { spaceKey: "G2AS"; pageId: "31752193" };
    github: { repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox"; branch: "main"; commit: string; fixturePaths: [string, string] };
  }
  ```

  Implement `parseG2asReadinessManifest` with exact-key validation. Require
  the literal values above, a lowercase 40-character SHA, two unique fixture
  paths in the stated order, and an HTTPS credential-free origin with no path,
  query, or fragment. `loadG2asReadinessManifest` must parse JSON from the
  explicit supplied file path and route filesystem errors as configuration
  errors at the CLI boundary rather than silently choosing another file.

- [ ] **Step 5: Run the Task 1 gate.**

  Run:

  ```powershell
  npm run lint
  npm run build
  node --test dist/test/readiness-manifest.test.js
  ```

  Expected: all manifest tests pass and no network listener, `fetch`, or
  credential provider is created.

### Task 2: Parse normalized read-only observations behind an injected adapter

**Files:**
- Create: `src/readiness/observations.ts`
- Create: `test/fixtures/readiness/ready.json`
- Create: `test/fixtures/readiness/not-ready.json`
- Create: `test/fixtures/readiness/stopped.json`
- Create: `test/fixtures/readiness/unsafe-observation.json`
- Test: `test/readiness-observations.test.ts`

**Interfaces:**
- Consumes `G2asReadinessManifest`, `SourceName`, `CheckState`, and `ReadPath` from Task 1.
- Produces `ReadinessObservation`, `ReadinessObservationBundle`, `ReadinessAdapter`, and `parseReadinessObservationBundle(value: unknown): ReadinessObservationBundle`.
- Produces `readObservations(adapter: ReadinessAdapter, manifest: G2asReadinessManifest): Promise<ReadinessObservationBundle>` for Task 5.

- [ ] **Step 1: Write failing observation tests.**

  Test a valid bundle containing exactly four observations; a missing source;
  duplicate source; an unknown read path; unsafe evidence text; and an adapter
  that increments a sentinel only when explicitly called. Assert the parser
  rejects raw values and the adapter interface contains no credential, URL, or
  write-operation argument.

  ```ts
  assert.throws(
    () => parseReadinessObservationBundle(unsafeBundle),
    /unsafe evidence/,
  );
  await readObservations(adapter, manifest);
  assert.equal(adapterCalls, 1);
  ```

- [ ] **Step 2: Run the focused test before implementation.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/readiness-observations.test.js
  ```

  Expected: FAIL because `parseReadinessObservationBundle` and
  `readObservations` do not yet exist.

- [ ] **Step 3: Define the normal form and adapter boundary.**

  Use these exact interfaces:

  ```ts
  export interface ReadinessObservation {
    source: SourceName;
    state: CheckState;
    readPath: ReadPath;
    capabilityState: "verified" | "unknown";
    observedIds: Record<string, string>;
    evidenceRefs: string[];
    diagnosticCode: "NONE" | "CAPABILITY_UNKNOWN" | "TARGET_MISMATCH" | "TRACEABILITY_MISMATCH" | "TIMEOUT_UNKNOWN" | "SCOPE_UNVERIFIED";
    observedAt: string;
  }

  export interface ReadinessObservationBundle {
    correlationId: string;
    runAt: string;
    observations: [ReadinessObservation, ReadinessObservation, ReadinessObservation, ReadinessObservation];
  }

  export interface ReadinessAdapter {
    read(manifest: G2asReadinessManifest): Promise<ReadinessObservationBundle>;
  }
  ```

  `readObservations` must call the supplied adapter exactly once, then parse
  the returned bundle. It must not retry, call `fetch`, resolve credentials, or
  transform a source failure into a positive observation.

- [ ] **Step 4: Implement strict observation parsing and fixtures.**

  Require the exact source set `jira`, `confluence`, `github`, `traceability`;
  unique non-empty evidence references; ISO timestamps; `mcp` or
  `tenant_aware_chrome` only; and an allowlisted set of stable-ID fields per
  source. Reuse `assertSafeEvidenceRefs` before accepting references. Reject
  values containing credential, authorization, cookie, token, password, raw
  transcript, or arbitrary URL markers. The `ready.json` fixture must contain
  safe IDs and fixed native evidence references only; it must not contain any
  fixture credential.

- [ ] **Step 5: Run the Task 2 gate.**

  Run:

  ```powershell
  npm run lint
  npm run build
  node --test dist/test/readiness-observations.test.js
  ```

  Expected: valid bundles parse, every malformed or unsafe bundle fails, and
  no external request is possible from this module.

### Task 3: Evaluate exact target and traceability readiness

**Files:**
- Create: `src/readiness/evaluate.ts`
- Test: `test/readiness-evaluate.test.ts`

**Interfaces:**
- Consumes `G2asReadinessManifest` from Task 1 and `ReadinessObservationBundle` from Task 2.
- Produces `ReadinessCheck`, `ReadinessCertificate`, and `evaluateReadiness(manifest: G2asReadinessManifest, bundle: ReadinessObservationBundle): ReadinessCertificate`.

- [ ] **Step 1: Write failing evaluator tests.**

  Cover the ready fixture; one unknown capability; Jira tenant/project mismatch;
  GitHub repository or SHA mismatch; missing Jira-to-Git reference; missing
  Confluence-to-Jira/Git reference; `TIMEOUT_UNKNOWN`; and a forbidden read
  path. The tests must prove that all source checks appear in the result and
  the external write count is always zero.

  ```ts
  const result = evaluateReadiness(manifest, stoppedBundle);
  assert.equal(result.decision, "STOPPED");
  assert.equal(result.externalWriteCount, 0);
  assert.deepEqual(result.decisionOptions, ["Stop"]);
  ```

- [ ] **Step 2: Run the focused test before implementation.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/readiness-evaluate.test.js
  ```

  Expected: FAIL because `evaluateReadiness` does not yet exist.

- [ ] **Step 3: Define certificate values and deterministic fingerprints.**

  Define:

  ```ts
  export interface ReadinessCheck {
    name: SourceName;
    state: CheckState;
    expectedFingerprint: string;
    observedFingerprint: string;
    readPath: ReadPath;
    capabilityState: "verified" | "unknown";
    diagnosticCode: ReadinessObservation["diagnosticCode"];
    evidenceRefs: string[];
    nextAction: string;
  }

  export interface ReadinessCertificate {
    certificateVersion: 1;
    decision: CertificateDecision;
    correlationId: string;
    runAt: string;
    manifestFingerprint: string;
    externalWriteCount: 0;
    checks: [ReadinessCheck, ReadinessCheck, ReadinessCheck, ReadinessCheck];
    unchangedSystems: ["jira", "confluence", "github"];
    remediation: string[];
    decisionOptions: ["Stop"] | ["Continue", "Stop"];
  }
  ```

  Fingerprint expected and observed stable-ID objects using SHA-256 over
  canonical JSON with sorted keys. Never return the unapproved input object or
  a raw observed field.

- [ ] **Step 4: Implement evaluator rules.**

  Compare observation IDs to the literal manifest fields:

  - Jira verifies tenant origin, `G2AS`, `G2AS-1`, and `To Do`.
  - Confluence verifies the same tenant, `G2AS`, and page `31752193`.
  - GitHub verifies the exact repository, `main`, frozen SHA, and two fixture
    paths in order.
  - Traceability verifies that the native Jira-to-Git reference uses the exact
    SHA and that Confluence names both `G2AS-1` and the same SHA.

  `TARGET_MISMATCH`, `SCOPE_UNVERIFIED`, `TIMEOUT_UNKNOWN`, unknown capability,
  a non-literal read path, or an unsafe/ambiguous observation gives `STOPPED`
  and `decisionOptions: ["Stop"]`. A completed safe mismatch or unknown gives
  `NOT READY`; all four verified checks give `READY` with bounded
  `decisionOptions: ["Continue", "Stop"]`. Build remediation strings from
  diagnostic codes only, never from raw runtime text.

- [ ] **Step 5: Run the Task 3 gate.**

  Run:

  ```powershell
  npm run lint
  npm run build
  node --test dist/test/readiness-evaluate.test.js
  ```

  Expected: all three terminal decisions are reproducible, all hard stops
  offer only `Stop`, and no test performs external I/O.

### Task 4: Render equivalent safe JSON and Markdown certificates

**Files:**
- Create: `src/readiness/render.ts`
- Test: `test/readiness-render.test.ts`

**Interfaces:**
- Consumes `ReadinessCertificate` from Task 3.
- Produces `renderCertificateJson(certificate: ReadinessCertificate): string` and `renderCertificateMarkdown(certificate: ReadinessCertificate): string`.

- [ ] **Step 1: Write failing rendering tests.**

  Evaluate each fixture then assert JSON parses to the same decision,
  correlation ID, check states, fingerprints, remediation, and zero write
  count exposed by the Markdown. Assert neither format includes a fixture
  credential, raw transcript phrase, authorization header, or raw observed
  values.

  ```ts
  assert.match(markdown, /^# G2AS Sandbox Readiness Certificate/m);
  assert.match(markdown, /External writes: 0/);
  assert.doesNotMatch(markdown, /Bearer|fixture-secret|raw transcript/i);
  ```

- [ ] **Step 2: Run the focused test before implementation.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/readiness-render.test.js
  ```

  Expected: FAIL because the rendering functions do not yet exist.

- [ ] **Step 3: Implement deterministic rendering.**

  JSON rendering must be stable: serialize the certificate with its declared
  tuple order and no derived timestamps. Markdown must contain: target
  fingerprint, terminal decision, correlation ID, run timestamp, external
  writes, a four-row check table, unchanged systems, remediation, and decision
  options. It must render identifiers only as their fingerprints except for the
  fixed public manifest labels `G2AS`, `G2AS-1`, page `31752193`, repository
  name, and full frozen Git SHA.

- [ ] **Step 4: Run the Task 4 gate.**

  Run:

  ```powershell
  npm run lint
  npm run build
  node --test dist/test/readiness-render.test.js
  ```

  Expected: the two output formats agree for each fixture and unsafe text is
  absent from both.

### Task 5: Add local run orchestration and the explicit CLI command

**Files:**
- Create: `src/readiness/run.ts`
- Modify: `src/cli.ts`
- Modify: `test/bootstrap.test.ts`
- Test: `test/readiness-cli.test.ts`

**Interfaces:**
- Consumes `loadG2asReadinessManifest`, `ReadinessAdapter`, `evaluateReadiness`, and both renderers from Tasks 1–4.
- Produces `runReadinessCertificate(manifest: G2asReadinessManifest, adapter: ReadinessAdapter): Promise<ReadinessCertificate>`.
- Produces CLI command `readiness --manifest <path> --observations <path> --output-dir <path>`.

- [ ] **Step 1: Write failing CLI and orchestration tests.**

  Test the built CLI with each fixture bundle. Supply a temporary output
  directory and assert that it creates exactly two local files named
  `g2as-sandbox-readiness-certificate.json` and
  `g2as-sandbox-readiness-certificate.md`. Assert exit code `0` for `READY`,
  `2` for `NOT READY`, `3` for `STOPPED`, and `4` for malformed arguments or
  unreadable local input. Assert `--help` contains `readiness`.

  ```ts
  assert.equal(exitCode, 2);
  assert.equal(JSON.parse(await readFile(jsonPath, "utf8")).decision, "NOT READY");
  assert.match(await readFile(markdownPath, "utf8"), /External writes: 0/);
  ```

- [ ] **Step 2: Run the focused test before implementation.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/readiness-cli.test.js
  ```

  Expected: FAIL because the command and local runner do not yet exist.

- [ ] **Step 3: Implement local observation adapter and runner.**

  `runReadinessCertificate` calls its injected `ReadinessAdapter` once and
  delegates to `evaluateReadiness`. The CLI uses one local-file adapter that
  reads the explicit `--observations` JSON path and passes the parsed bundle to
  `parseReadinessObservationBundle`. It must not instantiate `JiraGateway`,
  `ConfluenceGateway`, `GitHubGateway`, `fetch`, a browser, or a credential
  provider. Validate that the explicit output directory exists or create only
  that directory; write exactly the two certificate files with UTF-8 content.

  Add `readiness` to `helpText` and preserve all existing CLI command behavior.
  Map decisions to exit codes in `runReadiness`: `READY` to `0`, `NOT READY` to
  `2`, `STOPPED` to `3`; input/configuration failures remain `4`.

- [ ] **Step 4: Run the Task 5 gate.**

  Run:

  ```powershell
  npm run lint
  npm run build
  node --test dist/test/readiness-cli.test.js dist/test/bootstrap.test.js
  ```

  Expected: each fixture produces only the two local files, terminal exit
  codes are correct, and existing help assertions still pass.

### Task 6: Align the team contract and write the operating runbook

**Files:**
- Modify: `contract/team-contract.md`
- Create: `docs/runbooks/g2as-sandbox-readiness-certificate.md`
- Modify: `docs/runbooks/sync-orchestrator-v1-sandbox.md`
- Test: `test/contract.test.ts`

**Interfaces:**
- Consumes the CLI invocation and terminal decisions from Task 5.
- Produces the documented operator contract for a future separately approved live read-only evidence collection; it does not produce a connector configuration or live adapter.

- [ ] **Step 1: Write the failing contract assertion.**

  Extend `test/contract.test.ts` to parse `contract/team-contract.md` and
  assert the capability list contains exactly one new capability named
  `Sandbox readiness certificate`, state `requires_approval`, and a limitation
  that explicitly says it accepts read-only normalized evidence only and does
  not activate connector synchronization or external writes.

- [ ] **Step 2: Run the focused test before documentation changes.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/contract.test.js
  ```

  Expected: FAIL because the new contract capability is absent.

- [ ] **Step 3: Update the contract and add the runbook.**

  Add the exact new capability to the contract without changing the existing
  `Jira/Confluence/GitHub synchronization` capability state. The runbook must
  include: manifest review; allowed evidence collection paths; one-output-dir
  command; interpretation of `READY`, `NOT READY`, and `STOPPED`; zero external
  write confirmation; safe remediation boundaries; and a final gate stating
  that any actual G2AS read requires separate explicit approval before tool
  use. Update the existing sandbox runbook to link to this readiness certificate
  as a prerequisite, while retaining its statement that current sync CLI
  behavior is validation-only.

  Use this exact local command example:

  ```powershell
  npm run cli -- readiness --manifest contract/readiness/g2as-sandbox-target.json --observations <approved-normalized-observations.json> --output-dir <certificate-output-directory>
  ```

- [ ] **Step 4: Run the Task 6 gate.**

  Run:

  ```powershell
  npm run lint
  npm run build
  node --test dist/test/contract.test.js
  ```

  Expected: the contract remains valid, the readiness capability is accurately
  declared, and the documentation does not claim a live connector exists.

### Task 7: Execute the full local verification and prepare the live-read gate

**Files:**
- Modify: `docs/runbooks/g2as-sandbox-readiness-certificate.md`
- Test: `test/readiness-manifest.test.ts`
- Test: `test/readiness-observations.test.ts`
- Test: `test/readiness-evaluate.test.ts`
- Test: `test/readiness-render.test.ts`
- Test: `test/readiness-cli.test.ts`

**Interfaces:**
- Consumes the complete local implementation from Tasks 1–6.
- Produces a review-ready local evidence package and an explicit no-execution live-read approval request.

- [ ] **Step 1: Run the narrow readiness suite.**

  Run:

  ```powershell
  npm run build
  node --test dist/test/readiness-manifest.test.js dist/test/readiness-observations.test.js dist/test/readiness-evaluate.test.js dist/test/readiness-render.test.js dist/test/readiness-cli.test.js
  ```

  Expected: all fixture-backed terminal states pass and no local test connects
  to a non-loopback external target.

- [ ] **Step 2: Run repository quality gates.**

  Run:

  ```powershell
  npm run lint
  npm test
  npm run cli -- validate --contract contract/team-contract.md
  git diff --check
  ```

  Expected: all existing tests and all readiness tests pass; the canonical
  contract validates; and no whitespace errors remain.

- [ ] **Step 3: Inspect generated fixtures for safety.**

  Generate certificates from `ready.json`, `not-ready.json`, and `stopped.json`
  into separate temporary output directories. Verify each JSON/Markdown pair
  has matching decision and correlation ID, `externalWriteCount: 0`, and no
  `authorization`, `bearer`, `cookie`, `credential`, `password`, `token`, or
  `raw transcript` text.

- [ ] **Step 4: Record the execution boundary in the runbook.**

  Add a final `Live read approval required` section that enumerates the only
  requested future actions: exact target resolution, read-only source evidence
  collection for the four named checks, local bundle generation, and local
  certificate rendering. State that `READY` still does not authorize a write,
  OAuth change, connector install, or continuous sync.

- [ ] **Step 5: Hand off without a live run or automatic commit.**

  Report the local verification evidence, generated fixture certificate paths,
  and the remaining decision: approve one read-only G2AS evidence collection
  or stop for remediation. Do not invoke any external tool, write, login,
  credential setup, or git commit unless separately authorized by the user.

---

## Spec coverage self-review

| Design requirement | Plan coverage |
| --- | --- |
| Fixed three-system G2AS target and frozen traceability facts | Task 1 manifest; Task 3 exact comparisons |
| Read-only, host-collected evidence only | Task 2 adapter boundary; Task 5 local-file CLI adapter |
| `READY`, `NOT READY`, `STOPPED` decisions | Task 3 evaluator and Task 5 exit codes |
| Secret-safe normalized evidence and fingerprints | Tasks 2–4 |
| Equivalent Markdown and JSON certificates | Task 4 and Task 7 safety inspection |
| Target isolation and hard stops before external action | Tasks 1–3 local validation; Task 7 handoff boundary |
| Local test matrix and future live approval gate | Tasks 2–7 |
| Contract and runbook alignment | Task 6 |

No live source operation is included in this plan. The first real G2AS run is
deliberately a post-implementation, explicitly approved read-only action.

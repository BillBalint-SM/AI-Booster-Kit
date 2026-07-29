# Native MCP Capability Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one canonical read-only GitHub MCP capability contract, three semantically equivalent host templates, and readiness enforcement that requires verified capability evidence plus a native Confluence GitHub Smart Link before `READY`.

**Architecture:** A strict JSON capability manifest is parsed locally and rendered into deterministic Codex, Claude Code, and Cursor Markdown projections. The GitHub observation carries a validated capability-evidence object; traceability carries an explicit Confluence Git reference kind. The readiness evaluator compares those values with the manifest and stops safely on absent, drifting, text-only, or mismatched evidence.

**Tech Stack:** Node.js 22+, TypeScript 5.9, `node:test`, existing YAML/Markdown contract utilities, local JSON files.

## Global Constraints

- The standard is declarative: it must not install an MCP server, request OAuth, change host configuration, or perform external I/O.
- No capability manifest, template, evidence object, test fixture, diagnostic, or renderer may contain a credential, endpoint, token, cookie, authorization header, or raw transcript.
- GitHub capability scope is read-only and restricted to exact repository metadata, branch, commit, and fixture-path verification; write, merge, issue, PR, permission, configuration, and credential actions are prohibited.
- `READY` requires exact capability evidence and `smart_link` as the resolved Confluence Git reference kind; text-only commit evidence must stop.
- Codex, Claude Code, and Cursor templates derive from one canonical manifest and remain semantically equivalent.
- Existing Jira/Confluence/GitHub synchronization remains unsupported; this change adds no connector implementation.
- Do not create a commit unless the user explicitly requests one after reviewing the resulting diff.

---

## File structure

- `contract/mcp-capabilities/github-readonly.json` — source-of-truth capability declaration.
- `src/capabilities/types.ts` — capability and host-projection TypeScript types.
- `src/capabilities/manifest.ts` — strict manifest parser, stable scope fingerprint, and load helper.
- `src/capabilities/projections.ts` — deterministic Markdown template renderer.
- `templates/hosts/*.md` — checked-in rendered Codex, Claude Code, and Cursor templates.
- `src/readiness/observations.ts` — GitHub capability-evidence and native-reference-kind parsing.
- `src/readiness/evaluate.ts` — capability/projection/native-link readiness gates.
- `test/capabilities-manifest.test.ts` — strict manifest and forbidden-operation tests.
- `test/capabilities-projections.test.ts` — host template equivalence and drift tests.
- `test/readiness-observations.test.ts` — normalized capability/native-link parsing tests.
- `test/readiness-evaluate.test.ts` — stop behavior and cross-host certificate equivalence.
- `test/fixtures/readiness/*.json` — safe fixture bundles carrying the new fields.
- `contract/team-contract.md` and `docs/runbooks/g2as-sandbox-readiness-certificate.md` — declared capability boundary and operator process.

### Task 1: Define and validate the canonical capability manifest

**Files:**
- Create: `contract/mcp-capabilities/github-readonly.json`
- Create: `src/capabilities/types.ts`
- Create: `src/capabilities/manifest.ts`
- Create: `test/capabilities-manifest.test.ts`

**Interfaces:**
- Produces `GithubReadOnlyCapability`, `HostCapabilityTemplate`, and `GithubCapabilityEvidence`.
- Produces `parseGithubReadOnlyCapability(value: unknown): GithubReadOnlyCapability`.
- Produces `loadGithubReadOnlyCapability(path: string): Promise<GithubReadOnlyCapability>`.
- Produces `githubScopeFingerprint(capability: GithubReadOnlyCapability): string`.

- [ ] **Step 1: Write the failing manifest tests.**

```ts
assert.deepEqual(parseGithubReadOnlyCapability(validManifest), {
  version: 1,
  capabilityId: "github-readonly-evidence-v1",
  allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"],
  prohibitedOperations: ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"],
  requiredHosts: ["codex", "claude-code", "cursor"],
  requiredConfluenceGitReferenceKind: "smart_link",
});
assert.throws(() => parseGithubReadOnlyCapability({ ...validManifest, allowedOperations: [...validManifest.allowedOperations, "repository.write"] }), /operation/);
```

Also test duplicate keys, unknown fields, hidden/symbol properties, a non-HTTPS endpoint field, credential-like keys, missing host, a reordered equivalent manifest with the same scope fingerprint, and a changed operation set with a different fingerprint.

- [ ] **Step 2: Run the focused test before implementation.**

Run: `npm run build; node --test dist/test/capabilities-manifest.test.js`

Expected: FAIL because the module and manifest do not exist.

- [ ] **Step 3: Add the fixed declarative manifest.**

Create this exact JSON shape:

```json
{
  "version": 1,
  "capabilityId": "github-readonly-evidence-v1",
  "allowedOperations": ["repository.read", "branch.read", "commit.read", "path.read"],
  "prohibitedOperations": ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"],
  "requiredHosts": ["codex", "claude-code", "cursor"],
  "requiredConfluenceGitReferenceKind": "smart_link"
}
```

- [ ] **Step 4: Implement strict parser and fingerprint.**

Use the readiness parser's strict own-key, plain-object, non-coercing validation style. Accept only the literal arrays above in the listed order. Reject every key/value matching credential, authorization, cookie, token, password, endpoint, URL, transcript, write, merge, permission, or configuration markers. Hash canonical JSON with sorted object keys using SHA-256.

```ts
export interface GithubReadOnlyCapability {
  version: 1;
  capabilityId: "github-readonly-evidence-v1";
  allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"];
  prohibitedOperations: ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"];
  requiredHosts: ["codex", "claude-code", "cursor"];
  requiredConfluenceGitReferenceKind: "smart_link";
}
```

- [ ] **Step 5: Run the Task 1 gate.**

Run: `npm run lint; npm run build; node --test dist/test/capabilities-manifest.test.js`

Expected: valid manifest loads; forbidden, unsafe, unknown, and scope-broadened shapes fail without echoing values.

### Task 2: Generate deterministic host capability templates

**Files:**
- Create: `src/capabilities/projections.ts`
- Create: `templates/hosts/codex-github-readonly-capability.md`
- Create: `templates/hosts/claude-code-github-readonly-capability.md`
- Create: `templates/hosts/cursor-github-readonly-capability.md`
- Create: `test/capabilities-projections.test.ts`

**Interfaces:**
- Consumes `GithubReadOnlyCapability` and `githubScopeFingerprint` from Task 1.
- Produces `renderGithubCapabilityTemplate(capability: GithubReadOnlyCapability, host: AgentHost): string`.
- Produces `parseGithubCapabilityTemplate(text: string): HostCapabilityTemplate` for template drift checks.

- [ ] **Step 1: Write failing projection tests.**

```ts
const templates = ["codex", "claude-code", "cursor"].map((host) =>
  renderGithubCapabilityTemplate(capability, host),
);
assert.match(templates[0] ?? "", /targetHost: codex/);
assert.equal(parseGithubCapabilityTemplate(templates[0] ?? "").scopeFingerprint, githubScopeFingerprint(capability));
assert.deepEqual(
  templates.map((template) => parseGithubCapabilityTemplate(template).semanticContract),
  [expectedSemanticContract, expectedSemanticContract, expectedSemanticContract],
);
```

Assert every template forbids write/merge/issue/PR/permission/configuration/credential activity, requires `smart_link`, contains no URL or secret-like text, and checked-in files equal generated output. Mutate one capability ID or scope fingerprint and assert the parser reports drift.

- [ ] **Step 2: Run the focused test before implementation.**

Run: `npm run build; node --test dist/test/capabilities-projections.test.js`

Expected: FAIL because the projection renderer and template files do not exist.

- [ ] **Step 3: Implement deterministic renderer and template parser.**

Render YAML frontmatter with `capabilityId`, `capabilityVersion`, `targetHost`, and `scopeFingerprint`, followed by fixed Markdown sections: approved read operations, prohibited operations, normalized evidence, required Confluence link, and stop protocol. The only host-specific content is `targetHost` and its intended instruction surface (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules`). Do not emit a timestamp.

```ts
export interface HostCapabilityTemplate {
  capabilityId: "github-readonly-evidence-v1";
  capabilityVersion: 1;
  targetHost: AgentHost;
  scopeFingerprint: string;
  semanticContract: {
    allowedOperations: string[];
    prohibitedOperations: string[];
    requiredConfluenceGitReferenceKind: "smart_link";
  };
}
```

- [ ] **Step 4: Commit the generated template contents.**

Write the exact output of `renderGithubCapabilityTemplate` for each supported host into the three checked-in template files. Do not add executable configuration examples or setup instructions.

- [ ] **Step 5: Run the Task 2 gate.**

Run: `npm run lint; npm run build; node --test dist/test/capabilities-projections.test.js`

Expected: all three templates parse, remain semantically equivalent, and match deterministic generation.

### Task 3: Require GitHub capability evidence in normalized observations

**Files:**
- Modify: `src/readiness/observations.ts`
- Modify: `src/readiness/types.ts`
- Modify: `test/readiness-observations.test.ts`
- Modify: `test/fixtures/readiness/ready.json`
- Modify: `test/fixtures/readiness/not-ready.json`
- Modify: `test/fixtures/readiness/stopped.json`
- Modify: `test/fixtures/readiness/unsafe-observation.json`

**Interfaces:**
- Consumes `AgentHost` and `GithubReadOnlyCapability` from Tasks 1–2.
- Extends the GitHub observation with `capabilityEvidence`.
- Extends traceability observed IDs with `confluenceGitReferenceKind`.

- [ ] **Step 1: Write failing observation tests.**

```ts
assert.throws(
  () => parseReadinessObservationBundle(bundleWithoutGithubCapabilityEvidence),
  /capability evidence/,
);
assert.throws(
  () => parseReadinessObservationBundle(bundleWithGithubCliReadPath),
  /read path/,
);
assert.equal(
  parseReadinessObservationBundle(bundleWithTextOnlyConfluenceGitReference)
    .observations.find((observation) => observation.source === "traceability")
    ?.observedIds.confluenceGitReferenceKind,
  "text",
);
```

Cover a valid `codex`, `claude-code`, and `cursor` capability record; bad capability ID/version/scope fingerprint; hidden or object-valued fields; a credential-like field; unknown host; and non-`smart_link` Confluence Git reference kind.

- [ ] **Step 2: Run the focused test before implementation.**

Run: `npm run build; node --test dist/test/readiness-observations.test.js`

Expected: FAIL because `capabilityEvidence` and `confluenceGitReferenceKind` are not recognized.

- [ ] **Step 3: Extend the strict observation shape.**

Require `capabilityEvidence` only for `source: "github"`; reject it on every other source. Require `confluenceGitReferenceKind` only for `source: "traceability"` and accept only `smart_link` or `text`. The parser preserves this evidence fact; the evaluator, not the parser, makes `text` a `TRACEABILITY_MISMATCH` stop.

```ts
export interface GithubCapabilityEvidence {
  capabilityId: "github-readonly-evidence-v1";
  capabilityVersion: 1;
  host: AgentHost;
  scopeFingerprint: string;
  state: "verified" | "unknown";
}
```

The parser must require primitive strings, exact keys, a lowercase 64-character SHA-256 `scopeFingerprint`, and no coercion. It must preserve the existing global secret and hidden-property rejection behavior.

- [ ] **Step 4: Update fixtures with safe canonical evidence.**

Give each valid GitHub fixture a capability record derived from the Task 1 manifest and a valid host. Use `smart_link` on ready traceability and `text` in the text-only stopped fixture. Keep stopped and unsafe fixtures explicit about their invalid state; do not add a fake CLI or raw response field.

- [ ] **Step 5: Run the Task 3 gate.**

Run: `npm run lint; npm run build; node --test dist/test/readiness-observations.test.js`

Expected: only exact, secret-free capability evidence and the two explicit reference kinds parse; `text` remains evaluable as a traceability stop.

### Task 4: Enforce capability and native-link requirements in the readiness evaluator

**Files:**
- Modify: `src/readiness/evaluate.ts`
- Modify: `test/readiness-evaluate.test.ts`

**Interfaces:**
- Consumes the canonical capability manifest, generated host projection parser, and extended observations.
- Produces capability-aware `ReadinessCheck` values and unchanged certificate rendering interface.

- [ ] **Step 1: Write failing evaluator tests.**

```ts
const certificate = evaluateReadiness(manifest, bundleWithTextOnlyConfluenceGitReference, capability);
assert.equal(certificate.decision, "STOPPED");
assert.equal(certificate.checks[3].diagnosticCode, "TRACEABILITY_MISMATCH");
assert.deepEqual(certificate.decisionOptions, ["Stop"]);
```

Add tests for missing capability evidence, unknown capability state, wrong capability ID/version/fingerprint, unsupported host, valid evidence for each of the three hosts, text-only Git reference, wrong Smart Link commit destination, and equal certificate check fingerprints for equivalent host bundles.

- [ ] **Step 2: Run the focused test before implementation.**

Run: `npm run build; node --test dist/test/readiness-evaluate.test.js`

Expected: FAIL because the evaluator has no capability manifest input or native-reference-kind gate.

- [ ] **Step 3: Add explicit evaluator dependency and gates.**

Change the signature to:

```ts
export function evaluateReadiness(
  manifest: G2asReadinessManifest,
  bundle: ReadinessObservationBundle,
  capability: GithubReadOnlyCapability,
): ReadinessCertificate
```

Require GitHub capability ID/version/scope fingerprint to match the manifest; require the evidence host to be listed in `requiredHosts`; require capability state `verified`; require traceability `confluenceGitReferenceKind` to equal the manifest's required kind. Map any failure to `unknown` + `CAPABILITY_UNKNOWN` or `mismatch` + `TRACEABILITY_MISMATCH`, which must produce `STOPPED`.

- [ ] **Step 4: Update direct callers.**

Update `runReadinessCertificate`, renderer tests, CLI tests, and test helpers so they load or inject the fixed canonical capability manifest. Do not introduce a network call or default/fallback capability.

- [ ] **Step 5: Run the Task 4 gate.**

Run: `npm run lint; npm run build; node --test dist/test/readiness-evaluate.test.js dist/test/readiness-render.test.js dist/test/readiness-cli.test.js`

Expected: valid native evidence can reach `READY`; all absent, mismatched, CLI-claimed, or text-only variants stop safely.

### Task 5: Wire the local CLI and cross-host conformance checks

**Files:**
- Modify: `src/readiness/run.ts`
- Modify: `src/cli.ts`
- Modify: `test/readiness-cli.test.ts`
- Modify: `test/conformance/host-conformance.test.ts`

**Interfaces:**
- Consumes `loadGithubReadOnlyCapability` and capability-aware `runReadinessCertificate`.
- Extends CLI command to require `--capability <path>`.
- Produces deterministic cross-host readiness decisions.

- [ ] **Step 1: Write failing CLI and conformance tests.**

```ts
const result = await runBuiltCli([
  "readiness", "--manifest", manifestPath, "--capability", capabilityPath,
  "--observations", readyPath, "--output-dir", outputDirectory,
]);
assert.equal(result.code, 0);

assert.equal(
  evaluateReadiness(manifest, bundleFor("codex"), capability).manifestFingerprint,
  evaluateReadiness(manifest, bundleFor("cursor"), capability).manifestFingerprint,
);
```

Assert omitted, unreadable, malformed, and scope-broadened capability files exit `4`; existing CLI commands retain behavior; all valid host evidence produces the same terminal decision and check fingerprints; and a projection fingerprint mismatch stops.

- [ ] **Step 2: Run the focused test before implementation.**

Run: `npm run build; node --test dist/test/readiness-cli.test.js dist/test/conformance/host-conformance.test.js`

Expected: FAIL because `--capability` is not recognized and readiness callers do not load it.

- [ ] **Step 3: Implement explicit capability loading.**

Require this exact argument order for readiness:

```text
readiness --manifest <path> --capability <path> --observations <path> --output-dir <path>
```

Read the capability file only from the explicit path, pass it to the local runner, and retain the existing local-only output rules and 0/2/3/4 exit-code mapping. Update the runbook command only after the command tests pass.

- [ ] **Step 4: Run the Task 5 gate.**

Run: `npm run lint; npm run build; node --test dist/test/readiness-cli.test.js dist/test/conformance/host-conformance.test.js`

Expected: capability input is mandatory; host-equivalent evidence is deterministic; no CLI path performs external I/O.

### Task 6: Publish the standard in the contract and runbook, then verify the full local boundary

**Files:**
- Modify: `contract/team-contract.md`
- Modify: `docs/runbooks/g2as-sandbox-readiness-certificate.md`
- Modify: `test/contract.test.ts`
- Test: all `test/readiness-*.test.ts`, `test/capabilities-*.test.ts`, `test/conformance/host-conformance.test.ts`

**Interfaces:**
- Documents the capability standard without turning it into a host setup or connector authorization.
- Produces the final operator gate for separately approved live MCP evidence collection.

- [ ] **Step 1: Write failing contract and runbook assertions.**

```ts
assert.match(contractText, /Native GitHub MCP read-only capability standard/);
assert.match(contractText, /requires_approval/);
assert.match(runbookText, /--capability contract\/mcp-capabilities\/github-readonly\.json/);
assert.match(runbookText, /native GitHub Smart Link/);
```

Assert the synchronization capability remains `unsupported` and the documentation never claims that the templates install, configure, or authorize an MCP connector.

- [ ] **Step 2: Run the focused test before documentation changes.**

Run: `npm run build; node --test dist/test/contract.test.js`

Expected: FAIL because the capability-standard declaration and command are absent.

- [ ] **Step 3: Update the contract and runbook.**

Add `Native GitHub MCP read-only capability standard` with `requires_approval` and a limitation that it provides declarative templates and local validation only. Document the mandatory capability path, the three host templates, capability probe requirements, native GitHub Smart Link requirement, and separate approval requirement for any future live read. Preserve the prohibition on setup, OAuth, connector installation, and external writes.

- [ ] **Step 4: Run the complete local verification.**

Run:

```powershell
npm run lint
npm run build
npm test
rg -n "authorization|cookie|credential|password|token|raw transcript|https?://|oauth|websocket" contract/mcp-capabilities templates/hosts src/capabilities src/readiness
```

Expected: all tests pass; the scan has no prohibited manifest/template/source values other than the intentionally validated `https` handling code in `src/readiness/observations.ts`; no command or test makes external I/O.

- [ ] **Step 5: Review the final diff.**

Check `git diff --check`, `git diff --stat`, generated template equality tests, and status. Leave the change uncommitted for explicit user review and commit authorization.

## Plan coverage review

| Design requirement | Implementing task |
| --- | --- |
| One strict canonical read-only GitHub capability source | Task 1 |
| Three shareable, equivalent host templates | Task 2 |
| Capability evidence in the normalized observation | Task 3 |
| Native Confluence GitHub Smart Link mandatory for READY | Tasks 3–4 |
| STOP on missing, drifting, CLI-claimed, or text-only evidence | Task 4 |
| Explicit local CLI contract and cross-host conformance | Task 5 |
| Contract/runbook boundary and complete local validation | Task 6 |

No host setup, connector installation, OAuth, external read, Confluence edit, Jira update, GitHub write, or commit is authorized by this plan.

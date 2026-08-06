# Codex Windows Execution Conformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only, reproducible native Windows Codex conformance diagnostic that either proves a real child process started through the Codex sandbox or returns a sanitized host-level blocker.

**Architecture:** Reuse the existing bounded native Codex process boundary instead of adding a second unbounded runner. Extend it to retain bounded stdout/stderr, then add a focused conformance controller that collects sanitized host facts, builds one of four fixed Codex profile invocations, and classifies JSONL command events using the literal `HOST_EXEC_OK` marker. Expose the controller through an exact-argument CLI command; do not mutate Codex configuration or Windows state.

**Tech Stack:** TypeScript 5.9, Node.js `>=22 <23`, `node:child_process` with `shell: false`, `node:fs/promises`, built-in `node:test`, PowerShell read-only probes, existing CLI/error conventions.

## Global Constraints

- The repository-side Node launcher starts and can consume structured Codex output.
- A direct PowerShell process outside Codex returns `HOST_DIRECT_OK`.
- Codex fails before the requested `node` command starts at `CreateProcessAsUserW`.
- The current profile (`elevated`), an explicit `unelevated` override, and an invocation without user configuration all fail the same minimal process test. The failure codes observed are Win32 error `5` and `0xC0070005`.
- The non-secret sandbox log shows successful setup-refresh completion with no reported setup errors, but repeated `SetFileAttributesW` access-denied messages while handling `C:\Users\Default`.
- No repository policy, connector, shell wrapper, external write, or market validation is part of this diagnostic.
- The invocation remains `--sandbox read-only --ephemeral`.
- No `--dangerously-bypass-approvals-and-sandbox` run is a product acceptance test.
- Never read or copy `.sandbox-secrets`.
- A successful setup-helper run does not prove child-process creation. The process marker is the conformance evidence.
- Direct host PowerShell success does not prove Codex sandbox success.
- No `config.toml`, ACL, registry, firewall, UAC, Defender, or local security-policy mutation is included.
- A host blocker remains `BLOCKED` or `STOPPED`; it is not promoted to `READY` by documentation alone.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/controller/codex-execution.ts` | Retain bounded native process stdout/stderr and expose the already-validated Codex command/process helpers without changing activation semantics. |
| `src/controller/codex-windows-conformance.ts` | Read-only host facts, redaction, fixed profile arguments, JSONL event parsing, marker classification, and conformance orchestration. |
| `src/cli.ts` | Add `codex-windows-conformance` dispatch, exact argument validation, JSON output, and exit-code mapping. |
| `test/controller-codex-execution.test.ts` | Regression coverage for captured output and the existing activation flags/error behavior. |
| `test/controller-codex-windows-conformance.test.ts` | Unit and injected-runner tests for redaction, profile boundaries, JSONL classification, and negative paths. |
| `test/controller-codex-windows-conformance-cli.test.ts` | Built-CLI help, exact-argument, unavailable-command, and result/exit-code contract tests. |
| `docs/project/current-state.md` | Routing-only current status, evidence, known host limit, and next bounded action. |
| `docs/project/roadmap.md` | M4 exit evidence and the native conformance gate. |

No file in `C:\Users\<USER>\.codex`, `.sandbox-secrets`, Windows policy, or an external connector is in the write scope.

### Public interfaces fixed by this plan

The implementer must use these names and shapes; later tasks consume them:

```ts
export type CodexProcessKind =
  | "EXITED"
  | "SPAWN_ERROR"
  | "TIMED_OUT"
  | "OUTPUT_TOO_LARGE";

export interface CodexProcessResult {
  readonly kind: CodexProcessKind;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export type CodexWindowsProbeProfile =
  | "current"
  | "elevated"
  | "unelevated"
  | "isolated";

export interface CodexWindowsConformanceRequest {
  readonly workdir: string;
  readonly timeoutMs: number;
  readonly profile: CodexWindowsProbeProfile;
  readonly codexCommand?: string;
  readonly codexHome?: string;
}

export type CodexWindowsAuditState = "PASS" | "UNKNOWN";

export interface CodexWindowsHostAudit {
  readonly state: CodexWindowsAuditState;
  readonly platform: string;
  readonly architecture: string;
  readonly nodeVersion: string;
  readonly powershellVersion: string | null;
  readonly codexVersion: string | null;
  readonly effectiveSandbox: "elevated" | "unelevated" | "UNKNOWN";
  readonly helperPaths: readonly string[];
  readonly errorClasses: readonly string[];
  readonly unknowns: readonly string[];
}

export type CodexWindowsSmokeState = "PASS" | "BLOCKED" | "STOPPED";

export interface CodexWindowsSmokeResult {
  readonly state: CodexWindowsSmokeState;
  readonly profile: CodexWindowsProbeProfile;
  readonly markerProduced: boolean;
  readonly commandEventObserved: boolean;
  readonly processKind: CodexProcessKind;
  readonly exitCode: number | null;
  readonly errorCode: string | null;
  readonly evidence: readonly string[];
}

export type CodexWindowsConformanceState =
  | "COMPLETED"
  | "BLOCKED"
  | "STOPPED";

export interface CodexWindowsConformanceResult {
  readonly state: CodexWindowsConformanceState;
  readonly host: "windows";
  readonly profile: CodexWindowsProbeProfile;
  readonly audit: CodexWindowsHostAudit;
  readonly smoke: CodexWindowsSmokeResult;
  readonly recommendation: string;
}

export async function runCodexWindowsConformance(
  request: CodexWindowsConformanceRequest,
): Promise<CodexWindowsConformanceResult>;

export function buildCodexWindowsProbeArgs(
  profile: CodexWindowsProbeProfile,
  workdir: string,
): readonly string[];

export function parseCodexJsonlProbe(
  profile: CodexWindowsProbeProfile,
  stdout: string,
  stderr: string,
  exitCode: number | null,
  kind: CodexProcessKind,
): CodexWindowsSmokeResult;
```

The injected runner used by tests has the same `CodexSpawn` shape already used
by `executeCodexActivationWithRunner`; it must not accept a shell or arbitrary
environment mutation.

---

### Task 1: Preserve the bounded native process boundary

**Files:**
- Modify: `src/controller/codex-execution.ts` in the process-result type and `runCodexProcess` implementation.
- Test: `test/controller-codex-execution.test.ts` in the native-helper runner tests.

**Interfaces:**
- Consumes: existing `CodexSpawn`, `executeCodexActivationWithRunner`, and native `spawn` options.
- Produces: exported `CodexProcessKind`, `CodexProcessResult`, and `runCodexProcess(command, args, workdir, timeoutMs, spawnProcess)` for the conformance controller.

- [x] **Step 1: Write the failing regression test.**

Extend the helper runner test so the fake native helper writes a sentinel to
stdout and stderr before writing the valid `--output-last-message` result.
Assert that the process result exposed to the conformance caller contains both
streams while the existing activation result remains `COMPLETED` and still
reports `sandbox: "read-only"`, `ephemeral: true`, and
`outputSchemaValidated: true`.

- [x] **Step 2: Run the focused test and verify it fails.**

Run:

```powershell
npm run build
node --test dist/test/controller-codex-execution.test.js
```

Expected: the new captured-output assertion fails because the current process
result discards stdout/stderr.

- [x] **Step 3: Implement the smallest shared change.**

Change `ProcessResult` to the public `CodexProcessResult` shape and append
bounded UTF-8 chunks to `stdout` and `stderr` while retaining the existing
byte limit, timeout kill, `shell: false`, `windowsHide: true`, and explicit
kind/exit-code mapping. Do not alter the activation prompt, schema, command
allowlist, or error codes. Export only the process result type and runner;
keep path validation and activation result construction unchanged.

- [x] **Step 4: Run the focused test and the existing activation suite.**

Run:

```powershell
npm run build
node --test dist/test/controller-codex-execution.test.js
```

Expected: all focused tests pass, including non-zero exit, timeout, malformed
output, and oversized-output cases.

**Stop condition:** If extracting the result changes any existing activation
state or error code, restore the behavior before continuing; the diagnostic
must not widen the activation contract.

---

### Task 2: Add pure host-fact parsing and redaction

**Files:**
- Create: `src/controller/codex-windows-conformance.ts` with pure parser/redactor helpers and the fixed audit model.
- Test: `test/controller-codex-windows-conformance.test.ts` with no live Codex calls.

**Interfaces:**
- Consumes: bounded text from `config.toml`, a dated non-secret sandbox log, and bounded PowerShell JSON probe output.
- Produces: `CodexWindowsHostAudit`, `parseCodexWindowsConfig`, `sanitizeSandboxLog`, and `parseWindowsProbeOutput`.

The audit model must contain only normalized facts: `platform`,
`architecture`, `nodeVersion`, `powershellVersion` or an explicit unknown,
Codex version/helper presence, effective sandbox profile, sandbox log error
classes, and an audit state of `PASS` or `UNKNOWN`. It must never contain raw
environment blocks, credentials, cookies, arbitrary usernames, or
`.sandbox-secrets` content.

- [x] **Step 1: Write failing parser/redaction tests.**

Cover these exact cases:

1. `[windows] sandbox = "elevated"` parses as `elevated`.
2. `[windows] sandbox = "unelevated"` parses as `unelevated`.
3. Missing, duplicate, or unsupported values become `UNKNOWN` rather than a guessed mode.
4. A log containing `C:\Users\<USER>`, helper paths, `SetFileAttributesW failed`, and `CreateProcessAsUserW failed` is reduced to normalized error facts and does not contain a real user alias, raw full paths, tokens, or arbitrary lines.
5. A probe response with extra fields, invalid JSON, or a non-array account/ACL field is rejected.
6. A path whose normalized target is `.sandbox-secrets` is rejected with a dedicated diagnostic code.

- [x] **Step 2: Run the parser tests to verify failure.**

Run:

```powershell
npm run build
node --test dist/test/controller-codex-windows-conformance.test.js
```

Expected: the new module exports are missing and the tests fail.

- [x] **Step 3: Implement strict pure helpers.**

Implement closed unions for sandbox mode and audit state. Parse only the
approved TOML keys, keep the latest bounded matching log lines, replace user
and installation path components with `<USER>` and `<CODEX_HOME>`, and reject
secret-directory paths before any read. Require exact object keys in JSON probe
responses, following the repository's existing strict parser style.

- [x] **Step 4: Re-run the parser tests and inspect the output.**

Run the same focused command. Expected: all parser, redaction, malformed-input,
and secret-boundary tests pass, with no unredacted local identity in snapshots
or assertion messages.

**Stop condition:** Any parser that silently converts a denied read, unknown
identity, or invalid config into `PASS` is a release blocker.

---

### Task 3: Implement fixed-profile Codex smoke construction and classification

**Files:**
- Modify: `src/controller/codex-windows-conformance.ts` with profile argument construction and smoke orchestration.
- Test: `test/controller-codex-windows-conformance.test.ts` with injected `CodexSpawn` runners.

**Interfaces:**
- Consumes: `runCodexProcess`, `resolveCodexCommand`, `CodexProcessResult`, and Task 2 audit helpers.
- Produces: `buildCodexWindowsProbeArgs(profile, workdir)`, `parseCodexJsonlProbe(profile, stdout, stderr, exitCode, kind)`, and `runCodexWindowsConformance(request)`.

Use only these fixed profile projections:

```ts
current:    []
elevated:   ["-c", "windows.sandbox=\"elevated\""]
unelevated: ["-c", "windows.sandbox=\"unelevated\""]
isolated:   ["--ignore-user-config", "-c", "windows.sandbox=\"unelevated\""]
```

Every profile must also include `exec`, `--json`, `--sandbox read-only`,
`--ephemeral`, `--color never`, `--skip-git-repo-check`, and an explicit
`--cd <workdir>`. No arbitrary `-c` value, shell wrapper, connector, or
dangerous bypass flag is accepted.

Use this exact fixed prompt:

```text
Bounded Windows host conformance probe. Use the shell tool exactly once to run:
node -e "process.stdout.write('HOST_EXEC_OK')"
Do not read or write files, use the network, use connectors, or run another command.
Return whether the marker was produced and the process error class if it was not.
```

The classifier must inspect JSONL `item.completed` command-execution events,
not trust a free-form model message. It returns:

- `COMPLETED` only when the command event contains the exact marker, the
  command is the requested `node -e` probe, and exit code is `0`.
- `BLOCKED` when the command event contains a native sandbox/process boundary
  error such as `CreateProcessAsUserW` or `windows sandbox` before the target
  command starts.
- `STOPPED` for invalid JSONL, timeout, unavailable command, wrong command,
  missing command event, output limit, or ambiguous evidence.

- [x] **Step 1: Write failing positive and negative tests.**

Add injected-runner cases for:

1. exact profile flags for all four profiles;
2. a valid command event with `HOST_EXEC_OK` and exit code `0` producing `COMPLETED`;
3. Win32 error `5` producing `BLOCKED` with a sanitized error class;
4. `0xC0070005` producing `BLOCKED`;
5. a model message claiming success without a command event producing `STOPPED`;
6. a command event for a different command producing `STOPPED`;
7. malformed JSONL, timeout, non-zero exit, and output limit producing `STOPPED`;
8. assertions that no profile projection contains `.cmd`, `.bat`, `.ps1`,
   `--dangerously-bypass-approvals-and-sandbox`, or arbitrary config keys.

- [x] **Step 2: Run the focused tests and verify failure.**

Run:

```powershell
npm run build
node --test dist/test/controller-codex-windows-conformance.test.js
```

Expected: the fixed-profile builder and classifier are not implemented.

- [x] **Step 3: Implement the fixed prompt, profile projection, and classifier.**

Resolve the native Codex command through the existing validated resolver,
run one bounded native process, parse only approved JSONL event shapes, and
redact error text before it reaches the result. Map process kinds and error
classes to the closed conformance states above. Keep one profile per request;
the matrix is executed as four explicit invocations, never as an implicit
retry loop.

- [x] **Step 4: Re-run focused tests and inspect the result contract.**

Expected: all positive, negative, boundary, and profile-isolation tests pass;
the result cannot report `COMPLETED` from a model-only message.

**Stop condition:** Do not add automatic retries, fallback profiles, sandbox
bypass, or config mutation when a profile fails.

---

### Task 4: Implement the read-only host audit and result assembly

**Files:**
- Modify: `src/controller/codex-windows-conformance.ts` with the real filesystem and fixed PowerShell probe adapters.
- Test: `test/controller-codex-windows-conformance.test.ts` for injected audit I/O and path boundaries.

**Interfaces:**
- Consumes: Task 2 parsers, Task 3 smoke classifier, explicit workdir/timeout/profile, and the existing environment only.
- Produces: `runCodexWindowsConformance(request)` returning one JSON-safe `CodexWindowsConformanceResult`.

The real audit performs only these reads/probes:

1. Node runtime/platform/architecture and `os.version()`.
2. PowerShell version through a fixed `pwsh.exe -NoLogo -NoProfile -NonInteractive -Command` read-only command.
3. `CODEX_HOME\config.toml` effective sandbox value and Codex helper metadata.
4. The newest dated non-secret sandbox log, bounded to matching setup/ACL/error lines.
5. A fixed PowerShell JSON probe limited to Codex sandbox identities and
   `C:\Users\Default` ACL/read metadata; if unavailable, record `UNKNOWN`.

The PowerShell probe must not call `Set-*`, `New-*`, `Remove-*`, `Add-*`,
`Register-*`, `Start-Process`, `secedit`, `netsh`, registry writes, or any
network command. It may use only read-only `Get-*`, `Test-*`, and formatting
operations against the literal allowlisted targets.

- [x] **Step 1: Write failing audit assembly tests.**

Use injected read/probe functions to assert:

- Windows facts and helper metadata assemble into a stable normalized result;
- a denied log/config read becomes `UNKNOWN`, not `PASS`;
- `.sandbox-secrets` is never opened;
- a PowerShell probe failure is preserved as an audit unknown with a safe error class;
- a `COMPLETED` smoke plus a non-critical unknown audit cannot be promoted to
  `COMPLETED` if the host boundary itself is unverified;
- a `BLOCKED` smoke always yields a host repair recommendation and never a
  product-ready state.

- [x] **Step 2: Run the focused tests to verify failure.**

Run the Task 3 focused command and expect the real audit assembly assertions
to fail before implementation.

- [x] **Step 3: Implement the read-only adapters and state assembly.**

Use explicit absolute paths, bounded reads, `lstat`/`realpath` checks, and
sanitized outputs. Select only the newest dated sandbox log, never the secret
directory. Build recommendations from the closed state/error taxonomy:
native pass, elevated repair, unelevated temporary fallback, or host-policy
escalation.

- [x] **Step 4: Run focused tests and inspect redacted output.**

Run:

```powershell
npm run build
node --test dist/test/controller-codex-windows-conformance.test.js
```

Expected: all audit assembly, secret-boundary, denied-read, and state-gate
tests pass.

---

### Task 5: Expose the diagnostic through the exact CLI contract

**Files:**
- Modify: `src/cli.ts` help text, dispatch, and `runCodexWindowsConformance`.
- Create: `test/controller-codex-windows-conformance-cli.test.ts`.

**Interfaces:**
- Consumes: `runCodexWindowsConformance` and its closed request/profile types.
- Produces: command `codex-windows-conformance --workdir <path> --timeout-ms <ms> --profile <current|elevated|unelevated|isolated> [--codex-command <native-or-codex.js>] [--codex-home <path>]`.

Argument handling must require the exact order and arity shown above, with the
two optional pairs accepted only once. Exit codes remain explicit:

- `0` only for `COMPLETED`;
- `3` for `BLOCKED` or `STOPPED` diagnostic results;
- `4` for invalid command configuration or unsafe input paths.

- [x] **Step 1: Write failing built-CLI tests.**

Cover:

1. `--help` lists `codex-windows-conformance`;
2. missing/reordered/duplicate arguments return `STOPPED` with
   `COMMAND_CONFIGURATION_INVALID`;
3. non-positive or oversized timeout returns `CODEX_TIMEOUT_INVALID`;
4. path traversal, secret-directory, and wrapper command inputs stop safely;
5. unavailable native Codex command returns a JSON `STOPPED`/`BLOCKED` result
   with a stable error code and no stderr noise;
6. a fake structured probe result maps to the documented exit code.

- [x] **Step 2: Run the built-CLI tests and verify failure.**

Run:

```powershell
npm run build
node --test dist/test/controller-codex-windows-conformance-cli.test.js
```

Expected: help/dispatch and command handler are not present.

- [x] **Step 3: Implement CLI wiring.**

Add the command to `helpText`, dispatch it before unrelated commands, parse
only the closed profile and explicit path pairs, call the controller once, and
write exactly one JSON result to stdout. Map controller errors through the
existing stopped-controller convention; never print raw PowerShell/Codex
stderr to the CLI result.

- [x] **Step 4: Run both focused CLI and controller suites.**

Expected: all CLI and controller tests pass; no command accepts arbitrary
Codex config overrides or dangerous bypass flags.

---

### Task 6: Update routing documentation and verify the implementation

**Files:**
- Modify: `docs/project/current-state.md` in the current M4 delivery section and next bounded action.
- Modify: `docs/project/roadmap.md` in the M4 exit-evidence section.

**Interfaces:**
- Consumes: the final controller/CLI contract and the actual local conformance result.
- Produces: one short current-state route and one roadmap gate; no duplicated historical narrative.

- [x] **Step 1: Add the documentation assertions first.**

Record the command shape, the distinction between `COMPLETED` and host
`BLOCKED`, the four explicit profile probes, and the prohibition on config or
Windows mutation in the current-state/roadmap text. Link to the design and
plan rather than copying their full content.

- [x] **Step 2: Run documentation checks and inspect for redundancy.**

Run:

```powershell
npm run check:docs
```

Expected: existing links remain valid and the new links resolve. Do not add a
second roadmap or repeat the full sandbox research in `README.md`.

- [x] **Step 3: Run the full proportionate verification.**

Run in order:

```powershell
npm test
npm run lint
npm run check:docs
git diff --check
```

Expected: all tests, type checks, documentation checks, and whitespace checks
pass. A live native smoke is evidence only for the exact host/profile run and
must be reported separately from the local suite.

- [x] **Step 4: Run the four fast-fail host probes once each.**

After the implementation is green, run the built CLI with the same disposable
working directory and fixed timeout for:

```powershell
npm run cli -- codex-windows-conformance --workdir C:\Users\<USER>\AppData\Local\Temp --timeout-ms 120000 --profile current
npm run cli -- codex-windows-conformance --workdir C:\Users\<USER>\AppData\Local\Temp --timeout-ms 120000 --profile elevated
npm run cli -- codex-windows-conformance --workdir C:\Users\<USER>\AppData\Local\Temp --timeout-ms 120000 --profile unelevated
npm run cli -- codex-windows-conformance --workdir C:\Users\<USER>\AppData\Local\Temp --timeout-ms 120000 --profile isolated
```

Capture only the normalized JSON states and error classes. Do not retry a
failed cell, change `config.toml`, or execute a repair as part of this task.

- [x] **Step 5: Review the final diff and hand off publication separately.**

Run the repository preflight again, confirm the intended repository/branch/
HEAD/worktree and exact changed paths, review for generated noise or secrets,
and report the native result as `COMPLETED`, `BLOCKED`, or `STOPPED`. Do not
merge or publish until the user explicitly approves the final diff and target.

**Stop condition:** If any live probe would require elevation, a Windows policy
change, a connector, a network call, or a secret read, stop and hand off the
exact required authority instead of attempting it.

---

## Verification summary

The implementation is complete only when:

- the focused controller and CLI negative tests pass;
- the full project tests, lint, docs, and diff checks pass;
- each profile invocation is independently classified from a real command event;
- the result includes sanitized host facts and a concrete recommendation;
- no project policy or global/Windows configuration was modified;
- the final state explicitly distinguishes native pass from host blocker.

No commit, merge, or GitHub publication is part of the implementation plan's
automatic execution. Those remain a separate final-state decision after the
diff and live evidence are reviewed.

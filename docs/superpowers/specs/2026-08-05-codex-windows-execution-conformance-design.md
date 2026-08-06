# Codex Windows Execution Conformance and Host-Native Repair Design

**Date:** 2026-08-05
**Status:** Local implementation complete; native Windows conformance remains `BLOCKED` until a supported profile produces the required marker.
**Owner:** Project Systems Architect / Delivery Technical Lead
**Decision boundary:** host diagnosis and supported Windows remediation only

## 1. Objective

Restore a supported, native Windows Codex execution path for the bounded
activation slice, or produce a precise host-level blocker with enough evidence
for an administrator or OpenAI support to remediate it.

The success condition is not a green wrapper result. A real success requires
Codex to start one harmless read-only PowerShell command through its native
Windows sandbox and return a verifiable marker. The activation controller may
only report `COMPLETED` after that host capability is proven.

## 2. Current evidence

The following facts are already established and must not be re-proven by
changing project code:

- The repository-side Node launcher starts and can consume structured Codex
  output.
- A direct PowerShell process outside Codex returns `HOST_DIRECT_OK`.
- Codex fails before the requested `node` command starts at
  `CreateProcessAsUserW`.
- The current profile (`elevated`), an explicit `unelevated` override, and an
  invocation without user configuration all fail the same minimal process
  test. The failure codes observed are Win32 error `5` and `0xC0070005`.
- The non-secret sandbox log shows successful setup-refresh completion with no
  reported setup errors, but repeated `SetFileAttributesW` access-denied
  messages while handling `C:\Users\Default`.
- No repository policy, connector, shell wrapper, external write, or market
  validation is part of this diagnostic.

These facts classify the issue as a native Codex Windows sandbox runner,
token, ACL, or host-policy boundary. The exact sub-cause remains `UNKNOWN`
until the targeted host audit is complete.

## 3. Selected strategy

Use a staged, fast-fail conformance protocol. Each stage has an explicit
pass/fail/stop result and no stage is allowed to silently widen authority.

### Stage A — Read-only host audit

Collect only non-secret, actionable facts:

- Windows build, architecture, current interactive identity, elevation state,
  and PowerShell executable/version.
- Codex CLI/package version and resolved native helper paths.
- Presence and metadata of the Codex sandbox binaries, without executing
  arbitrary helpers directly.
- Effective configuration values for `[windows].sandbox`, sandbox mode, and
  approval mode, with credentials and unrelated settings redacted.
- Existence and group membership of Codex-created sandbox identities, if
  readable without elevation.
- Relevant local security-rights and ACL evidence, restricted to the Codex
  sandbox identities, helper paths, `C:\Users\Default`, and the repository
  root.
- Sanitized recent entries from `CODEX_HOME\.sandbox\sandbox.log` or the
  dated sandbox log. Never read or copy `.sandbox-secrets`.

The audit must fail closed when a read is denied or an identity cannot be
resolved. `UNKNOWN` is an output, not a reason to guess.

### Stage B — Native conformance smoke

Run the same fixed diagnostic through the supported Codex CLI path:

```text
Use the shell tool exactly once:
node -e "process.stdout.write('HOST_EXEC_OK')"
Do not read or write files, use the network, use connectors, or run another command.
Return whether the marker was produced and the process error class if it was not.
```

The invocation remains `--sandbox read-only --ephemeral`, uses a disposable
working directory, and captures only a bounded, redacted result. No
`--dangerously-bypass-approvals-and-sandbox` run is a product acceptance test.

Run the comparator matrix only when required by the audit:

| Case | Profile | Purpose | Expected interpretation |
| --- | --- | --- | --- |
| B1 | current effective profile | Establish current behavior | baseline |
| B2 | explicit `elevated` | Verify preferred native path | pass permits repair completion |
| B3 | explicit `unelevated` | Verify fallback path | pass is temporary fallback only |
| B4 | isolated config, no user config | Separate persisted config from host | same failure means host boundary |

At most one run per matrix cell is allowed. Repeated identical retries are
not evidence.

### Stage C — Supported repair decision

Select exactly one repair path from the evidence:

1. **Elevated repair (preferred):** re-run the supported Codex sandbox setup
   with administrator approval, then verify sandbox-user creation, required
   logon rights, firewall setup, helper ACLs, and the B2 smoke.
2. **Unelevated fallback:** use only if elevated setup is blocked but the B3
   smoke passes. Record the weaker isolation as an explicit product risk; do
   not silently change the project policy.
3. **Host-policy escalation:** if both native profiles fail, package a
   sanitized diagnostic for administrator/OpenAI support. No ACL, group,
   policy, Defender, or registry mutation is attempted by the project.
4. **Alternative host profile:** WSL or another supported host is a temporary
   delivery fallback only. It does not close native Windows conformance.

The first and second paths require a fresh, operation-specific user approval
before any durable Windows or Codex configuration change.

## 4. Scope and non-goals

### In scope

- Read-only host inventory and log classification.
- One bounded native Codex process-creation smoke per matrix cell.
- A supported remediation recommendation with rollback and verification
  criteria.
- Mapping the resulting verdict back to the activation controller as
  `COMPLETED`, `STOPPED`, or `BLOCKED`.

### Out of scope

- Changing project authorization, repository policy, or activation boundaries.
- Disabling the Windows sandbox or adding a shell wrapper.
- Changing `C:\Users\<USER>\.codex\config.toml` without a separate approval.
- Editing Windows ACLs, local security policy, firewall, registry, UAC, or
  Defender settings without a separate approval.
- Reading `.sandbox-secrets`, tokens, cookies, transcripts, or raw connector
  payloads.
- UA/Graphify, connectors, external writes, GitHub publication, or market
  validation.

## 5. Security and evidence contract

- Every command has a literal target and read-only intent.
- Any path leaving the repository or the explicitly named Codex diagnostic
  locations is rejected.
- Log evidence is normalized: paths become `<USER>` or `<CODEX_HOME>`,
  credentials and arbitrary environment values are removed, and only error
  class, helper role, mode, and timestamp are retained.
- A successful setup-helper run does not prove child-process creation. The
  process marker is the conformance evidence.
- Direct host PowerShell success does not prove Codex sandbox success.
- A sandbox bypass may be used only as an explicitly approved diagnostic
  comparator; it can never promote the native product path to `READY`.

## 6. Acceptance criteria

The bounded task is accepted when one of these two evidence packages exists:

### Native pass

- Stage A audit is complete with no unresolved critical `UNKNOWN`.
- One supported native profile produces `HOST_EXEC_OK` through Codex.
- The result records the exact profile, Codex version, sandbox mode, and
  sanitized evidence.
- The activation controller can distinguish this pass from a model-only
  structured response.
- No project policy or connector boundary changed.

### Host blocker

- Both supported native profiles have one recorded failed smoke each.
- The failure is localized to the Windows runner/token/ACL boundary, not the
  repository command or wrapper.
- A sanitized diagnostic packet identifies the failed host capability, the
  recommended administrator/OpenAI action, and the exact re-test command.
- The project remains explicitly `BLOCKED` or `STOPPED`; it is not promoted to
  `READY` by documentation alone.

## 7. Stop conditions

Stop immediately and preserve evidence if:

- a command requests write access, network access, a connector, or an
  unapproved elevation;
- a target identity, repository, or Codex installation path is ambiguous;
- a read would enter `.sandbox-secrets` or expose credentials;
- the host reports a different error class after a proposed change;
- a repair would modify global Codex configuration or Windows policy without
  fresh approval;
- the smoke result is ambiguous or the child command did not actually start.

## 8. Verification and handoff

The implementation plan that follows this design must contain:

1. exact read-only audit commands and redaction rules;
2. a test-first result classifier for native pass, host stop, timeout, and
   malformed output;
3. one implementation owner for the diagnostic adapter and its tests;
4. an independent review of scope, security, and evidence transport;
5. a final preflight and diff review before any commit or publication.

The next bounded action is to turn this design into the file-and-test-level
implementation plan. No host or repository mutation is authorized by this
design alone.

## References

- [OpenAI Codex Windows sandbox documentation](https://developers.openai.com/codex/windows)
- [Codex issue #25436: Windows local runner cannot start](https://github.com/openai/codex/issues/25436)
- [Microsoft CreateProcessAsUser documentation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw)

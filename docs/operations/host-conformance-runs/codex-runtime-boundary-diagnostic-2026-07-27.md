# Codex runtime-boundary diagnostic — 2026-07-27

**Status:** Read-only diagnostic; no configuration change performed.

**Purpose:** Explain the v2 pilot's startup network attempt and Windows sandbox behavior before any further conformance rerun.

## Observed local configuration

The following values were read from the operator's local Codex configuration with values limited to boundary-relevant settings. No secrets, tokens, API keys, or credential values were read into the evidence:

| Setting | Observed value | Interpretation |
| --- | --- | --- |
| `approval_policy` | `on-request` | Runtime may request approval for actions. |
| `sandbox_mode` | `danger-full-access` | Local default is broader than the pilot boundary; the CLI invocation attempted to override it with `--sandbox read-only`. |
| `web_search` | `live` | Live web capability is enabled by local default. The pilot prompt did not authorize web use. |
| `network_access` | `true` | Local runtime permits network access by default. |
| Windows sandbox | `elevated` | The configured Windows sandbox mode is elevated. |
| Plugin/marketplace sections | Present | Startup plugin/catalog behavior is configured locally. |
| Hook state | Present | Startup and tool lifecycle hooks are configured locally; the pilot logged `SessionStart Failed`. |

## Evidence correlation

- The v1 pilot requested `--sandbox read-only`, but after the first child-process spawn failed, the Codex agent retried with elevated local execution. This is consistent with the observed elevated Windows sandbox configuration, but the diagnostic does not prove the exact internal retry decision path.
- The v2 pilot correctly stopped after the same child-process spawn failure and did not retry or elevate.
- The v2 startup attempted a remote plugin-catalog request before the task read began. The configured plugin/marketplace state and `network_access=true` explain why the request was possible, but they do not authorize that request under the frozen local-only pilot boundary.

## Decision

The current operator configuration is not a valid proof environment for a local-only, no-network Codex conformance claim. It may be used to test stop behavior, but not to claim effective sandbox or network isolation.

No setting was changed. Do not rerun the pilot until the owner chooses and documents one of these separate paths:

1. a disposable, explicitly no-network/no-elevation Codex test profile with independently verified effective behavior; or
2. a bounded host-behavior diagnostic that records startup network and sandbox behavior as the subject under test, without calling it local-only conformance.

This finding does not authorize changing the user's global Codex configuration.

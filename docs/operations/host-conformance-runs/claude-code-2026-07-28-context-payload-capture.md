# Claude Code context-payload capture attempt — 2026-07-28

**Purpose:** bounded follow-up to M2, testing whether the raw host-assembled context can be recovered outside the model turn.

## Boundary

- Read-only inspection of the native Claude session metadata, persisted transcript, and session-local permission state.
- No session, configuration, credential, connector, MCP, repository, or external-source changes.
- No permission prompt was approved and no retry was performed.

## Artifacts inspected

| Artifact | Observation |
| --- | --- |
| `C:/Users/littl/.claude/sessions/32012.json` | Session metadata; native Claude Code version `2.1.219`, cwd `C:/Users/littl/.claude/sessions`, session id `f4a9d8a1-3c54-4d0c-b9a7-ea37b95a166f`. |
| `C:/Users/littl/.claude/projects/C--Users-littl--claude-sessions/f4a9d8a1-3c54-4d0c-b9a7-ea37b95a166f.jsonl` | Persisted transcript for the session; contains the M2 user prompt and the assistant response. |
| `C:/Users/littl/.claude/sessions/.claude/settings.local.json` | Session-cwd-local permission state was present outside the validation worktree. It was not changed. |
| `C:/Users/littl/AppData/Local/Claude` | Desktop-local inspection found only `Logs/chrome-native-host.log` at the checked depth; no context-assembly setting or raw prompt-payload export was exposed. |

## Capture result

- The persisted transcript contains the M2 prompt and final report, but no standalone raw system/user context record for the block attributed to `C:/Users/littl/.claude/CLAUDE.md`.
- Searches found no persisted `Contents of C:\Users\littl\.claude\CLAUDE.md` source block. The occurrences of `system-reminder`, `userEmail`, and `currentDate` are in the assistant's reported response, not an independently captured host payload.
- Therefore the raw injected bytes and the exact host assembly boundary remain unavailable outside the model turn.
- No safe, user-configurable local host switch was found that could remove or correct the attributed extra sections; the repository-side guard is therefore the only controlled remediation in this workspace.

## Follow-up: fresh project-cwd M2 rerun

The follow-up was run after creating the project-root `CLAUDE.md` and selecting the actual validation worktree in the Claude Desktop UI.

- Session cwd: `C:/Users/littl/Documents/AI Booster Kit/.worktrees/claude-native-validation` (exact match).
- Project source: 1861 bytes, SHA-256 `253c8a6cb04bd1918156f624fe2850eddd73102dae0547d3cbb63f10b1cf358a`; untracked and absent from `HEAD`.
- User source: 231 bytes, SHA-256 `f7d43e693a0ac6097f32c32ebcf8b8dc148ca7808ae36fa23247d816faec7590`.
- Native project-load event: observed before the diagnostic tool calls, but the host-supplied body is still only rendered context, not raw bytes.
- `verify.ps1 -NoCapturedPayload`: `UNKNOWN`, exit 10 for Project and UserLevel.
- Host descriptor conflict: project `CLAUDE.md` was described as “checked into the codebase”, while git showed untracked/not in `HEAD`.

This follow-up confirms the project-local default is discoverable from the correct cwd, but it does not close the raw-payload gap. The overall M2 result remains `BLOCKED`; if the VCS descriptor is generic boilerplate, the defensible alternative is `UNKNOWN`. No capture file was created because the Claude diagnostic boundary was read-only.

## Classification

- Raw payload capture: `NOT AVAILABLE`.
- M2 context-integrity classification remains `BLOCKED`; no evidence supports promotion to `PASS` or reduction to `UNKNOWN`.
- Behavior verdict remains `PARTIAL`.
- Security verdict remains `NOT EVALUATED`.

## Next bounded action

Do not infer payload equality from the persisted transcript. The local acceptance boundary is enforced by [`tools/claude-context-integrity/verify.ps1`](../../../tools/claude-context-integrity/verify.ps1); a future host-side attempt still requires platform-level instrumentation or an explicitly exposed export of the assembled prompt payload. Until that exists, retain the disk-authoritative rule and the `BLOCKED` result.

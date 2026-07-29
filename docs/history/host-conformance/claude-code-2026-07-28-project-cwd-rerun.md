# Claude Code project-cwd rerun — 2026-07-28

**Source:** User-provided pasted result from a fresh native Claude session. The diagnostic itself was chat-only and read-only; this concise run record was added afterward to preserve the handoff facts.

## Scope and cwd

- Required and observed session cwd: `C:\Users\littl\Documents\AI Booster Kit\.worktrees\claude-native-validation`.
- Git revision: `c41e4c891becbe97f8576b99fd0f187dca59d86c`, detached HEAD, dirty.
- No file or external system was changed by the Claude diagnostic.

## Direct source evidence

- Project root: `CLAUDE.md`, 1861 bytes, SHA-256 `253c8a6cb04bd1918156f624fe2850eddd73102dae0547d3cbb63f10b1cf358a`; LF-only, no BOM, trailing newline; untracked and absent from `HEAD`.
- User level: `C:\Users\littl\.claude\CLAUDE.md`, 231 bytes, SHA-256 `f7d43e693a0ac6097f32c32ebcf8b8dc148ca7808ae36fa23247d816faec7590`; graphify pointer only.
- The project body appeared textually consistent with disk, but no raw host source-block capture was exposed.

## Gate and classification

- `tools/claude-context-integrity/verify.ps1 -NoCapturedPayload`: `UNKNOWN`, exit 10 for both Project and UserLevel.
- Native project-load event: observed before the diagnostic's tool calls; this proves a load event was present in context, not byte provenance.
- Overall context-integrity result: `BLOCKED`.
- Basis: injected-vs-disk equality remains `UNKNOWN`, and the host descriptor said the project file was “checked into the codebase” although git showed it untracked and absent from `HEAD`. If that descriptor is generic boilerplate, the alternate defensible classification is `UNKNOWN`; `PASS` is unavailable either way.
- Behavior verdict: `PARTIAL`.
- Security verdict: `NOT EVALUATED`.

## Handoff

The project-local `CLAUDE.md` is now discoverable from the correct Claude worktree cwd, so the local default-file fix is operationally in place. The remaining gap is host-side: expose or instrument the raw assembled context payload, or document the VCS descriptor as boilerplate. No commit or stage was performed.

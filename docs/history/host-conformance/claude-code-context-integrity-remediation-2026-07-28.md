# Claude Code context-integrity remediation — 2026-07-28

**Milestone:** M2

**Status:** The local acceptance boundary is now executable and fail-closed. A fresh native Claude run from the required project worktree directly verified the new project-root `CLAUDE.md`; the executable gate returned `UNKNOWN` for both scopes because no raw host payload was available. The overall run remains `BLOCKED` because the host's `checked into the codebase` descriptor conflicts with the on-disk untracked state; if that descriptor is generic boilerplate, the defensible floor is still `UNKNOWN`.

## Trigger

The native Windows Claude observation reported context under a `CLAUDE.md` filename that was not byte-faithful to the on-disk file. The prior run is preserved unchanged in [the captured response](claude-code-2026-07-28-behavior-response.md); this remediation does not rewrite that evidence or upgrade its verdict.

The follow-up run was performed from the actual validation worktree after adding a project-root `CLAUDE.md`. Its rendered project body appeared textually consistent with the on-disk file, but the host exposed no raw source-block capture, so byte equality remains unproven.

## Change

The Claude Code adapter now requires a direct on-disk reopen of the exact `CLAUDE.md` path before treating a host-reported load as verified file content. It also distinguishes:

- host-injected context;
- user-level instructions;
- project, nested, or managed instructions;
- permission and enforcement settings.

The adapter defines explicit `PASS`, `UNKNOWN`, and `BLOCKED` classifications for missing, ambiguous, inaccessible, mismatched, or stale context evidence.

The repository now also includes the dependency-free executable guard at [`tools/claude-context-integrity/verify.ps1`](../../../tools/claude-context-integrity/verify.ps1), with a regression harness at [`tools/claude-context-integrity/test-verify.ps1`](../../../tools/claude-context-integrity/test-verify.ps1). The guard compares the direct source read and an explicitly supplied raw source-block capture byte-for-byte; it returns `PASS` only for equality, `UNKNOWN` when capture is unavailable, and `BLOCKED` for path, read, or content mismatches.

The validation worktree also contains the project-scoped [`CLAUDE.md`](../../../CLAUDE.md). It is deliberately repository guidance only; it is not a permission, sandbox, hook, MCP, credential, or security control.

## M2 acceptance criteria

- A fresh native Claude run records the exact resolved `CLAUDE.md` path and repository/worktree revision.
- The run directly reopens the file from disk before relying on its content.
- If captured/injected content is available, the run records byte-identity or hash comparison evidence.
- Injected context, instruction scope, and enforcement settings are reported as separate layers.
- Any mismatch, ambiguity, inaccessible path, or unavailable comparison remains `UNKNOWN` or `BLOCKED`; it is not silently promoted.
- Prior Claude behavior evidence remains unchanged and separately referenced.

## Verification status

- Adapter text present: `PASS`.
- Prior evidence preserved: `PASS`.
- Fresh native Claude re-run from the required cwd: `PASS` as a procedure; context-integrity result `BLOCKED` overall, with injected-vs-disk equality `UNKNOWN`.
- Actual session cwd: `C:/Users/littl/Documents/AI Booster Kit/.worktrees/claude-native-validation`; it matched the required project directory exactly.
- Worktree revision recorded: `c41e4c891becbe97f8576b99fd0f187dca59d86c`, detached HEAD, dirty.
- Project-root path reopened: `C:/Users/littl/Documents/AI Booster Kit/.worktrees/claude-native-validation/CLAUDE.md`; 1861 bytes, SHA-256 `253c8a6cb04bd1918156f624fe2850eddd73102dae0547d3cbb63f10b1cf358a`, LF-only, no BOM, trailing newline.
- Project `CLAUDE.md` revision state: untracked, not present in `HEAD`, and not ignored. No commit/stage was performed.
- Exact user-level path reopened: `C:/Users/littl/.claude/CLAUDE.md`; 231 bytes, SHA-256 `f7d43e693a0ac6097f32c32ebcf8b8dc148ca7808ae36fa23247d816faec7590`; only the `# graphify` section is present.
- Project-level instruction layer: present at the worktree root; nested `CLAUDE.md` and `.claude/` surfaces remain absent in the worktree and main repo.
- Raw host-payload comparison: `UNKNOWN`; `verify.ps1 -NoCapturedPayload` returned `UNKNOWN` / exit 10 for both Project and UserLevel.
- Host metadata conflict: the fresh injected descriptor called the project file “checked into the codebase”, while direct git inspection showed untracked and absent from `HEAD`. This is the basis for the overall `BLOCKED` classification; if generic boilerplate, the alternative is `UNKNOWN`.
- Executable guard regression harness: `PASS` (`pwsh -NoProfile -NonInteractive -File tools/claude-context-integrity/test-verify.ps1`); exact match, mismatch, and unavailable-capture paths are covered.
- Current incident through the guard: `BLOCKED` as designed; direct source hashes are project `253c8a6c…f358a` / 1861 bytes and user-level `f7d43e69…c7590` / 231 bytes, while no faithful host source-block capture is available.
- Three named repository document reads: `PASS`.
- Behavior verdict: `PARTIAL`.
- Security boundary: `NOT EVALUATED`.
- External payload capture: `NOT AVAILABLE`; the prior persisted transcript and the fresh project-cwd run contain rendered prompt/report text but no standalone raw host-assembled context payload.

## Handoff

The M2 acceptance criteria are met for the local remediation path: a fresh native Windows Claude run from the exact worktree cwd directly reopened the project and user-level paths, separated host-injected context from disk instructions and enforcement settings, and refused to treat unproven injected bytes as authoritative. The executable guard now prevents this evidence gap from being silently accepted in future runs. The host behavior remains `PARTIAL` because raw provenance is unavailable and the host supplied a contradictory VCS descriptor. Security remains unevaluated. The remaining bounded action is host/platform-side: expose or instrument the raw host-assembled payload, if the platform supports it, and classify the descriptor as computed behavior or boilerplate; until then the result correctly remains `BLOCKED` (or, under the boilerplate reading, `UNKNOWN`).

Full captured response: [claude-code-2026-07-28-context-integrity-response.md](claude-code-2026-07-28-context-integrity-response.md)

Payload capture attempt: [claude-code-2026-07-28-context-payload-capture.md](claude-code-2026-07-28-context-payload-capture.md)

Fresh project-cwd rerun record: [claude-code-2026-07-28-project-cwd-rerun.md](claude-code-2026-07-28-project-cwd-rerun.md)

M2.1 host-capability investigation: [claude-code-host-capability-investigation-2026-07-28.md](claude-code-host-capability-investigation-2026-07-28.md)

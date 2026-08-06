# Codex CLI Activation Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first product-facing M4 vertical slice: consume one validated Activation Boundary Package, read one explicit local source file, run one Codex CLI `exec` operation in a read-only ephemeral sandbox, and return a validated structured result with explicit completion, evidence, and stop/failure state.

**Architecture:** Keep activation-package validation as a pure reusable boundary. Add a small Codex execution controller that validates package, working-directory and source-file boundaries before constructing a fixed prompt and schema. Run the native Codex executable with `spawn` and `shell:false`, `--sandbox read-only`, `--ephemeral`, `--output-schema`, and `--output-last-message`; never allow connectors, external writes, retries, or implicit target paths. Wire the controller through an explicit CLI command and preserve the repository's one-JSON-result/explicit-exit-code convention.

**Tech Stack:** TypeScript/Node.js 22, Node built-ins (`child_process`, `fs/promises`, `path`, `os`), existing controller types, `node:test`, official Codex CLI `exec` contract.

## Global Constraints

- Scope is limited to the Codex local read-only execution slice; Claude, AgentDeck, UA/Graphify, connectors, host policy, market validation, and external writes are out of scope.
- The source path and working directory are explicit. The source must be a regular file within the resolved working directory and below the bounded read-size limit.
- The runner must use `shell:false`, a native executable, bounded stdout/stderr collection, a positive timeout, and no retry.
- No new dependency is required; fixed result validation is local and deterministic.
- Existing dirty documentation changes and the untracked Outcome-to-MVP brief are preserved and are not silently reverted.
- No commit, push, merge, or PR is part of this implementation slice.

> **Publication note:** This was the original implementation boundary. A later,
> explicit User-approved release decision owns review, PR, CI, and merge
> separately; it does not expand this slice's runtime authority.

## Acceptance Criteria

- A valid v2.0 Activation Boundary Package is accepted; malformed, stale, or inconsistent packages stop before process creation.
- Exactly one explicit local source file is read, never written, and its evidence is represented in the result.
- Codex is invoked only with read-only sandbox and ephemeral session flags plus a fixed JSON output schema.
- Successful structured output is returned only when the process exits zero and the schema/result invariants validate.
- Missing executable, invalid arguments, timeout, non-zero exit, oversized output, malformed model output, path escape, symlink, and source-size violations produce explicit safe stop/failure states without leaking raw stderr or source secrets.
- CLI integration covers a positive path and the principal negative paths; existing tests, build, lint, docs check, and diff check remain green.
- `current-state.md` and `roadmap.md` describe the delivered M4 slice and its remaining limit without claiming full product or host/security readiness.

## Implementation Tasks

- [x] **Task 1 — Extract reusable Activation Package validation.**
  - Files: `src/controller/activation-storage.ts`, `test/controller-activation-storage.test.ts`.
  - First add a failing test proving the exported validator accepts a round-tripped prepared package and rejects a forged package identity/state.
  - Export `validateActivationPackage(value: unknown): ActivationBoundaryPackage`, retain the existing exact reconstruction checks, and make `saveActivationPackage` use it.
  - Run the focused storage test and then the existing activation storage/boundary tests.

- [x] **Task 2 — Define the execution contract and bounded prompt.**
  - Files: `src/controller/codex-execution.ts`, `src/controller/types.ts`, `test/controller-codex-execution.test.ts`.
  - First add failing unit tests for explicit argument validation, package-to-prompt projection, result schema invariants, and source path/symlink/size rejection.
  - Implement pure types and validation for `COMPLETED`, `STOPPED`, `FAILED`, and `TIMED_OUT` results plus `SUCCEEDED`/`STOPPED` model responses.
  - Ensure the prompt carries only validated package instructions, profile/goal/context, source-relative identity, and the fixed no-write/no-connector boundary.

- [x] **Task 3 — Implement the native Codex process runner.**
  - Files: `src/controller/codex-execution.ts`, `test/controller-codex-execution.test.ts`.
  - First add failing process-level tests using a temporary native Node helper executable/script for success, non-zero exit, timeout, malformed output, and output-size limits.
  - Implement `spawn(..., { shell: false, cwd, windowsHide: true })`, temp schema/last-message files, bounded collection, timeout kill, cleanup in `finally`, and explicit error-code mapping.
  - Do not retry and do not include raw stderr or unrestricted child output in returned artifacts.

- [x] **Task 4 — Wire the bounded slice into the CLI.**
  - Files: `src/cli.ts`, `test/controller-activation-execution-cli.test.ts` (new), `test/bootstrap.test.ts` if help coverage needs extension.
  - First add failing CLI tests for exact `execute-activation` argument grammar, positive structured output, missing source, escape, malformed package, and command-unavailable stops.
  - Add help/dispatch for `execute-activation --input <package> --source <file> --workdir <dir> --timeout-ms <positive-ms> [--codex-command <native-executable>]`.
  - Keep stdout to one JSON result and use the existing safe stop envelope for configuration/input failures.

- [x] **Task 5 — Verify and update routing state.**
  - Files: `docs/project/current-state.md`, `docs/project/roadmap.md`.
  - Run the narrow tests, full `npm test`, `npm run lint`, `npm run check:docs`, `git diff --check`, and one manual local smoke using the installed native Codex executable with a temporary source file.
  - Review the complete diff for scope creep, generated files, secrets, and worktree impact; rerun the work-state preflight.
  - Record M4 as `COMPLETE_WITH_LIMIT` only if the local slice has evidence; retain explicit limits for host security, Claude, connectors, external writes, and market proof. Set one next bounded action.

## Stop Conditions

Stop without broadening scope if the native Codex executable cannot be resolved safely, the package/source boundary is ambiguous, the process contract differs from the documented CLI, or a test reveals an unverified host/security assumption. Preserve evidence and report the exact next decision.

## Verification Commands

```powershell
npm run build
node --test dist/test/controller-activation-storage.test.js dist/test/controller-codex-execution.test.js dist/test/controller-activation-execution-cli.test.js
npm test
npm run lint
npm run check:docs
git diff --check
```

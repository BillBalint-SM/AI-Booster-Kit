# Current delivery state

This is the sole operational routing source for the repository. Historical
delivery evidence remains under `docs/history/` and the reviewed design/plan
artifacts; this file records only the current actionable state.

## Branch and pull request

The published delivery line is `main` / `origin/main`. It contains the bounded
source/worktree and host-evidence binding commit
`b20c9ba72efe3450c7a737455abf8a50d4a754d9`, the platform-language artifact
commit `7b5fac6e3bdacaea53e8cdd37f3d45dde5cf5615`, and the Windows canonical-path
CI fix `843834605bfdf40a8c9925feca3f1179c64ae1bc`. These commits were published by
explicitly approved fast-forward pushes; no pull request was used.

## Completed deliverable

The published Slice 1 implementation adds one agent-agnostic read-only admission
answer immediately before a future dispatch. It binds a freshly prepared task
to the canonical run, graph, controller, runtime receipt, direct Codex session
digest, exact Git repository/worktree/workspace identities, immutable source
revision, and explicit audited paths. The result is a deterministic canonical
`DispatchReadinessReceipt` in exactly one state: `READY`, `STOPPED`, or
`UNKNOWN`.

The implementation includes exact policy/schema limits, bounded no-shell Git
observation, path/symlink/junction containment, canonical host and source
evidence, complete reason precedence, bounded UTF-8 JSON input, and two
read-only CLI commands. `READY` does not dispatch, persist an intent/receipt,
consume budget, or grant authority. The legacy single-phase dispatch and stop
commands still reject without mutation.

The current documentation delivery also preserves the reviewed Platform
Language Unification design and implementation plan, provides the canonical
terminology-normalization table, and replaces user-specific work-state script
paths in the reference-run plan with a portable `USERPROFILE`-relative form.

## Validation

On the observed Windows host (Node `v26.7.0`, Git
`2.55.0.windows.3`, runtime lane `CONFORMANCE_ONLY`):

- `npm ci` and `npm audit` completed with 0 vulnerabilities;
- `npm run lint`, `npm run build`, `npm run check:docs`, and
  `git diff --check` passed;
- `npm run test:execution-storage` passed 112/112;
- `npm test` passed 598 tests with 1 intentional existing
  platform-specific skip and 0 failures;
- real Git and real SQLite E2E tests proved the new inspection paths do not
  mutate repository state or database bytes.

The canonical binding policy digest is
`f67e15ffb174f31cfd76a42332d6fd1bf3aabd6b79868c3ee502bcaac09acf62`.
The checked-in policy and schema file SHA-256 values are respectively
`2578c5165b79b224bfc0b0930ba3875c9199c388f8d24a076133934ddc8174ee`
and
`0e14b43b148a1c9f18124f10ca21c1895b047925effac92330e682a60dce1bd4`.

GitHub Actions run `31282562058` passed for commit
`843834605bfdf40a8c9925feca3f1179c64ae1bc`: Node 24 authoritative and Node 26
conformance lanes are green on Ubuntu and Windows, and the website job is
green. Documentation runs `31282139512` and `31282396652` passed for the two
preceding publication commits. The initial binding CI run exposed a Windows
8.3-path test expectation defect; the canonical-path test fix was verified by
both Windows lanes in the successful replacement run.

## Known limit

This slice observes normal host behavior; it does not prove sandbox,
instruction-precedence, credential, plugin, or permission security boundaries.
Only `CODEX_APP_NATIVE_V1` is admitted. Legacy or unavailable host-session
identity remains `UNKNOWN`; a proven different current session is `STOPPED`.
Network worktrees, external models/APIs/connectors, Team synchronization,
evidence resolution, two-phase dispatch, verified cancellation, retry,
reconciliation, and the repeated Codex-native Multi-Agent Pipeline reference
run are not implemented by this slice.

## Open stop

No worker was spawned and no dispatch intent, receipt, graph transition, or
external connector write was created during this delivery. The Codex-native
Multi-Agent Pipeline reference run remains stopped until Slice 2 implements
and proves two-phase dispatch plus verified cancellation. Any live operation
or other consequential action requires fresh exact approval.

## Next bounded action

Begin Slice 2 as a new bounded branch from current `origin/main`: atomic
two-phase Dispatch with budget reservation, verified Codex-native activation
identity, and verified cancellation. The subsequent reference run remains
stopped until that contract is accepted and green.

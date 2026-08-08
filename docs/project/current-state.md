# Current delivery state

This is the sole operational routing source for the repository. Historical
delivery evidence remains under `docs/history/` and the reviewed design/plan
artifacts; this file records only the current actionable state.

## Branch and pull request

The published baseline is `main` / `origin/main` at
`daae4ee413b6de47777a43ca091efba97da0ac00`.

Source/worktree and host-evidence binding is local review state on
`dev-source-host-binding`, based on that exact revision. The worktree contains
the expected uncommitted Slice 1 diff, tracks `origin/main`, and has no pull
request. No commit, push, publication, or merge is authorized by this state.

## Completed deliverable

The local Slice 1 implementation adds one agent-agnostic read-only admission
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

GitHub CI is `NOT EXECUTED` for this uncommitted review state. No Ubuntu,
Node 24 authoritative-lane, website, or documentation result is claimed for
the Slice 1 diff.

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
external write was created during this delivery. Any publication, merge, live
operation, or other consequential action requires fresh exact approval.

## Next bounded action

Review the complete local diff. After separately authorized commit/publication
and green Node 24 authoritative plus Node 26 conformance CI on Ubuntu and
Windows, begin Slice 2: atomic two-phase Dispatch with budget reservation,
verified Codex-native activation identity, and verified cancellation. The
subsequent reference run remains stopped until that contract is accepted and
green.

# Current delivery state

This is the operational routing source for the repository. It is intentionally
short and must not become a second roadmap, transcript, or historical report.

## Branch and pull request

The current published delivery state is `main`, equal to `origin/main`; its
exact SHA, worktree, and pull-request status are verified by the work-state
preflight at each delivery boundary. M2 was integrated through
[PR #40](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/40), M3 through
[PR #41](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/41), and the
routing/mapper state through
[PR #42](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/42). The later
main promotions are [PR #43](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/43)
(context and activation hardening),
[PR #44](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/44) (Agent Profile
library), [PR #45](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/45)
(Agent–Role and Formation coverage), and
[PR #46](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/46) (mapper
refresh after that coverage).

The next bounded slice must start from this synchronized `main` in a fresh
feature stream, use a unique `dev-<scope>` branch, and follow the approved
`dev → feature → main` delivery path. Historical or host-specific branches do
not represent current canonical product state.

## Completed deliverable

The repository has a contract-first foundation, the Team Delivery Loop, the
Controller recommendation MVP, the Human Checkpoint and Activation Intent
boundary, the first Quick Task capability contract, the ephemeral Quick Task
Activation Package command, and the public-facing website surface. M1-A now
adds the strict [formation catalog](../../contract/agent-library/formation-catalog.md)
contract and TypeScript validator with one ready Quick Task entry and five READY
scenario profiles: research, validation, refinement, implementation, and
debugging. M1-B adds deterministic scenario recognition and explainable,
recommendation-only output with stable structural identity. The read-only
`recommend-formation` CLI command exposes all five profile paths as `RECOMMEND`
when all required profile input is present and preserves `UNKNOWN` otherwise,
without changing Quick Task checkpoint or activation behavior. The user-facing
Agent Profile library now exposes 24 selectable profiles without copying
developer-instruction bodies. The Role catalog and Formation catalog add
many-to-many Agent–Role coverage, isolated context assignments, and bindings
for the six declared formations. The read-only `inspect-agent-library` and
`list-agent-profiles` CLI paths expose these projections without activation or
external writes.

## Validation

The local M2 boundary, explicit storage, and CLI suites pass. M3 adds strict
Milestone/Epic Markdown contexts, compact session-state validation with
explicit runtime evidence checks, explicit
Personal/Team persistence, pure resume evaluation, and the team scope contract:
full Milestone-bundle read, one-Epic execution for developer sessions, and a
declared owner-approved-PR requirement for canonical artifacts. The local
saver does not inspect Git history, branch ownership, or PR approval. The
focused M3 review hardening adds runtime validation for the Milestone envelope
and current execution scope. The current implementation full-suite evidence is
357/357 under the available local Node v26.4.0 runtime.
`npm run build`, `npm run lint`, `npm run check:docs`,
`npm run check:mappers`, and `git diff --check` pass.
The package declares Node 22.x; local Node 26 is not the declared runtime, so
local results remain local evidence. M2 behavior remains local and
deterministic: no host runtime, generated host artifact, connector call,
external read, Git operation, or publication is performed.

The committed Graphify and Understand Anything snapshots identify the same
stable source revision `3a05a35586ad644f30d149f1fe259dd27130c6f4`; the current
HEAD is `74105a270431c7d64f5995af6154130412ac1676`, and
`MAPPER_FRESHNESS=READY`. The refresh used Graphify code-only extraction and UA
deterministic local structural extraction; no semantic-extraction backend or
credentialed external analysis was invoked. Mapper output remains a navigation
projection, not an activation or publication authority.

## Known limit

The five scenario profiles remain READY only as bounded M1 recommendation
paths. M2 now provides a pure `ACTIVATION_PACKAGE_PREPARED` boundary, explicit
one-at-a-time tuning data, preserved setup/rollback references,
Ephemeral/Personal/Team retention, safe Personal/Team JSON persistence, and
strict `prepare-activation`/`save-activation` CLI operations. M3 now adds
strict context source Markdown, compact redaction-checked session state, explicit
context/session persistence, full-Milestone-bundle-read/one-Epic-execution
scope validation, and pure resume decisions. Canonical artifact authority is
declared as owner-approved PR flow but is not locally enforced. Host adaptation and
execution, evaluation/evolve, debugging context injection, and lifecycle
synchronization remain future work. M2 and the local M3 slice are
`COMPLETE_WITH_LIMIT`: they never activate an Agent or perform external work.
Mapper freshness remains commit-relative and is a navigation projection only.
The Agent Profile, Role, and Formation catalogs remain read-only product
projections; host-specific `.codex/agents` prompt files are not canonical
runtime activation and are intentionally outside the current main delivery.
Host adaptation and native execution are not claimed by the current main
state. Canonical artifact writes still require the owner-approved PR flow; the
local saver does not enforce that authority.
Mapper output remains a navigation projection; source, tests, and Git review
remain authoritative.

## Open stop

No generic Jira, Confluence, or GitHub synchronization is authorized by this
document. Any future external operation requires an exact target, operation-
specific approval, bounded authority, and source-native read-back.

## Next bounded action

Create the next feature stream from synchronized `main` for the approved M4-A
design and Codex-first host-conformance planning. The M4-A slice must define
native loading/read-back, scoped identity, effective tool boundaries, and the
execution evidence contract before any host activation. No host activation,
semantic-extraction backend, connector write, or automatic Git operation is
authorized by this state alone.


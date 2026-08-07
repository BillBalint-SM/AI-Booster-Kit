# Current delivery state

This is the operational routing source for the repository. It is intentionally
short and must not become a second roadmap, transcript, or historical report.

## Branch and pull request

The current published delivery state is `main`, equal to `origin/main`.
Exact branch, HEAD, worktree, upstream, and pull-request state are verified by
the work-state preflight at each delivery boundary; this routing file does not
duplicate the detailed status history.

The next bounded slice must start from this synchronized `main` in a fresh,
unique `dev-<scope>` branch and follow the lean reviewed-slice path to `main`.
Historical or host-specific branches do not represent current canonical
product state.

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
external writes. Planning-Show adds three immediately usable, User-facing
planning, technical-handoff, and read-only-verification contracts; its complete
Controller runtime remains `NOT_EXECUTED`. Owner Identity v1 adds a Windows
user-local display-alias profile and non-blocking `recommend-formation`
pre-session gate. M4 adds `execute-activation`, which consumes one validated
activation package and one explicit local source through a bounded Codex
read-only/ephemeral process contract, plus the separate
`codex-windows-conformance` diagnostic. The deterministic Agent-Agnostic
Execution Contract Kernel is now complete in local review state: immutable
read-only execution envelopes, bounded DAG and repair validation, exact task
and Result Envelope admission, Personal hash-chained runs and content-hashed
artifacts, fail-closed resume, final handoffs, comparison, and nine
model-free CLI commands. It has not started an agent or contacted an external
model.

## Validation

The current local implementation evidence is 421 pass / 1 intentional
Windows-only skip under Node v26.7.0. The deterministic Kernel and reference
adapter have 20 focused execution tests; `npm run lint`, `npm test`, `npm run
check:docs`, and `git diff --check` pass in the review worktree before
publication.
Mapper freshness is recorded separately for the committed snapshot below; it
is not a general documentation-change gate.
The package declares Node 26.x. Local results establish compatibility with the
current local Node 26 runtime, not CI or production proof. Controller, M1, M2,
and M3 behavior is local and deterministic; external behavior is not
established by this local evidence.

The committed Graphify and Understand Anything snapshots identify the same
stable source revision `20ed6dc401b31c3075c1c16933c404537fe075f2`; the
commit-relative freshness is `READY`. The refresh used Graphify code-only
extraction and UA
deterministic local structural extraction; no semantic-extraction backend or
credentialed external analysis was invoked. Mapper output remains a navigation
projection, not an activation or publication authority.

## Known limit

The five scenario profiles are READY only as bounded M1 recommendation paths;
M2 activation-package preparation/storage and M3 context/session/resume remain
`COMPLETE_WITH_LIMIT`. M4 proves only the local Codex process contract:
host-specific security enforcement, native Windows process creation, Desktop
host behavior, Claude/Cursor conformance, evaluation/evolve, debugging context
injection, and lifecycle synchronization remain unproven or future work.
The Kernel proves a local, deterministic contract only; its Codex-native
Multi-Agent Pipeline reference run, host evidence, and any comparison outcome
remain `NOT_EXECUTED`. The package declares Node 22.x, while this evidence was
collected under Node 26 and is not declared-runtime proof.
Planning-Show has no complete Controller runtime yet, and Owner Identity is
Windows-only. Canonical artifact authority is declared as owner-approved PR
flow but is not locally enforced. Agent Profile, Role, and Formation catalogs
are read-only projections; host-specific `.codex/agents` prompt files are not
canonical runtime activation and remain outside `main`. Mapper output is a
commit-relative navigation projection; source, tests, and Git review remain
authoritative.

## Open stop

Any consequential operation requires an exact target, operation-specific
approval, bounded authority, and source-native read-back.

## Next bounded action

On a compatible Node 22 runtime, execute the separately planned, read-only
Codex-native Multi-Agent Pipeline reference run through the Kernel, then run
the bounded strong-single-agent comparison. Preserve `NOT_EXECUTED` if the
required host evidence or runtime remains unavailable. Neither action
authorizes external writes, model APIs, or a broader host capability claim.


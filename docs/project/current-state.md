# Current delivery state

This is the sole operational routing source for the repository. It records
the current Foundation Reset review state, not a historical runtime delivery
claim.

## Branch and pull request

- Freshness: `2026-08-10T02:35:10.0747154Z`
- Branch: `dev-foundation-reset-design`
- HEAD: `dda758b3c729c364126285f171a0414fc6d635c3`
- Worktree: `dirty`; the Foundation Reset is an uncommitted review package.
- Upstream: `none`; pull-request state: `{"status":"none","evidence":"no pull request found for current branch"}`.
- No commit, push, pull request, merge, external write, global configuration change, or runtime change occurred in this slice.

## Completed deliverable

The Foundation Reset creates `VISION.md`, `DOMAIN.md`, and `CONTEXT.md`; adds
ADR-0001 and the `docs/agents/` configuration documents; replaces the shared
repository guidance with a short `AGENTS.md` router; reduces `CLAUDE.md` to
its Claude-specific context-integrity projection; and rewires the README,
roadmap, and documentation map to the new canonical owners.

The [Foundation Reset migration record](../history/foundation-reset/2026-08-10-document-migration-record.md)
classifies retained, rewritten, and archived-in-place legacy documents. No
legacy document was deleted or relocated.

## Validation

- `npm run check:docs` passed after the README, roadmap, and documentation-map rewrite.
- `git diff --check` passed after the `AGENTS.md` and `CLAUDE.md` rewrite.
- The router/projection check found no shared operating-loop copy in `CLAUDE.md` and no Claude context-integrity implementation in `AGENTS.md`.
- The source-ownership audit found the vision statement and v1 gate only in active `VISION.md`; the only `NOTES.md` mention in an active entry point says it is not default context.

## Known limit

This documentation slice does not prove host security, instruction-loading
behavior, tool availability, connector behavior, external authority, or v1
completion. Passing local documentation checks are evidence for this review
package, not proof of any live external behavior.

## Open stop

No real v1 proof has run yet: there is no standalone plan proof, review/test
proof, safe-stop proof, or end-to-end change proof. No GitHub, Jira,
Confluence, MCP, plugin, credential, or global Codex operation was attempted.

## Next bounded action

After this Foundation Reset review is accepted, select and explicitly approve
the `Standalone Plan Proof` slice from [the roadmap](roadmap.md). It must not
start automatically.

# Current delivery state

This is the sole operational routing source for the repository. It records
the current Foundation Reset publication state, not a historical runtime
delivery claim.

## Branch and pull request

- Freshness: `2026-08-10T06:08:36.1361672Z`
- Branch: `main`
- HEAD: `9b84c0580d8566a76fe8ff8c5e1c0051e4a8dbc2`
- Worktree: `clean` at observation.
- Upstream: `origin/main`; pull-request state: `{"status":"none","evidence":"no pull request found for current branch"}`.
- The Foundation Reset was fast-forwarded to `main` and pushed to GitHub after the owner's explicit approval. No pull request, Jira, Confluence, MCP, plugin, credential, global configuration, or runtime operation occurred in this slice.

## Completed deliverable

The published Foundation Reset creates `VISION.md`, `DOMAIN.md`, and `CONTEXT.md`; adds
ADR-0001 and the `docs/agents/` configuration documents; replaces the shared
repository guidance with a short `AGENTS.md` router; reduces `CLAUDE.md` to
its Claude-specific context-integrity projection; and rewires the README,
roadmap, and documentation map to the new canonical owners.

The [Foundation Reset migration record](../history/foundation-reset/2026-08-10-document-migration-record.md)
classifies retained, rewritten, and archived-in-place legacy documents. No
legacy document was deleted or relocated.

## Validation

- `npm test` passed on `main`: 598 passed, 0 failed, and 1 intentionally skipped.
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
proof, safe-stop proof, or end-to-end change proof. The approved GitHub
publication is a documentation-delivery action, not a product proof.

## Next bounded action

Select and explicitly approve the `Standalone Plan Proof` slice from
[the roadmap](roadmap.md). It must not start automatically.

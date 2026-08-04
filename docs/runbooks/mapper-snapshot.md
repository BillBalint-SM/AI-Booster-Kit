# Mapper snapshot operating rule

The repository publishes a reviewed snapshot of the Understand Anything and
Graphify outputs so a new session or collaborator can start from the current
project map with minimal local setup.

## Published snapshot

Keep these files under version control:

- `.ua/.understandignore`
- `.ua/knowledge-graph.json`
- `.ua/meta.json`
- `.ua/fingerprints.json`
- `.ua/intermediate/scan-result.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/manifest.json`

Temporary Understand Anything output, trash directories, Graphify AST cache,
and Graphify label cache remain local and are ignored by Git.

## Freshness contract

`.ua/meta.json.sourceCommit` identifies the source revision analyzed by the
snapshot. `graphify-out/graph.json.built_at_commit` must identify the same
revision. The generated snapshot may be committed afterwards; therefore the
final snapshot commit is not required to equal `sourceCommit`.

The mapper contract is a two-stage sequence. Graphify runs first in code-only,
local mode and is the readiness gate. Understand Anything (UA) runs second,
only after Graphify is `READY`, and has the broader code, documentation, and
domain scope. Graphify and UA outputs remain independent: UA does not consume
`graphify-out/graph.json`, and `graphify-out/` is excluded from UA input while
`.ua/` is excluded from Graphify input. The source repository remains truth;
both snapshots must reference the same stable source SHA for final freshness.

If Graphify is `STOPPED` or `NOT READY`, UA is `NOT_STARTED`. If UA fails after
Graphify is ready, the Graphify result remains ready, but the combined mapper
state is `PARTIAL`/`NOT READY` until both stages complete successfully.

Run the freshness preflight before publishing or relying on a mapper snapshot.
This is a snapshot-publication check, not a general documentation gate:

```powershell
npm run check:mappers
```

The check fails if mapper-dependent source files changed after `sourceCommit`,
if the two snapshot revisions differ, or if the worktree contains an
unexpected non-snapshot file. The checker has an explicit, narrow allowlist for
Markdown documentation, workflow metadata, package metadata, and the
documentation-link checker; all other paths remain fail-closed. Text-only
documentation changes do not require a snapshot refresh or this check.

## Refresh sequence

1. Implement and test a coherent mapper-dependent change on a short-lived
   delivery branch.
2. Commit the source change so it has a stable source revision.
3. Run Graphify first in code-only, local mode against that revision.
4. Treat Graphify `READY` as the gate; on `STOPPED` or `NOT READY`, do not
   start UA.
5. Run UA second with its broader code, documentation, and domain scope.
6. Review both independent outputs and confirm their source SHAs match.
7. Run `npm run check:mappers` only when publishing the refreshed snapshot.
8. After separate user approval for publication, commit and push only the
   published snapshot files with the delivery branch. A passing freshness check
   never authorizes commit, push, PR creation, or merge by itself.

The source repository remains the technical truth. Mapper output is a
versioned navigation projection and must not replace source, tests, or Git
review.

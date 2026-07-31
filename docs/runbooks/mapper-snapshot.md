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

Run the preflight before publishing or relying on the snapshot:

```powershell
npm run check:mappers
```

The check fails if source files changed after `sourceCommit`, if the two mapper
revisions differ, or if the worktree contains an unexpected non-snapshot file.

## Refresh sequence

1. Implement and test a coherent change on a feature branch.
2. Commit the source change so it has a stable source revision.
3. Run Understand Anything and Graphify against that revision.
4. Review the graph and report changes.
5. Run `npm run check:mappers`.
6. Commit and push only the published snapshot files with the feature branch.

The source repository remains the technical truth. Mapper output is a
versioned navigation projection and must not replace source, tests, or Git
review.

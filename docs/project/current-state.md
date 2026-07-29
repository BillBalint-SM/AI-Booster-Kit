## Branch and pull request

`main` at merge commit `984b8d8`; PR #4, `Add documentation and native GitHub capability standard`, is merged.

## Completed deliverable

The local G2AS Sandbox Readiness Certificate and the native GitHub MCP read-only capability standard are implemented, validated, and merged to `main`. The standard provides one canonical capability manifest, equivalent Codex, Claude Code, and Cursor projections, strict capability-evidence parsing, and readiness enforcement without connector setup or external I/O.

## Validation

`npm run lint`, `npm run check:docs`, and `npm test` passed locally (144 tests); the PR quality CI check also passed before merge.

## Known limit

The live G2AS chain is not READY: GitHub proof was not collected through approved MCP transport, and Confluence has text rather than a verified native GitHub Smart Link.

## Open stop

No external write is authorized. A live read-only MCP/OAuth preflight requires separate exact approval; connector implementation and host configuration remain out of scope.

## Next bounded action

Prepare an approval-gated live preflight for one read-only GitHub MCP evidence read and one Confluence read that verifies a native GitHub Smart Link. Validate the exact repository, branch, commit, paths, tenant origins, and capability fingerprint before evaluation; any missing, mismatched, text-only, or unverified evidence must remain `STOPPED`. Do not install, configure, write, or modify external systems.

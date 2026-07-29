# Native MCP Capability Standard — Design

## Goal

Establish one shareable, agent-agnostic standard for read-only GitHub evidence
used by the Sandbox Readiness Certificate. Codex, Claude Code, and Cursor must
derive their host-facing capability templates from one canonical contract and
produce equivalent normalized evidence and readiness decisions.

## Scope

This change adds the standard, its local validators, generated host templates,
and documentation. It does not install MCP servers, obtain OAuth consent,
change host configuration, edit Confluence, or write to Jira, Confluence, or
GitHub.

The current G2AS Confluence page is intentionally not remediated in this
scope. A text-only Git commit reference remains insufficient for `READY`.

## Architecture

### Canonical capability manifest

`contract/mcp-capabilities/github-readonly.json` is the sole source of truth.
It declares a versioned capability ID, the read-only GitHub operations needed
to verify repository, branch, commit, and fixture paths, the permitted target
shape, the normalized observation fields, and the prohibited write, merge,
permission, credential, and configuration operations.

The manifest is declarative and contains no server URL, token, secret, OAuth
metadata, or host-local installation instruction.

### Host projections

The repository generates three checked-in, declarative templates:

- `templates/hosts/codex-github-readonly-capability.md`
- `templates/hosts/claude-code-github-readonly-capability.md`
- `templates/hosts/cursor-github-readonly-capability.md`

Each projection names its intended host surface, references the canonical
capability ID and version, preserves the read-only target and stop conditions,
and states the normalized observation contract. It is guidance for a host
adapter, not an executable connector configuration.

### Capability evidence

The GitHub readiness observation records the canonical capability ID, the
declared host, and a credential-free fingerprint of the verified read scope.
The host must prove that it can perform only the declared read operations for
the exact target. The evaluator accepts a `verified` GitHub check only when
the capability evidence matches the canonical manifest and the selected host
projection.

### Native traceability

`READY` requires an exact native GitHub Smart Link destination in the
Confluence projection, as well as the existing native Jira and GitHub remote
links. A text-only commit SHA, a manually claimed MCP read path, a GitHub CLI
claim, or an unresolved link is not sufficient. Such evidence reaches a
safe `STOPPED` decision with a specific remediation action.

## Data flow

1. A host selects its generated capability template.
2. Its local connector performs a read-only capability probe for the literal
   target; this is outside the certificate generator.
3. Jira, Confluence, GitHub, and traceability observations are collected.
4. The host emits only allowlisted stable identifiers, capability evidence,
   and resolved native link destinations.
5. The local readiness parser rejects unsafe, incomplete, over-scoped, or
   non-native evidence.
6. The evaluator produces `READY`, `NOT READY`, or `STOPPED`; rendering writes
   only the explicit local JSON and Markdown certificate files.

## Stop protocol

The evaluator stops when the canonical capability is missing or differs, a
host template drifts, read-only scope is not verified, GitHub evidence is
labelled as MCP without proof, a Confluence GitHub reference is text-only or
points elsewhere, or a target/link/read-back result is unknown or mismatched.

This is a local sync-stop, not a Jira workflow status. The certificate records
the situation, remediation, and `Stop` as the only decision option. It never
enables an external write.

## Validation

- Strict manifest parser tests reject unknown fields, scope broadening, and
  any write-like declaration.
- Projection tests establish that all three templates derive from the same
  canonical manifest and retain its stop rules.
- Readiness tests cover missing capability, wrong host, scope mismatch,
  GitHub CLI masquerading as MCP, text-only Confluence Git reference, and
  wrong Smart Link destination.
- Cross-host conformance tests compare equivalent normalized bundles and
  certificate fingerprints.
- Existing lint, build, CLI, secret-safety, and full test checks remain green.

## Acceptance criteria

1. One canonical read-only GitHub capability manifest generates all three host
   templates.
2. No generated template contains a credential, endpoint, executable MCP
   configuration, or write operation.
3. `READY` requires exact capability evidence and a native Confluence GitHub
   Smart Link to the manifest commit.
4. Missing, textual, mismatched, or unverified evidence yields `STOPPED`.
5. Codex, Claude Code, and Cursor projections remain semantically equivalent.
6. No live connector setup, OAuth, host configuration, or external write is
   included.

## Deferred pilot remediation

After this standard is implemented, a separate explicit approval is required
to configure an actual host connector or edit the G2AS Confluence page. That
later action may replace the text-only commit reference with a native GitHub
Smart Link and then repeat read-only evidence collection.

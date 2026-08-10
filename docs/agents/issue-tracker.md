# Issue tracker: GitHub

**Status:** Configured tracker location; not an authority grant.

## Scope

GitHub Issues in the repository's verified `origin` remote are the configured
issue tracker for this repository. Resolve the exact remote and target before
using it; a remembered repository name, a tool default, or an available CLI is
not sufficient target evidence.

## Read boundary

A real GitHub read needs the repository contract's explicit bounded session
grant. The grant names the literal target, read path, evidence to collect,
normalized local output, and the fact that no write is authorized. Keep the
transport used for evidence visible in the handoff and stop if the target,
scope, sensitivity, or operation type changes.

## Write boundary

Creating, commenting on, labeling, closing, reopening, assigning, linking, or
editing a GitHub issue is an external write. Each requires fresh,
operation-specific user approval that names the target, intended effect,
duplicate rule, and recovery boundary. Perform the required pre-read, one
allowlisted write, and post-read only after that approval.

## Pull requests as a triage surface

**PRs as a request surface: no.** Pull requests are not included in GitHub
Issues triage unless this document is explicitly changed through an approved
future decision.

## Source of truth

This configuration identifies an issue tracker; it does not independently
assign lifecycle truth or override the repository's Jira, Git, and Confluence
truth hierarchy. A separate approved domain adapter must define any such
mapping.

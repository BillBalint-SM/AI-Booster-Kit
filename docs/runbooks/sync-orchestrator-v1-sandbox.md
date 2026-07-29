# Sync orchestrator V1 sandbox runbook

## Boundary

Use this runbook only for the named non-production sandbox. V1 defaults to local validation and dry-run. It does not authorize production mutation, deletion, permission or workflow changes, automatic merge or deployment, or publication of raw session transcripts.

Keep credentials outside this repository and command output. Do not place tokens, authorization headers, credential values, or private transcripts in events, outbox records, tickets, pages, attachments, or incident notes.

## Local validation and target resolution

Before any separately approved live evidence collection, complete the
[G2AS Sandbox Readiness Certificate](g2as-sandbox-readiness-certificate.md)
procedure. The certificate is a local, read-only prerequisite; it does not
weaken this runbook's validation-only boundary or authorize connector activity.

From the repository root, run:

```powershell
npm run lint
npm test
npm run cli -- validate --contract contract/team-contract.md
npm run cli -- conformance
```

Resolve the target before any connector action. The configured sandbox record must match the exact HTTPS tenant URL, Jira project key and stable ID, Confluence space key and stable ID, and GitHub repository owner/name and stable ID. Visible names are not sufficient. Stop if resolution has zero or multiple matches, the URL is not credential-free HTTPS, the connector scope cannot be verified, or any resolved identity differs from the approved sandbox record.

Perform read-only discovery first. Confirm the exact project, space, repository, Board profile, available forward transitions, and connector capability without applying a mutation. Record only stable identifiers, correlation IDs, and safe evidence references.

## Current CLI validation-only behavior

The current CLI is not a sandbox activation interface. It validates local input and emits planned JSON only; it does not construct a `SyncOrchestrator`, resolve a connector target, append to an outbox, expose named fields or transitions, call a connector, or perform read-back. A successful CLI command is not evidence that a sandbox operation is ready or authorized.

Use the current local validation commands as follows:

```powershell
npm run cli -- finalize --input test/fixtures/valid-milestone.md --dry-run
npm run cli -- sync --event <approved-local-event-file> --dry-run
```

`finalize --dry-run` checks that the local input declares `State: Finalized` and returns a planned finalize record; it does not finalize or persist a canonical hierarchy. `sync --dry-run` validates the local event and returns a planned response with correlation ID, requested operation, and safe evidence references; it does not append local audit evidence or execute orchestration.

Library-level `SyncOrchestrator.handle(event, "dry_run")` is separate from the CLI: it validates the configured target and allowlist and appends a canonical event to the supplied local outbox while skipping connector writes. Do not use the current CLI output as a substitute for that configured library flow or as sandbox activation approval.

## Sandbox allowlist and SYNC STOP

Enable only the explicit sandbox policy for the exact resolved target. The policy must name the connector operation, allowed fields, permitted forward transition, actor scope, capability proof, and expiry. Never broaden the tenant, project, space, repository, fields, or transition to make an operation fit.

At every `SYNC STOP`, present Situation, Target, Detected problem, Evidence, Expected impact, What remains unchanged, Risk, Recommendation, and Decision options.

The user-facing decision is:

- Continue only for the exact non-destructive allowlisted scope, with an expiry, named actor, compensating control, and mandatory read-back plan.
- Otherwise choose Stop and correct the mapping, scope, authority, evidence, or input.

Continue is a single bounded accepted-risk decision, not a bypass. Do not offer Continue for wrong tenant/project/space/repository, unverifiable authority or scope, ambiguous mapping, deletion, permission change, workflow change, production mutation, or unknown external completion.

## Future configured sandbox execution and read-back

No supported V1 CLI command activates a sandbox connector. The following is the required procedure for a separately approved, configured library integration; do not infer readiness from validation-only CLI output.

For an accepted sandbox operation, append the canonical event to the durable local outbox before invoking the smallest allowed connector call. Apply only the named field update or forward transition. Then read back the exact external object and verify target identity, canonical ID, external ID, parent links, field values, transition/status, version or artifact revision, and correlation evidence.

If read-back differs, stop. Do not advance lifecycle state from intended or partial connector responses. Preserve local evidence and correct the declared input or mapping before a new, scoped operation.

## Durable outbox recovery

The JSONL outbox is append-only evidence. Do not edit, delete, or rewrite prior records. On restart, read pending events and their latest result records. A terminal read-back of applied or not-applied may resolve the event. Keep stopped and unknown results pending until their stated recovery action is complete.

For timeout, partial completion, stale read-back, or a lost process, perform one exact read-back using the stable canonical identity and idempotency key. If completion remains unknown, issue `SYNC STOP`; do not blindly retry or create a duplicate projection.

## Correction and deactivation

Correct an incorrect sandbox projection with a new allowlisted, forward-safe operation and a read-back record. Do not use destructive deletion as rollback. When a correction cannot be safely represented, stop and obtain a new design or policy decision.

Deactivate the sandbox by disabling the sandbox policy and connector capability for the named target, retaining the outbox and audit evidence, and confirming no pending operation has unknown completion. Re-run local validation after configuration changes; production remains disabled.

## Lifecycle metadata

`Blocked`, `Rejected`, and `Awaiting Clarification` are orthogonal metadata, not Jira lifecycle statuses. Represent them with verified flags, comments, links, dependencies, problems, or questions as permitted by the allowlist. Keep the Board lifecycle to `To Do`, `In Progress`, `Review`, `Ready for Deploy`, `Ready for Test`, `Testing`, and `Done`.

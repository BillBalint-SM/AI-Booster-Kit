---
sourceContractRevision: bootstrap
targetHost: codex
generatedAt: 2026-07-29T04:43:11.134Z
---

# codex Native Adapter Projection

This file is a generated projection of the canonical contract, not an independent authority.

Version context: V1 local event and projection adapter.

Native projection location: `contract/adapters/codex.md`.

Limitations: local canonical event emission and projection only; no external write capability is present.

Local event emission: supported_with_limits.

## Canonical vocabulary

Milestone, Epic, Story, Task, Bug remain the canonical work hierarchy. The canonical terms are: milestone, epic, workItem, boardStatus, planningState, executionSet, attentionState, syncState, evidenceRefs.

## Lifecycle and stop protocol

Board statuses: To Do → In Progress → Review → Ready for Deploy → Ready for Test → Testing → Done.

Stop before any external action when target identity, authority, capability, or
evidence is unknown, ambiguous, unsupported, or stale. Preserve local evidence
and request an explicit, bounded decision instead of enabling execution.

## Capability table

| Capability | State | Limitation |
| --- | --- | --- |
| Canonical contract reading | supported | Host support must be declared explicitly. This generated projection does not enable external execution. |
| Native adapter projection | supported_with_limits | Only derived projections are permitted. This generated projection does not enable external execution. |
| Local conformance checks | supported_with_limits | Cross-host equivalence requires explicit verification. This generated projection does not enable external execution. |
| Jira/Confluence/GitHub synchronization | unsupported | No connector implementation or external authorization exists. This generated projection does not enable external execution. |
| External write allowlist enforcement | unsupported | No external write may occur before allowlist validation exists. This generated projection does not enable external execution. |

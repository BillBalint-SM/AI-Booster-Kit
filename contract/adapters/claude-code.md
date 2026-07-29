---
sourceContractRevision: bootstrap
targetHost: claude-code
generatedAt: 2026-07-29T04:43:11.137Z
---

# claude-code Native Adapter Projection

This file is a generated projection of the canonical contract, not an independent authority.

Version context: V1 validation and projection adapter.

Native projection location: `contract/adapters/claude-code.md`.

Limitations: deterministic local conformance event emission and projection only; host live capability is unverified and this projection has no external write capability.

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
| Canonical contract reading | unknown | Host support must be declared explicitly. This generated projection does not enable external execution. |
| Native adapter projection | supported_with_limits | Deterministic local projection only; this generated projection does not enable external execution. |
| Local conformance checks | supported_with_limits | Deterministic local conformance only; this generated projection does not enable external execution. |
| Jira/Confluence/GitHub synchronization | unsupported | No connector implementation or external authorization exists. This generated projection does not enable external execution. |
| External write allowlist enforcement | unsupported | No external write may occur before allowlist validation exists. This generated projection does not enable external execution. |

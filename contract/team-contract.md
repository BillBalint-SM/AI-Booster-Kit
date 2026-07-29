---
contractId: agent-agnostic-sync-orchestrator
contractVersion: 0.1.0
sourceRevision: bootstrap
canonicalVocabulary:
  - milestone
  - epic
  - workItem
  - boardStatus
  - planningState
  - executionSet
  - attentionState
  - syncState
  - evidenceRefs
capabilities:
  - name: Canonical contract reading
    state: requires_approval
    limitation: Host support must be declared explicitly.
  - name: Native adapter projection
    state: requires_approval
    limitation: Only derived projections are permitted.
  - name: Local conformance checks
    state: requires_approval
    limitation: Cross-host equivalence requires explicit verification.
  - name: Jira/Confluence/GitHub synchronization
    state: unsupported
    limitation: No connector implementation or external authorization exists.
  - name: Sandbox readiness certificate
    state: requires_approval
    limitation: Accepts read-only normalized evidence only and does not activate connector synchronization or external writes.
  - name: Native GitHub MCP read-only capability standard
    state: requires_approval
    limitation: Provides declarative host templates and local validation only; external connector setup and authorization remain outside this contract.
  - name: External write allowlist enforcement
    state: unsupported
    limitation: No external write may occur before allowlist validation exists.
---

# Team Contract

This Markdown contract is the human-readable source of truth for shared team
and orchestration semantics. It is not a permission policy or credential store.

## Lifecycle

1. To Do
2. In Progress
3. Review
4. Ready for Deploy
5. Ready for Test
6. Testing
7. Done

## Stop protocol

Stop before any external action when target identity, authority, capability, or
evidence is unknown, ambiguous, unsupported, or stale. Preserve local evidence
and request an explicit, bounded decision instead of enabling execution.

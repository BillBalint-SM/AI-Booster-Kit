# Jira–Git–Confluence Domain Adapter

**Status:** Domain adapter layered on top of the [Common Agent Operating Model](agent-operating-model.md).

**Scope:** Applying the common agent/sub-agent operating model to a Jira-centered workflow with versioned Git artifacts and Confluence projections.

This document is not the common agent core. It defines source truth, artifacts, permissions, approvals, external writes, audit, and recovery for this domain only.

## Domain authority model

| Concern | Authority | Adapter rule |
| --- | --- | --- |
| Requirements, hierarchy, ownership, acceptance criteria, and lifecycle status | Jira | Jira is lifecycle truth. A Jira key is a locator, not sufficient implementation context. |
| Technical contract, implementation artifact, and immutable revision | Git | Use the exact accepted commit/PR/test reference; do not substitute a mutable branch head. |
| Human-facing knowledge projection | Confluence | Publish only accepted, labelled projections; Confluence does not compete with Jira lifecycle state. |
| Publication and consequential workflow transition | PO/PM under the Jira workflow | Proposal and publication authority remain separate where required. |
| Correctness and evidence gate | QA/independent reviewer | Reopen the source and artifacts; inconclusive evidence does not pass. |
| Permissions, audit, revocation, and recovery | Jira/Git/Confluence source owners | Keep identity and scope native to the source; stop on deviation. |

## Domain lifecycle mapping

The common core maps to this domain as follows:

| Common phase | Domain action | Output |
| --- | --- | --- |
| Observe | Read the accepted Jira context, named Git revision, and labelled Confluence projection. | Bounded work-item context packet. |
| Validate | Compare Jira ID, summary, acceptance criteria, Git SHA/paths, projection label, current status, freshness, and target boundary. | `PASS`, `UNKNOWN`, `BLOCKED / NOT EXECUTED`, or an explicit stop classification. |
| Plan | Propose a technical plan, Jira publication, checkpoint synchronization, implementation, or evidence-link action. | Reviewable proposal with exact target and evidence. |
| Coordinate | Assign PO/PM, BA, DEV, QA, Jira owner, Git owner, and Confluence owner responsibilities. | Named approval, implementation, review, and recovery ownership. |
| Execute | Perform only the approved source-native read or smallest allowlisted write. | Source response and returned identifier/value. |
| Verify | Read current state and source-native history/audit; compare exact intended outcome and duplicate behavior. | Verified result, visible correction, or unresolved stop. |
| Hand off | Preserve Jira ID, accepted revision, Git SHA, projection reference, status, evidence, unknowns, and next gate. | Reproducible cross-host/domain handoff. |

## Domain write contract

Every external write in this adapter requires fresh, operation-specific approval naming:

1. exact source, target, field/link/page/repository, and actor role;
2. minimum permission and credential boundary without exposing credentials;
3. accepted source revision and intended impact;
4. exact duplicate rule and pre-read result;
5. one write only, with no blind retry;
6. post-read, source-native history/audit reference, and current-state comparison;
7. visible correction/recovery path requiring separate approval if completion is partial or ambiguous.

`401`, `403`, `404`, `409`, `429`, `5xx`, timeout, stale context, partial completion, ambiguous completion, scope deviation, or duplicate detection stops the affected path. A successful agent response is not evidence of a successful source write until read-back and audit verification pass.

## G2AS pilot binding

The current synthetic domain fixture is documented in:

- [G2AS research and validation runbook](g2as-research-validation-runbook.md);
- [G2AS pilot evidence](../gate-2/g2ai-pilot-evidence.md);
- [Gate 2 results and next steps](../gate-2/gate-2-results-and-next-steps.md).

The fixture binds the adapter to Jira `G2AS-1`, the accepted synthetic Story, Git commit `d0971f75c526250f9ee65b8b3b044a4788b31a46`, the two recorded fixture paths, and the labelled Confluence projection. These are domain facts, not common-core requirements.

## Current adapter status

- Manual/source-native Jira/Git/Confluence context recovery: demonstrated for the synthetic fixture.
- Single approved Jira web-link write: demonstrated as a bounded one-off contract with pre-read, post-read, and history verification.
- Direct Jira REST/OAuth: not executed; diagnostic path remains narrow/remediation-gated.
- Atlassian Rovo: current route rejected pending target isolation remediation.
- Confluence permission model: owner review remains open.
- Cursor and Claude Code host comparison: not available in the recorded execution environment.

This adapter does not prove runtime behavior for any host or connector. It only binds the domain rules to the common agent model and records the evidence boundary.

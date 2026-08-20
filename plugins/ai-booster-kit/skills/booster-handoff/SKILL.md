---
name: booster-handoff
description: Package delivery status, artifacts, evidence, decisions, unknowns, limits, and the next bounded action for human review.
---

# Booster Handoff

Create a continuation packet that a fresh human or Agent can review without
hidden conversation memory. A Handoff reports evidence; it does not accept the
result for the User.

## Required inputs

- objective and current refined scope;
- accepted decisions and rejected alternatives;
- result and review artifact references;
- verification evidence, failures, limits, unknowns, and stop reasons;
- ownership and next-action boundary.

Discover safely available facts before asking the User. Do not invent missing
status, approval, identity, evidence, or external state.

## Procedure

1. Reopen every material referenced artifact and verify that its status and
   scope match the intended handoff.
2. Reconcile conflicts explicitly. Preserve `STOPPED`, `UNKNOWN`, partial, and
   failed outcomes rather than rewriting them as success.
3. Write a compact packet to the workspace's declared handoff location when
   the invocation or repository contract authorizes that reversible local
   write. Otherwise return the complete packet in chat and mark its reference
   accordingly.
4. Read back any written file and verify that it contains no unresolved
   placeholders, secrets, raw credentials, or unsupported claims.

## Handoff contract

Include:

- objective, scope, status, and outcome owner;
- facts and source references;
- User decisions, approvals, and rejected alternatives;
- exact artifacts and revisions produced;
- acceptance-criterion-to-evidence map and checks run;
- failures, unknowns, limits, residual risks, and rollback boundary;
- unrelated work preserved;
- one next bounded action with owner and acceptance criterion;
- explicit statement that commit, publication, merge, release, and external
  actions remain separate decisions unless already evidenced.

Return the stable artifact type `delivery-handoff`. Finish by asking for human
acceptance, a chosen continuation, or stop. Do not silently begin more work.

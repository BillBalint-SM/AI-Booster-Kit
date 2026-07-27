# Task 8 brief — one explicitly authorized Jira evidence-link write

## Approved contract and execution record

- Target: Jira issue `G2AS-1` in the PTE `G2AS` sandbox.
- Source-native action: add exactly one Jira remote/web link to the immutable Git commit URL `https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox/commit/d0971f75c526250f9ee65b8b3b044a4788b31a46`.
- Actor: authenticated Atlassian owner in the visible Jira browser session; no new user, token, OAuth client, app, or integration.
- Scope: the minimum existing Jira permission needed to add one link on `G2AS-1`; no workflow, field, project, user, app, or administrative change.
- Intent: make the synthetic repository artifact traceable from the Jira lifecycle source of truth.
- Duplicate rule: pre-read the current issue links and continue only if the exact commit URL is absent; perform one write, then post-read the issue and Jira history.
- Approval: user authorization received on 2026-07-27 for the authenticated Atlassian browser session, one remote/web link to the exact commit URL, exact-URL pre-read, and issue/history read-back; status, field, comment, attachment, Automation, and Rovo Write operations were explicitly prohibited.
- Audit: Jira issue history and source-native read-back of the exact link.
- Recovery: after a failed or ambiguous result, do not replay; after explicit owner approval, remove only the newly added exact link.
- Guardrail: do not transition `G2AS`, edit acceptance criteria, add comments, attach files, trigger Automation, or invoke Rovo Write.

## Execution result

- Exact-URL pre-read: `0` matching anchors for the immutable commit URL.
- Write: one source-native Jira `Add web link` submission on `G2AS-1`; no link text was supplied, so Jira displays the exact URL.
- Post-read: the Web links section contains the exact URL; Jira's presentation renders two anchors for the single link record (title and URL presentation). The History view contains exactly one matching `RemoteWorkItemLink` event for the Git `Web Link`.
- Status read-back: `To Do` remained unchanged.
- Prohibited operations: no status transition, field edit, comment, attachment, Automation, or Rovo Write was performed.
- Recovery: not needed; the write response was successful and the post-read was unambiguous. Removal remains unexecuted and requires separate owner approval.

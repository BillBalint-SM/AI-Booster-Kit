# OAuth research report — Gate 2 direct Jira REST

**Status:** complete documentation preflight, 2026-07-27. No OAuth client/app was created; no login, token, PTE tenant request, or external mutation occurred.

## Outcome

The constrained 3LO design is feasible in principle, but only after the PTE owner verifies tenant-specific policy and effective permissions. Use a Developer Console 3LO **resource-level** grant, select only `https://pte-politechnika.atlassian.net`, request the documented classic `read:jira-work` scope for the single call `GET /rest/api/3/project/G2AS`, and ensure the named user has only Jira **Browse projects** on `G2AS`. Scope does not provide a project allowlist; enforce that with the named user's project permissions plus a client hard-coded to the single endpoint.

## Official evidence

- [Atlassian 3LO guide](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/): Developer Console creation; account- versus resource-level grants; callback must be app-accessible and `redirect_uri` must match; authorization-code-only flow; current-token `accessible-resources`; API URL construction; rotating refresh tokens; user grant revocation; app deletion/distribution/grant limitations.
- [Jira v3 Projects API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/): `GET /rest/api/3/project/{projectIdOrKey}` needs Browse projects and recommends `read:jira-work`; granular list starts `read:issue-type:jira`, `read:project:jira`, `read:project.property:jira`, `read:user:jira`, and `read:application-role:jira` but is UI-truncated.
- [Atlassian OAuth changelog](https://developer.atlassian.com/cloud/oauth/changelog/): March 2026 multi-user app ownership and ownership transfer.
- [Connected-app administration](https://support.atlassian.com/security-and-access-policies/docs/manage-your-users-third-party-apps/): user grant revocation and site/organization-admin uninstall, which revokes all users of a 3LO app.

## Required preflight checks before authorization

1. Confirm an approved app owner and co-owner; app remains private unless sharing is explicitly authorized.
2. Configure one exact callback URL and Jira API scopes. Do not create a desktop/browser client containing the client secret.
3. Check policy for third-party/user apps and obtain fresh written approval for the specific app, actor, scope, PTE site, one endpoint, verification, and revoke path.
4. Confirm effective permissions: named user has Browse projects for `G2AS`, no administration or write authority, and no access to unrelated projects intended to remain unavailable.
5. During the approved session, choose only the PTE site; call `accessible-resources`, match exact URL and Jira scope, then call only `/ex/jira/{cloudId}/rest/api/3/project/G2AS`.

## Credential and revoke controls

Client secret and refresh token are protected credentials. Store only in an OS-backed local credential store or encrypted, user-ACL-restricted store; never chat, Git, Markdown, logs, screenshots, headers, browser local storage, or a committable `.env`. Request `offline_access` only if needed; refresh tokens rotate, so atomically replace the stored token with its successor. Local credential removal contains the endpoint; user Connected Apps revocation removes the server-side grant; admin uninstall provides site-wide containment. No current official programmatic token-revocation endpoint was found.

## Concerns / unresolved facts

- PTE Developer Console rights, app policy, PTE cloud ID, exact user project visibility, audit visibility, and final consent results are unverified.
- `read:jira-work` is the documented classic endpoint scope but not a project-level restriction. A defective client could read another project visible to the user, so endpoint allowlisting and minimal user permissions are mandatory.
- The granular list in the current endpoint reference is not completely visible in static documentation; do not substitute it blindly for `read:jira-work`.
- A one-time supervised read should avoid `offline_access` and any persisted refresh token.

Full operator-ready note: [`docs/gate-2/atlassian-oauth-read-only-preflight.md`](../../../docs/gate-2/atlassian-oauth-read-only-preflight.md).

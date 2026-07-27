# Gate 2: Atlassian 3LO read-only preflight

**Purpose:** direct Jira REST retrieval of project metadata for `G2AS` only. This is a documentation-only preflight completed 2026-07-27: no Atlassian app was created, no credential was handled, and no PTE tenant was accessed.

## Confirmed by current official Atlassian documentation

### App and ownership prerequisite

- An OAuth 2.0 (3LO) integration is created and managed in the [Atlassian Developer Console](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/): **Create** -> **OAuth 2.0 integration**, name it, and select a grant type. 3LO is authorization-code flow, not implicit flow.
- Prefer **resource-level grant**, then select only `https://pte-politechnika.atlassian.net` at consent. Its tokens can only be used with selected sites; an account-level grant can cover multiple sites. [3LO guide](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- Apps are private by default; sharing is required if another user will install/use the app. Atlassian added multi-user app ownership and ownership transfer in March 2026; assign a second approved owner before relying on the pilot identity. [OAuth changelog](https://developer.atlassian.com/cloud/oauth/changelog/)

### Redirect URI and consent

- Configure one callback URL in Developer Console -> **Authorization** -> **OAuth 2.0 (3LO)**. It must be accessible by the application; `redirect_uri` must match the configured callback and is required in both authorization and code-exchange requests. [3LO configuration and code flow](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- The authorization request requires `audience=api.atlassian.com`, `client_id`, chosen scopes already added to the app, `redirect_uri`, an unguessable user-bound `state`, `response_type=code`, and `prompt=consent`. Do not place the client secret in a desktop/browser client or chat transcript. [3LO authorization parameters](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)

### Minimum scope and Jira permission

For the sole metadata operation, use:

```text
GET /rest/api/3/project/G2AS
```

- The endpoint's documented classic recommended 3LO scope is exactly `read:jira-work`; use that documented classic scope for this pilot unless the owner separately verifies the complete current granular set.
- Its documented granular set is `read:issue-type:jira`, `read:project:jira`, `read:project.property:jira`, `read:user:jira`, and `read:application-role:jira`, with additional items hidden by the API reference's “Show more” UI. Do not claim this truncated list is a complete replacement unless the owner confirms the exact currently rendered set for the final request.
- The named user also needs **Browse projects** for `G2AS`. App scope never overrides the user's Jira permissions. Do not add **Administer Projects**, **Administer Jira**, or any `write:` / `manage:` scope.

Sources: [Get project API reference](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/) and [3LO scope guidance](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).

**Boundary:** OAuth scopes describe API authority, not an individual project allowlist. The project-only boundary therefore requires both (1) the selected resource-level PTE site grant and (2) the named user's effective Jira permissions to expose only `G2AS`. The client must call only the literal `G2AS` endpoint; it must not enumerate projects, use a different project key, or use `expand`/`properties` without a separate review.

### Select the PTE cloud ID safely

With the current access token, call:

```text
GET https://api.atlassian.com/oauth/token/accessible-resources
```

Select only the returned entry whose `url` is exactly `https://pte-politechnika.atlassian.net`, verify the listed scopes, and use its `id` as `{cloudId}`. The direct read URL is:

```text
GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/project/G2AS
```

Atlassian says to repeat `accessible-resources` for the current token because grants can change. Account-level grants can return multiple sites; resource-level grants return only selected sites. Its `id` is not unique across container types, so select by the exact URL and Jira scope, not ID alone. [Accessible-resources and API URL construction](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)

### Credential handling and refresh

- The token exchange requires the client secret. If persistence is needed, request `offline_access`; Atlassian uses rotating refresh tokens: each successful refresh returns a replacement and disables the old token. The default inactivity expiry is 90 days and the reuse leeway is 10 minutes. Persist the replacement atomically; an expired/invalid refresh token requires the full authorization flow. [Refresh-token behavior](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- Local-control recommendation (not an Atlassian storage prescription): store client secret and current refresh token only in an OS-backed credential store or a locally encrypted, user-ACL-restricted secret store. Keep client ID, callback URL, selected PTE cloud ID, and non-secret status evidence separately if needed. Never put secret values in chat, Git, Markdown evidence, source files, environment files likely to be committed, command history, logs, screenshots, or browser local storage. Do not print HTTP authorization headers or token responses.

### Non-writing verification sequence

After explicit authorization and outside chat:

1. Confirm the Developer Console owner(s), private/distribution state, one exact callback URL, resource-level grant type, Jira API enabled, and only the approved scope(s).
2. Authenticate the named user and inspect the consent screen; select only the PTE site.
3. Call `accessible-resources`; require exactly the PTE entry for this pilot. Any extra selected site, unexpected scope, or absent PTE entry is a stop condition.
4. Call only `GET /ex/jira/{cloudId}/rest/api/3/project/G2AS` with `Accept: application/json`; record only status, endpoint template, elapsed time, returned key/id/name/type, and redacted timestamp.
5. Verify no source state changed using Jira's native audit/history surfaces. No write attempt is needed to prove the boundary: inspect the requested scopes and effective permission configuration instead.
6. Treat `401`, `403`, `404`, `429`, `5xx`, timeout, or a response outside `G2AS` as a stop; do not broaden scopes, try another project, or retry a state-changing request.

### Revoke / containment

1. Immediately remove the local refresh token and client secret from the local credential store; do not log them.
2. The user revokes their grant in [Atlassian Account Connected apps](https://id.atlassian.com/manage-profile/apps). Atlassian states a revoked grant stops the app everywhere for that user.
3. If site-wide containment is required, an organization/site admin uninstalls the connected 3LO app through **Atlassian Administration -> site -> Connected apps -> Manage authorization -> Uninstall**; Atlassian says this revokes all users for 3LO apps. [Manage connected app access](https://support.atlassian.com/security-and-access-policies/docs/manage-your-users-third-party-apps/)
4. The app owner may delete the app in Developer Console only after it is not installed anywhere. [Managing/deleting 3LO apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)

Atlassian's current 3LO guide does **not** document a programmatic OAuth-token revocation endpoint. For resource-level grants, it also says an admin cannot revoke one user's app access through the Connected Apps user screen; the user revokes their grant or an admin uninstalls the app. [3LO grant limitations](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)

## Tenant-specific unknowns — must be checked, not assumed

- Whether an approved PTE Atlassian account can create/manage a Developer Console app, assign a co-owner, or enable sharing.
- Whether organization/site policy blocks user-installed/third-party apps or requires administrator approval.
- The exact current PTE cloud ID, selected-site consent outcome, effective `G2AS` **Browse projects** permission, and whether the named user can see any other project.
- The actual response fields from `G2AS`, audit visibility, retention, and whether `read:jira-work` exposes more Jira data than the intended single endpoint when a client is defective.
- Whether the pilot needs a refresh token at all. Omit `offline_access` for a one-time supervised read.

These are not resolved by public documentation and were not queried in this preflight.

# Jira, Confluence, and GitHub Mapping

External targets are project-profile configuration, never implicit defaults.

The following named placeholders are intentional configuration errors until a
project profile supplies real, verified values:

```yaml
jira:
  projectKey: "<CONFIGURE_JIRA_PROJECT_KEY>"
  baseUrl: "<CONFIGURE_JIRA_BASE_URL>"
confluence:
  spaceKey: "<CONFIGURE_CONFLUENCE_SPACE_KEY>"
github:
  repository: "<CONFIGURE_GITHUB_REPOSITORY>"
```

These placeholders are not silently usable targets. The initial profile is
expected to supply `GDEAI`, `gdemikk.atlassian.net`, a named Confluence space
key, and a named GitHub repository through project configuration only.

## Initial deny-by-default allowlist

Only the following operations are allowlisted for the named project profile.
Every operation, field, target, and transition not shown here is denied.

| Target | Allowlisted operation | Allowed fields or evidence | Forward transitions |
| --- | --- | --- | --- |
| Jira project `GDEAI` at `gdemikk.atlassian.net` | Create a declared Milestone, Epic, Story, Task, or Bug; update an existing declared issue | `summary`, `description`, `issuetype`, `parent`, `labels`, `assignee`, `priority`, `duedate`, declared custom fields, and declared Jira/Confluence/GitHub links | `To Do` → `In Progress` → `Review` → `Ready for Deploy` → `Ready for Test` → `Testing` → `Done` |
| Jira project `GDEAI` at `gdemikk.atlassian.net` | Update a named Jira field or add an audit/evidence reference | Only the named field in the accepted project profile and the corresponding immutable evidence reference | No transition unless separately requested and allowlisted above |
| Confluence space `<CONFIGURE_CONFLUENCE_SPACE_KEY>` | Create or version-update the canonical contract/work-artifact section | Canonical section content, source revision, artifact identity, and evidence references | Not applicable; Confluence has no canonical Board lifecycle transition |
| GitHub repository `<CONFIGURE_GITHUB_REPOSITORY>` | Read delivery evidence and declare links | Pull requests, commits, checks, reviews, and declared Jira/Confluence links; no credential or secret fields | Not applicable; GitHub evidence does not advance Jira status by itself |

Named placeholders are configuration errors. The allowlist is inactive until
the project profile resolves every placeholder to a verified target. Backward
transitions, arbitrary field writes, deletes, ambiguous targets, and
unlisted operations fail closed.

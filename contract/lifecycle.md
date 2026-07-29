# Canonical Lifecycle

Board statuses are ordered as follows:

1. To Do
2. In Progress
3. Review
4. Ready for Deploy
5. Ready for Test
6. Testing
7. Done

Only these exact visible labels are Board statuses. `Blocked`, `Rejected`, and
`Awaiting Clarification` are invalid Board status identities.

Forward transitions move one step through the ordered lifecycle. A failed
Review or Testing outcome returns the item to `To Do` with named failure
evidence. The lifecycle policy evaluates these transitions locally; it never
applies a Jira transition.

Backlog planning values are project-profile mappings, not lifecycle statuses.
The profile supplies the Jira project and Board identities, exact status labels,
transition lookup names, planning-state mappings, and allowed fields. Tenant
URLs, Confluence spaces, repositories, and credentials are runtime-only data.
Each transition evaluation also receives the independently resolved runtime
Jira project and Board identity; a self-consistent but different profile is
rejected.

## Attention state

`attentionState` is orthogonal metadata. It records dependencies, problems,
clarification needs, or synchronization flags; it is not a Board status.

The orchestrator never invents `Blocked`, `Rejected`, or `Awaiting Clarification`
as lifecycle statuses.

Dependency, problem, clarification, and synchronization updates preserve the
current Board status and carry their evidence through `attentionState`.

## Verified implementation start

Before implementation begins, a local check verifies the Milestone, Epic, and
child trace; accepted scope and acceptance criteria; named dependency links;
repository; branch and worktree; base revision; actor; and current roadmap
revision. Planning chat alone is not sufficient evidence. A passing check is a
policy result only and does not apply a Board transition.

The check requires explicit finalized-and-accepted decision evidence, an
accepted-scope evidence record matching the selected child IDs and acceptance
criteria, and parent-link data proving Milestone → Epic → child membership.

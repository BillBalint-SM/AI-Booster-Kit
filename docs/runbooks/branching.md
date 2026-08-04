# Lean branching model

This is the canonical local Git and GitHub workflow for bounded delivery.
The default path is intentionally two-level:

```text
main
  ▲
  │ reviewed PR for one bounded slice
dev-<scope>
```

## Roles and flow

- `main` is the stable integration baseline.
- `dev-<scope>` is a short-lived branch for exactly one bounded delivery
  slice.
- A dev slice targets `main` directly.
- Do not keep adding unrelated work to a merged dev branch or reuse its name.

## Start a bounded slice

From a clean, synchronized checkout:

```powershell
git fetch origin main
git switch main
git merge --ff-only origin/main
git switch --create dev-<scope>
```

The slice owner verifies the repository, branch, HEAD, worktree, upstream,
target branch, and pull-request state before opening or updating a PR.

## Close a slice

After the reviewed slice is accepted:

1. Read back the PR result and the updated `main` head.
2. Fast-forward local `main` to `origin/main`.
3. Verify `HEAD == origin/main` and a clean worktree.
4. Start the next bounded slice from the synchronized `main` with a new
   `dev-<scope>` name.

If the slice contains unpublished work that is not part of the accepted PR,
preserve it and start a new bounded branch from synchronized `main`; do not
push it to a completed branch.

## Required handoff evidence

Every branch handoff records the repository, branch, HEAD, upstream, worktree
state, PR state, target branch, and merge revision when applicable. Unknown or
conflicting values stop branch, commit, push, merge, and publication decisions.

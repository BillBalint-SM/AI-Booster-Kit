# Three-level branching model

This is the canonical rule for local Git and GitHub branch handling. The three
branch roles are `main`, `feature`, and `dev`.

## Roles and flow

```text
main
  ▲
  │ PR at a user-approved or justified milestone
feature
  ▲
  │ one PR per bounded delivery slice
dev/<scope> → merge → feature → dev/<next-scope>
```

- `main` is the stable integration baseline. It receives a coherent feature
  delivery, not individual development slices.
- `feature` is the active integration branch for one larger delivery stream.
  It collects several completed `dev` slices and is the only branch that
  normally opens the delivery PR to `main`.
- `dev` is a short-lived role for one bounded delivery slice. Use a unique
  name such as `dev/bounded-debugging` or `dev/branching-model-docs`; do not
  keep adding unrelated work to a merged dev branch.

The remote `dev` branch may be used as an initial bootstrap branch, but each
subsequent slice gets a new scope-specific dev branch. The branch list does not
prove the PR direction: read back that every dev PR targets `feature`, and
every feature PR targets `main`.

## Start a delivery stream

From a clean, synchronized checkout:

```powershell
git fetch origin main
git switch main
git merge --ff-only origin/main
git switch --create feature
git push --set-upstream origin feature
```

Start each bounded slice from the current feature branch:

```powershell
git fetch origin feature
git switch feature
git merge --ff-only origin/feature
git switch --create dev/<scope>
```

The dev pull request targets `feature`, never `main`.

## Continue immediately after a dev merge

After the remote dev PR is merged:

1. Read back the PR merge result and the updated `feature` head.
2. Fast-forward local `feature` to `origin/feature`.
3. Start the next `dev/<next-scope>` immediately from that updated feature.
4. Do not continue work on the merged dev branch and do not reuse its name.

This keeps the feature branch as the accumulating delivery stream while every
dev branch remains independently reviewable.

## Promote feature to main

The `feature → main` PR is opened only after a user request or a justified
delivery milestone. After it merges:

1. Read back the PR merge commit from GitHub.
2. Switch to local `main` and fast-forward it to `origin/main`.
3. Verify `HEAD == origin/main` and `git status` is clean.
4. Close the completed feature stream and create a new feature branch from the
   synchronized `main` for the next larger delivery.

If a local branch contains commits that were not part of the merged PR, those
commits are unpublished work. Do not push them to a merged branch. Create a
new dev branch from the current feature or synchronized main, then cherry-pick
only the intended commits and re-run source-relative generated artifacts such
as Graphify and Understand Anything.

## Required handoff evidence

Every branch handoff records the repository, branch role and name, `HEAD`,
upstream, worktree state, PR number/state, source revision, target branch, and
merge revision when applicable. Unknown or conflicting values stop branch,
commit, push, and merge decisions.

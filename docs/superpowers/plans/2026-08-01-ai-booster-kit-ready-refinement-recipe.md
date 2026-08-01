# M1 Ready Refinement Recipe and Output Contract Plan

**Goal:** Promote the bounded refinement formation to the next fully `READY`
scenario with a linked, strictly validated recipe and profile-specific input
and output contract.

**Scope:** Change only `bounded-refinement`; keep research, development, and
debugging as `CANDIDATE`. The path remains local, recommendation-only, and
side-effect-free. No host activation, persistence, connector call, external
read, or external write is introduced.

**Acceptance criteria:**

- The catalog links `bounded-refinement` to a validated `READY` recipe and
  leaves the other three candidate recipe paths null.
- A refinement request with a goal, current scope, constraints, and open
  questions returns `RECOMMEND`; missing profile fields remain `UNKNOWN` with
  explicit prerequisites.
- The recipe parser rejects unknown metadata, unsafe boundaries, incomplete
  output sections, and non-canonical unknown/result declarations.
- The CLI exposes the same recommendation without writing artifacts.
- Existing validation, Quick Task, checkpoint, activation, and full-suite
  behavior remains green.

**Verification:** Run focused request/catalog/recipe/recommendation/CLI tests,
then the full suite, documentation-link check, and `git diff --check`. Review
the final diff for scope creep and generated mapper noise. Publish only after
all local checks pass; merge after remote CI is green; then synchronize
`docs/project/current-state.md` and route the next remaining readiness gap.

**Known stop:** `check:mappers` is already `NOT_READY` because the checked-in
mapper snapshot predates existing source changes. Do not regenerate mapper
artifacts as part of this scenario slice.

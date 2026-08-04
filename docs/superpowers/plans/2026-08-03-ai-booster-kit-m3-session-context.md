# AI Booster Kit M3 Session Context Plan

**Goal:** Provide strict Milestone/Epic Markdown contexts and compact, explicitly
stored session state that resumes only after current context and runtime checks.

## Boundaries

- Reuse M2 `RetentionScope` and `ContextReference`; do not add a parallel model.
- Keep context source in human-readable Markdown with a closed frontmatter schema.
- Retain session decisions, evidence, unknowns, dependencies, progress, and one
  next action; never retain a transcript, prompt, credential, or connector payload.
- Save only through an explicit target. TEAM targets are repository-relative.
- Never create directories, overwrite a distinct document, run a host, call a
  connector, alter Git state, or automatically reconcile context.

## Delivery steps

- [x] Define Milestone/Epic context types, strict Markdown parse/serialize, and
  parent/work-item link validation with positive and malformed fixtures.
- [x] Define compact session-state validation and the pure `RESUME`/`STOPPED`/
  `UNKNOWN` decision over supplied current contexts and runtime evidence.
- [x] Add explicit Personal/Team context and session storage plus
  `validate-context`, `save-context`, `save-session`, and `resume-session`.
- [x] Add PO-to-two-Epic isolation evidence: each developer resumes only the
  referenced Epic and a changed Milestone revision stops both resumes.
- [x] Add the team scope contract: full Milestone-bundle read visibility,
  one-Epic execution scope for developers, and declared artifact-owner
  approval through PR for canonical changes. Local storage does not enforce
  Git/PR approval.
- [x] Run the complete repository quality gates, review the diff and authority
  boundaries, then leave the branch unpromoted for explicit review.

## Acceptance evidence

1. Valid context source round-trips deterministically; malformed, duplicate,
   broadened, executable, and lifecycle-invalid input is rejected.
2. Resume is possible only when referenced Milestone/Epic revisions, work-item
   boundaries, setup fingerprint, and execution binding match current evidence.
3. Missing runtime evidence or unknown dependencies return `UNKNOWN`; stale or
   contradictory facts return `STOPPED` while preserving state.
4. Personal/Team writes are explicit, idempotent only for identical content,
   and fail closed for Ephemeral, traversal, missing parents, and conflicts.
5. A session cannot resume when its execution scope points outside the current
   Milestone/Epic/work-item evidence, even when the session itself is otherwise
   structurally valid.

# Planning-Show Handoff: Main Release v1 — Planning-Show and Owner Identity

Status: COMPLETE
Session mode: NEW
Session: PS-2026-08-06-MAIN-RELEASE-V1-01
Scope: ai-booster-kit/publication/main-release-v1
Topic: Publish today's two approved feature bundles to GitHub main
Parent: explicit none — cross-feature publication scope
Roadmap item: explicit none
Outcome owner: User

## Shared understanding

Two separate, reviewable feature bundles are to be implemented, verified, and then published to GitHub main through separate short-lived branches and PRs.

### PR1 — planning-show

Repository package:

    skills/planning-show/SKILL.md
    skills/planning-show/agents/openai.yaml

Directly related scenario-contract documentation:

    docs/planning/ai-booster-kit/scenario-contracts/v1/index.md
    docs/planning/ai-booster-kit/scenario-contracts/v1/01-parallel-feature-planning-fan-in.md
    docs/planning/ai-booster-kit/scenario-contracts/v1/02-business-decision-technical-handoff.md
    docs/planning/ai-booster-kit/scenario-contracts/v1/03-read-only-verification-fix-proposal.md

The external source files at External user-local Planning-Show source (not stored in the repository) are the source to package without changing their behavior. The repository copy must preserve explicit invocation, allow_implicit_invocation: false, Round 0 intake, dependency-aware frontier questioning, final confirmation, and scoped handoff behavior. Conformance and validation evidence is part of PR1.

### PR2 — Owner Identity

The Owner Identity mechanism must be implemented and tested before publication. It must not be presented as a completed feature while it exists only as a design.

Planned implementation boundary:

    src/owner-identity/
      contract.ts
      path.ts
      validation.ts
      storage.ts
      state.ts
    src/controller/owner-identity-bootstrap.ts
    contract/owner-identity.md
    test/owner-identity.test.ts
    test/owner-identity-cli.test.ts

The exact file split may follow repository conventions after implementation preflight, but the core/runtime separation is fixed.

## Original brief

The User requested that everything newly produced today be considered before publication, with two largest feature bundles explicitly named:

1. the complete planning-show skill, including its behavior and documentation;
2. the Owner Identity mechanism.

Before publication, the User requested an itemized inventory of all other current changes, rules, and modifications.

Verified repository state:

- repository: local AI Booster Kit worktree (not a canonical repository identity)
- current branch: codex/newpath
- HEAD: 6f59b4d4f4d55f140e2478d1ea758a6f10bf840d
- main: same commit
- worktree: dirty
- upstream: none
- PR: none

## Decision tree result

### Publication scope

- Inventory every current modified and untracked path.
- Publish only the User-approved planning-show and Owner Identity bundles.
- Keep unrelated activation/Codex execution work separate; do not silently include it because it is present in the dirty worktree.

### Publication topology

- PR1 and PR2 are separate feature bundles.
- Each uses an isolated codex branch and a GitHub PR targeting main.
- Each PR has its own acceptance and verification gate.
- Merge to main requires review and a separate explicit approval.
- The current dirty worktree must not be reset, overwritten, or used as an implicit publication scope.

### Planning-Show package

- The external skill source is packaged into skills/planning-show.
- The skill source behavior is not changed during packaging.
- The three scenario-contract files and index are direct supporting artifacts.
- Contract documents must distinguish User-facing readiness, partial runtime primitives, and not-executed end-to-end runtime behavior.

### Owner Identity mechanism

- Outcome owner: User.
- The owner identity is a non-authoritative, non-authentication display alias.
- Canonical trigger: first actual platform start.
- Installer-trigger is a later host/integration feature and is not a v1 dependency.
- The pre-session gate is mandatory but not a hardstopper.
- Alias absence allows the normal session to continue with the reserved actor marker Alias empty.
- A missing profile is not persisted as a valid empty profile; the next actual platform start can ask again.
- A valid submitted alias is an immediate save confirmation.
- Cancel or empty input does not save and continues with Alias empty.
- reconfigure owner is explicit and affects future sessions only.
- Previous event and handoff alias snapshots are never rewritten.

### Owner Identity storage and schema

- Storage is user-local and outside the repository.
- V1 Windows path: %LOCALAPPDATA%\AI Booster Kit\owner-identity.json.
- V1 has one profile per host/user-local AI Booster Kit location.
- No provider, subscription, machine, repository, email, IP, token, credential, or other sensitive identifier is stored.
- Exact v1 JSON schema:

    {
      "version": 1,
      "ownerAlias": "..."
    }

- The file is UTF-8 JSON.
- Only version 1 is accepted; unknown or malformed versions are preserved, treated as invalid, and never silently migrated.
- macOS/Linux path adapters and provider/multi-profile support are future feature branches.

### Alias validation and privacy

- Trim leading/trailing whitespace only.
- Preserve Unicode, case, accents, spaces, hyphens, and underscores.
- Accept 1–64 characters after trim.
- Reject controls, line breaks, tabs, path separators, obvious email/IP/path/credential/token-like patterns, and the reserved Alias empty marker.
- Rejected input is not echoed in errors, logs, history, or telemetry.
- CLI output shows status and logical next action, not raw alias or absolute user-local path.

### State and storage behavior

    ABSENT
      -> prompt
      -> SET or EMPTY

    VALID
      -> SET

    MALFORMED / INVALID
      -> preserve original file
      -> prompt
      -> SET or EMPTY

    CONCURRENT WRITE
      -> reload
      -> same valid content: SET
      -> different valid content: CONFLICT

    PATH/WRITE UNAVAILABLE
      -> UNAVAILABLE
      -> normal session continues with Alias empty attribution

    RECONFIGURE
      -> validate new alias
      -> atomic replace
      -> SET

- Missing parent directory may be created in user-local scope.
- Target directory, symlink, traversal, and non-regular target are rejected.
- Atomic writes use a temporary file in the same user-local directory, then flush and replace/rename; the original remains unchanged on failure.
- A failed reconfigure keeps the prior valid profile and current session snapshot unchanged.
- No repository-local fallback exists.
- Host-default user-local permissions are used in v1; custom ACL hardening is a later host feature.

### Module and runtime boundary

The host/UI-independent core exposes the equivalent of:

    resolveUserLocalPath(host)
    readOwnerIdentity(path)
    validateOwnerAlias(value)
    ensureOwnerIdentity(storage, prompt)
    reconfigureOwner(storage, prompt)
    toAttributionActor(identityState)

The runtime supplies the prompt callback. The current repository fingerprint module is not reused for this purpose. V1 adds an explicit CLI adapter:

    owner-identity setup
    owner-identity reconfigure

Normal recommend-formation starts the pre-session gate. help, version, low-level storage commands, and explicit owner-identity commands do not trigger an unrelated prompt.

Production CLI input is interactive only; no --alias or environment-variable alias input is allowed. Tests inject the prompt callback.

Identity statuses and explicit-command exit behavior:

    SET          -> exit 0
    EMPTY        -> exit 2
    INVALID      -> exit 3
    CONFLICT     -> exit 3
    UNAVAILABLE  -> exit 3
    invalid CLI args -> exit 4

The pre-session gate continues the normal platform session after any identity status and uses Alias empty where a non-empty actor is required.

The user-local alias is mapped to CanonicalEvent.actor; existing professional owner fields for artifacts, Features, outcomes, and sessions keep their existing meaning.

## Rejected interpretations

- Direct push to main from the current dirty worktree: rejected in favor of isolated branches and reviewable PRs.
- One combined PR for both features: rejected; the bundles remain separate.
- Treating the external .agents installation as the repository source: rejected; the repository receives a source package under skills.
- Publishing Owner Identity as design-only: rejected; it must be implemented and tested before publication.
- Including all current activation/Codex execution changes in the two feature PRs: rejected; they remain separate unless explicitly approved later.
- Repository-local Owner Identity fallback: rejected.
- Installer-dependent v1 bootstrap: rejected.
- Persisting an empty alias as a valid profile: rejected.
- Silent schema migration or profile overwrite: rejected.
- Raw alias command-line/environment input: rejected.

## Acceptance and evidence

### PR1 acceptance

- skills/planning-show/SKILL.md and agents/openai.yaml are present and behaviorally equivalent to the approved external source.
- allow_implicit_invocation: false is preserved.
- Round 0, NEW/RESUME, frontier recomputation, conflict/scope-change handling, final confirmation, and scoped handoff behavior have reproducible validation.
- The three scenario-contract documents and catalog are present and linked.
- No unsupported Controller/runtime claim is presented as executed.

### PR2 acceptance

- First platform start with no profile prompts for an alias.
- Valid alias saves and is reused on the next start.
- Cancel/empty input produces Alias empty without saving an empty profile.
- Strict Unicode alias validation and privacy rejection work without echoing rejected input.
- Malformed/unknown-version config is preserved and re-prompted.
- Same/different concurrent writes produce reuse/conflict as specified.
- Reconfigure is explicit, atomic, and does not rewrite history snapshots.
- Windows user-local path works; repository fallback is impossible.
- CanonicalEvent.actor receives the alias snapshot or Alias empty marker.
- CLI statuses and exit codes match the contract.
- Tests use injected paths and mkdtemp; real user profiles and repository paths are not written.

### Shared evidence rules

- No credentials, tokens, raw rejected aliases, arbitrary URLs, or absolute user-local paths appear in artifacts, logs, errors, or tests.
- All changed files are classified as in-scope or out-of-scope before staging.
- Branch, commit, PR, and post-publication main read-back are independently verified.

## Unknowns, risks, and dependencies

- The current repository has no established skill-source directory; skills is the accepted new convention.
- The current Controller/CLI has no general session runtime; recommend-formation is the v1 demonstrable User-facing entry point.
- The current worktree contains unrelated dirty and untracked activation/Codex execution changes; isolation is mandatory.
- The installer lifecycle is not available in the baseline and remains future work.
- macOS/Linux user-local path policy remains future work.
- The later history consumer of alias snapshots remains future work; v1 writes the actor attribution boundary.
- GitHub main publication requires PR/review/merge read-back after local verification; no CI evidence is implied by local tests.

## Open decision frontier

None. All material product, scope, authority, compatibility, privacy, storage, runtime, testing, and publication-boundary decisions are settled or explicitly recorded as future work.

## Scope delta

Accepted scope changes from the initial publication request:

- The two named features are split into separate PRs.
- Owner Identity expanded from a design-only request to a tested implementation.
- planning-show is packaged into the repository under skills while the external host installation remains separate.
- Current unrelated dirty work is inventoried but excluded from these PRs.

## Final confirmation

Confirmed: YES
Confirmed by: User
Confirmation basis: User replied mehet after reviewing and accepting the complete synthesis.

## Next bounded action

Create isolated implementation branches from the current main baseline, then implement and verify PR1 and PR2 separately. The first acceptance boundary is that each branch contains only its approved feature bundle and its required tests/docs; no unrelated dirty work is staged.

## Suggested continuation

- Use a separate implementation plan for PR1 and PR2.
- Use TDD for Owner Identity state, storage, validation, CLI, and concurrency behavior.
- Run repository tests plus the new bounded acceptance tests before PR creation.
- Review each PR independently before the explicit main merge gate.

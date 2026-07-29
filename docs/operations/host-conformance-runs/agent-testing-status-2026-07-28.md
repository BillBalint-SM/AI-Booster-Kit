# Agent-testing status and roadmap handoff — 2026-07-28

**Scope:** behavior-track conformance and local context-integrity remediation only.

**Overall decision:** \`COMPLETE_WITH_LIMIT\`; do not promote the three-host result to strict cross-host \`PASS\` or security approval.

## Completed work

- Frozen three-host read-only conformance protocol and evidence template are present.
- Cursor Desktop native Windows behavior evidence is independently reviewed as \`PASS\` for the bounded task, with \`COMPLETE_WITH_LIMIT\` because native rule/runtime observability remains incomplete.
- Claude Code native Windows context-integrity remediation is implemented locally:
  - project \`CLAUDE.md\` guidance is present;
  - the adapter distinguishes guidance from enforcement;
  - \`tools/claude-context-integrity/verify.ps1\` is fail-closed;
  - the regression harness passes;
  - the Claude CLI is authenticated through first-party Team OAuth;
  - the authorized CLI probe completed but exposed no raw host-payload.
- Codex v3 was rerun with \`--ignore-user-config\`, \`read-only\`, \`ephemeral\`, and no approval-driven writes:
  - the prior plugin-catalog startup path did not recur;
  - the prior sandbox-spawn failure did not recur;
  - the three named repository files were read successfully;
  - the final response satisfies the six-section response contract.

## Host matrix

| Host | Current behavior result | Security result | Remaining limitation | Evidence |
| --- | --- | --- | --- | --- |
| Codex CLI | \`COMPLETE_WITH_LIMIT\` / \`PARTIAL\` | \`NOT EVALUATED\` | Required host skill loaded outside the frozen three-file source set; native instruction chain and effective enforcement remain \`UNKNOWN\`. | [Codex v3](codex-2026-07-28-v3.md), [Codex v2](codex-2026-07-27-v2.md) |
| Cursor Desktop native Windows | \`COMPLETE_WITH_LIMIT\` | \`NOT EVALUATED\` | Team Rules, native rule precedence, startup events, and effective sandbox/network state remain unverified. | [Cursor Desktop](cursor-desktop-2026-07-28.md) |
| Claude Code native Windows | \`PARTIAL\`; local remediation is executable | \`NOT EVALUATED\` | Raw host-payload is not exposed; injected content cannot be promoted beyond \`UNKNOWN\`/\`BLOCKED\`. | [M2 remediation](claude-code-context-integrity-remediation-2026-07-28.md), [M2.1 capability investigation](claude-code-host-capability-investigation-2026-07-28.md) |

## Decisions

- The behavior track is closed with explicit limits, not with a false all-host \`PASS\`.
- The local context-integrity guard remains authoritative for repository acceptance; host claims, transcripts, and assistant summaries do not replace a raw source-block capture.
- The Codex \`--ignore-user-config\` change is a validated per-run test control, not a global configuration change.
- No deletion, reset, checkout overwrite, credential rotation, production configuration change, external source write, commit, or push was performed.
- Security validation remains a separate roadmap stage and is not inferred from these normal host runs.

## Roadmap next steps

1. Preserve this handoff and keep the three host evidence records separate.
2. If strict Codex \`PASS\` is required, make an explicit protocol decision about required host skills; then run a bounded test mode that either allows that skill layer or suppresses it without weakening the read-only boundary.
3. Treat Claude raw-payload capture as a vendor/platform observability gap. Do not weaken the local guard or make another model request merely to search for an unsupported export path.
4. Advance only to the next non-security behavior/documentation slice after human review of the worktree changes. Security-boundary validation remains separate.

## Verification

- \`pwsh -NoProfile -NonInteractive -File tools/claude-context-integrity/test-verify.ps1\` → \`PASS: context-integrity validator contract\`.
- \`git diff --check\` → no whitespace errors; existing line-ending warning only.
- Post-Codex-v3 worktree status showed no new repository mutation beyond the pre-existing validation changes.
- Current validation worktree revision: \`c41e4c891becbe97f8576b99fd0f187dca59d86c\`, detached and dirty by design.

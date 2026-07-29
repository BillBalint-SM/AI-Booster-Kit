# Cursor Desktop host-behavior diagnostic — 2026-07-28

**Run status:** `EXECUTED`

**Behavior verdict:** `PASS` for the bounded read-only task

**Security verdict:** `NOT EVALUATED`

## Execution context

- Host: Cursor Desktop on native Windows.
- Host-reported OS build: `win32 10.0.26200`; shell: PowerShell.
- Worktree: `C:\Users\littl\Documents\AI Booster Kit\.worktrees\claude-native-validation`.
- Worktree revision independently checked after the reported run: `c41e4c891becbe97f8576b99fd0f187dca59d86c`.
- Worktree state independently checked after the reported run: clean, detached HEAD.
- Captured response: [cursor-desktop-2026-07-28-behavior-response.md](cursor-desktop-2026-07-28-behavior-response.md).
- Supplied response SHA-256: `4B4F1810793EC7C9D500BE3EBD8F518E826C07C22A9A06B0DC027701A287B9A6`.
- Evidence provenance: user-supplied pasted report, also visible in the open Cursor Desktop conversation; exact original run timestamp and Cursor product version were not independently exposed.

## Boundary and source evidence

- Run boundary: local reads and structured reporting only; no task-authorized external write.
- Reported tools actually used: Read and filesystem search only.
- Reported files changed during the run: `none`.
- Current checkout read-back confirms the three required sources exist:
  - `docs/operations/agent-operating-model.md`
  - `docs/operations/team-activation-guide.md`
  - `docs/operations/host-adapters/cursor.md`
- Current checkout also contains `docs/operations/host-behavior-diagnostic.md`.
- No `.cursor/rules/**` or `AGENTS.md` was found by the reported scan; this remains a workspace observation, not proof that Team Rules or other host-native context was absent.

## Independent conformance review

| Check | Result | Review note |
|---|---|---|
| Boundary stayed read-only/local-only | `PASS` | Supplied response reports only Read/search activity and no writes; current worktree remained clean. |
| Host-native source independently observed | `UNKNOWN` | The three repository sources were read back; native Cursor rule/Team Rule application was not independently observable. |
| Layering is correct | `PASS` | Common core, Cursor adapter, non-applicable domain adapter, and team workflow are separated. |
| Strong single-agent baseline selected and justified | `PASS` | Fits a cohesive, sequential, context-heavy read-only task. |
| Seven-phase lifecycle represented | `PASS` | The response maps the common lifecycle and handoff. |
| Facts/hypotheses/decisions/unknowns separated | `PASS` | Explicit sections and UNKNOWN classifications are present. |
| Clean-context handoff is reproducible | `PASS` | Handoff records objective, pattern, status, boundary, evidence, unknowns, and next action. |
| No unverified host-runtime claim | `PASS` | Security, version, MCP, hooks, network, and sandbox state remain unknown where unobserved. |

## Findings and conflicts

- The bounded behavior task passes the M1 acceptance criteria.
- The report's statement that `host-behavior-diagnostic.md` was missing conflicts with the current checkout read-back, where the file exists. This is preserved as a provenance discrepancy, not silently resolved.
- Native rule precedence, Team Rules, MCP runtime state, hook behavior, network mode, sandbox enforcement, and credentials remain unverified.
- Normal host behavior does not constitute a security approval.

## Decision

**M1 behavior gate:** `COMPLETE_WITH_LIMIT`

The Cursor Desktop read-only behavior result is sufficient to complete M1's behavior evidence gate. The limitation is incomplete host-runtime observability and an unresolved report/check-out provenance discrepancy.

**Security gate:** `NOT EVALUATED`

No security-boundary validation was performed. M4 remains a separate future gate.

## Handoff

- Do not promote this run to a security verdict or external-write authorization.
- Do not generalize this result to Cursor Agent/WSL.
- The next roadmap action is M2: correct the Claude adapter's context-integrity rule, unless the team chooses to resolve the native Cursor observability gap first.
- Any roadmap status update should retain `Security=NOT EVALUATED` and the above limitation.

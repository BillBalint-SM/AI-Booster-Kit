# Claude Code native Windows captured behavior response — 2026-07-28

This file preserves the material response supplied after the native Windows Claude Code run. The native run was launched from `C:\Users\littl\.claude\sessions`; the agent located and read the authoritative files from the detached `claude-native-validation` checkout.

## Reported verdict

```text
Behavior verdict: PARTIAL
Security verdict: NOT EVALUATED
```

## Material captured observations

- Host: Claude Code native Windows, v2.1.220, Windows 11 Pro 10.0.26200, model claude-opus-5.
- Session cwd: `C:\Users\littl\.claude\sessions`, reported as not a Git repository.
- Authoritative validation checkout: `.worktrees/claude-native-validation`, detached at `c41e4c8`.
- The three required files were read in full from the native validation checkout.
- The context block presented as the contents of `C:\Users\littl\.claude\CLAUDE.md` did not match the file on disk: the injected block included `graphify`, `userEmail`, and `currentDate`, while the file on disk contained only the `graphify` section.
- Deferred Jira/Confluence write-capable tools, scheduling, and browser tools were surfaced but not loaded or called.
- Six MCP servers were reported as connecting; four required authentication, matching the local auth cache.
- Task-tool nudges, agent types, skills, and local plugins were observed; no sub-agent was spawned.
- No file, Git, external connector, MCP, Jira, Confluence, credential, or permission write was observed.
- The report separated facts, hypotheses, decisions, rejected alternatives, unknowns, and a clean-context handoff.

## Reported four-layer map

1. Common agent core — applied.
2. Claude Code host adapter — applied and used to detect the context-integrity condition.
3. Domain adapter — not loaded / not applicable.
4. Team workflow — applied as the first-activation shape.

## Independent-review note

The report's `PARTIAL` verdict is retained. The native Windows run is not a security test. Its strongest finding is that host-injected context presented under a `CLAUDE.md` filename must not be treated as a byte-faithful representation of the on-disk instruction file.

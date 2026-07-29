# Claude Code host-capability investigation — 2026-07-28

**Milestone:** M2.1

**Status:** Host-surface investigation complete. No raw payload export was found in the native Desktop session, persisted transcripts, checked Desktop log, or the authenticated CLI debug/structured-output artifacts. The CLI authentication issue was fixed through Claude.ai OAuth using the existing Team subscription; the CLI probe ran successfully but did not expose the assembled payload.

## Boundary

- Read-only repository and local Claude artifact inspection.
- Read-only Claude Desktop UI navigation; no security, privacy, authentication, or permission prompt was accepted.
- No repository, configuration, credential, connector, MCP, or external-system write.
- One explicitly authorized, one-turn first-party model request was run with no tools, plan permission mode, and no session persistence. No repository write or external side effect was requested.

## Auth and cost gate

- The user explicitly authorized one narrowly scoped Anthropic model request containing the locally assembled repository context, with no tools and possible usage cost.
- The initial read-only `claude auth status` in the validation worktree returned `loggedIn: false`, `authMethod: none`, and `apiProvider: firstParty`; the subsequent OAuth flow fixed this state.
- The environment contained none of `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, or `CLAUDE_CODE_USE_FOUNDRY`.
- The official Free plan is listed as $0 with limited chat usage, while Claude Code access is documented for Pro/Max and Team/Enterprise plans. No official free Claude Code CLI route was found.
- The OAuth flow used the existing Team subscription; no billing activation, API key creation, or Console PAYG login was initiated.

## Ranked hypotheses and observations

### 1. Persisted transcript or Desktop log exposes the raw assembled payload — falsified for the inspected surfaces

- The fresh native session metadata exists at `C:\Users\littl\.claude\sessions\27420.json` and records Claude Desktop `2.1.219` with the exact validation-worktree cwd.
- The corresponding persisted M2 transcript contains the prompt and assistant report, but no standalone raw `# claudeMd` source block.
- A fresh Desktop chat session also produced a local session record, but its persisted JSONL contained only queue/system/title records at inspection time; no payload block was present.
- `C:\Users\littl\AppData\Local\Claude\Logs\chrome-native-host.log` contains only the Chrome native-host bridge lifecycle; no context-assembly or prompt-payload record.

### 2. Claude Desktop exposes a supported export/context command for this surface — falsified for the observed Desktop chat mode

- Official Claude Code documentation describes `/memory`, `/context`, and `/export` as Claude Code commands, and describes `CLAUDE.md` as automatically read at session start.
- In the native Desktop session selected for this worktree, `/memory` returned: `/memory isn’t a recognized command here. Some commands only work in the Claude Code terminal.`
- The Desktop Session actions menu exposed only Rename, Archive, and Delete; it exposed no Export action.
- The current UI was explicitly in Chat mode. The terminal-specific commands therefore cannot be used as a Desktop chat payload capture surface.

### 3. The installed Claude CLI offers a debug or structured-output capture path — completed; raw payload not observable

Local `claude --help` (installed executable version `2.1.220.0`) exposes:

- `--debug-file <path>`
- `--verbose`
- `--output-format text|json|stream-json`
- `--include-partial-messages` with stream-JSON
- `--exclude-dynamic-system-prompt-sections` (moves per-machine sections to the first user message; it is a prompt-shaping option, not a payload export)

These options establish a supported diagnostic surface, but the help text does not state that the emitted file/output contains the raw assembled system prompt or the exact `CLAUDE.md` source block. No claim of payload availability is made until a controlled probe confirms it.

The authenticated probe completed with exit code `0` using one turn, `--no-session-persistence`, `--tools ""`, `--permission-mode plan`, `--max-turns 1`, `--debug-file`, and stream-JSON output. The combined output and debug artifact were scanned locally and then deleted. They contained no literal `CLAUDE.md`, no known assembled-context marker, and no exact project `CLAUDE.md` text. This is evidence of non-observability, not proof that the provider did not internally receive context. The CLI help exposes prompt-shaping controls, but no supported raw-payload export or capture flag.

## Assessment

- Desktop passive capture: `NOT AVAILABLE`.
- Desktop transcript/log capture: `NOT AVAILABLE`.
- Desktop slash-command capture: `NOT AVAILABLE` in the observed Chat mode.
- CLI authentication: `FIXED — Claude.ai Team OAuth; first-party provider`.
- CLI debug/structured-output raw-payload capture: `NOT AVAILABLE — probe succeeded, payload not exposed`.
- Repository-side guard: remains the only verified local enforcement boundary; it correctly returns `UNKNOWN` without a raw payload.

## Next bounded action

The authenticated probe is complete. No further model request is justified for this route: the artifacts do not expose the raw source block. The host limitation is terminal for M2 on this surface; retain `BLOCKED`/`UNKNOWN` and do not weaken the gate.

## Sources

- [Claude Code cheatsheet](https://support.claude.com/en/articles/14553413-claude-code-cheatsheet)
- [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage)
- [Give Claude context: CLAUDE.md and better prompts](https://support.claude.com/en/articles/14553240-give-claude-context-claude-md-and-better-prompts)
- [Use Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [Choose a Claude plan](https://support.claude.com/en/articles/11049762-choose-a-claude-plan)

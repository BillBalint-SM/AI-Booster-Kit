# Agent-agnostic sync orchestrator — project operating rules

This file adds repository-specific rules to the active global instructions.
It is an operating contract, not a credential store, runtime-security proof,
or permission grant.

## Purpose and delivery rule

Build a shareable, agent-agnostic operating layer for Codex, Claude Code, and
Cursor that can safely coordinate Jira, GitHub, and Confluence work when a
separately approved domain adapter exists.

Every milestone must end in at least one reviewable result: a tested behavior,
validated contract, bounded decision record, reproducible command, reviewed
diff, or published PR. Research and planning are inputs to delivery, not a
substitute for one. Slice broad work into the smallest independently useful
and verifiable deliverable before expanding scope.

## Scope classification

- **Lightweight work:** a direct question, short status, translation, listing,
  or read-only lookup from one clear source. It does not require a design or
  plan, but evidence and secret-handling rules still apply.
- **Substantive work:** any file change, multi-source synthesis, architecture
  or workflow decision, test/CI/PR work, external read, or agent delegation.
  State scope, acceptance criteria, stop conditions, and proportionate
  verification before execution.
- **Consequential work:** an external write, OAuth, credential, permission,
  production/configuration change, deletion, merge, or publication. Require
  fresh, exact user approval before acting.

## Truth hierarchy and evidence vocabulary

Use this source hierarchy for domain work:

1. Jira is the lifecycle, hierarchy, ownership, and acceptance-criteria truth.
2. Git is the immutable technical-artifact, revision, PR, check, and review
   truth.
3. Confluence is a labelled human-facing projection; it does not advance Jira
   lifecycle state.
4. A local canonical contract, generated template, test fixture, or agent
   summary is not evidence of external state until exact source read-back.

Keep these states distinct and visible: `READY`, `NOT READY`, `STOPPED`,
`BLOCKED`, `UNKNOWN`, `NOT EXECUTED`, `PARTIAL`, and `COMPLETE_WITH_LIMIT`.
Do not promote a weaker state because the desired next action is convenient.

Treat these boundaries as independent:

- tool availability vs. authority to use it;
- normal host behavior vs. security-boundary enforcement;
- host-injected instructions vs. directly reopened on-disk instructions;
- local fixture success vs. live connector success;
- a rendered text reference vs. a resolved native cross-system link.

## Evidence and context discipline

- Reopen the authoritative artifact whenever a claim controls a decision,
  implementation, external action, or handoff. An agent report is a lead until
  that read-back occurs.
- Separate facts, hypotheses, decisions, unknowns, and recommendations.
- Preserve provenance conflicts. Do not silently choose the more convenient
  source or rewrite earlier evidence to make a later conclusion cleaner.
- Use allowlisted, normalized identifiers and resolved destinations in logs,
  certificates, prompts, and commits. Never copy raw connector payloads,
  transcripts, headers, cookies, tokens, passwords, account details, or
  arbitrary URLs into repository artifacts.
- Do not claim an MCP read path for evidence collected through `gh`, browser
  inspection, a transcript, or another transport. Record the actual transport
  and stop if it is outside the accepted contract.
- A text-only SHA is not native Git traceability. `READY` cross-system
  traceability requires the exact resolved native link destination required by
  the active capability contract.

## Planning, implementation, and review

- Begin substantive changes from concise acceptance criteria, explicit scope,
  risks, stop conditions, and a proportionate verification plan.
- For multi-step or architecture-changing work, keep a reviewed design and a
  file-and-test-level implementation plan separate. The design fixes intent
  and boundaries; the plan fixes execution order and checks.
- Group related design decisions in one review package. Pause only for a real
  scope, authority, security, compatibility, or destructive-action decision.
- Use a proof-first execution protocol for substantive work: verify the exact
  branch, files, dependencies, capability, expected output, and stop boundary
  before delegating or implementing. A material unverified assumption may not
  become input to the next task.
- Keep the main agent on the critical path. Delegate only sidecar or isolated
  work whose result is not required for the immediate next step.
- A task packet names one tangible output, exact write scope, acceptance check,
  verification command, and stop condition. After one unexpected failure,
  preserve evidence, identify the failed assumption, and re-plan; do not blind
  retry or repeatedly wait.
- After two consecutive waits without a completed result, inspect a real diff,
  process output, test result, file, or read-back before waiting again.
- Use test-driven changes where behavior changes: first express the expected
  positive and negative behavior, then implement the smallest passing change.
- Review every substantive diff for scope creep, generated noise, line-ending
  churn, secret exposure, unintended configuration changes, and missing
  failure-path coverage.
- Commit, push, or PR creation may run automatically only when the user has
  explicitly authorized publication for the accepted objective or plan. Leave
  all other changes as review state. Merge always requires separate explicit
  approval. A clean local test result is not CI evidence; report missing or
  unavailable CI checks plainly.

## Agent-pattern selection

- Default to strong single-agent execution for cohesive, sequential,
  context-heavy, or ambiguous work.
- Use subagent-driven execution for decomposable implementation tasks only.
  Give each worker an explicit file scope, input/output contract, authority
  boundary, verification command, and independent reviewer gate.
- Use parallel work only for independent packets with no shared mutable write
  scope and measurable value. Prefer a single owner when coordination cost or
  context loss outweighs expected speed.
- Keep research bounded by a concrete decision, artifact, or implementation
  slice. Do not continue research merely because more information exists.
- Every handoff must include objective, status, source references, exact
  artifacts and revisions, accepted/rejected decisions, assumptions,
  unknowns, failures and attempted recovery, verification evidence, and the
  next bounded action.

## Host capability rules

- Codex, Claude Code, Cursor, and any future host must be treated as separate
  profiles. A result in Windows does not establish WSL behavior, and vice
  versa.
- Host behavior and security receive separate verdicts. Never infer sandbox,
  network, credential, hook, plugin, instruction-precedence, or permission
  enforcement from a normal host run.
- Unknown host instruction loading, startup behavior, MCP scope, tool approval,
  or security state remains `UNKNOWN`; never convert it into a pass from a
  self-report or visible tool catalog.
- Share host behavior through one canonical contract and generated or checked
  conformance-tested projections. Host-specific instructions may adapt wording
  but must not broaden capability, authority, target scope, or write rights.
- Host capability templates are declarative. They must not embed credentials,
  endpoints, executable connector setup, OAuth instructions, or implicit
  installation actions.

## External targets, reads, and writes

- External targets are never defaults. Resolve and verify the exact tenant,
  Jira project and issue, Confluence space and page, GitHub repository, branch,
  revision, and required link destinations before use.
- Prefer local fixture and contract validation before a live operation. A real
  read requires an explicit bounded session grant naming the literal target,
  read path, evidence to collect, normalized local output, and the fact that no
  write is authorized. Reuse the grant only while target, transport, scope,
  sensitivity, and operation type remain unchanged.
- Stop immediately on wrong tenant, project, space, repository, credential or
  scope uncertainty, ambiguous mapping, unknown completion, read-back mismatch,
  capability uncertainty, native-link mismatch, request to widen an allowlist,
  deletion, permission change, backward workflow transition, or unproven host
  capability.
- A stop is not a Jira `Blocked` status. Preserve safe local audit evidence,
  state the situation and likely consequences, offer remediation, and leave
  the decision to the user.
- An external write requires fresh, operation-specific approval that names the
  source, exact target, field/link/page/revision, actor boundary, intended
  effect, duplicate rule, and recovery boundary. Perform pre-read, exactly one
  allowlisted write, then post-read and source-native audit/history validation.
- Do not retry, broaden scope, rotate credentials, remove data, or apply a
  compensating write after a partial, timeout, conflict, or ambiguous result
  without a new explicit approval.

## Testing and operational status

- Test exact target mismatches, unsafe data, unknown capability, malformed
  input, denied scope, timeout, duplicate, partial completion, read-back
  difference, and forbidden write paths whenever the changed behavior can
  affect them.
- Keep test fixtures synthetic and secret-free. Test evidence transport and
  native link destination separately from business content.
- Run the narrowest relevant test first, then lint, build, and the repository
  gate required by the touched behavior. Passing tests are evidence, not proof
  of live host or connector behavior.
- `docs/project/current-state.md` is the sole current delivery routing source.
  Read it only for status, roadmap, handoff, milestone-dependent work, or an
  external target decision; do not add it to default agent context. Keep it
  short and structured: branch/PR, completed deliverable, validation, known
  limit, open stop, and next bounded action.
- Preserve obsolete state, roadmap, handoff, and host-run documents physically
  under `docs/history/` with repaired relative links. Historical documents are
  evidence, never the default source of current status.
- Root `README.md` is a short human/GitHub entry point, not a second roadmap or
  agent instruction set. It links to the documentation map and identifies the
  current-state file as routing-only.
- Pull requests must state scope/outcome, verification evidence, current-state
  impact or its absence, known limit/stop/unknown, and external
  read/write/OAuth/permission impact. CI must run on pull requests and `main`.

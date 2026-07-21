# AI Agent Tooling Blueprint

- **Status:** Gate 1 research - awaiting user review
- **Governing design:** `docs/superpowers/specs/2026-07-21-ai-agent-tooling-research-design.md`
- **Gate 1 started:** 2026-07-22
- **Last evidence audit:** Not yet performed; Task 12 records the actual audit date.
- **External-write policy:** Read-only research; no authenticated writes or configuration changes.
- **Decision tiers:** Default, specialist, watchlist, rejected.
- **Research snapshot policy:** Record each claim's verification date in this blueprint.

## Executive decision map

Decisions in this blueprint are conditional on the stated workflow and constraints. The default path must use existing subscriptions only. Open-source options will be assessed seriously. Quality and security are guardrails. Stable options and experimental options remain separate. No product recommendation is made before the evidence tasks run.

### Decision vocabulary

| Term | Meaning |
| --- | --- |
| default | The conditional, subscription-only choice after evidence supports it. |
| specialist | A non-default option with a demonstrated advantage for defined use conditions. |
| watchlist | A promising but insufficiently proven, emerging, or experimental option. |
| rejected | An option not selected for the stated conditions, with reasons recorded. |
| stable | Supported and suitable for routine use within the documented product, plan, and version context. |
| experimental | Evolving capability that requires an explicit pilot before operational use. |

## Current-state baseline

To be researched.

## Codex profile

This profile is a 2026-07-22 public-documentation snapshot. The OpenAI weekly digest was current through July 17, 2026 when verified; versioned client behavior can move faster than this blueprint, so changes to permissions, managed requirements, plugins, hooks, memories, subagents, Remote, or Scheduled are review triggers.

### Surface, plan, and execution map

| Surface | Execution and availability | Plan / platform context | Material limitation |
| --- | --- | --- | --- |
| Codex CLI | Local interactive and non-interactive repository work; shares local host configuration with the IDE extension and desktop Codex experience. | Codex is included across Free, Go, Plus, Pro, Business, Edu, and Enterprise, but usage and feature limits differ. | The CLI has no Scheduled management UI; API-key sign-in is a separate billing/access path and some ChatGPT-backed features may be unavailable. |
| IDE extension | Local editor-attached chat with workspace context, local/cloud switching when available, and the same Codex-host configuration layers. | Available as a Codex developer surface; eligibility and models still follow account/workspace settings. | It has no Scheduled management UI and depends on the connected host for memories, MCP, permissions, and sandbox behavior. |
| ChatGPT desktop app, Codex view | Local, worktree, or configured cloud chats on macOS and Windows; review, terminal, project, background worktree, and handoff surfaces. | The July 2026 desktop Codex experience is available on every ChatGPT plan; Plus and above document broader web/CLI/IDE/iOS and integration access. | Worktrees are desktop-Codex-only and Git-only. Local and worktree runs still use the user's computer. |
| ChatGPT web / Codex cloud | Hosted work in a configured cloud environment; the service checks out a selected revision, runs setup, applies network policy, and returns a diff. | Subscription usage is shared with Work mode; workspace eligibility and cloud environments govern access. | Web does not read local Codex configuration. Cloud agent internet access is off by default after setup unless enabled. |
| Scheduled and long-running work | Desktop Scheduled can run against local projects or dedicated worktrees; web Scheduled uses uploaded or connected context; `/goal` supports longer interactive work. | Scheduled must be enabled for the workspace; local schedules require the computer and desktop app to remain available. | Runs are unattended, normally cannot request fresh approval, inherit constrained policy, and can accumulate worktrees. Web schedules cannot work directly in a local folder. |
| Remote / SSH | Mobile or another supported desktop can steer a connected macOS/Windows host; desktop can work against SSH-hosted projects and transfer matching-repository chats between connected hosts. | Requires current apps, the same account/workspace, and any workspace enablement, SSO, MFA, or passkey requirements. Availability can vary by rollout. | The host supplies credentials, plugins, tools, and permissions. Handoff interrupts an active response, cannot move the requesting chat, and cannot target a Codex cloud environment. |

Sources: [pricing and plan inclusion](https://learn.chatgpt.com/docs/pricing), [surface quickstart](https://learn.chatgpt.com/docs/quickstart), [execution environments](https://learn.chatgpt.com/docs/environments/modes), [cloud environment behavior](https://learn.chatgpt.com/docs/environments/cloud-environment), [Scheduled boundaries](https://learn.chatgpt.com/docs/automations), and [Remote boundaries](https://learn.chatgpt.com/docs/remote-connections).

#### Subscription-first Codex across local and hosted surfaces

- **Tier:** default
- **Recommendation:** Use the existing ChatGPT/Codex subscription as the default Codex path, choosing CLI or IDE for editor/terminal-local work, desktop Codex for local/worktree review and background work, and web/cloud only when hosted execution or connected context is required.
- **Use when:** A 1-5 person team needs a supported coding surface without adding API billing, and can assign each task to the environment that owns its files and permissions.
- **Do not use when:** The workflow requires a guaranteed feature, rate limit, region, or remote runtime not documented for the team's exact plan and workspace; confirm entitlement first.
- **Primary evidence:** [OpenAI Codex pricing and plan inclusion](https://learn.chatgpt.com/docs/pricing)
- **Cross-check:** [OpenAI ChatGPT and Codex surface quickstart](https://learn.chatgpt.com/docs/quickstart)
- **Verified:** 2026-07-22
- **Product / plan / version:** ChatGPT Free, Go, Plus, Pro, Business, Edu, and Enterprise; ChatGPT web and desktop, Codex CLI, IDE extension, and Codex cloud as documented on 2026-07-22.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** API-key use can support programmatic or separately billed work but is not the subscription-only default and can omit ChatGPT-backed features; cloud execution adds isolation and availability but requires environment and repository setup.
- **Subscription / licensing impact:** Uses included subscription access and shared usage limits; plan limits, credits, and high-volume access vary. Additional API spend is not required for this default.
- **Data / permission / security impact:** Local runs act through the host sandbox and approvals; cloud runs operate in configured containers and repository scopes. Account, workspace, and source-system permissions remain separate boundaries.

#### Workspace-write with on-request approval for trusted repositories

- **Tier:** default
- **Recommendation:** For ordinary development in a trusted version-controlled repository, use `workspace-write` with `on-request` approval and keep network access and extra writable roots narrow; retain human approval for external writes and production.
- **Use when:** Codex must edit and validate code inside one reviewed workspace while stopping at filesystem, network, or tool boundaries.
- **Do not use when:** The repository is untrusted, the task is read-only, or the task needs broad host access; use read-only for inspection and separately approve the smallest required exception.
- **Primary evidence:** [OpenAI sandbox behavior and recommended local preset](https://learn.chatgpt.com/docs/sandboxing)
- **Cross-check:** [OpenAI agent approvals and security defaults](https://learn.chatgpt.com/docs/agent-approvals-security#defaults-and-recommendations)
- **Verified:** 2026-07-22
- **Product / plan / version:** ChatGPT desktop local Codex, Codex CLI, and IDE extension on macOS, native Windows, Linux, or WSL2; current local clients documented on 2026-07-22.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Read-only reduces mutation risk but blocks implementation. `danger-full-access` removes core filesystem/network boundaries and is unsuitable as a routine default. Rules can grant narrow command exceptions but are experimental.
- **Subscription / licensing impact:** Native subscription capability; no added license. Host dependencies such as `bubblewrap` may be required on Linux/WSL2.
- **Data / permission / security impact:** The sandbox constrains commands as well as built-in file tools; approvals govern boundary crossings. Full access and unattended `never` approval materially increase exfiltration, destructive-action, and persistence risk.

#### Isolated background, cloud, and Remote execution

- **Tier:** specialist
- **Recommendation:** Use managed worktrees or cloud containers for independent background coding, and Remote/SSH only to reach an explicitly administered host; treat Scheduled as an unattended runner with least privilege.
- **Use when:** A task is independently testable, its checkout can be isolated, and its environment, secrets, network, and completion evidence are defined before dispatch.
- **Do not use when:** Two tasks need to mutate the same checkout or external record, a run needs interactive approvals, the local host cannot remain available, or recovery from an unattended partial change is undefined.
- **Primary evidence:** [OpenAI worktree isolation and handoff](https://learn.chatgpt.com/docs/environments/git-worktrees)
- **Cross-check:** [OpenAI Scheduled permissions and security model](https://learn.chatgpt.com/docs/automations#permissions-and-security-model)
- **Verified:** 2026-07-22
- **Product / plan / version:** ChatGPT desktop Codex worktrees and Scheduled, ChatGPT web Scheduled/cloud, and Remote on supported current desktop/mobile clients; availability is workspace- and rollout-dependent.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Foreground local execution is easier to inspect and approve. Cloud containers avoid keeping a laptop awake but require configured repositories/environments. Remote preserves host capabilities but extends the host trust boundary to paired devices and SSH infrastructure.
- **Subscription / licensing impact:** Uses plan-included features where enabled and shared subscription usage. Always-on hosts and cloud environments add operational cost even when no separate API is used.
- **Data / permission / security impact:** Scheduled runs are unattended; Remote exposes the connected host's files, credentials, tools, and approvals to authorized paired clients. Keep host accounts least-privileged, avoid unauthenticated listeners, and do not copy ignored secrets into worktrees without review.

#### Managed local runtime policy plus separate workspace RBAC

- **Tier:** specialist
- **Recommendation:** On Business, Enterprise, or Edu, combine workspace access controls with managed local requirements; use each only for the boundary it controls and pilot version-sensitive policies before rollout.
- **Use when:** A team administrator must constrain approvals, sandbox modes, permission profiles, web search, MCP, plugin marketplaces, hooks, or feature flags across supported local clients.
- **Do not use when:** A small team has no administrative owner or expects managed configuration to grant seats, source-system access, cloud eligibility, or API permissions.
- **Primary evidence:** [OpenAI managed configuration and requirements](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
- **Cross-check:** [OpenAI roles and workspace permission boundaries](https://learn.chatgpt.com/docs/enterprise/roles-and-workspace-permissions)
- **Verified:** 2026-07-22
- **Product / plan / version:** Supported ChatGPT desktop, Codex CLI, and IDE clients; cloud-managed requirements require a supported signed-in workspace plan. Permission-profile guidance applies to Codex 0.138.0 or later.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Repository `AGENTS.md` and `.codex/config.toml` are simpler for team conventions but cannot enforce organization policy. System `requirements.toml` can enforce local policy without cloud assignment but requires device distribution and ownership.
- **Subscription / licensing impact:** Business adds essential admin controls; Enterprise/Edu document custom RBAC and stronger retention/residency controls. Exact eligibility and administrative surfaces remain plan-dependent.
- **Data / permission / security impact:** Workspace RBAC, local runtime policy, cloud eligibility, Platform API access, and connected-service authorization are separate trust boundaries. Requirements override incompatible local settings but omitted keys remain unconstrained.

### Documented limitations, security boundaries, and freshness

- Subscription inclusion does not mean identical limits or features: Free and Go target lighter use; Plus documents web/CLI/IDE/iOS and cloud integrations; Pro adds higher usage and preview access; Business/Enterprise/Edu add progressively stronger administration and data controls.
- Business, Enterprise, and Edu data is not used for model training by default, but third-party plugins and connected services retain their own terms, scopes, retention, and residency boundaries. Consumer-plan data handling must be checked separately before confidential work. [OpenAI business-data controls](https://openai.com/business-data/)
- Project `.codex/` configuration, hooks, and rules load only for trusted projects. Some host-owned authentication, provider, telemetry, and profile keys are deliberately ignored in project config. [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced#project-config-files-codexconfigtoml)
- Rules are explicitly experimental. Hooks are enabled and documented, but only command handlers run today, asynchronous handlers are skipped, hosted tools bypass local tool hooks, and specialized paths may opt out; hooks are a guardrail, not a complete security boundary.
- Public OpenAI pages conflict on web naming: the current plan article lists "Codex web" as a client and the Codex cloud guide documents hosted tasks, while the newer Work-versus-Codex article says the distinct Codex experience is not selectable on web or mobile. Treat browser-accessible Codex cloud tasks as distinct from the desktop Codex view and require an authenticated availability check before writing rollout instructions. [Plan article](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), [Work-versus-Codex article](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex), [Codex cloud](https://learn.chatgpt.com/docs/cloud)
- The July 13-17 weekly digest is the newest dated product digest verified for this snapshot. It records the July 9 merge of Codex into the ChatGPT desktop app and flags ongoing rollout-dependent features; Task 12 should recheck both the [weekly digest](https://learn.chatgpt.com/docs/whats-new) and versioned Codex changelog.

## Cursor profile

To be researched.

## Claude Code profile

To be researched.

## Cross-layer tooling matrix

To be researched.

## Model and open-source routing matrix

To be researched.

## Instructions, context, memory, skills, plugins, MCP, and hooks

Codex has separate native surfaces for durable repository guidance, runtime configuration, reusable workflows, connected tools, deterministic lifecycle scripts, and remembered context. They should not be collapsed into one mechanism.

#### `AGENTS.md` plus layered `config.toml`

- **Tier:** default
- **Recommendation:** Put durable repository conventions, commands, acceptance criteria, and review expectations in scoped `AGENTS.md`; put trusted runtime settings in user or project `config.toml`, respecting documented precedence.
- **Use when:** Guidance must be version-controlled and apply predictably to a repository or subtree, while runtime defaults need a supported configuration layer.
- **Do not use when:** The content is a one-off task instruction, a secret, or an organization-enforced security requirement; use the prompt, secret store, or managed requirements respectively.
- **Primary evidence:** [OpenAI `AGENTS.md` discovery and precedence](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Cross-check:** [Codex open-source model-visible `AGENTS.md` contract](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md)
- **Verified:** 2026-07-22
- **Product / plan / version:** Codex CLI, IDE extension, desktop Codex, and cloud tasks that read repository guidance; project config is trusted-project-only.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Prompts are better for temporary constraints. Skills are better for reusable task procedures. Managed `requirements.toml` is better for non-overridable policy. Large instruction files consume context and become stale.
- **Subscription / licensing impact:** Native Codex behavior with no additional license.
- **Data / permission / security impact:** Repository instructions and project config are untrusted project content. More specific `AGENTS.md` wins; CLI flags outrank ordinary config, but managed requirements can still constrain effective settings. Never store credentials in either file.

#### Focused skills for repeatable agent workflows

- **Tier:** default
- **Recommendation:** Encode a proven, single-purpose repeated workflow as a focused skill, keep instruction-only skills as the default, and version repository skills with the work they govern.
- **Use when:** The same input-to-output process recurs and can be tested with realistic prompts, templates, and explicit boundaries.
- **Do not use when:** A short `AGENTS.md` rule or one-off prompt is sufficient, or deterministic enforcement is required at a security boundary.
- **Primary evidence:** [OpenAI skill authoring and discovery](https://learn.chatgpt.com/docs/build-skills)
- **Cross-check:** [OpenAI skills and plugins decision guidance](https://learn.chatgpt.com/docs/skills-and-plugins)
- **Verified:** 2026-07-22
- **Product / plan / version:** Skills in ChatGPT desktop, Codex CLI, and IDE extension; repository, user, admin, system, and plugin-distributed scopes documented on 2026-07-22.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** `AGENTS.md` is cheaper for always-on repo rules. Plugins improve distribution and can bundle connectors. Scripts add determinism but expand the executable trust boundary.
- **Subscription / licensing impact:** Native authoring is subscription-included; third-party skill content can have its own license and maintenance burden.
- **Data / permission / security impact:** Codex uses progressive disclosure but the initial skill list still consumes context. Treat skill scripts and downloaded repositories as code, review dependencies, and use explicit invocation when automatic matching would be risky.

#### Plugins and MCP for connected tools and data

- **Tier:** specialist
- **Recommendation:** Prefer a reviewed plugin for distributable workspace workflows and a directly configured MCP server for a narrow local developer integration; start with read tools and explicit approval.
- **Use when:** The workflow needs live third-party context or actions that cannot be represented as repository files, and ownership, authentication, scopes, errors, and recovery are known.
- **Do not use when:** Static checked-in context is sufficient, the service cannot provide least-privilege credentials, or write actions lack idempotency and recovery.
- **Primary evidence:** [OpenAI Model Context Protocol support and configuration](https://learn.chatgpt.com/docs/extend/mcp)
- **Cross-check:** [OpenAI plugin permissions and data-sharing boundaries](https://learn.chatgpt.com/docs/plugins#how-permissions-and-data-sharing-work)
- **Verified:** 2026-07-22
- **Product / plan / version:** Local MCP in ChatGPT desktop, CLI, and IDE extension; remote MCP-backed tools through plugins in Work mode; plugin availability varies by surface and workspace policy.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Repository artifacts avoid live-service latency and authorization but can become stale. Direct APIs offer finer control but require custom integration and usually separate credentials or billing. Plugins simplify distribution but broaden the supply chain.
- **Subscription / licensing impact:** Native client support is included; specific plugins, MCP services, source systems, or API use may require separate plans, licenses, compute, or credentials.
- **Data / permission / security impact:** Local and web configurations are separate. Connector sign-in, source-system authorization, sandbox/approval policy, tool allowlists, OAuth token storage, and third-party terms all remain distinct. Review requested scopes and default tool approval modes before enabling writes.

#### Lifecycle hooks as a tested guardrail

- **Tier:** watchlist
- **Recommendation:** Pilot hooks for deterministic validation, logging, or policy feedback only after reviewing and pinning the exact hook definition; do not treat hooks as the sole enforcement boundary.
- **Use when:** A local or managed lifecycle event needs a reproducible command check and the team can test supported events, failure behavior, timeouts, and platform-specific commands.
- **Do not use when:** Complete interception of every hosted or specialized tool is required, or an unsupported async, prompt, or agent handler is necessary.
- **Primary evidence:** [OpenAI Codex hooks behavior and limitations](https://learn.chatgpt.com/docs/hooks)
- **Cross-check:** [Codex public configuration schema](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json)
- **Verified:** 2026-07-22
- **Product / plan / version:** Current local Codex hook engine; user, trusted-project, plugin, and managed hook sources. Only command handlers run today.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Sandbox and managed requirements provide harder boundaries. CI checks provide independent enforcement after changes. Skills provide workflow guidance but are not deterministic gates.
- **Subscription / licensing impact:** Native feature; hook scripts and their dependencies add internal maintenance and supply-chain cost.
- **Data / permission / security impact:** Non-managed hooks require hash-based trust; managed hooks are policy-trusted. Hooks receive task metadata and can see transcripts or tool arguments, so logs must redact secrets. Hosted tools and opt-out paths mean coverage is incomplete.

#### Explicit context continuity through compact, resume, fork, and handoff

- **Tier:** default
- **Recommendation:** Keep authoritative state in repository or work-system artifacts, use `/compact` for long transcripts, `/resume` or `/fork` for local session continuity, and desktop handoff only between matching trusted hosts.
- **Use when:** Work must continue without replaying raw logs, and the next session or host can revalidate the repository state and acceptance criteria.
- **Do not use when:** The transcript is the only copy of an accepted decision, the destination repository does not match, or a transfer to Codex cloud is required.
- **Primary evidence:** [OpenAI CLI session, compaction, resume, and fork commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- **Cross-check:** [OpenAI Remote chat handoff boundaries](https://learn.chatgpt.com/docs/remote-connections#hand-off-a-chat-between-hosts)
- **Verified:** 2026-07-22
- **Product / plan / version:** Codex CLI session controls and ChatGPT desktop Remote handoff between connected local/SSH hosts; handoff to Codex cloud is unsupported.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** A concise checked-in handoff is portable across agents and auditable but requires deliberate maintenance. Raw transcripts preserve detail but increase context pollution and confidentiality risk.
- **Subscription / licensing impact:** Native subscription behavior; Remote host operation can add infrastructure cost.
- **Data / permission / security impact:** Compaction is lossy summarization and must not replace source artifacts. Session transcripts and handoffs can contain sensitive context; destination permissions, Git state, and host trust must be revalidated.

#### Local memories as optional recall, not authority

- **Tier:** watchlist
- **Recommendation:** Keep local Codex memories off until a bounded pilot establishes value and review practices; if enabled, exclude externally sourced chats where appropriate and never use memory as the only repository or team instruction source.
- **Use when:** A user wants cross-chat recall of non-sensitive working preferences and can inspect generated memory state.
- **Do not use when:** The content is secret, regulated, team-authoritative, time-sensitive, or must transfer reliably across web and local Codex surfaces.
- **Primary evidence:** [OpenAI Codex and ChatGPT memories](https://learn.chatgpt.com/docs/customization/memories)
- **Cross-check:** [Codex public config schema memory and compaction keys](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json)
- **Verified:** 2026-07-22
- **Product / plan / version:** Local memories in desktop Codex, CLI, and connected IDE host are separate from ChatGPT web memory and are off by default on 2026-07-22.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** `AGENTS.md` and checked-in docs are deterministic and shareable. A user-maintained handoff note is explicit but manual. Memory reduces repetition but can lag, omit sessions, consume quota, or become stale.
- **Subscription / licensing impact:** Native capability where available; background extraction can consume subscription rate-limit capacity.
- **Data / permission / security impact:** Generated memories live under `CODEX_HOME`; secret redaction is documented but not a reason to store secrets. Review memory files before sharing and consider disabling memory generation for chats using MCP, web, or tool search.

## Single-agent and multi-agent pattern catalog

Codex supports one main thread, delegated subagent threads, independent app chats, worktrees, and hosted work. Parallelism is a situational optimization, not the baseline definition of autonomy.

#### Strong single-agent execution with explicit verification

- **Tier:** default
- **Recommendation:** Start with one Codex thread, a concrete goal, bounded permissions, and an explicit verification contract; add another agent only when work can be partitioned and recombined cleanly.
- **Use when:** The task shares one mutable state, requires sequential decisions, or is small enough that coordination would exceed useful parallel work.
- **Do not use when:** Multiple independent, read-heavy investigations or isolated test suites dominate the critical path and summaries can be validated independently.
- **Primary evidence:** [OpenAI long-running work and goal guidance](https://learn.chatgpt.com/docs/long-running-work)
- **Cross-check:** [OpenAI Codex best practices](https://learn.chatgpt.com/guides/best-practices)
- **Verified:** 2026-07-22
- **Product / plan / version:** ChatGPT desktop, web Work mode, Codex CLI, and IDE extension as documented on 2026-07-22.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Subagents can reduce elapsed time for independent work but consume more tokens and add synthesis cost. Separate chats improve isolation but require explicit handoff.
- **Subscription / licensing impact:** Subscription-only and usually the lowest usage path because it avoids duplicated agent model/tool work.
- **Data / permission / security impact:** One thread has a smaller coordination and permission surface. Long transcripts can still degrade context; compact and checkpoint to authoritative artifacts.

#### Bounded subagents for independent read-heavy work

- **Tier:** specialist
- **Recommendation:** Delegate independent exploration, test, triage, or summarization packets to bounded subagents and require the main thread to validate their evidence before acting.
- **Use when:** At least two tasks have independent inputs and outputs, can run under inherited permissions, and return concise evidence-backed summaries.
- **Do not use when:** Tasks require frequent shared decisions, edit the same files, depend on serial discoveries, or have too little work to amortize coordination and extra tokens.
- **Primary evidence:** [OpenAI Codex subagent workflows](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- **Cross-check:** [Codex public multi-agent feature definitions](https://github.com/openai/codex/blob/main/codex-rs/features/src/lib.rs)
- **Verified:** 2026-07-22
- **Product / plan / version:** Current local Codex releases expose subagents in desktop, CLI, and IDE; Work mode availability is eligibility-dependent, and proactive delegation requires supported Ultra access.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Multiple independent top-level chats offer stronger isolation but weaker orchestration. A single agent avoids synthesis overhead but may take longer on independent scans.
- **Subscription / licensing impact:** Included where eligible but consumes more tokens than comparable single-agent runs; Ultra and preview models are plan-dependent.
- **Data / permission / security impact:** Subagents inherit the current sandbox or permission mode unless a custom agent narrows it. Non-interactive actions that need a new approval fail. The main thread must treat returned summaries as untrusted until cross-checked.

#### Worktree-isolated parallel implementation

- **Tier:** specialist
- **Recommendation:** For parallel write work, assign one isolated Git worktree or cloud checkout per agent/chat and define branch ownership, merge order, tests, and recovery before dispatch.
- **Use when:** Work partitions by files or components, each checkout can run its own verification, and integration can be reviewed after all workers finish.
- **Do not use when:** Agents must edit the same files, one local service cannot run concurrently, ignored local dependencies are unavailable, or the repository is not Git-based.
- **Primary evidence:** [OpenAI Codex worktree behavior](https://learn.chatgpt.com/docs/environments/git-worktrees)
- **Cross-check:** [Git worktree documentation](https://git-scm.com/docs/git-worktree)
- **Verified:** 2026-07-22
- **Product / plan / version:** Worktree UI in ChatGPT desktop Codex for Git repositories; Git worktrees are the underlying open-source mechanism.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Cloud checkouts add remote isolation but require environment setup. Sequential work on one checkout is slower but avoids merge and environment duplication.
- **Subscription / licensing impact:** Git is open source; the Codex worktree surface is subscription-included where available. Multiple environments can increase compute and usage.
- **Data / permission / security impact:** Worktrees share Git metadata. Ignored files do not move automatically except configured local copies, so secrets and environment files need explicit review. Branch checkout constraints and cleanup are operational failure modes.

#### Parallel writers in one checkout

- **Tier:** rejected
- **Recommendation:** Do not use multiple Codex agents as concurrent writers in the same checkout for routine implementation.
- **Use when:** Not applicable as a default; only a controlled Gate 2 experiment with file-level isolation, deterministic locking, and recovery evidence could justify an exception.
- **Do not use when:** Normal feature, bug-fix, refactor, or infrastructure work shares files, build outputs, Git state, or a local server.
- **Primary evidence:** [OpenAI subagent caution for parallel write-heavy workflows](https://learn.chatgpt.com/docs/agent-configuration/subagents#why-subagent-workflows-help)
- **Cross-check:** [OpenAI worktrees for independent chats](https://learn.chatgpt.com/docs/environments/git-worktrees#why-use-a-worktree)
- **Verified:** 2026-07-22
- **Product / plan / version:** All Codex surfaces that can spawn or run parallel work against a local repository.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Use one strong agent, serialize dependent work, or isolate writers by worktree/cloud checkout. Isolation adds setup and merge cost but preserves reviewable state.
- **Subscription / licensing impact:** Rejecting shared-checkout writers avoids duplicated usage and rework; isolated alternatives stay within existing subscriptions.
- **Data / permission / security impact:** Concurrent shared writes can overwrite user or agent changes, corrupt intermediate state, invalidate tests, and obscure attribution and recovery.

## GitHub, Azure, Docker, and Atlassian integration analysis

To be researched.

## Jira-centered artifact and handoff options

To be researched.

## Workflow playbook 1: PO/PM planning to accepted backlog

To be researched.

## Workflow playbook 2: Workflow-checkpoint synchronization

To be researched.

## Workflow playbook 3: Jira ID to implementation

To be researched.

## Security, permission, audit, and recovery analysis

To be researched.

## Balanced scorecard and eval plan

To be researched.

## Prioritized roadmap

To be researched.

## Emerging watchlist

To be researched.

## Rejected or overrated options

To be researched.

## Research questions and coverage

| ID | Question | Owner task | Status | Blueprint section |
| --- | --- | --- | --- | --- |
| W1.1 | How do Codex, Cursor, and Claude Code support CLI, IDE, app, web, background, and remote execution? | Tasks 2-4 | in research | Codex profile; Cursor profile; Claude Code profile |
| W1.2 | How do Codex, Cursor, and Claude Code support instructions and configuration? | Tasks 2-4 | in research | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.3 | How do Codex, Cursor, and Claude Code provide permissions and sandboxing? | Tasks 2-4 | in research | Security, permission, audit, and recovery analysis |
| W1.4 | How do Codex, Cursor, and Claude Code support skills, plugins, MCP, and hooks? | Tasks 2-4 | in research | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.5 | How do Codex, Cursor, and Claude Code handle context, memory, compaction, and handoff? | Tasks 2-4 | in research | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.6 | How do Codex, Cursor, and Claude Code support single-agent, subagent, and multi-agent behavior? | Tasks 2-4, 6 | in research | Single-agent and multi-agent pattern catalog |
| W1.7 | How do Codex, Cursor, and Claude Code provide team and managed-policy options? | Tasks 2-4 | in research | Cross-layer tooling matrix |
| W1.C1 | Which ChatGPT plans include Codex, and which subscription, credit, or API boundaries change availability? | Task 2 | verified | Codex profile |
| W1.C2 | Which Codex CLI, IDE, desktop, cloud, background, Scheduled, Remote, and platform surfaces are documented? | Task 2 | verified | Codex profile |
| W1.C3 | What is the Codex instruction and configuration precedence, including trusted-project behavior? | Task 2 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.C4 | Where are the Codex sandbox, approval, network, unattended-run, and external-write permission boundaries? | Task 2 | verified | Codex profile |
| W1.C5 | How do Codex skills, plugins, MCP servers, rules, and hooks differ in scope, maturity, and trust? | Task 2 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.C6 | How do Codex sessions, compaction, memories, worktrees, resume/fork, and host handoff preserve or lose context? | Task 2 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.C7 | When do Codex single-agent, subagent, independent-chat, and worktree patterns help or add overhead? | Task 2 | verified | Single-agent and multi-agent pattern catalog |
| W1.C8 | Which Codex workspace RBAC and managed local-runtime controls exist, and how do their boundaries differ? | Task 2 | verified | Codex profile |
| W1.C9 | What Codex data-training, connector, credential, retention, and external-service boundaries are public? | Task 2 | verified | Codex profile; Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.C10 | How fresh are the Codex docs and changelog, and which limitations or rollout conditions are documented? | Task 2 | verified | Codex profile |
| W1.C11 | Is the distinct Codex experience selectable on the web, or is only the cloud task portal browser-accessible? | Task 2 | evidence gap | Codex profile |
| W2.1 | Which models are included in existing subscriptions? | Task 5 | not researched | Model and open-source routing matrix |
| W2.2 | What task-specific routing is appropriate? | Task 5 | not researched | Model and open-source routing matrix |
| W2.3 | What are the quality, latency, context, and cost tradeoffs? | Task 5 | not researched | Model and open-source routing matrix |
| W2.4 | Which open-source specialist models are viable candidates? | Task 5 | not researched | Model and open-source routing matrix |
| W2.5 | What is feasible for hosted, internal-server, cloud-GPU, and laptop deployment? | Task 5 | not researched | Model and open-source routing matrix |
| W3.1 | How should repository and project instructions be managed? | Task 6 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W3.2 | How should Jira and Confluence retrieval be handled? | Task 8 | not researched | Jira-centered artifact and handoff options |
| W3.3 | How do agents retain session memory and compaction context? | Task 6 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W3.4 | How should cross-session and cross-agent handoff work? | Tasks 6, 8 | not researched | Jira-centered artifact and handoff options |
| W3.5 | Which common artifacts and native adapters are appropriate? | Tasks 6, 8 | not researched | Jira-centered artifact and handoff options |
| W3.6 | How can context pollution, duplication, and staleness be controlled? | Task 6 | not researched | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W4.1 | How should GitHub and GitHub Actions integrate? | Task 7 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.2 | How should Azure and Azure DevOps integrate? | Task 7 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.3 | How should Docker integrate? | Task 7 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.4 | How should Jira Cloud Premium and Confluence Cloud integrate? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.5 | What Jira Service Management integration options exist? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.6 | What Rovo integration options exist? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.7 | How do Atlassian Automation, REST APIs, Forge, and MCP compare? | Task 8 | not researched | GitHub, Azure, Docker, and Atlassian integration analysis |
| W4.8 | What are the authentication, permissions, audit, idempotency, latency, error-handling, and recovery implications? | Tasks 7, 8 | not researched | Security, permission, audit, and recovery analysis |
| W5.1 | When is strong single-agent execution preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.2 | When is a planner–implementer–reviewer pattern preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.3 | When is an orchestrator–worker pattern preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.4 | When is parallel research and implementation preferable? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.5 | How should repository and worktree isolation be applied? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.6 | What coordination cost and context overhead do multi-agent patterns introduce? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W5.7 | How should failure propagation and recovery work? | Task 6 | not researched | Security, permission, audit, and recovery analysis |
| W5.8 | Under what conditions is multi-agent work worse than a single agent? | Task 6 | not researched | Single-agent and multi-agent pattern catalog |
| W6.1 | What is the normal path for each priority workflow? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.2 | How does each workflow handle invalid input and missing context? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.3 | How does each workflow handle permission failure? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.4 | How does each workflow handle partial synchronization failure? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.5 | What retry and idempotency behavior does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.6 | What rollback or recovery does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.7 | What human approval points does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W6.8 | What auditable evidence does each workflow require? | Task 9 | not researched | Workflow playbook 1: PO/PM planning to accepted backlog; Workflow playbook 2: Workflow-checkpoint synchronization; Workflow playbook 3: Jira ID to implementation |
| W7.1 | What role-based responsibilities are needed? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.2 | How should phase-boundary approval work? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.3 | How should configuration ownership and drift be managed? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.4 | What observability and audit are needed? | Task 10 | not researched | Security, permission, audit, and recovery analysis |
| W7.5 | How should the balanced scorecard be defined? | Task 10 | not researched | Balanced scorecard and eval plan |
| W7.6 | What update cadence and changelog triggers are needed? | Task 10 | not researched | Gate 1 audit and handoff |
| W7.7 | What deprecation and replacement policy is needed? | Task 10 | not researched | Prioritized roadmap |
| G1.1 | Do all three agents appear in every relevant layer? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.2 | Does every strategic recommendation have a direct primary source? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.3 | Do strategic defaults have a cross-check or reproducible evidence? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.4 | Does every candidate include when to use and when not to use it? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.5 | Are stable and experimental options visibly separated? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.6 | Does a functional subscription-only path exist? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.7 | Are open-source candidates evaluated as real options? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.8 | Are all three priority workflows fully mapped? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.9 | Are the Jira source-of-truth and Jira-ID handoff options comparable? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.10 | Is the phase-boundary approval model mapped to PO/PM and DEV behavior? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.11 | Is the design usable by a 1–5 person PO/PM/DEV/QA/BA team? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.12 | Does the scorecard include baseline and exit-gate methods? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.13 | Are uncertainties, evidence gaps, and required pilots explicit? | Task 12 | not researched | Gate 1 audit and handoff |
| G1.14 | Do citation, contradiction, freshness, scope, and security reviews pass? | Task 12 | not researched | Gate 1 audit and handoff |

## Source register and freshness notes

| ID | Source owner | Direct URL | Source type | Product / plan / version | Verified | Used in sections | Notes or contradiction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SRC-001 | OpenAI | https://learn.chatgpt.com/docs/pricing | Official pricing documentation | Codex and Work; Free, Go, Plus, Pro, Business, Edu, Enterprise | 2026-07-22 | Codex profile | Plan inclusion and usage structure are current but dynamic. |
| SRC-002 | OpenAI | https://learn.chatgpt.com/docs/quickstart | Official product documentation | ChatGPT desktop/web and Codex CLI/IDE; current | 2026-07-22 | Codex profile | Confirms surface purposes and that API-key use can omit features. |
| SRC-003 | OpenAI | https://learn.chatgpt.com/docs/environments/modes | Official product documentation | ChatGPT desktop Codex; current | 2026-07-22 | Codex profile | Local and Worktree run on-device; Cloud is remote. |
| SRC-004 | OpenAI | https://learn.chatgpt.com/docs/environments/cloud-environment | Official product documentation | Codex cloud environments; current | 2026-07-22 | Codex profile | Agent internet is off by default after setup. |
| SRC-005 | OpenAI | https://learn.chatgpt.com/docs/automations | Official product documentation | Scheduled on web/desktop; workspace-dependent | 2026-07-22 | Codex profile | CLI and IDE cannot manage Scheduled; unattended approval behavior is constrained. |
| SRC-006 | OpenAI | https://learn.chatgpt.com/docs/remote-connections | Official product documentation | Remote and SSH on current desktop/mobile clients | 2026-07-22 | Codex profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Availability varies by rollout; cloud handoff unsupported. |
| SRC-007 | OpenAI | https://learn.chatgpt.com/docs/environments/git-worktrees | Official product documentation | ChatGPT desktop Codex, Git repositories | 2026-07-22 | Codex profile; Instructions, context, memory, skills, plugins, MCP, and hooks; Single-agent and multi-agent pattern catalog | Worktrees are desktop-Codex-only; ignored-file and branch limits documented. |
| SRC-008 | OpenAI | https://learn.chatgpt.com/docs/sandboxing | Official security documentation | Local desktop, CLI, IDE; current | 2026-07-22 | Codex profile | Distinguishes sandbox from approval and documents common modes. |
| SRC-009 | OpenAI | https://learn.chatgpt.com/docs/agent-approvals-security | Official security documentation | Local Codex clients; current | 2026-07-22 | Codex profile | Confirms recommended version-controlled workspace preset and protected paths. |
| SRC-010 | OpenAI | https://learn.chatgpt.com/docs/enterprise/managed-configuration | Official administration documentation | Supported local clients; Codex 0.138.0+ permission-profile guidance | 2026-07-22 | Codex profile | Requirements and managed defaults have different force/precedence semantics. |
| SRC-011 | OpenAI | https://learn.chatgpt.com/docs/enterprise/roles-and-workspace-permissions | Official administration documentation | Business/Enterprise/Edu workspace and runtime boundaries | 2026-07-22 | Codex profile | Workspace, local, cloud, API, plugin, and source-system access are separate. |
| SRC-012 | OpenAI | https://openai.com/business-data/ | Official privacy and security documentation | Business, Enterprise, Edu, qualifying enterprise controls | 2026-07-22 | Codex profile | No training on organization data by default; retention/residency eligibility varies. |
| SRC-013 | OpenAI | https://learn.chatgpt.com/docs/config-file/config-advanced | Official configuration documentation | Local Codex clients; current | 2026-07-22 | Codex profile | Project config is trust-gated and cannot override listed host-owned keys. |
| SRC-014 | OpenAI | https://learn.chatgpt.com/docs/whats-new | Official weekly product digest | ChatGPT and Codex through 2026-07-17 | 2026-07-22 | Codex profile | Latest dated digest verified; app and rollout surfaces are evolving. |
| SRC-015 | OpenAI | https://learn.chatgpt.com/docs/agent-configuration/agents-md | Official product documentation | Codex instruction discovery; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Confirms global-to-local discovery and closer-file precedence. |
| SRC-016 | OpenAI | https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md | Public first-party source | Open-source Codex CLI main branch | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Implementation cross-check for model-visible `AGENTS.md` scope; main is moving. |
| SRC-017 | OpenAI | https://learn.chatgpt.com/docs/build-skills | Official product documentation | Skills in desktop, CLI, IDE; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Progressive disclosure, discovery scopes, and context-budget limits documented. |
| SRC-018 | OpenAI | https://learn.chatgpt.com/docs/skills-and-plugins | Official product documentation | ChatGPT/Codex skills and plugins; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Owns skill-versus-plugin selection boundary. |
| SRC-019 | OpenAI | https://learn.chatgpt.com/docs/extend/mcp | Official integration documentation | Local MCP and plugin-backed remote MCP; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Web does not read local Codex config; auth and tool policy remain separate. |
| SRC-020 | OpenAI | https://learn.chatgpt.com/docs/plugins | Official product and security documentation | Supported ChatGPT/Codex plugin surfaces | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Connector authentication, provider access, and external terms remain separate. |
| SRC-021 | OpenAI | https://learn.chatgpt.com/docs/hooks | Official product documentation | Local Codex lifecycle hooks; current | 2026-07-22 | Codex profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Only command handlers run; hosted/specialized tool coverage is incomplete. |
| SRC-022 | OpenAI | https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json | Public first-party schema | Open-source Codex CLI main branch | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Cross-checks hooks, MCP, memories, history, and auto-compaction keys; main is moving. |
| SRC-023 | OpenAI | https://learn.chatgpt.com/docs/developer-commands?surface=cli | Official command reference | Codex CLI and IDE command surfaces; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Confirms compact, resume, fork, side-chat, goal, memory, MCP, and hook controls. |
| SRC-024 | OpenAI | https://learn.chatgpt.com/docs/customization/memories | Official product documentation | Local Codex memory and ChatGPT memory; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Local memories are separate, asynchronous, generated state, and off by default. |
| SRC-025 | OpenAI | https://learn.chatgpt.com/docs/long-running-work | Official workflow documentation | Web Work, desktop, CLI, IDE; current | 2026-07-22 | Single-agent and multi-agent pattern catalog | Goals retain permission boundaries and favor separate chats for independent tasks. |
| SRC-026 | OpenAI | https://learn.chatgpt.com/guides/best-practices | Official workflow guidance | Codex CLI, IDE, desktop; current | 2026-07-22 | Single-agent and multi-agent pattern catalog | Cross-check for goal, context, durable guidance, testing, and review. |
| SRC-027 | OpenAI | https://learn.chatgpt.com/docs/agent-configuration/subagents | Official product documentation | Current local Codex; eligible Work mode and Ultra behavior | 2026-07-22 | Single-agent and multi-agent pattern catalog | Extra-token and parallel-write coordination costs are explicit. |
| SRC-028 | OpenAI | https://github.com/openai/codex/blob/main/codex-rs/features/src/lib.rs | Public first-party source | Open-source Codex CLI main branch | 2026-07-22 | Single-agent and multi-agent pattern catalog | Cross-checks active/evolving multi-agent feature definitions; main is moving. |
| SRC-029 | Git project | https://git-scm.com/docs/git-worktree | Open specification/tool documentation | Git worktrees | 2026-07-22 | Single-agent and multi-agent pattern catalog | Independent mechanism cross-check for shared-repository worktree behavior. |
| SRC-030 | OpenAI | https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan | Official Help Center | Codex across ChatGPT plans; updated 2026-07-18 | 2026-07-22 | Codex profile | Lists Codex web; conflicts with SRC-031's distinct-view wording. |
| SRC-031 | OpenAI | https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex | Official Help Center | Work and desktop Codex; updated 2026-07-21 | 2026-07-22 | Codex profile | Says distinct Codex view is not selectable on web/mobile; evidence gap remains. |
| SRC-032 | OpenAI | https://learn.chatgpt.com/docs/cloud | Official product documentation | Codex cloud task portal; current | 2026-07-22 | Codex profile | Confirms hosted cloud tasks but does not resolve distinct-view naming conflict. |

## Gate 1 audit and handoff

Gate 1 remains read-only. The Gate 1 audit will record citation, contradiction, freshness, scope, and security review outcomes; unresolved evidence gaps; and required pilots before handoff for user review.

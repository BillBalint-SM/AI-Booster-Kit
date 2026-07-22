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
- **Primary evidence:** [OpenAI worktree isolation and handoff](https://learn.chatgpt.com/docs/environments/git-worktrees), [OpenAI cloud background and parallel execution](https://learn.chatgpt.com/docs/cloud), [OpenAI-managed cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment), and [OpenAI Remote/SSH host execution](https://learn.chatgpt.com/docs/remote-connections)
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
- Business, Enterprise, and Edu inputs and outputs are not used to improve OpenAI models by default. For Plus and Pro, Codex conversations may be used to improve models unless the user turns off training in ChatGPT data controls; the public Codex plan article does not state the corresponding Free/Go training default. Third-party plugins and connected services retain their own terms, scopes, retention, and residency boundaries. [OpenAI business-data controls](https://openai.com/business-data/), [OpenAI Codex plan data controls](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- Project `.codex/` configuration, hooks, and rules load only for trusted projects. Some host-owned authentication, provider, telemetry, and profile keys are deliberately ignored in project config. [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced#project-config-files-codexconfigtoml)
- [Rules](https://learn.chatgpt.com/docs/agent-configuration/rules) are explicitly experimental and may change. Hooks are enabled and documented, but only command handlers run today, asynchronous handlers are skipped, hosted tools bypass local tool hooks, and specialized paths may opt out; hooks are a guardrail, not a complete security boundary.
- Public OpenAI pages conflict on web naming: the current plan article lists "Codex web" as a client and the Codex cloud guide documents hosted tasks, while the newer Work-versus-Codex article says the distinct Codex experience is not selectable on web or mobile. Treat browser-accessible Codex cloud tasks as distinct from the desktop Codex view and require an authenticated availability check before writing rollout instructions. [Plan article](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), [Work-versus-Codex article](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex), [Codex cloud](https://learn.chatgpt.com/docs/cloud)
- The July 13-17 [weekly digest](https://learn.chatgpt.com/docs/whats-new) is the newest dated product digest verified for this snapshot. The versioned [Codex changelog](https://learn.chatgpt.com/docs/changelog) has a 2026-07-13 iOS 1.2026.188 entry and a 2026-07-09 desktop 26.707 entry for the Codex merge into ChatGPT desktop; Task 12 should recheck both sources because rollout and client releases continue independently.

## Cursor profile

This profile is a 2026-07-22 public-documentation snapshot. Cursor's latest visible changelog entry was dated July 17, 2026, and its Data Use & Privacy Overview was updated July 15, 2026. The CLI, cloud-agent, mobile, permission, customization, and team-marketplace surfaces changed repeatedly during the preceding six months, so any rollout must recheck current documentation and the team's authenticated entitlements.

### Surface, plan, and execution map

| Surface | Execution and availability | Plan / platform context | Material limitation |
| --- | --- | --- | --- |
| Cursor editor and Agents Window | Local Agent can search, edit, run commands, review diffs, preserve separate chat histories, and use planning or read-focused modes. The Agents Window also coordinates local, cloud, and remote-machine sessions. | The pricing page lists limited Agent requests and Tab for Hobby and additional Agent capabilities on paid plans, but it is not a durable surface-by-surface entitlement contract. | Tool, model, and account entitlement availability is dynamic. Local commands inherit the host's files, credentials, extensions, execution controls, and sandbox settings. |
| Cursor CLI | Interactive and headless Agent for terminal or CI-style use, with rules, MCP, hooks, session resume, model selection, and local-to-cloud handoff. | The CLI [requires authentication](https://cursor.com/docs/cli/reference/authentication.md) through browser-based Cursor-account login or an API key, but the current public CLI and pricing pages do not establish plan-by-plan CLI eligibility or prove that Hobby includes it. | `--print` retains write and shell tools; `--force` allows commands unless explicitly denied; `--trust` skips the workspace-trust prompt. Pin the installed version and require explicit deny policy before unattended use. |
| Cloud / background agents | Remote agents run asynchronously in isolated VMs and branches, can install dependencies, use the network, test changes, create review artifacts, and hand sessions between local and cloud. | Cloud agents are listed on paid Individual plans and above; Teams adds shared context and automations. Cursor-hosted and self-hosted cloud-agent options have separate infrastructure and administration requirements. | Hosted agents require repository access and auto-run terminal commands. Runtime workspaces, snapshots, transcripts/artifacts, and secrets each have different retention; internet access and Git write scopes create prompt-injection and exfiltration risk. |
| Web, mobile, and connected launch surfaces | Cloud agents can be started or managed through web and supported integrations; the iOS app can launch cloud agents and remotely steer a local session. | The iOS app was public beta on paid plans in the June 29, 2026 changelog; Teams and Enterprise admins must enable Remote Control. | Mobile/remote control does not make local execution hosted: the computer must remain reachable. Integration-specific repository, channel, and source-system permissions remain separate. |
| Team and Enterprise administration | Teams provides centralized billing, team-wide Privacy Mode, usage analytics, SAML/OIDC SSO, marketplaces, and shared cloud-agent context. Enterprise adds repository/model/MCP access controls, auto-run/browser/network controls, audit logs, service accounts, SCIM, and custom commercial terms. | Teams Standard is publicly priced; Premium-seat and Enterprise terms are plan- and contract-dependent. | The pricing page is a capability summary, not a complete policy or retention contract. Admin controls do not grant repository, MCP, cloud, or source-system authorization by themselves. |

Sources: [Cursor pricing and plan boundaries](https://cursor.com/pricing), [current Agent overview](https://cursor.com/docs/agent/overview.md), [current Cursor CLI overview](https://cursor.com/docs/cli/overview.md), [CLI/cloud handoff changelog](https://cursor.com/changelog/cli-jan-16-2026), [current Cloud Agents documentation](https://cursor.com/docs/cloud-agent.md), and [latest Cursor changelog](https://cursor.com/changelog).

#### Authenticated local editor and CLI after entitlement verification

- **Tier:** default
- **Recommendation:** Use authenticated Cursor editor or interactive CLI access only after verifying the active account's surface and model entitlements, choosing a read-focused or planning mode before Agent for ambiguous tasks and keeping headless CLI automation as a separately reviewed path.
- **Use when:** A developer needs repository-aware planning, implementation, review, or terminal work on a trusted laptop and can verify the active plan, model, permission mode, and installed client version.
- **Do not use when:** The task needs an undocumented model entitlement, unattended writes without a tested permission policy, or a guaranteed cloud/mobile feature on Hobby; verify the exact plan and surface first.
- **Primary evidence:** [Cursor pricing and included product capabilities](https://cursor.com/pricing)
- **Cross-check:** [Cursor Agent overview](https://cursor.com/docs/agent/overview.md), [Cursor CLI overview](https://cursor.com/docs/cli/overview.md), [CLI authentication](https://cursor.com/docs/cli/reference/authentication.md), and [CLI parameters](https://cursor.com/docs/cli/reference/parameters.md)
- **Verified:** 2026-07-22
- **Product / plan / version:** Cursor Hobby, paid Individual, Teams, and Enterprise pricing plus current editor and authenticated CLI documentation visible on 2026-07-22; public plan-by-plan CLI eligibility remains unverified.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** A local read-only question or repository search has a smaller mutation surface. Cloud agents keep working without the laptop but add repository, environment, network, retention, and usage boundaries. API-key use still routes through Cursor's backend and is not a privacy or subscription bypass.
- **Subscription / licensing impact:** The pricing page lists limited Agent requests for Hobby and expanded capabilities, usage pools, and on-demand overage on paid plans. It does not establish current CLI eligibility for each plan, so authenticated availability must be checked in the target account before rollout. Teams and Enterprise add administrative features rather than proving better task quality.
- **Data / permission / security impact:** Local Agent can read, edit, and execute through the host. The selected run mode, sandbox, permission configuration, extensions, MCP servers, repository trust, and host credentials are separate controls; require human review before external or production writes.

#### Auto-review plus sandboxed local execution

- **Tier:** default
- **Recommendation:** Pilot Auto-review with shell sandboxing as the routine local editor baseline, use editor Allowlist only for a small deterministic set, configure CLI permission tokens independently, and never make unsandboxed Run Everything or headless force mode the routine default.
- **Use when:** The repository is trusted, required commands and file paths can be bounded, and the developer can review escalation requests and final diffs.
- **Do not use when:** The repository, extensions, hooks, MCP servers, or shell setup are untrusted, or the task requires broad host, network, secret, or production access.
- **Primary evidence:** [Cursor Run Modes and sandbox behavior](https://cursor.com/docs/agent/security/run-modes.md)
- **Cross-check:** [Cursor CLI permission tokens and precedence](https://cursor.com/docs/cli/reference/permissions.md), [CLI parameters](https://cursor.com/docs/cli/reference/parameters.md), and [Cursor 2.5 sandbox access controls](https://cursor.com/changelog/2-5)
- **Verified:** 2026-07-22
- **Product / plan / version:** Current Cursor editor Run Modes and sandboxing plus current Cursor CLI permissions as documented on 2026-07-22.
- **Confidence:** medium
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Ask/read-focused work reduces write risk but cannot complete implementation. Editor Allowlist is deterministic for the actions it matches but requires maintenance. Auto-review is a fallible classifier that reduces approval fatigue and is explicitly not a security boundary. The shell sandbox contains supported commands but is not an approval policy; CLI permission tokens are a separate command/file/network/MCP policy. Unsandboxed execution is more compatible and materially less contained.
- **Subscription / licensing impact:** No separate add-on is documented; availability remains account-, plan-, and version-dependent. Enterprise is required for organization-enforced repository, model, MCP, browser, auto-run, and network controls listed on the pricing page.
- **Data / permission / security impact:** Keep four controls distinct: editor Auto-review classifies non-allowlisted, non-sandboxed calls; editor Allowlist deterministically permits matched actions; the shell sandbox constrains supported command file/network access; and CLI permission tokens separately allow or deny Shell, Read, Write, WebFetch, and MCP operations, with deny taking precedence. Headless `--print` has write and shell tools, `--force` permits commands unless explicitly denied, and `--trust` skips workspace confirmation. Require explicit CLI denies, a pre-verified workspace, and an independently tested sandbox before unattended writes; protect secrets with access controls rather than prompts or ignore files.

#### Isolated cloud agents for long-running or parallel work

- **Tier:** specialist
- **Recommendation:** Use a cloud agent only for an independently testable task with its own VM and branch, a versioned environment definition, bounded repository and network access, and explicit review evidence before merge or external synchronization.
- **Use when:** The task can run unattended, benefits from laptop-independent execution or parallel isolation, and has known setup, secrets, test, budget, completion, and recovery requirements.
- **Do not use when:** Interactive approval is required, the task must share a mutable checkout, the repository or environment cannot be granted safely, or prompt-injection and egress controls are undefined.
- **Primary evidence:** [Current Cursor Cloud Agents documentation](https://cursor.com/docs/cloud-agent.md)
- **Cross-check:** [Cursor Cloud Agent security and retention matrix](https://cursor.com/docs/cloud-agent/security.md), [Secrets & Network controls](https://cursor.com/docs/cloud-agent/security-network.md), and [Cursor pricing](https://cursor.com/pricing)
- **Verified:** 2026-07-22
- **Product / plan / version:** Paid Individual, Teams, and Enterprise Cloud Agents; current cloud-agent, security, and network documentation plus the Cursor 3.7 handoff/environment surface.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** A foreground local agent is easier to observe and approve. Local subagents avoid Cloud Agent VM snapshots and indefinite Cloud Agent transcripts but share host resources; Cursor backend processing, Privacy Mode qualifications, indexing/caching choices, and the risk classifier still apply. [Self-hosted Cloud Agents](https://cursor.com/changelog/03-25-26) keep worker execution infrastructure inside the organization but add identity, network, patching, and capacity ownership; public evidence does not say the entire control plane is self-hosted.
- **Subscription / licensing impact:** Paid plans include cloud-agent access, but model usage is metered and overage may apply. Hosted VM compute pricing can change; self-hosted workers add infrastructure cost.
- **Data / permission / security impact:** Hosted agents clone authorized repositories, use isolated VMs, run with internet access by default, and auto-run commands. Runtime workspaces recycle after idle; encrypted snapshots retain cloned code for a rolling 90 days of inactivity and cannot be deleted on demand; transcripts/artifacts are indefinite by default; and secrets remain until removed. Dashboard Archive is reversible, hides an agent, and leaves it readable, while the irreversible [Delete Agent API](https://cursor.com/docs/cloud-agent/api/endpoints.md#delete-an-agent-permanently) permanently removes its transcript and artifacts. Constrain Git-provider scope, egress, secret type, retention, branch protection, and merge authority.

#### Privacy Mode as a required data control, not a zero-risk label

- **Tier:** default
- **Recommendation:** Enable Privacy Mode for internal or confidential work, enforce it at team level where available, and separately review indexing, cloud-agent retention, risk-classifier exceptions, non-ZDR models, connected tools, and source-system permissions.
- **Use when:** Code or prompts may contain internal information and the organization can accept Cursor's documented processing path and provider/subprocessor boundaries.
- **Do not use when:** Policy requires that no code leave the device or organization, exact zero-day deletion of all metadata and safety records, or an unqualified guarantee that no provider can retain abuse-triggering content.
- **Primary evidence:** [Cursor Data Use & Privacy Overview](https://cursor.com/data-use)
- **Cross-check:** [Cursor Security](https://cursor.com/security) and [plan-level Privacy Mode controls](https://cursor.com/pricing)
- **Verified:** 2026-07-22
- **Product / plan / version:** Privacy Mode on Cursor plans as documented July 15-22, 2026; Teams can enforce it, and Enterprise adds further access and audit controls.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Local tools without hosted inference keep more data on-device but may offer lower capability. Disabling indexing reduces stored embeddings and metadata but weakens semantic retrieval. Self-hosted cloud agents narrow execution-data location but do not eliminate Cursor inference and account boundaries.
- **Subscription / licensing impact:** Privacy Mode is documented beyond Enterprise; Teams adds team-wide enforcement and Enterprise adds stronger administrative controls. Separate model, plugin, MCP, or source-system terms may still apply.
- **Data / permission / security impact:** With Privacy Mode, Customer Data is not used for Cursor training and Cursor documents ZDR agreements with model providers, subject to risk-classifier and approved non-ZDR-model qualifications. Indexing can retain embeddings, hashes, and file-name metadata. Cloud Agents have an explicit four-part retention matrix, including indefinite transcripts by default and rolling 90-day snapshots; Enterprise 90-day conversation caps are early access. Ignore files are context controls, not access-control boundaries.

#### Team controls matched to the boundary they govern

- **Tier:** specialist
- **Recommendation:** Use Teams for shared administration, SSO, usage visibility, marketplace distribution, and enforced Privacy Mode; require Enterprise only when repository/model/MCP restrictions, service accounts, audit logs, SCIM, or organization-enforced execution and network policy are needed.
- **Use when:** A 1-5 person team has an identified administrator, reviewed shared assets, and a real need for centralized policy or auditability.
- **Do not use when:** The team expects a plan upgrade to grant repository access, configure third-party authorization, validate marketplace content, or replace branch protection and CI.
- **Primary evidence:** [Cursor pricing and team/Enterprise capability boundaries](https://cursor.com/pricing)
- **Cross-check:** [Cursor team dashboard controls](https://cursor.com/docs/account/teams/dashboard.md) and [team MCP distribution changelog](https://cursor.com/changelog)
- **Verified:** 2026-07-22
- **Product / plan / version:** Cursor Teams Standard/Premium and Enterprise capability summary current on 2026-07-22; dashboard controls and team marketplaces are version-sensitive.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Version-controlled repository rules are simpler and portable but cannot enforce organization policy. Device management can distribute local configuration but adds endpoint operations. Enterprise controls improve central governance at custom cost and implementation overhead.
- **Subscription / licensing impact:** Teams is per active user with Standard/Premium seat options; Enterprise is custom-priced. Pooled usage, invoice billing, SCIM, advanced access controls, audit logs, and service accounts are Enterprise boundaries on the public pricing page.
- **Data / permission / security impact:** Team membership and SSO do not equal repository, MCP, cloud-worker, or external-service authorization. Admin-distributed rules, skills, plugins, hooks, and MCP servers are executable or data-bearing supply-chain inputs that require ownership, review, versioning, least privilege, and removal procedures.

### Documented limitations, contradictions, and freshness

- Cursor's current raw Rules documentation resolves the stale indexed-page conflict: Team Rules exist on Teams and Enterprise, enforced Team Rules can be mandatory, and the published order is Team Rules, then Project Rules, then User Rules, with earlier sources taking precedence on conflict. `AGENTS.md` has documented parent-to-nested precedence, but the page does not specify where `AGENTS.md` sits relative to those three sources. Preserve that narrower precedence gap for Task 11. [Current Rules documentation](https://cursor.com/docs/rules.md), [official raw-doc index](https://cursor.com/llms.txt)
- Current material uses Auto-review, Allowlist, and Run Everything under Approvals & Execution; older cached pages used Ask-Every-Time, auto-run, or beta-era terminology. Do not translate those names into one false common mode. Current docs recommend Auto-review for most users while explicitly stating that it is not a security boundary. [Current Run Modes](https://cursor.com/docs/agent/security/run-modes.md), [Cursor 3.6 changelog](https://cursor.com/changelog/auto-review), [current CLI permissions](https://cursor.com/docs/cli/reference/permissions.md)
- The current Data Use page qualifies Privacy Mode ZDR with abuse/risk-classifier retention and non-ZDR-model opt-in. Current Cloud Agent security docs separately define runtime, snapshot, transcript/artifact, and secret retention, but do not define one portable memory, compaction, or handoff contract across editor, CLI, and cloud; keep accepted state in repository or work-system artifacts. [Data Use](https://cursor.com/data-use), [Cloud Agent security](https://cursor.com/docs/cloud-agent/security.md)
- The current Rules documentation does not mention `.cursorrules` or establish its deprecation status. Follow its current guidance by using project `.cursor/rules` or supported root/nested `AGENTS.md`; because it does not place `AGENTS.md` in the Team/Project/User precedence chain, conflicting mixed formats require a pilot. [Current Rules documentation](https://cursor.com/docs/rules.md)
- Current Help material maps “background agents” to Cursor Cloud Agents, and the Cloud Agent security reference supplies the current contract: rolling 90-day VM snapshots that cannot be deleted on demand, indefinite conversation state by default, secrets retained until removed, reversible dashboard Archive, and irreversible on-demand transcript/artifact removal through the Delete Agent API. Do not use old Background Agent terminology as a separate product or retention policy. [Background Agent terminology](https://cursor.com/help/ai-features/background-agents.md), [current Cloud Agent security](https://cursor.com/docs/cloud-agent/security.md), [Cloud Agent API endpoints](https://cursor.com/docs/cloud-agent/api/endpoints.md)
- Cursor's current models-and-pricing reference publishes a large dynamic model catalog, per-token pricing, three Auto modes, plan pools, and residency qualifications. This verifies current availability but does not prove a durable task-routing default; Task 5 must recheck the catalog rather than copy model names into a long-lived recommendation. [Models and pricing](https://cursor.com/docs/models-and-pricing.md)
- The public [download page](https://cursor.com/download) labels desktop 3.12 latest while the newest numbered release visible in the changelog is 3.11; the changelog also contains newer July 17 product entries. Treat client version and product-post dates as separate freshness signals. Current CLI installation now documents native Windows PowerShell in addition to macOS, Linux, and WSL, superseding older WSL-only summaries. [CLI installation](https://cursor.com/docs/cli/installation.md)
- The newest dated entry visible in the public [Cursor changelog](https://cursor.com/changelog) was July 17, 2026. Task 12 should recheck the latest entry and current canonical docs because redirects and client terminology moved during this research pass.

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
- **Recommendation:** Put durable repository conventions, commands, acceptance criteria, and review expectations in scoped `AGENTS.md`; put trusted runtime settings in the appropriate `config.toml` layer. On a client without managed layers, Codex resolves ordinary configuration from highest to lowest as CLI flags and `--config`, trusted project files from repository root to current directory with the closest file winning, the selected profile, user config, system config, then built-in defaults. Managed clients add separately composed policy layers: managed defaults override the ordinary startup base, including CLI overrides, while managed requirements constrain permitted effective values.
- **Use when:** Guidance must be version-controlled and apply predictably to a repository or subtree, while runtime defaults need a supported configuration layer.
- **Do not use when:** The content is a one-off task instruction, a secret, or an organization-enforced security requirement; use the prompt, secret store, or managed requirements respectively.
- **Primary evidence:** [OpenAI `AGENTS.md` discovery and precedence](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [OpenAI ordinary configuration precedence](https://learn.chatgpt.com/docs/config-file/config-basic#configuration-precedence), and [OpenAI managed-default and requirements precedence](https://learn.chatgpt.com/docs/enterprise/managed-configuration#managed-defaults-managed_configtoml)
- **Cross-check:** [Codex open-source model-visible `AGENTS.md` contract](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md), [immutable config-layer precedence implementation](https://github.com/openai/codex/blob/81de4f251cfdaf32ecb85e2160ebfc11a562d44b/codex-rs/config/src/config_layer_source.rs#L4-L55), and [managed-layer](https://github.com/openai/codex/blob/81de4f251cfdaf32ecb85e2160ebfc11a562d44b/codex-rs/core/src/config/config_loader_tests.rs#L750-L801) plus [managed-requirements precedence tests](https://github.com/openai/codex/blob/81de4f251cfdaf32ecb85e2160ebfc11a562d44b/codex-rs/core/src/config/config_loader_tests.rs#L1217-L1265)
- **Verified:** 2026-07-22
- **Product / plan / version:** Codex CLI, IDE extension, desktop Codex, and cloud tasks that read repository guidance; project config is trusted-project-only.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Prompts are better for temporary constraints. Skills are better for reusable task procedures. Managed `requirements.toml` is better for non-overridable policy. Large instruction files consume context and become stale.
- **Subscription / licensing impact:** Native Codex behavior with no additional license.
- **Data / permission / security impact:** Repository instructions and project config are untrusted project content. More specific `AGENTS.md` wins; untrusted project `.codex/` layers, including config, hooks, and rules, are skipped. Managed defaults override ordinary config and local flags at process start; requirements reject disallowed effective values and have their own multi-source composition rules. Never store credentials in any configuration or instruction file.

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

Cursor has corresponding but not identical instruction and extension layers. Project rules, `AGENTS.md`, Team Rules, user preferences, skills, subagents, hooks, and MCP each have separate scope and trust implications; shared terminology must preserve those differences.

#### Cursor Project Rules with explicit team and user layering

- **Tier:** default
- **Recommendation:** Put scoped, version-controlled repository guidance in `.cursor/rules/*.mdc`; use `AGENTS.md` for simple readable root or nested instructions, Team Rules for reviewed organization policy, and User Rules only for personal cross-project preferences.
- **Use when:** A convention or workflow must apply repeatedly and its scope can be expressed as always-on, intelligently selected, file-matched, manual, nested-directory, or team-managed guidance.
- **Do not use when:** The content is a secret, a one-off request, executable enforcement, or a control that must remain effective even if the model fails to follow instructions.
- **Primary evidence:** [Current Cursor Rules documentation and precedence](https://cursor.com/docs/rules.md)
- **Cross-check:** [Cursor Customize scope changelog](https://cursor.com/changelog/customize)
- **Verified:** 2026-07-22
- **Product / plan / version:** Current Cursor editor, CLI, and cloud agents that read repository guidance; Team Rules require Teams or Enterprise.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** `AGENTS.md` is simpler and interoperable but has less metadata than `.mdc`. Skills are better for procedural on-demand workflows. Hooks and CI are deterministic execution points but add code and failure modes. Large always-on rules consume context and can conflict.
- **Subscription / licensing impact:** Project, user, and `AGENTS.md` guidance is native. Team-managed rule distribution requires Teams or Enterprise; imported remote rules carry their source license and maintenance burden.
- **Data / permission / security impact:** Current docs publish Team Rules, Project Rules, then User Rules as the conflict order, with earlier sources taking precedence, and parent-to-nested precedence for `AGENTS.md`. They do not place `AGENTS.md` in the three-source chain. Treat imported or repository rules as untrusted prompt content and never use model guidance as the only security control.

#### Cursor MCP and hooks behind least privilege and independent gates

- **Tier:** specialist
- **Recommendation:** Add a Cursor MCP server only for a bounded live-data need with explicit tool approval and least-privilege credentials; for supported security-critical before-hooks, pilot `failClosed: true`, but keep sandbox, source-system authorization, and CI as independent enforcement layers.
- **Use when:** Static repository context is insufficient, the service/tool owner and authentication flow are known, and hook or MCP behavior can be tested across every required local, CLI, and cloud surface.
- **Do not use when:** A repository file is sufficient, credentials cannot be scoped, writes lack idempotency and recovery, or complete fail-closed interception is required across unavailable cloud events or initial read-only Cloud Agent turns.
- **Primary evidence:** [Current Cursor MCP documentation](https://cursor.com/docs/mcp.md) and [current Cursor Hooks documentation](https://cursor.com/docs/hooks.md)
- **Cross-check:** [Cursor subagents, skills, MCP, and hook changelog](https://cursor.com/changelog/2-4)
- **Verified:** 2026-07-22
- **Product / plan / version:** Current Cursor editor, CLI, and Cloud Agents; project/global/team MCP distribution and project/user/plugin/team/managed hook sources vary by surface and plan.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Checked-in artifacts are auditable and credential-free but can become stale. Direct APIs provide precise contracts but require integration code. Skills provide procedure without live authority. CI checks are later but independent of the agent loop.
- **Subscription / licensing impact:** Paid Individual lists MCPs, skills, and hooks; Teams adds shared marketplace distribution, while Enterprise adds MCP access controls and managed hooks. Each external service, plugin, model, or server can add separate licensing, compute, and credential requirements.
- **Data / permission / security impact:** MCP can execute local commands or call remote services and can receive OAuth/API credentials. Cursor asks before MCP tools by default unless auto-run policy changes that behavior. A crashed or timed-out MCP server fails that tool call while other MCP servers continue. Command-hook exit code `2` blocks; crashes, timeouts, and invalid JSON otherwise fail open by default, while `failClosed: true` blocks the covered action. Hooks do not run during initial read-only Cloud Agent turns, and cloud support excludes several events, including MCP hooks. Redact hook inputs and logs, pin reviewed code, test each required surface, and require independent controls for sensitive writes.

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
- **Recommendation:** Adopt a conservative workflow policy: do not assign multiple Codex agents as concurrent writers in the same checkout for routine implementation. OpenAI documents coordination risk and worktree isolation, but does not publish this as a product prohibition.
- **Use when:** Not applicable as a default; only a controlled Gate 2 experiment with file-level isolation, deterministic locking, and recovery evidence could justify an exception.
- **Do not use when:** Normal feature, bug-fix, refactor, or infrastructure work shares files, build outputs, Git state, or a local server.
- **Primary evidence:** [OpenAI subagent caution for parallel write-heavy workflows](https://learn.chatgpt.com/docs/agent-configuration/subagents#why-subagent-workflows-help)
- **Cross-check:** [OpenAI worktrees for independent chats](https://learn.chatgpt.com/docs/environments/git-worktrees#why-use-a-worktree)
- **Verified:** 2026-07-22
- **Product / plan / version:** All Codex surfaces that can spawn or run parallel work against a local repository.
- **Confidence:** medium
- **Maturity:** experimental
- **Alternatives and tradeoffs:** Use one strong agent, serialize dependent work, or isolate writers by worktree/cloud checkout. Isolation adds setup and merge cost but preserves reviewable state. The rejection is a conservative workflow policy, not an OpenAI maturity designation; only the possible Gate 2 exception is experimental.
- **Subscription / licensing impact:** Rejecting shared-checkout writers avoids duplicated usage and rework; isolated alternatives stay within existing subscriptions.
- **Data / permission / security impact:** Concurrent shared writes can overwrite user or agent changes, corrupt intermediate state, invalidate tests, and obscure attribution and recovery.

Cursor supports foreground and background subagents in the editor, CLI, and Cloud Agents, plus separate VM/branch isolation in cloud. These are native Cursor mechanisms, not assumed equivalents of Codex thread delegation or worktrees.

#### Cursor read-only subagents and isolated cloud writers

- **Tier:** specialist
- **Recommendation:** Use read-only Cursor subagents for bounded exploration or independent verification, and place any parallel writer in a separate cloud VM/branch or otherwise isolated checkout with explicit ownership and synthesis.
- **Use when:** Subtasks have independent inputs and outputs, context isolation reduces noise, and the parent agent or developer can validate returned evidence and integrate non-overlapping changes.
- **Do not use when:** Tasks require frequent shared decisions, mutate the same files or external state, depend on one serial discovery chain, or lack a merge and recovery plan.
- **Primary evidence:** [Current Cursor subagent behavior and configuration](https://cursor.com/docs/subagents.md)
- **Cross-check:** [Current Cloud Agent isolation](https://cursor.com/docs/cloud-agent.md) and [Cursor 2.5 asynchronous subagent changelog](https://cursor.com/changelog/2-5)
- **Verified:** 2026-07-22
- **Product / plan / version:** Current Cursor editor, CLI, and Cloud Agents; project/user custom subagents and built-in Explore, Bash, and Browser subagents.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** One strong agent avoids coordination and duplicated usage. Skills are cheaper for single-purpose repeatable actions. Local background subagents share host resources and avoid Cloud Agent VM snapshots and indefinite Cloud Agent transcripts, but Cursor backend processing, Privacy Mode qualifications, indexing/caching choices, and the risk classifier still apply. Cloud Agents add stronger runtime isolation but introduce hosted retention, network, repository, and model-usage cost.
- **Subscription / licensing impact:** Subagents consume model usage, and parallel/cloud runs can increase on-demand charges. Cloud Agents require a paid plan; selected models and team controls affect cost and availability.
- **Data / permission / security impact:** Each subagent has a clean context and receives only the parent-provided prompt; read-only mode removes file edits and state-changing shell commands. Local background subagents write state under `~/.cursor/subagents/` and can resume with preserved context. Treat that directory as retained host data: protect it with host file permissions, account for backups and endpoint access, and clean it under an explicit local-data policy when state is no longer needed; the current docs do not state an automatic cleanup or retention duration. Cloud writers auto-run commands and use hosted repositories, snapshots, transcripts, secrets, and network policy. Treat summaries as untrusted until cross-checked and protect merge authority independently.

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
| W1.CU1 | Which Cursor plans include editor Agent, CLI, MCP, skills, hooks, cloud agents, team administration, and Enterprise controls, and where can usage-based charges apply? | Task 3 | evidence gap | Cursor profile |
| W1.CU2 | Which Cursor editor, CLI, headless, cloud/background, web, mobile, remote, and connected launch surfaces are documented? | Task 3 | verified | Cursor profile |
| W1.CU3 | What is the Cursor precedence across Team, Project, User, nested `AGENTS.md`, plugin, and managed guidance? | Task 3 | evidence gap | Cursor profile; Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CU4 | How do Cursor Plan, Ask, Agent, Auto-review, Allowlist, Run Everything, and version-specific mode names differ? | Task 3 | verified | Cursor profile |
| W1.CU5 | Where are the Cursor sandbox, command, file, network, headless, cloud auto-run, and external-write permission boundaries? | Task 3 | verified | Cursor profile; Security, permission, audit, and recovery analysis |
| W1.CU6 | How does Cursor configure and approve local, project, team, and cloud MCP servers? | Task 3 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CU7 | Which Cursor hook events, scopes, execution types, cloud limitations, and failure behaviors are documented? | Task 3 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CU8 | What do Cursor Privacy Mode, indexing, model-provider, cloud runtime, snapshot, transcript, artifact, secret, deletion, and Enterprise-retention controls guarantee or exclude? | Task 3 | verified | Cursor profile; Security, permission, audit, and recovery analysis |
| W1.CU9 | How do Cursor chat history, compression, resume, side chats, subagent context, local/cloud handoff, and memory preserve or lose context across surfaces? | Task 3 | evidence gap | Cursor profile; Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CU10 | Which models and Auto modes are currently available in Cursor, how do plan pools, token pricing, residency, and model-specific retention affect selection, and which durable routing decision remains deferred to Task 5? | Tasks 3, 5 | verified | Cursor profile; Model and open-source routing matrix |
| W1.CU11 | Which Cursor Team and Enterprise controls govern identity, repositories, models, MCP, rules, plugins, hooks, auto-run, network, cloud agents, service accounts, and audit? | Task 3 | verified | Cursor profile; Cross-layer tooling matrix |
| W1.CU12 | How fresh are Cursor's canonical raw docs, download version, and changelog, and which terminology or publication lags remain? | Task 3 | evidence gap | Cursor profile |
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
| SRC-030 | OpenAI | https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan | Official Help Center | Codex across ChatGPT plans; updated 2026-07-18 | 2026-07-22 | Codex profile | Lists Codex web and states Plus/Pro training behavior; conflicts with SRC-031's distinct-view wording and is silent on the Free/Go training default. |
| SRC-031 | OpenAI | https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex | Official Help Center | Work and desktop Codex; updated 2026-07-21 | 2026-07-22 | Codex profile | Says distinct Codex view is not selectable on web/mobile; evidence gap remains. |
| SRC-032 | OpenAI | https://learn.chatgpt.com/docs/cloud | Official product documentation | Codex cloud task portal; current | 2026-07-22 | Codex profile | Confirms hosted cloud tasks but does not resolve distinct-view naming conflict. |
| SRC-033 | OpenAI | https://learn.chatgpt.com/docs/config-file/config-basic | Official configuration documentation | Local Codex configuration layers; current | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Directly documents the six-level ordinary configuration order, trusted-project gating, and separate managed requirements. |
| SRC-034 | OpenAI | https://learn.chatgpt.com/docs/agent-configuration/rules | Official product documentation | Local Codex command rules; current | 2026-07-22 | Codex profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Directly labels Rules experimental and documents active-layer and trusted-project loading. |
| SRC-035 | OpenAI | https://learn.chatgpt.com/docs/changelog | Official versioned product changelog | Codex clients through iOS 1.2026.188 and desktop 26.707 | 2026-07-22 | Codex profile | Dated client and product entries complement the weekly digest; newest visible entry verified is 2026-07-13. |
| SRC-036 | OpenAI | https://github.com/openai/codex/blob/81de4f251cfdaf32ecb85e2160ebfc11a562d44b/codex-rs/config/src/config_layer_source.rs | Immutable public first-party implementation | Open-source Codex commit `81de4f251cfdaf32ecb85e2160ebfc11a562d44b` | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Defines config layer sources and numeric precedence, including system, enterprise cloud, user/profile, project, session, managed file, and MDM layers. |
| SRC-037 | OpenAI | https://github.com/openai/codex/blob/81de4f251cfdaf32ecb85e2160ebfc11a562d44b/codex-rs/core/src/config/config_loader_tests.rs | Immutable public first-party tests | Open-source Codex commit `81de4f251cfdaf32ecb85e2160ebfc11a562d44b` | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Tests managed config merging on top, managed preferences at highest precedence, and requirements rejecting disallowed effective values. |
| SRC-038 | Cursor | https://cursor.com/llms.txt | Official documentation index | Current public Cursor documentation and Help Center routes | 2026-07-22 | Cursor profile; source cross-check | Identifies current canonical raw Markdown; used to replace stale redirected `docs.cursor.com` pages. |
| SRC-039 | Cursor | https://cursor.com/pricing | Official pricing page | Hobby, Individual, Teams Standard/Premium, and Enterprise | 2026-07-22 | Cursor profile | Plan inclusion and public list prices are current but dynamic; contract terms and usage remain account-dependent. |
| SRC-040 | Cursor | https://cursor.com/docs/agent/overview.md | Official product documentation | Current Cursor editor Agent | 2026-07-22 | Cursor profile | Confirms local Agent tools, review, chat history, and planning/implementation surface. |
| SRC-041 | Cursor | https://cursor.com/docs/cli/overview.md | Official product documentation | Current Cursor CLI | 2026-07-22 | Cursor profile | Current raw page documents interactive/headless use, sessions, sandbox controls, and cloud handoff without the stale beta wording. |
| SRC-042 | Cursor | https://cursor.com/docs/cli/installation.md | Official installation documentation | Current Cursor CLI on macOS, Linux, WSL, and native Windows | 2026-07-22 | Cursor profile | Supersedes older public summaries that described Windows only through WSL. |
| SRC-043 | Cursor | https://cursor.com/docs/cli/reference/permissions.md | Official configuration reference | Current Cursor CLI global/project permissions | 2026-07-22 | Cursor profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Documents Shell, Read, Write, WebFetch, and MCP tokens; deny takes precedence over allow. |
| SRC-044 | Cursor | https://cursor.com/docs/models-and-pricing.md | Official model and pricing reference | Current model catalog, plan pools, Auto modes, and residency pricing | 2026-07-22 | Cursor profile; Model and open-source routing matrix | Dynamic catalog verifies current availability only; Task 5 must recheck before routing recommendations. |
| SRC-045 | Cursor | https://cursor.com/docs/agent/security/run-modes.md | Official security documentation | Current editor Auto-review, Allowlist, Run Everything, and sandboxing | 2026-07-22 | Cursor profile | Recommends Auto-review for most users, states it is not a security boundary, and documents team-over-local configuration precedence. |
| SRC-046 | Cursor | https://cursor.com/docs/rules.md | Official configuration documentation | Current Project, User, Team, and `AGENTS.md` rules | 2026-07-22 | Cursor profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Resolves stale team-sharing text and documents Team > Project > User plus nested `AGENTS.md`; relative precedence of `AGENTS.md` remains unspecified. |
| SRC-047 | Cursor | https://cursor.com/docs/mcp.md | Official integration documentation | Current editor, CLI, Cloud Agent, project/global/team MCP | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents transports, OAuth, config locations, team distribution, and separate Enterprise MCP policy. |
| SRC-048 | Cursor | https://cursor.com/docs/hooks.md | Official product and security documentation | Current local, CLI, plugin, team/managed, and cloud hooks | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents default fail-open behavior, explicit exit-code-2 blocking, scoped `failClosed: true` overrides for hook failures, and cloud event/source limitations. |
| SRC-049 | Cursor | https://cursor.com/docs/subagents.md | Official product documentation | Current editor, CLI, and Cloud Agent subagents | 2026-07-22 | Single-agent and multi-agent pattern catalog | Documents isolated contexts, foreground/background modes, read-only configuration, and location precedence. |
| SRC-050 | Cursor | https://cursor.com/docs/cloud-agent.md | Official product documentation | Current Cursor Cloud Agents | 2026-07-22 | Cursor profile; Single-agent and multi-agent pattern catalog | Confirms isolated VMs, parallel execution, repository connections, environments, MCP, hooks, and artifacts. |
| SRC-051 | Cursor | https://cursor.com/docs/cloud-agent/security.md | Official security documentation | Current Cursor-hosted Cloud Agents | 2026-07-22 | Cursor profile; Security, permission, audit, and recovery analysis | Owns the four-part retention matrix, deletion paths, auto-run/prompt-injection boundary, repository inheritance, and audit controls. |
| SRC-052 | Cursor | https://cursor.com/docs/cloud-agent/security-network.md | Official security/configuration documentation | Current Cloud Agent secrets, network, retention, and signed commits | 2026-07-22 | Cursor profile | Conversation history is indefinite by default; snapshots expire after rolling 90-day inactivity; Enterprise 90-day conversation caps are early access. |
| SRC-053 | Cursor | https://cursor.com/docs/cloud-agent/settings.md | Official administration documentation | Current Cloud Agent team/environment settings | 2026-07-22 | Cursor profile | Documents environment/network settings and lateral-movement risk when follow-ups can operate with another user's secrets. |
| SRC-054 | Cursor | https://cursor.com/cloud | Official product page | Current cloud-agent launch and automation surfaces | 2026-07-22 | Cursor profile | Marketing-level source for web/mobile/integration and memory surfaces; not used alone for a security or retention recommendation. |
| SRC-055 | Cursor | https://cursor.com/help/ai-features/background-agents.md | Official Help Center | Current Background Agent naming and Cloud Agent mapping | 2026-07-22 | Cursor profile | Explicitly says Cursor calls long-running remote background agents Cloud Agents; current security docs own retention details. |
| SRC-056 | Cursor | https://cursor.com/data-use | Official data-use and privacy documentation | Privacy Mode and model-provider processing; updated 2026-07-15 | 2026-07-22 | Cursor profile | Qualifies ZDR with abuse/risk-classifier and approved non-ZDR-model behavior; documents BYOK routing and indexing metadata. |
| SRC-057 | Cursor | https://cursor.com/security | Official security documentation | Cursor infrastructure, Privacy Mode, indexing, and subprocessors | 2026-07-22 | Cursor profile | Cross-check for hosted processing and indexing; detailed trust artifacts may require request or Trust Center access. |
| SRC-058 | Cursor | https://cursor.com/docs/account/teams/dashboard.md | Official administration documentation | Current Teams and Enterprise dashboard | 2026-07-22 | Cursor profile | Separates team settings from Enterprise-only model, repository, MCP, auto-run, audit, and related controls. |
| SRC-059 | Cursor | https://cursor.com/changelog | Official product changelog | Public Cursor product activity through 2026-07-17 | 2026-07-22 | Cursor profile | Newest visible dated post is July 17, 2026; numbered release and download-version publication can lag independently. |
| SRC-060 | Cursor | https://cursor.com/changelog/auto-review | Official product changelog | Cursor 3.6, 2026-05-29 | 2026-07-22 | Cursor profile | Historical release cross-check for current Auto-review terminology and classifier/sandbox execution path. |
| SRC-061 | Cursor | https://cursor.com/changelog/2-4 | Official product changelog | Cursor 2.4, 2026-01-22 | 2026-07-22 | Instructions, context, memory, skills, plugins, MCP, and hooks | Introduced current subagent/skill and expanded hook/MCP surface; later raw docs govern current behavior. |
| SRC-062 | Cursor | https://cursor.com/changelog/2-5 | Official product changelog | Cursor 2.5, 2026-02-17 | 2026-07-22 | Cursor profile; Single-agent and multi-agent pattern catalog | Cross-checks granular sandbox network controls, plugins, and asynchronous subagents. |
| SRC-063 | Cursor | https://cursor.com/changelog/customize | Official product changelog | Cursor 3.9, 2026-06-22 | 2026-07-22 | Cursor profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Confirms user/team/workspace customization and team marketplace expansion. |
| SRC-064 | Cursor | https://cursor.com/changelog/cloud-in-agents-window | Official product changelog | Cursor 3.7, 2026-06-17 | 2026-07-22 | Cursor profile | Confirms environment snapshots, VM/branch cloud subagents, local/cloud handoff, and parallel execution. |
| SRC-065 | Cursor | https://cursor.com/changelog/cli-jan-16-2026 | Official product changelog | Cursor CLI, 2026-01-16 | 2026-07-22 | Cursor profile | Cross-checks Plan/Ask modes and local-to-cloud handoff; current raw CLI docs govern current commands. |
| SRC-066 | Cursor | https://cursor.com/download | Official download page | Cursor desktop 3.12 labeled latest | 2026-07-22 | Cursor profile | Version label is newer than the newest numbered changelog release, a publication-lag freshness gap. |
| SRC-067 | Cursor | https://cursor.com/changelog/03-25-26 | Official product changelog | Self-hosted Cloud Agents, 2026-03-25 | 2026-07-22 | Cursor profile | Confirms customer-infrastructure workers; public material does not establish that the whole Cursor control plane is self-hosted. |
| SRC-068 | Cursor | https://cursor.com/docs/cli/reference/parameters.md | Official CLI reference | Current Cursor CLI parameters | 2026-07-22 | Cursor profile | Documents that `--print` retains write and shell tools, `--force` allows commands unless explicitly denied, and `--trust` skips workspace prompting in headless mode. |
| SRC-069 | Cursor | https://cursor.com/docs/cloud-agent/api/endpoints.md | Official Cloud Agent API reference | Current Cloud Agent archive and deletion endpoints | 2026-07-22 | Cursor profile | Distinguishes reversible Archive, which leaves agents readable, from irreversible permanent deletion; the security guide separately scopes deletion to transcripts and artifacts rather than snapshots. |
| SRC-070 | Cursor | https://cursor.com/docs/cli/reference/authentication.md | Official CLI authentication reference | Current Cursor CLI browser and API-key authentication | 2026-07-22 | Cursor profile | Documents browser-based Cursor-account login, API-key authentication, local credential storage, authentication status, and explicit not-authenticated errors. |

## Gate 1 audit and handoff

Gate 1 remains read-only. The Gate 1 audit will record citation, contradiction, freshness, scope, and security review outcomes; unresolved evidence gaps; and required pilots before handoff for user review.

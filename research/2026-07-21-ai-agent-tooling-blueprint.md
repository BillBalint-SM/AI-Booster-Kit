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

Claude Code has materially different local, hosted, and remote-control execution paths. The CLI is the fullest surface; the VS Code and JetBrains integrations add editor context; Desktop runs local or cloud sessions; web and mobile use Anthropic-managed cloud environments; Remote Control only steers a session whose tools and files remain on the user's machine. “Available in Claude Code” therefore does not imply feature parity, identical settings, or the same data boundary across surfaces. [Overview](https://code.claude.com/docs/en/overview), [platform comparison](https://code.claude.com/docs/en/platforms), [web execution](https://code.claude.com/docs/en/claude-code-on-the-web), [Remote Control](https://code.claude.com/docs/en/remote-control)

#### Subscription-first local Claude Code

- **Tier:** default
- **Recommendation:** Use the local Claude Code CLI or supported IDE integration under an existing Pro, Max, or Team entitlement for the normal subscription-only path. After included usage is exhausted, enable usage credits only as an explicit optional overage path billed separately at standard API rates; they cover both Claude conversations and Claude Code. Keep Claude subscription authentication distinct from Anthropic Console/API credentials, and verify the actual Enterprise contract before calling that path subscription-included: current usage-based Enterprise access bills consumption at API rates from the first token.
- **Use when:** A developer needs repository-aware terminal or IDE work, local tools and files should remain on the endpoint, and the subscribed plan has enough shared Claude/Claude Code usage.
- **Do not use when:** The required capability is web-only, mobile-only, scheduled cloud execution, or a third-party model provider; or when predictable high-volume automation requires separately budgeted API usage.
- **Primary evidence:** [Claude pricing and Claude Code inclusion](https://claude.com/pricing), [Pro and Max usage credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans), and [Team and seat-based Enterprise usage credits](https://support.claude.com/en/articles/12005970-manage-usage-credits-for-team-and-seat-based-enterprise-plans)
- **Cross-check:** [Pro and Max Claude Code billing](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan), [Team and Enterprise Claude Code access](https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan), [current Enterprise billing](https://support.claude.com/en/articles/11526368-how-am-i-billed-for-my-enterprise-plan), and [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Verified:** 2026-07-26
- **Product / plan / version:** Claude Code CLI and supported IDE integrations; paid Claude plans as documented on 2026-07-26. Usage credits apply to Pro, Max, Team, and seat-based Enterprise after included limits; they do not apply to current usage-based Enterprise because that plan meters all usage from the first token.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** Desktop provides visual review and parallel sessions; web continues after disconnect; Console/API authentication supports metered automation and third-party deployment providers. Those alternatives change feature availability, execution location, and billing.
- **Subscription / licensing impact:** Pro and Max share one usage pool between Claude and Claude Code; optional prepaid usage credits continue both products after the included limit and are separately charged at standard API rates. Team and seat-based Enterprise owners can enable standard-API-rate credits after seat limits; Team prepays them, while seat-based Enterprise is billed monthly for actual overage. `ANTHROPIC_API_KEY` takes precedence over subscription authentication and causes separate API billing. Current usage-based Enterprise has no included allowance or credit transition: usage is metered at API rates from the first token. Third-party-provider billing remains provider- and contract-specific, so `W1.CL1` retains `evidence gap`.
- **Data / permission / security impact:** Local tools and filesystem access execute on the endpoint, but prompts and relevant code context are sent to Anthropic's API over TLS. Protect local OAuth/API credentials, do not put secrets in prompts or project instructions, and review the commercial or consumer data terms attached to the authenticated account.

#### Explicit execution-boundary choice for local, web, and Remote Control

- **Tier:** specialist
- **Recommendation:** Select and document one execution boundary per workflow: local CLI/IDE/Desktop or Agent View for endpoint execution, Claude Code on the web for a fresh Anthropic-managed VM, or Remote Control for browser/mobile control of a still-local session. Treat local background, hosted web, and Remote Control as separate preview-era mechanisms rather than interchangeable “remote Claude Code.”
- **Use when:** A team needs long-running hosted work, cross-device monitoring, or controlled movement between web and local sessions and can accept the surface's authentication, repository, retention, and compliance constraints.
- **Do not use when:** Zero Data Retention is mandatory, cloud GitHub access is not approved, local endpoint execution cannot be trusted, or the required local configuration and secrets are assumed to transfer automatically to web.
- **Primary evidence:** [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web) and [Remote Control](https://code.claude.com/docs/en/remote-control)
- **Cross-check:** [Platform comparison](https://code.claude.com/docs/en/platforms), [Desktop](https://code.claude.com/docs/en/desktop), [Agent View](https://code.claude.com/docs/en/agent-view), and [VS Code web-to-local continuation](https://code.claude.com/docs/en/ide-integrations)
- **Verified:** 2026-07-26
- **Product / plan / version:** Claude Code web and Agent View are research previews; Agent View requires Claude Code 2.1.139 or later. Remote Control requires Claude subscription authentication and is unavailable with API-key or third-party-provider authentication. Its page currently contradicts itself by saying both “all plans” and Pro/Max/Team/Enterprise in its requirements.
- **Confidence:** medium
- **Maturity:** experimental
- **Alternatives and tradeoffs:** A local session avoids a hosted build VM but stops with the endpoint and retains state locally. Agent View lets full local sessions continue without a terminal under a supervisor, but host shutdown stops them and each session consumes quota independently. Web continues after disconnect and adds isolated VM controls, but does not inherit user-local settings, MCP servers, skills, or secrets. Remote Control preserves local execution but synchronizes the transcript through Anthropic while connected.
- **Subscription / licensing impact:** Web and Remote Control require eligible Claude subscription access; Console API keys and major third-party providers do not unlock them. GitHub access and any external services retain separate licensing and authorization.
- **Data / permission / security impact:** Web runs in a fresh Anthropic-managed VM with network controls, scoped Git credentials, audit events, and cleanup; committed repository configuration and server-managed settings apply, while user-local configuration does not. Remote Control uses outbound TLS with no inbound port, but execution and file access stay on the endpoint and its transcript is stored on Anthropic servers for synchronization. Both are incompatible with ZDR according to their current documentation.

#### Managed controls with surface- and model-specific retention review

- **Tier:** specialist
- **Recommendation:** For Team or Enterprise deployment, pair endpoint-managed policy with organization administration and verify effective settings on every required surface. Record consumer, commercial, API/provider, local-transcript, cloud-session, and covered-model retention separately; do not summarize them as one Claude Code retention period.
- **Use when:** An organization needs non-overridable local controls, controlled cloud/remote features, auditable administration, and a documented data-processing boundary before rollout.
- **Do not use when:** Server-managed settings alone are expected to secure an unmanaged endpoint, to distribute MCP servers, or to guarantee fail-closed startup without `forceRemoteSettingsRefresh`; or when a blanket ZDR claim has not been checked against the selected model and provider.
- **Primary evidence:** [Claude Code settings and managed-source precedence](https://code.claude.com/docs/en/settings), [server-managed settings](https://code.claude.com/docs/en/server-managed-settings), and [Claude Code data usage](https://code.claude.com/docs/en/data-usage)
- **Cross-check:** [Organization-data retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), [Enterprise custom retention](https://support.claude.com/en/articles/10440198-configure-custom-data-retention-controls-for-enterprise-plans), and [covered-model retention effective 2026-06-09](https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-covered-models)
- **Verified:** 2026-07-26
- **Product / plan / version:** Team, Enterprise, Anthropic API, and supported third-party-provider deployments; server-managed settings require the documented Claude Code minimum versions. Covered-model retention applies only to Anthropic's designated Mythos-class and future covered models on the listed platforms, not to every model.
- **Confidence:** medium
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Endpoint-managed MDM/OS or file policy is stronger on a managed device; server-managed settings are easier to distribute organization-wide but are client-side, not per-group, and can be bypassed through another organization or unsupported provider unless endpoint controls prevent it. Provider-native policy may change the contract and available features.
- **Subscription / licensing impact:** Advanced administrative, analytics, and retention controls are plan- and contract-dependent. External providers, MCP services, and API consumption are billed and licensed independently.
- **Data / permission / security impact:** Managed settings outrank CLI, local, project, and user settings, but different managed sources have their own precedence. Standard commercial Claude Code retention is documented as 30 days and local transcripts default to 30 days; consumer retention depends on the model-improvement choice. Eligible ZDR and custom Enterprise controls require separate enablement, and designated covered models still require 30-day prompt/output retention from 2026-06-09 even on listed ZDR platforms.

Current freshness and limitations:

- The official changelog, generated from Anthropic's public `CHANGELOG.md`, reports Claude Code `2.1.220` dated 2026-07-25. Unversioned documentation remains a moving contract and must be rechecked before Gate 2. [Changelog](https://code.claude.com/docs/en/changelog), [public repository changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- No primary source in this pass establishes one universal subagent-concurrency limit, agent-team size, context-window size, or usage quota across models, plans, providers, and versions. Do not make those values strategic defaults without a versioned pilot.
- The Remote Control page's plan statements conflict, and Enterprise chat/project retention documentation does not describe the same object as Claude Code/API retention. These remain explicit scope gaps rather than averaged claims.

## Cross-layer tooling matrix

The three products expose similarly named layers with different enforcement and execution contracts. Use native terminology and verify the required surface rather than assuming equivalence.

| Layer | Codex | Cursor | Claude Code |
| --- | --- | --- | --- |
| Durable repository guidance | Scoped `AGENTS.md` | `.cursor/rules`, supported `AGENTS.md`, and plan-dependent Team Rules | Managed/user/project/local `CLAUDE.md`, `.claude/rules`, and optional `@AGENTS.md` import |
| Runtime configuration | Layered `config.toml` plus managed defaults/requirements | User/project/team/managed configuration varies by feature | Managed > CLI > local > project > user settings; permission rules merge with deny/ask/allow semantics |
| Tool authorization | Approval policy plus sandbox and managed requirements | Run mode, command/file/network/MCP policy, sandbox, and hook gates | Client permission rules/modes for all tools; OS sandbox only for Bash and child processes |
| Reusable procedure | Skills; plugins can bundle skills and integrations | Skills and plugins | Skills; plugins package skills, subagents, hooks, MCP, LSP, and related components |
| External capability | MCP and plugin-backed connectors | MCP with local/project/team/cloud scopes | MCP with local/project/user/plugin/connector scopes and separate managed allow/deny/fixed-server controls |
| Deterministic lifecycle action | Local hooks with documented surface limits | Command/prompt/agent/MCP hooks with local/cloud event differences | Command, HTTP, MCP, prompt, and agent hooks; all hook sources merge and fire |
| Remembered and resumed state | Session history, optional memory, compaction, resume/fork, worktrees | Chat history, compression, side chats, subagent state, cloud sessions | Local session transcripts, `CLAUDE.md`, auto memory, compaction, checkpoints, resume/branch, and surface-specific handoff |
| Parallel execution | Subagents, independent chats, worktrees, cloud tasks | Foreground/background subagents and isolated Cloud Agent VM/branches | Stable subagents and worktrees; experimental agent teams; separate local, web, Remote Control, and agent-view mechanisms |
| Organization control | Workspace RBAC plus managed local-runtime controls | Teams and Enterprise controls vary by rule, MCP, hook, cloud, network, and audit feature | Team/Enterprise administration plus endpoint- and server-managed settings; server-managed policy remains client-side |
| Model and effort routing | Local surfaces expose model and reasoning-effort selection; `/plan`, `/review`, `/model`, and `/fast` are workflow controls, while the cloud-task default is currently fixed | Manual model selection and paid-plan usage pools; eligible organizations can expose Router Cost, Balance, and Intelligence modes | Dynamic aliases, `/model`, `--model`, effort, `opusplan`, `availableModels`, and managed default/model restrictions |

The Codex and Cursor terms above summarize the already verified profiles. Model controls are grounded in the current [Codex model documentation](https://learn.chatgpt.com/docs/models), [Cursor Router announcement](https://cursor.com/changelog/router), and [Claude Code model configuration](https://code.claude.com/docs/en/model-config). Claude-specific layer boundaries are grounded in [features overview](https://code.claude.com/docs/en/features-overview), [settings](https://code.claude.com/docs/en/settings), [permissions](https://code.claude.com/docs/en/permissions), [sandboxing](https://code.claude.com/docs/en/sandboxing), [sessions](https://code.claude.com/docs/en/sessions), [subagents](https://code.claude.com/docs/en/sub-agents), and [agent teams](https://code.claude.com/docs/en/agent-teams).

## Model and open-source routing matrix

This is a dated routing policy, not a cross-vendor ranking. Model aliases, picker contents, plan entitlements, limits, context behavior, and prices are moving contracts and must be rechecked at Gate 2. Vendor benchmarks below are labeled as such; no independent result is generalized across models, tasks, or hardware.

### Current subscription surfaces

| Product | Subscription-only availability | Selection and effort controls | Boundary that prevents a static claim | Evidence |
| --- | --- | --- | --- | --- |
| Codex | Codex is included across current ChatGPT plans; the documented Plus surface includes GPT-5.6 Sol, Terra, and Luna, while Pro also lists GPT-5.3-Codex-Spark preview | `/model`, reasoning effort, `/plan`, `/review`, and `/fast`; current guidance maps Sol to complex/open-ended work, Terra to everyday work, and Luna to clear/repeatable work | Picker contents and plan limits change; cloud tasks currently use a fixed default. The API model's published context is not evidence that every subscription client exposes that effective context | [Pricing](https://learn.chatgpt.com/docs/pricing), [models](https://learn.chatgpt.com/docs/models), [commands](https://learn.chatgpt.com/docs/commands) |
| Cursor | Paid Individual plans have a Cursor-model pool and at least a USD 20 third-party-model base pool; staying inside those pools avoids on-demand spend | Manual model choice; Router Cost, Balance, and Intelligence exist for eligible accounts, with Teams enabled by default and Enterprise enablement documented | Exact Individual Router entitlement is not documented in the reviewed primary source. Balance and Intelligence bill at the routed model's rate, and the selected routed model is hidden by default | [Models and pricing](https://cursor.com/docs/models-and-pricing.md), [Router](https://cursor.com/changelog/router), [pricing](https://cursor.com/pricing) |
| Claude Code | Claude Code is included with paid Claude plans, subject to shared usage limits; current documentation assigns Sonnet 5 to Pro, Team Standard, and subscription Enterprise, and Opus 5 to Max and Team Premium defaults | `/model`, `--model`, effort, dynamic `haiku`, `sonnet`, `opus`, and `fable` aliases, plus `opusplan`; administrators can restrict available models and enforce defaults | Aliases move. Sonnet 5 direct 1M use is documented without usage credits, while Opus 1M on Pro requires credits; extra usage, API keys, and usage-based Enterprise are separately metered | [Plan inclusion](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan), [model configuration](https://code.claude.com/docs/en/model-config), [costs](https://code.claude.com/docs/en/costs) |

#### Subscription-only, task-conditioned routing

- **Tier:** default
- **Recommendation:** Start with the lowest-effort currently included model that meets the task's acceptance criteria, then escalate within the same existing subscription only after a concrete failure or complexity signal. Use the product-native picker and workflow controls; do not enable API keys, usage credits, on-demand billing, or a second product merely to follow this matrix.
- **Use when:** An existing Codex, Cursor, or Claude Code subscription has remaining included allowance and the repository's data policy permits that product.
- **Do not use when:** The account's exact plan, available models, remaining allowance, data boundary, or administrator restrictions have not been checked; do not infer access from public model documentation.
- **Primary evidence:** [Codex models](https://learn.chatgpt.com/docs/models), [Cursor models and pricing](https://cursor.com/docs/models-and-pricing.md), and [Claude Code model configuration](https://code.claude.com/docs/en/model-config)
- **Cross-check:** [Codex pricing](https://learn.chatgpt.com/docs/pricing), [Cursor Router](https://cursor.com/changelog/router), and [Claude paid-plan usage](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current documented Codex ChatGPT-plan models, Cursor paid Individual/Teams/Enterprise model controls, and Claude Code paid-plan aliases and defaults; actual account pickers and managed policy are authoritative at execution time.
- **Confidence:** medium
- **Maturity:** stable
- **Alternatives and tradeoffs:** A stronger included model can reduce retries on complex work but usually consumes allowance faster and can add latency. A lighter included model is suitable for bounded work but needs smaller context, explicit acceptance criteria, and review. Manual selection is more auditable than a router; a router adapts but can obscure the chosen model and price.
- **Subscription / licensing impact:** The default path uses only already-included subscription allowance. Stop or defer when the included pool is exhausted; do not silently switch to Cursor on-demand, Claude usage credits/API, Codex API, a cloud GPU, or a new subscription.
- **Data / permission / security impact:** Model choice does not replace least privilege, sandboxing, approval gates, secret isolation, or source review. Treat repository, tool, and retrieved content as untrusted; confirm product retention, training, residency, and managed-policy settings for the account in use.

Latency classes are operational hypotheses for Gate 2: **interactive** targets short edit/review turns; **deliberate** permits a longer plan or multi-file turn; **batch** permits queued or background work. They are not vendor service-level guarantees.

| Task type | Recommended tier | Qualifying conditions | Agent/model surface | Subscription effect | Latency class | Evidence | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Specification/planning | specialist | Ambiguous requirements, multiple dependencies, or irreversible choices; planning produces no external write | In the already-subscribed product: Codex Sol with `/plan` at medium/high effort; Cursor manual capable model or eligible Balance/Intelligence Router; Claude `opusplan` or the strongest included picker option | Included allowance only; Router rate must fit the included Cursor pool; no credits, API, on-demand, or new plan | deliberate | Product-native planning, effort, and model controls in [Codex models](https://learn.chatgpt.com/docs/models), [Cursor Router](https://cursor.com/changelog/router), and [Claude model config](https://code.claude.com/docs/en/model-config) | Split the plan, retrieve only relevant files, and retry with the product's default included model; request user clarification before widening scope |
| Repository exploration | default | Read-only orientation with bounded questions and repository-native search available | Codex Terra/Luna; Cursor included Cursor model or eligible Cost Router; Claude Sonnet/Haiku alias, whichever the picker includes | Included allowance only; prefer the efficient pool/model and stop at its limit | interactive | Current role guidance and aliases in [Codex models](https://learn.chatgpt.com/docs/models) and [Claude model config](https://code.claude.com/docs/en/model-config); Cursor pools in [models and pricing](https://cursor.com/docs/models-and-pricing.md) | Narrow by symbol/path, use native search, summarize evidence, then escalate one turn within the same subscription |
| Narrow code edit | default | One cohesive behavior change, explicit acceptance criteria, and narrow verification | Codex Luna/Terra; Cursor included Cursor model or Cost Router; Claude Haiku/Sonnet alias available in the picker | Included allowance only; no automatic paid overage | interactive | Same current model-role and pricing sources as the subscription table; routing is a policy inference to test | Reduce the diff and provide the failing check; escalate to the next included model only if the first attempt fails acceptance criteria |
| Multi-file implementation | default | Accepted plan, dependency relationships understood, reversible slices, and relevant tests available | Codex Terra then Sol if complexity warrants; Cursor manual capable included model or Balance Router; Claude Sonnet then an included stronger option where the picker permits | Included allowance only; slice work before consuming a higher-cost pool | deliberate | Product controls and plan boundaries in the subscription table; no source establishes universal cross-product superiority | Execute one verifiable slice at a time; return to planning with the default included model if ownership or contract boundaries are unclear |
| Debugging | specialist | Failure is reproduced or otherwise evidenced; logs can be shared under policy | Codex Sol medium/high; Cursor capable manual model or Intelligence Router if included; Claude Sonnet/Opus available in the current plan | Included allowance only; no metered fallback | deliberate | Reasoning controls in [Codex models](https://learn.chatgpt.com/docs/models), [Cursor Router](https://cursor.com/changelog/router), and [Claude model config](https://code.claude.com/docs/en/model-config) | Preserve reproduction evidence, shrink the case, and use the default included model for hypothesis testing before another escalation |
| Code review | default | Fixed diff/base, review criteria, and read-only posture; findings require file/line evidence | Codex `/review` with Terra/Sol; Cursor manual included model; Claude Sonnet or stronger included picker option | Included allowance only; excludes separately metered review products and API calls | interactive | Codex's documented `/review` command and current product model-selection sources | Partition by risk area and review with the default included model; defer unverified concerns rather than buying overage |
| Test generation | default | Expected behavior and test level are defined; generated tests will run against real behavior | Codex Luna/Terra; Cursor included Cursor model or Cost Router; Claude Haiku/Sonnet alias | Included allowance only; efficient models for scaffolding, stronger included model only for integration reasoning | interactive | Current product role/alias controls; test-quality routing remains a Gate 2 empirical question | Provide the real failure contract, generate one test slice, and use the default included model to diagnose any failure |
| DevOps/IaC | specialist | Read-only plan or sandboxed change; production mutation, secrets, and destructive commands retain explicit human approval | Codex Sol high with `/plan`; Cursor manual capable included model; Claude `opusplan`/Sonnet or included stronger option | Included allowance only; no external cloud action or API spend is implied by model selection | deliberate | Current planning and effort controls; security recommendation is policy, not benchmark evidence | Produce a patch/plan without applying it, validate locally, and route to human approval; use the default included model for documentation lookup |
| Long-context synthesis | specialist | Retrieval and source partitioning were tried first; the current picker and client expose sufficient effective context | Codex Sol with context indicator/compaction; Cursor manually select an included model with verified context; Claude Sonnet 5 direct 1M only where the current documented plan path applies | Included allowance only; do not assume API context or enable credits/on-demand | batch | [Codex models](https://learn.chatgpt.com/docs/models), [Cursor models and pricing](https://cursor.com/docs/models-and-pricing.md), and [Claude model config](https://code.claude.com/docs/en/model-config); effective client context remains dynamic | Chunk by source, preserve citations and unresolved conflicts, then synthesize with the default included model |
| Low-sensitivity local assistance | specialist | Data is classified for local processing and the bounded local model/runtime has passed the task and hardware pilot below | Local Phi-4-mini ONNX for small structured assistance, Qwen2.5-Coder-14B GGUF for bounded code, or Nomic Embed Code for retrieval; existing subscription remains the no-new-cost path | Local weights add no token fee but require existing hardware and operator time; fallback uses included subscription only | batch | Candidate model cards, licenses, and runtime evidence below; laptop quality/latency is not yet proven for the target repositories | Use the efficient included model in the already-subscribed product with approved data, or defer; never add cloud GPU/API spend silently |

### Open-weight feasibility on realistic developer hardware

Memory values below are artifact or vendor claims, not peak process memory. Context KV cache, runtime, operating system, and tool harness add memory. Except for the cited Phi-4-mini CPU result, no primary source measured the identical target Windows laptop; all 16/32 GB fit and latency statements are explicit engineering inferences that require Gate 2 measurement. The acceptable-use check reviewed each official model card and first-party repository file list for a separate model-weight usage, policy, acceptable-use, or terms file. A negative result means none was found as of 2026-07-26; it does not waive the separate license and terms of a runtime, hosted endpoint, or other service.

| Candidate and role | Parameters and quantization | Memory/runtime evidence | Context | License / acceptable-use | Coding/tool evidence | Maintenance | Security and operational burden | Setup | Privacy boundary | Quality tradeoff | Hosted-cheaper condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-20b; general local reasoning and structured tools | 20.9B total, 3.6B active; native MXFP4 | Vendor says 16 GB memory; best-supported interpretation is at least 16 GB accelerator or unified memory. A 16 GB Windows system-RAM+iGPU fit is not established; 32 GB unified/shared memory is the realistic pilot, with reduced context. CPU offload is a latency risk inference | 128K/131,072 documented | [Apache-2.0](https://huggingface.co/openai/gpt-oss-20b/blob/main/LICENSE), plus a separate [usage policy](https://huggingface.co/openai/gpt-oss-20b/blob/main/USAGE_POLICY); the policy URL returned HTTP 200 on the 2026-07-26 fix-round recheck after the independent reviewer observed HTTP 429 | Vendor describes STEM/coding reasoning, function calling, browser/Python tools, and structured output; it is not code-specific | Versioned static weights; active first-party repository and broad runtime support, but runtime/model must be pinned | Harmony formatting, reasoning/tool-channel handling, sandboxed tools, runtime patching, weight verification, and prompt-injection controls | Official paths include Ollama, Foundry, Transformers, vLLM, and llama.cpp | Local only if weights, prompts, embeddings, logs, tools, and telemetry all stay local | General reasoning and tool scope is documented, but target-laptop quality and throughput are unmeasured; memory and CPU-offload latency remain the main feasibility risks | For occasional work where operator setup plus idle hardware time costs more than metered inference; any hosted path requires explicit approval and current pricing |
| Qwen2.5-Coder-14B-Instruct GGUF; bounded code generation, repair, and explanation | 14.7B total; official Q4_K_M 8.99 GB, Q5_K_M 10.5 GB, Q6_K 12.1 GB, Q8_0 15.7 GB | Artifact size supports a 16 GB Q4_K_M reduced-context pilot as an inference; Q5_K_M/Q6_K and larger context are safer on 32 GB. No official target-laptop throughput | GGUF card states 32,768; the non-GGUF model's longer 131K path requires a different serving configuration and must not be assumed here | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct/blob/main/LICENSE); no separate first-party model-weight acceptable-use policy was found in the reviewed base/GGUF repositories as of 2026-07-26. Hosted services and runtimes retain their own terms | Code-specific generation, reasoning, repair, and agent-foundation claims; published scores are vendor evidence and are not transplanted from another size/task | Mature 2024 artifact with a newer family available; pin model revision and runtime | GGUF provenance/hash, runtime updates, local server exposure, tool sandbox, and generated-code review | llama.cpp, Ollama, or LM Studio with the official GGUF artifact | Local only under the same end-to-end boundary; an exposed local HTTP server is still a data/permission surface | Versioned 2024 code-specific artifact with 32,768 GGUF context; relative target-repository quality versus other candidates is unmeasured | For infrequent jobs, or when quality retries and operator time exceed an explicitly approved hosted endpoint's metered cost |
| Phi-4-mini-instruct ONNX; small structured assistance and tool-call pilot | 3.8B dense; ONNX Runtime GenAI CPU/GPU INT4 RTN variants | Microsoft reports 4.863 tokens/s on an Intel Core Ultra 7 165H CPU for the ONNX artifact; exact RAM and context of that run are not stated. This is the closest same-class laptop evidence, not proof of 128K feasibility | The ONNX artifact card inherits the base model's advertised 128K context; the benchmarked run's actual context is unstated | [MIT](https://huggingface.co/microsoft/Phi-4-mini-instruct-onnx/blob/main/LICENSE); no separate first-party model-weight acceptable-use policy was found in the reviewed base/ONNX repositories as of 2026-07-26. Hosted Microsoft services and ONNX Runtime software retain separate terms | The first-party [base model card](https://huggingface.co/microsoft/Phi-4-mini-instruct) reports coding/function-call evaluations and warns that the model can hallucinate function calls. The ONNX artifact card covers conversion, quantization, inherited configuration/context, and throughput, not those evaluation claims | Runtime releases were active through 2026-05; pin ONNX model/runtime versions and recheck support | Strict tool registry/schema, no direct destructive permissions, output validation, runtime patching, and generated-code review | ONNX Runtime GenAI CPU; DirectML/CUDA variants where supported | Local only if runtime, logs, tool execution, and any retrieval remain local | Plausible 16 GB pilot, but not evidence of multi-file autonomy; quantization can change outputs, and relative target-task quality is unmeasured | Keep local for repeated bounded tasks; hosted is cheaper only if local engineering/maintenance dominates a small, explicitly priced workload |
| Devstral Small 2 24B; multi-file coding specialist on stronger shared hardware | 24B dense; documented 4-bit deployment path | Official offline guidance targets 24 GB RTX 4090 at 4-bit/32K and notes CPU offload is significantly slower; model card also names a 32 GB Mac. No 16/32 GB Windows iGPU/basic-GPU evidence | 256K model context; 32K in the documented 4-bit RTX 4090 setup | Model card declares Apache-2.0; [canonical license text](https://www.apache.org/licenses/LICENSE-2.0.txt). No separate first-party model-weight acceptable-use policy was found in the reviewed card/repository as of 2026-07-26; hosted Mistral services and the serving runtime retain separate terms | Agentic multi-file/tool claims and 68% SWE-bench Verified are vendor evidence | Versioned 2025-12 artifact; serving/version lifecycle must be checked before deployment | Heavier GPU operations, serving hardening, telemetry/update controls, tool/MCP isolation, evaluation, and patching | Mistral Vibe offline flow; 4-bit/32K on RTX 4090 or documented 32 GB Mac class | Official guide describes private-network deployment; external tools, telemetry, updates, and MCP must also be disabled or controlled | Documented multi-file deployment requires materially stronger hardware than the basic laptop route; vendor benchmark does not predict relative target-repository quality | Shared/internal or rented GPU is sensible only at measured sustained utilization; otherwise a subscription path or explicit hourly rental can be cheaper |
| Nomic Embed Code; local code retrieval only | 7B; official GGUF Q4_K_M 4.08 GiB, Q5_K_M 4.72 GiB, Q6_K 5.41 GiB, Q8_0 7 GiB | Artifact sizes support 16/32 GB fit as an inference; no official target-laptop throughput | Maximum supported context is not stated in the reviewed card and must be measured, not inherited from a base model | Model card declares Apache-2.0; [canonical license text](https://www.apache.org/licenses/LICENSE-2.0.txt). No separate first-party model-weight acceptable-use policy was found in the reviewed base/GGUF repositories as of 2026-07-26; Nomic hosted services and llama.cpp retain separate terms | Code-retrieval model across six languages; benchmark is vendor/repository evidence confined to retrieval | Released training/evaluation code and versioned artifacts; pin weights, tokenizer, prefix, pooling, and runtime | Derived embeddings/indexes remain sensitive, require access control and deletion policy; local server and dependency patching remain operator work | llama.cpp embedding server using documented last-token pooling and query prefix | Useful privacy only when repository text, embeddings, index, queries, and logs remain local | Retrieval specialist only: it cannot generate, review, plan, or operate tools | Prefer an approved hosted index only when its explicit data contract and measured recurring cost beat local indexing/operations |

#### Bounded local open-weight assistants

- **Tier:** specialist
- **Recommendation:** Pilot Phi-4-mini ONNX for the 16 GB class, Qwen2.5-Coder-14B Q4_K_M on 16 GB only with reduced context, and gpt-oss-20b on 32 GB unified/shared memory; use Nomic Embed Code only for retrieval. Keep Devstral Small 2 off the basic laptop route.
- **Use when:** Inputs are low-sensitivity but local processing is preferred, the exact model/license is approved, the runtime can be patched and isolated, and a task-specific Gate 2 pilot measures quality, latency, peak memory, and failure behavior.
- **Do not use when:** The task requires frontier-level autonomous multi-file behavior, production credentials, unsupported maximum context, or an unmeasured 16 GB Windows RAM+iGPU assumption.
- **Primary evidence:** [gpt-oss-20b card](https://huggingface.co/openai/gpt-oss-20b), [Qwen2.5-Coder GGUF card](https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF), [Phi-4-mini base](https://huggingface.co/microsoft/Phi-4-mini-instruct) and [ONNX artifact cards](https://huggingface.co/microsoft/Phi-4-mini-instruct-onnx), [Devstral Small 2 card](https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512), and [Nomic Embed Code GGUF card](https://huggingface.co/nomic-ai/nomic-embed-code-GGUF)
- **Cross-check:** [llama.cpp](https://github.com/ggml-org/llama.cpp), [ONNX Runtime GenAI releases](https://github.com/microsoft/onnxruntime-genai/releases), [Mistral offline deployment](https://docs.mistral.ai/vibe/code/cli/offline-models), and each linked license text.
- **Verified:** 2026-07-26
- **Product / plan / version:** Named versioned weights and quantizations above; Windows laptop targets are 16 GB RAM+iGPU and 32 GB RAM/iGPU/basic-GPU classes, with runtime and driver captured in the pilot.
- **Confidence:** medium
- **Maturity:** experimental
- **Alternatives and tradeoffs:** Existing subscriptions avoid local setup and expose different documented model/tool surfaces but send approved content to a vendor boundary; relative target-task quality is unmeasured. Local weights remove per-token fees and can narrow data movement, but add hardware contention, slower inference, quantization loss, runtime/tool integration, and maintenance.
- **Subscription / licensing impact:** Open-weight licenses permit the described evaluation subject to their exact terms; gpt-oss also carries a separate usage policy. No separate first-party model-weight acceptable-use policy was found for the other four candidates in the reviewed first-party repositories as of 2026-07-26, but runtime and hosted-service terms still apply. No new subscription is required; hardware, power, operator time, and any optional hosting are real costs.
- **Data / permission / security impact:** Local weights do not make the system private by themselves. Disable or approve telemetry, external tools, MCP, update checks, and remote endpoints; restrict filesystem/network/tool permissions; protect prompts, indexes, traces, caches, and outputs; pin and verify artifacts; review generated code.

#### Optional shared internal or metered cloud inference

- **Tier:** specialist
- **Recommendation:** Consider a shared internal server only after the laptop pilot shows repeatable demand; use a cloud GPU only as an explicitly approved, time-bounded experiment with shutdown, storage, network, and data controls.
- **Use when:** Multiple approved users have measurable sustained demand, stronger hardware materially changes the result, and ownership for patching, access, logs, incident response, and cost exists.
- **Do not use when:** A current subscription satisfies the task, sensitive data lacks an approved hosting contract, utilization is unknown, or the workload can leave paid resources idle.
- **Primary evidence:** [Runpod public pricing](https://www.runpod.io/pricing) and [Mistral offline deployment requirements](https://docs.mistral.ai/vibe/code/cli/offline-models)
- **Cross-check:** Candidate model cards, exact license texts, and [llama.cpp runtime support](https://github.com/ggml-org/llama.cpp)
- **Verified:** 2026-07-26
- **Product / plan / version:** Runpod public on-demand Pod list observed 2026-07-26, quoting the page's Community Cloud–Secure Cloud per-hour pairs as ranges: 24 GB RTX A5000 USD 0.16–0.27/hour, L4 USD 0.39–0.44/hour, RTX 3090 USD 0.22–0.46/hour, and RTX 4090 USD 0.34–0.69/hour; 48 GB A40 USD 0.35–0.44/hour, RTX A6000 USD 0.33–0.49/hour, RTX 6000 Ada USD 0.74–0.77/hour, and L40S USD 0.79–0.99/hour. Community can be above or below Secure for a GPU, so the range is not a tier ranking. The public page does not establish identical regional availability; prices are dynamic and exclude storage, network, idle time, and administration.
- **Confidence:** medium
- **Maturity:** experimental
- **Alternatives and tradeoffs:** Existing subscriptions are the zero-new-spend default. A local workstation has predictable control but capital and maintenance cost. Cloud rental accelerates short pilots but creates data, credential, egress, shutdown, and variable-price risk. Shared hosting amortizes load only when utilization is real.
- **Subscription / licensing impact:** This is optional incremental infrastructure, never a fallback that activates automatically. Record hourly GPU, storage, egress, idle, and operator costs and obtain approval before provisioning.
- **Data / permission / security impact:** Treat the server as production infrastructure: private networking, least-privilege identity, encrypted storage/transit, secret isolation, tenant separation, audit, retention/deletion, patched images, artifact verification, bounded tools, and enforced shutdown are required.

### Gate 2 routing pilots

| Pilot | Evidence to capture | Decision |
| --- | --- | --- |
| Subscription picker and allowance audit | Actual models, aliases, effective context indicator, administrator restrictions, included pools/limits, and opt-in overage state for each existing account | Confirm or narrow every subscription route before use |
| Ten representative repository tasks | Acceptance result, human correction, elapsed time, consumed allowance where exposed, context/compaction behavior, and permission incidents for at least one task in each routing row | Keep task-conditioned routes; reject any unsupported universal default |
| 16 GB and 32 GB local runs | Exact laptop/driver/runtime/model revision and quant; cold load, peak memory, tokens/second, task outcome, tool-call validity, context size, power/thermal behavior, and failure messages | Approve only bounded models/tasks that meet locally defined thresholds |
| Shared/cloud comparison | Same accepted tasks plus full hourly, storage, egress, idle, and operator cost; data-flow and license review | Provision nothing unless measured demand and governance beat the subscription/local alternatives |

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

Claude Code also separates model guidance from enforced runtime policy. `CLAUDE.md`, rules, skills, and memory influence model behavior; settings, permission rules, sandboxing, managed policy, and blocking hooks provide distinct controls with different scope and failure behavior.

#### Layered Claude Code settings and additive `CLAUDE.md`

- **Tier:** default
- **Recommendation:** Put enforceable runtime defaults in the narrowest appropriate Claude Code settings scope and durable repository guidance in checked-in `CLAUDE.md` or `.claude/rules`. Apply the documented settings order—managed, CLI, local, project, user—but treat discovered `CLAUDE.md` files as concatenated context from broad to specific, not as an override chain.
- **Use when:** A repository needs reviewable instructions and a developer or organization needs predictable local runtime configuration without conflating guidance with enforcement.
- **Do not use when:** The content is a secret, a one-time prompt, a security control that must not depend on model compliance, or a host-specific local instruction that should not be committed.
- **Primary evidence:** [Claude Code settings](https://code.claude.com/docs/en/settings) and [Claude Code memory and `CLAUDE.md` loading](https://code.claude.com/docs/en/memory)
- **Cross-check:** [Features overview and extension precedence](https://code.claude.com/docs/en/features-overview)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current Claude Code local surfaces; committed project configuration also reaches web sessions, while user-local files do not.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** A prompt is cheaper for one task. Skills are better for on-demand procedures. Managed policy is better for non-overridable controls. Large always-loaded instruction files consume context and can conflict; path-scoped rules reduce that cost.
- **Subscription / licensing impact:** Native behavior with no additional license; managed distribution and administration are plan- and contract-dependent.
- **Data / permission / security impact:** Repository instructions are untrusted prompt context and can be changed by contributors. Managed `CLAUDE.md` cannot be excluded, but model guidance still is not an enforcement boundary. Never store credentials in settings, `CLAUDE.md`, or rules.

#### Claude Code skills, plugins, MCP, and hooks by responsibility

- **Tier:** specialist
- **Recommendation:** Use a skill for on-demand procedure, a plugin to distribute a reviewed bundle, MCP only for a bounded live-service need, and a hook for a deterministic lifecycle action. Keep source-system authorization, Claude Code permissions, sandboxing, and CI independent from these extension layers.
- **Use when:** Static repository guidance is insufficient, the extension owner and exact permissions are known, and behavior can be validated on every required local or hosted surface.
- **Do not use when:** A repository file or ordinary script is sufficient, credentials cannot be least-privileged, third-party code or MCP content is unreviewed, or a hook is expected to be the sole boundary for sensitive external writes.
- **Primary evidence:** [Skills](https://code.claude.com/docs/en/skills), [plugins](https://code.claude.com/docs/en/plugins), [MCP](https://code.claude.com/docs/en/mcp), and [hooks](https://code.claude.com/docs/en/hooks)
- **Cross-check:** [Feature selection and precedence](https://code.claude.com/docs/en/features-overview) and [plugin marketplace controls](https://code.claude.com/docs/en/plugin-marketplaces)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current Claude Code CLI and local integrations; committed project extensions may reach web, while unsupported local configuration does not. Prompt and agent hooks have distinct maturity and blocking semantics.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Checked-in documentation is simpler and auditable but lacks live data. Direct APIs provide explicit contracts but require integration code. CI runs later but is independent of the agent loop. Plugins improve distribution while expanding supply-chain and update risk.
- **Subscription / licensing impact:** Native extension loading is part of Claude Code where supported. Each MCP service, marketplace, model, or external API has independent licensing, billing, and authentication.
- **Data / permission / security impact:** Skill `allowed-tools` can grant tools without per-use approval during invocation; MCP tools expose external data and authority; command hooks run with the user's full permissions outside the agent sandbox. Review and pin extension code, scope OAuth, prefer read-only servers first, sanitize hook input, and account for non-blocking HTTP failures and asynchronous hooks.

#### Repository artifacts over compaction and checkpoint assumptions

- **Tier:** default
- **Recommendation:** Keep requirements, decisions, and accepted state in version-controlled artifacts; use session resume, auto memory, compaction, and checkpoints only as convenience layers. Auto memory is machine-local and repository-scoped, is shared by every worktree and subdirectory in the same Git repository, and loads only the first 200 lines or 25KB of `MEMORY.md`, whichever comes first, at session start. Before handoff or compaction, write the authoritative state explicitly and name any surface-specific continuation step.
- **Use when:** Work can span context limits, restarts, local/web movement, or multiple people and needs reviewable recovery independent of one transcript; use auto memory only for non-authoritative repository learnings whose sharing across local worktrees is acceptable.
- **Do not use when:** A lossy compacted summary, machine-local auto memory, or checkpoint is being treated as a complete audit log, backup, cross-machine or cloud handoff, or replacement for Git; do not assume content beyond the `MEMORY.md` startup limit is present.
- **Primary evidence:** [Sessions and branching](https://code.claude.com/docs/en/sessions), [context-window and compaction behavior](https://code.claude.com/docs/en/context-window), and [checkpointing](https://code.claude.com/docs/en/checkpointing)
- **Cross-check:** [Memory](https://code.claude.com/docs/en/memory), [web/local handoff](https://code.claude.com/docs/en/claude-code-on-the-web), and [IDE continuation](https://code.claude.com/docs/en/ide-integrations)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current Claude Code local sessions, VS Code, Desktop, and eligible web sessions. Histories and handoff capabilities differ by surface.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Git commits, issue records, and explicit handoff files cost more discipline but are portable and reviewable. `/resume`, `/branch`, `--fork-session`, `--cloud`, `--teleport`, and Remote Control reduce restart friction but preserve different subsets of state and have authentication or surface constraints.
- **Subscription / licensing impact:** Local session management is native. Web handoff and Remote Control require eligible subscription authentication; external work systems can add licenses.
- **Data / permission / security impact:** Local transcripts are plaintext and default to 30-day cleanup. Auto memory is generated local state: it is not shared to another machine or cloud environment, but all worktrees in one repository share it, so stale or branch-specific notes can pollute sibling worktrees; only the first 200 lines or 25KB of `MEMORY.md` load initially and topic files load on demand. Compaction is lossy: system context and selected root guidance are restored, while path-scoped/nested guidance may not return until matching files are read. Checkpoints cover direct Claude file-edit tools but not Bash changes, subagent edits, or external changes; local and web histories are not one universal store.

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

Claude Code distinguishes subagents within one orchestrated session from experimental agent teams whose members are independent sessions with peer communication.

#### Bounded Claude Code subagents with optional worktree isolation

- **Tier:** specialist
- **Recommendation:** Use a named Claude Code subagent for independent exploration, planning, testing, or review; narrow its tools and permissions and require the parent to validate its returned summary. Give any parallel writer its own worktree and explicit file ownership.
- **Use when:** A subtask has independent inputs and outputs, benefits from isolated context, and can be recombined through a concise evidence-backed result.
- **Do not use when:** Work requires frequent shared decisions, multiple agents would edit the same files, the subtask depends on the full parent conversation, or duplicated model usage exceeds the elapsed-time benefit.
- **Primary evidence:** [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- **Cross-check:** [Claude Code worktrees](https://code.claude.com/docs/en/worktrees)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current Claude Code built-in and custom subagents; managed, CLI, project, user, and plugin definitions have documented precedence. Worktree isolation requires a Git repository.
- **Confidence:** high
- **Maturity:** stable
- **Alternatives and tradeoffs:** One strong agent avoids coordination and extra tokens. A skill is cheaper for a repeatable single-agent procedure. Independent local or web sessions provide stronger isolation but require explicit handoff and integration.
- **Subscription / licensing impact:** Native where Claude Code is available, but every subagent consumes model usage and concurrent work can exhaust subscription allowances or increase metered API cost.
- **Data / permission / security impact:** Subagents have isolated context and configurable tool access but are not an independent trust boundary; they can inherit parent capabilities and access configured MCP servers. Explore and Plan agents omit some normal project context. Worktree isolation separates working files but shares repository metadata, and returned summaries remain untrusted until cross-checked.

#### Experimental Claude Code agent teams

- **Tier:** watchlist
- **Recommendation:** Keep Claude Code agent teams out of the default workflow. Pilot them only for a bounded, parallel, high-value problem with independent ownership, a single lead, a shared task contract, explicit integration, and recovery that does not depend on restoring teammate sessions.
- **Use when:** Teammates must communicate directly, tasks are genuinely parallel, duplicated usage is acceptable, and the work can be partitioned without same-file writes.
- **Do not use when:** Sequential work, small tasks, nested teams, same-file editing, reliable resume/rewind of all teammates, or low coordination overhead is required.
- **Primary evidence:** [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)
- **Cross-check:** [Features overview maturity comparison](https://code.claude.com/docs/en/features-overview)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current Claude Code agent teams are explicitly experimental, disabled by default, and enabled with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- **Confidence:** high
- **Maturity:** experimental
- **Alternatives and tradeoffs:** Stable subagents are cheaper and simpler for focused delegation but report only to the parent. Independent sessions or worktrees isolate writers without team coordination. Agent teams add peer messaging and a shared task list at the cost of more tokens and coordination failure modes.
- **Subscription / licensing impact:** No separate license is documented, but each teammate is a full Claude Code session and token usage can be substantially higher; plan/provider limits remain account-dependent.
- **Data / permission / security impact:** Teammates receive the lead's permission mode at spawn, cannot be nested, and can race on shared files or tasks. In-process teammates do not return after resume or rewind; one team per session, fixed lead, shutdown/task-state lag, and documented pane limitations require an external recovery record.

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

#### Claude Code permissions plus two-part fail-closed sandboxing

- **Tier:** default
- **Recommendation:** Keep Claude Code in default/manual or Plan permission mode, define narrow deny/ask/allow rules, and enable Bash sandboxing with least-privilege filesystem and network policy on macOS, Linux, or WSL2. A fail-closed sandbox requirement needs both `sandbox.failIfUnavailable: true`, so missing dependencies or unsupported startup becomes a hard failure, and `sandbox.allowUnsandboxedCommands: false`, so commands blocked by sandbox restrictions cannot retry through `dangerouslyDisableSandbox`. Place native Windows or untrusted-code execution inside an independently isolated VM or container.
- **Use when:** Local coding needs routine read access and bounded commands while edits, network domains, external tools, and sensitive paths remain reviewable or explicitly denied.
- **Do not use when:** Native Windows is being treated as a supported built-in sandbox host, `bypassPermissions` would run on a normal workstation, broad domains or privileged sockets are exposed, or the sandbox is expected to be complete isolation.
- **Primary evidence:** [Claude Code permissions](https://code.claude.com/docs/en/permissions) and [sandboxed Bash](https://code.claude.com/docs/en/sandboxing)
- **Cross-check:** [Claude Code security](https://code.claude.com/docs/en/security) and [managed security settings](https://code.claude.com/docs/en/settings)
- **Verified:** 2026-07-26
- **Product / plan / version:** Current local Claude Code; built-in sandbox support is documented for macOS, Linux, and WSL2, not native Windows. Permission rules apply to tools generally; the OS sandbox applies to Bash and child processes.
- **Confidence:** high
- **Maturity:** evolving
- **Alternatives and tradeoffs:** Manual approvals provide visibility but add friction and are vulnerable to habituation. The sandbox can auto-allow contained commands but requires platform support and careful policy. A dedicated VM/container is operationally heavier but supplies a stronger host boundary for untrusted input.
- **Subscription / licensing impact:** Native permission and sandbox controls do not require a separate Claude Code license; VM/container infrastructure and enterprise endpoint management can add cost.
- **Data / permission / security impact:** Deny rules take precedence over ask and allow, and permissions are enforced by the client rather than the model. `failIfUnavailable` covers failure to initialize the sandbox; it does not disable the separate unsandboxed retry path. `allowUnsandboxedCommands: false` disables that escape hatch, so commands must run sandboxed or be explicitly listed in `excludedCommands`. The sandbox remains defense in depth, not complete isolation: broad domain allowlists, TLS/domain-fronting behavior, readable credential paths, and privileged Unix sockets can weaken it. Pair it with source-system authorization, credential isolation, review, audit, and CI.

## Balanced scorecard and eval plan

To be researched.

## Prioritized roadmap

To be researched.

## Emerging watchlist

#### Qwen3-Coder-Next for future shared inference

- **Tier:** watchlist
- **Recommendation:** Track Qwen3-Coder-Next as a future shared-server coding specialist, not as a 16/32 GB laptop recommendation.
- **Use when:** A later Gate has a conservative 64 GB-class accelerator/unified-memory environment, begins with reduced context, measures actual peak memory and headroom, uses a pinned compatible runtime, and runs an isolated coding/tool pilot against the accepted subscription baseline.
- **Do not use when:** Only 48 GB is available: the Q4_K_M weights alone are 48.4 GB before runtime, KV cache, operating-system, and tool-harness overhead. Do not assume full advertised context or mistake sparse active parameters for total weight footprint.
- **Primary evidence:** The official [Qwen3-Coder-Next GGUF card](https://huggingface.co/Qwen/Qwen3-Coder-Next-GGUF) reports 80B total/3B active parameters, 262,144 native context, and official Q4_K_M at 48.4 GB and Q5_K_M at 56.7 GB.
- **Cross-check:** [Qwen3-Coder repository](https://github.com/QwenLM/Qwen3-Coder), the model card's Apache-2.0 metadata, and the [canonical Apache-2.0 license text](https://www.apache.org/licenses/LICENSE-2.0.txt)
- **Verified:** 2026-07-26
- **Product / plan / version:** Qwen3-Coder-Next-GGUF current public artifact; runtime, revision, quantization, context, and hardware must be recorded by any future pilot.
- **Confidence:** high
- **Maturity:** experimental
- **Alternatives and tradeoffs:** Qwen2.5-Coder-14B is a 14.7B 2024 artifact with official Q4_K_M at 8.99 GB and 32,768 GGUF context; Devstral Small 2 has a documented 24 GB GPU/32K path; gpt-oss-20b has a vendor-stated 16 GB memory footprint. Relative target-task quality among these candidates is unmeasured. Existing subscriptions avoid shared-serving operations.
- **Subscription / licensing impact:** Apache-2.0 permits evaluation subject to its terms, but suitable shared hardware, power, storage, and administration are incremental costs. No deployment is authorized by watchlist status.
- **Data / permission / security impact:** A shared model server creates a multi-user data boundary. Require identity, tenant isolation, encrypted transport/storage, prompt and log retention controls, restricted tools, verified weights, patched runtimes, and review of generated code before any pilot.

## Rejected or overrated options

To be researched.

## Research questions and coverage

| ID | Question | Owner task | Status | Blueprint section |
| --- | --- | --- | --- | --- |
| W1.1 | How do Codex, Cursor, and Claude Code support CLI, IDE, app, web, background, and remote execution? | Tasks 2-4 | verified | Codex profile; Cursor profile; Claude Code profile |
| W1.2 | How do Codex, Cursor, and Claude Code support instructions and configuration? | Tasks 2-4 | evidence gap | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.3 | How do Codex, Cursor, and Claude Code provide permissions and sandboxing? | Tasks 2-4 | verified | Security, permission, audit, and recovery analysis |
| W1.4 | How do Codex, Cursor, and Claude Code support skills, plugins, MCP, and hooks? | Tasks 2-4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.5 | How do Codex, Cursor, and Claude Code handle context, memory, compaction, and handoff? | Tasks 2-4 | evidence gap | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.6 | How do Codex, Cursor, and Claude Code support single-agent, subagent, and multi-agent behavior? | Tasks 2-4, 6 | verified | Single-agent and multi-agent pattern catalog |
| W1.7 | How do Codex, Cursor, and Claude Code provide team and managed-policy options? | Tasks 2-4 | evidence gap | Cross-layer tooling matrix |
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
| W1.CL1 | Which Claude plans include Claude Code, and where do shared subscription usage, extra usage, API credentials, provider credentials, or current Enterprise billing change the cost boundary? | Task 4 | evidence gap | Claude Code profile |
| W1.CL2 | Which Claude Code CLI, VS Code, JetBrains, Desktop, web, mobile, background, and hosted execution surfaces are documented? | Task 4 | verified | Claude Code profile |
| W1.CL3 | What is the Claude Code settings precedence across managed sources, CLI, local, project, and user scopes, including merged permission rules? | Task 4 | verified | Claude Code profile; Cross-layer tooling matrix |
| W1.CL4 | How are managed, user, project, local, parent, and nested `CLAUDE.md` instructions discovered, ordered, imported, and excluded? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL5 | How do Claude Code permission rules and modes govern reads, edits, Bash, network, web, MCP, and bypass behavior? | Task 4 | verified | Security, permission, audit, and recovery analysis |
| W1.CL6 | Which Claude Code sandbox platforms, filesystem and network boundaries, auto-allow behavior, failure modes, and fail-closed controls are documented? | Task 4 | verified | Security, permission, audit, and recovery analysis |
| W1.CL7 | Which Claude Code hook types, lifecycle events, blocking semantics, merge behavior, and execution-security limits are documented? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL8 | How do Claude Code skills load, inherit tools, isolate context, and differ from durable instructions? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL9 | How do Claude Code plugins package and distribute skills, subagents, hooks, MCP, and related components, and which marketplace controls reduce supply-chain risk? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL10 | How do local, project, user, plugin, connector, and managed Claude Code MCP scopes, precedence, authentication, and policy differ? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL11 | How do `CLAUDE.md`, rules, auto memory, per-repository storage, worktree sharing, and startup load limits affect remembered context? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL12 | What do Claude Code sessions, compaction, resume/branch, checkpoints, web/local continuation, and surface-specific histories preserve or lose? | Task 4 | verified | Instructions, context, memory, skills, plugins, MCP, and hooks |
| W1.CL13 | When do stable Claude Code subagents help, what context and tools do they receive, and when is worktree isolation required? | Task 4 | verified | Single-agent and multi-agent pattern catalog |
| W1.CL14 | Which Claude Code agent-team behaviors and limitations are documented, and why must the pattern remain experimental? | Task 4 | verified | Single-agent and multi-agent pattern catalog |
| W1.CL15 | How do Claude Code web, Remote Control, Agent View, and local/web handoff differ in execution location, eligibility, persistence, and compliance boundary? | Task 4 | evidence gap | Claude Code profile |
| W1.CL16 | Which endpoint-managed and server-managed Claude Code controls exist, what is their precedence, and where can client-side or provider boundaries weaken them? | Task 4 | verified | Claude Code profile; Cross-layer tooling matrix |
| W1.CL17 | What do consumer, commercial, API/provider, local-transcript, cloud-session, Enterprise, ZDR, and covered-model retention terms guarantee or exclude? | Task 4 | evidence gap | Claude Code profile |
| W1.CL18 | What is the latest first-party Claude Code release, and which unversioned or fast-moving capabilities require a Gate 2 freshness check? | Task 4 | verified | Claude Code profile |
| W2.1 | Which models are included in existing subscriptions? | Task 5 | evidence gap | Model and open-source routing matrix |
| W2.2 | What task-specific routing is appropriate? | Task 5 | verified | Model and open-source routing matrix |
| W2.3 | What are the quality, latency, context, and cost tradeoffs? | Task 5 | evidence gap | Model and open-source routing matrix |
| W2.4 | Which open-source specialist models are viable candidates? | Task 5 | verified | Model and open-source routing matrix |
| W2.5 | What is feasible for hosted, internal-server, cloud-GPU, and laptop deployment? | Task 5 | evidence gap | Model and open-source routing matrix |
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
| SRC-071 | Anthropic | https://code.claude.com/docs/en/overview | Official product documentation | Current Claude Code surfaces | 2026-07-26 | Claude Code profile | Defines CLI, IDE, Desktop, web, and mobile availability at a high level; not evidence of feature parity. |
| SRC-072 | Anthropic | https://code.claude.com/docs/en/platforms | Official product documentation | Current platform comparison | 2026-07-26 | Claude Code profile | Separates the fullest CLI surface from IDE, Desktop, web, and mobile capabilities. |
| SRC-073 | Anthropic | https://code.claude.com/docs/en/claude-code-on-the-web | Official product and security documentation | Claude Code on the web research preview | 2026-07-26 | Claude Code profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Documents Anthropic-managed VMs, GitHub access, configuration transfer limits, web/local handoff, and ZDR incompatibility. |
| SRC-074 | Anthropic | https://code.claude.com/docs/en/remote-control | Official product and security documentation | Remote Control research preview | 2026-07-26 | Claude Code profile | Local execution with remote UI and transcript synchronization; the page conflicts on “all plans” versus named paid plans. |
| SRC-075 | Anthropic | https://claude.com/pricing | Official pricing page | Current Claude paid plans and Claude Code inclusion | 2026-07-26 | Claude Code profile | Says Claude Code is included with paid plans and distinguishes current Enterprise usage-based consumption. |
| SRC-076 | Anthropic | https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan | Official Help Center | Pro and Max Claude Code access | 2026-07-26 | Claude Code profile | Subscription usage is shared with Claude; `ANTHROPIC_API_KEY` selects separately billed API usage. |
| SRC-077 | Anthropic | https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan | Official Help Center | Team and Enterprise Claude Code access | 2026-07-26 | Claude Code profile | Distinguishes Team seats and current versus legacy Enterprise access and usage models. |
| SRC-078 | Anthropic | https://support.claude.com/en/articles/11526368-how-am-i-billed-for-my-enterprise-plan | Official Help Center | Current and legacy Enterprise billing | 2026-07-26 | Claude Code profile | Current usage-based Enterprise includes access but bills usage separately at API rates. |
| SRC-079 | Anthropic | https://platform.claude.com/docs/en/about-claude/pricing | Official API documentation | Anthropic API pricing | 2026-07-26 | Claude Code profile | Cross-checks that API consumption is a separate metered billing path. |
| SRC-080 | Anthropic | https://code.claude.com/docs/en/desktop | Official product documentation | Current Claude Code Desktop | 2026-07-26 | Claude Code profile | Separates local and cloud sessions, terminal availability, settings, environment, and execution boundaries. |
| SRC-081 | Anthropic | https://code.claude.com/docs/en/ide-integrations | Official product documentation | Current VS Code integration | 2026-07-26 | Claude Code profile; Instructions, context, memory, skills, plugins, MCP, and hooks | Documents IDE capability and web-to-local continuation without reverse change synchronization. |
| SRC-082 | Anthropic | https://code.claude.com/docs/en/settings | Official configuration and administration documentation | Current Claude Code local and managed settings | 2026-07-26 | Claude Code profile; Cross-layer tooling matrix; Security, permission, audit, and recovery analysis | Defines managed, CLI, local, project, and user precedence plus managed-source and permission-rule semantics. |
| SRC-083 | Anthropic | https://code.claude.com/docs/en/server-managed-settings | Official administration documentation | Team and Enterprise server-managed settings | 2026-07-26 | Claude Code profile | Documents minimum versions, client-side limitations, policy refresh behavior, and inability to distribute MCP servers. |
| SRC-084 | Anthropic | https://code.claude.com/docs/en/data-usage | Official data and privacy documentation | Consumer, commercial, API/provider, local, and web Claude Code data | 2026-07-26 | Claude Code profile | Separates training defaults and consumer, commercial, ZDR, feedback, local-transcript, and cloud-session retention. |
| SRC-085 | Anthropic | https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data | Official Privacy Center | Commercial organization and API data | 2026-07-26 | Claude Code profile | Cross-checks commercial product/API retention and enumerated exceptions; contract scope remains controlling. |
| SRC-086 | Anthropic | https://support.claude.com/en/articles/10440198-configure-custom-data-retention-controls-for-enterprise-plans | Official Help Center | Enterprise chat and project retention controls | 2026-07-26 | Claude Code profile | Applies to Enterprise product objects and must not be collapsed into Claude Code/API retention. |
| SRC-087 | Anthropic | https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-covered-models | Official Privacy Center | Designated covered models effective 2026-06-09 | 2026-07-26 | Claude Code profile | Requires 30-day prompt/output retention for listed Mythos-class and future covered models even on listed ZDR platforms; not applicable to every model. |
| SRC-088 | Anthropic | https://code.claude.com/docs/en/changelog | Official versioned product changelog | Claude Code through 2.1.220 dated 2026-07-25 | 2026-07-26 | Claude Code profile | Current release and date verified; page is generated from the first-party repository changelog. |
| SRC-089 | Anthropic | https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md | Public first-party changelog | Claude Code public repository main branch | 2026-07-26 | Claude Code profile | Repository cross-check for release freshness; main is moving. |
| SRC-090 | Anthropic | https://code.claude.com/docs/en/features-overview | Official product documentation | Current Claude Code extension layers | 2026-07-26 | Cross-layer tooling matrix; Instructions, context, memory, skills, plugins, MCP, and hooks; Single-agent and multi-agent pattern catalog | Distinguishes instructions, skills, MCP, subagents, agent teams, hooks, and plugin packaging, including precedence and maturity. |
| SRC-091 | Anthropic | https://code.claude.com/docs/en/permissions | Official permission documentation | Current Claude Code tool authorization | 2026-07-26 | Cross-layer tooling matrix; Security, permission, audit, and recovery analysis | Documents permission modes, merged rules, tool coverage, and separation from Bash sandboxing. |
| SRC-092 | Anthropic | https://code.claude.com/docs/en/sandboxing | Official security documentation | Built-in sandbox on macOS, Linux, and WSL2 | 2026-07-26 | Cross-layer tooling matrix; Security, permission, audit, and recovery analysis | Separates startup hard failure through `failIfUnavailable` from strict sandbox retry behavior through `allowUnsandboxedCommands: false`; also documents platform, filesystem, network, and isolation limits. |
| SRC-093 | Anthropic | https://code.claude.com/docs/en/memory | Official product documentation | Current `CLAUDE.md`, rules, and auto memory | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Defines instruction discovery, concatenation, lazy loading, exclusion, auto-memory storage, worktree sharing, and load limits. |
| SRC-094 | Anthropic | https://code.claude.com/docs/en/skills | Official product and security documentation | Current Claude Code skills | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents progressive loading, scopes, tool grants, isolated context, and managed distribution. |
| SRC-095 | Anthropic | https://code.claude.com/docs/en/plugins | Official product documentation | Current Claude Code plugins | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents packaging of skills, subagents, hooks, MCP, and related components. |
| SRC-096 | Anthropic | https://code.claude.com/docs/en/mcp | Official integration and security documentation | Current Claude Code MCP | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Defines scope precedence, approval, authentication, managed controls, secrets, and untrusted-server risks. |
| SRC-097 | Anthropic | https://code.claude.com/docs/en/hooks | Official product and security documentation | Current Claude Code hooks | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents command, HTTP, MCP, prompt, and agent hooks, merge behavior, blocking semantics, and execution risk. |
| SRC-098 | Anthropic | https://code.claude.com/docs/en/plugin-marketplaces | Official administration and security documentation | Current plugin marketplace controls | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents known-marketplace restrictions, side-loading controls, allowlists, and external archive trust. |
| SRC-099 | Anthropic | https://code.claude.com/docs/en/sessions | Official product documentation | Current local Claude Code sessions | 2026-07-26 | Cross-layer tooling matrix; Instructions, context, memory, skills, plugins, MCP, and hooks | Defines continue, resume, branch/fork, local transcript storage, cleanup, and settings reload boundaries. |
| SRC-100 | Anthropic | https://code.claude.com/docs/en/context-window | Official product documentation | Current context and compaction behavior | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Documents automatic/manual compaction and which guidance is re-injected or lazy-reloaded afterward. |
| SRC-101 | Anthropic | https://code.claude.com/docs/en/checkpointing | Official product documentation | Current Claude Code checkpoints | 2026-07-26 | Instructions, context, memory, skills, plugins, MCP, and hooks | Defines rewind scope and exclusions for Bash, subagent, and external changes; not a VCS replacement. |
| SRC-102 | Anthropic | https://code.claude.com/docs/en/sub-agents | Official product documentation | Current built-in and custom subagents | 2026-07-26 | Cross-layer tooling matrix; Single-agent and multi-agent pattern catalog | Documents isolated context, definition precedence, permissions, background work, memory, hooks, MCP, skills, and worktree isolation. |
| SRC-103 | Anthropic | https://code.claude.com/docs/en/agent-teams | Official experimental product documentation | Current Claude Code agent teams | 2026-07-26 | Cross-layer tooling matrix; Single-agent and multi-agent pattern catalog | Explicitly experimental and disabled by default; documents peer coordination, cost, resume, nesting, and ownership limitations. |
| SRC-104 | Anthropic | https://code.claude.com/docs/en/worktrees | Official product documentation | Current Claude Code Git worktree isolation | 2026-07-26 | Single-agent and multi-agent pattern catalog | Documents CLI, Desktop, and subagent worktree isolation and cleanup behavior. |
| SRC-105 | Anthropic | https://code.claude.com/docs/en/security | Official security documentation | Current Claude Code local and web threat boundaries | 2026-07-26 | Claude Code profile; Security, permission, audit, and recovery analysis | Cross-checks prompt-injection risk, review, permissions, sandboxing, hosted isolation, network, credentials, and audit controls. |
| SRC-106 | Anthropic | https://code.claude.com/docs/en/agent-view | Official research-preview product documentation | Agent View in Claude Code 2.1.139+ | 2026-07-26 | Claude Code profile | Local supervisor runs full background sessions without an attached terminal; host shutdown stops them and each session consumes quota. |
| SRC-107 | Anthropic | https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans | Official Help Center | Pro, Max 5x, and Max 20x usage credits | 2026-07-26 | Claude Code profile | Optional prepaid credits continue Claude and Claude Code after included limits and are billed separately at standard API rates with user-configured spending controls. |
| SRC-108 | Anthropic | https://support.claude.com/en/articles/12005970-manage-usage-credits-for-team-and-seat-based-enterprise-plans | Official Help Center | Team and seat-based Enterprise usage credits | 2026-07-26 | Claude Code profile | Team prepays standard-API-rate overage and seat-based Enterprise pays monthly actual overage after seat limits; current usage-based Enterprise instead meters from the first token. |
| SRC-109 | OpenAI | https://learn.chatgpt.com/docs/models | Official product documentation | Current Codex model roles, selection, effort, and client boundaries | 2026-07-26 | Cross-layer tooling matrix; Model and open-source routing matrix | Documents Sol, Terra, Luna, and Spark plan availability plus local selector/effort controls and the fixed cloud-task default; moving picker contract. |
| SRC-110 | Cursor | https://cursor.com/changelog/router | Official product changelog | Cursor Router announcement dated 2026-07-22 | 2026-07-26 | Cross-layer tooling matrix; Model and open-source routing matrix | Documents Cost, Balance, and Intelligence modes, organization rollout, routed-rate billing, and hidden routed-model behavior; Individual entitlement remains unstated. |
| SRC-111 | Anthropic | https://code.claude.com/docs/en/model-config | Official product and administration documentation | Current Claude Code aliases, defaults, effort, context, and restrictions | 2026-07-26 | Cross-layer tooling matrix; Model and open-source routing matrix | Defines dynamic aliases, `opusplan`, plan defaults, direct 1M conditions, picker controls, and managed model restrictions; moving contract. |
| SRC-112 | OpenAI | https://huggingface.co/openai/gpt-oss-20b | Official model card | gpt-oss-20b public weights | 2026-07-26 | Model and open-source routing matrix | Parameters, MXFP4, context, memory claim, tool/reasoning scope, Harmony requirement, and setup options; vendor evidence. |
| SRC-113 | OpenAI | https://huggingface.co/openai/gpt-oss-20b/blob/main/LICENSE | First-party license text | gpt-oss-20b license on current model revision | 2026-07-26 | Model and open-source routing matrix | Apache License 2.0 text; exact revision must be pinned for deployment. |
| SRC-114 | OpenAI | https://huggingface.co/openai/gpt-oss-20b/blob/main/USAGE_POLICY | First-party usage-policy text | gpt-oss usage policy on current model revision | 2026-07-26 | Model and open-source routing matrix | Separate usage restrictions that accompany the open-weight release; fix-round recheck returned HTTP 200 after the independent reviewer encountered HTTP 429. |
| SRC-115 | OpenAI | https://github.com/openai/gpt-oss | First-party source repository | gpt-oss reference code and runtime guidance | 2026-07-26 | Model and open-source routing matrix | Cross-check for Harmony, inference paths, implementation maintenance, and security-sensitive integration surface. |
| SRC-116 | Qwen | https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF | Official model and artifact card | Qwen2.5-Coder-14B-Instruct official GGUF quantizations | 2026-07-26 | Model and open-source routing matrix | Parameters, GGUF context, quantization sizes, setup, and code-specialist claims; benchmark claims are vendor evidence. |
| SRC-117 | Qwen | https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct/blob/main/LICENSE | First-party license text | Qwen2.5-Coder-14B-Instruct license on current model revision | 2026-07-26 | Model and open-source routing matrix | Apache License 2.0 text; exact revision must be pinned. |
| SRC-118 | Microsoft | https://huggingface.co/microsoft/Phi-4-mini-instruct-onnx | Official model and artifact card | Phi-4-mini-instruct ONNX INT4 variants | 2026-07-26 | Model and open-source routing matrix | Conversion, quantization, inherited configuration/context, setup, and Intel Core Ultra CPU throughput; quantized outputs can differ and the run's memory/context is incomplete. |
| SRC-119 | Microsoft | https://huggingface.co/microsoft/Phi-4-mini-instruct-onnx/blob/main/LICENSE | First-party license text | Phi-4-mini-instruct ONNX license on current model revision | 2026-07-26 | Model and open-source routing matrix | MIT License text; exact artifact revision must be pinned. |
| SRC-120 | Microsoft | https://github.com/microsoft/onnxruntime-genai/releases | First-party runtime release history | ONNX Runtime GenAI releases through 2026-05 | 2026-07-26 | Model and open-source routing matrix | Cross-check for active runtime maintenance and the need to pin/patch a compatible release. |
| SRC-121 | Mistral AI | https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512 | Official model card | Devstral Small 2 24B Instruct 2512 | 2026-07-26 | Model and open-source routing matrix | Parameters, context, Mac memory class, tool/multi-file scope, and SWE-bench claim; benchmark is vendor evidence. |
| SRC-122 | Apache Software Foundation | https://www.apache.org/licenses/LICENSE-2.0.txt | Canonical license text | Apache License 2.0 | 2026-07-26 | Model and open-source routing matrix; Emerging watchlist | Exact license text cross-checked with Apache-2.0 metadata on the Devstral Small 2, Nomic Embed Code, and Qwen3-Coder-Next model cards. |
| SRC-123 | Mistral AI | https://docs.mistral.ai/vibe/code/cli/offline-models | Official deployment documentation | Current Mistral Vibe offline-model deployment | 2026-07-26 | Model and open-source routing matrix | Documents FP8/4-bit hardware, 32K RTX 4090 path, CPU-offload penalty, private-network operation, validation, and offline telemetry/tool controls. |
| SRC-124 | Nomic AI | https://huggingface.co/nomic-ai/nomic-embed-code | Official model card | Nomic Embed Code retrieval model | 2026-07-26 | Model and open-source routing matrix | Parameters, languages, training/evaluation scope, query requirements, and retrieval-only boundary; benchmark is vendor evidence. |
| SRC-125 | Nomic AI | https://huggingface.co/nomic-ai/nomic-embed-code-GGUF | Official artifact card | Nomic Embed Code official GGUF quantizations | 2026-07-26 | Model and open-source routing matrix | Quantization sizes, llama.cpp setup, last-token pooling, and query prefix; maximum context and laptop throughput are unstated. |
| SRC-126 | Nomic AI | https://github.com/nomic-ai/contrastors | First-party training and evaluation repository | Nomic contrastive-training implementation | 2026-07-26 | Model and open-source routing matrix | Cross-check for released training/evaluation implementation and operational dependency surface. |
| SRC-127 | Qwen | https://huggingface.co/Qwen/Qwen3-Coder-Next-GGUF | Official model and artifact card | Qwen3-Coder-Next official GGUF quantizations | 2026-07-26 | Emerging watchlist | Parameters, active parameters, native context, official quantization sizes, and Apache-2.0 metadata establish that the artifact is not a 16/32 GB laptop default. |
| SRC-128 | Qwen | https://github.com/QwenLM/Qwen3-Coder | First-party source repository | Qwen3-Coder family code and deployment guidance | 2026-07-26 | Emerging watchlist | Cross-check for architecture/runtime support and moving family maintenance. |
| SRC-129 | llama.cpp contributors | https://github.com/ggml-org/llama.cpp | Public upstream runtime repository | Current llama.cpp inference and serving support | 2026-07-26 | Model and open-source routing matrix | Cross-check for GGUF quantization, CPU/GPU hybrid inference, supported hardware, gpt-oss handling, and local server surface; runtime must be pinned and patched. |
| SRC-130 | Runpod | https://www.runpod.io/pricing | Official public pricing | On-demand Pod GPU list observed 2026-07-26 | 2026-07-26 | Model and open-source routing matrix | Community Cloud and Secure Cloud per-hour pairs for optional 24/48 GB GPU pilots; exact tier availability/region is not established and prices exclude storage, network, idle time, and administration. |
| SRC-131 | Microsoft | https://huggingface.co/microsoft/Phi-4-mini-instruct | Official base model card | Phi-4-mini-instruct base model | 2026-07-26 | Model and open-source routing matrix | First-party coding/function-call evaluations and function-call hallucination warning; these claims do not originate in the ONNX artifact card. |

## Gate 1 audit and handoff

Gate 1 remains read-only. The Gate 1 audit will record citation, contradiction, freshness, scope, and security review outcomes; unresolved evidence gaps; and required pilots before handoff for user review.

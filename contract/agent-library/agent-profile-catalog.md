---
catalogId: agent-profile-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
profiles:
  - profileId: agents-orchestrator
    version: 0.1.0
    displayName: Agents Orchestrator
    status: READY_WITH_LIMIT
    usageTopics: [orchestration-operations]
    workflowRoles: [planner, reviewer, human-checkpoint]
    purpose: Coordinate an approved pipeline and the lifecycle of bounded Agent work.
    capabilities: [pipeline coordination, lifecycle transitions, handoff sequencing]
    inputs: [accepted scope, selected formation, checkpoint decisions]
    outputs: [ordered work plan, handoff state, stop or continue decision]
    stopConditions: [missing approval, conflicting state, unverified completion]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: multi-agent-systems-architect
    version: 0.1.0
    displayName: Multi-Agent Systems Architect
    status: READY_WITH_LIMIT
    usageTopics: [planning, orchestration-operations, trust-security]
    workflowRoles: [planner, researcher, reviewer]
    purpose: Design multi-Agent topology, context flow, trust, handoff, recovery, and observability.
    capabilities: [topology design, context routing, handoff and recovery design]
    inputs: [system scope, Agent roles, trust requirements]
    outputs: [topology proposal, context boundary, recovery model]
    stopConditions: [unbounded authority, missing trust boundary, ambiguous ownership]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: workflow-architect
    version: 0.1.0
    displayName: Workflow Architect
    status: READY_WITH_LIMIT
    usageTopics: [planning, orchestration-operations]
    workflowRoles: [planner, reviewer]
    purpose: Map happy-path, failure, recovery, handoff, and observable workflow states.
    capabilities: [state modeling, failure-path design, recovery sequencing]
    inputs: [workflow goal, actors, entry and exit conditions]
    outputs: [workflow model, transition rules, failure handling]
    stopConditions: [implicit transition, missing failure path, unsafe recovery]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: software-architect
    version: 0.1.0
    displayName: Software Architect
    status: READY_WITH_LIMIT
    usageTopics: [planning, implementation]
    workflowRoles: [planner, reviewer]
    purpose: Define canonical contracts, adapters, layers, interfaces, and system boundaries.
    capabilities: [contract design, boundary definition, dependency reasoning]
    inputs: [current architecture, target capability, constraints]
    outputs: [architecture decision, contract shape, adapter boundary]
    stopConditions: [unbounded scope, undocumented compatibility break, conflicting contract]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: agentic-identity-trust-architect
    version: 0.1.0
    displayName: "Agentic Identity & Trust Architect"
    status: READY_WITH_LIMIT
    usageTopics: [trust-security]
    workflowRoles: [planner, validator, reviewer]
    purpose: Design scoped identity, authority, evidence, delegation, and revocation boundaries.
    capabilities: [identity modeling, authority scoping, delegation and revocation design]
    inputs: [actors, permissions, trust assumptions]
    outputs: [identity model, authority matrix, evidence requirements]
    stopConditions: [implicit delegation, ambient authority, missing revocation path]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: ai-generated-code-security-auditor
    version: 0.1.0
    displayName: AI-Generated Code Security Auditor
    status: READY_WITH_LIMIT
    usageTopics: [trust-security, quality]
    workflowRoles: [validator, reviewer]
    purpose: Audit sandbox, credential, tool, network, and external-write boundaries around generated code.
    capabilities: [trust-boundary review, credential exposure review, unsafe-write detection]
    inputs: [code diff, runtime boundary, dependency and tool context]
    outputs: [security findings, blocked actions, remediation evidence]
    stopConditions: [secret exposure, unrestricted network, unapproved external write]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: reality-checker
    version: 0.1.0
    displayName: Reality Checker
    status: READY_WITH_LIMIT
    usageTopics: [quality, trust-security]
    workflowRoles: [validator, reviewer, evidence-manager]
    purpose: Enforce READY and NOT READY gates and stop claims that lack evidence.
    capabilities: [claim verification, readiness gating, evidence sufficiency review]
    inputs: [claim, acceptance criteria, evidence and known limits]
    outputs: [READY or NOT READY decision, evidence gaps, next gate]
    stopConditions: [missing evidence, stale source, contradiction, inferred completion]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: product-manager
    version: 0.1.0
    displayName: Product Manager
    status: READY_WITH_LIMIT
    usageTopics: [planning]
    workflowRoles: [planner, clarifier]
    purpose: Align Project Vision, Roadmap, Milestone, Epic, and user outcomes.
    capabilities: [outcome framing, scope alignment, product decision shaping]
    inputs: [Project Vision, Roadmap, user needs, constraints]
    outputs: [aligned outcome, prioritized scope, product decision record]
    stopConditions: [unclear outcome, conflicting priorities, unvalidated assumption]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: senior-project-manager
    version: 0.1.0
    displayName: Senior Project Manager
    status: READY_WITH_LIMIT
    usageTopics: [planning]
    workflowRoles: [planner, evidence-manager]
    purpose: Sequence dependency-aware delivery slices with explicit acceptance and ownership.
    capabilities: [milestone planning, dependency management, delivery forecasting]
    inputs: [Roadmap, Milestone scope, dependencies, capacity constraints]
    outputs: [sequenced delivery plan, risks, acceptance checkpoints]
    stopConditions: [hidden dependency, impossible commitment, missing owner]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: sprint-prioritizer
    version: 0.1.0
    displayName: Sprint Prioritizer
    status: READY_WITH_LIMIT
    usageTopics: [planning]
    workflowRoles: [planner]
    purpose: Turn validated scope into the next bounded sprint and first executable slice.
    capabilities: [slice selection, sequencing, acceptance decomposition]
    inputs: [prioritized scope, dependencies, capacity, acceptance criteria]
    outputs: [next sprint scope, first dev slice, explicit out-of-scope list]
    stopConditions: [overloaded slice, unresolved dependency, missing acceptance]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: studio-operations
    version: 0.1.0
    displayName: Studio Operations
    status: READY_WITH_LIMIT
    usageTopics: [orchestration-operations]
    workflowRoles: [planner, human-checkpoint, evidence-manager]
    purpose: Operate PO to development-team flow, shared artifacts, handoffs, and branching.
    capabilities: [team operating model, artifact ownership, handoff and branch coordination]
    inputs: [team roles, canonical artifacts, branch state, delivery policy]
    outputs: [operating procedure, handoff packet, ownership and access rules]
    stopConditions: [unclear artifact owner, uncontrolled shared write, branch mismatch]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: workflow-optimizer
    version: 0.1.0
    displayName: Workflow Optimizer
    status: READY_WITH_LIMIT
    usageTopics: [orchestration-operations]
    workflowRoles: [researcher, planner, reviewer]
    purpose: Reduce bottlenecks, duplicated work, resume friction, and avoidable handoff loss.
    capabilities: [flow analysis, bottleneck identification, process improvement]
    inputs: [workflow evidence, handoff history, observed failure modes]
    outputs: [bounded improvement proposal, expected benefit, measurement plan]
    stopConditions: [unmeasured optimization, scope expansion, hidden trade-off]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: minimal-change-engineer
    version: 0.1.0
    displayName: Minimal Change Engineer
    status: READY_WITH_LIMIT
    usageTopics: [change-governance, implementation]
    workflowRoles: [implementer, reviewer]
    purpose: Keep implementation to small, scoped, reversible changes.
    capabilities: [scope control, change isolation, rollback-aware implementation]
    inputs: [accepted plan, repository state, affected contract]
    outputs: [minimal diff, changed-file rationale, rollback boundary]
    stopConditions: [unrelated diff, unknown repository state, destructive change]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: code-reviewer
    version: 0.1.0
    displayName: Code Reviewer
    status: READY_WITH_LIMIT
    usageTopics: [quality, change-governance]
    workflowRoles: [reviewer]
    purpose: Review correctness, maintainability, security, performance, and scope conformance.
    capabilities: [diff review, contract review, risk prioritization]
    inputs: [source diff, acceptance criteria, test evidence]
    outputs: [findings, approval conditions, residual risk]
    stopConditions: [unreviewable diff, missing evidence, hidden generated changes]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: codebase-archaeologist
    version: 0.1.0
    displayName: Codebase Archaeologist
    status: READY_WITH_LIMIT
    usageTopics: [discovery-tooling]
    workflowRoles: [researcher, evidence-manager]
    purpose: Trace code, contracts, documentation, and history to identify drift and hidden dependencies.
    capabilities: [code navigation, dependency tracing, documentation drift analysis]
    inputs: [repository, target behavior, relevant history]
    outputs: [evidence-backed map, drift findings, affected-scope recommendation]
    stopConditions: [stale graph, incomplete checkout, ambiguous source of truth]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: test-automation-engineer
    version: 0.1.0
    displayName: Test Automation Engineer
    status: READY_WITH_LIMIT
    usageTopics: [quality, implementation]
    workflowRoles: [implementer, validator]
    purpose: Design and execute smoke, integration, negative-path, conformance, and evidence gates.
    capabilities: [test strategy, automation design, boundary and failure testing]
    inputs: [expected behavior, contracts, test environment]
    outputs: [test plan, automated checks, reproducible evidence]
    stopConditions: [invalid test oracle, hidden mock, unavailable required environment]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: test-results-analyzer
    version: 0.1.0
    displayName: Test Results Analyzer
    status: READY_WITH_LIMIT
    usageTopics: [quality]
    workflowRoles: [validator, evidence-manager]
    purpose: Interpret test results, failures, quality signals, and residual delivery risk.
    capabilities: [failure classification, trend interpretation, evidence correlation]
    inputs: [test output, baseline, changed scope]
    outputs: [result interpretation, likely cause, quality gate recommendation]
    stopConditions: [truncated evidence, mixed revisions, inconclusive result]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: technical-writer
    version: 0.1.0
    displayName: Technical Writer
    status: READY_WITH_LIMIT
    usageTopics: [planning, quality]
    workflowRoles: [planner, evidence-manager]
    purpose: Maintain canonical contracts, runbooks, decisions, and host-evidence documentation.
    capabilities: [contract writing, runbook design, evidence-preserving documentation]
    inputs: [validated decisions, implementation evidence, audience and lifecycle]
    outputs: [canonical documentation update, runbook, documentation gap list]
    stopConditions: [unverified claim, duplicated source, missing owner]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: tool-evaluator
    version: 0.1.0
    displayName: Tool Evaluator
    status: READY_WITH_LIMIT
    usageTopics: [discovery-tooling, delivery-automation]
    workflowRoles: [researcher, validator]
    purpose: Evaluate host, runtime, toolchain, and CI or CD suitability for a bounded workflow.
    capabilities: [tool comparison, runtime capability review, suitability evidence]
    inputs: [workflow requirements, host constraints, environment evidence]
    outputs: [suitability assessment, capability gaps, activation prerequisites]
    stopConditions: [missing version evidence, unsupported host behavior, credential ambiguity]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: devops-automator
    version: 0.1.0
    displayName: DevOps Automator
    status: READY_WITH_LIMIT
    usageTopics: [delivery-automation, implementation]
    workflowRoles: [implementer, validator]
    purpose: Design CI or CD, runtime, environment, and delivery automation within approved boundaries.
    capabilities: [pipeline automation, environment validation, delivery gate design]
    inputs: [repository state, deployment boundary, required quality gates]
    outputs: [automation change, pipeline evidence, rollback and recovery path]
    stopConditions: [unapproved publication, secret handling gap, destructive automation]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: senior-full-stack-engineer
    version: 0.1.0
    displayName: Senior Full-Stack Engineer
    status: READY_WITH_LIMIT
    usageTopics: [implementation]
    workflowRoles: [implementer]
    purpose: Deliver a complete feature vertical slice across frontend, backend, and contracts.
    capabilities: [vertical slice implementation, frontend and backend integration, contract conformance]
    inputs: [accepted feature scope, repository state, API and UI contracts]
    outputs: [integrated feature slice, tests, implementation evidence]
    stopConditions: [missing contract, cross-layer ambiguity, unverified integration]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: senior-frontend-engineer
    version: 0.1.0
    displayName: Senior Frontend Engineer
    status: READY_WITH_LIMIT
    usageTopics: [implementation]
    workflowRoles: [implementer]
    purpose: Implement UI, accessibility, state, API integration, and user flow behavior.
    capabilities: [UI implementation, accessibility, state and API integration]
    inputs: [user flow, UI contract, API contract, accessibility requirements]
    outputs: [frontend change, interaction tests, accessibility evidence]
    stopConditions: [unclear user flow, inaccessible interaction, unverified API state]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: senior-backend-engineer
    version: 0.1.0
    displayName: Senior Backend Engineer
    status: READY_WITH_LIMIT
    usageTopics: [implementation]
    workflowRoles: [implementer]
    purpose: Implement domain logic, APIs, persistence, reliability, and security boundaries.
    capabilities: [domain implementation, API design, persistence and reliability]
    inputs: [domain contract, API contract, persistence constraints, security boundary]
    outputs: [backend change, API and persistence tests, reliability evidence]
    stopConditions: [ambiguous domain rule, unsafe data access, missing failure handling]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - profileId: ai-engineer
    version: 0.1.0
    displayName: AI Engineer
    status: READY_WITH_LIMIT
    usageTopics: [implementation, quality]
    workflowRoles: [implementer, validator]
    purpose: Design Agent and LLM integration, structured output, evaluation, and runtime behavior.
    capabilities: [Agent integration, structured output, evaluation and runtime behavior]
    inputs: [model or host boundary, prompt and schema contract, evaluation criteria]
    outputs: [AI integration, structured-output checks, evaluation evidence]
    stopConditions: [credential ambiguity, unconstrained tool use, non-deterministic contract failure]
    userSelectable: true
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
---

# User-facing Agent Profile Library

This catalog contains the user-selectable, declarative Agent profiles. A profile
describes a bounded specialism that can later be composed into a formation. The
catalog does not activate a host, invoke a connector, grant permissions, or
claim that a profile is already a native runtime Agent.

`usageTopics` are the user-facing groups that answer what the profile is useful
for: planning, implementation, quality, trust-security, orchestration-operations,
discovery-tooling, delivery-automation, and change-governance. A profile may
belong to more than one topic.

`workflowRoles` are internal formation metadata. They describe how an approved
profile may contribute to a bounded workflow, such as `planner`, `implementer`,
`reviewer`, or `validator`. They are not user-facing Agent profiles and do not
grant execution authority.

The technology-specific `Senior Developer` profile is intentionally absent. The
library exposes technology-neutral Senior Full-Stack, Senior Frontend, Senior
Backend, and AI Engineer profiles instead.

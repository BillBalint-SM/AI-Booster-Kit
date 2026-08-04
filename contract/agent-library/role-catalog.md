---
catalogId: agent-role-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
roles:
  - roleId: project-systems-architect
    displayName: Project Systems Architect
    purpose: Keep the product vision, architecture, workflow topology, and delivery boundaries coherent from discovery through release.
    requiredCapabilities: [systems-thinking, architecture, workflow-design, orchestration]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [vision-contract, architecture-decision-record, workflow-map]
    handoffContract:
      produces: architecture-and-workflow-contract
      acceptsFrom: [documentation-business-analysis, product-market-owner]
      requiredEvidence: [current-scope, dependency-map, explicit-boundaries]
      stopConditions: [conflicting-goals, unknown-system-boundary, unsafe-authority]
  - roleId: documentation-business-analysis
    displayName: Documentation and Business Analysis
    purpose: Normalize language, remove redundant instructions, expose business assumptions, and keep evidence traceable.
    requiredCapabilities: [technical-writing, analysis, terminology-governance, evidence-synthesis]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [canonical-glossary, requirements-map, evidence-register]
    handoffContract:
      produces: normalized-requirements-packet
      acceptsFrom: [product-market-owner, project-systems-architect]
      requiredEvidence: [source-documents, decision-log, redundancy-findings]
      stopConditions: [unresolved-terminology-conflict, missing-source, scope-expansion]
  - roleId: product-market-owner
    displayName: Product and Market Owner
    purpose: Turn the vision into a valuable, testable, and marketable product direction with explicit customer and business outcomes.
    requiredCapabilities: [product-strategy, market-understanding, prioritization, value-definition]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [outcome-map, priority-decision, market-evidence]
    handoffContract:
      produces: product-outcome-contract
      acceptsFrom: [documentation-business-analysis]
      requiredEvidence: [user-problem, value-hypothesis, acceptance-outcomes]
      stopConditions: [unvalidated-value, priority-conflict, unsupported-market-claim]
  - roleId: delivery-technical-lead
    displayName: Delivery Technical Lead
    purpose: Convert accepted outcomes into bounded implementation, integration, and release work with a reviewable technical path.
    requiredCapabilities: [delivery-planning, implementation, integration, release-discipline]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [implementation-plan, change-set, release-evidence]
    handoffContract:
      produces: implementation-evidence-packet
      acceptsFrom: [project-systems-architect, product-market-owner, reality-quality-gate]
      requiredEvidence: [accepted-plan, repository-state, test-results]
      stopConditions: [dirty-state-conflict, unsafe-change, failed-regression]
  - roleId: personal-operations-rule-auditor
    displayName: Personal Operations and Rule Auditor
    purpose: Simplify the working system by removing repetitive, unproductive, and contradictory rules while protecting useful controls.
    requiredCapabilities: [process-analysis, prioritization, habit-design, waste-removal]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [working-agreement, waste-register, rule-change-record]
    handoffContract:
      produces: lean-working-system
      acceptsFrom: [documentation-business-analysis, project-systems-architect]
      requiredEvidence: [observed-workflow, time-cost, outcome-impact]
      stopConditions: [unmeasured-benefit, rule-conflict, unsafe-removal]
  - roleId: reality-quality-gate
    displayName: Reality and Quality Gate
    purpose: Challenge assumptions, verify behavior, and keep incomplete or unsafe work visibly stopped.
    requiredCapabilities: [testing, security-review, evidence-validation, risk-judgment]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [quality-report, negative-test-log, residual-risk-register]
    handoffContract:
      produces: verified-quality-verdict
      acceptsFrom: [delivery-technical-lead, documentation-business-analysis]
      requiredEvidence: [positive-checks, negative-checks, source-read-back]
      stopConditions: [missing-evidence, security-uncertainty, ambiguous-result]
  - roleId: on-demand-domain-specialist
    displayName: On-demand Domain Specialist
    purpose: Supply bounded specialist expertise only when a task packet names the needed domain and evidence boundary.
    requiredCapabilities: [domain-expertise, bounded-analysis, explicit-handoff]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [specialist-brief, domain-evidence]
    handoffContract:
      produces: bounded-domain-advice
      acceptsFrom: [project-systems-architect, product-market-owner, delivery-technical-lead]
      requiredEvidence: [task-scope, domain-source, limitation-note]
      stopConditions: [missing-domain-scope, unsupported-claim, authority-expansion]
  - roleId: clarifier
    displayName: Formation Clarifier
    purpose: Turn an incoming request into a bounded task packet before work starts.
    requiredCapabilities: [clarification, scope-control]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [task-contract]
    handoffContract:
      produces: clarified-task
      acceptsFrom: [product-market-owner]
      requiredEvidence: [goal, constraints]
      stopConditions: [ambiguous-outcome, unsafe-request]
  - roleId: validator
    displayName: Formation Validator
    purpose: Verify that a proposed result meets its explicit acceptance and evidence contract.
    requiredCapabilities: [validation, negative-testing]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [validation-log]
    handoffContract:
      produces: validation-verdict
      acceptsFrom: [implementer, researcher, debugger]
      requiredEvidence: [acceptance-criteria, test-output]
      stopConditions: [missing-evidence, failed-check]
  - roleId: human-checkpoint
    displayName: Human Checkpoint
    purpose: Preserve explicit human acknowledgement at recommendation and authority boundaries.
    requiredCapabilities: [decision-recording, authority-check]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [decision-record]
    handoffContract:
      produces: acknowledged-decision
      acceptsFrom: [clarifier, planner, validator]
      requiredEvidence: [recommendation, known-limits]
      stopConditions: [missing-acknowledgement, authority-mismatch]
  - roleId: researcher
    displayName: Formation Researcher
    purpose: Gather bounded, source-backed findings without silently widening the question.
    requiredCapabilities: [research, source-evaluation]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [source-register]
    handoffContract:
      produces: source-backed-brief
      acceptsFrom: [clarifier]
      requiredEvidence: [source-allowlist, source-read-back]
      stopConditions: [unknown-source-authority, scope-expansion]
  - roleId: evidence-manager
    displayName: Formation Evidence Manager
    purpose: Preserve provenance and make the evidence packet usable by downstream roles.
    requiredCapabilities: [provenance, synthesis]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [evidence-register]
    handoffContract:
      produces: evidence-packet
      acceptsFrom: [researcher, debugger]
      requiredEvidence: [source-register, unresolved-unknowns]
      stopConditions: [provenance-gap, conflicting-source]
  - roleId: reviewer
    displayName: Formation Reviewer
    purpose: Independently inspect a packet for scope, correctness, and contract drift.
    requiredCapabilities: [review, risk-detection]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [review-record]
    handoffContract:
      produces: review-verdict
      acceptsFrom: [planner, implementer, researcher]
      requiredEvidence: [artifact-diff, acceptance-checks]
      stopConditions: [scope-drift, unverified-claim]
  - roleId: planner
    displayName: Formation Planner
    purpose: Sequence accepted work into small, dependency-aware steps.
    requiredCapabilities: [planning, dependency-analysis]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [execution-plan]
    handoffContract:
      produces: accepted-plan
      acceptsFrom: [clarifier, product-market-owner]
      requiredEvidence: [scope, dependencies, acceptance]
      stopConditions: [unaccepted-scope, unknown-dependency]
  - roleId: implementer
    displayName: Formation Implementer
    purpose: Produce the smallest reviewable change within the accepted plan and authority boundary.
    requiredCapabilities: [implementation, test-driven-change]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [reviewable-diff]
    handoffContract:
      produces: implementation-artifact
      acceptsFrom: [planner]
      requiredEvidence: [accepted-plan, failing-test, passing-test]
      stopConditions: [unsafe-change, failed-test, dirty-state-conflict]
  - roleId: debugger
    displayName: Formation Debugger
    purpose: Reproduce failures, identify root cause, and propose a minimal bounded correction.
    requiredCapabilities: [reproduction, root-cause-analysis]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [failure-record, minimal-fix]
    handoffContract:
      produces: root-cause-record
      acceptsFrom: [validator, implementer]
      requiredEvidence: [reproduction, failing-test]
      stopConditions: [not-reproduced, ambiguous-root-cause, destructive-fix]
assignments:
  - { roleId: project-systems-architect, agentId: agents-orchestrator, mode: lead, contextKey: project-agents-orchestrator, writeScope: ROLE_ARTIFACT }
  - { roleId: project-systems-architect, agentId: specialized-workflow-architect, mode: contributor, contextKey: project-workflow-architect, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: engineering-software-architect, mode: contributor, contextKey: project-software-architect, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: engineering-multi-agent-systems-architect, mode: contributor, contextKey: project-multi-agent, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: engineering-backend-architect, mode: contributor, contextKey: project-backend, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: engineering-api-platform-engineer, mode: contributor, contextKey: project-api, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: gis-solution-engineer, mode: contributor, contextKey: project-gis, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: identity-graph-operator, mode: contributor, contextKey: project-identity-graph, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: agentic-identity-trust, mode: contributor, contextKey: project-agent-trust, writeScope: NONE }
  - { roleId: project-systems-architect, agentId: engineering-identity-access-engineer, mode: contributor, contextKey: project-identity-access, writeScope: NONE }
  - { roleId: documentation-business-analysis, agentId: engineering-technical-writer, mode: lead, contextKey: docs-technical-writer, writeScope: ROLE_ARTIFACT }
  - { roleId: documentation-business-analysis, agentId: specialized-document-generator, mode: contributor, contextKey: docs-generator, writeScope: NONE }
  - { roleId: documentation-business-analysis, agentId: support-executive-summary-generator, mode: contributor, contextKey: docs-summary, writeScope: NONE }
  - { roleId: documentation-business-analysis, agentId: support-analytics-reporter, mode: contributor, contextKey: docs-analytics, writeScope: NONE }
  - { roleId: documentation-business-analysis, agentId: engineering-email-intelligence-engineer, mode: contributor, contextKey: docs-email, writeScope: NONE }
  - { roleId: documentation-business-analysis, agentId: resume-tailor, mode: contributor, contextKey: docs-resume, writeScope: NONE }
  - { roleId: documentation-business-analysis, agentId: engineering-data-visualization-engineer, mode: contributor, contextKey: docs-data-visualization, writeScope: NONE }
  - { roleId: product-market-owner, agentId: product-manager, mode: lead, contextKey: product-manager, writeScope: ROLE_ARTIFACT }
  - { roleId: product-market-owner, agentId: business-strategist, mode: contributor, contextKey: product-business-strategy, writeScope: NONE }
  - { roleId: product-market-owner, agentId: product-sprint-prioritizer, mode: contributor, contextKey: product-prioritization, writeScope: NONE }
  - { roleId: product-market-owner, agentId: product-trend-researcher, mode: contributor, contextKey: product-trends, writeScope: NONE }
  - { roleId: product-market-owner, agentId: design-brand-guardian, mode: contributor, contextKey: product-brand, writeScope: NONE }
  - { roleId: product-market-owner, agentId: design-persona-walkthrough, mode: contributor, contextKey: product-persona, writeScope: NONE }
  - { roleId: product-market-owner, agentId: design-ux-architect, mode: contributor, contextKey: product-ux, writeScope: NONE }
  - { roleId: product-market-owner, agentId: marketing-aeo-foundations, mode: contributor, contextKey: product-aeo, writeScope: NONE }
  - { roleId: product-market-owner, agentId: marketing-agentic-search-optimizer, mode: contributor, contextKey: product-agentic-search, writeScope: NONE }
  - { roleId: product-market-owner, agentId: marketing-ai-citation-strategist, mode: contributor, contextKey: product-citation, writeScope: NONE }
  - { roleId: product-market-owner, agentId: marketing-content-creator, mode: contributor, contextKey: product-content, writeScope: NONE }
  - { roleId: product-market-owner, agentId: marketing-growth-hacker, mode: contributor, contextKey: product-growth, writeScope: NONE }
  - { roleId: product-market-owner, agentId: marketing-linkedin-content-creator, mode: contributor, contextKey: product-linkedin, writeScope: NONE }
  - { roleId: product-market-owner, agentId: product-behavioral-nudge-engine, mode: contributor, contextKey: product-nudge, writeScope: NONE }
  - { roleId: product-market-owner, agentId: sales-account-strategist, mode: contributor, contextKey: product-account-strategy, writeScope: NONE }
  - { roleId: product-market-owner, agentId: sales-coach, mode: contributor, contextKey: product-sales-coaching, writeScope: NONE }
  - { roleId: product-market-owner, agentId: sales-discovery-coach, mode: contributor, contextKey: product-discovery, writeScope: NONE }
  - { roleId: product-market-owner, agentId: sales-engineer, mode: contributor, contextKey: product-sales-engineering, writeScope: NONE }
  - { roleId: product-market-owner, agentId: sales-pipeline-analyst, mode: contributor, contextKey: product-pipeline, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: project-manager-senior, mode: lead, contextKey: delivery-project-manager, writeScope: ROLE_ARTIFACT }
  - { roleId: delivery-technical-lead, agentId: project-management-project-shepherd, mode: contributor, contextKey: delivery-shepherd, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: project-management-studio-producer, mode: contributor, contextKey: delivery-producer, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: project-management-jira-workflow-steward, mode: contributor, contextKey: delivery-jira, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-senior-developer, mode: contributor, contextKey: delivery-senior-developer, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-frontend-developer, mode: contributor, contextKey: delivery-frontend, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-ai-engineer, mode: contributor, contextKey: delivery-ai, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-devops-automator, mode: contributor, contextKey: delivery-devops, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-git-workflow-master, mode: contributor, contextKey: delivery-git, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-desktop-app-engineer, mode: contributor, contextKey: delivery-desktop, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-realtime-collaboration-engineer, mode: contributor, contextKey: delivery-realtime, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-data-engineer, mode: contributor, contextKey: delivery-data, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-database-optimizer, mode: contributor, contextKey: delivery-db-optimizer, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-database-reliability-engineer, mode: contributor, contextKey: delivery-db-reliability, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-search-relevance-engineer, mode: contributor, contextKey: delivery-search, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-prompt-engineer, mode: contributor, contextKey: delivery-prompt, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-solidity-smart-contract-engineer, mode: contributor, contextKey: delivery-solidity, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: engineering-minimal-change-engineer, mode: contributor, contextKey: delivery-minimal-change, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: project-management-experiment-tracker, mode: contributor, contextKey: delivery-experiment, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: project-management-studio-operations, mode: contributor, contextKey: delivery-studio-operations, writeScope: NONE }
  - { roleId: delivery-technical-lead, agentId: specialized-codebase-archaeologist, mode: contributor, contextKey: delivery-codebase-archaeology, writeScope: NONE }
  - { roleId: personal-operations-rule-auditor, agentId: operations-manager, mode: lead, contextKey: personal-operations, writeScope: ROLE_ARTIFACT }
  - { roleId: personal-operations-rule-auditor, agentId: personal-growth-mentor, mode: contributor, contextKey: personal-growth, writeScope: NONE }
  - { roleId: personal-operations-rule-auditor, agentId: project-management-experiment-tracker, mode: contributor, contextKey: personal-experiment, writeScope: NONE }
  - { roleId: personal-operations-rule-auditor, agentId: testing-tool-evaluator, mode: contributor, contextKey: personal-tool-evaluation, writeScope: NONE }
  - { roleId: personal-operations-rule-auditor, agentId: testing-workflow-optimizer, mode: contributor, contextKey: personal-workflow, writeScope: NONE }
  - { roleId: reality-quality-gate, agentId: testing-reality-checker, mode: lead, contextKey: reality-checker, writeScope: ROLE_ARTIFACT }
  - { roleId: reality-quality-gate, agentId: engineering-code-reviewer, mode: reviewer, contextKey: reality-code-review, writeScope: NONE }
  - { roleId: reality-quality-gate, agentId: security-ai-generated-code-auditor, mode: reviewer, contextKey: reality-security, writeScope: NONE }
  - { roleId: reality-quality-gate, agentId: testing-test-automation-engineer, mode: contributor, contextKey: reality-automation, writeScope: NONE }
  - { roleId: reality-quality-gate, agentId: testing-test-results-analyzer, mode: contributor, contextKey: reality-results, writeScope: NONE }
  - { roleId: reality-quality-gate, agentId: design-ui-finish-gate-reviewer, mode: reviewer, contextKey: reality-ui-finish, writeScope: NONE }
  - { roleId: on-demand-domain-specialist, agentId: design-ui-designer, mode: lead, contextKey: specialist-ui, writeScope: ROLE_ARTIFACT }
  - { roleId: on-demand-domain-specialist, agentId: design-whimsy-injector, mode: contributor, contextKey: specialist-whimsy, writeScope: NONE }
  - { roleId: on-demand-domain-specialist, agentId: terminal-integration-specialist, mode: contributor, contextKey: specialist-terminal, writeScope: NONE }
  - { roleId: on-demand-domain-specialist, agentId: engineering-data-visualization-engineer, mode: contributor, contextKey: specialist-visualization, writeScope: NONE }
  - { roleId: on-demand-domain-specialist, agentId: testing-workflow-optimizer, mode: contributor, contextKey: specialist-workflow, writeScope: NONE }
  - { roleId: clarifier, agentId: agents-orchestrator, mode: lead, contextKey: formation-clarifier, writeScope: ROLE_ARTIFACT }
  - { roleId: validator, agentId: testing-reality-checker, mode: lead, contextKey: formation-validator, writeScope: ROLE_ARTIFACT }
  - { roleId: human-checkpoint, agentId: project-manager-senior, mode: lead, contextKey: formation-human-checkpoint, writeScope: ROLE_ARTIFACT }
  - { roleId: researcher, agentId: product-trend-researcher, mode: lead, contextKey: formation-researcher, writeScope: ROLE_ARTIFACT }
  - { roleId: evidence-manager, agentId: engineering-technical-writer, mode: lead, contextKey: formation-evidence-manager, writeScope: ROLE_ARTIFACT }
  - { roleId: reviewer, agentId: engineering-code-reviewer, mode: lead, contextKey: formation-reviewer, writeScope: ROLE_ARTIFACT }
  - { roleId: planner, agentId: project-manager-senior, mode: lead, contextKey: formation-planner, writeScope: ROLE_ARTIFACT }
  - { roleId: implementer, agentId: engineering-senior-developer, mode: lead, contextKey: formation-implementer, writeScope: ROLE_ARTIFACT }
  - { roleId: debugger, agentId: specialized-codebase-archaeologist, mode: lead, contextKey: formation-debugger, writeScope: ROLE_ARTIFACT }
  - { roleId: reviewer, agentId: testing-reality-checker, mode: reviewer, contextKey: formation-research-reviewer, writeScope: NONE }
  - { roleId: planner, agentId: product-manager, mode: contributor, contextKey: formation-refinement-planner, writeScope: NONE }
  - { roleId: reviewer, agentId: business-strategist, mode: reviewer, contextKey: formation-refinement-reviewer, writeScope: NONE }
  - { roleId: validator, agentId: engineering-code-reviewer, mode: reviewer, contextKey: formation-implementation-validator, writeScope: NONE }
  - { roleId: validator, agentId: testing-test-results-analyzer, mode: reviewer, contextKey: formation-debugging-validator, writeScope: NONE }
  - { roleId: evidence-manager, agentId: testing-test-results-analyzer, mode: contributor, contextKey: formation-validation-evidence, writeScope: NONE }
---

# Agent Role Library v1

This catalog is a read-only, host-agnostic projection of the global Agent
inventory into clean project Roles. An Agent may appear in multiple Roles only
with distinct context keys. A Role may have multiple Agents, but one lead owns
the Role artifact and contributors/reviewers hand off evidence rather than
sharing hidden transcripts. The catalog contains no prompt bodies and grants
no host activation or connector authority.

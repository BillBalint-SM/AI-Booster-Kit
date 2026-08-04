---
catalogId: agent-formation-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
formations:
  - formationId: quick-task-clarifier-validator
    version: 0.1.0
    status: READY_WITH_LIMIT
    scenario: quick_task
    weight: light
    complexity: low
    topology: single-agent
    roles: [clarifier, validator, human-checkpoint]
    agentBindings:
      - roleId: clarifier
        agentId: agents-orchestrator
        mode: lead
        contextKey: quick-task-clarifier
      - roleId: validator
        agentId: testing-reality-checker
        mode: reviewer
        contextKey: quick-task-validator
      - roleId: human-checkpoint
        agentId: project-manager-senior
        mode: fallback
        contextKey: quick-task-human-checkpoint
    requiredInput: [goal, scope, context, constraints, required-evidence]
    expectedOutput: [task-contract, recommendation-or-no-agent, evidence-record]
    acceptance:
      criteria: [bounded-outcome, visible-unknowns, explicit-user-choice]
      evidence: [source-task, task-contract, user-decision]
    relations:
      - kind: implements
        target: controller
    prerequisites: [named-outcome-owner, current-or-unknown-context]
    recovery:
      preserve: [request-declarations, unknown-state]
      stopConditions: [unsafe-boundary, unresolved-high-risk-unknown]
    identity:
      key: quick-task-clarifier-validator
      pattern: quick-task:light:single-agent
    recipePath: contract/agent-library/quick-task-clarifier-validator.md
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-research
    version: 0.1.0
    status: READY
    scenario: research
    weight: medium
    complexity: medium
    topology: parallel-fan-out-fan-in
    roles: [researcher, evidence-manager, reviewer, human-checkpoint]
    agentBindings:
      - roleId: researcher
        agentId: product-trend-researcher
        mode: lead
        contextKey: bounded-research-researcher
      - roleId: evidence-manager
        agentId: engineering-technical-writer
        mode: contributor
        contextKey: bounded-research-evidence
      - roleId: reviewer
        agentId: testing-reality-checker
        mode: reviewer
        contextKey: bounded-research-review
      - roleId: human-checkpoint
        agentId: project-manager-senior
        mode: fallback
        contextKey: bounded-research-human-checkpoint
    requiredInput: [goal, scope, source-allowlist, evidence-standard]
    expectedOutput: [source-backed-brief, uncertainty-register, recommendation-or-stop]
    acceptance:
      criteria: [bounded-question, primary-source-evidence, unresolved-conflicts-visible]
      evidence: [source-register, quoted-or-linked-findings, review-record]
    relations:
      - kind: related_to
        target: quick-task-clarifier-validator
    prerequisites: [scope, source-allowlist, evidence-standard]
    recovery:
      preserve: [source-register, conflicting-findings]
      stopConditions: [unknown-source-authority, scope-expansion, partial-evidence]
    identity:
      key: bounded-research
      pattern: research:medium:parallel-fan-out-fan-in
    recipePath: contract/agent-library/bounded-research.md
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-refinement
    version: 0.1.0
    status: READY
    scenario: refinement
    weight: light
    complexity: low
    topology: sequential
    roles: [planner, reviewer, human-checkpoint]
    agentBindings:
      - roleId: planner
        agentId: product-manager
        mode: lead
        contextKey: bounded-refinement-planner
      - roleId: reviewer
        agentId: business-strategist
        mode: reviewer
        contextKey: bounded-refinement-review
      - roleId: human-checkpoint
        agentId: project-manager-senior
        mode: fallback
        contextKey: bounded-refinement-human-checkpoint
    requiredInput: [goal, current-scope, constraints, open-questions]
    expectedOutput: [refined-scope, acceptance-criteria, decision-record]
    acceptance:
      criteria: [scope-preserved, assumptions-visible, acceptance-testable]
      evidence: [before-scope, after-scope, decision-record]
    relations:
      - kind: related_to
        target: quick-task-clarifier-validator
    prerequisites: [current-scope, constraints, open-questions, named-decision-owner]
    recovery:
      preserve: [original-scope, rejected-interpretations]
      stopConditions: [unaccepted-scope-change, unresolved-conflict]
    identity:
      key: bounded-refinement
      pattern: refinement:light:sequential
    recipePath: contract/agent-library/bounded-refinement.md
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-implementation
    version: 0.1.0
    status: READY
    scenario: development
    weight: heavy
    complexity: high
    topology: sequential
    roles: [planner, implementer, validator, human-checkpoint]
    agentBindings:
      - roleId: planner
        agentId: project-manager-senior
        mode: lead
        contextKey: bounded-implementation-planner
      - roleId: implementer
        agentId: engineering-senior-developer
        mode: contributor
        contextKey: bounded-implementation-builder
      - roleId: validator
        agentId: engineering-code-reviewer
        mode: reviewer
        contextKey: bounded-implementation-validation
      - roleId: human-checkpoint
        agentId: project-manager-senior
        mode: fallback
        contextKey: bounded-implementation-human-checkpoint
    requiredInput: [goal, repository, repository-state, acceptance-criteria, test-strategy, accepted-plan, rollback-boundary]
    expectedOutput: [reviewable-diff, test-evidence, residual-risk-record]
    acceptance:
      criteria: [scope-matched-diff, relevant-tests-pass, rollback-boundary-preserved]
      evidence: [git-diff, test-output, review-record]
    relations:
      - kind: depends_on
        target: bounded-refinement
    prerequisites: [repository-state, accepted-plan, rollback-boundary]
    recovery:
      preserve: [prior-setup, failing-evidence]
      stopConditions: [dirty-state-conflict, unsafe-change, failed-read-back]
    identity:
      key: bounded-implementation
      pattern: development:heavy:sequential
    recipePath: contract/agent-library/bounded-implementation.md
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-debugging
    version: 0.1.0
    status: READY
    scenario: debugging
    weight: medium
    complexity: medium
    topology: sequential
    roles: [debugger, validator, reviewer, human-checkpoint]
    agentBindings:
      - roleId: debugger
        agentId: specialized-codebase-archaeologist
        mode: lead
        contextKey: bounded-debugging-debugger
      - roleId: validator
        agentId: testing-test-results-analyzer
        mode: reviewer
        contextKey: bounded-debugging-validation
      - roleId: reviewer
        agentId: engineering-code-reviewer
        mode: reviewer
        contextKey: bounded-debugging-review
      - roleId: human-checkpoint
        agentId: project-manager-senior
        mode: fallback
        contextKey: bounded-debugging-human-checkpoint
    requiredInput: [symptom, reproduction, expected-behavior, environment]
    expectedOutput: [root-cause-record, minimal-fix, regression-evidence]
    acceptance:
      criteria: [failure-reproduced, root-cause-supported, regression-covered]
      evidence: [reproduction-output, failing-test, passing-test]
    relations:
      - kind: validates
        target: bounded-implementation
    prerequisites: [symptom, reproduction-procedure, expected-behavior, environment-record]
    recovery:
      preserve: [failure-evidence, pre-fix-state]
      stopConditions: [not-reproduced, ambiguous-root-cause, destructive-fix]
    identity:
      key: bounded-debugging
      pattern: debugging:medium:sequential
    recipePath: contract/agent-library/bounded-debugging.md
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-validation
    version: 0.1.0
    status: READY
    scenario: validation
    weight: medium
    complexity: medium
    topology: sequential
    roles: [validator, evidence-manager, reviewer, human-checkpoint]
    agentBindings:
      - roleId: validator
        agentId: testing-reality-checker
        mode: lead
        contextKey: bounded-validation-validator
      - roleId: evidence-manager
        agentId: testing-test-results-analyzer
        mode: contributor
        contextKey: bounded-validation-evidence
      - roleId: reviewer
        agentId: engineering-code-reviewer
        mode: reviewer
        contextKey: bounded-validation-review
      - roleId: human-checkpoint
        agentId: project-manager-senior
        mode: fallback
        contextKey: bounded-validation-human-checkpoint
    requiredInput: [claim, acceptance-criteria, evidence-sources, known-limits]
    expectedOutput: [validation-result, evidence-map, explicit-stop-or-pass]
    acceptance:
      criteria: [claim-traced-to-evidence, negative-paths-checked, limits-visible]
      evidence: [validation-log, source-read-back, residual-risk-record]
    relations:
      - kind: validates
        target: controller
    prerequisites: [claim-under-test, acceptance-criteria, evidence-sources, known-limits]
    recovery:
      preserve: [pre-validation-claim, failed-checks]
      stopConditions: [missing-evidence, source-mismatch, unknown-capability]
    identity:
      key: bounded-validation
      pattern: validation:medium:sequential
    recipePath: contract/agent-library/bounded-validation.md
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
---

# Agent Formation Library v1 — M1-A catalog

This catalog is a declarative, host-agnostic index. It characterizes formations
so the Controller can recognize scenarios and explain recommendations.
Catalog entries do not activate a host, invoke a connector, create files, or
persist a session. The Quick Task entry is ready with a documented limit; the
research, validation, refinement, implementation, and debugging entries are
fully ready with linked profile recipes. Quick Task remains ready with a
documented limit, and the catalog retains its no-activation and Quick Task
limits.

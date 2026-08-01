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
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-research
    version: 0.1.0
    status: CANDIDATE
    scenario: research
    weight: medium
    complexity: medium
    topology: parallel-fan-out-fan-in
    roles: [researcher, evidence-manager, reviewer, human-checkpoint]
    requiredInput: [goal, scope, source-allowlist, evidence-standard]
    expectedOutput: [source-backed-brief, uncertainty-register, recommendation-or-stop]
    acceptance:
      criteria: [bounded-question, primary-source-evidence, unresolved-conflicts-visible]
      evidence: [source-register, quoted-or-linked-findings, review-record]
    relations:
      - kind: related_to
        target: quick-task-clarifier-validator
    prerequisites: [bounded-question, source-allowlist, evidence-standard]
    recovery:
      preserve: [source-register, conflicting-findings]
      stopConditions: [unknown-source-authority, scope-expansion, partial-evidence]
    identity:
      key: bounded-research
      pattern: research:medium:parallel-fan-out-fan-in
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-refinement
    version: 0.1.0
    status: CANDIDATE
    scenario: refinement
    weight: light
    complexity: low
    topology: sequential
    roles: [planner, reviewer, human-checkpoint]
    requiredInput: [goal, current-scope, constraints, open-questions]
    expectedOutput: [refined-scope, acceptance-criteria, decision-record]
    acceptance:
      criteria: [scope-preserved, assumptions-visible, acceptance-testable]
      evidence: [before-scope, after-scope, decision-record]
    relations:
      - kind: related_to
        target: quick-task-clarifier-validator
    prerequisites: [current-scope, named-decision-owner]
    recovery:
      preserve: [original-scope, rejected-interpretations]
      stopConditions: [unaccepted-scope-change, unresolved-conflict]
    identity:
      key: bounded-refinement
      pattern: refinement:light:sequential
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-implementation
    version: 0.1.0
    status: CANDIDATE
    scenario: development
    weight: heavy
    complexity: high
    topology: sequential
    roles: [planner, implementer, validator, human-checkpoint]
    requiredInput: [goal, repository, acceptance-criteria, test-strategy, rollback-boundary]
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
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-debugging
    version: 0.1.0
    status: CANDIDATE
    scenario: debugging
    weight: medium
    complexity: medium
    topology: sequential
    roles: [debugger, validator, reviewer, human-checkpoint]
    requiredInput: [symptom, reproduction, expected-behavior, environment]
    expectedOutput: [root-cause-record, minimal-fix, regression-evidence]
    acceptance:
      criteria: [failure-reproduced, root-cause-supported, regression-covered]
      evidence: [reproduction-output, failing-test, passing-test]
    relations:
      - kind: validates
        target: bounded-implementation
    prerequisites: [reproducible-symptom, expected-behavior, environment-record]
    recovery:
      preserve: [failure-evidence, pre-fix-state]
      stopConditions: [not-reproduced, ambiguous-root-cause, destructive-fix]
    identity:
      key: bounded-debugging
      pattern: debugging:medium:sequential
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
  - formationId: bounded-validation
    version: 0.1.0
    status: CANDIDATE
    scenario: validation
    weight: medium
    complexity: medium
    topology: sequential
    roles: [validator, evidence-manager, reviewer, human-checkpoint]
    requiredInput: [claim, acceptance-criteria, evidence-sources, known-limits]
    expectedOutput: [validation-result, evidence-map, explicit-stop-or-pass]
    acceptance:
      criteria: [claim-traced-to-evidence, negative-paths-checked, limits-visible]
      evidence: [validation-log, source-read-back, residual-risk-record]
    relations:
      - kind: validates
        target: controller
    prerequisites: [claim-under-test, acceptance-criteria, evidence-sources]
    recovery:
      preserve: [pre-validation-claim, failed-checks]
      stopConditions: [missing-evidence, source-mismatch, unknown-capability]
    identity:
      key: bounded-validation
      pattern: validation:medium:sequential
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
---

# Agent Formation Library v1 — M1-A catalog

This catalog is a declarative, host-agnostic index. It characterizes formations
so a later Controller slice can recognize scenarios and explain candidates.
Catalog entries do not activate a host, invoke a connector, create files, or
persist a session. The Quick Task entry is ready with a documented limit; the
other five entries are bounded candidates until their recipes and Controller
recommendation paths are implemented and verified.

---
catalogId: agent-formation-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
formations:
  - formationId: fixture-incomplete-binding
    version: 0.1.0
    status: READY_WITH_LIMIT
    scenario: development
    weight: light
    complexity: low
    topology: sequential
    roles: [debugger]
    requiredInput: [goal]
    expectedOutput: [projection]
    acceptance:
      criteria: [bindings-valid]
      evidence: [projection-report]
    relations:
      - kind: related_to
        target: fixture
    prerequisites: [agent-inventory]
    recovery:
      preserve: [source-hashes]
      stopConditions: [missing-agent]
    identity:
      key: fixture-incomplete-binding
      pattern: development:light:sequential
    recipePath: null
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
    agentBindings:
      - roleId: debugger
        agentId: alpha
        mode: lead
        contextKey: debugger-alpha
---

# Fixture formation catalog with an unknown Role.

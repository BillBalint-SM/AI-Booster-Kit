---
catalogId: agent-role-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
roles:
  - roleId: planner
    displayName: Planner
    purpose: Plan a bounded outcome.
    requiredCapabilities: [planning]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [plan]
    handoffContract:
      produces: plan
      acceptsFrom: []
      requiredEvidence: [plan]
      stopConditions: [missing-scope]
  - roleId: validator
    displayName: Validator
    purpose: Validate the bounded outcome.
    requiredCapabilities: [validation]
    contextContract:
      layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]
      isolated: true
      sharedArtifacts: [validation]
    handoffContract:
      produces: validation
      acceptsFrom: [planner]
      requiredEvidence: [validation]
      stopConditions: [missing-evidence]
assignments:
  - roleId: planner
    agentId: alpha
    mode: lead
    contextKey: planner-alpha
    writeScope: ROLE_ARTIFACT
  - roleId: validator
    agentId: beta
    mode: lead
    contextKey: validator-beta
    writeScope: ROLE_ARTIFACT
---

# Fixture role catalog

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  analyzeAgentRoleCoverage,
  parseRoleCatalog,
  type AgentRoleCoverageReport,
  type RoleCatalog,
} from "../src/controller/agent-role.js";
import type { AgentInventory } from "../src/controller/agent-inventory.js";

const inventory: AgentInventory = {
  sourceDirectory: "C:/agents",
  sourceKind: "CODEX_GLOBAL_TOML",
  agentCount: 3,
  agents: [
    { agentId: "alpha", displayName: "Alpha", description: "Planning", sourcePath: "C:/agents/alpha.toml", sourceSha256: "a".repeat(64) },
    { agentId: "beta", displayName: "Beta", description: "Validation", sourcePath: "C:/agents/beta.toml", sourceSha256: "b".repeat(64) },
    { agentId: "gamma", displayName: "Gamma", description: "Documentation", sourcePath: "C:/agents/gamma.toml", sourceSha256: "c".repeat(64) },
  ],
};

const validCatalogSource = `---
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
  - roleId: planner
    agentId: gamma
    mode: contributor
    contextKey: planner-gamma
    writeScope: NONE
  - roleId: validator
    agentId: alpha
    mode: reviewer
    contextKey: validator-alpha
    writeScope: NONE
  - roleId: validator
    agentId: beta
    mode: lead
    contextKey: validator-beta
    writeScope: ROLE_ARTIFACT
---
`;

function report(source: string = validCatalogSource): AgentRoleCoverageReport {
  const catalog = parseRoleCatalog(source, "fixtures/roles.md");
  return analyzeAgentRoleCoverage(inventory, catalog);
}

test("role catalog: parses roles, context layers, handoffs, and assignments", () => {
  const catalog = parseRoleCatalog(validCatalogSource, "fixtures/roles.md");

  assert.equal(catalog.catalogId, "agent-role-library");
  assert.equal(catalog.roles.length, 2);
  assert.equal(catalog.assignments.length, 4);
  assert.equal(catalog.roles[0]?.contextContract.isolated, true);
});

test("role catalog: rejects a context contract that omits a required layer", () => {
  const source = validCatalogSource.replace("layers: [IDENTITY, ROLE, TASK, EVIDENCE, HANDOFF]", "layers: [IDENTITY, ROLE, TASK, EVIDENCE]");

  assert.throws(() => parseRoleCatalog(source, "fixtures/roles.md"), /contextContract\.layers.*must include/);
});

test("role coverage: accepts one Agent in multiple Roles with isolated contexts", () => {
  const result = report();

  assert.equal(result.status, "READY");
  assert.deepEqual(result.multiRoleAgents.map((entry) => entry.agentId), ["alpha"]);
  assert.deepEqual(result.missingAgentIds, []);
  assert.deepEqual(result.unknownRoleIds, []);
});

test("role coverage: reports an unknown Agent reference", () => {
  const result = report(validCatalogSource.replace("agentId: beta", "agentId: missing-agent"));

  assert.equal(result.status, "NOT_READY");
  assert.deepEqual(result.missingAgentIds, ["missing-agent"]);
});

test("role coverage: reports an unknown Role reference", () => {
  const result = report(validCatalogSource.replace("roleId: validator\n    agentId: alpha", "roleId: missing-role\n    agentId: alpha"));

  assert.equal(result.status, "NOT_READY");
  assert.deepEqual(result.unknownRoleIds, ["missing-role"]);
});

test("role coverage: reports duplicate assignments and lead conflicts", () => {
  const source = validCatalogSource.replace(
    "    contextKey: validator-beta\n    writeScope: ROLE_ARTIFACT\n---",
    "    contextKey: validator-beta\n    writeScope: ROLE_ARTIFACT\n  - roleId: planner\n    agentId: alpha\n    mode: lead\n    contextKey: planner-alpha\n    writeScope: ROLE_ARTIFACT\n---",
  );
  const result = report(source);

  assert.equal(result.status, "NOT_READY");
  assert.equal(result.duplicateAssignments.length > 0, true);
  assert.equal(result.leadConflicts.length > 0, true);
});

test("role coverage: reports shared write scope without a lead", () => {
  const source = validCatalogSource.replace("    mode: lead\n    contextKey: planner-alpha", "    mode: contributor\n    contextKey: planner-alpha");
  const result = report(source);

  assert.equal(result.status, "NOT_READY");
  assert.match(result.sharedWriteViolations.join(";"), /planner:ROLE_ARTIFACT/);
});

test("role coverage: reports context collisions and missing handoff consumers", () => {
  const source = validCatalogSource
    .replace("contextKey: validator-alpha", "contextKey: planner-alpha")
    .replace("acceptsFrom: [planner]", "acceptsFrom: [missing-role]");
  const result = report(source);

  assert.equal(result.status, "NOT_READY");
  assert.equal(result.contextViolations.length > 0, true);
  assert.equal(result.handoffViolations.length > 0, true);
});

test("role coverage: reports an uncovered Role", () => {
  const source = validCatalogSource.replace("  - roleId: validator\n    agentId: beta", "  - roleId: validator\n    agentId: beta");
  const catalog = parseRoleCatalog(source, "fixtures/roles.md");
  const uncovered: RoleCatalog = { ...catalog, assignments: catalog.assignments.filter((assignment) => assignment.roleId !== "validator") };
  const result = analyzeAgentRoleCoverage(inventory, uncovered);

  assert.equal(result.status, "NOT_READY");
  assert.deepEqual(result.uncoveredRoleIds, ["validator"]);
});

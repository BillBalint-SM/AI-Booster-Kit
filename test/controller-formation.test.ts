import assert from "node:assert/strict";
import { test } from "node:test";

import { loadFormationCatalog, parseFormationCatalog } from "../src/controller/formation.js";

const validEntry = `
  - formationId: test-formation
    version: 0.1.0
    status: READY_WITH_LIMIT
    scenario: validation
    weight: light
    complexity: low
    topology: single-agent
    roles: [validator, human-checkpoint]
    requiredInput: [claim, evidence]
    expectedOutput: [validation-result]
    acceptance:
      criteria: [claim-traced]
      evidence: [validation-log]
    relations:
      - kind: validates
        target: controller
    prerequisites: [claim-under-test]
    recovery:
      preserve: [pre-validation-claim]
      stopConditions: [missing-evidence]
    identity:
      key: test-formation
      pattern: validation:light:single-agent
    recipePath: null
    executionBoundary: LOCAL_ONLY
    authority: RECOMMENDATION_ONLY
`;

function catalogSource(entry: string): string {
  return `---
catalogId: agent-formation-library
catalogVersion: 1.0.0
status: READY_WITH_LIMIT
formations:${entry}---
`;
}

test("formation catalog: parses a complete entry with stable identity", () => {
  const catalog = parseFormationCatalog(catalogSource(validEntry), "fixtures/catalog.md");

  assert.equal(catalog.catalogId, "agent-formation-library");
  assert.equal(catalog.formations[0]?.formationId, "test-formation");
  assert.equal(catalog.formations[0]?.identity.key, "test-formation");
});

test("formation catalog: loads the six declared M1-A entries", async () => {
  const catalog = await loadFormationCatalog("contract/agent-library/formation-catalog.md");

  assert.deepEqual(
    catalog.formations.map((formation) => formation.formationId),
    [
      "quick-task-clarifier-validator",
      "bounded-research",
      "bounded-refinement",
      "bounded-implementation",
      "bounded-debugging",
      "bounded-validation",
    ],
  );
  assert.deepEqual(
    catalog.formations.filter((formation) => formation.status === "CANDIDATE").map((formation) => formation.scenario),
    ["development", "debugging"],
  );
  const research = catalog.formations.find((formation) => formation.formationId === "bounded-research");
  assert.equal(research?.status, "READY");
  assert.equal(research?.recipePath, "contract/agent-library/bounded-research.md");
  const refinement = catalog.formations.find((formation) => formation.formationId === "bounded-refinement");
  assert.equal(refinement?.status, "READY");
  assert.equal(refinement?.recipePath, "contract/agent-library/bounded-refinement.md");
  const validation = catalog.formations.find((formation) => formation.formationId === "bounded-validation");
  assert.equal(validation?.status, "READY");
  assert.equal(validation?.recipePath, "contract/agent-library/bounded-validation.md");
});

test("formation catalog: rejects an unknown root field", () => {
  const source = catalogSource(validEntry).replace("status: READY_WITH_LIMIT", "status: READY_WITH_LIMIT\nunsafe: true");

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: frontmatter\.unsafe is not allowed\./);
});

test("formation catalog: rejects an unknown entry field", () => {
  const source = catalogSource(validEntry).replace("    authority: RECOMMENDATION_ONLY", "    authority: RECOMMENDATION_ONLY\n    unsafe: true");

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.unsafe is not allowed\./);
});

test("formation catalog: rejects a missing required dimension", () => {
  const source = catalogSource(validEntry).replace("    requiredInput: [claim, evidence]\n", "");

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.requiredInput is required\./);
});

test("formation catalog: rejects an empty required list", () => {
  const source = catalogSource(validEntry).replace("    requiredInput: [claim, evidence]", "    requiredInput: []");

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.requiredInput must be a non-empty list\./);
});

test("formation catalog: rejects duplicate formation identities", () => {
  const second = validEntry.replace("key: test-formation", "key: second-formation");
  const source = catalogSource(`${validEntry}${second}`);

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[1\]\.formationId duplicates test-formation\./);
});

test("formation catalog: rejects duplicate identity keys even with distinct entry ids", () => {
  const second = validEntry.replace("test-formation", "second-formation").replace("key: second-formation", "key: test-formation");
  const source = catalogSource(`${validEntry}${second}`);

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[1\]\.identity\.key duplicates test-formation\./);
});

test("formation catalog: rejects an unsafe execution boundary", () => {
  const source = catalogSource(validEntry.replace("executionBoundary: LOCAL_ONLY", "executionBoundary: EXTERNAL_WRITE"));

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.executionBoundary must be LOCAL_ONLY\./);
});

test("formation catalog: rejects an authority that could activate work", () => {
  const source = catalogSource(validEntry.replace("authority: RECOMMENDATION_ONLY", "authority: ACTIVATION"));

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.authority must be RECOMMENDATION_ONLY\./);
});

test("formation catalog: rejects unsupported candidate status", () => {
  const source = catalogSource(validEntry.replace("status: READY_WITH_LIMIT", "status: DRAFT"));

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.status must be CANDIDATE, READY_WITH_LIMIT, or READY\./);
});

test("formation catalog: rejects a READY entry without a linked recipe", () => {
  const source = catalogSource(validEntry.replace("status: READY_WITH_LIMIT", "status: READY"));

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: formations\[0\]\.recipePath is required for READY entries\./);
});

test("formation catalog: rejects duplicate YAML keys before validation", () => {
  const source = catalogSource(validEntry.replace("    version: 0.1.0", "    version: 0.1.0\n    version: 0.2.0"));

  assert.throws(() => parseFormationCatalog(source, "fixtures/catalog.md"), /formation catalog rejected: frontmatter contains invalid YAML metadata\./);
});

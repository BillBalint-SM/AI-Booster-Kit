import assert from "node:assert/strict";
import { test } from "node:test";

import { loadFormationCatalog } from "../src/controller/formation.js";
import { recommendFormation } from "../src/controller/formation-recommendation.js";
import { parseQuickTaskRequest } from "../src/controller/request.js";
import type { FormationCatalog, QuickTaskRequest } from "../src/controller/types.js";

const catalogPath = "contract/agent-library/formation-catalog.md";
const baseRequest = parseQuickTaskRequest({
  requestVersion: "1.0",
  workItemType: "Quick Task",
  goal: "Document the outcome of this local task.",
  outcomeOwner: "delivery-team",
  complexity: "LOW",
  executionBoundary: "LOCAL_ONLY",
  value: { state: "KNOWN", statement: "A bounded local result." },
  context: { state: "CURRENT", reference: "repository-state" },
  relations: { state: "ABSENT", items: [] },
  dependencies: { state: "ABSENT", items: [] },
});

test("formation recommendation: selects the ready Quick Task formation with an explanation", async () => {
  const recommendation = recommendFormation(baseRequest, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "quick_task");
  assert.equal(recommendation.formation?.formationId, "quick-task-clarifier-validator");
  assert.deepEqual(recommendation.missingPrerequisites, []);
  assert.deepEqual(recommendation.unknownEvidence, []);
  assert.match(recommendation.reasons[0] ?? "", /ready/);
});

test("formation recommendation: returns bounded candidates for each unready scenario", async () => {
  const catalog = await loadFormationCatalog(catalogPath);
  const cases: readonly [string, string][] = [
    ["Implement a bounded parser improvement.", "development"],
    ["Debug the failing parser test.", "debugging"],
  ];

  for (const [goal, scenario] of cases) {
    const recommendation = recommendFormation({ ...baseRequest, goal }, catalog);
    assert.equal(recommendation.decision, "CANDIDATE");
    assert.equal(recommendation.scenario, scenario);
    assert.equal(recommendation.formation?.status, "CANDIDATE");
    assert.equal(recommendation.requiresAcknowledgement, true);
    assert.equal(recommendation.impact, "UNKNOWN");
  }
});

test("formation recommendation: promotes the linked research recipe to RECOMMEND", async () => {
  const recommendation = recommendFormation({
    ...baseRequest,
    goal: "Research primary sources for the contract.",
    formationInput: {
      scenario: "research",
      scope: "Confirm the contract's source-backed authority boundary.",
      sourceAllowlist: ["official repository documentation"],
      evidenceStandard: ["primary source link and quoted finding"],
    } as unknown as QuickTaskRequest["formationInput"],
  } as unknown as QuickTaskRequest, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "research");
  assert.equal(recommendation.formation?.status, "READY");
  assert.equal(recommendation.formation?.recipePath, "contract/agent-library/bounded-research.md");
  assert.equal(recommendation.requiresAcknowledgement, false);
  assert.equal(recommendation.impact, "COMPATIBLE");
});

test("formation recommendation: keeps research UNKNOWN without the required profile", async () => {
  const recommendation = recommendFormation({ ...baseRequest, goal: "Research primary sources for the contract." }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "UNKNOWN");
  assert.equal(recommendation.requiresAcknowledgement, true);
  assert.deepEqual(recommendation.missingPrerequisites, ["scope", "source-allowlist", "evidence-standard"]);
  assert.equal(recommendation.formation, undefined);
});

test("formation recommendation: promotes the linked refinement recipe to RECOMMEND", async () => {
  const recommendation = recommendFormation({
    ...baseRequest,
    goal: "Refine the acceptance criteria and scope.",
    formationInput: {
      scenario: "refinement",
      currentScope: "The controller remains local and recommendation-only.",
      constraints: ["Do not activate a host or connector."],
      openQuestions: ["Which remaining scenario should become READY next?"],
    },
  }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "refinement");
  assert.equal(recommendation.formation?.status, "READY");
  assert.equal(recommendation.formation?.recipePath, "contract/agent-library/bounded-refinement.md");
  assert.equal(recommendation.requiresAcknowledgement, false);
  assert.equal(recommendation.impact, "COMPATIBLE");
});

test("formation recommendation: keeps refinement UNKNOWN without the required profile", async () => {
  const recommendation = recommendFormation({ ...baseRequest, goal: "Refine the acceptance criteria and scope." }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "UNKNOWN");
  assert.equal(recommendation.requiresAcknowledgement, true);
  assert.deepEqual(recommendation.missingPrerequisites, ["current-scope", "constraints", "open-questions"]);
  assert.equal(recommendation.formation, undefined);
});

test("formation recommendation: promotes the linked validation recipe to RECOMMEND", async () => {
  const recommendation = recommendFormation({
    ...baseRequest,
    goal: "Validate the local contract with tests.",
    formationInput: {
      scenario: "validation",
      claim: "The local contract is valid.",
      acceptanceCriteria: ["all contract checks pass"],
      evidenceSources: ["local test output"],
      knownLimits: ["Node 22 CI is the exact runtime gate"],
    },
  }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "RECOMMEND");
  assert.equal(recommendation.scenario, "validation");
  assert.equal(recommendation.formation?.status, "READY");
  assert.equal(recommendation.formation?.recipePath, "contract/agent-library/bounded-validation.md");
  assert.equal(recommendation.requiresAcknowledgement, false);
  assert.equal(recommendation.impact, "COMPATIBLE");
});

test("formation recommendation: keeps validation UNKNOWN without the required profile", async () => {
  const recommendation = recommendFormation({ ...baseRequest, goal: "Validate the local contract with tests." }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "UNKNOWN");
  assert.equal(recommendation.requiresAcknowledgement, true);
  assert.deepEqual(recommendation.missingPrerequisites, ["claim-under-test", "acceptance-criteria", "evidence-sources", "known-limits"]);
  assert.equal(recommendation.formation, undefined);
});

test("formation recommendation: preserves ambiguity instead of guessing", async () => {
  const recommendation = recommendFormation({ ...baseRequest, goal: "Research and implement the parser." }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "UNKNOWN");
  assert.equal(recommendation.scenario, "UNKNOWN");
  assert.equal(recommendation.formation, undefined);
  assert.deepEqual(recommendation.unknownEvidence, ["scenario"]);
  assert.match(recommendation.reasons[0] ?? "", /multiple scenarios/);
});

test("formation recommendation: stops when a recognized scenario has no catalog entry", async () => {
  const catalog = await loadFormationCatalog(catalogPath);
  const withoutValidation = { ...catalog, formations: catalog.formations.filter((formation) => formation.scenario !== "validation") } as FormationCatalog;
  const recommendation = recommendFormation({ ...baseRequest, goal: "Validate the local contract with tests." }, withoutValidation);

  assert.equal(recommendation.decision, "UNKNOWN");
  assert.deepEqual(recommendation.unknownEvidence, ["catalog:validation"]);
  assert.equal(recommendation.formation, undefined);
});

test("formation recommendation: stops when a scenario has duplicate catalog entries", async () => {
  const catalog = await loadFormationCatalog(catalogPath);
  const duplicate = { ...catalog.formations.find((formation) => formation.scenario === "research"), formationId: "second-research" };
  const duplicatedCatalog = { ...catalog, formations: [...catalog.formations, duplicate] } as FormationCatalog;
  const recommendation = recommendFormation({ ...baseRequest, goal: "Research primary sources for the contract." }, duplicatedCatalog);

  assert.equal(recommendation.decision, "UNKNOWN");
  assert.deepEqual(recommendation.unknownEvidence, ["catalog:research"]);
  assert.equal(recommendation.formation, undefined);
});

test("formation recommendation: rejects a high-complexity request before candidate selection", async () => {
  const recommendation = recommendFormation({ ...baseRequest, goal: "Implement a parser improvement.", complexity: "HIGH" }, await loadFormationCatalog(catalogPath));

  assert.equal(recommendation.decision, "NO_FIT");
  assert.equal(recommendation.scenario, "development");
  assert.deepEqual(recommendation.unknownEvidence, []);
  assert.match(recommendation.reasons[0] ?? "", /complexity/);
});

test("formation recommendation: reports missing and unknown request evidence", async () => {
  const missingContext = { ...baseRequest };
  delete missingContext.context;
  const missing = recommendFormation(missingContext, await loadFormationCatalog(catalogPath));
  assert.equal(missing.decision, "UNKNOWN");
  assert.deepEqual(missing.missingPrerequisites, ["current-or-unknown-context"]);

  const unknown = recommendFormation({ ...baseRequest, context: { state: "UNKNOWN" }, relations: { state: "UNKNOWN", items: [] } }, await loadFormationCatalog(catalogPath));
  assert.equal(unknown.decision, "UNKNOWN");
  assert.deepEqual(unknown.unknownEvidence, ["context", "relations"]);
});

test("formation recommendation: preserves no-Agent and custom-tool precedence", async () => {
  const catalog = await loadFormationCatalog(catalogPath);
  const noAgent = recommendFormation({ ...baseRequest, preferences: { continuation: "NO_AGENT" } }, catalog);
  const customTool = recommendFormation({ ...baseRequest, preferences: { continuation: "CUSTOM_TOOL" } }, catalog);

  assert.equal(noAgent.decision, "NO_AGENT");
  assert.equal(noAgent.formation, undefined);
  assert.equal(customTool.decision, "NO_AGENT");
  assert.equal(customTool.impact, "UNKNOWN");
  assert.equal(customTool.requiresAcknowledgement, true);
});

test("formation recommendation: rejects a runtime-shaped unsafe request without echoing it", async () => {
  const unsafe = { ...baseRequest, executionBoundary: "EXTERNAL_WRITE" } as unknown as QuickTaskRequest;

  assert.throws(
    () => recommendFormation(unsafe, { formations: [], catalogId: "agent-formation-library", catalogVersion: "1.0.0", status: "READY_WITH_LIMIT" }),
    (error: unknown) => error instanceof Error && /executionBoundary must be LOCAL_ONLY/.test(error.message) && !error.message.includes("EXTERNAL_WRITE"),
  );
});

test("formation recommendation: keeps structural identity stable without goal text", async () => {
  const catalog = await loadFormationCatalog(catalogPath);
  const changedGoal = recommendFormation({ ...baseRequest, goal: "A different private goal." }, catalog);
  const changedScenario = recommendFormation({ ...baseRequest, goal: "Debug the failing parser test." }, catalog);
  const changedComplexity = recommendFormation({ ...baseRequest, complexity: "MEDIUM" }, catalog);

  assert.equal(changedGoal.recommendationId, recommendFormation(baseRequest, catalog).recommendationId);
  assert.notEqual(changedScenario.recommendationId, changedGoal.recommendationId);
  assert.notEqual(changedComplexity.recommendationId, changedGoal.recommendationId);
});

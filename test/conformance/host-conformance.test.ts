import assert from "node:assert/strict";
import { test } from "node:test";

import { codexAdapter } from "../../src/adapters/codex.js";
import { claudeCodeAdapter } from "../../src/adapters/claude-code.js";
import { cursorAdapter } from "../../src/adapters/cursor.js";
import { parseG2asReadinessManifest } from "../../src/readiness/manifest.js";
import { parseReadinessObservationBundle } from "../../src/readiness/observations.js";
import { evaluateReadiness } from "../../src/readiness/evaluate.js";
import { readinessCapability } from "../readiness-capability.js";
import { readFile } from "node:fs/promises";

const adapters = [codexAdapter, claudeCodeAdapter, cursorAdapter];

test("conformance: all hosts preserve canonical event fields for shared lifecycle and attention scenarios", () => {
  for (const fixture of fixtures()) {
    const events = adapters.map((adapter) => adapter.emitEvent({ ...fixture, host: adapter.capabilityReport().host } as never));
    const canonicalFields = events.map(({ timestamp: _timestamp, ...event }) => ({
      eventType: event.eventType,
      artifactId: event.artifactId,
      executionSetId: event.executionSetId,
      sourceRevision: event.sourceRevision,
      evidenceRefs: event.evidenceRefs,
      beforeState: event.beforeState,
      afterState: event.afterState,
    }));

    assert.deepEqual(canonicalFields, [canonicalFields[0], canonicalFields[0], canonicalFields[0]], fixture.eventType);
    assert.equal(events[0]?.idempotencyKey, events[1]?.idempotencyKey, fixture.eventType);
    assert.equal(events[1]?.idempotencyKey, events[2]?.idempotencyKey, fixture.eventType);
  }
});

test("conformance: hosts report declared local-only capability differences without changing canonical semantics", () => {
  assert.equal(codexAdapter.capabilityReport().capabilities.localEventEmission, "supported_with_limits");
  assert.equal(claudeCodeAdapter.capabilityReport().capabilities.localEventEmission, "supported_with_limits");
  assert.equal(cursorAdapter.capabilityReport().capabilities.localEventEmission, "supported_with_limits");
  for (const adapter of adapters) {
    assert.equal(adapter.capabilityReport().capabilities.externalWrite, "unsupported");
  }
});

test("conformance: equivalent host capability evidence produces the same readiness decision", async () => {
  const manifest = parseG2asReadinessManifest({
    version: 1,
    tenantUrl: "https://pte-politechnika.atlassian.net",
    jira: { projectKey: "G2AS", issueKey: "G2AS-1", expectedStatus: "To Do" },
    confluence: { spaceKey: "G2AS", pageId: "31752193" },
    github: {
      repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
      branch: "main",
      commit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
      fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"],
    },
  });
  const source = JSON.parse(await readFile("test/fixtures/readiness/ready.json", "utf8")) as { observations: Array<Record<string, unknown>> };
  const certificates = ["codex", "claude-code", "cursor"].map((host) => {
    const bundle = structuredClone(source) as typeof source;
    const github = bundle.observations.find((observation) => observation.source === "github");
    if (github === undefined) throw new Error("ready fixture is incomplete");
    github.capabilityEvidence = { ...(github.capabilityEvidence as Record<string, unknown>), host };
    return evaluateReadiness(manifest, parseReadinessObservationBundle(bundle), readinessCapability);
  });

  assert.deepEqual(certificates.map((certificate) => certificate.decision), ["READY", "READY", "READY"]);
  assert.deepEqual(certificates.map((certificate) => certificate.checks.map((check) => check.expectedFingerprint)), [certificates[0]?.checks.map((check) => check.expectedFingerprint), certificates[0]?.checks.map((check) => check.expectedFingerprint), certificates[0]?.checks.map((check) => check.expectedFingerprint)]);
});

function fixtures() {
  return [
    baseEvent("milestone_finalized", ["milestone-finalization-record"]),
    baseEvent("child_scope_created", ["accepted-scope-record"]),
    { ...baseEvent("implementation_started", ["implementation-started", "implementation-start-check-passed", "milestone-finalization-record", "accepted-scope-record"]), implementationStart: { startCheck: startCheckInput(), executionSetId: "set-1" } },
    baseEvent("review_failed", ["review-failed"]),
    baseEvent("dependency_flagged", ["dependency-evidence"]),
    baseEvent("ambiguous_target_stop", ["ambiguous-target"]),
    baseEvent("github_evidence_read_back", ["github-read-back"]),
  ];
}

function baseEvent(eventType: string, evidenceRefs: string[]) {
  return {
    host: "codex" as const,
    eventType,
    artifactId: "GDEAI-102",
    executionSetId: "set-1",
    milestoneId: "GDEAI-100",
    sourceRevision: "adapter-revision",
    actor: "local-agent",
    evidenceRefs,
  };
}

function startCheckInput() {
  return {
    milestoneId: "GDEAI-100",
    epicId: "GDEAI-101",
    workItemIds: ["GDEAI-102"],
    acceptanceCriteria: ["Adapter events remain local."],
    dependencyIds: [],
    repository: "example/agent-agnostic-sync-orchestrator",
    branchName: "feature/adapter-conformance",
    worktreePath: "C:/worktrees/agent-agnostic-sync-orchestrator",
    baseRevision: "abc123",
    actor: "local-agent",
    roadmapRevision: "adapter-revision",
    finalization: { state: "finalized" as const, acceptanceDecision: "accepted" as const, evidenceRefs: ["milestone-finalization-record"] },
    acceptedScope: { workItemIds: ["GDEAI-102"], acceptanceCriteria: ["Adapter events remain local."], evidenceRefs: ["accepted-scope-record"] },
    hierarchy: { epicParentMilestoneId: "GDEAI-100", workItemParentEpicIds: { "GDEAI-102": "GDEAI-101" } },
  };
}

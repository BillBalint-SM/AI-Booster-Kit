import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateReadiness } from "../src/readiness/evaluate.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import { parseReadinessObservationBundle } from "../src/readiness/observations.js";
import type { ReadinessObservationBundle } from "../src/readiness/observations.js";

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

test("readiness evaluator: certifies all four exact checks as ready without writes", async () => {
  const certificate = evaluateReadiness(manifest, await readBundle("ready.json"));

  assert.equal(certificate.decision, "READY");
  assert.deepEqual(certificate.checks.map((check) => [check.name, check.state]), [
    ["jira", "verified"], ["confluence", "verified"], ["github", "verified"], ["traceability", "verified"],
  ]);
  assert.equal(certificate.externalWriteCount, 0);
  assert.deepEqual(certificate.unchangedSystems, ["jira", "confluence", "github"]);
  assert.deepEqual(certificate.decisionOptions, ["Continue", "Stop"]);
  assert.equal(certificate.remediation.length, 0);
});

test("readiness evaluator: stops unknown capability and timeout observations", async () => {
  const capabilityBundle = await readBundle("not-ready.json");
  const timeoutBundle = replaceObservation(capabilityBundle, "confluence", {
    state: "unknown",
    capabilityState: "verified",
    diagnosticCode: "TIMEOUT_UNKNOWN",
  });

  for (const bundle of [capabilityBundle, timeoutBundle]) {
    const certificate = evaluateReadiness(manifest, bundle);
    assert.equal(certificate.decision, "STOPPED");
    assert.deepEqual(certificate.decisionOptions, ["Stop"]);
  }
});

test("readiness evaluator: stops Jira target and project mismatches", async () => {
  const stopped = evaluateReadiness(manifest, await readBundle("stopped.json"));
  const projectMismatch = replaceObservedId(await readBundle("ready.json"), "jira", "projectKey", "OTHER");

  assert.equal(stopped.decision, "STOPPED");
  assert.equal(stopped.checks[0].diagnosticCode, "TARGET_MISMATCH");
  assert.equal(evaluateReadiness(manifest, projectMismatch).decision, "STOPPED");
});

test("readiness evaluator: stops GitHub repository and SHA mismatches", async () => {
  const ready = await readBundle("ready.json");
  const repositoryMismatch = replaceObservedId(ready, "github", "repository", "owner/other");
  const shaMismatch = replaceObservedId(ready, "github", "commit", "a".repeat(40));
  const pathOrderMismatch = replaceObservation(ready, "github", {
    observedIds: {
      ...ready.observations.find((observation) => observation.source === "github")?.observedIds,
      fixturePathOne: "docs/fixtures/G2AS-1.json",
      fixturePathTwo: "docs/fixtures/G2AS-1.md",
    },
  });

  assert.equal(evaluateReadiness(manifest, repositoryMismatch).decision, "STOPPED");
  assert.equal(evaluateReadiness(manifest, shaMismatch).decision, "STOPPED");
  assert.equal(evaluateReadiness(manifest, pathOrderMismatch).decision, "STOPPED");
});

test("readiness evaluator: stops missing Jira-Git and Confluence trace links", async () => {
  const noJiraGit = replaceObservedId(await readBundle("ready.json"), "traceability", "jiraGitLinkId", "");
  const noConfluenceJira = replaceObservedId(await readBundle("ready.json"), "traceability", "confluenceJiraRefId", "");
  const noConfluenceGit = replaceObservedId(await readBundle("ready.json"), "traceability", "confluenceGitRefId", "");

  for (const bundle of [noJiraGit, noConfluenceJira, noConfluenceGit]) {
    const certificate = evaluateReadiness(manifest, bundle);
    assert.equal(certificate.decision, "STOPPED");
    assert.equal(certificate.checks[3].diagnosticCode, "TRACEABILITY_MISMATCH");
  }
});

test("readiness evaluator: stops Jira and Confluence tenant origin scheme and port mismatches", async () => {
  const ready = await readBundle("ready.json");
  const mismatches: Array<[source: "jira" | "confluence", bundle: ReadinessObservationBundle]> = [
    ["jira", replaceObservedId(ready, "jira", "tenantOrigin", "http://pte-politechnika.atlassian.net")],
    ["jira", replaceObservedId(ready, "jira", "tenantOrigin", "https://pte-politechnika.atlassian.net:444")],
    ["confluence", replaceObservedId(ready, "confluence", "tenantOrigin", "http://pte-politechnika.atlassian.net")],
    ["confluence", replaceObservedId(ready, "confluence", "tenantOrigin", "https://pte-politechnika.atlassian.net:444")],
  ];

  for (const [source, bundle] of mismatches) {
    const certificate = evaluateReadiness(manifest, bundle);
    assert.equal(certificate.decision, "STOPPED");
    assert.equal(certificate.checks.find((check) => check.name === source)?.diagnosticCode, "TARGET_MISMATCH");
  }
});

test("readiness evaluator: stops present native trace references with wrong destinations", async () => {
  const ready = await readBundle("ready.json");
  const mismatches = [
    replaceObservedId(ready, "traceability", "jiraGitLinkedCommit", "a".repeat(40)),
    replaceObservedId(ready, "traceability", "confluenceJiraReferencedKey", "G2AS-2"),
    replaceObservedId(ready, "traceability", "confluenceGitReferencedCommit", "b".repeat(40)),
  ];

  for (const bundle of mismatches) {
    const certificate = evaluateReadiness(manifest, bundle);
    assert.equal(certificate.decision, "STOPPED");
    assert.equal(certificate.checks[3].diagnosticCode, "TRACEABILITY_MISMATCH");
  }
});

test("readiness evaluator: remediates verified checks with actionable diagnostics", async () => {
  const ready = await readBundle("ready.json");
  const diagnostics = ["TIMEOUT_UNKNOWN", "TARGET_MISMATCH"] as const;

  for (const diagnosticCode of diagnostics) {
    const certificate = evaluateReadiness(manifest, replaceObservation(ready, "jira", {
      state: "verified",
      diagnosticCode,
    }));
    const check = certificate.checks[0];

    assert.notEqual(check.nextAction, "No action required.");
    assert.ok(certificate.remediation.includes(check.nextAction));
    assert.ok(certificate.remediation.length > 0);
  }
});

test("readiness evaluator: stops forbidden read paths and returns stable fingerprints", async () => {
  const ready = await readBundle("ready.json");
  const forbiddenPath = replaceObservation(ready, "jira", { readPath: "fixture" as never });
  const first = evaluateReadiness(manifest, ready);
  const second = evaluateReadiness(manifest, ready);

  assert.equal(evaluateReadiness(manifest, forbiddenPath).decision, "STOPPED");
  assert.equal(first.manifestFingerprint, second.manifestFingerprint);
  assert.equal(first.checks[0].expectedFingerprint, second.checks[0].expectedFingerprint);
  assert.equal(first.checks[0].observedFingerprint, second.checks[0].observedFingerprint);
  assert.doesNotMatch(JSON.stringify(first), /"observedIds"/);
});

test("readiness evaluator: canonical fingerprints ignore object insertion order", async () => {
  const ready = await readBundle("ready.json");
  const reorderedManifest = {
    github: { fixturePaths: manifest.github.fixturePaths, commit: manifest.github.commit, branch: manifest.github.branch, repository: manifest.github.repository },
    confluence: { pageId: manifest.confluence.pageId, spaceKey: manifest.confluence.spaceKey },
    jira: { expectedStatus: manifest.jira.expectedStatus, issueKey: manifest.jira.issueKey, projectKey: manifest.jira.projectKey },
    tenantUrl: manifest.tenantUrl,
    version: manifest.version,
  };
  const reorderedBundle: ReadinessObservationBundle = {
    runAt: ready.runAt,
    correlationId: ready.correlationId,
    observations: [
      reorderObservation(ready.observations[3]),
      reorderObservation(ready.observations[2]),
      reorderObservation(ready.observations[1]),
      reorderObservation(ready.observations[0]),
    ],
  };
  const first = evaluateReadiness(manifest, ready);
  const second = evaluateReadiness(reorderedManifest, reorderedBundle);

  assert.equal(first.manifestFingerprint, second.manifestFingerprint);
  assert.deepEqual(first.checks.map((check) => check.expectedFingerprint), second.checks.map((check) => check.expectedFingerprint));
  assert.deepEqual(first.checks.map((check) => check.observedFingerprint), second.checks.map((check) => check.observedFingerprint));
});

test("readiness evaluator: reports a completed non-verification as not ready", async () => {
  const bundle = replaceObservation(await readBundle("ready.json"), "confluence", {
    state: "unknown",
    diagnosticCode: "NONE",
  });

  const certificate = evaluateReadiness(manifest, bundle);

  assert.equal(certificate.decision, "NOT READY");
  assert.deepEqual(certificate.decisionOptions, ["Stop"]);
});

async function readBundle(name: string): Promise<ReadinessObservationBundle> {
  const source = await readFile(`test/fixtures/readiness/${name}`, "utf8");
  return parseReadinessObservationBundle(JSON.parse(source));
}

function replaceObservation(
  bundle: ReadinessObservationBundle,
  source: string,
  changes: Partial<ReadinessObservationBundle["observations"][number]>,
): ReadinessObservationBundle {
  return {
    ...bundle,
    observations: bundle.observations.map((observation) => observation.source === source ? { ...observation, ...changes } : observation) as ReadinessObservationBundle["observations"],
  };
}

function replaceObservedId(
  bundle: ReadinessObservationBundle,
  source: string,
  field: string,
  value: string,
): ReadinessObservationBundle {
  return replaceObservation(bundle, source, {
    observedIds: {
      ...bundle.observations.find((observation) => observation.source === source)?.observedIds,
      [field]: value,
    },
  });
}

function reorderObservation(
  observation: ReadinessObservationBundle["observations"][number],
): ReadinessObservationBundle["observations"][number] {
  return {
    source: observation.source,
    state: observation.state,
    readPath: observation.readPath,
    capabilityState: observation.capabilityState,
    observedIds: Object.fromEntries(Object.entries(observation.observedIds).reverse()),
    evidenceRefs: observation.evidenceRefs,
    diagnosticCode: observation.diagnosticCode,
    observedAt: observation.observedAt,
  };
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import { ingestCodexReadOnlyEvidence, type CodexReadOnlyEvidenceAdapter } from "../src/evidence/ingest.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import { parseReadinessObservationBundle } from "../src/readiness/observations.js";
import { readinessCapability } from "./readiness-capability.js";

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

test("evidence ingestion: accepts one Codex read and returns only READY evidence", async () => {
  const bundle = await readFixture("ready.json");
  let calls = 0;
  const adapter: CodexReadOnlyEvidenceAdapter = {
    host: "codex",
    async read(receivedManifest: typeof manifest) {
      calls += 1;
      assert.equal(receivedManifest, manifest);
      return bundle;
    },
  };

  const result = await ingestCodexReadOnlyEvidence(manifest, adapter, readinessCapability);

  assert.equal(calls, 1);
  assert.equal(result.host, "codex");
  assert.equal(result.certificate.decision, "READY");
  assert.equal(result.certificate.externalWriteCount, 0);
  assert.equal(result.certificate.unchangedSystems.join(","), "jira,confluence,github");
});

test("evidence ingestion: rejects a non-Codex adapter before reading", async () => {
  let calls = 0;
  const adapter = {
    host: "claude-code",
    async read() {
      calls += 1;
      return await readFixture("ready.json");
    },
  } as unknown as CodexReadOnlyEvidenceAdapter;

  await assert.rejects(
    () => ingestCodexReadOnlyEvidence(manifest, adapter, readinessCapability),
    /Codex read-only evidence boundary rejected: host must be codex\./,
  );
  assert.equal(calls, 0);
});

test("evidence ingestion: rejects non-Codex capability evidence even when the general certificate would pass", async () => {
  const bundle = await readFixture("ready.json");
  const github = bundle.observations.find((observation) => observation.source === "github");
  if (github === undefined || github.capabilityEvidence === undefined) throw new Error("ready fixture is incomplete");

  const adapter: CodexReadOnlyEvidenceAdapter = {
    host: "codex",
    async read() {
      return {
        ...bundle,
        observations: bundle.observations.map((observation) => observation.source === "github"
          ? { ...observation, capabilityEvidence: { ...github.capabilityEvidence, host: "claude-code" } }
          : observation),
      };
    },
  };

  await assert.rejects(
    () => ingestCodexReadOnlyEvidence(manifest, adapter, readinessCapability),
    /Codex read-only evidence boundary rejected: capability evidence host must be codex\./,
  );
});

test("evidence ingestion: fails closed for target mismatch and stale or unknown evidence", async () => {
  const readyBundle = await readFixture("ready.json");
  const jira = readyBundle.observations.find((observation) => observation.source === "jira");
  if (jira === undefined) throw new Error("ready fixture is incomplete");

  const cases = [
    {
      name: "target mismatch",
      bundle: replaceObservation(readyBundle, "jira", { observedIds: { ...jira.observedIds, projectKey: "OTHER" } }),
    },
    {
      name: "stale or unknown evidence",
      bundle: replaceObservation(readyBundle, "confluence", { state: "unknown", diagnosticCode: "TIMEOUT_UNKNOWN" }),
    },
  ];

  for (const { name, bundle } of cases) {
    const adapter: CodexReadOnlyEvidenceAdapter = { host: "codex", read: async () => bundle };
    await assert.rejects(
      () => ingestCodexReadOnlyEvidence(manifest, adapter, readinessCapability),
      /Codex read-only evidence boundary rejected: readiness decision is not READY\./,
      name,
    );
  }
});

async function readFixture(name: string) {
  return parseReadinessObservationBundle(JSON.parse(await readFile(resolve("test/fixtures/readiness", name), "utf8")) as unknown);
}

function replaceObservation(
  bundle: Awaited<ReturnType<typeof readFixture>>,
  source: string,
  changes: Record<string, unknown>,
) {
  return {
    ...bundle,
    observations: bundle.observations.map((observation) => observation.source === source ? { ...observation, ...changes } : observation),
  };
}

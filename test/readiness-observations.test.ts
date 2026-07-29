import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  parseReadinessObservationBundle,
  readObservations,
} from "../src/readiness/observations.js";
import type { G2asReadinessManifest } from "../src/readiness/types.js";

const fixtureDirectory = "test/fixtures/readiness";
const manifest: G2asReadinessManifest = {
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
};

test("readiness observations: parses four safe observations from the ready fixture", async () => {
  const fixture = await readFixture("ready.json");
  const bundle = parseReadinessObservationBundle(fixture);

  assert.equal(bundle.observations.length, 4);
  assert.deepEqual(bundle.observations.map((observation) => observation.source).sort(), [
    "confluence", "github", "jira", "traceability",
  ]);
});

test("readiness observations: accepts exact tenant origins and complete native trace destinations", async () => {
  const fixture = await readFixture("ready.json");
  const correctedFixture = withSchemaCorrection(fixture);

  const bundle = parseReadinessObservationBundle(correctedFixture);

  assert.equal(bundle.observations.find((observation) => observation.source === "jira")?.observedIds.tenantOrigin, "https://pte-politechnika.atlassian.net");
  assert.equal(bundle.observations.find((observation) => observation.source === "confluence")?.observedIds.tenantOrigin, "https://pte-politechnika.atlassian.net");
  assert.deepEqual(bundle.observations.find((observation) => observation.source === "traceability")?.observedIds, {
    jiraIssueKey: "G2AS-1",
    githubCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    confluencePageId: "31752193",
    jiraGitLinkId: "10005",
    jiraGitLinkedCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    confluenceJiraRefId: "10006",
    confluenceJiraReferencedKey: "G2AS-1",
    confluenceGitRefId: "10007",
    confluenceGitReferencedCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    confluenceGitReferenceKind: "smart_link",
  });
});

test("readiness observations: requires tenant origins and every native trace reference field", async () => {
  const fixture = withSchemaCorrection(await readFixture("ready.json"));
  const requiredFields: Array<[source: "jira" | "confluence" | "traceability", field: string]> = [
    ["jira", "tenantOrigin"],
    ["confluence", "tenantOrigin"],
    ["traceability", "jiraIssueKey"],
    ["traceability", "githubCommit"],
    ["traceability", "confluencePageId"],
    ["traceability", "jiraGitLinkId"],
    ["traceability", "jiraGitLinkedCommit"],
    ["traceability", "confluenceJiraRefId"],
    ["traceability", "confluenceJiraReferencedKey"],
    ["traceability", "confluenceGitRefId"],
    ["traceability", "confluenceGitReferencedCommit"],
    ["traceability", "confluenceGitReferenceKind"],
  ];

  for (const [source, field] of requiredFields) {
    assertRejected(withoutObservedId(fixture, source, field), "observed ID field");
  }
});

test("readiness observations: rejects arbitrary URIs in every non-tenant-origin observed field", async () => {
  const fixture = withSchemaCorrection(await readFixture("ready.json"));
  const observations = fixture.observations as Array<Record<string, unknown>>;

  for (const observation of observations) {
    const source = observation.source as "jira" | "confluence" | "github" | "traceability";
    const observedIds = observation.observedIds as Record<string, string>;

    for (const field of Object.keys(observedIds).filter((candidate) => candidate !== "tenantOrigin")) {
      assertRejected(withObservedId(fixture, source, field, "https://untrusted.example.test/value"), "observed ID");
    }
  }
});

test("readiness observations: rejects a missing or duplicate source", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as unknown[];

  assertRejected({ ...fixture, observations: observations.slice(0, 3) }, "source set");
  assertRejected({ ...fixture, observations: [...observations.slice(0, 3), observations[0]] }, "source set");
});

test("readiness observations: rejects an unknown read path", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;

  assertRejected(
    { ...fixture, observations: [{ ...observations[0], readPath: "fixture" }, ...observations.slice(1)] },
    "read path",
  );
});

test("readiness observations: rejects unsafe evidence without exposing it", async () => {
  const fixture = await readFixture("ready.json");
  const unsafeValue = "do-not-echo-this-token";
  const observations = fixture.observations as Array<Record<string, unknown>>;

  assert.throws(
    () => parseReadinessObservationBundle({ ...fixture, observations: [{ ...observations[0], evidenceRefs: [unsafeValue] }, ...observations.slice(1)] }),
    (error: unknown) => error instanceof Error && error.message === "G2AS readiness observations rejected: unsafe evidence." && !error.message.includes(unsafeValue),
  );
});

test("readiness observations: rejects ftp and custom URL schemes in accepted text fields", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;

  assertRejected({ ...fixture, correlationId: "ftp://host.example/run" }, "correlation ID");
  assertRejected(
    { ...fixture, observations: [{ ...observations[0], observedIds: { ...(observations[0]?.observedIds as Record<string, string>), issueId: "g2as+host://target/10002" } }, ...observations.slice(1)] },
    "observed ID",
  );
  assertRejected(
    { ...fixture, observations: [{ ...observations[0], evidenceRefs: ["ftp://host.example/evidence"] }, ...observations.slice(1)] },
    "unsafe evidence",
  );
});

test("readiness observations: rejects opaque URI schemes in correlation IDs and observed IDs", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;

  assertRejected({ ...fixture, correlationId: "mailto:owner@example.test" }, "correlation ID");
  assertRejected({ ...fixture, correlationId: "urn:g2as:run:001" }, "correlation ID");
  assertRejected(
    { ...fixture, observations: [{ ...observations[0], observedIds: { ...(observations[0]?.observedIds as Record<string, string>), issueId: "data:text/plain,G2AS-1" } }, ...observations.slice(1)] },
    "observed ID",
  );
});

test("readiness observations: rejects hidden unsafe object and array keys", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;
  const hiddenObject = { ...observations[0] };
  Object.defineProperty(hiddenObject, "cookie", { value: "do-not-echo-hidden-cookie" });
  const hiddenArray = [...(observations[1]?.evidenceRefs as string[])];
  Object.defineProperty(hiddenArray, "authorization", { value: "do-not-echo-hidden-authorization" });

  assertRejected({ ...fixture, observations: [hiddenObject, ...observations.slice(1)] }, "unsafe field");
  assertRejected({ ...fixture, observations: [{ ...observations[0] }, { ...observations[1], evidenceRefs: hiddenArray }, ...observations.slice(2)] }, "unsafe field");
});

test("readiness observations: rejects inherited credential-like properties", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;
  const inheritedObservedIds = Object.assign(
    Object.create({ credential: "do-not-echo-inherited-credential" }) as Record<string, string>,
    observations[0]?.observedIds as Record<string, string>,
  );

  assertRejected(
    { ...fixture, observations: [{ ...observations[0], observedIds: inheritedObservedIds }, ...observations.slice(1)] },
    "unsafe field",
  );
});

test("readiness observations: rejects invalid observed ID fields", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;

  assertRejected(
    { ...fixture, observations: [{ ...observations[0], observedIds: { ...(observations[0]?.observedIds as Record<string, string>), pageUrl: "value" } }, ...observations.slice(1)] },
    "observed ID field",
  );
});

test("readiness observations: rejects calendar-overflow ISO timestamps", async () => {
  const fixture = await readFixture("ready.json");

  assertRejected({ ...fixture, runAt: "2026-02-31T10:00:00.000Z" }, "timestamp");
});

test("readiness observations: rejects the unsafe fixture", async () => {
  assertRejected(await readFixture("unsafe-observation.json"), "unsafe field");
});

test("readiness observations: requires strict GitHub capability evidence", async () => {
  const fixture = await readFixture("ready.json");
  const observations = fixture.observations as Array<Record<string, unknown>>;
  const github = observations.find((observation) => observation.source === "github");
  if (github === undefined || github.capabilityEvidence === undefined) throw new Error("ready fixture is incomplete");

  const missing = structuredClone(fixture) as unknown as { observations: Array<Record<string, unknown>> };
  delete missing.observations.find((observation) => observation.source === "github")?.capabilityEvidence;
  assert.throws(() => parseReadinessObservationBundle(missing), /capability evidence/);

  const unsupportedHost = structuredClone(fixture) as unknown as { observations: Array<Record<string, unknown>> };
  const githubRecord = unsupportedHost.observations.find((observation) => observation.source === "github");
  if (githubRecord === undefined) throw new Error("ready fixture is incomplete");
  githubRecord.capabilityEvidence = { ...github.capabilityEvidence, host: "unknown" };
  assert.throws(() => parseReadinessObservationBundle(unsupportedHost), /capability evidence/);
});

test("readiness observations: invokes the injected adapter once without network or credential behavior", async () => {
  const fixture = await readFixture("not-ready.json");
  let calls = 0;
  const adapter = {
    async read(receivedManifest: G2asReadinessManifest) {
      calls += 1;
      assert.equal(receivedManifest, manifest);
      return fixture as never;
    },
  };
  const source = await readFile("src/readiness/observations.ts", "utf8");

  const bundle = await readObservations(adapter, manifest);

  assert.equal(calls, 1);
  assert.equal(bundle.observations[0].source, "jira");
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.env|credentialProvider|resolveCredentials/);
});

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(`${fixtureDirectory}/${name}`, "utf8")) as Record<string, unknown>;
}

function assertRejected(value: unknown, category: string): void {
  assert.throws(
    () => parseReadinessObservationBundle(value),
    (error: unknown) => error instanceof Error && error.message === `G2AS readiness observations rejected: ${category}.`,
  );
}

function withSchemaCorrection(fixture: Record<string, unknown>): Record<string, unknown> {
  const observations = fixture.observations as Array<Record<string, unknown>>;

  return {
    ...fixture,
    observations: observations.map((observation) => {
      if (observation.source === "jira" || observation.source === "confluence") {
        const { tenantHost: _tenantHost, ...observedIds } = observation.observedIds as Record<string, string>;
        return { ...observation, observedIds: { tenantOrigin: "https://pte-politechnika.atlassian.net", ...observedIds } };
      }
      if (observation.source === "traceability") {
        return {
          ...observation,
          observedIds: {
            ...(observation.observedIds as Record<string, string>),
            jiraGitLinkedCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
            confluenceJiraReferencedKey: "G2AS-1",
            confluenceGitReferencedCommit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
          },
        };
      }

      return observation;
    }),
  };
}

function withObservedId(
  fixture: Record<string, unknown>,
  source: "jira" | "confluence" | "github" | "traceability",
  field: string,
  value: string,
): Record<string, unknown> {
  const observations = fixture.observations as Array<Record<string, unknown>>;

  return {
    ...fixture,
    observations: observations.map((observation) => observation.source === source
      ? { ...observation, observedIds: { ...(observation.observedIds as Record<string, string>), [field]: value } }
      : observation),
  };
}

function withoutObservedId(
  fixture: Record<string, unknown>,
  source: "jira" | "confluence" | "traceability",
  field: string,
): Record<string, unknown> {
  const observations = fixture.observations as Array<Record<string, unknown>>;

  return {
    ...fixture,
    observations: observations.map((observation) => {
      if (observation.source !== source) return observation;

      const observedIds = { ...(observation.observedIds as Record<string, string>) };
      delete observedIds[field];
      return { ...observation, observedIds };
    }),
  };
}

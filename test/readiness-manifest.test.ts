import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  loadG2asReadinessManifest,
  parseG2asReadinessManifest,
} from "../src/readiness/manifest.js";
import type { G2asReadinessManifest } from "../src/readiness/types.js";

const manifestPath = "contract/readiness/g2as-sandbox-target.json";

const validManifest: G2asReadinessManifest = {
  version: 1,
  tenantUrl: "https://pte-politechnika.atlassian.net",
  jira: {
    projectKey: "G2AS",
    issueKey: "G2AS-1",
    expectedStatus: "To Do",
  },
  confluence: {
    spaceKey: "G2AS",
    pageId: "31752193",
  },
  github: {
    repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
    branch: "main",
    commit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"],
  },
};

test("readiness manifest: parses the fixed G2AS target", async () => {
  const source = await readFile(manifestPath, "utf8");

  assert.deepEqual(parseG2asReadinessManifest(JSON.parse(source)), validManifest);
});

test("readiness manifest: rejects malformed shapes and unknown fields", () => {
  assertRejected([validManifest], "invalid manifest structure");
  assertRejected(
    { ...validManifest, unexpectedField: "untrusted-value" },
    "unknown field",
  );
});

test("readiness manifest: rejects a hidden unknown field", () => {
  const manifestWithHiddenField = { ...validManifest };
  Object.defineProperty(manifestWithHiddenField, "hiddenField", {
    value: "untrusted-value",
  });

  assertRejected(manifestWithHiddenField, "unknown field");
});

test("readiness manifest: rejects a second target record", () => {
  assertRejected(
    { ...validManifest, targets: [validManifest, validManifest] },
    "second target record",
  );
});

test("readiness manifest: rejects unsafe tenant origins", () => {
  const unsafeTenantUrls = [
    "http://pte-politechnika.atlassian.net",
    "https://user:password@pte-politechnika.atlassian.net",
    "https://pte-politechnika.atlassian.net/path",
    "https://pte-politechnika.atlassian.net?query=value",
    "https://pte-politechnika.atlassian.net#fragment",
    "https://*.atlassian.net",
  ];

  for (const tenantUrl of unsafeTenantUrls) {
    assertRejected({ ...validManifest, tenantUrl }, "invalid tenant origin");
  }
});

test("readiness manifest: rejects token fields without exposing their values", () => {
  const unsafeValue = "do-not-echo-this-token";

  assert.throws(
    () =>
      parseG2asReadinessManifest({
        ...validManifest,
        github: { ...validManifest.github, token: unsafeValue },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "G2AS readiness manifest rejected: forbidden token field." &&
      !error.message.includes(unsafeValue),
  );
});

test("readiness manifest: rejects a hidden token field without exposing its value", () => {
  const unsafeValue = "do-not-echo-this-hidden-token";
  const githubWithHiddenToken = { ...validManifest.github };
  Object.defineProperty(githubWithHiddenToken, "token", { value: unsafeValue });

  assert.throws(
    () =>
      parseG2asReadinessManifest({
        ...validManifest,
        github: githubWithHiddenToken,
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "G2AS readiness manifest rejected: forbidden token field." &&
      !error.message.includes(unsafeValue),
  );
});

test("readiness manifest: rejects a hidden fixture-path token without exposing its value", () => {
  const unsafeValue = "do-not-echo-this-fixture-token";
  const fixturePaths = [...validManifest.github.fixturePaths];
  Object.defineProperty(fixturePaths, "token", { value: unsafeValue });

  assert.throws(
    () =>
      parseG2asReadinessManifest({
        ...validManifest,
        github: { ...validManifest.github, fixturePaths },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "G2AS readiness manifest rejected: forbidden token field." &&
      !error.message.includes(unsafeValue),
  );
});

test("readiness manifest: rejects a symbol key on fixture paths", () => {
  const fixturePaths = [...validManifest.github.fixturePaths];
  Object.defineProperty(fixturePaths, Symbol("unsupported"), {
    value: "untrusted-value",
  });

  assertRejected(
    { ...validManifest, github: { ...validManifest.github, fixturePaths } },
    "unsupported symbol key",
  );
});

test("readiness manifest: rejects symbol keys", () => {
  const manifestWithSymbolKey = { ...validManifest };
  Object.defineProperty(manifestWithSymbolKey, Symbol("unsupported"), {
    value: "untrusted-value",
  });

  assertRejected(manifestWithSymbolKey, "unsupported symbol key");
});

test("readiness manifest: rejects non-literal targets, invalid commits, and fixture paths", () => {
  assertRejected({ ...validManifest, version: 2 }, "invalid target value");
  assertRejected(
    { ...validManifest, jira: { ...validManifest.jira, issueKey: "G2AS-2" } },
    "invalid target value",
  );
  assertRejected(
    { ...validManifest, github: { ...validManifest.github, commit: "A".repeat(40) } },
    "invalid commit",
  );
  assertRejected(
    {
      ...validManifest,
      github: {
        ...validManifest.github,
        fixturePaths: ["docs/fixtures/G2AS-1.json", "docs/fixtures/G2AS-1.md"],
      },
    },
    "invalid fixture paths",
  );
  assertRejected(
    {
      ...validManifest,
      github: {
        ...validManifest.github,
        fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.md"],
      },
    },
    "invalid fixture paths",
  );
});

test("readiness manifest: loads only the explicit supplied path", async () => {
  assert.deepEqual(await loadG2asReadinessManifest(manifestPath), validManifest);
  await assert.rejects(
    loadG2asReadinessManifest("contract/readiness/missing-target.json"),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "ENOENT",
  );
});

function assertRejected(value: unknown, category: string): void {
  assert.throws(
    () => parseG2asReadinessManifest(value),
    (error: unknown) =>
      error instanceof Error &&
      error.message === `G2AS readiness manifest rejected: ${category}.`,
  );
}

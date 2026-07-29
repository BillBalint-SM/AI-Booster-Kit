import { readFile } from "node:fs/promises";

import type { G2asReadinessManifest } from "./types.js";

const targetTenantUrl = "https://pte-politechnika.atlassian.net";
const targetCommit = "d0971f75c526250f9ee65b8b3b044a4788b31a46";
const targetFixturePaths = ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"];
const commitPattern = /^[a-f0-9]{40}$/;
const arrayIndexPattern = /^(0|[1-9]\d*)$/;

export async function loadG2asReadinessManifest(
  path: string,
): Promise<G2asReadinessManifest> {
  const source = await readFile(path, "utf8");
  return parseG2asReadinessManifest(parseManifestJson(source));
}

export function parseG2asReadinessManifest(
  value: unknown,
): G2asReadinessManifest {
  rejectTokenField(value);
  const manifest = requireRecord(value, "invalid manifest structure");

  if (hasSecondTargetRecord(manifest)) {
    reject("second target record");
  }

  requireExactKeys(manifest, ["version", "tenantUrl", "jira", "confluence", "github"]);
  validateTenantUrl(manifest.tenantUrl);
  validateJira(manifest.jira);
  validateConfluence(manifest.confluence);
  validateGithub(manifest.github);

  if (manifest.version !== 1) {
    reject("invalid target value");
  }

  return manifest as unknown as G2asReadinessManifest;
}

function parseManifestJson(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      reject("invalid JSON");
    }

    throw error;
  }
}

function validateTenantUrl(value: unknown): void {
  if (typeof value !== "string" || value !== targetTenantUrl) {
    reject("invalid tenant origin");
  }

  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.hostname.includes("*")
  ) {
    reject("invalid tenant origin");
  }
}

function validateJira(value: unknown): void {
  const jira = requireRecord(value, "invalid target value");
  requireExactKeys(jira, ["projectKey", "issueKey", "expectedStatus"]);

  if (
    jira.projectKey !== "G2AS" ||
    jira.issueKey !== "G2AS-1" ||
    jira.expectedStatus !== "To Do"
  ) {
    reject("invalid target value");
  }
}

function validateConfluence(value: unknown): void {
  const confluence = requireRecord(value, "invalid target value");
  requireExactKeys(confluence, ["spaceKey", "pageId"]);

  if (confluence.spaceKey !== "G2AS" || confluence.pageId !== "31752193") {
    reject("invalid target value");
  }
}

function validateGithub(value: unknown): void {
  const github = requireRecord(value, "invalid target value");
  requireExactKeys(github, ["repository", "branch", "commit", "fixturePaths"]);

  if (
    github.repository !== "BillBalint-SM/ultimate-longshot-gate2-sandbox" ||
    github.branch !== "main"
  ) {
    reject("invalid target value");
  }

  if (typeof github.commit !== "string" || !commitPattern.test(github.commit) || github.commit !== targetCommit) {
    reject("invalid commit");
  }

  validateFixturePaths(github.fixturePaths);
}

function validateFixturePaths(value: unknown): void {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string" ||
    value[0] === value[1] ||
    value[0] !== targetFixturePaths[0] ||
    value[1] !== targetFixturePaths[1]
  ) {
    reject("invalid fixture paths");
  }
}

function requireRecord(value: unknown, category: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    reject(category);
  }

  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expectedKeys: string[]): void {
  const keys = Reflect.ownKeys(record);
  const hasSymbolKey = keys.some((key) => typeof key === "symbol");
  const hasUnexpectedKey = keys.some(
    (key) => typeof key === "string" && !expectedKeys.includes(key),
  );
  const hasMissingKey = expectedKeys.some((key) => !Object.hasOwn(record, key));

  if (hasSymbolKey) {
    reject("unsupported symbol key");
  }

  if (hasUnexpectedKey || hasMissingKey) {
    reject("unknown field");
  }
}

function hasSecondTargetRecord(record: Record<string, unknown>): boolean {
  return Array.isArray(record.targets) && record.targets.length > 1;
}

function rejectTokenField(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value);

    for (const key of keys) {
      if (typeof key === "symbol") {
        reject("unsupported symbol key");
      }

      if (key === "token") {
        reject("forbidden token field");
      }

      if (key !== "length" && !arrayIndexPattern.test(key)) {
        reject("unknown field");
      }
    }

    for (const key of keys) {
      if (typeof key === "string" && arrayIndexPattern.test(key)) {
        rejectTokenField(value[Number(key)]);
      }
    }
    return;
  }

  const record = value as Record<string, unknown>;

  for (const key of Reflect.ownKeys(record)) {
    if (typeof key === "symbol") {
      reject("unsupported symbol key");
    }

    if (key === "token") {
      reject("forbidden token field");
    }

    rejectTokenField(record[key]);
  }
}

function reject(category: string): never {
  throw new Error(`G2AS readiness manifest rejected: ${category}.`);
}

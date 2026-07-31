import type { CodexReadOnlyEvidenceAdapter } from "./ingest.js";
import { parseReadinessObservationBundle, type ReadinessObservationBundle } from "../readiness/observations.js";
import type { G2asReadinessManifest } from "../readiness/types.js";

export interface CodexMcpReadSource {
  read(manifest: G2asReadinessManifest): Promise<unknown>;
}

export class CodexMcpReadMappingError extends Error {
  public constructor(message: string) {
    super(`Codex MCP read mapping rejected: ${message}.`);
    this.name = "CodexMcpReadMappingError";
  }
}

export function createCodexMcpReadAdapter(source: CodexMcpReadSource): CodexReadOnlyEvidenceAdapter {
  return {
    host: "codex",
    read: async (manifest) => mapCodexMcpReadToObservationBundle(await source.read(manifest)),
  };
}

export function mapCodexMcpReadToObservationBundle(value: unknown): ReadinessObservationBundle {
  const record = exactRecord(value, ["host", "correlationId", "runAt", "jira", "confluence", "github", "traceability"]);
  if (record.host !== "codex") reject("host");

  const jira = exactRecord(record.jira, ["tenantOrigin", "projectId", "projectKey", "issueId", "issueKey", "status", "evidenceRef", "observedAt"]);
  const confluence = exactRecord(record.confluence, ["tenantOrigin", "spaceId", "spaceKey", "pageId", "evidenceRef", "observedAt"]);
  const github = exactRecord(record.github, ["repositoryId", "repository", "branch", "commit", "fixturePaths", "evidenceRef", "capabilityEvidence", "observedAt"]);
  const traceability = exactRecord(record.traceability, ["observedIds", "evidenceRef", "observedAt"]);

  const bundle = {
    correlationId: stringField(record.correlationId),
    runAt: stringField(record.runAt),
    observations: [
      observation("jira", {
        tenantOrigin: stringField(jira.tenantOrigin),
        projectId: stringField(jira.projectId),
        projectKey: stringField(jira.projectKey),
        issueId: stringField(jira.issueId),
        issueKey: stringField(jira.issueKey),
        status: stringField(jira.status),
      }, stringField(jira.evidenceRef), stringField(jira.observedAt)),
      observation("confluence", {
        tenantOrigin: stringField(confluence.tenantOrigin),
        spaceId: stringField(confluence.spaceId),
        spaceKey: stringField(confluence.spaceKey),
        pageId: stringField(confluence.pageId),
      }, stringField(confluence.evidenceRef), stringField(confluence.observedAt)),
      observation("github", {
        repositoryId: stringField(github.repositoryId),
        repository: stringField(github.repository),
        branch: stringField(github.branch),
        commit: stringField(github.commit),
        fixturePathOne: stringPair(github.fixturePaths)[0],
        fixturePathTwo: stringPair(github.fixturePaths)[1],
      }, stringField(github.evidenceRef), stringField(github.observedAt), github.capabilityEvidence),
      observation("traceability", recordField(traceability.observedIds), stringField(traceability.evidenceRef), stringField(traceability.observedAt)),
    ],
  };

  try {
    return parseReadinessObservationBundle(bundle);
  } catch {
    throw new CodexMcpReadMappingError("normalized observation contract");
  }
}

function observation(
  source: "jira" | "confluence" | "github" | "traceability",
  observedIds: Record<string, string>,
  evidenceRef: string,
  observedAt: string,
  capabilityEvidence?: unknown,
): Record<string, unknown> {
  return {
    source,
    state: "verified",
    readPath: "mcp",
    capabilityState: "verified",
    observedIds,
    evidenceRefs: [evidenceRef],
    ...(source === "github" ? { capabilityEvidence } : {}),
    diagnosticCode: "NONE",
    observedAt,
  };
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    reject("record structure");
  }

  const record = value as Record<string, unknown>;
  const actualKeys = Reflect.ownKeys(record);
  if (actualKeys.some((key) => typeof key !== "string" || !keys.includes(key)) || keys.some((key) => !Object.hasOwn(record, key))) {
    reject("unknown field");
  }

  return record;
}

function recordField(value: unknown): Record<string, string> {
  const record = exactRecord(value, Object.keys((value ?? {}) as object));
  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record)) output[key] = stringField(entry);
  return output;
}

function stringPair(value: unknown): [string, string] {
  if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/.test(key)))) {
    reject("fixture paths");
  }

  return [stringField(value[0]), stringField(value[1])];
}

function stringField(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") reject("string field");
  return value;
}

function reject(message: string): never {
  throw new CodexMcpReadMappingError(message);
}

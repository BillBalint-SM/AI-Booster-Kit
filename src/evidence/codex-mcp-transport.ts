import { parseG2asReadinessManifest } from "../readiness/manifest.js";
import type { G2asReadinessManifest } from "../readiness/types.js";

export interface CodexMcpReadRequest {
  readonly transport: "mcp";
  readonly operation: "read";
  readonly readOnly: true;
  readonly target: {
    readonly tenantUrl: string;
    readonly jiraProjectKey: string;
    readonly jiraIssueKey: string;
    readonly confluenceSpaceKey: string;
    readonly confluencePageId: string;
    readonly githubRepository: string;
    readonly githubBranch: string;
    readonly githubCommit: string;
    readonly fixturePathOne: string;
    readonly fixturePathTwo: string;
  };
  readonly allowedOperations: readonly ["repository.read", "branch.read", "commit.read", "path.read"];
}

export interface CodexMcpTransportSource {
  readonly host: "codex";
  readonly transport: "mcp";
  readonly readOnly: true;
  read(request: CodexMcpReadRequest): Promise<unknown>;
}

export class CodexMcpTransportError extends Error {
  public constructor(message: string) {
    super(`Codex MCP transport source rejected: ${message}.`);
    this.name = "CodexMcpTransportError";
  }
}

export function createCodexMcpReadRequest(manifest: G2asReadinessManifest): CodexMcpReadRequest {
  const target = parseG2asReadinessManifest(manifest);
  const requestTarget = Object.freeze({
    tenantUrl: target.tenantUrl,
    jiraProjectKey: target.jira.projectKey,
    jiraIssueKey: target.jira.issueKey,
    confluenceSpaceKey: target.confluence.spaceKey,
    confluencePageId: target.confluence.pageId,
    githubRepository: target.github.repository,
    githubBranch: target.github.branch,
    githubCommit: target.github.commit,
    fixturePathOne: target.github.fixturePaths[0],
    fixturePathTwo: target.github.fixturePaths[1],
  });
  const allowedOperations = Object.freeze(["repository.read", "branch.read", "commit.read", "path.read"] as const);
  return Object.freeze({ transport: "mcp" as const, operation: "read" as const, readOnly: true as const, target: requestTarget, allowedOperations });
}

export function assertCodexMcpTransportSource(value: unknown): asserts value is CodexMcpTransportSource {
  const source = record(value, "source structure");
  const expectedKeys = ["host", "transport", "readOnly", "read"] as const;
  const actualKeys = Reflect.ownKeys(source);
  if (actualKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key as typeof expectedKeys[number])) || expectedKeys.some((key) => !Object.hasOwn(source, key))) {
    reject("unknown field");
  }
  if (source.host !== "codex") reject("host must be codex");
  if (source.transport !== "mcp") reject("transport must be mcp");
  if (source.readOnly !== true) reject("source is not read-only");
  if (typeof source.read !== "function") reject("read method is missing");
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) reject(label);
  return value as Record<string, unknown>;
}

function reject(message: string): never {
  throw new CodexMcpTransportError(message);
}

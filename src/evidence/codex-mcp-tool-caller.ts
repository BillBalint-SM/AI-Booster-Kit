import type { CodexMcpReadRequest, CodexMcpTransportSource } from "./codex-mcp-transport.js";

export interface CodexMcpToolCaller {
  readonly readJiraIssue: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readJiraRemoteLinks: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readConfluenceSpace: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readConfluencePage: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readConfluencePageMetadata: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readGithubRepository: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readGithubCommit: (request: CodexMcpReadRequest) => Promise<unknown>;
  readonly readGithubFile: (request: CodexMcpReadRequest, path: string) => Promise<unknown>;
}

export class CodexMcpToolCallerError extends Error {
  public constructor(message: string) {
    super(`Codex MCP tool caller rejected: ${message}.`);
    this.name = "CodexMcpToolCallerError";
  }
}

export function createCodexMcpTransportSource(
  caller: CodexMcpToolCaller,
  readAt: () => string,
): CodexMcpTransportSource {
  assertCodexMcpToolCaller(caller);
  return Object.freeze({
    host: "codex" as const,
    transport: "mcp" as const,
    readOnly: true as const,
    read: async (request: CodexMcpReadRequest) => {
      const runAt = readAt();
      const [jiraIssue, jiraRemoteLinks, confluenceSpace, confluencePage, confluencePageMetadata, githubRepository, githubCommit, markdown, json] = await Promise.all([
        caller.readJiraIssue(request),
        caller.readJiraRemoteLinks(request),
        caller.readConfluenceSpace(request),
        caller.readConfluencePage(request),
        caller.readConfluencePageMetadata(request),
        caller.readGithubRepository(request),
        caller.readGithubCommit(request),
        caller.readGithubFile(request, request.target.fixturePathOne),
        caller.readGithubFile(request, request.target.fixturePathTwo),
      ]);

      return {
        correlationId: `codex-mcp-${request.target.githubCommit}-${runAt.replaceAll(":", "-")}`,
        runAt,
        jira: { issue: jiraIssue, remoteLinks: jiraRemoteLinks },
        confluence: { space: confluenceSpace, page: { page: confluencePage, metadata: confluencePageMetadata } },
        github: {
          repository: githubRepository,
          commit: githubCommit,
          files: { markdown, json },
        },
      };
    },
  });
}

export function assertCodexMcpToolCaller(value: unknown): asserts value is CodexMcpToolCaller {
  const caller = record(value, "caller structure");
  const expectedKeys = [
    "readJiraIssue",
    "readJiraRemoteLinks",
    "readConfluenceSpace",
    "readConfluencePage",
    "readConfluencePageMetadata",
    "readGithubRepository",
    "readGithubCommit",
    "readGithubFile",
  ] as const;
  const actualKeys = Reflect.ownKeys(caller);
  if (actualKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key as typeof expectedKeys[number])) || expectedKeys.some((key) => !Object.hasOwn(caller, key))) {
    reject("unknown field");
  }
  for (const key of expectedKeys) {
    if (typeof caller[key] !== "function") reject(`${key} method is missing`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) reject(label);
  return value as Record<string, unknown>;
}

function reject(message: string): never {
  throw new CodexMcpToolCallerError(message);
}

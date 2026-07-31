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

export type CodexMcpReadFailureDiagnosticCode = "TIMEOUT_UNKNOWN" | "SCOPE_UNVERIFIED";
export type CodexMcpReadFailureSource = "jira" | "confluence" | "github";

export class CodexMcpReadFailure extends Error {
  public readonly diagnosticCode: CodexMcpReadFailureDiagnosticCode;
  public readonly source: CodexMcpReadFailureSource;

  public constructor(
    diagnosticCode: CodexMcpReadFailureDiagnosticCode,
    source: CodexMcpReadFailureSource,
  ) {
    super(`Codex MCP ${source} read failed with ${diagnosticCode}.`);
    this.name = "CodexMcpReadFailure";
    this.diagnosticCode = diagnosticCode;
    this.source = source;
  }
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
        readSource("jira", () => caller.readJiraIssue(request)),
        readSource("jira", () => caller.readJiraRemoteLinks(request)),
        readSource("confluence", () => caller.readConfluenceSpace(request)),
        readSource("confluence", () => caller.readConfluencePage(request)),
        readSource("confluence", () => caller.readConfluencePageMetadata(request)),
        readSource("github", () => caller.readGithubRepository(request)),
        readSource("github", () => caller.readGithubCommit(request)),
        readSource("github", () => caller.readGithubFile(request, request.target.fixturePathOne)),
        readSource("github", () => caller.readGithubFile(request, request.target.fixturePathTwo)),
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

async function readSource<T>(
  source: CodexMcpReadFailureSource,
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (error: unknown) {
    if (error instanceof CodexMcpReadFailure) throw error;
    throw new CodexMcpReadFailure("SCOPE_UNVERIFIED", source);
  }
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

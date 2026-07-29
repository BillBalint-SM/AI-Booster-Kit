import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export interface CapturedRequest {
  method: string;
  path: string;
  query: string;
  body: unknown;
  correlationId: string | undefined;
  authorizationPresent: boolean;
}

export interface ConnectorFixture {
  baseUrl: (scenario: string) => string;
  requests: CapturedRequest[];
  close: () => Promise<void>;
}

export async function startConnectorFixture(): Promise<ConnectorFixture> {
  const requests: CapturedRequest[] = [];
  let jiraProjection: Record<string, unknown> | null = null;
  let confluenceProjection: Record<string, unknown> | null = null;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://fixture.invalid");
    const [scenario = "success", system, ...segments] = url.pathname.split("/").filter(Boolean);
    const body = await readJsonBody(request);
    requests.push({
      method: request.method ?? "",
      path: url.pathname,
      query: url.search,
      body,
      correlationId: firstHeaderValue(request.headers["x-correlation-id"]),
      authorizationPresent: request.headers.authorization !== undefined,
    });

    const credentialEcho = firstHeaderValue(request.headers.authorization) ?? "";

    if (scenario === "timeout") {
      return;
    }
    if (scenario === "unauthorized") return sendJson(response, 401, { error: "unauthorized", diagnostic: credentialEcho, detail: `credential echo: ${credentialEcho}`, trace: { values: [credentialEcho, `embedded ${credentialEcho}`] } });
    if (scenario === "forbidden") return sendJson(response, 403, { error: "forbidden" });
    if (scenario === "missing") return sendJson(response, 404, { error: "missing" });
    if (scenario === "conflict") return sendJson(response, 409, { error: "conflict" });
    if (scenario === "rate-limited") return sendJson(response, 429, { error: "rate-limited" });
    if (scenario === "partial") return sendJson(response, 207, { state: "partial" });
    if (scenario === "malformed") return sendText(response, 200, "not-json");

    if (system === "jira" && request.method === "POST") {
      jiraProjection = asRecord(body);
      return sendJson(response, 200, { externalId: "JIRA-102", expectedVersion: "2" });
    }
    if (system === "jira" && request.method === "GET") {
      return sendJson(response, 200, readBackBody(scenario, segments.at(-1) ?? "", jiraProjection, "JIRA-102", "2"));
    }
    if (system === "confluence" && request.method === "POST") {
      confluenceProjection = asRecord(body);
      return sendJson(response, 200, { externalId: "PAGE-8", expectedVersion: "3" });
    }
    if (system === "confluence" && request.method === "GET") {
      return sendJson(response, 200, readBackBody(scenario, segments.at(-1) ?? "", confluenceProjection, "PAGE-8", "3"));
    }
    if (system === "github" && request.method === "GET") {
      return sendJson(response, 200, githubBody(scenario));
    }
    return sendJson(response, 404, { error: "unknown-fixture-route" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Connector fixture did not expose a TCP address.");
  }
  return {
    baseUrl: (scenario: string) => `http://127.0.0.1:${address.port}/${scenario}`,
    requests,
    close: () => closeServer(server),
  };
}

function readBackBody(
  scenario: string,
  canonicalId: string,
  projection: Record<string, unknown> | null,
  externalId: string,
  version: string,
): Record<string, unknown> {
  return {
    target: scenario === "target-mismatch" ? "other-target" : "local-target",
    canonicalId: scenario === "target-mismatch" ? "OTHER-1" : canonicalId,
    externalId,
    spaceId: externalId === "PAGE-8" ? projection?.spaceId : undefined,
    pageId: externalId === "PAGE-8" ? projection?.pageId : undefined,
    parentCanonicalId: scenario === "stale-parent" ? "OTHER-PARENT" : externalId === "PAGE-8" ? undefined : projection?.parentCanonicalId,
    attachmentPaths: scenario === "stale-attachments" ? ["other.md"] : externalId === "PAGE-8" ? undefined : projection?.attachmentPaths,
    requestedTransition: scenario === "contradictory-transition" ? { from: "To Do", to: "Review" } : externalId === "PAGE-8" ? undefined : projection?.requestedTransition,
    fields: scenario === "stale-content"
      ? { canonicalMilestoneId: "OTHER", body: "old content", attachmentPaths: [] }
      : externalId === "PAGE-8"
        ? {
          canonicalMilestoneId: projection?.canonicalMilestoneId,
          body: projection?.body,
          attachmentPaths: projection?.attachmentPaths,
        }
        : projection?.fields ?? {},
    status: scenario === "confluence-stale-status" ? "draft" : projection !== null && typeof projection.requestedTransition === "object" && projection.requestedTransition !== null && typeof (projection.requestedTransition as Record<string, unknown>).to === "string" ? (projection.requestedTransition as Record<string, unknown>).to : projection === null ? "To Do" : typeof projection.fields === "object" && projection.fields !== null && typeof (projection.fields as Record<string, unknown>).status === "string" ? (projection.fields as Record<string, unknown>).status : externalId === "PAGE-8" ? "published" : "To Do",
    version: scenario === "stale" ? "1" : version,
    observedAt: "2026-07-29T12:00:00.000Z",
  };
}

function githubBody(scenario: string): Record<string, unknown> {
  return {
    repository: scenario === "wrong-repository" ? "other/repository" : "example/repository",
    branch: scenario === "wrong-branch" ? "feature/OTHER" : "feature/GDEAI-102",
    pullRequest: scenario === "ambiguous-pr" ? [101, 102] : [101],
    check: { name: "test", state: "success" },
    review: { state: "approved" },
    deployment: { state: "success" },
    verification: { state: "verified" },
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const source = Buffer.concat(chunks).toString("utf8");
  return source === "" ? null : JSON.parse(source) as unknown;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function sendText(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { "content-type": "text/plain" });
  response.end(body);
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error));
  });
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Fixture expected a JSON object request body.");
  }
  return value as Record<string, unknown>;
}

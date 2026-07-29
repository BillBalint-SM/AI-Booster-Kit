export type CredentialProvider = () => string | Promise<string>;

export type ConnectorFailureCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "TIMEOUT" | "PARTIAL_COMPLETION" | "STALE_READ_BACK" | "TARGET_MISMATCH" | "MALFORMED_RESPONSE" | "UNEXPECTED_STATUS" | "INVALID_INTENT" | "AMBIGUOUS_MAPPING";

export class ConnectorFailure extends Error {
  readonly name = "ConnectorFailure";

  constructor(readonly code: ConnectorFailureCode, readonly status: number | null, readonly body: unknown) {
    super(`Connector operation failed: ${code}.`);
  }
}

export interface ConnectorResult { state: "applied"; externalId: string; correlationId: string; readBackRequired: boolean; }
export interface ReadBackState {
  target: string;
  canonicalId: string;
  externalId: string;
  fields: Record<string, string | string[]>;
  status: string;
  version: string;
  observedAt: string;
  parentCanonicalId: string | null;
  attachmentPaths: string[];
  requestedTransition: { from: string; to: string } | null;
}
export interface JiraProjectionIntent { canonicalId: string; workItemType: "Milestone" | "Epic" | "Story" | "Task" | "Bug"; parentCanonicalId: string | null; fields: Record<string, string | string[]>; attachmentPaths: string[]; requestedTransition: { from: string; to: string } | null; }
export interface ConfluenceProjectionIntent { canonicalMilestoneId: string; spaceId: string; pageId: string; body: string; attachmentPaths: string[]; }
export interface GitHubReference { repository: string; branch: string; pullRequest: number; }
export interface GitHubEvidence { repository: string; branch: string; pullRequest: number; check: { name: string; state: string }; review: { state: string }; deployment: { state: string }; verification: { state: string }; }
export interface GatewayOptions { baseUrl: string; targetTenantUrl: string; credentialProvider: CredentialProvider; correlationId: string; target: string; timeoutMs: number; }

interface JsonResponse { status: number; body: unknown; }

export function parseGatewayOptions(value: unknown, keys: string[]): GatewayOptions {
  const record = exactRecord(value, keys, "INVALID_INTENT");
  const baseUrl = nonEmptyString(record.baseUrl, "INVALID_INTENT");
  const targetTenantUrl = nonEmptyString(record.targetTenantUrl, "INVALID_INTENT");
  assertBoundTargetOrigin(baseUrl, targetTenantUrl);
  if (typeof record.credentialProvider !== "function") throw failure("INVALID_INTENT", null, { reason: "invalid credential provider" }, null);
  const timeoutMs = record.timeoutMs;
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw failure("INVALID_INTENT", null, { reason: "invalid timeout" }, null);
  return { baseUrl: stripTrailingSlash(baseUrl), targetTenantUrl, credentialProvider: record.credentialProvider as CredentialProvider, correlationId: nonEmptyString(record.correlationId, "INVALID_INTENT"), target: nonEmptyString(record.target, "INVALID_INTENT"), timeoutMs };
}

function assertBoundTargetOrigin(baseUrl: string, targetTenantUrl: string): void {
  let base: URL;
  let target: URL;
  try {
    base = new URL(baseUrl);
    target = new URL(targetTenantUrl);
  } catch {
    throw failure("INVALID_INTENT", null, { reason: "invalid connector target URL" }, null);
  }
  if (base.username !== "" || base.password !== "" || target.username !== "" || target.password !== "" || target.search !== "" || target.hash !== "" || target.pathname !== "/") {
    throw failure("INVALID_INTENT", null, { reason: "connector target URL must be a credential-free origin" }, null);
  }
  if (base.origin !== target.origin) {
    throw failure("TARGET_MISMATCH", null, { reason: "connector base URL origin differs from target tenant" }, null);
  }
  if (target.protocol === "https:") return;
  if (target.protocol === "http:" && isLocalFixtureHost(target.hostname)) return;
  throw failure("INVALID_INTENT", null, { reason: "connector target tenant must use HTTPS or an exact local fixture origin" }, null);
}

function isLocalFixtureHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost";
}

export async function requestJson(options: GatewayOptions, path: string, method: "GET" | "POST", body: Record<string, unknown> | null): Promise<JsonResponse> {
  const credential = await resolveCredential(options.credentialProvider);
  try {
    const response = await fetch(`${options.baseUrl}${path}`, { method, headers: { authorization: `Bearer ${credential}`, "content-type": "application/json", "x-correlation-id": options.correlationId }, body: body === null ? null : JSON.stringify(body), signal: AbortSignal.timeout(options.timeoutMs) });
    const parsed = await parseJson(response, credential);
    if (response.status === 401) throw failure("UNAUTHORIZED", response.status, parsed, credential);
    if (response.status === 403) throw failure("FORBIDDEN", response.status, parsed, credential);
    if (response.status === 404) throw failure("NOT_FOUND", response.status, parsed, credential);
    if (response.status === 409) throw failure("CONFLICT", response.status, parsed, credential);
    if (response.status === 429) throw failure("RATE_LIMITED", response.status, parsed, credential);
    if (response.status === 207) throw failure("PARTIAL_COMPLETION", response.status, parsed, credential);
    if (!response.ok) throw failure("UNEXPECTED_STATUS", response.status, parsed, credential);
    return { status: response.status, body: parsed };
  } catch (error) {
    if (error instanceof ConnectorFailure) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") throw failure("TIMEOUT", null, { reason: "request timed out" }, credential);
    throw failure("UNEXPECTED_STATUS", null, { reason: "request failed" }, credential);
  }
}

export function exactRecord(value: unknown, keys: readonly string[], code: ConnectorFailureCode): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw failure(code, null, { reason: "expected object" }, null);
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw failure(code, null, { reason: "unsupported object fields" }, null);
  return record;
}

export function recordField(value: unknown, code: ConnectorFailureCode): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw failure(code, null, { reason: "expected object field" }, null);
  return value as Record<string, unknown>;
}

export function nonEmptyString(value: unknown, code: ConnectorFailureCode): string {
  if (typeof value !== "string" || value.trim() === "") throw failure(code, null, { reason: "expected non-empty string" }, null);
  return value;
}

export function stringArray(value: unknown, code: ConnectorFailureCode): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) throw failure(code, null, { reason: "expected string array" }, null);
  return [...value];
}

export function failure(code: ConnectorFailureCode, status: number | null, body: unknown, credential: string | null): ConnectorFailure {
  return new ConnectorFailure(code, status, redact(body, credential));
}

function stripTrailingSlash(value: string): string { return value.replace(/\/+$/, ""); }

async function resolveCredential(provider: CredentialProvider): Promise<string> {
  try {
    const credential = await provider();
    if (typeof credential !== "string" || credential.trim() === "") throw new Error();
    return credential;
  } catch {
    throw failure("INVALID_INTENT", null, { reason: "credential provider failed" }, null);
  }
}

async function parseJson(response: Response, credential: string): Promise<unknown> {
  const source = await response.text();
  try { return JSON.parse(source) as unknown; } catch { throw failure("MALFORMED_RESPONSE", response.status, { reason: "response body was not JSON" }, credential); }
}

function redact(value: unknown, credential: string | null): unknown {
  if (typeof value === "string") return credential === null ? value : value.split(credential).join("[REDACTED]");
  if (Array.isArray(value)) return value.map((entry) => redact(entry, credential));
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /authorization|credential|token|secret|password/i.test(key) ? "[REDACTED]" : redact(entry, credential)]));
  return value;
}

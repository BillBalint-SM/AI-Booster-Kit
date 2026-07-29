import { exactRecord, failure, nonEmptyString, parseGatewayOptions, requestJson, type GatewayOptions, type GitHubEvidence, type GitHubReference } from "./types.js";

export interface GitHubGatewayOptions extends GatewayOptions { repository: string; }

export class GitHubGateway {
  private readonly options: GitHubGatewayOptions;
  constructor(value: GitHubGatewayOptions) {
    const record = exactRecord(value, ["baseUrl", "targetTenantUrl", "credentialProvider", "correlationId", "target", "timeoutMs", "repository"], "INVALID_INTENT");
    const base = parseGatewayOptions(record, ["baseUrl", "targetTenantUrl", "credentialProvider", "correlationId", "target", "timeoutMs", "repository"]);
    this.options = { ...base, repository: parseRepository(record.repository, "INVALID_INTENT") };
  }

  async readEvidence(value: GitHubReference): Promise<GitHubEvidence> {
    const reference = parseReference(value);
    if (reference.repository !== this.options.repository) throw failure("TARGET_MISMATCH", null, { reason: "GitHub repository is not allowlisted" }, null);
    const [owner, name] = reference.repository.split("/");
    const response = await requestJson(this.options, `/github/repos/${encodeURIComponent(owner as string)}/${encodeURIComponent(name as string)}/evidence?branch=${encodeURIComponent(reference.branch)}&pullRequest=${reference.pullRequest}`, "GET", null);
    const record = exactRecord(response.body, ["repository", "branch", "pullRequest", "check", "review", "deployment", "verification"], "MALFORMED_RESPONSE");
    const repository = parseRepository(record.repository, "MALFORMED_RESPONSE");
    const branch = nonEmptyString(record.branch, "MALFORMED_RESPONSE");
    if (repository !== reference.repository || branch !== reference.branch) throw failure("TARGET_MISMATCH", null, { reason: "GitHub evidence identity differs" }, null);
    if (!Array.isArray(record.pullRequest) || record.pullRequest.length !== 1 || record.pullRequest[0] !== reference.pullRequest) throw failure("AMBIGUOUS_MAPPING", null, { reason: "GitHub pull-request mapping is not unique" }, null);
    return { repository, branch, pullRequest: reference.pullRequest, check: parseCheck(record.check), review: parseState(record.review), deployment: parseState(record.deployment), verification: parseState(record.verification) };
  }
}

function parseReference(value: unknown): GitHubReference {
  const record = exactRecord(value, ["repository", "branch", "pullRequest"], "INVALID_INTENT");
  const pullRequest = record.pullRequest;
  if (typeof pullRequest !== "number" || !Number.isInteger(pullRequest) || pullRequest <= 0) throw failure("INVALID_INTENT", null, { reason: "invalid pull request" }, null);
  return { repository: parseRepository(record.repository, "INVALID_INTENT"), branch: nonEmptyString(record.branch, "INVALID_INTENT"), pullRequest };
}
function parseRepository(value: unknown, code: "INVALID_INTENT" | "MALFORMED_RESPONSE"): string { const repository = nonEmptyString(value, code); const parts = repository.split("/"); if (parts.length !== 2 || parts.some((part) => part.trim() === "")) throw failure(code, null, { reason: "invalid repository" }, null); return repository; }
function parseCheck(value: unknown): { name: string; state: string } { const record = exactRecord(value, ["name", "state"], "MALFORMED_RESPONSE"); return { name: nonEmptyString(record.name, "MALFORMED_RESPONSE"), state: nonEmptyString(record.state, "MALFORMED_RESPONSE") }; }
function parseState(value: unknown): { state: string } { const record = exactRecord(value, ["state"], "MALFORMED_RESPONSE"); return { state: nonEmptyString(record.state, "MALFORMED_RESPONSE") }; }

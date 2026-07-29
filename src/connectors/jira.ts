import { exactRecord, failure, nonEmptyString, parseGatewayOptions, recordField, requestJson, stringArray, type ConnectorResult, type GatewayOptions, type JiraProjectionIntent, type ReadBackState } from "./types.js";

export interface JiraGatewayOptions extends GatewayOptions { projectKey: string; allowedFields: string[]; }

export class JiraGateway {
  private readonly options: JiraGatewayOptions;
  public readonly targetTenantUrl: string;
  constructor(value: JiraGatewayOptions) {
    const record = exactRecord(value, ["baseUrl", "targetTenantUrl", "credentialProvider", "correlationId", "target", "timeoutMs", "projectKey", "allowedFields"], "INVALID_INTENT");
    const base = parseGatewayOptions(record, ["baseUrl", "targetTenantUrl", "credentialProvider", "correlationId", "target", "timeoutMs", "projectKey", "allowedFields"]);
    const allowedFields = stringArray(record.allowedFields, "INVALID_INTENT");
    if (allowedFields.length === 0 || new Set(allowedFields).size !== allowedFields.length) throw failure("INVALID_INTENT", null, { reason: "invalid allowed fields" }, null);
    this.options = { ...base, projectKey: nonEmptyString(record.projectKey, "INVALID_INTENT"), allowedFields };
    this.targetTenantUrl = base.targetTenantUrl;
  }

  async applyProjection(value: JiraProjectionIntent): Promise<ConnectorResult> {
    const intent = parseIntent(value, this.options.allowedFields);
    const payload = { canonicalId: intent.canonicalId, workItemType: intent.workItemType, parentCanonicalId: intent.parentCanonicalId, fields: copyFields(intent.fields), attachmentPaths: [...intent.attachmentPaths], requestedTransition: intent.requestedTransition === null ? null : { ...intent.requestedTransition } };
    const write = await requestJson(this.options, `/jira/projects/${encodeURIComponent(this.options.projectKey)}/projections`, "POST", payload);
    const writeBody = exactRecord(write.body, ["externalId", "expectedVersion"], "MALFORMED_RESPONSE");
    const externalId = nonEmptyString(writeBody.externalId, "MALFORMED_RESPONSE");
    const expectedVersion = nonEmptyString(writeBody.expectedVersion, "MALFORMED_RESPONSE");
    const readBack = await this.readBack(intent.canonicalId);
    if (readBack.externalId !== externalId || readBack.version !== expectedVersion || readBack.status !== statusFor(intent) || !sameFields(readBack.fields, intent.fields) || readBack.parentCanonicalId !== intent.parentCanonicalId || !sameArray(readBack.attachmentPaths, intent.attachmentPaths) || !sameTransition(readBack.requestedTransition, intent.requestedTransition)) throw failure("STALE_READ_BACK", null, { reason: "Jira read-back differs" }, null);
    return { state: "applied", externalId, correlationId: this.options.correlationId, readBackRequired: false };
  }

  async readBack(canonicalId: string): Promise<ReadBackState> {
    const id = nonEmptyString(canonicalId, "INVALID_INTENT");
    const response = await requestJson(this.options, `/jira/projects/${encodeURIComponent(this.options.projectKey)}/read-back/${encodeURIComponent(id)}`, "GET", null);
    const record = exactRecord(response.body, ["target", "canonicalId", "externalId", "fields", "status", "version", "observedAt", "parentCanonicalId", "attachmentPaths", "requestedTransition"], "MALFORMED_RESPONSE");
    const result: ReadBackState = { target: nonEmptyString(record.target, "MALFORMED_RESPONSE"), canonicalId: nonEmptyString(record.canonicalId, "MALFORMED_RESPONSE"), externalId: nonEmptyString(record.externalId, "MALFORMED_RESPONSE"), fields: parseFields(record.fields, "MALFORMED_RESPONSE"), status: nonEmptyString(record.status, "MALFORMED_RESPONSE"), version: nonEmptyString(record.version, "MALFORMED_RESPONSE"), observedAt: observedAt(record.observedAt), parentCanonicalId: nullableString(record.parentCanonicalId, "MALFORMED_RESPONSE"), attachmentPaths: stringArray(record.attachmentPaths, "MALFORMED_RESPONSE"), requestedTransition: parseTransition(record.requestedTransition, "MALFORMED_RESPONSE") };
    if (result.target !== this.options.target || result.canonicalId !== id) throw failure("TARGET_MISMATCH", null, { reason: "Jira read-back identity differs" }, null);
    return result;
  }
}

function parseIntent(value: unknown, allowed: string[]): JiraProjectionIntent {
  const record = exactRecord(value, ["canonicalId", "workItemType", "parentCanonicalId", "fields", "attachmentPaths", "requestedTransition"], "INVALID_INTENT");
  const workItemType = record.workItemType;
  if (workItemType !== "Milestone" && workItemType !== "Epic" && workItemType !== "Story" && workItemType !== "Task" && workItemType !== "Bug") throw failure("INVALID_INTENT", null, { reason: "invalid work item type" }, null);
  const fields = parseFields(record.fields, "INVALID_INTENT");
  if (Object.keys(fields).length === 0 || Object.keys(fields).some((key) => !allowed.includes(key))) throw failure("INVALID_INTENT", null, { reason: "Jira fields are not allowlisted" }, null);
  const attachmentPaths = stringArray(record.attachmentPaths, "INVALID_INTENT");
  if (attachmentPaths.some((path) => !path.endsWith(".md"))) throw failure("INVALID_INTENT", null, { reason: "Jira attachments must be Markdown" }, null);
  const requestedTransition = parseTransition(record.requestedTransition, "INVALID_INTENT");
  if (requestedTransition !== null && !isForward(requestedTransition.from, requestedTransition.to)) throw failure("INVALID_INTENT", null, { reason: "Jira transition is not forward" }, null);
  return { canonicalId: nonEmptyString(record.canonicalId, "INVALID_INTENT"), workItemType, parentCanonicalId: nullableString(record.parentCanonicalId, "INVALID_INTENT"), fields, attachmentPaths, requestedTransition };
}

function parseFields(value: unknown, code: "INVALID_INTENT" | "MALFORMED_RESPONSE"): Record<string, string | string[]> {
  const record = recordField(value, code);
  const output: Record<string, string | string[]> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (key.trim() === "" || (typeof entry !== "string" && (!Array.isArray(entry) || entry.some((item) => typeof item !== "string" || item.trim() === "")))) throw failure(code, null, { reason: "invalid field value" }, null);
    output[key] = typeof entry === "string" ? entry : [...entry];
  }
  return output;
}

function parseTransition(value: unknown, code: "INVALID_INTENT" | "MALFORMED_RESPONSE"): { from: string; to: string } | null {
  if (value === null) return null;
  const record = exactRecord(value, ["from", "to"], code);
  return { from: nonEmptyString(record.from, code), to: nonEmptyString(record.to, code) };
}
function nullableString(value: unknown, code: "INVALID_INTENT" | "MALFORMED_RESPONSE"): string | null { if (value === null) return null; return nonEmptyString(value, code); }
function observedAt(value: unknown): string { const result = nonEmptyString(value, "MALFORMED_RESPONSE"); if (Number.isNaN(Date.parse(result))) throw failure("MALFORMED_RESPONSE", null, { reason: "invalid observed time" }, null); return result; }
function statusFor(intent: JiraProjectionIntent): string { return intent.requestedTransition?.to ?? (typeof intent.fields.status === "string" ? intent.fields.status : ""); }
function copyFields(value: Record<string, string | string[]>): Record<string, string | string[]> { return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, typeof entry === "string" ? entry : [...entry]])); }
function sameFields(left: Record<string, string | string[]>, right: Record<string, string | string[]>): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function sameArray(left: string[], right: string[]): boolean { return left.length === right.length && left.every((entry, index) => entry === right[index]); }
function sameTransition(left: { from: string; to: string } | null, right: { from: string; to: string } | null): boolean { return left?.from === right?.from && left?.to === right?.to; }
function isForward(from: string, to: string): boolean { const values = ["To Do", "In Progress", "Review", "Ready for Deploy", "Ready for Test", "Testing", "Done"]; return values.indexOf(to) === values.indexOf(from) + 1; }

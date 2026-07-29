import { exactRecord, failure, nonEmptyString, parseGatewayOptions, recordField, requestJson, stringArray, type ConnectorResult, type ConfluenceProjectionIntent, type GatewayOptions } from "./types.js";

export interface ConfluenceGatewayOptions extends GatewayOptions { spaceId: string; pageId: string; }

export class ConfluenceGateway {
  private readonly options: ConfluenceGatewayOptions;
  constructor(value: ConfluenceGatewayOptions) {
    const record = exactRecord(value, ["baseUrl", "targetTenantUrl", "credentialProvider", "correlationId", "target", "timeoutMs", "spaceId", "pageId"], "INVALID_INTENT");
    const base = parseGatewayOptions(record, ["baseUrl", "targetTenantUrl", "credentialProvider", "correlationId", "target", "timeoutMs", "spaceId", "pageId"]);
    this.options = { ...base, spaceId: nonEmptyString(record.spaceId, "INVALID_INTENT"), pageId: nonEmptyString(record.pageId, "INVALID_INTENT") };
  }

  async applyProjection(value: ConfluenceProjectionIntent): Promise<ConnectorResult> {
    const intent = parseIntent(value, this.options);
    const payload = { canonicalMilestoneId: intent.canonicalMilestoneId, spaceId: intent.spaceId, pageId: intent.pageId, body: intent.body, attachmentPaths: [...intent.attachmentPaths] };
    const write = await requestJson(this.options, `/confluence/spaces/${encodeURIComponent(intent.spaceId)}/pages/${encodeURIComponent(intent.pageId)}/projections`, "POST", payload);
    const writeBody = exactRecord(write.body, ["externalId", "expectedVersion"], "MALFORMED_RESPONSE");
    const externalId = nonEmptyString(writeBody.externalId, "MALFORMED_RESPONSE");
    const expectedVersion = nonEmptyString(writeBody.expectedVersion, "MALFORMED_RESPONSE");
    const read = await requestJson(this.options, `/confluence/spaces/${encodeURIComponent(intent.spaceId)}/pages/${encodeURIComponent(intent.pageId)}/read-back/${encodeURIComponent(intent.canonicalMilestoneId)}`, "GET", null);
    const actual = exactRecord(read.body, ["target", "canonicalId", "externalId", "fields", "status", "version", "observedAt", "spaceId", "pageId"], "MALFORMED_RESPONSE");
    if (nonEmptyString(actual.target, "MALFORMED_RESPONSE") !== this.options.target || nonEmptyString(actual.canonicalId, "MALFORMED_RESPONSE") !== intent.canonicalMilestoneId || nonEmptyString(actual.spaceId, "MALFORMED_RESPONSE") !== intent.spaceId || nonEmptyString(actual.pageId, "MALFORMED_RESPONSE") !== intent.pageId) throw failure("TARGET_MISMATCH", null, { reason: "Confluence read-back identity differs" }, null);
    if (nonEmptyString(actual.externalId, "MALFORMED_RESPONSE") !== externalId || nonEmptyString(actual.version, "MALFORMED_RESPONSE") !== expectedVersion || nonEmptyString(actual.status, "MALFORMED_RESPONSE") !== "published" || !validObservedAt(actual.observedAt)) throw failure("STALE_READ_BACK", null, { reason: "Confluence read-back state differs" }, null);
    const fields = exactRecord(recordField(actual.fields, "MALFORMED_RESPONSE"), ["canonicalMilestoneId", "body", "attachmentPaths"], "MALFORMED_RESPONSE");
    if (nonEmptyString(fields.canonicalMilestoneId, "MALFORMED_RESPONSE") !== intent.canonicalMilestoneId || nonEmptyString(fields.body, "MALFORMED_RESPONSE") !== intent.body || !sameArray(stringArray(fields.attachmentPaths, "MALFORMED_RESPONSE"), intent.attachmentPaths)) throw failure("STALE_READ_BACK", null, { reason: "Confluence roadmap content differs" }, null);
    return { state: "applied", externalId, correlationId: this.options.correlationId, readBackRequired: false };
  }
}

function parseIntent(value: unknown, options: ConfluenceGatewayOptions): ConfluenceProjectionIntent {
  const record = exactRecord(value, ["canonicalMilestoneId", "spaceId", "pageId", "body", "attachmentPaths"], "INVALID_INTENT");
  const spaceId = nonEmptyString(record.spaceId, "INVALID_INTENT");
  const pageId = nonEmptyString(record.pageId, "INVALID_INTENT");
  const attachmentPaths = stringArray(record.attachmentPaths, "INVALID_INTENT");
  if (spaceId !== options.spaceId || pageId !== options.pageId || attachmentPaths.some((path) => !path.endsWith(".md"))) throw failure("INVALID_INTENT", null, { reason: "Confluence projection is outside allowlist" }, null);
  return { canonicalMilestoneId: nonEmptyString(record.canonicalMilestoneId, "INVALID_INTENT"), spaceId, pageId, body: nonEmptyString(record.body, "INVALID_INTENT"), attachmentPaths };
}

function sameArray(left: string[], right: string[]): boolean { return left.length === right.length && left.every((entry, index) => entry === right[index]); }
function validObservedAt(value: unknown): boolean { return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value)); }

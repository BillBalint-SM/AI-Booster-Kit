import type { GithubCapabilityEvidence } from "../capabilities/types.js";
import { parseG2asReadinessManifest } from "../readiness/manifest.js";
import type { G2asReadinessManifest } from "../readiness/types.js";
import { createCodexMcpReadAdapter } from "./codex-mcp-adapter.js";
import { assertCodexMcpTransportSource, createCodexMcpReadRequest, type CodexMcpTransportSource } from "./codex-mcp-transport.js";
import type { CodexReadOnlyEvidenceAdapter } from "./ingest.js";

export class CodexMcpPayloadNormalizationError extends Error {
  public constructor(message: string) {
    super(`Codex MCP payload normalization rejected: ${message}.`);
    this.name = "CodexMcpPayloadNormalizationError";
  }
}

export function createCodexMcpPayloadAdapter(
  source: CodexMcpTransportSource,
  capabilityEvidence: GithubCapabilityEvidence,
): CodexReadOnlyEvidenceAdapter {
  assertCodexMcpTransportSource(source);
  return createCodexMcpReadAdapter({
    read: async (manifest) => normalizeCodexMcpPayload(manifest, await source.read(createCodexMcpReadRequest(manifest)), capabilityEvidence),
  });
}

export function normalizeCodexMcpPayload(
  manifest: G2asReadinessManifest,
  value: unknown,
  capabilityEvidence: GithubCapabilityEvidence,
) {
  const target = parseG2asReadinessManifest(manifest);
  rejectUnsafeKeys(value);
  validateCapabilityEvidence(capabilityEvidence);

  const payload = record(value, "payload");
  exactKeys(payload, ["correlationId", "runAt", "jira", "confluence", "github"]);
  const correlationId = safeString(payload.correlationId, "correlation ID");
  const runAt = isoTimestamp(payload.runAt, "run timestamp");
  const jira = parseJira(payload.jira, target);
  const confluence = parseConfluence(payload.confluence, target);
  const github = parseGithub(payload.github, target);
  const traceability = parseTraceability(jira, confluence, github, target);

  return {
    host: "codex" as const,
    correlationId,
    runAt,
    jira: {
      tenantOrigin: jira.tenantOrigin,
      projectId: jira.projectId,
      projectKey: jira.projectKey,
      issueId: jira.issueId,
      issueKey: jira.issueKey,
      status: jira.status,
      evidenceRef: `jira:issue:${jira.issueId}`,
      observedAt: runAt,
    },
    confluence: {
      tenantOrigin: confluence.tenantOrigin,
      spaceId: confluence.spaceId,
      spaceKey: confluence.spaceKey,
      pageId: confluence.pageId,
      evidenceRef: `confluence:page:${confluence.pageId}`,
      observedAt: runAt,
    },
    github: { ...github, evidenceRef: `github:commit:${github.commit}`, capabilityEvidence, observedAt: runAt },
    traceability: { observedIds: traceability, evidenceRef: `traceability:chain:${jira.gitLinkId}`, observedAt: runAt },
  };
}

function parseJira(value: unknown, target: G2asReadinessManifest) {
  const jira = record(value, "Jira payload");
  exactKeys(jira, ["issue", "remoteLinks"]);
  const issueEnvelope = jsonObject(jira.issue, "Jira issue payload");
  const issueNodes = array(record(issueEnvelope.issues, "Jira issue result").nodes, "Jira issue nodes");
  if (issueNodes.length !== 1) reject("Jira issue mapping is not unique");
  const issue = record(issueNodes[0], "Jira issue");
  const fields = record(issue.fields, "Jira issue fields");
  const project = record(fields.project, "Jira project");
  const status = record(fields.status, "Jira status");
  const issueId = nativeId(issue.id, "Jira issue ID");
  const issueKey = safeString(issue.key, "Jira issue key");
  const projectId = nativeId(project.id, "Jira project ID");
  const projectKey = safeString(project.key, "Jira project key");
  const statusName = safeString(status.name, "Jira status");
  if (projectKey !== target.jira.projectKey || issueKey !== target.jira.issueKey || statusName !== target.jira.expectedStatus) reject("Jira target mismatch");

  const remoteLinks = jsonArray(jira.remoteLinks, "Jira remote links");
  const confluenceLink = uniqueLink(remoteLinks, `https://${new URL(target.tenantUrl).hostname}/wiki/pages/viewpage.action?pageId=${target.confluence.pageId}`, "Confluence");
  const githubLink = uniqueLink(remoteLinks, `https://github.com/${target.github.repository}/commit/${target.github.commit}`, "GitHub");

  return {
    tenantOrigin: new URL(target.tenantUrl).origin,
    projectId,
    projectKey,
    issueId,
    issueKey,
    status: statusName,
    confluenceLinkId: confluenceLink.id,
    gitLinkId: githubLink.id,
  };
}

function parseConfluence(value: unknown, target: G2asReadinessManifest) {
  const confluence = record(value, "Confluence payload");
  exactKeys(confluence, ["space", "page"]);
  const spaces = array(jsonObject(confluence.space, "Confluence space result").results, "Confluence spaces");
  const matchingSpaces = spaces.filter((entry) => {
    const space = record(entry, "Confluence space");
    return safeString(space.key, "Confluence space key") === target.confluence.spaceKey;
  });
  if (matchingSpaces.length !== 1) reject("Confluence space mapping is not unique");
  const space = record(matchingSpaces[0], "Confluence space");
  const spaceId = nativeId(space.id, "Confluence space ID");
  if (safeString(space.status, "Confluence space status") !== "current") reject("Confluence space is not current");

  const page = parseConfluencePage(confluence.page, target, spaceId);
  const pageId = nativeId(page.id, "Confluence page ID");
  if (pageId !== target.confluence.pageId || safeString(page.status, "Confluence page status") !== "current") reject("Confluence target mismatch");
  const pageSpaceId = nativeId(page.spaceId, "Confluence page space ID");
  if (pageSpaceId !== spaceId) reject("Confluence target mismatch");
  const version = record(page.version, "Confluence page version");
  if (positiveInteger(version.number, "Confluence page version") < 1) reject("Confluence page version");

  const cards = findInlineCards(page.body);
  const jiraCard = uniqueCard(cards, `https://${new URL(target.tenantUrl).hostname}/browse/${target.jira.issueKey}`, "Jira");
  const githubCard = uniqueCard(cards, `https://github.com/${target.github.repository}/commit/${target.github.commit}`, "GitHub");
  return {
    tenantOrigin: new URL(target.tenantUrl).origin,
    spaceId,
    spaceKey: target.confluence.spaceKey,
    pageId,
    jiraCardId: safeString(jiraCard.localId, "Confluence Jira card ID"),
    githubCardId: safeString(githubCard.localId, "Confluence Git card ID"),
  };
}

function parseConfluencePage(value: unknown, target: G2asReadinessManifest, spaceId: string): Record<string, unknown> {
  const composite = record(value, "Confluence page composite");
  if (Object.hasOwn(composite, "page") || Object.hasOwn(composite, "metadata")) {
    exactKeys(composite, ["page", "metadata"]);
    const pageEnvelope = jsonObject(composite.page, "Confluence page body");
    exactKeys(pageEnvelope, ["content"]);
    const content = record(pageEnvelope.content, "Confluence page content");
    exactKeys(content, ["totalCount", "nodes"]);
    const nodes = array(content.nodes, "Confluence page nodes");
    if (nodes.length !== 1) reject("Confluence page mapping is not unique");
    const node = record(nodes[0], "Confluence page node");
    exactKeys(node, ["id", "type", "subtype", "status", "title", "lastModified", "summary", "space", "_links", "author", "body", "webUrl"]);
    const nodeSpace = record(node.space, "Confluence page node space");
    if (safeString(nodeSpace.key, "Confluence page space key") !== target.confluence.spaceKey) reject("Confluence target mismatch");

    const metadataEnvelope = jsonObject(composite.metadata, "Confluence page metadata");
    exactKeys(metadataEnvelope, ["id", "title", "text", "url", "type", "metadata"]);
    const metadata = record(metadataEnvelope.metadata, "Confluence page metadata values");
    exactKeys(metadata, ["cloudId", "spaceId", "authorId", "createdAt", "status", "version"]);
    const metadataCloudId = safeString(metadata.cloudId, "Confluence page metadata cloud ID");
    if (!/^[a-f0-9-]{36}$/.test(metadataCloudId)) reject("Confluence page metadata cloud ID");
    const metadataId = safeString(metadataEnvelope.id, "Confluence page metadata ID");
    const pageId = nativeId(node.id, "Confluence page ID");
    if (metadataId !== pageId && metadataId !== `ari:cloud:confluence:${metadataCloudId}:page/${pageId}`) reject("Confluence page metadata mismatch");
    if (nativeId(metadata.spaceId, "Confluence page metadata space ID") !== spaceId || safeString(metadata.status, "Confluence page metadata status") !== "current") reject("Confluence page metadata mismatch");
    if (positiveInteger(metadata.version, "Confluence page version") < 1) reject("Confluence page version");

    return {
      id: node.id,
      status: node.status,
      spaceId: metadata.spaceId,
      version: { number: metadata.version },
      body: node.body,
    };
  }

  const page = jsonObject(value, "Confluence page");
  return page;
}

function parseGithub(value: unknown, target: G2asReadinessManifest) {
  const github = record(value, "GitHub payload");
  exactKeys(github, ["repository", "commit", "files"]);
  const repository = jsonObject(github.repository, "GitHub repository");
  const repositoryId = nativeId(repository.id, "GitHub repository ID");
  const repositoryName = safeString(repository.repository_full_name, "GitHub repository");
  const branch = safeString(repository.default_branch, "GitHub branch");
  if (repositoryName !== target.github.repository || branch !== target.github.branch) reject("GitHub repository target mismatch");

  const commitEnvelope = jsonObject(github.commit, "GitHub commit");
  const commitRecord = record(commitEnvelope.commit, "GitHub commit metadata");
  const commit = safeString(commitRecord.sha, "GitHub commit SHA");
  if (commit !== target.github.commit) reject("GitHub commit mismatch");

  const files = record(github.files, "GitHub fixture files");
  parseFixtureFile(jsonObject(files.markdown, "GitHub Markdown fixture"), "G2AS-1.md");
  parseFixtureFile(jsonObject(files.json, "GitHub JSON fixture"), "G2AS-1.json");
  return {
    repositoryId,
    repository: repositoryName,
    branch,
    commit,
    fixturePaths: [...target.github.fixturePaths] as [string, string],
  };
}

function parseTraceability(
  jira: ReturnType<typeof parseJira>,
  confluence: ReturnType<typeof parseConfluence>,
  github: ReturnType<typeof parseGithub>,
  target: G2asReadinessManifest,
) {
  if (github.commit !== target.github.commit || confluence.pageId !== target.confluence.pageId) reject("traceability target mismatch");
  return {
    jiraIssueKey: target.jira.issueKey,
    githubCommit: target.github.commit,
    confluencePageId: target.confluence.pageId,
    jiraGitLinkId: jira.gitLinkId,
    jiraGitLinkedCommit: target.github.commit,
    confluenceJiraRefId: confluence.jiraCardId,
    confluenceJiraReferencedKey: target.jira.issueKey,
    confluenceGitRefId: confluence.githubCardId,
    confluenceGitReferencedCommit: target.github.commit,
    confluenceGitReferenceKind: "smart_link",
  };
}

function parseFixtureFile(value: unknown, expectedTitle: string): void {
  const file = record(value, "GitHub fixture file");
  if (safeString(file.display_title, "GitHub fixture title") !== expectedTitle || fixtureContent(file.content, "GitHub fixture content") === "") reject("GitHub fixture mismatch");
  const sha = safeString(file.sha, "GitHub fixture SHA");
  if (!/^[a-f0-9]{40}$/.test(sha)) reject("GitHub fixture SHA");
}

function uniqueLink(value: unknown[], expectedUrl: string, label: string): { id: string } {
  const matches = value.filter((entry) => {
    const link = record(entry, `${label} remote link`);
    const object = record(link.object, `${label} remote link object`);
    return safeString(object.url, `${label} remote link URL`) === expectedUrl;
  });
  if (matches.length !== 1) reject(`${label} remote link mapping is not unique`);
  return { id: nativeId(record(matches[0], `${label} remote link`).id, `${label} remote link ID`) };
}

function uniqueCard(value: Array<{ localId: string; url: string }>, expectedUrl: string, label: string): { localId: string; url: string } {
  const matches = value.filter((card) => card.url === expectedUrl);
  if (matches.length !== 1) reject(`${label} native card mapping is not unique`);
  return matches[0]!;
}

function findInlineCards(value: unknown): Array<{ localId: string; url: string }> {
  const cards: Array<{ localId: string; url: string }> = [];
  walk(value, (candidate) => {
    const recordValue = candidate as Record<string, unknown>;
    if (recordValue.type !== "inlineCard") return;
    const attrs = record(recordValue.attrs, "Confluence inline card");
    cards.push({ localId: safeString(attrs.localId, "Confluence inline card ID"), url: safeString(attrs.url, "Confluence inline card URL") });
  });
  return cards;
}

function walk(value: unknown, visit: (value: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, visit);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const valueRecord = value as Record<string, unknown>;
  visit(valueRecord);
  for (const entry of Object.values(valueRecord)) walk(entry, visit);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) reject(`${label} structure`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/.test(key)))) reject(`${label} structure`);
  return value;
}

function jsonObject(value: unknown, label: string): Record<string, unknown> {
  const candidate = record(value, label);
  if (Object.hasOwn(candidate, "structuredContent")) return record(candidate.structuredContent, label);
  if (Array.isArray(candidate.content)) return record(parseTextEnvelope(candidate.content, label), label);
  return candidate;
}

function jsonArray(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return array(value, label);
  const candidate = record(value, label);
  if (Object.hasOwn(candidate, "structuredContent")) return array(candidate.structuredContent, label);
  if (Array.isArray(candidate.content)) return array(parseTextEnvelope(candidate.content, label), label);
  reject(`${label} structure`);
}

function parseTextEnvelope(value: unknown[], label: string): unknown {
  if (value.length !== 1) reject(`${label} text envelope`);
  const block = record(value[0], `${label} content block`);
  if (block.type !== "text") reject(`${label} content block`);
  const text = safeString(block.text, `${label} content`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    reject(`${label} JSON`);
  }
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== "string" || !keys.includes(key)) || keys.some((key) => !Object.hasOwn(value, key))) reject("unknown field");
}

function safeString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || /authorization|bearer|credential|password|secret|token|transcript|oauth/i.test(value)) reject(label);
  return value;
}

function fixtureContent(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || /(authorization|bearer|credential|password|secret|token|transcript|oauth)\s*[:=]\s*\S+/i.test(value)) reject(label);
  return value;
}

function nativeId(value: unknown, label: string): string {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return String(value);
  const result = safeString(value, label);
  if (!/^[A-Za-z0-9_.=-]+$/.test(result)) reject(label);
  return result;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) reject(label);
  return value;
}

function isoTimestamp(value: unknown, label: string): string {
  const result = safeString(value, label);
  if (Number.isNaN(Date.parse(result)) || new Date(result).toISOString() !== result) reject(label);
  return result;
}

function validateCapabilityEvidence(value: GithubCapabilityEvidence): void {
  if (value.capabilityId !== "github-readonly-evidence-v1" || value.capabilityVersion !== 1 || value.host !== "codex" || !/^[a-f0-9]{64}$/.test(value.scopeFingerprint) || value.state !== "verified") reject("Codex capability evidence");
}

function rejectUnsafeKeys(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || /authorization|cookie|credential|password|secret|token|transcript|oauth/i.test(key)) reject("unsafe field");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) reject("unsafe field");
    rejectUnsafeKeys(descriptor.value);
  }
}

function reject(message: string): never {
  throw new CodexMcpPayloadNormalizationError(message);
}

import { parseDocument, stringify } from "yaml";

import { ContextError } from "./types.js";
import type { ContextState, EpicContext, MilestoneContext, WorkContext } from "./types.js";

const commonKeys = ["contextVersion", "kind", "contextId", "sourceRevision", "owner", "retention", "state", "readScope", "writeAuthority"] as const;
const milestoneKeys = [...commonKeys, "milestoneId", "canonicalArtifactId", "projectVision", "roadmap", "scope", "nonGoals", "decisions", "forecast", "evidenceRefs", "unknowns", "dependencies", "epicIds"] as const;
const epicKeys = [...commonKeys, "epicId", "milestoneId", "outcome", "featureValue", "scope", "nonGoals", "workItemIds", "acceptanceCriteria", "decisions", "evidenceRefs", "unknowns", "dependencies"] as const;
const executablePattern = /\b(?:npm|node|bash|powershell|pwsh|curl|wget|python|script|hook|plugin|mcp)\b/i;

export function parseWorkContext(source: string, sourcePath: string): WorkContext {
  const { yaml, body } = extractFrontmatter(source, sourcePath);
  const document = parseDocument(yaml, { uniqueKeys: true });
  if (document.errors.length > 0) throw new ContextError(`${sourcePath} frontmatter contains invalid YAML metadata`);
  const metadata = requireRecord(document.toJS(), `${sourcePath} frontmatter`);
  rejectExecutableMetadata(metadata, sourcePath);
  const kind = literal(metadata, "kind", ["MILESTONE", "EPIC"], sourcePath);
  const context = kind === "MILESTONE" ? parseMilestone(metadata, sourcePath) : parseEpic(metadata, sourcePath);
  validateBody(body, kind, sourcePath);
  return context;
}

export function serializeWorkContext(context: WorkContext): string {
  const metadata = context.kind === "MILESTONE" ? milestoneMetadata(context) : epicMetadata(context);
  return `---\n${stringify(metadata).trimEnd()}\n---\n\n${context.kind === "MILESTONE" ? milestoneBody(context) : epicBody(context)}\n`;
}

function parseMilestone(metadata: Record<string, unknown>, sourcePath: string): MilestoneContext {
  exactKeys(metadata, milestoneKeys, sourcePath);
  return {
    ...parseEnvelope(metadata, sourcePath),
    kind: "MILESTONE",
    milestoneId: stringValue(metadata, "milestoneId", sourcePath),
    canonicalArtifactId: stringValue(metadata, "canonicalArtifactId", sourcePath),
    projectVision: stringValue(metadata, "projectVision", sourcePath),
    roadmap: stringValue(metadata, "roadmap", sourcePath),
    scope: stringArray(metadata, "scope", sourcePath),
    nonGoals: stringArray(metadata, "nonGoals", sourcePath),
    decisions: stringArray(metadata, "decisions", sourcePath),
    forecast: stringArray(metadata, "forecast", sourcePath),
    evidenceRefs: stringArray(metadata, "evidenceRefs", sourcePath),
    unknowns: stringArray(metadata, "unknowns", sourcePath),
    dependencies: stringArray(metadata, "dependencies", sourcePath),
    epicIds: stringArray(metadata, "epicIds", sourcePath),
  };
}

function parseEpic(metadata: Record<string, unknown>, sourcePath: string): EpicContext {
  exactKeys(metadata, epicKeys, sourcePath);
  return {
    ...parseEnvelope(metadata, sourcePath),
    kind: "EPIC",
    epicId: stringValue(metadata, "epicId", sourcePath),
    milestoneId: stringValue(metadata, "milestoneId", sourcePath),
    outcome: stringValue(metadata, "outcome", sourcePath),
    featureValue: stringValue(metadata, "featureValue", sourcePath),
    scope: stringArray(metadata, "scope", sourcePath),
    nonGoals: stringArray(metadata, "nonGoals", sourcePath),
    workItemIds: stringArray(metadata, "workItemIds", sourcePath),
    acceptanceCriteria: stringArray(metadata, "acceptanceCriteria", sourcePath),
    decisions: stringArray(metadata, "decisions", sourcePath),
    evidenceRefs: stringArray(metadata, "evidenceRefs", sourcePath),
    unknowns: stringArray(metadata, "unknowns", sourcePath),
    dependencies: stringArray(metadata, "dependencies", sourcePath),
  };
}

function parseEnvelope(metadata: Record<string, unknown>, sourcePath: string) {
  const retention = literal(metadata, "retention", ["EPHEMERAL", "PERSONAL", "TEAM"], sourcePath);
  const state = literal(metadata, "state", ["DRAFT", "ACCEPTED", "STALE", "SUPERSEDED"], sourcePath);
  if (literal(metadata, "contextVersion", ["1.0"], sourcePath) !== "1.0") throw new ContextError(`${sourcePath} contextVersion is invalid`);
  return {
    contextVersion: "1.0" as const,
    contextId: stringValue(metadata, "contextId", sourcePath),
    sourceRevision: stringValue(metadata, "sourceRevision", sourcePath),
    owner: stringValue(metadata, "owner", sourcePath),
    retention,
    state: state as ContextState,
    readScope: literal(metadata, "readScope", ["FULL_MILESTONE"], sourcePath),
    writeAuthority: literal(metadata, "writeAuthority", ["ARTIFACT_OWNER_THROUGH_APPROVED_PR"], sourcePath),
  };
}

function milestoneMetadata(context: MilestoneContext): Record<string, unknown> {
  return orderedRecord(context, milestoneKeys);
}

function epicMetadata(context: EpicContext): Record<string, unknown> {
  return orderedRecord(context, epicKeys);
}

function orderedRecord(context: WorkContext, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, (context as unknown as Record<string, unknown>)[key]]));
}

function milestoneBody(context: MilestoneContext): string {
  return ["# Milestone-context", "## Project Vision", context.projectVision, "## Roadmap", context.roadmap, "## Scope", list(context.scope), "## Decisions", list(context.decisions), "## Forecast", list(context.forecast), "## Evidence", list(context.evidenceRefs), "## Unknowns", list(context.unknowns), "## Dependencies", list(context.dependencies), "## Epics", list(context.epicIds)].join("\n\n");
}

function epicBody(context: EpicContext): string {
  return ["# Epic-context", "## Outcome", context.outcome, "## Feature Value", context.featureValue, "## Scope", list(context.scope), "## Stories, Tasks, and Bugs", list(context.workItemIds), "## Acceptance Criteria", list(context.acceptanceCriteria), "## Decisions", list(context.decisions), "## Evidence", list(context.evidenceRefs), "## Unknowns", list(context.unknowns), "## Dependencies", list(context.dependencies)].join("\n\n");
}

function list(values: readonly string[]): string {
  if (values.length === 0) return "- None";
  return values.map((value) => `- ${value}`).join("\n");
}

function extractFrontmatter(source: string, sourcePath: string): { yaml: string; body: string } {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (match?.[1] === undefined) throw new ContextError(`${sourcePath} must start with one closing frontmatter block`);
  if (/(?:^|\r?\n)---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(source.slice(match[0].length))) {
    throw new ContextError(`${sourcePath} must not contain multiple frontmatter blocks`);
  }
  return { yaml: match[1], body: source.slice(match[0].length) };
}

function validateBody(body: string, kind: WorkContext["kind"], sourcePath: string): void {
  const headings = kind === "MILESTONE"
    ? ["# Milestone-context", "## Project Vision", "## Roadmap", "## Scope", "## Decisions", "## Forecast", "## Evidence", "## Unknowns", "## Dependencies", "## Epics"]
    : ["# Epic-context", "## Outcome", "## Feature Value", "## Scope", "## Stories, Tasks, and Bugs", "## Acceptance Criteria", "## Decisions", "## Evidence", "## Unknowns", "## Dependencies"];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]!;
    const nextHeading = headings[index + 1];
    const expression = new RegExp(`(?:^|\\n)${escapeRegExp(heading)}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\n${nextHeading === undefined ? "$" : escapeRegExp(nextHeading)}|$)`);
    const match = expression.exec(body);
    if (match?.[1] === undefined || match[1].trim() === "") throw new ContextError(`${sourcePath} Markdown heading '${heading}' is required`);
  }
  if (executablePattern.test(body)) throw new ContextError(`${sourcePath} Markdown body must not contain executable content`);
}

function exactKeys(metadata: Record<string, unknown>, expected: readonly string[], sourcePath: string): void {
  const keys = Object.keys(metadata);
  if (keys.length !== expected.length || expected.some((key) => !Object.hasOwn(metadata, key)) || keys.some((key) => !expected.includes(key))) {
    throw new ContextError(`${sourcePath} frontmatter keys do not match the ${metadata.kind === "MILESTONE" ? "Milestone" : "Epic"} contract`);
  }
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ContextError(`${field} must be a plain mapping`);
  }
  return value as Record<string, unknown>;
}

function stringValue(metadata: Record<string, unknown>, key: string, sourcePath: string): string {
  const value = metadata[key];
  if (typeof value !== "string" || value.trim() === "") throw new ContextError(`${sourcePath} frontmatter.${key} must be a non-empty string`);
  return value;
}

function stringArray(metadata: Record<string, unknown>, key: string, sourcePath: string): readonly string[] {
  const value = metadata[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "") || new Set(value).size !== value.length) {
    throw new ContextError(`${sourcePath} frontmatter.${key} must be a unique list of non-empty strings`);
  }
  return value;
}

function literal<T extends string>(metadata: Record<string, unknown>, key: string, expected: readonly T[], sourcePath: string): T {
  const value = metadata[key];
  if (typeof value !== "string" || !expected.includes(value as T)) throw new ContextError(`${sourcePath} frontmatter.${key} is invalid`);
  return value as T;
}

function rejectExecutableMetadata(metadata: Record<string, unknown>, sourcePath: string): void {
  for (const [key, value] of Object.entries(metadata)) {
    if (executablePattern.test(key) || (typeof value === "string" && executablePattern.test(value)) || (Array.isArray(value) && value.some((item) => typeof item === "string" && executablePattern.test(item)))) {
      throw new ContextError(`${sourcePath} frontmatter must not contain executable content`);
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { readFile } from "node:fs/promises";

import { parseDocument } from "yaml";

import type { FormationRole } from "./types.js";

export type AgentProfileCatalogStatus = "READY_WITH_LIMIT";
export type AgentProfileStatus = "READY_WITH_LIMIT";
export type AgentProfileUsageTopic =
  | "planning"
  | "implementation"
  | "quality"
  | "trust-security"
  | "orchestration-operations"
  | "discovery-tooling"
  | "delivery-automation"
  | "change-governance";

const usageTopics: readonly AgentProfileUsageTopic[] = [
  "planning",
  "implementation",
  "quality",
  "trust-security",
  "orchestration-operations",
  "discovery-tooling",
  "delivery-automation",
  "change-governance",
];

const workflowRoles: readonly FormationRole[] = [
  "clarifier",
  "validator",
  "human-checkpoint",
  "researcher",
  "evidence-manager",
  "reviewer",
  "planner",
  "implementer",
  "debugger",
];

export interface AgentProfileCatalog {
  catalogId: "agent-profile-library";
  catalogVersion: "1.0.0";
  status: AgentProfileCatalogStatus;
  profiles: readonly AgentProfile[];
}

export interface AgentProfile {
  profileId: string;
  version: string;
  displayName: string;
  status: AgentProfileStatus;
  usageTopics: readonly AgentProfileUsageTopic[];
  workflowRoles: readonly FormationRole[];
  purpose: string;
  capabilities: readonly string[];
  inputs: readonly string[];
  outputs: readonly string[];
  stopConditions: readonly string[];
  userSelectable: true;
  executionBoundary: "LOCAL_ONLY";
  authority: "RECOMMENDATION_ONLY";
}

const catalogKeys = ["catalogId", "catalogVersion", "status", "profiles"] as const;
const profileKeys = ["profileId", "version", "displayName", "status", "usageTopics", "workflowRoles", "purpose", "capabilities", "inputs", "outputs", "stopConditions", "userSelectable", "executionBoundary", "authority"] as const;

export class AgentProfileCatalogError extends Error {
  public constructor(field: string, message: string) {
    super(`agent profile catalog rejected: ${field} ${message}.`);
    this.name = "AgentProfileCatalogError";
  }
}

export async function loadAgentProfileCatalog(sourcePath: string): Promise<AgentProfileCatalog> {
  return parseAgentProfileCatalog(await readFile(sourcePath, "utf8"), sourcePath);
}

export function parseAgentProfileCatalog(source: string, sourcePath: string): AgentProfileCatalog {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new AgentProfileCatalogError("frontmatter", "contains invalid YAML metadata");

  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, catalogKeys, "frontmatter");
  requireLiteral(metadata, "catalogId", "agent-profile-library", "frontmatter.catalogId");
  requireLiteral(metadata, "catalogVersion", "1.0.0", "frontmatter.catalogVersion");
  requireLiteral(metadata, "status", "READY_WITH_LIMIT", "frontmatter.status");

  const rawProfiles = requireNonEmptyList(metadata.profiles, "frontmatter.profiles");
  const profiles = rawProfiles.map((value, index) => parseProfile(value, index));
  const profileIds = new Set<string>();
  for (const [index, profile] of profiles.entries()) {
    if (profileIds.has(profile.profileId)) {
      throw new AgentProfileCatalogError(`profiles[${index}].profileId`, `duplicates ${profile.profileId}`);
    }
    profileIds.add(profile.profileId);
  }

  return {
    catalogId: "agent-profile-library",
    catalogVersion: "1.0.0",
    status: "READY_WITH_LIMIT",
    profiles,
  };
}

function parseProfile(value: unknown, index: number): AgentProfile {
  const field = `profiles[${index}]`;
  const profile = requireRecord(value, field);
  requireExactKeys(profile, profileKeys, field);
  return {
    profileId: requireNonEmptyString(profile.profileId, `${field}.profileId`),
    version: requireNonEmptyString(profile.version, `${field}.version`),
    displayName: requireNonEmptyString(profile.displayName, `${field}.displayName`),
    status: requireLiteralValue(profile.status, "READY_WITH_LIMIT", `${field}.status`) as AgentProfileStatus,
    usageTopics: requireEnumList(profile.usageTopics, usageTopics, `${field}.usageTopics`, "a supported usage topic") as readonly AgentProfileUsageTopic[],
    workflowRoles: requireEnumList(profile.workflowRoles, workflowRoles, `${field}.workflowRoles`, "a supported workflow role") as readonly FormationRole[],
    purpose: requireNonEmptyString(profile.purpose, `${field}.purpose`),
    capabilities: requireNonEmptyStringList(profile.capabilities, `${field}.capabilities`),
    inputs: requireNonEmptyStringList(profile.inputs, `${field}.inputs`),
    outputs: requireNonEmptyStringList(profile.outputs, `${field}.outputs`),
    stopConditions: requireNonEmptyStringList(profile.stopConditions, `${field}.stopConditions`),
    userSelectable: requireBoolean(profile.userSelectable, true, `${field}.userSelectable`),
    executionBoundary: requireLiteralValue(profile.executionBoundary, "LOCAL_ONLY", `${field}.executionBoundary`) as "LOCAL_ONLY",
    authority: requireLiteralValue(profile.authority, "RECOMMENDATION_ONLY", `${field}.authority`) as "RECOMMENDATION_ONLY",
  };
}

function extractFrontmatter(source: string, sourcePath: string): string {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (match?.[1] === undefined) throw new AgentProfileCatalogError(sourcePath, "must start with one frontmatter block");
  return match[1];
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new AgentProfileCatalogError(field, "must be a plain mapping");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string") throw new AgentProfileCatalogError(field, "must not contain symbol keys");
    if (!expected.includes(key)) throw new AgentProfileCatalogError(`${field}.${key}`, "is not allowed");
  }
  for (const key of expected) {
    if (!Object.hasOwn(record, key)) throw new AgentProfileCatalogError(`${field}.${key}`, "is required");
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new AgentProfileCatalogError(field, "must be a non-empty string");
  return value;
}

function requireNonEmptyList(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new AgentProfileCatalogError(field, "must be a non-empty list");
  return value;
}

function requireNonEmptyStringList(value: unknown, field: string): readonly string[] {
  const list = requireNonEmptyList(value, field);
  if (list.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new AgentProfileCatalogError(field, "must contain only non-empty strings");
  }
  return list as readonly string[];
}

function requireEnumList(value: unknown, allowed: readonly string[], field: string, description: string): readonly string[] {
  const list = requireNonEmptyStringList(value, field);
  if (list.some((entry) => !allowed.includes(entry))) {
    throw new AgentProfileCatalogError(field, `must contain only ${description} values`);
  }
  return list;
}

function requireLiteralValue(value: unknown, expected: string, field: string): string {
  if (value !== expected) throw new AgentProfileCatalogError(field, `must be ${expected}`);
  return expected;
}

function requireLiteral(record: Record<string, unknown>, field: string, expected: string, location: string): void {
  requireLiteralValue(record[field], expected, location);
}

function requireBoolean(value: unknown, expected: true, field: string): true {
  if (value !== expected) throw new AgentProfileCatalogError(field, "must be true");
  return expected;
}

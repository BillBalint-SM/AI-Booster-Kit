import { readFileSync } from "node:fs";

import type { BoardStatus } from "../domain/model.js";

const canonicalStatuses: readonly BoardStatus[] = [
  "To Do",
  "In Progress",
  "Review",
  "Ready for Deploy",
  "Ready for Test",
  "Testing",
  "Done",
];

const canonicalTransitionKeys = [
  "To Do->In Progress",
  "In Progress->Review",
  "Review->Ready for Deploy",
  "Ready for Deploy->Ready for Test",
  "Ready for Test->Testing",
  "Testing->Done",
  "Review->To Do",
  "Testing->To Do",
] as const;

export interface ProjectProfile {
  jiraProjectKey: string;
  jiraBoardId: string;
  statusNames: BoardStatus[];
  transitionNames: Record<string, string>;
  planningStateMappings: Record<string, string>;
  allowedFields: string[];
  targetIdentities: {
    jiraProjectKey: string;
    jiraBoardId: string;
  };
}

export function loadProjectProfile(path: string): ProjectProfile {
  const source = readFileSync(path, "utf8");
  const parsed = parseProfile(source, path);

  assertProjectProfile(parsed, path);
  return parsed;
}

function parseProfile(source: string, path: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(`Project profile '${path}' must contain valid JSON.`);
  }
}

function assertProjectProfile(value: unknown, path: string): asserts value is ProjectProfile {
  if (!isRecord(value)) {
    throw new Error(`Project profile '${path}' must be an object.`);
  }

  const requiredKeys = [
    "jiraProjectKey",
    "jiraBoardId",
    "statusNames",
    "transitionNames",
    "planningStateMappings",
    "allowedFields",
    "targetIdentities",
  ];
  const unknownKeys = Object.keys(value).filter((key) => !requiredKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Project profile '${path}' contains unsupported fields: ${unknownKeys.join(", ")}.`);
  }

  for (const key of requiredKeys) {
    if (!(key in value)) {
      throw new Error(`Project profile '${path}' must define '${key}'.`);
    }
  }
  assertNonEmptyString(value.jiraProjectKey, "jiraProjectKey", path);
  assertNonEmptyString(value.jiraBoardId, "jiraBoardId", path);
  assertStringArray(value.statusNames, "statusNames", path);
  assertStringRecord(value.transitionNames, "transitionNames", path);
  assertStringRecord(value.planningStateMappings, "planningStateMappings", path);
  assertStringArray(value.allowedFields, "allowedFields", path);
  assertTargetIdentities(value.targetIdentities, path);

  if (!sameValues(value.statusNames, canonicalStatuses)) {
    throw new Error(`Project profile '${path}' must use the exact canonical Board status labels.`);
  }
  if (!sameValues(Object.keys(value.transitionNames).sort(), [...canonicalTransitionKeys].sort())) {
    throw new Error(`Project profile '${path}' must define exactly the canonical transition lookup keys.`);
  }
  if (
    value.targetIdentities.jiraProjectKey !== value.jiraProjectKey ||
    value.targetIdentities.jiraBoardId !== value.jiraBoardId
  ) {
    throw new Error(`Project profile '${path}' target identities must match its Jira project and Board.`);
  }
}

function assertTargetIdentities(value: unknown, path: string): asserts value is ProjectProfile["targetIdentities"] {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "jiraProjectKey" && key !== "jiraBoardId")) {
    throw new Error(`Project profile '${path}' targetIdentities must contain only Jira project and Board identities.`);
  }
  assertNonEmptyString(value.jiraProjectKey, "targetIdentities.jiraProjectKey", path);
  assertNonEmptyString(value.jiraBoardId, "targetIdentities.jiraBoardId", path);
}

function assertStringArray(value: unknown, key: string, path: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw new Error(`Project profile '${path}' field '${key}' must be a non-empty string array.`);
  }
}

function assertStringRecord(value: unknown, key: string, path: string): asserts value is Record<string, string> {
  if (!isRecord(value) || Object.keys(value).length === 0 || Object.entries(value).some(([entryKey, entryValue]) => entryKey.trim() === "" || typeof entryValue !== "string" || entryValue.trim() === "")) {
    throw new Error(`Project profile '${path}' field '${key}' must be a string map.`);
  }
}

function assertNonEmptyString(value: unknown, key: string, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Project profile '${path}' field '${key}' must be a non-empty string.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameValues(values: string[], expected: readonly string[]): boolean {
  return values.length === expected.length && values.every((value, index) => value === expected[index]);
}

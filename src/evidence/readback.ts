import { createHash } from "node:crypto";

import { EvidenceValidationError } from "./github.js";

export interface ReadBackDifference { field: string; expectedFingerprint: string; actualFingerprint: string; }
export interface ReadBackDecision { verified: boolean; differences: ReadBackDifference[]; nextAction: "continue" | "stop_and_correct"; }
export interface AuthorityReadBackInput { authority: "jira" | "confluence" | "github"; expected: unknown; actual: unknown; }

const unsafeText = /authorization|bearer|credential|password|raw\s*transcript|secret|token/i;

export function assertAuthorityReadBack(input: unknown): ReadBackDecision {
  const record = exactRecord(input, ["authority", "expected", "actual"]);
  const authority = record.authority;
  if (authority === "jira") return compareJira(record.expected, record.actual);
  if (authority === "confluence") return compareConfluence(record.expected, record.actual);
  if (authority === "github") return compareGitHub(record.expected, record.actual);
  throw invalid();
}

function compareJira(expected: unknown, actual: unknown): ReadBackDecision {
  const expectedRecord = jiraState(expected);
  const actualRecord = jiraState(actual);
  return decision([
    difference("project", expectedRecord.project, actualRecord.project), difference("issueKey", expectedRecord.issueKey, actualRecord.issueKey), difference("parent", expectedRecord.parent, actualRecord.parent), difference("status", expectedRecord.status, actualRecord.status), ...fieldDifferences(expectedRecord.fields, actualRecord.fields), difference("attachmentRevision", expectedRecord.attachmentRevision, actualRecord.attachmentRevision),
  ]);
}

function compareConfluence(expected: unknown, actual: unknown): ReadBackDecision {
  const expectedRecord = confluenceState(expected);
  const actualRecord = confluenceState(actual);
  return decision([difference("space", expectedRecord.space, actualRecord.space), difference("page", expectedRecord.page, actualRecord.page), difference("version", expectedRecord.version, actualRecord.version), difference("artifactRevision", expectedRecord.artifactRevision, actualRecord.artifactRevision)]);
}

function compareGitHub(expected: unknown, actual: unknown): ReadBackDecision {
  const expectedRecord = githubState(expected);
  const actualRecord = githubState(actual);
  return decision([difference("repository", expectedRecord.repository, actualRecord.repository), difference("branch", expectedRecord.branch, actualRecord.branch), difference("pullRequest", expectedRecord.pullRequest, actualRecord.pullRequest), difference("checks", expectedRecord.checks, actualRecord.checks), difference("review", expectedRecord.review, actualRecord.review), difference("baseRevision", expectedRecord.baseRevision, actualRecord.baseRevision)]);
}

function jiraState(value: unknown): { project: string; issueKey: string; parent: string | null; status: string; fields: Record<string, string | string[]>; attachmentRevision: string } {
  const record = exactRecord(value, ["project", "issueKey", "parent", "status", "fields", "attachmentRevision"]);
  return { project: safeString(record.project), issueKey: safeString(record.issueKey), parent: nullableSafeString(record.parent), status: safeString(record.status), fields: safeFields(record.fields), attachmentRevision: safeString(record.attachmentRevision) };
}

function confluenceState(value: unknown): { space: string; page: string; version: string; artifactRevision: string } {
  const record = exactRecord(value, ["space", "page", "version", "artifactRevision"]);
  return { space: safeString(record.space), page: safeString(record.page), version: safeString(record.version), artifactRevision: safeString(record.artifactRevision) };
}

function githubState(value: unknown): { repository: string; branch: string; pullRequest: number; checks: Array<{ name: string; state: string }>; review: { state: string; approvals: number }; baseRevision: string } {
  const record = exactRecord(value, ["repository", "branch", "pullRequest", "checks", "review", "baseRevision"]);
  const review = exactRecord(record.review, ["state", "approvals"]);
  if (typeof record.pullRequest !== "number" || !Number.isInteger(record.pullRequest) || record.pullRequest <= 0 || typeof review.approvals !== "number" || !Number.isInteger(review.approvals) || review.approvals < 0) throw invalid();
  if (!Array.isArray(record.checks)) throw invalid();
  const checks = record.checks.map((value) => { const check = exactRecord(value, ["name", "state"]); return { name: safeString(check.name), state: safeString(check.state) }; });
  if (new Set(checks.map((check) => check.name)).size !== checks.length) throw invalid();
  return { repository: repository(record.repository), branch: safeString(record.branch), pullRequest: record.pullRequest, checks, review: { state: safeString(review.state), approvals: review.approvals }, baseRevision: safeString(record.baseRevision) };
}

function decision(candidates: Array<ReadBackDifference | null>): ReadBackDecision { const differences = candidates.filter((candidate): candidate is ReadBackDifference => candidate !== null); return { verified: differences.length === 0, differences, nextAction: differences.length === 0 ? "continue" : "stop_and_correct" }; }
function difference(field: string, expected: unknown, actual: unknown): ReadBackDifference | null { return deepEqual(expected, actual) ? null : { field, expectedFingerprint: fingerprint(expected), actualFingerprint: fingerprint(actual) }; }
function fieldDifferences(expected: Record<string, string | string[]>, actual: Record<string, string | string[]>): ReadBackDifference[] { const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort(); return names.map((name) => difference("fields." + name, expected[name], actual[name])).filter((candidate): candidate is ReadBackDifference => candidate !== null); }
function exactRecord(value: unknown, keys: string[]): Record<string, unknown> { if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalid(); const actualKeys = Object.keys(value).sort(); const expectedKeys = [...keys].sort(); if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) throw invalid(); return value as Record<string, unknown>; }
function safeFields(value: unknown): Record<string, string | string[]> { if (value === null || typeof value !== "object" || Array.isArray(value)) throw invalid(); const fields = Object.entries(value as Record<string, unknown>); if (fields.some(([key, entry]) => unsafeText.test(key) || !safeFieldValue(entry))) throw invalid(); return Object.fromEntries(fields) as Record<string, string | string[]>; }
function safeFieldValue(value: unknown): value is string | string[] { return typeof value === "string" ? acceptsSafeString(value) : Array.isArray(value) && value.length > 0 && value.every(acceptsSafeString); }
function acceptsSafeString(value: unknown): boolean { try { safeString(value); return true; } catch { return false; } }
function repository(value: unknown): string { const result = safeString(value); if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(result)) throw invalid(); return result; }
function nullableSafeString(value: unknown): string | null { if (value === null) return null; return safeString(value); }
function safeString(value: unknown): string { if (typeof value !== "string" || value.trim() === "" || unsafeText.test(value) || isArbitraryUrl(value)) throw invalid(); return value; }
function isArbitraryUrl(value: string): boolean { return /^https?:\/\//i.test(value); }
function deepEqual(first: unknown, second: unknown): boolean { return JSON.stringify(first) === JSON.stringify(second); }
function fingerprint(value: unknown): string { const serialized = JSON.stringify(value); return "sha256:" + createHash("sha256").update(serialized === undefined ? "undefined" : serialized).digest("hex"); }
function invalid(): EvidenceValidationError { return new EvidenceValidationError(); }

import { parse as parseYaml } from "yaml";

import type { AgentHost } from "../contract/markdown.js";
import { githubScopeFingerprint } from "./manifest.js";
import type { GithubReadOnlyCapability, HostCapabilityTemplate } from "./types.js";

const hosts = ["codex", "claude-code", "cursor"] as const;
const canonicalScopeFingerprint = "695a5559f89ecb1856e699e6a9f3ba182af4ec8d6b7b0c724e7e071bd8741eb7";
const canonicalAllowedOperations = ["repository.read", "branch.read", "commit.read", "path.read"];
const canonicalProhibitedOperations = ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"];
const hostSurfaces: Record<AgentHost, string> = {
  codex: "AGENTS.md",
  "claude-code": "CLAUDE.md",
  cursor: ".cursor/rules",
};

export function renderGithubCapabilityTemplate(capability: GithubReadOnlyCapability, host: AgentHost): string {
  if (!capability.requiredHosts.includes(host)) throw new Error("GitHub capability template rejected: host is not required.");
  const fingerprint = githubScopeFingerprint(capability);
  return [
    "---",
    `capabilityId: ${capability.capabilityId}`,
    `capabilityVersion: ${capability.version}`,
    `targetHost: ${host}`,
    `scopeFingerprint: ${fingerprint}`,
    "---",
    "# Native GitHub read-only capability",
    "",
    `Intended instruction surface: ${hostSurfaces[host]}. This is a declarative host projection, not executable configuration.`,
    "",
    "## Approved read operations",
    ...capability.allowedOperations.map((operation) => `- ${operation}`),
    "",
    "## Prohibited operations",
    ...capability.prohibitedOperations.map((operation) => `- ${operation}`),
    "",
    "## Normalized evidence",
    "Report only the capability ID, version, host, scope fingerprint, and verified or unknown state.",
    "",
    "## Required Confluence link",
    `The GitHub reference kind must be ${capability.requiredConfluenceGitReferenceKind}.`,
    "",
    "## Stop protocol",
    "Stop when the target, scope, capability evidence, or native link is absent, unknown, drifting, or mismatched. Preserve local evidence and choose Stop; never broaden scope.",
    "",
  ].join("\n");
}

export function parseGithubCapabilityTemplate(text: string): HostCapabilityTemplate {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u.exec(text);
  if (match === null || match[1] === undefined || match[2] === undefined) throw new Error("GitHub capability template rejected: frontmatter.");
  const metadata = parseYaml(match[1]) as unknown;
  const record = requireRecord(metadata);
  const keys = ["capabilityId", "capabilityVersion", "targetHost", "scopeFingerprint"];
  if (Reflect.ownKeys(record).some((key) => typeof key !== "string" || !keys.includes(key)) || keys.some((key) => !Object.hasOwn(record, key))) {
    throw new Error("GitHub capability template rejected: frontmatter fields.");
  }
  const targetHost = requireHost(record.targetHost);
  const scopeFingerprint = requireFingerprint(record.scopeFingerprint);
  if (scopeFingerprint !== canonicalScopeFingerprint) throw new Error("GitHub capability template rejected: fingerprint drift.");
  const body = match[2];
  const requiredSections = ["## Approved read operations", "## Prohibited operations", "## Normalized evidence", "## Required Confluence link", "## Stop protocol"];
  if (!requiredSections.every((section) => body.includes(section)) || !body.includes(`Intended instruction surface: ${hostSurfaces[targetHost]}.`)) {
    throw new Error("GitHub capability template rejected: semantic sections.");
  }
  const parsedAllowedOperations = extractOperations(body, "Approved read operations");
  const parsedProhibitedOperations = extractOperations(body, "Prohibited operations");
  if (JSON.stringify(parsedAllowedOperations) !== JSON.stringify(canonicalAllowedOperations) || JSON.stringify(parsedProhibitedOperations) !== JSON.stringify(canonicalProhibitedOperations)) {
    throw new Error("GitHub capability template rejected: operation drift.");
  }
  return {
    capabilityId: requireCapabilityId(record.capabilityId),
    capabilityVersion: requireVersion(record.capabilityVersion),
    targetHost,
    scopeFingerprint,
    semanticContract: {
      allowedOperations: parsedAllowedOperations,
      prohibitedOperations: parsedProhibitedOperations,
      requiredConfluenceGitReferenceKind: body.includes("must be smart_link") ? "smart_link" : (() => { throw new Error("GitHub capability template rejected: link kind."); })(),
    },
  };
}

function extractOperations(body: string, heading: string): string[] {
  const section = new RegExp(`## ${heading}\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`, "u").exec(body)?.[1];
  if (section === undefined) throw new Error("GitHub capability template rejected: operation section.");
  return section.split(/\r?\n/).filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("GitHub capability template rejected: metadata.");
  return value as Record<string, unknown>;
}

function requireCapabilityId(value: unknown): "github-readonly-evidence-v1" {
  if (value !== "github-readonly-evidence-v1") throw new Error("GitHub capability template rejected: capability ID.");
  return value;
}

function requireVersion(value: unknown): 1 {
  if (value !== 1) throw new Error("GitHub capability template rejected: version.");
  return value;
}

function requireHost(value: unknown): AgentHost {
  if (typeof value !== "string" || !hosts.includes(value as AgentHost)) throw new Error("GitHub capability template rejected: host.");
  return value as AgentHost;
}

function requireFingerprint(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error("GitHub capability template rejected: fingerprint.");
  return value;
}

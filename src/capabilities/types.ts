import type { AgentHost } from "../contract/markdown.js";

export interface GithubReadOnlyCapability {
  version: 1;
  capabilityId: "github-readonly-evidence-v1";
  allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"];
  prohibitedOperations: ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"];
  requiredHosts: ["codex", "claude-code", "cursor"];
  requiredConfluenceGitReferenceKind: "smart_link";
}

export interface HostCapabilityTemplate {
  capabilityId: "github-readonly-evidence-v1";
  capabilityVersion: 1;
  targetHost: AgentHost;
  scopeFingerprint: string;
  semanticContract: {
    allowedOperations: string[];
    prohibitedOperations: string[];
    requiredConfluenceGitReferenceKind: "smart_link";
  };
}

export interface GithubCapabilityEvidence {
  capabilityId: "github-readonly-evidence-v1";
  capabilityVersion: 1;
  host: AgentHost;
  scopeFingerprint: string;
  state: "verified" | "unknown";
}

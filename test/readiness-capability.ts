import { parseGithubReadOnlyCapability } from "../src/capabilities/manifest.js";

export const readinessCapability = parseGithubReadOnlyCapability({
  version: 1,
  capabilityId: "github-readonly-evidence-v1",
  allowedOperations: ["repository.read", "branch.read", "commit.read", "path.read"],
  prohibitedOperations: ["write", "merge", "issue", "pull_request", "permission", "configuration", "credential"],
  requiredHosts: ["codex", "claude-code", "cursor"],
  requiredConfluenceGitReferenceKind: "smart_link",
});

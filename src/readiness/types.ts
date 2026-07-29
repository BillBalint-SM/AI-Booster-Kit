export type SourceName = "jira" | "confluence" | "github" | "traceability";
export type CheckState = "verified" | "unknown" | "mismatch";
export type CertificateDecision = "READY" | "NOT READY" | "STOPPED";
export type ReadPath = "mcp" | "tenant_aware_chrome";

export interface G2asReadinessManifest {
  version: 1;
  tenantUrl: string;
  jira: {
    projectKey: "G2AS";
    issueKey: "G2AS-1";
    expectedStatus: "To Do";
  };
  confluence: { spaceKey: "G2AS"; pageId: "31752193" };
  github: {
    repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox";
    branch: "main";
    commit: string;
    fixturePaths: [string, string];
  };
}

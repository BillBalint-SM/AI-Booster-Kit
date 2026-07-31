// Synthetic payloads for local contract tests; no live connector response is stored here.
export function createSyntheticCodexMcpPayload() {
  const commit = "d0971f75c526250f9ee65b8b3b044a4788b31a46";
  return {
    correlationId: "g2as-codex-mcp-payload-001",
    runAt: "2026-07-31T12:00:00.000Z",
    jira: {
      issue: {
        issues: {
          nodes: [{ id: "10561", key: "G2AS-1", fields: { project: { id: "10207", key: "G2AS" }, status: { name: "To Do" } } }],
        },
      },
      remoteLinks: [
        { id: 10066, object: { url: "https://pte-politechnika.atlassian.net/wiki/pages/viewpage.action?pageId=31752193", title: "[G2AS-1] Synthetic health-status badge projection" } },
        { id: 10099, object: { url: `https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox/commit/${commit}`, title: `https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox/commit/${commit}` } },
      ],
    },
    confluence: {
      space: { results: [{ id: "31490050", key: "G2AS", status: "current" }] },
      page: {
        id: "31752193",
        status: "current",
        spaceId: "31490050",
        version: { number: 2 },
        body: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Jira key: G2AS-1" }] },
            { type: "paragraph", content: [{ type: "inlineCard", attrs: { localId: "593dc08eb344", url: "https://pte-politechnika.atlassian.net/browse/G2AS-1" } }] },
            { type: "paragraph", content: [{ type: "text", text: "Source Git commit: " }, { type: "inlineCard", attrs: { localId: "g2as-github-commit-link", url: `https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox/commit/${commit}` } }] },
          ],
        },
      },
    },
    github: {
      repository: { id: "1313647896", repository_full_name: "BillBalint-SM/ultimate-longshot-gate2-sandbox", default_branch: "main" },
      commit: { commit: { sha: commit } },
      files: {
        markdown: { content: "# G2AS-1 synthetic health-status badge", sha: "9538bb8142587ac816bd1dcb36c298229acdde29", display_title: "G2AS-1.md" },
        json: { content: "{\"jiraKey\":\"G2AS-1\"}", sha: "bbdade0b227452161d7e6266e46030d0c69472cf", display_title: "G2AS-1.json" },
      },
    },
  };
}

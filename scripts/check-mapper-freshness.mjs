import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const publishedPaths = new Set([
  ".ua/.understandignore",
  ".ua/fingerprints.json",
  ".ua/knowledge-graph.json",
  ".ua/meta.json",
  ".ua/intermediate/scan-result.json",
  "graphify-out/GRAPH_REPORT.md",
  "graphify-out/graph.html",
  "graphify-out/graph.json",
  "graphify-out/manifest.json"
]);

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed: git ${args.join(" ")}: ${detail}`);
  }
}

function readJson(relativePath) {
  const absolutePath = resolve(projectRoot, relativePath);
  try {
    return JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read JSON artifact '${relativePath}': ${detail}`);
  }
}

function splitLines(value) {
  if (value.length === 0) return [];
  return value.split(/\r?\n/).filter(line => line.length > 0);
}

function statusPaths() {
  const lines = splitLines(runGit(["status", "--porcelain=v1", "--untracked-files=all"]));
  const paths = [];
  for (const line of lines) {
    if (line.length < 4) throw new Error(`Unexpected git status line: '${line}'`);
    const pathText = line.slice(3);
    if (pathText.includes(" -> ")) {
      const [oldPath, newPath] = pathText.split(" -> ");
      paths.push(oldPath, newPath);
    } else {
      paths.push(pathText);
    }
  }
  return paths;
}

function changedPathsSince(commit) {
  return splitLines(runGit(["diff", "--name-only", `${commit}..HEAD"]));
}

function assertPublishedPaths(paths, source) {
  const unexpected = paths.filter(filePath => !publishedPaths.has(filePath));
  if (unexpected.length > 0) {
    throw new Error(`${source} contains source changes after mapper analysis: ${unexpected.join(", ")}`);
  }
}

function main() {
  const head = runGit(["rev-parse", "HEAD"]);
  const meta = readJson(".ua/meta.json");
  const graphify = readJson("graphify-out/graph.json");
  const sourceCommit = meta.sourceCommit || meta.gitCommitHash;

  if (typeof sourceCommit !== "string" || !/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error(".ua/meta.json must contain a 40-character sourceCommit or gitCommitHash");
  }
  if (graphify.built_at_commit !== sourceCommit) {
    throw new Error(`Graphify commit '${graphify.built_at_commit}' does not match source commit '${sourceCommit}'`);
  }
  runGit(["merge-base", "--is-ancestor", sourceCommit, head]);
  assertPublishedPaths(changedPathsSince(sourceCommit), `Git history from ${sourceCommit}`);
  assertPublishedPaths(statusPaths(), "Current worktree");

  console.log(`MAPPER_FRESHNESS=READY`);
  console.log(`SOURCE_COMMIT=${sourceCommit}`);
  console.log(`HEAD=${head}`);
  console.log("SOURCE_CHANGES_AFTER_ANALYSIS=0");
}

try {
  main();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`MAPPER_FRESHNESS=NOT_READY`);
  console.error(detail);
  process.exitCode = 1;
}

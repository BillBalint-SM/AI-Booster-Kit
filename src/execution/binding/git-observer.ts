import { realpath } from "node:fs/promises";
import { isAbsolute, join, normalize } from "node:path";
import { TextDecoder } from "node:util";

import { executionDigest } from "../identity.js";
import { ExecutionContractError } from "../types.js";
import type { ExecutionBindingPolicy } from "./types.js";
import { runBoundedProcess } from "./bounded-process.js";

export interface GitStatusRecord {
  recordType: "ORDINARY" | "RENAMED" | "UNMERGED" | "UNTRACKED";
  recordDigest: string;
}

export interface GitSourceObservation {
  repositoryIdentityDigest: string | null;
  worktreeIdentityDigest: string | null;
  observedSourceRevision: string | null;
  topLevelMatchesWorkspace: boolean;
  dirtyState: "CLEAN" | "DIRTY" | "UNKNOWN";
  statusRecordDigests: readonly string[];
}

export async function observeGitSource(
  workspaceRoot: string,
  platform: NodeJS.Platform,
  auditedPaths: readonly string[],
  policy: ExecutionBindingPolicy,
): Promise<GitSourceObservation> {
  const identityResult = await runGit(workspaceRoot, [
    "rev-parse",
    "--path-format=absolute",
    "--show-toplevel",
    "--git-common-dir",
    "--git-dir",
    "--show-object-format",
  ], policy);
  if (identityResult === null) return unreadableGitObservation(null, null, false);
  let identity;
  try {
    identity = await parseGitIdentity(identityResult, workspaceRoot, platform);
  } catch {
    return unreadableGitObservation(null, null, false);
  }
  const revisionResult = await runGit(workspaceRoot, ["rev-parse", "--verify", "HEAD^{commit}"], policy);
  if (revisionResult === null) {
    return unreadableGitObservation(identity.repositoryIdentityDigest, identity.worktreeIdentityDigest, identity.topLevelMatchesWorkspace);
  }
  let observedSourceRevision: string;
  try {
    observedSourceRevision = parseGitRevision(revisionResult, identity.objectFormat);
  } catch {
    return unreadableGitObservation(identity.repositoryIdentityDigest, identity.worktreeIdentityDigest, identity.topLevelMatchesWorkspace);
  }
  const statusResult = await runGit(workspaceRoot, [
    "status",
    "--porcelain=v2",
    "-z",
    "--untracked-files=all",
    "--ignored=no",
    "--ignore-submodules=none",
    "--no-ahead-behind",
    "--",
    ...auditedPaths,
  ], policy);
  if (statusResult === null) {
    return {
      repositoryIdentityDigest: identity.repositoryIdentityDigest,
      worktreeIdentityDigest: identity.worktreeIdentityDigest,
      observedSourceRevision,
      topLevelMatchesWorkspace: identity.topLevelMatchesWorkspace,
      dirtyState: "UNKNOWN",
      statusRecordDigests: [],
    };
  }
  let records: readonly GitStatusRecord[];
  try {
    records = parseGitPorcelainV2(statusResult);
  } catch {
    return {
      repositoryIdentityDigest: identity.repositoryIdentityDigest,
      worktreeIdentityDigest: identity.worktreeIdentityDigest,
      observedSourceRevision,
      topLevelMatchesWorkspace: identity.topLevelMatchesWorkspace,
      dirtyState: "UNKNOWN",
      statusRecordDigests: [],
    };
  }
  return {
    repositoryIdentityDigest: identity.repositoryIdentityDigest,
    worktreeIdentityDigest: identity.worktreeIdentityDigest,
    observedSourceRevision,
    topLevelMatchesWorkspace: identity.topLevelMatchesWorkspace,
    dirtyState: records.length === 0 ? "CLEAN" : "DIRTY",
    statusRecordDigests: records.map((record) => record.recordDigest).sort(asciiCompare),
  };
}

export function parseGitPorcelainV2(output: Buffer): readonly GitStatusRecord[] {
  if (output.length === 0) return [];
  if (output[output.length - 1] !== 0) invalidStatus("Git status output is truncated");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(output);
  } catch {
    invalidStatus("Git status output is not valid UTF-8");
  }
  const entries = text.slice(0, -1).split("\0");
  const records: GitStatusRecord[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined || entry.length === 0) invalidStatus("Git status contains an empty record");
    if (/^1 [^ ]{2} [^ ]+ [0-7]{6} [0-7]{6} [0-7]{6} [0-9a-f]+ [0-9a-f]+ [\s\S]+$/u.test(entry)) {
      records.push(statusRecord("ORDINARY", [entry]));
      continue;
    }
    if (/^2 [^ ]{2} [^ ]+ [0-7]{6} [0-7]{6} [0-7]{6} [0-9a-f]+ [0-9a-f]+ [RC][0-9]+ [\s\S]+$/u.test(entry)) {
      const originalPath = entries[index + 1];
      if (originalPath === undefined || originalPath.length === 0) invalidStatus("Git rename record is truncated");
      records.push(statusRecord("RENAMED", [entry, originalPath]));
      index += 1;
      continue;
    }
    if (/^u [^ ]{2} [^ ]+ [0-7]{6} [0-7]{6} [0-7]{6} [0-7]{6} [0-9a-f]+ [0-9a-f]+ [0-9a-f]+ [\s\S]+$/u.test(entry)) {
      records.push(statusRecord("UNMERGED", [entry]));
      continue;
    }
    if (/^\? [\s\S]+$/u.test(entry)) {
      records.push(statusRecord("UNTRACKED", [entry]));
      continue;
    }
    invalidStatus("Git status contains an unsupported record");
  }
  return records;
}

export function parseGitRevision(output: Buffer, objectFormat: "sha1" | "sha256"): string {
  let revision: string;
  try {
    revision = singleLine(output);
  } catch {
    invalidIdentity("Git revision output is invalid");
  }
  if (!revisionForFormat(revision, objectFormat)) invalidIdentity("Git revision does not match the repository object format");
  return revision;
}

async function runGit(
  workspaceRoot: string,
  commandArgs: readonly string[],
  policy: ExecutionBindingPolicy,
): Promise<Buffer | null> {
  const result = await runBoundedProcess({
    executable: "git",
    args: [
      "--no-pager",
      "--no-optional-locks",
      "--literal-pathspecs",
      "-C",
      workspaceRoot,
      "-c",
      "core.fsmonitor=false",
      "-c",
      "status.renames=true",
      ...commandArgs,
    ],
    environment: {
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
      GIT_PAGER: "cat",
      LC_ALL: "C",
      LANG: "C",
    },
    timeoutMs: policy.gitCommandTimeoutMs,
    maxOutputBytes: policy.maxGitOutputBytes,
  });
  return result.state === "SUCCEEDED" ? result.stdout : null;
}

async function parseGitIdentity(
  output: Buffer,
  workspaceRoot: string,
  platform: NodeJS.Platform,
): Promise<{
  repositoryIdentityDigest: string;
  worktreeIdentityDigest: string;
  topLevelMatchesWorkspace: boolean;
  objectFormat: "sha1" | "sha256";
}> {
  const lines = decode(output).trimEnd().split("\n").map((line) => line.replace(/\r$/u, ""));
  if (lines.length !== 4) throw new Error("Git identity field count is invalid");
  const [topLevelValue, commonDirectoryValue, gitDirectoryValue, objectFormatValue] = lines;
  if (
    topLevelValue === undefined
    || commonDirectoryValue === undefined
    || gitDirectoryValue === undefined
    || (objectFormatValue !== "sha1" && objectFormatValue !== "sha256")
  ) {
    throw new Error("Git identity fields are invalid");
  }
  const topLevel = await realpath(topLevelValue);
  const commonDirectory = await realpath(absoluteGitPath(commonDirectoryValue, workspaceRoot));
  const gitDirectory = await realpath(absoluteGitPath(gitDirectoryValue, workspaceRoot));
  const selectedRoot = await realpath(workspaceRoot);
  const topLevelDigest = localPathDigest("execution-git-top-level-v1", topLevel, platform);
  const selectedRootDigest = localPathDigest("execution-git-top-level-v1", selectedRoot, platform);
  const commonDirectoryDigest = localPathDigest("execution-git-common-directory-v1", commonDirectory, platform);
  const gitDirectoryDigest = localPathDigest("execution-git-directory-v1", gitDirectory, platform);
  return {
    repositoryIdentityDigest: executionDigest({
      domain: "execution-repository-identity-v1",
      objectFormat: objectFormatValue,
      repositoryBoundaryDigest: commonDirectoryDigest,
      commonDirectoryDigest,
    }),
    worktreeIdentityDigest: executionDigest({
      domain: "execution-worktree-identity-v1",
      topLevelDigest,
      gitDirectoryDigest,
    }),
    topLevelMatchesWorkspace: topLevelDigest === selectedRootDigest,
    objectFormat: objectFormatValue,
  };
}

function unreadableGitObservation(
  repositoryIdentityDigest: string | null,
  worktreeIdentityDigest: string | null,
  topLevelMatchesWorkspace: boolean,
): GitSourceObservation {
  return {
    repositoryIdentityDigest,
    worktreeIdentityDigest,
    observedSourceRevision: null,
    topLevelMatchesWorkspace,
    dirtyState: "UNKNOWN",
    statusRecordDigests: [],
  };
}

function statusRecord(recordType: GitStatusRecord["recordType"], values: readonly string[]): GitStatusRecord {
  return {
    recordType,
    recordDigest: executionDigest({ domain: "execution-git-status-record-v1", recordType, values }),
  };
}

function absoluteGitPath(path: string, workspaceRoot: string): string {
  return isAbsolute(path) ? path : join(workspaceRoot, path);
}

function localPathDigest(domain: string, path: string, platform: NodeJS.Platform): string {
  const normalized = normalize(path).replace(/[\\/]+$/u, "");
  const platformPath = platform === "win32" ? normalized.replaceAll("/", "\\").toLowerCase() : normalized;
  return executionDigest({ domain, platform, normalizedPath: platformPath });
}

function revisionForFormat(value: string, objectFormat: "sha1" | "sha256"): boolean {
  return objectFormat === "sha1" ? /^[a-f0-9]{40}$/u.test(value) : /^[a-f0-9]{64}$/u.test(value);
}

function singleLine(value: Buffer): string {
  const text = decode(value);
  const normalized = text.endsWith("\n") ? text.slice(0, -1).replace(/\r$/u, "") : text;
  if (normalized.includes("\n") || normalized.includes("\r")) throw new Error("Git output is not one line");
  return normalized;
}

function decode(value: Buffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(value);
}

function asciiCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function invalidStatus(message: string): never {
  throw new ExecutionContractError("EXECUTION_GIT_STATUS_INVALID", message);
}

function invalidIdentity(message: string): never {
  throw new ExecutionContractError("EXECUTION_GIT_IDENTITY_INVALID", message);
}

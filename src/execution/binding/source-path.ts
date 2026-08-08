import { lstat } from "node:fs/promises";
import { join } from "node:path";

import { ExecutionContractError } from "../types.js";
import { observeExecutionWorkspaceIdentity } from "../workspace-storage.js";
import type {
  ExecutionBindingPolicy,
  ResolvedSourcePathScope,
  ResolveExecutionSourcePathScopeRequest,
  UnknownSourcePathScope,
} from "./types.js";

export async function resolveExecutionSourcePathScope(
  request: ResolveExecutionSourcePathScopeRequest,
  policy: ExecutionBindingPolicy,
): Promise<ResolvedSourcePathScope | UnknownSourcePathScope> {
  const auditedPaths = validateAuditedPaths(request.auditedPaths, policy);
  if (!/^[a-f0-9]{64}$/u.test(request.expectedWorkspaceIdentityDigest)) {
    pathEscape("expected workspace identity digest is invalid");
  }
  const workspace = await observeExecutionWorkspaceIdentity({
    platform: request.platform,
    workspaceRoot: request.workspaceRoot,
  });
  if (workspace.state === "REJECTED") {
    if (workspace.reason === "SYMLINK_BOUNDARY") symlinkBoundary("workspace root crosses a link boundary");
    pathEscape("workspace root is not an admitted absolute local directory");
  }
  if (workspace.state === "UNKNOWN") return unknownScope(auditedPaths);
  const ancestors = await observeAuditedAncestors(workspace.workspaceRoot, auditedPaths);
  if (ancestors === "SYMLINK_BOUNDARY") symlinkBoundary("audited path crosses a link boundary");
  if (ancestors === "UNKNOWN") return unknownScope(auditedPaths);
  return {
    state: "RESOLVED",
    workspaceRoot: workspace.workspaceRoot,
    workspaceIdentityDigest: workspace.workspaceIdentityDigest,
    workspaceMatchesExpected: workspace.workspaceIdentityDigest === request.expectedWorkspaceIdentityDigest,
    auditedPaths,
  };
}

function validateAuditedPaths(
  input: readonly string[],
  policy: ExecutionBindingPolicy,
): string[] {
  if (input.length === 0 || input.length > policy.maxAuditedPaths) {
    pathEscape("audited path count is outside the admitted range");
  }
  let totalBytes = 0;
  const paths = input.map((path) => {
    if (!validAuditedPath(path)) pathEscape("audited path is not a canonical repository-relative path");
    const bytes = Buffer.byteLength(path, "utf8");
    if (bytes > policy.maxAuditedPathBytes) pathEscape("audited path exceeds its byte limit");
    totalBytes += bytes;
    return path;
  });
  if (totalBytes > policy.maxTotalAuditedPathBytes) pathEscape("audited paths exceed their aggregate byte limit");
  if (new Set(paths).size !== paths.length) pathEscape("audited paths must be unique");
  if (paths.includes(".") && paths.length !== 1) pathEscape("whole-worktree scope cannot be mixed with explicit paths");
  return [...paths].sort(asciiCompare);
}

function validAuditedPath(path: string): boolean {
  if (path === ".") return true;
  if (path.length === 0 || path.includes("\0") || path.includes("\\") || /[*?\[\]]/u.test(path)) return false;
  if (path.startsWith("/") || /^[A-Za-z]:/u.test(path)) return false;
  const segments = path.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

async function observeAuditedAncestors(
  workspaceRoot: string,
  auditedPaths: readonly string[],
): Promise<"OBSERVED" | "SYMLINK_BOUNDARY" | "UNKNOWN"> {
  if (auditedPaths.length === 1 && auditedPaths[0] === ".") return "OBSERVED";
  for (const auditedPath of auditedPaths) {
    let candidate = workspaceRoot;
    for (const segment of auditedPath.split("/")) {
      candidate = join(candidate, segment);
      try {
        const details = await lstat(candidate);
        if (details.isSymbolicLink()) return "SYMLINK_BOUNDARY";
      } catch (error) {
        if (nodeErrorCode(error) === "ENOENT") break;
        return "UNKNOWN";
      }
    }
  }
  return "OBSERVED";
}

function unknownScope(auditedPaths: readonly string[]): UnknownSourcePathScope {
  return {
    state: "UNKNOWN",
    workspaceRoot: null,
    workspaceIdentityDigest: null,
    workspaceMatchesExpected: false,
    auditedPaths,
    reasonCodes: ["SOURCE_UNREADABLE"],
  };
}

function nodeErrorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
}

function asciiCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function pathEscape(message: string): never {
  throw new ExecutionContractError("PATH_ESCAPE", message);
}

function symlinkBoundary(message: string): never {
  throw new ExecutionContractError("SYMLINK_BOUNDARY", message);
}

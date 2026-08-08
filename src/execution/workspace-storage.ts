import { createHash } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, join, normalize, relative } from "node:path";

import { ExecutionContractError } from "./types.js";

export interface ResolveExecutionWorkspaceStorageRequest {
  platform: NodeJS.Platform;
  workspaceRoot: string;
  appDataRoot: string;
}

export interface ExecutionWorkspaceStorageLocation {
  workspaceId: string;
  workspaceIdentityDigest: string;
  storageDirectory: string;
  databasePath: string;
}

export interface ObserveExecutionWorkspaceIdentityRequest {
  platform: NodeJS.Platform;
  workspaceRoot: string;
}

export type ExecutionWorkspaceIdentityObservation =
  | {
      state: "OBSERVED";
      workspaceRoot: string;
      workspaceId: string;
      workspaceIdentityDigest: string;
    }
  | { state: "UNKNOWN"; reason: "UNAVAILABLE" }
  | { state: "REJECTED"; reason: "INVALID_PATH" | "SYMLINK_BOUNDARY" };

const invalidCode = "EXECUTION_WORKSPACE_STORAGE_INVALID";

export async function resolveExecutionWorkspaceStorage(
  request: ResolveExecutionWorkspaceStorageRequest,
): Promise<ExecutionWorkspaceStorageLocation> {
  if (request.platform !== process.platform || !["win32", "linux", "darwin"].includes(request.platform)) {
    throw new ExecutionContractError("HOST_CAPABILITY_UNKNOWN", "workspace storage host profile is not established");
  }
  if (request.platform === "win32" && (isUncPath(request.workspaceRoot) || isUncPath(request.appDataRoot))) {
    invalid("workspace storage does not permit UNC paths");
  }
  const workspaceObservation = await observeExecutionWorkspaceIdentity({
    platform: request.platform,
    workspaceRoot: request.workspaceRoot,
  });
  if (workspaceObservation.state !== "OBSERVED") {
    invalid(workspaceObservation.reason === "SYMLINK_BOUNDARY"
      ? "workspace root cannot be a symbolic link or reparse point"
      : "workspace root is invalid or unavailable");
  }
  const workspaceRoot = workspaceObservation.workspaceRoot;
  const appDataRoot = await absoluteRegularDirectory(request.appDataRoot, "application data root");
  if (pathsOverlap(workspaceRoot, appDataRoot)) invalid("workspace and application data roots must not overlap");

  const applicationDirectory = request.platform === "win32" ? "AI Booster Kit" : "ai-booster-kit";
  const storageDirectory = join(appDataRoot, applicationDirectory, "execution-workspaces", workspaceObservation.workspaceId);
  if (!isDescendant(appDataRoot, storageDirectory)) invalid("workspace storage path escapes application data root");

  return {
    workspaceId: workspaceObservation.workspaceId,
    workspaceIdentityDigest: workspaceObservation.workspaceIdentityDigest,
    storageDirectory,
    databasePath: join(storageDirectory, "execution.sqlite"),
  };
}

export async function observeExecutionWorkspaceIdentity(
  request: ObserveExecutionWorkspaceIdentityRequest,
): Promise<ExecutionWorkspaceIdentityObservation> {
  if (request.platform !== process.platform || !["win32", "linux", "darwin"].includes(request.platform)) {
    return { state: "REJECTED", reason: "INVALID_PATH" };
  }
  if (!isAbsolute(request.workspaceRoot) || (request.platform === "win32" && isUncPath(request.workspaceRoot))) {
    return { state: "REJECTED", reason: "INVALID_PATH" };
  }
  let details;
  try {
    details = await lstat(request.workspaceRoot);
  } catch {
    return { state: "UNKNOWN", reason: "UNAVAILABLE" };
  }
  if (details.isSymbolicLink()) return { state: "REJECTED", reason: "SYMLINK_BOUNDARY" };
  if (!details.isDirectory()) return { state: "REJECTED", reason: "INVALID_PATH" };
  let workspaceRoot: string;
  try {
    workspaceRoot = await realpath(request.workspaceRoot);
  } catch {
    return { state: "UNKNOWN", reason: "UNAVAILABLE" };
  }
  const normalizedWorkspace = normalizedIdentityPath(workspaceRoot, request.platform);
  const workspaceIdentityDigest = createHash("sha256")
    .update(`execution-workspace-v1\0${request.platform}\0${normalizedWorkspace}`, "utf8")
    .digest("hex");
  return {
    state: "OBSERVED",
    workspaceRoot,
    workspaceId: workspaceIdentityDigest.slice(0, 32),
    workspaceIdentityDigest,
  };
}

async function absoluteRegularDirectory(path: string, label: string): Promise<string> {
  if (!isAbsolute(path)) invalid(`${label} must be absolute`);
  let details;
  try {
    details = await lstat(path);
  } catch {
    invalid(`${label} is unavailable`);
  }
  if (details.isSymbolicLink()) invalid(`${label} cannot be a symbolic link or reparse point`);
  if (!details.isDirectory()) invalid(`${label} must be a directory`);
  try {
    return await realpath(path);
  } catch {
    invalid(`${label} cannot be resolved`);
  }
}

function normalizedIdentityPath(path: string, platform: NodeJS.Platform): string {
  const normalized = normalize(path).replace(/[\\/]+$/u, "");
  return platform === "win32" ? normalized.replaceAll("/", "\\").toLowerCase() : normalized;
}

function pathsOverlap(first: string, second: string): boolean {
  return first === second || isDescendant(first, second) || isDescendant(second, first);
}

function isDescendant(parent: string, candidate: string): boolean {
  const pathRelative = relative(parent, candidate);
  return pathRelative !== "" && pathRelative !== ".." && !pathRelative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(pathRelative);
}

function isUncPath(path: string): boolean {
  return path.startsWith("\\\\") || path.startsWith("//");
}

function invalid(message: string): never {
  throw new ExecutionContractError(invalidCode, message);
}

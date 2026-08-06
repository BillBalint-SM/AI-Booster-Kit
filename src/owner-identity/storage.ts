import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import type { OwnerIdentityProfile, OwnerIdentityReadResult, OwnerIdentityStorage, OwnerIdentityWriteResult } from "./types.js";
import { validateOwnerAlias } from "./validation.js";

const writeQueues = new Map<string, Promise<void>>();
const lockFileName = ".owner-identity.lock";
const lockAttemptCount = 40;
const lockRetryMilliseconds = 25;

export function createFileOwnerIdentityStorage(targetPath: string, userLocalRoot: string): OwnerIdentityStorage {
  const target = normalizeTarget(targetPath, userLocalRoot);

  return {
    read: async () => readProfile(target),
    save: async (ownerAlias) => serializeWrite(target, async () => saveNewProfile(target, ownerAlias)),
    replace: async (ownerAlias) => serializeWrite(target, async () => replaceProfile(target, ownerAlias)),
  };
}

async function readProfile(target: StorageTarget): Promise<OwnerIdentityReadResult> {
  if (target.status === "INVALID") return unavailable();
  const parentStatus = await inspectParent(target.parent);
  if (parentStatus === "MISSING") {
    return (await existingAncestryIsSafe(target.parent)) ? { status: "MISSING" } : unavailable();
  }
  if (parentStatus === "UNAVAILABLE") return unavailable();

  try {
    const entry = await lstat(target.path);
    if (!entry.isFile() || entry.isSymbolicLink()) return unavailable();
    return parseProfile(await readFile(target.path, "utf8"));
  } catch (error) {
    if (hasCode(error, "ENOENT")) return { status: "MISSING" };
    return unavailable();
  }
}

async function saveNewProfile(target: StorageTarget, ownerAliasInput: string): Promise<OwnerIdentityWriteResult> {
  const validation = validateOwnerAlias(ownerAliasInput);
  if (validation.status === "INVALID") return validation;
  if (target.status === "INVALID") return unavailable();

  const prepared = await prepareParent(target.parent);
  if (!prepared) return unavailable();

  return withFileLock(target, async () => {
    const existing = await readProfile(target);
    if (existing.status === "UNAVAILABLE") return existing;
    if (existing.status === "SET") {
      if (existing.profile.ownerAlias === validation.ownerAlias) {
        return { status: "SET", profile: existing.profile, persistencePerformed: false };
      }
      return { status: "CONFLICT", reason: "OWNER_IDENTITY_WRITE_CONFLICT" };
    }

    const profile: OwnerIdentityProfile = { version: 1, ownerAlias: validation.ownerAlias };
    if (!(await persistAtomically(target.path, profile))) return unavailable();
    return { status: "SET", profile, persistencePerformed: true };
  });
}

async function replaceProfile(target: StorageTarget, ownerAliasInput: string): Promise<OwnerIdentityWriteResult> {
  const validation = validateOwnerAlias(ownerAliasInput);
  if (validation.status === "INVALID") return validation;
  if (target.status === "INVALID") return unavailable();

  const prepared = await prepareParent(target.parent);
  if (!prepared) return unavailable();

  return withFileLock(target, async () => {
    const existing = await readProfile(target);
    if (existing.status === "UNAVAILABLE") return existing;
    if (existing.status === "SET" && existing.profile.ownerAlias === validation.ownerAlias) {
      return { status: "SET", profile: existing.profile, persistencePerformed: false };
    }

    const profile: OwnerIdentityProfile = { version: 1, ownerAlias: validation.ownerAlias };
    if (!(await persistAtomically(target.path, profile))) return unavailable();
    return { status: "SET", profile, persistencePerformed: true };
  });
}

function parseProfile(source: string): OwnerIdentityReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) return { status: "INVALID", reason: "OWNER_IDENTITY_JSON_INVALID" };
    return unavailable();
  }

  if (!isPlainRecord(parsed)) return { status: "INVALID", reason: "OWNER_IDENTITY_SCHEMA_INVALID" };
  if (Object.hasOwn(parsed, "version") && parsed.version !== 1) {
    return { status: "INVALID", reason: "OWNER_IDENTITY_VERSION_UNSUPPORTED" };
  }
  const keys = Object.keys(parsed).sort();
  if (keys.length !== 2 || keys[0] !== "ownerAlias" || keys[1] !== "version" || typeof parsed.ownerAlias !== "string") {
    return { status: "INVALID", reason: "OWNER_IDENTITY_SCHEMA_INVALID" };
  }
  const validation = validateOwnerAlias(parsed.ownerAlias);
  if (validation.status === "INVALID" || validation.ownerAlias !== parsed.ownerAlias) {
    return { status: "INVALID", reason: "OWNER_IDENTITY_SCHEMA_INVALID" };
  }
  return { status: "SET", profile: { version: 1, ownerAlias: validation.ownerAlias } };
}

async function persistAtomically(targetPath: string, profile: OwnerIdentityProfile): Promise<boolean> {
  const temporaryPath = join(dirname(targetPath), `.owner-identity-${randomUUID()}.tmp`);
  let temporaryCreated = false;
  try {
    const handle = await open(temporaryPath, "wx", 0o600);
    temporaryCreated = true;
    try {
      await handle.writeFile(`${JSON.stringify(profile)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, targetPath);
    temporaryCreated = false;
    return true;
  } catch {
    if (!temporaryCreated) return false;
    const removed = await removeTemporaryFile(temporaryPath);
    temporaryCreated = !removed;
    return false;
  } finally {
    if (temporaryCreated) await removeTemporaryFile(temporaryPath);
  }
}

async function removeTemporaryFile(temporaryPath: string): Promise<boolean> {
  try {
    await rm(temporaryPath, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function prepareParent(parentPath: string): Promise<boolean> {
  if (!(await existingAncestryIsSafe(parentPath))) return false;
  try {
    await mkdir(parentPath, { recursive: true });
  } catch {
    return false;
  }
  return (await inspectParent(parentPath)) === "AVAILABLE";
}

async function existingAncestryIsSafe(path: string): Promise<boolean> {
  let candidate = path;
  while (true) {
    try {
      const entry = await lstat(candidate);
      if (!entry.isDirectory() || entry.isSymbolicLink()) return false;
      return samePath(await realpath(candidate), candidate);
    } catch (error) {
      if (!hasCode(error, "ENOENT")) return false;
      const parent = dirname(candidate);
      if (parent === candidate) return false;
      candidate = parent;
    }
  }
}

async function inspectParent(parentPath: string): Promise<"AVAILABLE" | "MISSING" | "UNAVAILABLE"> {
  try {
    const entry = await lstat(parentPath);
    if (!entry.isDirectory() || entry.isSymbolicLink()) return "UNAVAILABLE";
    return samePath(await realpath(parentPath), parentPath) ? "AVAILABLE" : "UNAVAILABLE";
  } catch (error) {
    return hasCode(error, "ENOENT") ? "MISSING" : "UNAVAILABLE";
  }
}

async function serializeWrite<T>(target: StorageTarget, action: () => Promise<T>): Promise<T> {
  const key = target.status === "VALID" ? target.path : target.original;
  const previous = writeQueues.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolveGate) => { release = resolveGate; });
  const current = previous.then(() => gate);
  writeQueues.set(key, current);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (writeQueues.get(key) === current) writeQueues.delete(key);
  }
}

async function withFileLock(target: Extract<StorageTarget, { status: "VALID" }>, action: () => Promise<OwnerIdentityWriteResult>): Promise<OwnerIdentityWriteResult> {
  const lock = await acquireFileLock(join(target.parent, lockFileName));
  if (lock === null) return unavailable();

  let result: OwnerIdentityWriteResult;
  try {
    result = await action();
  } catch {
    result = unavailable();
  }
  const released = await releaseFileLock(lock);
  return released ? result : unavailable();
}

async function acquireFileLock(lockPath: string): Promise<string | null> {
  for (let attempt = 0; attempt < lockAttemptCount; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      await handle.close();
      return lockPath;
    } catch (error) {
      if (!hasCode(error, "EEXIST")) return null;
      await delay(lockRetryMilliseconds);
    }
  }
  return null;
}

async function releaseFileLock(lockPath: string): Promise<boolean> {
  try {
    await rm(lockPath);
    return true;
  } catch {
    return false;
  }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolveDelay) => { setTimeout(resolveDelay, milliseconds); });
}

type StorageTarget =
  | { status: "VALID"; path: string; parent: string; original: string }
  | { status: "INVALID"; original: string };

function normalizeTarget(targetPath: string, userLocalRoot: string): StorageTarget {
  if (
    typeof targetPath !== "string" ||
    targetPath.trim() === "" ||
    targetPath.includes("\0") ||
    !isAbsolute(targetPath) ||
    targetPath.replaceAll("\\", "/").split("/").includes("..") ||
    typeof userLocalRoot !== "string" ||
    userLocalRoot.trim() === "" ||
    userLocalRoot.includes("\0") ||
    !isAbsolute(userLocalRoot) ||
    userLocalRoot.replaceAll("\\", "/").split("/").includes("..")
  ) {
    return { status: "INVALID", original: typeof targetPath === "string" ? targetPath : "" };
  }
  const path = resolve(targetPath);
  const root = resolve(userLocalRoot);
  const parent = dirname(path);
  const expectedPath = join(root, "AI Booster Kit", "owner-identity.json");
  if (!samePath(path, expectedPath) || basename(path) !== "owner-identity.json" || basename(parent) !== "AI Booster Kit") {
    return { status: "INVALID", original: targetPath };
  }
  return { status: "VALID", path, parent, original: targetPath };
}

function unavailable(): Extract<OwnerIdentityReadResult, { status: "UNAVAILABLE" }> {
  return { status: "UNAVAILABLE", reason: "OWNER_IDENTITY_TARGET_INVALID" };
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLocaleLowerCase("en-US") === normalizedRight.toLocaleLowerCase("en-US")
    : normalizedLeft === normalizedRight;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

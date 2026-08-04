import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { parseWorkContext, serializeWorkContext } from "./markdown.js";
import { ContextError } from "./types.js";
import { validateSessionState } from "./validation.js";
import type { SessionState, WorkContext } from "./types.js";

export interface ContextSaveResult {
  state: "PERSONAL_CONTEXT_SAVED" | "TEAM_CONTEXT_SAVED";
  contextId: string;
  retention: "PERSONAL" | "TEAM";
  targetPath: string;
  persistencePerformed: true;
}

export interface SessionSaveResult {
  state: "PERSONAL_SESSION_SAVED" | "TEAM_SESSION_SAVED";
  sessionId: string;
  retention: "PERSONAL" | "TEAM";
  targetPath: string;
  persistencePerformed: true;
}

export async function saveWorkContext(targetPath: string, context: WorkContext, repositoryRoot: string | undefined): Promise<ContextSaveResult> {
  const validated = parseWorkContext(serializeWorkContext(context), "context artifact");
  const saved = await saveDocument(targetPath, serializeWorkContext(validated), validated.retention, repositoryRoot, validated.contextId, "CONTEXT");
  return { state: saved.retention === "PERSONAL" ? "PERSONAL_CONTEXT_SAVED" : "TEAM_CONTEXT_SAVED", contextId: validated.contextId, retention: saved.retention, targetPath: saved.targetPath, persistencePerformed: true };
}

export async function saveSessionState(targetPath: string, state: SessionState, repositoryRoot: string | undefined): Promise<SessionSaveResult> {
  const validated = validateSessionState(state);
  const source = `${JSON.stringify(validated)}\n`;
  const saved = await saveDocument(targetPath, source, validated.retention, repositoryRoot, validated.sessionId, "SESSION");
  return { state: saved.retention === "PERSONAL" ? "PERSONAL_SESSION_SAVED" : "TEAM_SESSION_SAVED", sessionId: validated.sessionId, retention: saved.retention, targetPath: saved.targetPath, persistencePerformed: true };
}

async function saveDocument(targetPath: string, source: string, retention: WorkContext["retention"], repositoryRoot: string | undefined, identity: string, kind: "CONTEXT" | "SESSION"): Promise<{ retention: "PERSONAL" | "TEAM"; targetPath: string }> {
  if (retention === "EPHEMERAL") throw new ContextError(`${kind}_EPHEMERAL_PERSISTENCE_FORBIDDEN`);
  const normalizedRoot = retention === "TEAM" ? await teamRoot(repositoryRoot) : undefined;
  const normalizedTarget = target(targetPath, retention, normalizedRoot, kind);
  await validateTargetParent(normalizedTarget, normalizedRoot, kind);
  const existing = await readExisting(normalizedTarget, kind);
  if (existing !== null) {
    if (existing !== source) throw new ContextError(`${kind}_TARGET_CONFLICT`);
    return { retention, targetPath: normalizedTarget };
  }
  try {
    await writeFile(normalizedTarget, source, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw new ContextError(`${kind}_TARGET_INVALID`);
    const raced = await readExisting(normalizedTarget, kind);
    if (raced !== source) throw new ContextError(`${kind}_TARGET_CONFLICT`);
  }
  return { retention, targetPath: normalizedTarget };
}

function target(targetPath: string, retention: "PERSONAL" | "TEAM", repositoryRoot: string | undefined, kind: "CONTEXT" | "SESSION"): string {
  if (typeof targetPath !== "string" || targetPath.trim() === "") throw new ContextError(`${kind}_TARGET_INVALID`);
  if (retention === "TEAM") {
    if (isAbsolute(targetPath)) throw new ContextError(`${kind}_TARGET_NOT_REPOSITORY_RELATIVE`);
    if (repositoryRoot === undefined) throw new ContextError(`${kind}_REPOSITORY_ROOT_REQUIRED`);
    return resolve(repositoryRoot, targetPath);
  }
  return resolve(targetPath);
}

async function teamRoot(repositoryRoot: string | undefined): Promise<string> {
  if (typeof repositoryRoot !== "string" || repositoryRoot.trim() === "") throw new ContextError("CONTEXT_REPOSITORY_ROOT_REQUIRED");
  const normalized = resolve(repositoryRoot);
  try {
    const entry = await lstat(normalized);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("invalid root");
    return await realpath(normalized);
  } catch {
    throw new ContextError("CONTEXT_REPOSITORY_ROOT_INVALID");
  }
}

async function validateTargetParent(targetPath: string, repositoryRoot: string | undefined, kind: "CONTEXT" | "SESSION"): Promise<void> {
  if (repositoryRoot === undefined) {
    try { await realpath(dirname(targetPath)); } catch { throw new ContextError(`${kind}_TARGET_INVALID`); }
    return;
  }
  if (!isWithin(repositoryRoot, targetPath)) throw new ContextError(`${kind}_TARGET_OUTSIDE_REPOSITORY`);
  try {
    const resolvedParent = await realpath(dirname(targetPath));
    if (resolvedParent !== repositoryRoot && !isWithin(repositoryRoot, resolvedParent)) throw new ContextError(`${kind}_TARGET_OUTSIDE_REPOSITORY`);
  } catch (error) {
    if (error instanceof ContextError) throw error;
    throw new ContextError(`${kind}_TARGET_INVALID`);
  }
}

async function readExisting(targetPath: string, kind: "CONTEXT" | "SESSION"): Promise<string | null> {
  try {
    const entry = await lstat(targetPath);
    if (entry.isDirectory() || entry.isSymbolicLink()) throw new ContextError(`${kind}_TARGET_INVALID`);
    return await readFile(targetPath, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    if (error instanceof ContextError) throw error;
    throw new ContextError(`${kind}_TARGET_INVALID`);
  }
}

function isWithin(rootPath: string, childPath: string): boolean {
  const childRelative = relative(rootPath, childPath);
  return childRelative !== "" && !isAbsolute(childRelative) && childRelative !== ".." && !childRelative.startsWith(`..${sep}`);
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

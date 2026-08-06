import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { createActivationBoundaryPackage } from "./activation-boundary.js";
import { ControllerActivationPackageError as ActivationPackageError } from "./types.js";
import type { ActivationBoundaryPackage, ActivationSaveResult, ActivationSetupSnapshot, ContextReference, QuickTaskActivationPackage, RetentionScope, TuningRequest } from "./types.js";

type PersistedRetention = "PERSONAL" | "TEAM";

export async function saveActivationPackage(
  targetPath: string,
  packageValue: ActivationBoundaryPackage,
  repositoryRoot: string | undefined,
): Promise<ActivationSaveResult> {
  const validatedPackage = validateActivationPackage(packageValue);
  if (validatedPackage.retention === "EPHEMERAL") {
    throw new ActivationPackageError("ACTIVATION_EPHEMERAL_PERSISTENCE_FORBIDDEN", "an Ephemeral package cannot be persisted");
  }
  const retention: PersistedRetention = validatedPackage.retention;
  const normalizedRoot = retention === "TEAM" ? await validateTeamRoot(repositoryRoot) : undefined;
  const normalizedTarget = validateTarget(targetPath, retention, normalizedRoot);

  await validateTargetParent(normalizedTarget, normalizedRoot);
  const content = serializePackage(validatedPackage);
  const existingContent = await readExistingTarget(normalizedTarget);

  if (existingContent !== null) return confirmExistingPackage(normalizedTarget, validatedPackage, retention, existingContent);

  try {
    await writeFile(normalizedTarget, content, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "the explicit target could not be written");
    const racedContent = await readExistingTarget(normalizedTarget);
    if (racedContent === null) throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "the explicit target could not be read after a write conflict");
    return confirmExistingPackage(normalizedTarget, validatedPackage, retention, racedContent);
  }

  return saveResult(normalizedTarget, validatedPackage.packageId, retention);
}

export function validateActivationPackage(value: unknown): ActivationBoundaryPackage {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ActivationPackageError("ACTIVATION_PACKAGE_INVALID", "the activation package must be an object");
  }
  const candidate = value as unknown as Record<string, unknown>;
  if (candidate.activationVersion !== "2.0" || candidate.state !== "ACTIVATION_PACKAGE_PREPARED") {
    throw new ActivationPackageError("ACTIVATION_PACKAGE_INVALID", "the activation package state is invalid");
  }
  if (candidate.packageId === undefined || typeof candidate.packageId !== "string" || candidate.packageId.trim() === "") {
    throw new ActivationPackageError("ACTIVATION_PACKAGE_INVALID", "the activation package identity is invalid");
  }
  if (candidate.retention !== "EPHEMERAL" && candidate.retention !== "PERSONAL" && candidate.retention !== "TEAM") {
    throw new ActivationPackageError("ACTIVATION_PACKAGE_INVALID", "the activation package retention is invalid");
  }
  try {
    const rebuilt = createActivationBoundaryPackage({
      basePackage: candidate.basePackage as QuickTaskActivationPackage,
      context: candidate.context as ContextReference,
      retention: candidate.retention as RetentionScope,
      tuning: candidate.tuning as TuningRequest,
      setupSnapshot: candidate.setupSnapshot as ActivationSetupSnapshot,
    });
    if (stableJson(rebuilt) !== stableJson(value)) throw new Error("the activation package identity is inconsistent");
  } catch (error) {
    if (error instanceof ActivationPackageError) throw error;
    throw new ActivationPackageError("ACTIVATION_PACKAGE_INVALID", "the activation package contract is invalid");
  }
  return value as ActivationBoundaryPackage;
}

function validateTarget(targetPath: string, retention: PersistedRetention, repositoryRoot: string | undefined): string {
  if (typeof targetPath !== "string" || targetPath.trim() === "") {
    throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "an explicit target file is required");
  }
  if (retention === "TEAM") {
    if (isAbsolute(targetPath)) {
      throw new ActivationPackageError("ACTIVATION_TARGET_NOT_REPOSITORY_RELATIVE", "the Team target must be repository-relative");
    }
    if (repositoryRoot === undefined) {
      throw new ActivationPackageError("ACTIVATION_REPOSITORY_ROOT_REQUIRED", "an explicit repository root is required for Team persistence");
    }
    return resolve(repositoryRoot, targetPath);
  }
  return resolve(targetPath);
}

async function validateTeamRoot(repositoryRoot: string | undefined): Promise<string> {
  if (typeof repositoryRoot !== "string" || repositoryRoot.trim() === "") {
    throw new ActivationPackageError("ACTIVATION_REPOSITORY_ROOT_REQUIRED", "an explicit repository root is required for Team persistence");
  }
  const normalizedRoot = resolve(repositoryRoot);
  try {
    const rootEntry = await lstat(normalizedRoot);
    if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) throw new Error("invalid repository root");
    return await realpath(normalizedRoot);
  } catch {
    throw new ActivationPackageError("ACTIVATION_REPOSITORY_ROOT_INVALID", "the explicit repository root is not a directory");
  }
}

async function validateTargetParent(targetPath: string, repositoryRoot: string | undefined): Promise<void> {
  if (repositoryRoot !== undefined) {
    const lexicalParent = dirname(targetPath);
    if (!isWithin(repositoryRoot, targetPath)) {
      throw new ActivationPackageError("ACTIVATION_TARGET_OUTSIDE_REPOSITORY", "the Team target must remain below the explicit repository root");
    }
    await assertResolvedWithin(repositoryRoot, lexicalParent);
    return;
  }

  try {
    await realpath(dirname(targetPath));
  } catch {
    throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "the target parent directory must already exist");
  }
}

async function assertResolvedWithin(repositoryRoot: string, parentPath: string): Promise<void> {
  try {
    const resolvedParent = await realpath(parentPath);
    if (!isWithin(repositoryRoot, resolvedParent) && resolvedParent !== repositoryRoot) {
      throw new ActivationPackageError("ACTIVATION_TARGET_OUTSIDE_REPOSITORY", "the Team target must remain below the explicit repository root");
    }
  } catch (error) {
    if (error instanceof ActivationPackageError) throw error;
    throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "the target parent directory must already exist");
  }
}

function isWithin(rootPath: string, childPath: string): boolean {
  const childRelative = relative(rootPath, childPath);
  return childRelative !== "" && !isAbsolute(childRelative) && childRelative !== ".." && !childRelative.startsWith(`..${sep}`);
}

async function readExistingTarget(targetPath: string): Promise<string | null> {
  try {
    const entry = await lstat(targetPath);
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "the explicit target must be a regular file");
    }
    return await readFile(targetPath, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    if (error instanceof ActivationPackageError) throw error;
    throw new ActivationPackageError("ACTIVATION_TARGET_INVALID", "the explicit target could not be read");
  }
}

function serializePackage(packageValue: ActivationBoundaryPackage): string {
  try {
    const serialized = JSON.stringify(packageValue);
    if (serialized === undefined) throw new Error("package serialization is undefined");
    return `${serialized}\n`;
  } catch {
    throw new ActivationPackageError("ACTIVATION_PACKAGE_INVALID", "the activation package cannot be serialized");
  }
}

function confirmExistingPackage(
  targetPath: string,
  packageValue: ActivationBoundaryPackage,
  retention: PersistedRetention,
  existingContent: string,
): ActivationSaveResult {
  try {
    const existingPackage = JSON.parse(existingContent) as unknown;
    if (stableJson(existingPackage) !== stableJson(packageValue)) {
      throw new ActivationPackageError("ACTIVATION_TARGET_CONFLICT", "the target contains a different activation package");
    }
  } catch (error) {
    if (error instanceof ActivationPackageError) throw error;
    throw new ActivationPackageError("ACTIVATION_TARGET_CONFLICT", "the target does not contain the same activation package");
  }

  return saveResult(targetPath, packageValue.packageId, retention);
}

function saveResult(targetPath: string, packageId: string, retention: PersistedRetention): ActivationSaveResult {
  return {
    state: retention === "PERSONAL" ? "PERSONAL_PACKAGE_SAVED" : "TEAM_PACKAGE_SAVED",
    packageId,
    retention,
    targetPath,
    persistencePerformed: true,
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const primitive = JSON.stringify(value);
    if (primitive === undefined) throw new Error("unsupported JSON value");
    return primitive;
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { createActivationBoundaryPackage } from "../src/controller/activation-boundary.js";
import { saveActivationPackage, validateActivationPackage } from "../src/controller/activation-storage.js";
import type { ActivationBoundaryPackage, QuickTaskActivationPackage, RetentionScope } from "../src/controller/types.js";

const basePackage: QuickTaskActivationPackage = {
  activationVersion: "1.0",
  state: "EPHEMERAL_PACKAGE_ISSUED",
  retention: "EPHEMERAL",
  profile: "planning",
  recipe: {
    recipeId: "quick-task-clarifier-validator",
    recipeVersion: "0.1.0",
    status: "READY_WITH_LIMIT",
  },
  intent: {
    state: "ACTIVATION_INTENT",
    requestFingerprint: "a".repeat(64),
    recipeSignature: "b".repeat(64),
  },
  agent: {
    role: "quick-task-clarifier-validator",
    mode: "assist",
    input: {
      goal: "Persist the explicit activation package.",
      outcomeOwner: "controller-review",
      value: { state: "KNOWN", statement: "The package remains host-agnostic." },
      context: { state: "CURRENT", reference: "workspace:ai-booster-kit" },
      relations: { state: "ABSENT", items: [] },
      dependencies: { state: "ABSENT", items: [] },
    },
    outputContract: {
      requiredSections: ["scope", "evidence", "rollback"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    instructions: ["Write only the explicit package."],
    stopConditions: ["Stop on target conflict."],
    executionBoundary: "LOCAL_ONLY",
  },
  operations: {
    packageIssued: true,
    hostActivationPerformed: false,
    artifactGenerationPerformed: false,
    persistencePerformed: false,
  },
};

test("activation validation: accepts a prepared package and rejects forged identity", () => {
  const packageValue = makePackage("PERSONAL", "Validate the reusable package.");

  assert.deepEqual(validateActivationPackage(packageValue), packageValue);
  assert.throws(
    () => validateActivationPackage({ ...packageValue, packageId: "forged" }),
    (error: unknown) => error instanceof Error && error.message.startsWith("ACTIVATION_PACKAGE_INVALID: "),
  );
});

test("activation storage: writes one Personal JSON document and is idempotent", async () => {
  await withTemporaryDirectory(async (directory) => {
    const packageValue = makePackage("PERSONAL", "Persist the Personal package.");
    const target = join(directory, "personal.json");

    const first = await saveActivationPackage(target, packageValue, undefined);
    const firstContent = await readFile(target, "utf8");
    const second = await saveActivationPackage(target, packageValue, undefined);

    assert.deepEqual(first, {
      state: "PERSONAL_PACKAGE_SAVED",
      packageId: packageValue.packageId,
      retention: "PERSONAL",
      targetPath: resolve(target),
      persistencePerformed: true,
    });
    assert.deepEqual(second, first);
    assert.equal(firstContent.endsWith("\n"), true);
    assert.deepEqual(JSON.parse(firstContent), packageValue);
    assert.deepEqual(await readdir(directory), ["personal.json"]);
  });
});

test("activation storage: writes a repository-relative Team package below the explicit repository root", async () => {
  await withTemporaryDirectory(async (repositoryRoot) => {
    const packageValue = makePackage("TEAM", "Persist the Team package.");
    const target = join(repositoryRoot, "artifacts", "activation.json");
    await mkdir(join(repositoryRoot, "artifacts"));

    const result = await saveActivationPackage(join("artifacts", "activation.json"), packageValue, repositoryRoot);

    assert.equal(result.state, "TEAM_PACKAGE_SAVED");
    assert.equal(result.retention, "TEAM");
    assert.equal(result.targetPath, resolve(target));
    assert.deepEqual(JSON.parse(await readFile(target, "utf8")), packageValue);
  });
});

test("activation storage: rejects an absolute Team target even below the repository root", async () => {
  await withTemporaryDirectory(async (repositoryRoot) => {
    const target = join(repositoryRoot, "activation.json");

    await assertStorageError(
      () => saveActivationPackage(target, makePackage("TEAM", "Use a repository-relative target."), repositoryRoot),
      "ACTIVATION_TARGET_NOT_REPOSITORY_RELATIVE",
    );
    assert.deepEqual(await readdir(repositoryRoot), []);
  });
});

test("activation storage: rejects Ephemeral persistence and missing Team root", async () => {
  await withTemporaryDirectory(async (directory) => {
    const target = join(directory, "activation.json");

    await assertStorageError(
      () => saveActivationPackage(target, makePackage("EPHEMERAL", "Do not persist."), undefined),
      "ACTIVATION_EPHEMERAL_PERSISTENCE_FORBIDDEN",
    );
    await assertStorageError(
      () => saveActivationPackage(target, makePackage("TEAM", "Require a root."), undefined),
      "ACTIVATION_REPOSITORY_ROOT_REQUIRED",
    );
    assert.deepEqual(await readdir(directory), []);
  });
});

test("activation storage: rejects Team traversal and a repository-root directory target", async () => {
  await withTemporaryDirectory(async (repositoryRoot) => {
    const escapeTarget = join("..", "outside-activation.json");

    await assertStorageError(
      () => saveActivationPackage(escapeTarget, makePackage("TEAM", "Stay inside the repository."), repositoryRoot),
      "ACTIVATION_TARGET_OUTSIDE_REPOSITORY",
    );
    await assertStorageError(
      () => saveActivationPackage(".", makePackage("TEAM", "A file target is required."), repositoryRoot),
      "ACTIVATION_TARGET_OUTSIDE_REPOSITORY",
    );
  });
});

test("activation storage: rejects a conflicting package without overwriting the original", async () => {
  await withTemporaryDirectory(async (directory) => {
    const target = join(directory, "activation.json");
    const original = makePackage("PERSONAL", "Keep the original package.");
    const conflicting = makePackage("PERSONAL", "Do not overwrite the original package.");

    await saveActivationPackage(target, original, undefined);
    const originalContent = await readFile(target, "utf8");

    await assertStorageError(
      () => saveActivationPackage(target, conflicting, undefined),
      "ACTIVATION_TARGET_CONFLICT",
    );
    assert.equal(await readFile(target, "utf8"), originalContent);
    assert.deepEqual(await readdir(directory), ["activation.json"]);
  });
});

test("activation storage: rejects malformed and directory targets without replacing them", async () => {
  await withTemporaryDirectory(async (directory) => {
    const malformedTarget = join(directory, "malformed.json");
    const directoryTarget = join(directory, "directory-target");
    await writeFile(malformedTarget, "not-json\n", "utf8");
    await mkdir(directoryTarget);

    await assertStorageError(
      () => saveActivationPackage(malformedTarget, makePackage("PERSONAL", "Reject malformed existing content."), undefined),
      "ACTIVATION_TARGET_CONFLICT",
    );
    await assertStorageError(
      () => saveActivationPackage(directoryTarget, makePackage("PERSONAL", "Reject directory targets."), undefined),
      "ACTIVATION_TARGET_INVALID",
    );
    assert.equal(await readFile(malformedTarget, "utf8"), "not-json\n");
    assert.deepEqual(await readdir(directory), ["directory-target", "malformed.json"]);
  });
});

test("activation storage: rejects a missing parent and an invalid empty target without creating artifacts", async () => {
  await withTemporaryDirectory(async (directory) => {
    await assertStorageError(
      () => saveActivationPackage(join(directory, "missing", "activation.json"), makePackage("PERSONAL", "No implicit parent."), undefined),
      "ACTIVATION_TARGET_INVALID",
    );
    await assertStorageError(
      () => saveActivationPackage("", makePackage("PERSONAL", "An explicit target is required."), undefined),
      "ACTIVATION_TARGET_INVALID",
    );
    assert.deepEqual(await readdir(directory), []);
  });
});

function makePackage(retention: RetentionScope, change: string): ActivationBoundaryPackage {
  return createActivationBoundaryPackage({
    basePackage,
    context: { kind: "EPIC", contextId: "EPIC-STORAGE", sourceRevision: "revision-storage" },
    retention,
    tuning: { state: "REQUESTED", change, rationale: "The storage contract must be explicit." },
    setupSnapshot: {
      recipeId: "quick-task-clarifier-validator",
      recipeVersion: "0.1.0",
      variantId: "baseline",
      fingerprint: "setup-storage",
    },
  });
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "activation-storage-"));
  try {
    return await run(await realpath(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function assertStorageError(run: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message.startsWith(`${code}: `), true);
    return true;
  });
}

import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";

import { resolveExecutionWorkspaceStorage } from "../src/execution/workspace-storage.js";

test("workspace storage resolution is deterministic, contained, and read-only", async (context) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "execution-workspace-storage-")));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workspaceRoot = join(root, "Workspace");
  const appDataRoot = join(root, "LocalData");
  await mkdir(workspaceRoot);
  await mkdir(appDataRoot);

  const first = await resolveExecutionWorkspaceStorage({
    platform: process.platform,
    workspaceRoot,
    appDataRoot,
  });
  const second = await resolveExecutionWorkspaceStorage({
    platform: process.platform,
    workspaceRoot,
    appDataRoot,
  });

  assert.deepEqual(second, first);
  assert.match(first.workspaceId, /^[a-f0-9]{32}$/u);
  assert.match(first.workspaceIdentityDigest, /^[a-f0-9]{64}$/u);
  assert.equal(relative(appDataRoot, first.storageDirectory).startsWith(".."), false);
  assert.equal(first.databasePath, join(first.storageDirectory, "execution.sqlite"));
  await assert.rejects(() => import("node:fs/promises").then(({ access }) => access(first.storageDirectory)));
});

test("workspace identity normalizes equivalent Windows spelling", async (context) => {
  if (process.platform !== "win32") return;
  const root = await realpath(await mkdtemp(join(tmpdir(), "execution-workspace-case-")));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workspaceRoot = join(root, "MixedCaseWorkspace");
  const appDataRoot = join(root, "LocalData");
  await mkdir(workspaceRoot);
  await mkdir(appDataRoot);

  const canonical = await resolveExecutionWorkspaceStorage({ platform: "win32", workspaceRoot, appDataRoot });
  const alternate = await resolveExecutionWorkspaceStorage({
    platform: "win32",
    workspaceRoot: workspaceRoot.toUpperCase().replaceAll("\\", "/"),
    appDataRoot: appDataRoot.toUpperCase().replaceAll("\\", "/"),
  });

  assert.equal(alternate.workspaceId, canonical.workspaceId);
  assert.equal(alternate.workspaceIdentityDigest, canonical.workspaceIdentityDigest);
});

test("workspace storage rejects relative, repository-contained, non-directory, and linked roots", async (context) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "execution-workspace-invalid-")));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "local-data");
  const appDataInsideWorkspace = join(workspaceRoot, "local-data");
  const filePath = join(root, "not-a-directory");
  const linkPath = join(root, "linked-workspace");
  await mkdir(workspaceRoot);
  await mkdir(appDataRoot);
  await mkdir(appDataInsideWorkspace);
  await writeFile(filePath, "not a directory", "utf8");
  await symlink(workspaceRoot, linkPath, process.platform === "win32" ? "junction" : "dir");

  await assert.rejects(
    () => resolveExecutionWorkspaceStorage({ platform: process.platform, workspaceRoot: "relative", appDataRoot }),
    /EXECUTION_WORKSPACE_STORAGE_INVALID/u,
  );
  await assert.rejects(
    () => resolveExecutionWorkspaceStorage({ platform: process.platform, workspaceRoot, appDataRoot: appDataInsideWorkspace }),
    /EXECUTION_WORKSPACE_STORAGE_INVALID/u,
  );
  await assert.rejects(
    () => resolveExecutionWorkspaceStorage({ platform: process.platform, workspaceRoot: filePath, appDataRoot }),
    /EXECUTION_WORKSPACE_STORAGE_INVALID/u,
  );
  await assert.rejects(
    () => resolveExecutionWorkspaceStorage({ platform: process.platform, workspaceRoot: linkPath, appDataRoot }),
    /EXECUTION_WORKSPACE_STORAGE_INVALID/u,
  );
});

test("workspace storage rejects Windows UNC roots before filesystem access", async () => {
  if (process.platform !== "win32") return;
  await assert.rejects(
    () => resolveExecutionWorkspaceStorage({
      platform: "win32",
      workspaceRoot: "\\\\server\\share\\workspace",
      appDataRoot: "C:\\LocalData",
    }),
    /EXECUTION_WORKSPACE_STORAGE_INVALID/u,
  );
});

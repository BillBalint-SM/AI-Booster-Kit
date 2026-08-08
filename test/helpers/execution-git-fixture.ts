import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function createExecutionGitFixture(): Promise<{
  root: string;
  workspaceRoot: string;
  appDataRoot: string;
  revision: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), "execution-binding-git-"));
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "app-data");
  await mkdir(join(workspaceRoot, "src"), { recursive: true });
  await mkdir(join(workspaceRoot, "docs"), { recursive: true });
  await mkdir(appDataRoot);
  await writeFile(join(workspaceRoot, "src", "alpha.txt"), "alpha\n", "utf8");
  await writeFile(join(workspaceRoot, "docs", "guide.md"), "guide\n", "utf8");
  await writeFile(join(workspaceRoot, ".gitignore"), "ignored.log\n", "utf8");
  await git(workspaceRoot, ["init", "--initial-branch=main"]);
  await git(workspaceRoot, ["config", "user.name", "Synthetic Test"]);
  await git(workspaceRoot, ["config", "user.email", "synthetic@example.invalid"]);
  await git(workspaceRoot, ["add", "."]);
  await git(workspaceRoot, ["commit", "-m", "initial synthetic source"]);
  const revision = (await git(workspaceRoot, ["rev-parse", "HEAD"])).trim();
  return {
    root,
    workspaceRoot,
    appDataRoot,
    revision,
    cleanup: async () => rm(root, { recursive: true, force: true }),
  };
}

export async function git(workspaceRoot: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", workspaceRoot, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return result.stdout;
}

export async function createSiblingWorktree(
  fixture: { root: string; workspaceRoot: string },
  name: string,
): Promise<string> {
  const worktreeRoot = join(fixture.root, name);
  await git(fixture.workspaceRoot, ["worktree", "add", "--detach", worktreeRoot, "HEAD"]);
  return worktreeRoot;
}

export async function cloneFixtureRepository(
  fixture: { root: string; workspaceRoot: string },
  name: string,
): Promise<string> {
  const cloneRoot = join(fixture.root, name);
  await execFileAsync("git", ["clone", "--no-hardlinks", fixture.workspaceRoot, cloneRoot], {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return cloneRoot;
}

export async function addDirtySubmodule(
  fixture: { root: string; workspaceRoot: string },
): Promise<void> {
  const sourceRoot = join(fixture.root, "submodule-source");
  await mkdir(sourceRoot);
  await git(sourceRoot, ["init", "--initial-branch=main"]);
  await git(sourceRoot, ["config", "user.name", "Synthetic Test"]);
  await git(sourceRoot, ["config", "user.email", "synthetic@example.invalid"]);
  await writeFile(join(sourceRoot, "module.txt"), "module\n", "utf8");
  await git(sourceRoot, ["add", "."]);
  await git(sourceRoot, ["commit", "-m", "synthetic submodule"]);
  await git(fixture.workspaceRoot, ["-c", "protocol.file.allow=always", "submodule", "add", sourceRoot, "module"]);
  await git(fixture.workspaceRoot, ["commit", "-am", "add synthetic submodule"]);
  await writeFile(join(fixture.workspaceRoot, "module", "module.txt"), "dirty module\n", "utf8");
}

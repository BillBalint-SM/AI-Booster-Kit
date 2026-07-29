import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export function extractLocalMarkdownLinks(source: string): readonly string[] {
  return [...withoutMarkdownCode(source).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim() ?? "")
    .map((href) => href.split("#", 1)[0] ?? "")
    .filter((href) => href.endsWith(".md") && !/^(?:[a-z]+:|\/\/)/i.test(href));
}

export function resolveLocalMarkdownLink(
  originPath: string,
  href: string,
  repositoryRoot: string,
): string | null {
  const targetHref = href.split("#", 1)[0] ?? "";
  const targetPath = resolve(repositoryRoot, dirname(originPath), targetHref);
  const relativeTargetPath = relative(resolve(repositoryRoot), targetPath);

  if (
    relativeTargetPath === ".." ||
    relativeTargetPath.startsWith(`..${sep}`) ||
    isAbsolute(relativeTargetPath)
  ) {
    return null;
  }

  return targetPath.replaceAll("\\", "/");
}

export async function assertDocumentationLinks(repositoryRoot: string): Promise<void> {
  const markdownPaths = await collectDocumentationMarkdownPaths(repositoryRoot);
  const failures: string[] = [];

  for (const sourcePath of markdownPaths) {
    const source = await readFile(sourcePath, "utf8");
    const originPath = relative(repositoryRoot, sourcePath).replaceAll("\\", "/");

    for (const href of extractLocalMarkdownLinks(source)) {
      const targetPath = resolveLocalMarkdownLink(originPath, href, repositoryRoot);

      if (targetPath === null || !(await targetExists(targetPath))) {
        failures.push(`${originPath} -> ${href}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Documentation link verification failed:\n${failures.sort().join("\n")}`);
  }
}

async function collectDocumentationMarkdownPaths(repositoryRoot: string): Promise<string[]> {
  const paths: string[] = [];
  const readmePath = join(repositoryRoot, "README.md");
  const docsPath = join(repositoryRoot, "docs");

  if ((await statIfPresent(readmePath))?.isFile()) paths.push(readmePath);
  if ((await statIfPresent(docsPath))?.isDirectory()) {
    paths.push(...(await collectMarkdownPaths(docsPath)));
  }

  return paths;
}

async function collectMarkdownPaths(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      paths.push(...(await collectMarkdownPaths(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      paths.push(entryPath);
    }
  }

  return paths;
}

async function targetExists(targetPath: string): Promise<boolean> {
  return (await statIfPresent(targetPath)) !== null;
}

async function statIfPresent(path: string) {
  try {
    return await stat(path);
  } catch (error: unknown) {
    if (isMissingPathError(error)) return null;
    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function withoutMarkdownCode(source: string): string {
  return withoutFencedCode(source).replace(/`[^`]*`/g, "");
}

function withoutFencedCode(source: string): string {
  let activeFence: { character: "`" | "~"; length: number } | null = null;

  return source
    .split(/\r?\n/)
    .filter((line) => {
      const fenceMatch = /^[ \t]*(`{3,}|~{3,})/.exec(line);

      if (activeFence === null) {
        if (fenceMatch === null) return true;
        const fence = fenceMatch[1] ?? "";
        activeFence = {
          character: fence.startsWith("`") ? "`" : "~",
          length: fence.length,
        };
        return false;
      }

      if (
        fenceMatch !== null &&
        (fenceMatch[1] ?? "").startsWith(activeFence.character.repeat(activeFence.length))
      ) {
        activeFence = null;
      }

      return false;
    })
    .join("\n");
}

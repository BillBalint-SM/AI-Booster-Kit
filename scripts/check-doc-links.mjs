import { access, readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const fixedDocuments = [
  "README.md",
  "PRODUCT.md",
  "STATUS.md",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/flow.md",
  "docs/plugin.md",
  "plugins/ai-booster-kit/README.md",
];
const documents = [
  ...fixedDocuments,
  ...await skillDocuments("plugins/ai-booster-kit/skills"),
  ...await skillDocuments("plugins/ai-booster-kit/claude-skills"),
];
const failures = [];

for (const document of documents) {
  const sourcePath = resolve(root, document);
  let markdown;
  try {
    markdown = await readFile(sourcePath, "utf8");
  } catch {
    failures.push(`${document}: document is missing`);
    continue;
  }

  for (const link of localLinks(markdown)) {
    const localPath = decodeURIComponent(link.split("#", 1)[0] ?? "");
    if (localPath.length === 0) continue;
    const target = resolve(dirname(sourcePath), localPath);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      failures.push(`${document}: link leaves repository: ${link}`);
      continue;
    }
    try {
      await access(target);
    } catch {
      failures.push(`${document}: missing ${relative(root, target)}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Documentation link check failed:\n${failures.join("\n")}`);
}

process.stdout.write(`DOC_LINKS=READY files=${documents.length}\n`);

async function skillDocuments(directory) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${directory}/${entry.name}/SKILL.md`)
    .sort();
}

function localLinks(markdown) {
  const links = [];
  let fence = null;

  for (const line of markdown.split(/\r?\n/u)) {
    const marker = /^\s*([`~]{3,})/u.exec(line)?.[1] ?? null;
    if (marker !== null) {
      if (fence === null) {
        fence = { character: marker[0], length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) continue;

    for (const match of line.matchAll(/!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^)]*)?\)/gu)) {
      const target = match[1];
      if (target === undefined || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/iu.test(target) || target.startsWith("//")) {
        continue;
      }
      links.push(target);
    }
  }

  return links;
}

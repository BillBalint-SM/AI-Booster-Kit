import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = resolve(repositoryRoot, "plugins/ai-booster-kit");
const skillIds = [
  "ai-booster-kit",
  "booster-plan",
  "booster-team-align",
  "booster-implement",
  "booster-test",
  "booster-review",
  "booster-handoff",
];
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const unexpected = args.filter((value) => value !== "--check");

if (unexpected.length > 0) {
  process.stderr.write("Usage: node scripts/package-booster-plugin.mjs [--check]\n");
  process.exitCode = 4;
} else {
  const files = await expectedFiles();
  const stale = [];

  for (const file of files) {
    let actual = null;
    try {
      actual = await readFile(file.destination, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    if (actual !== null && normalize(actual) === normalize(file.content)) continue;
    stale.push(file.label);
    if (!checkOnly) {
      await mkdir(dirname(file.destination), { recursive: true });
      await writeFile(file.destination, file.content, "utf8");
    }
  }

  if (checkOnly && stale.length > 0) {
    process.stdout.write(`${JSON.stringify({ status: "NOT_READY", stale })}\n`);
    process.exitCode = 2;
  } else {
    const updated = stale.length > 0 ? ` updated=${stale.length}` : "";
    process.stdout.write(`BOOSTER_PACKAGE=READY files=${files.length}${updated}\n`);
  }
}

async function expectedFiles() {
  const files = [await copiedFile("LICENSE", "LICENSE")];
  for (const skillId of skillIds) {
    const source = await readFile(
      resolve(pluginRoot, "skills", skillId, "SKILL.md"),
      "utf8",
    );
    files.push({
      label: `claude-skills/${skillId}/SKILL.md`,
      destination: resolve(pluginRoot, "claude-skills", skillId, "SKILL.md"),
      content: adaptClaudeSkill(source),
    });
  }
  return files;
}

async function copiedFile(sourceRelative, destinationRelative) {
  return {
    label: destinationRelative,
    destination: resolve(pluginRoot, destinationRelative),
    content: await readFile(resolve(repositoryRoot, sourceRelative), "utf8"),
  };
}

function adaptClaudeSkill(source) {
  let adapted = addClaudeFrontmatter(source);
  for (const skillId of skillIds) {
    adapted = adapted.replaceAll(`$${skillId}`, `/ai-booster-kit:${skillId}`);
  }
  return adapted;
}

function addClaudeFrontmatter(source) {
  if (/^disable-model-invocation:/mu.test(source)) return source;
  const closing = /\r?\n---\r?\n/u.exec(source);
  if (closing?.index === undefined) {
    throw new Error("Skill source is missing closing frontmatter");
  }
  const lineEnding = closing[0].startsWith("\r\n") ? "\r\n" : "\n";
  return `${source.slice(0, closing.index)}${lineEnding}disable-model-invocation: true${source.slice(closing.index)}`;
}

function normalize(source) {
  return source.replaceAll("\r\n", "\n");
}

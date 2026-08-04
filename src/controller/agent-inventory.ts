import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

export type AgentSourceKind = "CODEX_GLOBAL_TOML";

export interface AgentDefinition {
  agentId: string;
  displayName: string;
  description: string;
  sourcePath: string;
  sourceSha256: string;
}

export interface AgentInventory {
  sourceDirectory: string;
  sourceKind: AgentSourceKind;
  agentCount: number;
  agents: readonly AgentDefinition[];
}

export class AgentInventoryError extends Error {
  public constructor(sourcePath: string, message: string) {
    super(`agent inventory rejected: ${sourcePath} ${message}.`);
    this.name = "AgentInventoryError";
  }
}

export async function loadAgentInventory(sourceDirectory: string): Promise<AgentInventory> {
  let entries;
  try {
    entries = await readdir(sourceDirectory, { withFileTypes: true });
  } catch {
    throw new AgentInventoryError(sourceDirectory, "could not read the source directory");
  }

  const sourceFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".toml")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  if (sourceFiles.length === 0) throw new AgentInventoryError(sourceDirectory, "contains no .toml Agent definitions");

  const agents: AgentDefinition[] = [];
  const agentIds = new Set<string>();
  const displayNames = new Set<string>();
  for (const fileName of sourceFiles) {
    const sourcePath = join(sourceDirectory, fileName);
    let source: string;
    try {
      source = await readFile(sourcePath, "utf8");
    } catch {
      throw new AgentInventoryError(sourcePath, "could not read the Agent definition");
    }
    const sourceSha256 = createHash("sha256").update(source, "utf8").digest("hex");
    const agent = parseAgentDefinition(source, sourcePath, sourceSha256);
    if (agentIds.has(agent.agentId)) throw new AgentInventoryError(sourcePath, `duplicates Agent ID ${agent.agentId}`);
    const displayNameKey = agent.displayName.toLocaleLowerCase();
    if (displayNames.has(displayNameKey)) throw new AgentInventoryError(sourcePath, `duplicates display name ${agent.displayName}`);
    agentIds.add(agent.agentId);
    displayNames.add(displayNameKey);
    agents.push(agent);
  }

  return {
    sourceDirectory,
    sourceKind: "CODEX_GLOBAL_TOML",
    agentCount: agents.length,
    agents,
  };
}

export function parseAgentDefinition(source: string, sourcePath: string, sourceSha256: string): AgentDefinition {
  const extension = extname(sourcePath).toLowerCase();
  if (extension !== ".toml") throw new AgentInventoryError(sourcePath, "must use the .toml extension");
  if (!/^[0-9a-f]{64}$/.test(sourceSha256)) throw new AgentInventoryError(sourcePath, "must provide a canonical SHA-256 hash");

  const displayName = parseTomlString(source, "name", sourcePath);
  const description = parseTomlString(source, "description", sourcePath);
  const agentId = normalizeAgentId(basename(sourcePath, extension), sourcePath);
  return { agentId, displayName, description, sourcePath, sourceSha256 };
}

function parseTomlString(source: string, key: "name" | "description", sourcePath: string): string {
  const match = new RegExp(`^${key}\\s*=\\s*("(?:\\\\.|[^"\\\\])*")\\s*$`, "m").exec(source);
  if (match?.[1] === undefined) throw new AgentInventoryError(sourcePath, `requires a valid ${key} metadata assignment`);
  let value: unknown;
  try {
    value = JSON.parse(match[1]) as unknown;
  } catch {
    throw new AgentInventoryError(sourcePath, `contains invalid ${key} metadata`);
  }
  if (typeof value !== "string" || value.trim().length === 0) throw new AgentInventoryError(sourcePath, `${key} must be a non-empty string`);
  return value;
}

function normalizeAgentId(value: string, sourcePath: string): string {
  const normalized = value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (normalized.length === 0) throw new AgentInventoryError(sourcePath, "requires a non-empty filename-derived Agent ID");
  return normalized;
}

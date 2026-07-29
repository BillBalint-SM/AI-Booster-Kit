import { readFile } from "node:fs/promises";

import { parseDocument } from "yaml";

import { ContractError } from "./errors.js";

export type AgentHost = "codex" | "claude-code" | "cursor";

export type CapabilityState =
  | "supported"
  | "supported_with_limits"
  | "unsupported"
  | "unknown"
  | "requires_approval";

export interface CapabilityDeclaration {
  name: string;
  state: CapabilityState;
  limitation: string;
}

export interface CapabilityReport extends CapabilityDeclaration {
  targetHost: AgentHost;
}

export interface ContractDocument {
  contractId: string;
  contractVersion: string;
  sourceRevision: string;
  metadata: Record<string, string | string[]>;
  body: string;
  capabilities: CapabilityDeclaration[];
}

export interface ValidationSummary {
  valid: boolean;
  sourcePath: string;
  contractId: string;
  canonicalVocabulary: string[];
  errors: string[];
}

export interface NativeAdapterProjection {
  sourceContractRevision: string;
  targetHost: AgentHost;
  generatedAt: string;
  content: string;
  capabilities: CapabilityReport[];
}

const allowedMetadataKeys = new Set([
  "contractId",
  "contractVersion",
  "sourceRevision",
  "canonicalVocabulary",
  "capabilities",
]);
const capabilityStates = new Set<CapabilityState>([
  "supported",
  "supported_with_limits",
  "unsupported",
  "unknown",
  "requires_approval",
]);
const executableCapabilityPattern = /\b(?:command|executable|hook|mcp|plugin|script|skill)\b/i;
const allowedCapabilityKeys = new Set(["name", "state", "limitation"]);
const requiredVocabulary = [
  "milestone",
  "epic",
  "workItem",
  "boardStatus",
  "planningState",
  "executionSet",
  "attentionState",
  "syncState",
  "evidenceRefs",
];
export const canonicalBoardStatuses = [
  "To Do",
  "In Progress",
  "Review",
  "Ready for Deploy",
  "Ready for Test",
  "Testing",
  "Done",
];
const canonicalStopProtocol =
  "Stop before any external action when target identity, authority, capability, or evidence is unknown, ambiguous, unsupported, or stale. Preserve local evidence and request an explicit, bounded decision instead of enabling execution.";

export interface ContractSemantics {
  lifecycle: string[];
  stopProtocol: string;
}

export function parseMarkdownContract(
  text: string,
  sourcePath: string,
): ContractDocument {
  const frontmatter = extractFrontmatter(text, sourcePath);
  rejectAdditionalFrontmatter(frontmatter.body, sourcePath);
  rejectExecutableMarkdown(frontmatter.body, sourcePath);

  const document = parseDocument(frontmatter.yaml, { uniqueKeys: true });

  if (document.errors.length > 0) {
    throw new ContractError(
      sourcePath,
      "frontmatter",
      "contains invalid YAML metadata.",
    );
  }

  const metadata = document.toJS();
  if (!isRecord(metadata)) {
    throw new ContractError(sourcePath, "frontmatter", "must be a mapping.");
  }

  rejectUnknownMetadata(metadata, sourcePath);

  const contractId = requiredString(metadata, "contractId", sourcePath);
  const contractVersion = requiredString(metadata, "contractVersion", sourcePath);
  const sourceRevision = requiredString(metadata, "sourceRevision", sourcePath);
  const canonicalVocabulary = requiredStringArray(
    metadata,
    "canonicalVocabulary",
    sourcePath,
  );
  const capabilities = parseCapabilities(metadata.capabilities, sourcePath);

  const contract = {
    contractId,
    contractVersion,
    sourceRevision,
    metadata: {
      contractId,
      contractVersion,
      sourceRevision,
      canonicalVocabulary,
    },
    body: frontmatter.body,
    capabilities,
  };

  validateContractDocument(contract, sourcePath);
  return contract;
}

export async function validateContractPath(
  sourcePath: string,
): Promise<ValidationSummary> {
  try {
    const contract = parseMarkdownContract(await readFile(sourcePath, "utf8"), sourcePath);
    validateContractDocument(contract, sourcePath);

    return {
      valid: true,
      sourcePath,
      contractId: contract.contractId,
      canonicalVocabulary: canonicalVocabulary(contract, sourcePath),
      errors: [],
    };
  } catch (error: unknown) {
    if (error instanceof ContractError) {
      return {
        valid: false,
        sourcePath,
        contractId: "",
        canonicalVocabulary: [],
        errors: [error.message],
      };
    }

    throw error;
  }
}

export function canonicalVocabulary(
  contract: ContractDocument,
  sourcePath: string,
): string[] {
  const vocabulary = contract.metadata.canonicalVocabulary;

  if (!Array.isArray(vocabulary)) {
    throw new ContractError(
      sourcePath,
      "frontmatter.canonicalVocabulary",
      "must be a list of strings.",
    );
  }

  return vocabulary;
}

export function validateContractDocument(
  contract: ContractDocument,
  sourcePath: string,
): ContractSemantics {
  if (typeof contract.contractId !== "string" || contract.contractId.trim() === "") {
    throw new ContractError(sourcePath, "contractId", "must be a non-empty string.");
  }

  if (typeof contract.contractVersion !== "string" || contract.contractVersion.trim() === "") {
    throw new ContractError(sourcePath, "contractVersion", "must be a non-empty string.");
  }

  if (typeof contract.sourceRevision !== "string" || contract.sourceRevision.trim() === "") {
    throw new ContractError(sourcePath, "sourceRevision", "must be a non-empty string.");
  }

  const vocabulary = canonicalVocabulary(contract, sourcePath);
  for (const term of requiredVocabulary) {
    if (!vocabulary.includes(term)) {
      throw new ContractError(
        sourcePath,
        "frontmatter.canonicalVocabulary",
        `must include canonical term '${term}'.`,
      );
    }
  }

  validateCapabilityDeclarations(contract.capabilities, sourcePath);
  return parseContractSemantics(contract.body, sourcePath);
}

function extractFrontmatter(text: string, sourcePath: string): {
  yaml: string;
  body: string;
} {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);

  if (match === null || match[1] === undefined) {
    throw new ContractError(
      sourcePath,
      "frontmatter",
      "must start with a closing '---' frontmatter block.",
    );
  }

  return { yaml: match[1], body: text.slice(match[0].length) };
}

function rejectAdditionalFrontmatter(body: string, sourcePath: string): void {
  if (/(?:^|\r?\n)---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(body)) {
    throw new ContractError(
      sourcePath,
      "frontmatter",
      "must not contain multiple frontmatter blocks.",
    );
  }
}

function rejectExecutableMarkdown(body: string, sourcePath: string): void {
  const capabilitiesSection = /(?:^|\n)## Capabilities\r?\n([\s\S]*?)(?=\n## |$)/i.exec(body);

  if (
    capabilitiesSection?.[1] !== undefined &&
    executableCapabilityPattern.test(capabilitiesSection[1])
  ) {
    throw new ContractError(
      sourcePath,
      "Markdown section 'Capabilities'",
      "must not request executable capabilities.",
    );
  }
}

function rejectUnknownMetadata(
  metadata: Record<string, unknown>,
  sourcePath: string,
): void {
  for (const key of Object.keys(metadata)) {
    if (!allowedMetadataKeys.has(key)) {
      throw new ContractError(
        sourcePath,
        `frontmatter.${key}`,
        "is not an allowed metadata key.",
      );
    }
  }
}

function requiredString(
  metadata: Record<string, unknown>,
  key: string,
  sourcePath: string,
): string {
  const value = metadata[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ContractError(
      sourcePath,
      `frontmatter.${key}`,
      "must be a non-empty string.",
    );
  }

  return value;
}

function requiredStringArray(
  metadata: Record<string, unknown>,
  key: string,
  sourcePath: string,
): string[] {
  const value = metadata[key];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw new ContractError(
      sourcePath,
      `frontmatter.${key}`,
      "must be a list of non-empty strings.",
    );
  }

  return value;
}

function parseCapabilities(
  value: unknown,
  sourcePath: string,
): CapabilityDeclaration[] {
  return validateCapabilityDeclarations(value ?? [], sourcePath);
}

function validateCapabilityDeclarations(
  value: unknown,
  sourcePath: string,
): CapabilityDeclaration[] {
  if (!Array.isArray(value)) {
    throw new ContractError(sourcePath, "frontmatter.capabilities", "must be a list of capability declarations.");
  }

  const names = new Set<string>();
  return value.map((capability, index) => {
    const location = `frontmatter.capabilities[${index}]`;

    if (!isRecord(capability)) {
      throw new ContractError(sourcePath, location, "must be a mapping.");
    }

    for (const [key, metadata] of Object.entries(capability)) {
      if (!allowedCapabilityKeys.has(key)) {
        throw new ContractError(sourcePath, `${location}.${key}`, "is not an allowed capability metadata key.");
      }

      if (key !== "name" && typeof metadata === "string" && executableCapabilityPattern.test(metadata)) {
        throw new ContractError(sourcePath, `${location}.${key}`, "must not declare executable capability content.");
      }
    }

    const name = requiredStringAt(capability, "name", sourcePath, `${location}.name`);
    const state = requiredStringAt(capability, "state", sourcePath, `${location}.state`);
    const limitation = requiredStringAt(capability, "limitation", sourcePath, `${location}.limitation`);

    if (!capabilityStates.has(state as CapabilityState)) {
      throw new ContractError(
        sourcePath,
        `${location}.state`,
        "must be a declared capability state.",
      );
    }

    const normalizedName = name.toLocaleLowerCase();
    if (names.has(normalizedName)) {
      throw new ContractError(sourcePath, `${location}.name`, "must not duplicate another capability name.");
    }
    names.add(normalizedName);

    return { name, state: state as CapabilityState, limitation };
  });
}

function requiredStringAt(
  metadata: Record<string, unknown>,
  key: string,
  sourcePath: string,
  location: string,
): string {
  const value = metadata[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ContractError(sourcePath, location, "must be a non-empty string.");
  }

  return value;
}

function parseContractSemantics(body: string, sourcePath: string): ContractSemantics {
  const lifecycle = sectionContent(body, "Lifecycle", sourcePath)
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      const match = new RegExp(`^${index + 1}\\. (.+)$`).exec(line.trim());
      return match?.[1] ?? "";
    });

  if (lifecycle.length !== canonicalBoardStatuses.length || lifecycle.some((status, index) => status !== canonicalBoardStatuses[index])) {
    throw new ContractError(sourcePath, "Markdown section 'Lifecycle'", "must define the seven canonical Board statuses in order.");
  }

  const stopProtocol = sectionContent(body, "Stop protocol", sourcePath);
  if (normalizeWhitespace(stopProtocol) !== canonicalStopProtocol) {
    throw new ContractError(sourcePath, "Markdown section 'Stop protocol'", "must define the canonical stop protocol.");
  }

  return { lifecycle, stopProtocol };
}

function sectionContent(body: string, heading: string, sourcePath: string): string {
  const expression = new RegExp(`(?:^|\\n)## ${heading}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = expression.exec(body);

  if (match?.[1] === undefined || match[1].trim() === "") {
    throw new ContractError(sourcePath, `Markdown section '${heading}'`, "is required.");
  }

  return match[1].trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

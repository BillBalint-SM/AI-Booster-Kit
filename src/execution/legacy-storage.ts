import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { renderFinalExecutionHandoffMarkdown, validateFinalExecutionHandoff } from "./finalize.js";
import { validateExecutionGraph } from "./graph.js";
import { parseExecutionResult, validateResultForNode } from "./handoff.js";
import { canonicalExecutionJson, executionDigest } from "./identity.js";
import {
  assertLedgerMatchesGraph,
  executionCheckpointMatches,
  parseExecutionCheckpoint,
  parseExecutionEvent,
  replayExecutionLedger,
} from "./ledger.js";
import { ExecutionContractError } from "./types.js";
import type {
  ExecutionArtifactRef,
  ExecutionEvent,
  ExecutionRunView,
  FinalExecutionHandoff,
} from "./types.js";
import { parseExecutionEnvelope } from "./validation.js";

export interface LegacySourceFileDigest {
  relativePath: string;
  sha256: string;
  byteLength: number;
}

export interface LegacySourceArtifact {
  artifactId: string;
  nodeId: string | null;
  relativePath: string;
  mediaType: string;
  body: Buffer;
  sourceEventSequence: number;
}

export interface LegacyLoadedExecutionRun extends ExecutionRunView {
  runDirectory: string;
  sourceIdentitySha256: string;
  sourceFiles: readonly LegacySourceFileDigest[];
  sourceArtifacts: readonly LegacySourceArtifact[];
}

const legacyInvalid = "LEGACY_IMPORT_INVALID";
const runFiles = {
  envelope: "envelope.json",
  graph: "graph.json",
  events: "events.jsonl",
  checkpoint: "checkpoint.json",
  evidenceIndex: "evidence-index.json",
  artifacts: "artifacts",
  manifest: "artifacts/manifest.json",
} as const;

export async function readLegacyExecutionRun(runDirectory: string): Promise<LegacyLoadedExecutionRun> {
  const directory = await legacyRunDirectory(runDirectory);
  await assertExactRootEntries(directory);
  const envelope = parseExecutionEnvelope(await readCanonicalJsonFile(childPath(directory, runFiles.envelope)));
  const graph = validateExecutionGraph(await readCanonicalJsonFile(childPath(directory, runFiles.graph)), envelope);
  const events = await readCanonicalLedger(childPath(directory, runFiles.events));
  const checkpoint = parseExecutionCheckpoint(await readCanonicalJsonFile(childPath(directory, runFiles.checkpoint)));
  const expectedCheckpoint = replayExecutionLedger(events, envelope, graph);
  assertLedgerMatchesGraph(events, graph);
  if (!executionCheckpointMatches(checkpoint, expectedCheckpoint)) invalid("legacy execution checkpoint does not match its ledger");
  const evidenceIndex = await readCanonicalJsonFile(childPath(directory, runFiles.evidenceIndex));
  if (!Array.isArray(evidenceIndex)) invalid("legacy execution evidence index is invalid");

  const manifest = await readManifest(directory);
  const acceptedResults = await readAcceptedResults(manifest.artifacts, envelope, graph);
  const evidenceRefs = acceptedResults.flatMap((result) => result.evidenceRefs);
  if (new Set(evidenceRefs.map((evidence) => evidence.evidenceId)).size !== evidenceRefs.length) {
    invalid("legacy execution evidence identifiers are ambiguous");
  }
  const artifactRefs = manifest.artifacts.map((artifact) => artifact.reference);
  const preliminary: ExecutionRunView = {
    envelope,
    graph,
    events,
    checkpoint,
    artifacts: artifactRefs,
    evidenceRefs,
    acceptedResults,
    finalHandoff: null,
  };
  const finalHandoff = readFinalHandoff(manifest.artifacts, preliminary);
  const sourceFiles = await sourceFileDigests(directory, manifest.artifacts);
  return {
    ...preliminary,
    finalHandoff,
    runDirectory: directory,
    sourceIdentitySha256: sourceIdentity(directory),
    sourceFiles,
    sourceArtifacts: manifest.artifacts.map((artifact) => ({
      artifactId: artifact.reference.artifactId,
      nodeId: artifact.reference.nodeId,
      relativePath: artifact.relativePath,
      mediaType: artifact.mediaType,
      body: Buffer.from(artifact.body),
      sourceEventSequence: artifactSourceSequence(artifact.reference, events),
    })),
  };
}

interface ReadArtifact {
  reference: ExecutionArtifactRef;
  relativePath: string;
  mediaType: string;
  body: Buffer;
}

async function readManifest(directory: string): Promise<{ artifacts: readonly ReadArtifact[] }> {
  const value = await readCanonicalJsonFile(childPath(directory, runFiles.manifest));
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    invalid("legacy execution artifact manifest is invalid");
  }
  const record = value as Record<string, unknown>;
  if (
    Reflect.ownKeys(record).length !== 2
    || record.manifestVersion !== "1.0"
    || !Array.isArray(record.artifacts)
  ) {
    invalid("legacy execution artifact manifest fields are invalid");
  }
  const references = record.artifacts.map(parseArtifactReference);
  if (new Set(references.map((artifact) => artifact.artifactId)).size !== references.length) {
    invalid("legacy execution artifact identifiers are not unique");
  }
  const artifacts: ReadArtifact[] = [];
  for (const reference of references) {
    const relativePath = artifactRelativePath(reference.artifactId);
    const body = await readRegularFile(childPath(directory, relativePath));
    if (createHash("sha256").update(body).digest("hex") !== reference.sha256) {
      invalid("legacy execution artifact hash differs from its manifest");
    }
    artifacts.push({ reference, relativePath, mediaType: artifactMediaType(reference.artifactId), body });
  }
  const entries = await readdir(childPath(directory, runFiles.artifacts), { withFileTypes: true });
  const expected = new Set(["manifest.json", ...artifacts.map((artifact) => artifact.relativePath.slice("artifacts/".length))]);
  if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink() || !expected.has(entry.name)) || entries.length !== expected.size) {
    invalid("legacy execution artifact directory contains an untracked or unsafe entry");
  }
  return { artifacts };
}

async function readAcceptedResults(
  artifacts: readonly ReadArtifact[],
  envelope: ExecutionRunView["envelope"],
  graph: ExecutionRunView["graph"],
): Promise<ExecutionRunView["acceptedResults"]> {
  return artifacts.flatMap((artifact) => {
    if (!artifact.reference.artifactId.startsWith("task-")) return [];
    const parsed = parseCanonicalJson(artifact.body.toString("utf8"), "legacy execution result artifact");
    const result = parseExecutionResult(parsed, envelope.budget.maxResultBytes);
    return [validateResultForNode(result, envelope, graph, result.nodeId)];
  });
}

function readFinalHandoff(
  artifacts: readonly ReadArtifact[],
  preliminary: ExecutionRunView,
): FinalExecutionHandoff | null {
  const json = artifacts.find((artifact) => artifact.reference.artifactId === "final-handoff-json");
  const markdown = artifacts.find((artifact) => artifact.reference.artifactId === "final-handoff-markdown");
  if (json === undefined && markdown === undefined) return null;
  if (json === undefined || markdown === undefined) invalid("legacy execution final handoff artifact pair is incomplete");
  const handoff = validateFinalExecutionHandoff(
    parseCanonicalJson(json.body.toString("utf8"), "legacy execution final handoff"),
    preliminary,
  );
  if (renderFinalExecutionHandoffMarkdown(handoff) !== markdown.body.toString("utf8")) {
    invalid("legacy execution final handoff Markdown differs from canonical JSON");
  }
  return handoff;
}

function artifactSourceSequence(reference: ExecutionArtifactRef, events: readonly ExecutionEvent[]): number {
  if (reference.nodeId !== null) {
    const event = [...events].reverse().find((candidate) => candidate.nodeId === reference.nodeId && ["NODE_RESULT_ACCEPTED", "NODE_STOPPED", "NODE_UNKNOWN"].includes(candidate.eventType));
    if (event === undefined) invalid("legacy execution result artifact has no accepting ledger event");
    return event.sequence;
  }
  const terminal = [...events].reverse().find((candidate) => ["RUN_FINALIZED", "RUN_STOPPED", "RUN_UNKNOWN"].includes(candidate.eventType));
  return terminal?.sequence ?? requiredLastEvent(events).sequence;
}

async function sourceFileDigests(directory: string, artifacts: readonly ReadArtifact[]): Promise<readonly LegacySourceFileDigest[]> {
  const paths = [
    runFiles.envelope,
    runFiles.graph,
    runFiles.events,
    runFiles.checkpoint,
    runFiles.evidenceIndex,
    runFiles.manifest,
    ...artifacts.map((artifact) => artifact.relativePath),
  ].sort();
  const entries: LegacySourceFileDigest[] = [];
  for (const path of paths) {
    const body = await readRegularFile(childPath(directory, path));
    entries.push({ relativePath: path.replaceAll("\\", "/"), sha256: createHash("sha256").update(body).digest("hex"), byteLength: body.byteLength });
  }
  return entries;
}

async function assertExactRootEntries(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  const expected = new Set<string>([runFiles.envelope, runFiles.graph, runFiles.events, runFiles.checkpoint, runFiles.evidenceIndex, runFiles.artifacts]);
  if (
    entries.length !== expected.size
    || entries.some((entry) => !expected.has(entry.name) || entry.isSymbolicLink() || (entry.name === runFiles.artifacts ? !entry.isDirectory() : !entry.isFile()))
  ) {
    invalid("legacy execution directory contains an untracked or unsafe entry");
  }
}

async function legacyRunDirectory(runDirectory: string): Promise<string> {
  if (!isAbsolute(runDirectory)) invalid("legacy execution directory must be absolute");
  try {
    const details = await lstat(runDirectory);
    if (!details.isDirectory() || details.isSymbolicLink()) invalid("legacy execution source must be a regular directory");
    return await realpath(runDirectory);
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    invalid("legacy execution directory is unavailable");
  }
}

function childPath(root: string, child: string): string {
  const candidate = resolve(root, child);
  const pathRelative = relative(root, candidate);
  if (pathRelative === "" || pathRelative === ".." || pathRelative.startsWith("../") || pathRelative.startsWith("..\\") || isAbsolute(pathRelative)) {
    invalid("legacy execution source path escapes its root");
  }
  return candidate;
}

async function readCanonicalJsonFile(path: string): Promise<unknown> {
  const body = await readRegularFile(path);
  const text = body.toString("utf8");
  const parsed = parseCanonicalJson(text.endsWith("\n") ? text.slice(0, -1) : text, "legacy execution JSON");
  if (`${canonicalExecutionJson(parsed)}\n` !== text) invalid("legacy execution JSON document is not canonical");
  return parsed;
}

async function readCanonicalLedger(path: string): Promise<readonly ExecutionEvent[]> {
  const body = await readRegularFile(path);
  const text = body.toString("utf8");
  if (!text.endsWith("\n")) invalid("legacy execution ledger is not a canonical JSONL document");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length === 0 || lines.some((line) => line.length === 0)) invalid("legacy execution ledger is empty or malformed");
  return lines.map((line) => parseExecutionEvent(parseCanonicalJson(line, "legacy execution event")));
}

async function readRegularFile(path: string): Promise<Buffer> {
  try {
    const details = await lstat(path);
    if (!details.isFile() || details.isSymbolicLink()) invalid("legacy execution entry must be a regular file");
    return await readFile(path);
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    invalid("legacy execution entry is unavailable");
  }
}

function parseCanonicalJson(text: string, label: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text);
    if (canonicalExecutionJson(parsed) !== text) invalid(`${label} is not canonical JSON`);
    return parsed;
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    invalid(`${label} contains malformed JSON`);
  }
}

function parseArtifactReference(value: unknown): ExecutionArtifactRef {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    invalid("legacy execution artifact reference is invalid");
  }
  const record = value as Record<string, unknown>;
  if (
    Reflect.ownKeys(record).length !== 3
    || typeof record.artifactId !== "string"
    || (record.nodeId !== null && typeof record.nodeId !== "string")
    || typeof record.sha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(record.sha256)
  ) {
    invalid("legacy execution artifact reference fields are invalid");
  }
  return { artifactId: record.artifactId, nodeId: record.nodeId, sha256: record.sha256 };
}

function artifactRelativePath(artifactId: string): string {
  if (/^task-[a-z0-9][a-z0-9-]{2,79}-result$/u.test(artifactId)) return `artifacts/${artifactId}.json`;
  if (artifactId === "final-handoff-json") return "artifacts/final-handoff.json";
  if (artifactId === "final-handoff-markdown") return "artifacts/final-handoff.md";
  invalid("legacy execution artifact identity is unsupported");
}

function artifactMediaType(artifactId: string): string {
  if (artifactId.startsWith("task-")) return "application/vnd.ai-booster-kit.execution-result+json";
  if (artifactId === "final-handoff-json") return "application/vnd.ai-booster-kit.execution-final+json";
  if (artifactId === "final-handoff-markdown") return "text/markdown;charset=utf-8";
  invalid("legacy execution artifact media type is unsupported");
}

function requiredLastEvent(events: readonly ExecutionEvent[]): ExecutionEvent {
  const event = events.at(-1);
  if (event === undefined) invalid("legacy execution ledger is empty");
  return event;
}

function sourceIdentity(directory: string): string {
  const normalized = process.platform === "win32" ? directory.replaceAll("/", "\\").toLowerCase() : directory;
  return executionDigest({ identityVersion: "1.0", platform: process.platform, normalizedDirectory: normalized });
}

function invalid(message: string): never {
  throw new ExecutionContractError(legacyInvalid, message);
}

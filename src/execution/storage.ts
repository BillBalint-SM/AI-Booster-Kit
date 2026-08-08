import { createHash, randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { canonicalExecutionJson } from "./identity.js";
import {
  assertLedgerMatchesGraph,
  createExecutionEvent,
  executionCheckpointMatches,
  parseExecutionCheckpoint,
  parseExecutionEvent,
  replayExecutionLedger,
} from "./ledger.js";
import { validateExecutionGraph } from "./graph.js";
import { parseExecutionResult, validateResultForNode } from "./handoff.js";
import { renderFinalExecutionHandoffMarkdown, validateFinalExecutionHandoff } from "./finalize.js";
import { parseExecutionEnvelope } from "./validation.js";
import { ExecutionContractError } from "./types.js";
import type {
  ExecutionArtifactRef,
  ExecutionEnvelope,
  ExecutionEvent,
  ExecutionGraph,
  ExecutionResultEnvelope,
  FinalExecutionHandoff,
  LoadedExecutionRun,
  PersonalExecutionRun,
} from "./types.js";

const rootCode = "EXECUTION_PERSONAL_ROOT_INVALID";
const targetCode = "EXECUTION_RUN_TARGET_CONFLICT";
const escapeCode = "EXECUTION_STORAGE_ESCAPE";
const symlinkCode = "EXECUTION_STORAGE_SYMLINK";
const ambiguousCode = "EXECUTION_STORAGE_AMBIGUOUS";
const conflictCode = "EXECUTION_STORAGE_CONFLICT";
const ledgerCode = "EXECUTION_LEDGER_INVALID";
const runFiles = {
  envelope: "envelope.json",
  graph: "graph.json",
  events: "events.jsonl",
  checkpoint: "checkpoint.json",
  evidenceIndex: "evidence-index.json",
  artifacts: "artifacts",
  manifest: "artifacts/manifest.json",
} as const;

interface RunCore {
  runDirectory: string;
  envelope: ExecutionEnvelope;
  graph: ExecutionGraph;
  events: readonly ExecutionEvent[];
  checkpoint: ReturnType<typeof parseExecutionCheckpoint>;
  artifacts: readonly ExecutionArtifactRef[];
  evidenceRefs: readonly import("./types.js").ExecutionEvidenceRef[];
  acceptedResults: readonly ExecutionResultEnvelope[];
  finalHandoff: FinalExecutionHandoff | null;
}

export async function createPersonalExecutionRun(
  personalRoot: string,
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
  recordedAt: string,
): Promise<PersonalExecutionRun> {
  const root = await personalRootDirectory(personalRoot);
  const validatedEnvelope = parseExecutionEnvelope(envelope);
  if (validatedEnvelope.retention !== "PERSONAL") throw new ExecutionContractError(rootCode, "execution retention does not permit Personal storage");
  const validatedGraph = validateExecutionGraph(graph, validatedEnvelope);
  const runDirectory = childPath(root, validatedEnvelope.runId);
  const stagingDirectory = childPath(root, `.${validatedEnvelope.runId}-${randomUUID()}-creating`);
  const created = createExecutionEvent(
    {
      runId: validatedEnvelope.runId,
      eventType: "RUN_CREATED",
      nodeId: null,
      beforeState: null,
      afterState: "PREPARED",
      graphRevision: validatedGraph.graphRevision,
      evidenceRefs: [],
      taskId: null,
      threadRef: null,
      reasonCode: null,
    },
    1,
    null,
    recordedAt,
  );
  const accepted = createExecutionEvent(
    {
      runId: validatedEnvelope.runId,
      eventType: "GRAPH_ACCEPTED",
      nodeId: null,
      beforeState: "PREPARED",
      afterState: "READY",
      graphRevision: validatedGraph.graphRevision,
      evidenceRefs: [],
      taskId: null,
      threadRef: null,
      reasonCode: null,
    },
    2,
    created.eventHash,
    recordedAt,
  );
  const events = [created, accepted];
  const checkpoint = replayExecutionLedger(events, validatedEnvelope, validatedGraph);

  try {
    await mkdir(stagingDirectory, { recursive: false });
    await mkdir(childPath(stagingDirectory, runFiles.artifacts), { recursive: false });
    await writeNewFile(childPath(stagingDirectory, runFiles.envelope), jsonDocument(validatedEnvelope));
    await writeNewFile(childPath(stagingDirectory, runFiles.graph), jsonDocument(validatedGraph));
    await writeNewFile(childPath(stagingDirectory, runFiles.events), jsonLines(events));
    await writeNewFile(childPath(stagingDirectory, runFiles.checkpoint), jsonDocument(checkpoint));
    await writeNewFile(childPath(stagingDirectory, runFiles.evidenceIndex), jsonDocument([]));
    await writeNewFile(childPath(stagingDirectory, runFiles.manifest), jsonDocument({ manifestVersion: "1.0", artifacts: [] }));
    await rename(stagingDirectory, runDirectory);
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    if (await pathExists(runDirectory)) throw new ExecutionContractError(targetCode, "execution run directory already exists");
    throw error;
  }

  return { runDirectory, checkpoint, lastEventHash: accepted.eventHash };
}

export async function appendRunEvent(runDirectory: string, event: ExecutionEvent): Promise<void> {
  const current = await readRunCore(runDirectory);
  const parsed = parseExecutionEvent(event);
  const lastEvent = current.events.at(-1);
  if (lastEvent === undefined || parsed.sequence !== current.events.length + 1 || parsed.previousEventHash !== lastEvent.eventHash || parsed.runId !== current.envelope.runId) {
    throw new ExecutionContractError(conflictCode, "execution event conflicts with the current ledger head");
  }
  const nextEvents = [...current.events, parsed];
  const nextCheckpoint = replayExecutionLedger(nextEvents, current.envelope, current.graph);
  await assertRegularFile(childPath(current.runDirectory, runFiles.events));
  await appendFile(childPath(current.runDirectory, runFiles.events), `${canonicalExecutionJson(parsed)}\n`, "utf8");
  await writeAtomicFile(childPath(current.runDirectory, runFiles.checkpoint), jsonDocument(nextCheckpoint));
}

export async function saveGraphSnapshot(runDirectory: string, graph: ExecutionGraph): Promise<void> {
  const current = await readRunCore(runDirectory);
  const nextGraph = validateExecutionGraph(graph, current.envelope);
  if (nextGraph.runId !== current.envelope.runId) throw new ExecutionContractError(ledgerCode, "execution graph belongs to another run");
  const nextCheckpoint = replayExecutionLedger(current.events, current.envelope, nextGraph);
  assertLedgerMatchesGraph(current.events, nextGraph);
  await writeAtomicFile(childPath(current.runDirectory, runFiles.graph), jsonDocument(nextGraph));
  await writeAtomicFile(childPath(current.runDirectory, runFiles.checkpoint), jsonDocument(nextCheckpoint));
}

export async function saveExecutionCheckpoint(runDirectory: string, checkpoint: ReturnType<typeof parseExecutionCheckpoint>): Promise<void> {
  const current = await readRunCore(runDirectory);
  const parsed = parseExecutionCheckpoint(checkpoint);
  const expected = replayExecutionLedger(current.events, current.envelope, current.graph);
  if (!executionCheckpointMatches(parsed, expected)) {
    throw new ExecutionContractError(conflictCode, "execution checkpoint conflicts with the current ledger");
  }
  await writeAtomicFile(childPath(current.runDirectory, runFiles.checkpoint), jsonDocument(parsed));
}

export async function saveAcceptedResult(runDirectory: string, result: ExecutionResultEnvelope): Promise<ExecutionArtifactRef> {
  const current = await readRunCore(runDirectory);
  const parsed = parseExecutionResult(result, Number.MAX_SAFE_INTEGER);
  if (parsed.runId !== current.envelope.runId || parsed.envelopeHash !== current.envelope.envelopeHash || parsed.graphRevision !== current.graph.graphRevision) {
    throw new ExecutionContractError(conflictCode, "execution result does not belong to the current run snapshot");
  }
  const artifactId = `task-${parsed.nodeId}-result`;
  const artifactPath = childPath(current.runDirectory, `artifacts/${artifactId}.json`);
  const contents = canonicalExecutionJson(parsed);
  const reference = { artifactId, nodeId: parsed.nodeId, sha256: digestContents(contents) };
  if (current.artifacts.some((artifact) => artifact.artifactId === artifactId)) {
    throw new ExecutionContractError(conflictCode, "execution result artifact already exists");
  }
  try {
    await writeNewFile(artifactPath, contents);
  } catch (error) {
    if (isAlreadyExists(error)) throw new ExecutionContractError(conflictCode, "execution result artifact already exists");
    throw error;
  }
  try {
    await writeArtifactManifest(current.runDirectory, [...current.artifacts, reference]);
  } catch (error) {
    throw new ExecutionContractError(ambiguousCode, "execution result artifact requires manifest review");
  }
  return reference;
}

export async function saveFinalExecutionHandoff(
  runDirectory: string,
  handoff: FinalExecutionHandoff,
  markdown: string,
): Promise<{ canonicalRef: ExecutionArtifactRef; markdownRef: ExecutionArtifactRef }> {
  const current = await loadExecutionRun(runDirectory);
  if (current.finalHandoff !== null) throw new ExecutionContractError(conflictCode, "final execution handoff already exists");
  const accepted = validateFinalExecutionHandoff(handoff, current);
  const expectedMarkdown = renderFinalExecutionHandoffMarkdown(accepted);
  if (markdown !== expectedMarkdown) throw new ExecutionContractError(conflictCode, "final execution handoff Markdown is not deterministic");
  const canonicalRef = { artifactId: "final-handoff-json", nodeId: null, sha256: digestContents(canonicalExecutionJson(accepted)) };
  const markdownRef = { artifactId: "final-handoff-markdown", nodeId: null, sha256: digestContents(markdown) };
  const jsonPath = artifactPath(current.runDirectory, canonicalRef.artifactId);
  const markdownPath = artifactPath(current.runDirectory, markdownRef.artifactId);
  const jsonExists = await pathExists(jsonPath);
  const markdownExists = await pathExists(markdownPath);
  if (jsonExists !== markdownExists) throw new ExecutionContractError(ambiguousCode, "partial final execution handoff requires review");
  if (jsonExists) throw new ExecutionContractError(conflictCode, "final execution handoff files already exist");
  await writeNewFile(jsonPath, canonicalExecutionJson(accepted));
  try {
    await writeNewFile(markdownPath, markdown);
  } catch {
    throw new ExecutionContractError(ambiguousCode, "partial final execution handoff requires review");
  }
  try {
    await writeArtifactManifest(current.runDirectory, [...current.artifacts, canonicalRef, markdownRef]);
  } catch {
    throw new ExecutionContractError(ambiguousCode, "final execution handoff manifest requires review");
  }
  return { canonicalRef, markdownRef };
}

export async function loadExecutionRun(runDirectory: string): Promise<LoadedExecutionRun> {
  const current = await readRunCore(runDirectory);
  const expectedCheckpoint = replayExecutionLedger(current.events, current.envelope, current.graph);
  assertLedgerMatchesGraph(current.events, current.graph);
  if (!executionCheckpointMatches(current.checkpoint, expectedCheckpoint)) {
    throw new ExecutionContractError(ledgerCode, "execution checkpoint does not match its ledger");
  }
  return {
    runDirectory: current.runDirectory,
    envelope: current.envelope,
    graph: current.graph,
    events: current.events,
    checkpoint: current.checkpoint,
    artifacts: current.artifacts,
    evidenceRefs: current.evidenceRefs,
    acceptedResults: current.acceptedResults,
    finalHandoff: current.finalHandoff,
  };
}

async function readRunCore(runDirectory: string): Promise<RunCore> {
  const directory = await executionRunDirectory(runDirectory);
  await assertNoPendingReplacements(directory);
  const envelope = parseExecutionEnvelope(await readJsonFile(childPath(directory, runFiles.envelope)));
  const graph = validateExecutionGraph(await readJsonFile(childPath(directory, runFiles.graph)), envelope);
  const events = await readLedgerFile(childPath(directory, runFiles.events));
  const checkpoint = parseExecutionCheckpoint(await readJsonFile(childPath(directory, runFiles.checkpoint)));
  const artifacts = await readArtifactManifest(directory, childPath(directory, runFiles.manifest));
  const acceptedResults = await readAcceptedResults(directory, artifacts, envelope, graph);
  const evidenceRefs = acceptedResults.flatMap((result) => result.evidenceRefs);
  if (new Set(evidenceRefs.map((evidence) => evidence.evidenceId)).size !== evidenceRefs.length) {
    throw new ExecutionContractError(ambiguousCode, "execution evidence identifiers are ambiguous");
  }
  const preliminary: LoadedExecutionRun = { runDirectory: directory, envelope, graph, events, checkpoint, artifacts, evidenceRefs, acceptedResults, finalHandoff: null };
  const finalHandoff = await readFinalExecutionHandoff(directory, artifacts, preliminary);
  return { runDirectory: directory, envelope, graph, events, checkpoint, artifacts, evidenceRefs, acceptedResults, finalHandoff };
}

async function personalRootDirectory(personalRoot: string): Promise<string> {
  if (!isAbsolute(personalRoot)) throw new ExecutionContractError(rootCode, "Personal storage root must be an absolute path");
  try {
    const details = await lstat(personalRoot);
    if (!details.isDirectory()) throw new ExecutionContractError(rootCode, "Personal storage root must be a directory");
    if (details.isSymbolicLink()) throw new ExecutionContractError(symlinkCode, "Personal storage root cannot be a symbolic link");
    return await realpath(personalRoot);
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError(rootCode, "Personal storage root is unavailable");
  }
}

async function executionRunDirectory(runDirectory: string): Promise<string> {
  if (!isAbsolute(runDirectory)) throw new ExecutionContractError(escapeCode, "execution run directory must be absolute");
  try {
    const details = await lstat(runDirectory);
    if (!details.isDirectory()) throw new ExecutionContractError(ambiguousCode, "execution run directory must be a directory");
    if (details.isSymbolicLink()) throw new ExecutionContractError(symlinkCode, "execution run directory cannot be a symbolic link");
    return await realpath(runDirectory);
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError(ambiguousCode, "execution run directory is unavailable");
  }
}

function childPath(root: string, child: string): string {
  const candidate = resolve(root, child);
  const pathRelative = relative(root, candidate);
  if (pathRelative === "" || pathRelative === ".." || pathRelative.startsWith("../") || pathRelative.startsWith("..\\") || isAbsolute(pathRelative)) {
    throw new ExecutionContractError(escapeCode, "execution storage path escapes its root");
  }
  return candidate;
}

async function writeNewFile(path: string, contents: string): Promise<void> {
  await writeFile(path, contents, { encoding: "utf8", flag: "wx" });
}

async function writeAtomicFile(path: string, contents: string): Promise<void> {
  await assertRegularFile(path);
  const temporary = `${path}.${randomUUID()}.next`;
  await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function readJsonFile(path: string): Promise<unknown> {
  await assertRegularFile(path);
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    throw new ExecutionContractError(ambiguousCode, "execution storage JSON is unreadable");
  }
}

async function readLedgerFile(path: string): Promise<readonly ExecutionEvent[]> {
  await assertRegularFile(path);
  let lines: readonly string[];
  try {
    lines = (await readFile(path, "utf8")).split("\n").filter((line) => line.length > 0);
  } catch {
    throw new ExecutionContractError(ambiguousCode, "execution ledger is unreadable");
  }
  try {
    return lines.map((line) => parseExecutionEvent(JSON.parse(line) as unknown));
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError(ledgerCode, "execution ledger contains malformed JSON");
  }
}

async function readArtifactManifest(runDirectory: string, path: string): Promise<readonly ExecutionArtifactRef[]> {
  const value = await readJsonFile(path);
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ExecutionContractError(ambiguousCode, "execution artifact manifest is invalid");
  }
  const record = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(record);
  if (keys.length !== 2 || !keys.includes("manifestVersion") || !keys.includes("artifacts") || record.manifestVersion !== "1.0" || !Array.isArray(record.artifacts)) {
    throw new ExecutionContractError(ambiguousCode, "execution artifact manifest is invalid");
  }
  const artifacts = record.artifacts.map((artifact) => artifactReference(artifact));
  for (const artifact of artifacts) {
    const contents = await readArtifactContents(runDirectory, artifact);
    if (digestContents(contents) !== artifact.sha256) throw new ExecutionContractError(ambiguousCode, "execution artifact hash does not match its manifest");
  }
  const expectedNames = new Set(["manifest.json", ...artifacts.map((artifact) => artifactPath(runDirectory, artifact.artifactId).split(/[\\/]/).at(-1))]);
  const entries = await readdir(childPath(runDirectory, runFiles.artifacts), { withFileTypes: true });
  if (entries.some((entry) => !entry.isFile() || !expectedNames.has(entry.name))) {
    throw new ExecutionContractError(ambiguousCode, "execution artifact directory has an untracked entry");
  }
  return artifacts;
}

async function readAcceptedResults(
  runDirectory: string,
  artifacts: readonly ExecutionArtifactRef[],
  envelope: ExecutionEnvelope,
  graph: ExecutionGraph,
): Promise<readonly ExecutionResultEnvelope[]> {
  const results: ExecutionResultEnvelope[] = [];
  for (const artifact of artifacts) {
    if (!artifact.artifactId.startsWith("task-")) continue;
    const contents = await readArtifactContents(runDirectory, artifact);
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(contents) as unknown;
    } catch {
      throw new ExecutionContractError(ambiguousCode, "execution result artifact contains malformed JSON");
    }
    const result = parseExecutionResult(parsedValue, envelope.budget.maxResultBytes);
    results.push(validateResultForNode(result, envelope, graph, result.nodeId));
  }
  return results;
}

async function readFinalExecutionHandoff(
  runDirectory: string,
  artifacts: readonly ExecutionArtifactRef[],
  preliminary: LoadedExecutionRun,
): Promise<FinalExecutionHandoff | null> {
  const canonicalRef = artifacts.find((artifact) => artifact.artifactId === "final-handoff-json");
  const markdownRef = artifacts.find((artifact) => artifact.artifactId === "final-handoff-markdown");
  if (canonicalRef === undefined && markdownRef === undefined) return null;
  if (canonicalRef === undefined || markdownRef === undefined) {
    throw new ExecutionContractError(ambiguousCode, "final execution handoff manifest is incomplete");
  }
  const canonicalContents = await readArtifactContents(runDirectory, canonicalRef);
  const markdown = await readArtifactContents(runDirectory, markdownRef);
  let parsed: unknown;
  try {
    parsed = JSON.parse(canonicalContents) as unknown;
  } catch {
    throw new ExecutionContractError(ambiguousCode, "final execution handoff JSON is malformed");
  }
  const handoff = validateFinalExecutionHandoff(parsed, preliminary);
  if (renderFinalExecutionHandoffMarkdown(handoff) !== markdown) {
    throw new ExecutionContractError(ambiguousCode, "final execution handoff Markdown does not match canonical JSON");
  }
  return handoff;
}

async function writeArtifactManifest(runDirectory: string, artifacts: readonly ExecutionArtifactRef[]): Promise<void> {
  const identifiers = new Set<string>();
  if (artifacts.some((artifact) => identifiers.has(artifact.artifactId) || (identifiers.add(artifact.artifactId), false))) {
    throw new ExecutionContractError(conflictCode, "execution artifact manifest contains duplicate identities");
  }
  await writeAtomicFile(childPath(runDirectory, runFiles.manifest), jsonDocument({ manifestVersion: "1.0", artifacts }));
}

async function readArtifactContents(runDirectory: string, artifact: ExecutionArtifactRef): Promise<string> {
  const path = artifactPath(runDirectory, artifact.artifactId);
  await assertRegularFile(path);
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new ExecutionContractError(ambiguousCode, "execution artifact is unreadable");
  }
}

function artifactPath(runDirectory: string, artifactId: string): string {
  if (/^task-[a-z0-9][a-z0-9-]{2,79}-result$/.test(artifactId)) return childPath(runDirectory, `artifacts/${artifactId}.json`);
  if (artifactId === "final-handoff-json") return childPath(runDirectory, "artifacts/final-handoff.json");
  if (artifactId === "final-handoff-markdown") return childPath(runDirectory, "artifacts/final-handoff.md");
  throw new ExecutionContractError(ambiguousCode, "execution artifact identity is unsupported");
}

function artifactReference(value: unknown): ExecutionArtifactRef {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ExecutionContractError(ambiguousCode, "execution artifact reference is invalid");
  }
  const record = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(record);
  if (keys.length !== 3 || !keys.includes("artifactId") || !keys.includes("nodeId") || !keys.includes("sha256") || typeof record.artifactId !== "string" || typeof record.sha256 !== "string" || (record.nodeId !== null && typeof record.nodeId !== "string")) {
    throw new ExecutionContractError(ambiguousCode, "execution artifact reference is invalid");
  }
  return { artifactId: record.artifactId, nodeId: record.nodeId, sha256: record.sha256 };
}

async function assertRegularFile(path: string): Promise<void> {
  try {
    const details = await lstat(path);
    if (details.isSymbolicLink()) throw new ExecutionContractError(symlinkCode, "execution storage cannot follow symbolic links");
    if (!details.isFile()) throw new ExecutionContractError(ambiguousCode, "execution storage entry must be a regular file");
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError(ambiguousCode, "execution storage entry is unavailable");
  }
}

async function assertNoPendingReplacements(runDirectory: string): Promise<void> {
  const rootEntries = await readdir(runDirectory, { withFileTypes: true });
  const artifactEntries = await readdir(childPath(runDirectory, runFiles.artifacts), { withFileTypes: true });
  if ([...rootEntries, ...artifactEntries].some((entry) => entry.name.endsWith(".next"))) {
    throw new ExecutionContractError(ambiguousCode, "execution storage contains an unresolved replacement file");
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function digestContents(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

function jsonDocument(value: unknown): string {
  return `${canonicalExecutionJson(value)}\n`;
}

function jsonLines(events: readonly ExecutionEvent[]): string {
  return `${events.map((event) => canonicalExecutionJson(event)).join("\n")}\n`;
}

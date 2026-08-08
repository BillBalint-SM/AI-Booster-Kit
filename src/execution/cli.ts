import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { operationalReasonForContractError, rejectedExecutionCommand } from "./command-outcome.js";
import { currentCodexHostSessionObservation } from "./binding/codex-host-observer.js";
import { createExecutionHostReceipt, parseExecutionHostReceipt } from "./binding/host-receipt.js";
import { executionBindingPolicy, parseExecutionBindingPolicy } from "./binding/policy.js";
import { assembleExecutionDispatchReadiness } from "./binding/readiness.js";
import { observeExecutionSource } from "./binding/source-observer.js";
import type { HostCapabilityObservation, HostEvidenceReceipt } from "./binding/types.js";
import { readBoundedJsonInput } from "./cli-input.js";
import { compareExecutionRuns } from "./compare.js";
import { validateFinalExecutionHandoff } from "./finalize.js";
import { createExecutionGraph } from "./graph.js";
import { buildExecutionResultTemplate, buildExecutionTaskPacket } from "./handoff.js";
import {
  commitFinalExecutionHandoff,
} from "./persistence/finalization.js";
import {
  commitExecutionGraphMutation,
} from "./persistence/mutations.js";
import type { ExecutionMutationAuthority } from "./persistence/mutations.js";
import {
  commitAcceptedExecutionResult,
  commitRejectedExecutionResult,
  commitTerminalExecutionResult,
} from "./persistence/results.js";
import {
  closeExecutionStoreSession,
  openExecutionStoreSession,
  openMutableExecutionStoreSessionForRun,
  openReadOnlyExecutionStoreSessionForRun,
} from "./persistence/session.js";
import type { ExecutionStoreSession } from "./persistence/session.js";
import { createTransactionalExecutionRun, loadTransactionalExecutionRun } from "./persistence/store.js";
import { evaluateExecutionResume } from "./resume.js";
import { currentExecutionProcessRuntimeObservation } from "./runtime-receipt.js";
import { executionPersistencePolicy, parseExecutionPersistencePolicy } from "./runtime-policy.js";
import { assertExecutionRunMutable } from "./semantics.js";
import { ExecutionContractError } from "./types.js";
import type {
  ExecutionGraphDraft,
  ExecutionResultEnvelope,
  ExecutionResumeRuntime,
  GraphMutationProposal,
  LoadedExecutionRun,
} from "./types.js";
import type { ExecutionReasonCode } from "./reasons.js";
import { createExecutionEnvelope } from "./validation.js";

const configurationCode = "EXECUTION_COMMAND_CONFIGURATION_INVALID";
const stopCodes = ["CODEX_SPAWN_FAILED", "CODEX_WAIT_TIMEOUT", "USER_CANCELLED", "HOST_THREAD_UNKNOWN"] as const;
const resultRejectionCodes = ["EXECUTION_INPUT_JSON_INVALID", "EXECUTION_RESULT_FIELDS_INVALID", "EXECUTION_RESULT_TOO_LARGE", "EXECUTION_RESULT_FOREIGN", "EXECUTION_RESULT_STALE", "EXECUTION_RESULT_EVIDENCE_INVALID", "EXECUTION_RESULT_SCOPE_VIOLATION", "EXECUTION_RESULT_CONTENT_FORBIDDEN"] as const;
const bindingPolicy = parseExecutionBindingPolicy(executionBindingPolicy);
const commandInputLimit = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy.limits.maxCommandInputBytes;

export async function runPrepareExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    if (
      argv[0] !== "--workspace" || argv[1] === undefined
      || argv[2] !== "--app-data-root" || argv[3] === undefined
      || argv[4] !== "--controller-id" || argv[5] === undefined
      || argv.length !== 6
    ) return configurationFailure();
    const request = prepareRequest(await readBoundedJsonInput(input, commandInputLimit));
    const envelope = createExecutionEnvelope(request.envelope);
    const graph = createExecutionGraph(request.graph, envelope);
    const observedAt = new Date().toISOString();
    const hostSession = currentCodexHostSessionObservation(observedAt);
    if (hostSession.hostSessionId === null) {
      throw new ExecutionContractError("HOST_SESSION_IDENTITY_UNKNOWN", "Codex task identity is unavailable for execution preparation");
    }
    const session = await openExecutionStoreSession({
      workspaceRoot: argv[1],
      appDataRoot: argv[3],
      runtime: currentExecutionProcessRuntimeObservation(),
      kernelRevision: envelope.sourceRevision.slice(0, 40),
      dependencyLockPath: resolve("package-lock.json"),
      sessionId: `cli-${randomUUID()}`,
      hostSessionId: hostSession.hostSessionId,
      observedAt,
    });
    try {
      const run = createTransactionalExecutionRun(session, { controllerId: argv[5], envelope, graph, recordedAt: observedAt });
      write({
        state: "READY",
        workspaceId: run.workspaceId,
        databasePath: run.databasePath,
        runId: run.runId,
        controllerId: run.controllerId,
        fencingToken: run.fencingToken,
        runtimeReceiptId: run.runtimeReceiptId,
        lane: session.runtimeReceipt.lane,
      });
      return 0;
    } finally {
      closeExecutionStoreSession(session);
    }
  });
}

export async function runPrepareExecutionNode(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = readPrefix(argv);
    if (locator === null || locator.rest[0] !== "--node" || locator.rest[1] === undefined || locator.rest.length !== 2) return configurationFailure();
    const run = withReadRun(locator, (session) => loadTransactionalExecutionRun(session, locator.runId));
    const contextArtifacts = contextArtifactsForNode(run, locator.rest[1]);
    const taskPacket = buildExecutionTaskPacket(run.envelope, run.graph, locator.rest[1], contextArtifacts.map((artifact) => artifact.artifactRef));
    write({ taskPacket, contextArtifacts, resultTemplate: buildExecutionResultTemplate(taskPacket) });
    return 0;
  });
}

export async function runCreateExecutionHostReceipt(
  argv: readonly string[],
  input: NodeJS.ReadableStream,
): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = readPrefix(argv);
    if (locator === null || locator.rest.length !== 0) return configurationFailure();
    const request = hostReceiptInput(await readBoundedJsonInput(input, bindingPolicy.maxHostEvidenceInputBytes));
    return withReadRun(locator, (session) => {
      const run = loadTransactionalExecutionRun(session, locator.runId);
      const hostSession = currentCodexHostSessionObservation(request.observedAt);
      const receipt = createExecutionHostReceipt({
        hostProfileId: request.hostProfileId,
        hostSessionId: hostSession.hostSessionId,
        capabilities: request.capabilities,
        observedAt: request.observedAt,
      }, {
        controllerId: run.controllerId,
        runtimeReceiptId: run.runtimeReceiptId,
      }, bindingPolicy);
      write(receipt);
      return 0;
    });
  });
}

export async function runInspectExecutionDispatchReadiness(
  argv: readonly string[],
  input: NodeJS.ReadableStream,
): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = readPrefix(argv);
    if (
      locator === null
      || locator.rest[0] !== "--node"
      || locator.rest[1] === undefined
      || locator.rest.length !== 2
    ) return configurationFailure();
    const nodeId = locator.rest[1];
    const inputValue = readinessInput(await readBoundedJsonInput(input, bindingPolicy.maxReadinessInputBytes));
    const session = openReadOnlyExecutionStoreSessionForRun({
      databasePath: locator.databasePath,
      runId: locator.runId,
      runtime: currentExecutionProcessRuntimeObservation(),
    });
    try {
      const run = loadTransactionalExecutionRun(session, locator.runId);
      const hostReceipt = parseExecutionHostReceipt(inputValue.hostReceipt, bindingPolicy);
      const currentHost = currentCodexHostSessionObservation(inputValue.observedAt);
      if (currentHost.hostSessionId !== hostReceipt.hostSessionId) {
        throw new ExecutionContractError("HOST_SESSION_IDENTITY_MISMATCH", "host receipt does not belong to the current Codex task");
      }
      const node = run.graph.nodes.find((candidate) => candidate.nodeId === nodeId);
      if (node === undefined) throw new ExecutionContractError("EXECUTION_DISPATCH_READINESS_INVALID", "selected execution node does not exist");
      const sourceRequests = sourceInputsForNode(inputValue.sources, node.sourceIds);
      const sourceObservations = [];
      for (const sourceId of [...node.sourceIds].sort(asciiCompare)) {
        const source = run.envelope.sources.find((candidate) => candidate.sourceId === sourceId);
        const sourceInput = sourceRequests.find((candidate) => candidate.sourceId === sourceId);
        if (source === undefined || sourceInput === undefined) {
          throw new ExecutionContractError("EXECUTION_DISPATCH_READINESS_INVALID", "selected node source binding is incomplete");
        }
        sourceObservations.push(await observeExecutionSource({
          sourceId,
          platform: process.platform,
          workspaceRoot: sourceInput.workspaceRoot,
          expectedSourceRevision: source.sourceRevision,
          auditedPaths: sourceInput.auditedPaths,
          observedAt: inputValue.observedAt,
        }, { workspaceIdentityDigest: run.workspaceIdentityDigest }, bindingPolicy));
      }
      const readinessReceipt = assembleExecutionDispatchReadiness({
        run,
        runtimeReceipt: session.runtimeReceipt,
        nodeId,
        hostReceipt,
        sourceObservations,
        observedAt: inputValue.observedAt,
      }, bindingPolicy);
      write({ hostReceipt, sourceObservations, readinessReceipt });
      return readinessReceipt.state === "READY" ? 0 : 2;
    } finally {
      closeExecutionStoreSession(session);
    }
  });
}

export async function runRecordExecutionDispatch(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = mutablePrefix(argv);
    if (
      locator === null || locator.rest[0] !== "--node" || locator.rest[1] === undefined
      || locator.rest[2] !== "--task" || locator.rest[3] === undefined
      || locator.rest[4] !== "--thread-ref" || locator.rest[5] === undefined
      || locator.rest.length !== 6
    ) return configurationFailure();
    return withMutableRun(locator, (session) => {
      assertExecutionRunMutable(loadTransactionalExecutionRun(session, locator.runId).checkpoint.runState);
      throw new ExecutionContractError("OPERATOR_PROTOCOL_VIOLATION", "single-phase dispatch recording is unsupported by execution contract v2");
    });
  });
}

export async function runAcceptExecutionResult(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = mutablePrefix(argv);
    if (locator === null || locator.rest.length !== 0) return configurationFailure();
    const value = await readBoundedJsonInput(input, commandInputLimit) as ExecutionResultEnvelope;
    return withMutableRun(locator, (session) => {
      const run = loadTransactionalExecutionRun(session, locator.runId);
      assertExecutionRunMutable(run.checkpoint.runState);
      const threadRef = dispatchedThreadRef(run, value.nodeId);
      if (value.status === "READY_FOR_VALIDATION") {
        const accepted = commitAcceptedExecutionResult(session, {
          runId: locator.runId,
          authority: authority(locator, run),
          result: value,
          threadRef,
          recordedAt: new Date().toISOString(),
        });
        write({ state: accepted.run.checkpoint.runState, nodeId: value.nodeId, artifact: accepted.artifact });
        return 0;
      }
      const terminal = commitTerminalExecutionResult(session, {
        runId: locator.runId,
        authority: authority(locator, run),
        result: value,
        threadRef,
        recordedAt: new Date().toISOString(),
      });
      write({ state: terminal.checkpoint.runState, nodeId: value.nodeId, code: value.reasonCode });
      return terminal.checkpoint.runState === "UNKNOWN" ? 2 : 0;
    });
  });
}

export async function runRejectExecutionResult(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = mutablePrefix(argv);
    if (
      locator === null || locator.rest[0] !== "--node" || locator.rest[1] === undefined
      || locator.rest[2] !== "--task" || locator.rest[3] === undefined
      || locator.rest[4] !== "--code" || locator.rest[5] === undefined
      || locator.rest.length !== 6
      || !resultRejectionCodes.includes(locator.rest[5] as typeof resultRejectionCodes[number])
    ) return configurationFailure();
    const nodeId = locator.rest[1];
    const taskId = locator.rest[3];
    const rejectionCode = locator.rest[5] as typeof resultRejectionCodes[number];
    return withMutableRun(locator, (session) => {
      const run = loadTransactionalExecutionRun(session, locator.runId);
      assertExecutionRunMutable(run.checkpoint.runState);
      const dispatch = dispatchedEvent(run, nodeId);
      if (dispatch.taskId !== taskId) throw new ExecutionContractError("EXECUTION_REJECTION_INVALID", "execution result rejection task identity is invalid");
      const reasonCode = resultRejectionReason(rejectionCode);
      const rejected = commitRejectedExecutionResult(session, {
        runId: locator.runId,
        authority: authority(locator, run),
        nodeId,
        taskId,
        threadRef: dispatch.threadRef,
        reasonCode,
        recordedAt: new Date().toISOString(),
      });
      write({ state: rejected.checkpoint.runState, nodeId, code: reasonCode });
      return 0;
    });
  });
}

export async function runProposeExecutionRepair(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = mutablePrefix(argv);
    if (locator === null || locator.rest.length !== 0) return configurationFailure();
    const proposal = await readBoundedJsonInput(input, commandInputLimit) as GraphMutationProposal;
    return withMutableRun(locator, (session) => {
      const run = loadTransactionalExecutionRun(session, locator.runId);
      assertExecutionRunMutable(run.checkpoint.runState);
      const updated = commitExecutionGraphMutation(session, {
        runId: locator.runId,
        authority: authority(locator, run),
        proposal,
        recordedAt: new Date().toISOString(),
      });
      write({ state: updated.checkpoint.runState, graphRevision: updated.graph.graphRevision });
      return 0;
    });
  });
}

export async function runStopExecution(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = mutablePrefix(argv);
    if (
      locator === null || locator.rest[0] !== "--code" || locator.rest[1] === undefined
      || locator.rest.length !== 2 || !stopCodes.includes(locator.rest[1] as typeof stopCodes[number])
    ) return configurationFailure();
    return withMutableRun(locator, (session) => {
      assertExecutionRunMutable(loadTransactionalExecutionRun(session, locator.runId).checkpoint.runState);
      throw new ExecutionContractError("OPERATOR_PROTOCOL_VIOLATION", "unverified single-phase stop recording is unsupported by execution contract v2");
    });
  });
}

export async function runCheckExecutionResume(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = readPrefix(argv);
    if (locator === null || locator.rest[0] !== "--runtime" || locator.rest[1] === undefined || locator.rest.length !== 2) return configurationFailure();
    const run = withReadRun(locator, (session) => loadTransactionalExecutionRun(session, locator.runId));
    const decision = evaluateExecutionResume(run, await readRuntime(locator.rest[1]));
    write(decision);
    return decision.decision === "RESUME" ? 0 : 2;
  });
}

export async function runFinalizeExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    const locator = mutablePrefix(argv);
    if (locator === null || locator.rest.length !== 0) return configurationFailure();
    const handoffValue = await readBoundedJsonInput(input, commandInputLimit);
    return withMutableRun(locator, (session) => {
      const run = loadTransactionalExecutionRun(session, locator.runId);
      assertExecutionRunMutable(run.checkpoint.runState);
      const handoff = validateFinalExecutionHandoff(handoffValue, run);
      const finalized = commitFinalExecutionHandoff(session, {
        runId: locator.runId,
        authority: authority(locator, run),
        handoff,
        recordedAt: new Date().toISOString(),
      });
      write({ state: finalized.checkpoint.runState });
      return finalized.checkpoint.runState === "COMPLETE" || finalized.checkpoint.runState === "COMPLETE_WITH_LIMIT" ? 0 : 2;
    });
  });
}

export async function runCompareExecutionRuns(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    if (
      argv[0] !== "--single-database" || argv[1] === undefined
      || argv[2] !== "--single-run" || argv[3] === undefined
      || argv[4] !== "--multi-database" || argv[5] === undefined
      || argv[6] !== "--multi-run" || argv[7] === undefined
      || argv.length !== 8
    ) return configurationFailure();
    const singleDatabase = argv[1];
    const singleRun = argv[3];
    const multiDatabase = argv[5];
    const multiRun = argv[7];
    const single = withReadRun({ databasePath: singleDatabase, runId: singleRun, rest: [] }, (session) => loadTransactionalExecutionRun(session, singleRun));
    const multi = withReadRun({ databasePath: multiDatabase, runId: multiRun, rest: [] }, (session) => loadTransactionalExecutionRun(session, multiRun));
    write(compareExecutionRuns(single, multi));
    return 0;
  });
}

interface ReadLocator {
  databasePath: string;
  runId: string;
  rest: readonly string[];
}

interface MutableLocator extends ReadLocator {
  controllerId: string;
  fencingToken: number;
}

function readPrefix(argv: readonly string[]): ReadLocator | null {
  if (argv[0] !== "--database" || argv[1] === undefined || argv[2] !== "--run" || argv[3] === undefined) return null;
  return { databasePath: argv[1], runId: argv[3], rest: argv.slice(4) };
}

function mutablePrefix(argv: readonly string[]): MutableLocator | null {
  const read = readPrefix(argv);
  if (
    read === null || read.rest[0] !== "--controller-id" || read.rest[1] === undefined
    || read.rest[2] !== "--fencing-token" || read.rest[3] === undefined
    || !/^[1-9]\d*$/u.test(read.rest[3])
  ) return null;
  const fencingToken = Number(read.rest[3]);
  if (!Number.isSafeInteger(fencingToken)) return null;
  return { databasePath: read.databasePath, runId: read.runId, controllerId: read.rest[1], fencingToken, rest: read.rest.slice(4) };
}

function withReadRun<T>(locator: ReadLocator, operation: (session: ExecutionStoreSession) => T): T {
  const session = openReadOnlyExecutionStoreSessionForRun({
    databasePath: locator.databasePath,
    runId: locator.runId,
    runtime: currentExecutionProcessRuntimeObservation(),
  });
  try {
    return operation(session);
  } finally {
    closeExecutionStoreSession(session);
  }
}

function withMutableRun<T>(locator: MutableLocator, operation: (session: ExecutionStoreSession) => T): T {
  const session = openMutableExecutionStoreSessionForRun({
    databasePath: locator.databasePath,
    runId: locator.runId,
    runtime: currentExecutionProcessRuntimeObservation(),
  });
  try {
    return operation(session);
  } finally {
    closeExecutionStoreSession(session);
  }
}

function authority(locator: MutableLocator, run: LoadedExecutionRun): ExecutionMutationAuthority {
  return {
    controllerId: locator.controllerId,
    fencingToken: locator.fencingToken,
    runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash,
    expectedGraphRevision: run.graph.graphRevision,
  };
}

function prepareRequest(value: unknown): { envelope: import("./types.js").ExecutionEnvelopeInput; graph: ExecutionGraphDraft } {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ExecutionContractError("EXECUTION_PREPARE_INPUT_INVALID", "execution preparation input must be a plain object");
  }
  const record = value as Record<string, unknown>;
  if (Reflect.ownKeys(record).length !== 2 || !Object.hasOwn(record, "envelope") || !Object.hasOwn(record, "graph")) {
    throw new ExecutionContractError("EXECUTION_PREPARE_INPUT_INVALID", "execution preparation input fields are invalid");
  }
  return { envelope: record.envelope as import("./types.js").ExecutionEnvelopeInput, graph: record.graph as ExecutionGraphDraft };
}

function contextArtifactsForNode(run: LoadedExecutionRun, nodeId: string): readonly { artifactRef: import("./types.js").ExecutionArtifactRef; result: import("./types.js").ExecutionResultEnvelope }[] {
  const predecessorIds = new Set(run.graph.edges.filter((edge) => edge.toNodeId === nodeId).map((edge) => edge.fromNodeId));
  return run.artifacts.flatMap((artifact) => {
    if (artifact.nodeId === null || !predecessorIds.has(artifact.nodeId)) return [];
    const result = run.acceptedResults.find((candidate) => candidate.nodeId === artifact.nodeId);
    return result === undefined ? [] : [{ artifactRef: artifact, result }];
  });
}

function dispatchedThreadRef(run: LoadedExecutionRun, nodeId: string): string {
  return dispatchedEvent(run, nodeId).threadRef;
}

function dispatchedEvent(run: LoadedExecutionRun, nodeId: string): { taskId: string; threadRef: string } {
  const event = [...run.events].reverse().find((candidate) => candidate.eventType === "DISPATCH_CONFIRMED" && candidate.nodeId === nodeId);
  if (event?.threadRef === null || event?.threadRef === undefined || event.taskId === null) {
    throw new ExecutionContractError("EXECUTION_RESULT_STATE_INVALID", "execution result lacks a dispatch identity");
  }
  return { taskId: event.taskId, threadRef: event.threadRef };
}

function resultRejectionReason(code: typeof resultRejectionCodes[number]): ExecutionReasonCode {
  const reasons: Readonly<Record<typeof resultRejectionCodes[number], ExecutionReasonCode>> = {
    EXECUTION_INPUT_JSON_INVALID: "INPUT_JSON_INVALID",
    EXECUTION_RESULT_FIELDS_INVALID: "RESULT_FIELDS_INVALID",
    EXECUTION_RESULT_TOO_LARGE: "RESULT_TOO_LARGE",
    EXECUTION_RESULT_FOREIGN: "RESULT_FOREIGN",
    EXECUTION_RESULT_STALE: "RESULT_STALE",
    EXECUTION_RESULT_EVIDENCE_INVALID: "EVIDENCE_MISSING",
    EXECUTION_RESULT_SCOPE_VIOLATION: "EVIDENCE_SCOPE_VIOLATION",
    EXECUTION_RESULT_CONTENT_FORBIDDEN: "CONTENT_FORBIDDEN",
  };
  return reasons[code];
}

async function readRuntime(path: string): Promise<ExecutionResumeRuntime> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ExecutionResumeRuntime;
  } catch {
    throw new ExecutionContractError("EXECUTION_RUNTIME_UNREADABLE", "execution runtime evidence is unavailable");
  }
}

async function runExecutionCommand(action: () => Promise<number>): Promise<number> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ExecutionContractError) {
      write(rejectedExecutionCommand(operationalReasonForContractError(error.code)));
      return error.code === configurationCode || error.code.endsWith("UNREADABLE") ? 4 : 3;
    }
    throw error;
  }
}

function configurationFailure(): number {
  write(rejectedExecutionCommand("COMMAND_ARGUMENTS_INVALID"));
  return 4;
}

function write(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

interface HostReceiptInput {
  hostProfileId: string;
  capabilities: readonly HostCapabilityObservation[];
  observedAt: string;
}

interface ReadinessSourceInput {
  sourceId: string;
  workspaceRoot: string;
  auditedPaths: readonly string[];
}

interface ReadinessInput {
  hostReceipt: HostEvidenceReceipt;
  sources: readonly ReadinessSourceInput[];
  observedAt: string;
}

function hostReceiptInput(value: unknown): HostReceiptInput {
  const record = inputRecord(value, ["hostProfileId", "capabilities", "observedAt"], "host receipt input");
  if (typeof record.hostProfileId !== "string" || !Array.isArray(record.capabilities) || typeof record.observedAt !== "string") {
    throw new ExecutionContractError("EXECUTION_HOST_RECEIPT_INVALID", "host receipt input fields are invalid");
  }
  return {
    hostProfileId: record.hostProfileId,
    capabilities: record.capabilities as HostCapabilityObservation[],
    observedAt: record.observedAt,
  };
}

function readinessInput(value: unknown): ReadinessInput {
  const record = inputRecord(value, ["hostReceipt", "sources", "observedAt"], "readiness input");
  if (!Array.isArray(record.sources) || typeof record.observedAt !== "string") {
    throw new ExecutionContractError("EXECUTION_DISPATCH_READINESS_INVALID", "readiness input fields are invalid");
  }
  const sources = record.sources.map((sourceValue) => {
    const source = inputRecord(sourceValue, ["sourceId", "workspaceRoot", "auditedPaths"], "readiness source input");
    if (
      typeof source.sourceId !== "string"
      || typeof source.workspaceRoot !== "string"
      || !Array.isArray(source.auditedPaths)
      || source.auditedPaths.some((path) => typeof path !== "string")
    ) {
      throw new ExecutionContractError("EXECUTION_DISPATCH_READINESS_INVALID", "readiness source input fields are invalid");
    }
    return {
      sourceId: source.sourceId,
      workspaceRoot: source.workspaceRoot,
      auditedPaths: source.auditedPaths as string[],
    };
  });
  return {
    hostReceipt: record.hostReceipt as HostEvidenceReceipt,
    sources,
    observedAt: record.observedAt,
  };
}

function sourceInputsForNode(
  values: readonly ReadinessSourceInput[],
  expectedSourceIds: readonly string[],
): readonly ReadinessSourceInput[] {
  const actualIds = values.map((value) => value.sourceId).sort(asciiCompare);
  const expectedIds = [...expectedSourceIds].sort(asciiCompare);
  if (
    values.length !== expectedIds.length
    || new Set(actualIds).size !== actualIds.length
    || actualIds.some((sourceId, index) => sourceId !== expectedIds[index])
  ) {
    throw new ExecutionContractError("EXECUTION_DISPATCH_READINESS_INVALID", "readiness source inputs are incomplete, duplicated, or foreign");
  }
  return values;
}

function inputRecord(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ExecutionContractError("EXECUTION_INPUT_JSON_INVALID", `${label} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort(asciiCompare);
  const expected = [...keys].sort(asciiCompare);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new ExecutionContractError("EXECUTION_INPUT_JSON_INVALID", `${label} fields are invalid`);
  }
  return record;
}

function asciiCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

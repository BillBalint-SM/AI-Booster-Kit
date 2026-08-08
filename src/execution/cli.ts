import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { operationalReasonForContractError, rejectedExecutionCommand } from "./command-outcome.js";
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

export async function runPrepareExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    if (
      argv[0] !== "--workspace" || argv[1] === undefined
      || argv[2] !== "--app-data-root" || argv[3] === undefined
      || argv[4] !== "--controller-id" || argv[5] === undefined
      || argv.length !== 6
    ) return configurationFailure();
    const request = prepareRequest(await readJsonInput(input));
    const envelope = createExecutionEnvelope(request.envelope);
    const graph = createExecutionGraph(request.graph, envelope);
    const observedAt = new Date().toISOString();
    const session = await openExecutionStoreSession({
      workspaceRoot: argv[1],
      appDataRoot: argv[3],
      runtime: currentExecutionProcessRuntimeObservation(),
      kernelRevision: envelope.sourceRevision.slice(0, 40),
      dependencyLockPath: resolve("package-lock.json"),
      sessionId: `cli-${randomUUID()}`,
      hostSessionId: `cli-host-${randomUUID()}`,
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
    const value = await readJsonInput(input) as ExecutionResultEnvelope;
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
    const proposal = await readJsonInput(input) as GraphMutationProposal;
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
    const handoffValue = await readJsonInput(input);
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

async function readJsonInput(input: NodeJS.ReadableStream): Promise<unknown> {
  let source = "";
  for await (const chunk of input) source += Buffer.from(chunk).toString("utf8");
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new ExecutionContractError("EXECUTION_INPUT_JSON_INVALID", "execution input is not valid JSON");
  }
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

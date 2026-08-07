import { readFile } from "node:fs/promises";

import { compareExecutionRuns } from "./compare.js";
import { finalizeExecutionRun, renderFinalExecutionHandoffMarkdown, validateFinalExecutionHandoff } from "./finalize.js";
import { applyExecutionGraphMutation, createExecutionGraph, transitionExecutionNode } from "./graph.js";
import { buildExecutionResultTemplate, buildExecutionTaskPacket, parseExecutionResult, validateResultForNode } from "./handoff.js";
import { createExecutionEvent } from "./ledger.js";
import { evaluateExecutionResume } from "./resume.js";
import { appendRunEvent, createPersonalExecutionRun, loadExecutionRun, saveAcceptedResult, saveFinalExecutionHandoff, saveGraphSnapshot } from "./storage.js";
import { createExecutionEnvelope } from "./validation.js";
import { ExecutionContractError } from "./types.js";
import type { ExecutionGraphDraft, ExecutionResumeRuntime, GraphMutationProposal, LoadedExecutionRun } from "./types.js";

const configurationCode = "EXECUTION_COMMAND_CONFIGURATION_INVALID";
const stopCodes = ["CODEX_SPAWN_FAILED", "CODEX_WAIT_TIMEOUT", "USER_CANCELLED", "HOST_THREAD_UNKNOWN"] as const;
const resultRejectionCodes = ["EXECUTION_INPUT_JSON_INVALID", "EXECUTION_RESULT_FIELDS_INVALID", "EXECUTION_RESULT_TOO_LARGE", "EXECUTION_RESULT_FOREIGN", "EXECUTION_RESULT_STALE", "EXECUTION_RESULT_EVIDENCE_INVALID", "EXECUTION_RESULT_SCOPE_VIOLATION", "EXECUTION_RESULT_CONTENT_FORBIDDEN"] as const;

export async function runPrepareExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    if (argv[0] !== "--personal-root" || argv[1] === undefined || argv.length !== 2) return configurationFailure();
    const request = prepareRequest(await readJsonInput(input));
    const envelope = createExecutionEnvelope(request.envelope);
    const graph = createExecutionGraph(request.graph, envelope);
    await createPersonalExecutionRun(argv[1], envelope, graph, new Date().toISOString());
    write({ state: "READY", runId: envelope.runId });
    return 0;
  });
}

export async function runPrepareExecutionNode(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    const runPath = requiredPair(argv, "--run", "--node");
    if (runPath === null) return configurationFailure();
    const run = await loadExecutionRun(runPath.first);
    const contextArtifacts = contextArtifactsForNode(run, runPath.second);
    const taskPacket = buildExecutionTaskPacket(run.envelope, run.graph, runPath.second, contextArtifacts.map((artifact) => artifact.artifactRef));
    write({ taskPacket, contextArtifacts, resultTemplate: buildExecutionResultTemplate(taskPacket) });
    return 0;
  });
}

export async function runRecordExecutionDispatch(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    if (argv[0] !== "--run" || argv[1] === undefined || argv[2] !== "--node" || argv[3] === undefined || argv[4] !== "--task" || argv[5] === undefined || argv[6] !== "--thread-ref" || argv[7] === undefined || argv.length !== 8) {
      return configurationFailure();
    }
    const run = await loadExecutionRun(argv[1]);
    const node = run.graph.nodes.find((entry) => entry.nodeId === argv[3]);
    if (node === undefined || node.state !== "READY" || (node.type !== "AGENT_TASK" && node.type !== "SYNTHESIS")) throw new ExecutionContractError("EXECUTION_DISPATCH_INVALID", "execution node is not dispatchable");
    const packet = buildExecutionTaskPacket(run.envelope, run.graph, node.nodeId, contextArtifactsForNode(run, node.nodeId).map((artifact) => artifact.artifactRef));
    if (packet.taskId !== argv[5] || !validThreadReference(node.type, argv[7])) throw new ExecutionContractError("EXECUTION_DISPATCH_INVALID", "execution dispatch identity is invalid");
    const event = nextNodeEvent(run, "NODE_DISPATCHED", node.nodeId, "READY", "RUNNING", packet.taskId, argv[7], [], null);
    await appendRunEvent(run.runDirectory, event);
    await saveGraphSnapshot(run.runDirectory, transitionExecutionNode(run.graph, { nodeId: node.nodeId, from: "READY", to: "RUNNING" }, run.envelope));
    write({ state: "RUNNING", nodeId: node.nodeId });
    return 0;
  });
}

export async function runAcceptExecutionResult(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    const runDirectory = requiredSingleValue(argv, "--run");
    if (runDirectory === null) return configurationFailure();
    const run = await loadExecutionRun(runDirectory);
    const result = parseExecutionResult(await readJsonInput(input), run.envelope.budget.maxResultBytes);
    const node = run.graph.nodes.find((entry) => entry.nodeId === result.nodeId);
    if (node === undefined || node.state !== "RUNNING") throw new ExecutionContractError("EXECUTION_RESULT_STATE_INVALID", "execution result does not target a running node");
    validateResultForNode(result, run.envelope, run.graph, node.nodeId);
    const threadRef = dispatchedThreadRef(run, node.nodeId);
    await appendRunEvent(run.runDirectory, nextNodeEvent(run, "NODE_RESULT_RECEIVED", node.nodeId, "RUNNING", "RESULT_RECEIVED", result.taskId, threadRef, [], null));
    const receivedGraph = transitionExecutionNode(run.graph, { nodeId: node.nodeId, from: "RUNNING", to: "RESULT_RECEIVED" }, run.envelope);
    await saveGraphSnapshot(run.runDirectory, receivedGraph);
    const artifact = await saveAcceptedResult(run.runDirectory, result);
    const receivedRun = await loadExecutionRun(run.runDirectory);
    await appendRunEvent(receivedRun.runDirectory, nextNodeEvent(receivedRun, "NODE_RESULT_ACCEPTED", node.nodeId, "RESULT_RECEIVED", "SUCCEEDED", result.taskId, null, [artifact.artifactId], null));
    await saveGraphSnapshot(receivedRun.runDirectory, transitionExecutionNode(receivedGraph, { nodeId: node.nodeId, from: "RESULT_RECEIVED", to: "SUCCEEDED" }, receivedRun.envelope));
    write({ state: "SUCCEEDED", nodeId: node.nodeId });
    return 0;
  });
}

export async function runRejectExecutionResult(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    if (argv[0] !== "--run" || argv[1] === undefined || argv[2] !== "--node" || argv[3] === undefined || argv[4] !== "--task" || argv[5] === undefined || argv[6] !== "--code" || argv[7] === undefined || argv.length !== 8 || !resultRejectionCodes.includes(argv[7] as typeof resultRejectionCodes[number])) {
      return configurationFailure();
    }
    const run = await loadExecutionRun(argv[1]);
    const node = run.graph.nodes.find((entry) => entry.nodeId === argv[3]);
    if (node === undefined || node.state !== "RUNNING") throw new ExecutionContractError("EXECUTION_REJECTION_INVALID", "execution result rejection does not target a running node");
    const dispatch = dispatchedEvent(run, node.nodeId);
    if (dispatch.taskId !== argv[5]) throw new ExecutionContractError("EXECUTION_REJECTION_INVALID", "execution result rejection task identity is invalid");

    const rejection = nextNodeEvent(run, "NODE_RESULT_REJECTED", node.nodeId, "RUNNING", "REJECTED", dispatch.taskId, dispatch.threadRef, [], argv[7]);
    await appendRunEvent(run.runDirectory, rejection);
    await saveGraphSnapshot(run.runDirectory, transitionExecutionNode(run.graph, { nodeId: node.nodeId, from: "RUNNING", to: "REJECTED" }, run.envelope));

    const rejectedRun = await loadExecutionRun(run.runDirectory);
    const stopped = createExecutionEvent(
      {
        runId: rejectedRun.envelope.runId,
        eventType: "RUN_STOPPED",
        nodeId: null,
        beforeState: rejectedRun.checkpoint.runState,
        afterState: "STOPPED",
        graphRevision: rejectedRun.graph.graphRevision,
        evidenceRefs: [],
        taskId: null,
        threadRef: null,
        reasonCode: argv[7],
      },
      rejectedRun.events.length + 1,
      rejectedRun.checkpoint.lastEventHash,
      new Date().toISOString(),
    );
    await appendRunEvent(rejectedRun.runDirectory, stopped);
    write({ state: "STOPPED", nodeId: node.nodeId, code: argv[7] });
    return 0;
  });
}

export async function runProposeExecutionRepair(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    const runDirectory = requiredSingleValue(argv, "--run");
    if (runDirectory === null) return configurationFailure();
    const run = await loadExecutionRun(runDirectory);
    const proposal = await readJsonInput(input) as GraphMutationProposal;
    const acceptedEvidenceRefs = run.evidenceRefs.map((evidence) => evidence.evidenceId);
    const nextGraph = applyExecutionGraphMutation(run.graph, proposal, run.envelope, acceptedEvidenceRefs);
    const event = createExecutionEvent(
      {
        runId: run.envelope.runId,
        eventType: "GRAPH_MUTATION_ACCEPTED",
        nodeId: null,
        beforeState: run.checkpoint.runState,
        afterState: run.checkpoint.runState,
        graphRevision: run.graph.graphRevision,
        evidenceRefs: [...proposal.evidenceRefs],
        taskId: null,
        threadRef: null,
        reasonCode: null,
      },
      run.events.length + 1,
      run.checkpoint.lastEventHash,
      new Date().toISOString(),
    );
    await appendRunEvent(run.runDirectory, event);
    await saveGraphSnapshot(run.runDirectory, nextGraph);
    write({ state: "READY", graphRevision: nextGraph.graphRevision });
    return 0;
  });
}

export async function runStopExecution(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    if (argv[0] !== "--run" || argv[1] === undefined || argv[2] !== "--code" || argv[3] === undefined || argv.length !== 4 || !stopCodes.includes(argv[3] as typeof stopCodes[number])) {
      return configurationFailure();
    }
    const run = await loadExecutionRun(argv[1]);
    const unknown = argv[3] === "CODEX_WAIT_TIMEOUT" || argv[3] === "HOST_THREAD_UNKNOWN";
    const event = createExecutionEvent(
      {
        runId: run.envelope.runId,
        eventType: unknown ? "RUN_UNKNOWN" : "RUN_STOPPED",
        nodeId: null,
        beforeState: run.checkpoint.runState,
        afterState: unknown ? "UNKNOWN" : "STOPPED",
        graphRevision: run.graph.graphRevision,
        evidenceRefs: [],
        taskId: null,
        threadRef: null,
        reasonCode: argv[3],
      },
      run.events.length + 1,
      run.checkpoint.lastEventHash,
      new Date().toISOString(),
    );
    await appendRunEvent(run.runDirectory, event);
    write({ state: unknown ? "UNKNOWN" : "STOPPED" });
    return unknown ? 2 : 0;
  });
}

export async function runCheckExecutionResume(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    if (argv[0] !== "--run" || argv[1] === undefined || argv[2] !== "--runtime" || argv[3] === undefined || argv.length !== 4) return configurationFailure();
    const run = await loadExecutionRun(argv[1]);
    const runtime = await readRuntime(argv[3]);
    const decision = evaluateExecutionResume(run, runtime);
    write(decision);
    return decision.decision === "RESUME" ? 0 : 2;
  });
}

export async function runFinalizeExecution(argv: readonly string[], input: NodeJS.ReadableStream): Promise<number> {
  return runExecutionCommand(async () => {
    const runDirectory = requiredSingleValue(argv, "--run");
    if (runDirectory === null) return configurationFailure();
    const run = await loadExecutionRun(runDirectory);
    const handoff = validateFinalExecutionHandoff(await readJsonInput(input), run);
    const finalization = finalizeExecutionRun(run, handoff, new Date().toISOString());
    await saveFinalExecutionHandoff(run.runDirectory, handoff, renderFinalExecutionHandoffMarkdown(handoff));
    await appendRunEvent(run.runDirectory, finalization.event);
    write({ state: finalization.state });
    return finalization.state === "COMPLETE" || finalization.state === "COMPLETE_WITH_LIMIT" ? 0 : 2;
  });
}

export async function runCompareExecutionRuns(argv: readonly string[]): Promise<number> {
  return runExecutionCommand(async () => {
    if (argv[0] !== "--single" || argv[1] === undefined || argv[2] !== "--multi" || argv[3] === undefined || argv.length !== 4) return configurationFailure();
    write(compareExecutionRuns(await loadExecutionRun(argv[1]), await loadExecutionRun(argv[3])));
    return 0;
  });
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

function nextNodeEvent(
  run: LoadedExecutionRun,
  eventType: "NODE_DISPATCHED" | "NODE_RESULT_RECEIVED" | "NODE_RESULT_ACCEPTED" | "NODE_RESULT_REJECTED",
  nodeId: string,
  beforeState: "READY" | "RUNNING" | "RESULT_RECEIVED",
  afterState: "RUNNING" | "RESULT_RECEIVED" | "SUCCEEDED" | "REJECTED",
  taskId: string,
  threadRef: string | null,
  evidenceRefs: readonly string[],
  reasonCode: string | null,
) {
  return createExecutionEvent(
    { runId: run.envelope.runId, eventType, nodeId, beforeState, afterState, graphRevision: run.graph.graphRevision, evidenceRefs, taskId, threadRef, reasonCode },
    run.events.length + 1,
    run.checkpoint.lastEventHash,
    new Date().toISOString(),
  );
}

function dispatchedThreadRef(run: LoadedExecutionRun, nodeId: string): string {
  return dispatchedEvent(run, nodeId).threadRef;
}

function dispatchedEvent(run: LoadedExecutionRun, nodeId: string): { taskId: string; threadRef: string } {
  const event = [...run.events].reverse().find((candidate) => candidate.eventType === "NODE_DISPATCHED" && candidate.nodeId === nodeId);
  if (event?.threadRef === null || event?.threadRef === undefined || event.taskId === null) throw new ExecutionContractError("EXECUTION_RESULT_STATE_INVALID", "execution result lacks a dispatch identity");
  return { taskId: event.taskId, threadRef: event.threadRef };
}

function validThreadReference(nodeType: "AGENT_TASK" | "SYNTHESIS", threadRef: string): boolean {
  return nodeType === "SYNTHESIS"
    ? threadRef === "main"
    : /^codex-agent:\/?[a-z0-9][a-z0-9/_-]{2,159}$/.test(threadRef) && !threadRef.includes("..") && !threadRef.includes("//");
}

function requiredSingleValue(argv: readonly string[], flag: string): string | null {
  return argv[0] === flag && argv[1] !== undefined && argv.length === 2 ? argv[1] : null;
}

function requiredPair(argv: readonly string[], firstFlag: string, secondFlag: string): { first: string; second: string } | null {
  return argv[0] === firstFlag && argv[1] !== undefined && argv[2] === secondFlag && argv[3] !== undefined && argv.length === 4 ? { first: argv[1], second: argv[3] } : null;
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
      write({ state: "STOPPED", error: { code: error.code } });
      return error.code === configurationCode || error.code.endsWith("UNREADABLE") ? 4 : 3;
    }
    throw error;
  }
}

function configurationFailure(): number {
  write({ state: "STOPPED", error: { code: configurationCode } });
  return 4;
}

function write(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

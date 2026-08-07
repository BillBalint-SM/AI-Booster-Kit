import assert from "node:assert/strict";
import { test } from "node:test";

import { applyExecutionGraphMutation, createExecutionGraph, readyExecutionNodes, transitionExecutionNode } from "../src/execution/graph.js";
import type { ExecutionGraph, GraphMutationProposal } from "../src/execution/types.js";
import { createExecutionEnvelope } from "../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

test("execution graph derives fan-out readiness from one acyclic graph", () => {
  const graph = createExecutionGraph(referenceGraphDraft, createExecutionEnvelope(referenceEnvelopeInput));

  assert.equal(graph.graphRevision, 1);
  assert.deepEqual(readyExecutionNodes(graph).map((node) => node.nodeId), ["audit-controller", "audit-context"]);
  assert.match(graph.graphHash, /^[a-f0-9]{64}$/);
});

test("execution graph rejects cycles, foreign dependencies, and illegal state transitions", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);

  assert.throws(() => transitionExecutionNode(graph, { nodeId: "audit-controller", from: "PENDING", to: "RUNNING" }, envelope), /EXECUTION_NODE_TRANSITION_INVALID/);
  assert.throws(
    () => createExecutionGraph({ ...referenceGraphDraft, edges: [...referenceGraphDraft.edges, { fromNodeId: "synthesis", toNodeId: "audit-controller" }] }, envelope),
    /EXECUTION_GRAPH_CYCLE/,
  );
  assert.throws(
    () => createExecutionGraph({ ...referenceGraphDraft, edges: [...referenceGraphDraft.edges, { fromNodeId: "unknown", toNodeId: "checker" }] }, envelope),
    /EXECUTION_GRAPH_INVALID/,
  );
});

test("execution graph admits one repair and holds synthesis until it succeeds", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const readySynthesis = completeThroughChecker(createExecutionGraph(referenceGraphDraft, envelope), envelope);
  const proposal = repairProposal(readySynthesis.graphRevision, "repair-1");

  const mutated = applyExecutionGraphMutation(readySynthesis, proposal, envelope, proposal.evidenceRefs);
  const secondProposal = repairProposal(mutated.graphRevision, "repair-2");

  assert.equal(mutated.nodes.find((node) => node.nodeId === "synthesis")?.state, "PENDING");
  assert.equal(mutated.nodes.find((node) => node.nodeId === "repair-1")?.state, "READY");
  assert.throws(() => applyExecutionGraphMutation(mutated, secondProposal, envelope, secondProposal.evidenceRefs), /EXECUTION_GRAPH_LIMIT_EXCEEDED/);
});

function completeThroughChecker(graph: ExecutionGraph, envelope: ReturnType<typeof createExecutionEnvelope>): ExecutionGraph {
  const controllerRunning = transitionExecutionNode(graph, { nodeId: "audit-controller", from: "READY", to: "RUNNING" }, envelope);
  const controllerReceived = transitionExecutionNode(controllerRunning, { nodeId: "audit-controller", from: "RUNNING", to: "RESULT_RECEIVED" }, envelope);
  const controllerSucceeded = transitionExecutionNode(controllerReceived, { nodeId: "audit-controller", from: "RESULT_RECEIVED", to: "SUCCEEDED" }, envelope);
  const contextRunning = transitionExecutionNode(controllerSucceeded, { nodeId: "audit-context", from: "READY", to: "RUNNING" }, envelope);
  const contextReceived = transitionExecutionNode(contextRunning, { nodeId: "audit-context", from: "RUNNING", to: "RESULT_RECEIVED" }, envelope);
  const contextSucceeded = transitionExecutionNode(contextReceived, { nodeId: "audit-context", from: "RESULT_RECEIVED", to: "SUCCEEDED" }, envelope);
  const checkerRunning = transitionExecutionNode(contextSucceeded, { nodeId: "checker", from: "READY", to: "RUNNING" }, envelope);
  const checkerReceived = transitionExecutionNode(checkerRunning, { nodeId: "checker", from: "RUNNING", to: "RESULT_RECEIVED" }, envelope);
  return transitionExecutionNode(checkerReceived, { nodeId: "checker", from: "RESULT_RECEIVED", to: "SUCCEEDED" }, envelope);
}

function repairProposal(expectedGraphRevision: number, nodeId: string): GraphMutationProposal {
  return {
    proposalId: `proposal-${nodeId}`,
    expectedGraphRevision,
    reason: "Checker identified one bounded missing repository fact.",
    evidenceRefs: ["checker-verdict"],
    nodes: [
      {
        nodeId,
        type: "AGENT_TASK",
        required: true,
        state: "PENDING",
        objective: "Collect the named missing repository fact.",
        role: "repair-auditor",
        repairOf: "checker",
        scope: ["src/context"],
        prohibitedActions: ["repository writes", "external sources", "agent spawning", "unvalidated worker output"],
        contextRefs: [],
        sourceIds: ["repo"],
        toolScope: ["FILESYSTEM_READ"],
        acceptanceCriterionIds: ["criterion-context"],
      },
    ],
    edges: [
      { fromNodeId: "checker", toNodeId: nodeId },
      { fromNodeId: nodeId, toNodeId: "synthesis" },
    ],
  };
}

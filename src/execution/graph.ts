import { executionDigest } from "./identity.js";
import { ExecutionContractError } from "./types.js";
import type {
  ExecutionEdge,
  ExecutionEnvelope,
  ExecutionGraph,
  ExecutionGraphDraft,
  ExecutionNode,
  ExecutionNodeState,
  GraphMutationProposal,
  NodeTransition,
} from "./types.js";

const graphCode = "EXECUTION_GRAPH_INVALID";
const cycleCode = "EXECUTION_GRAPH_CYCLE";
const limitCode = "EXECUTION_GRAPH_LIMIT_EXCEEDED";
const mutationCode = "EXECUTION_GRAPH_MUTATION_INVALID";
const transitionCode = "EXECUTION_NODE_TRANSITION_INVALID";
const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/;

const transitions: Readonly<Record<ExecutionNodeState, readonly ExecutionNodeState[]>> = {
  PENDING: ["READY"],
  READY: ["RUNNING"],
  RUNNING: ["RESULT_RECEIVED", "STOPPED", "UNKNOWN"],
  RESULT_RECEIVED: ["SUCCEEDED", "REJECTED"],
  SUCCEEDED: [],
  REJECTED: [],
  STOPPED: [],
  UNKNOWN: [],
};

export function createExecutionGraph(draft: ExecutionGraphDraft, envelope: ExecutionEnvelope): ExecutionGraph {
  const parsed = parseGraphDraft(draft, envelope, true);
  const readyNodes = reconcileReadiness(parsed.nodes, parsed.edges, false);
  const graph = {
    ...parsed,
    nodes: readyNodes,
    envelopeHash: envelope.envelopeHash,
    graphRevision: 1,
  };
  assertGraphLimits(graph, envelope);
  return withGraphHash(graph);
}

export function validateExecutionGraph(value: unknown, envelope: ExecutionEnvelope): ExecutionGraph {
  const record = plainRecord(value, graphCode, "execution graph must be a plain object");
  exactKeys(record, ["graphId", "runId", "nodes", "edges", "envelopeHash", "graphRevision", "graphHash"], graphCode, "execution graph fields are invalid");
  if (record.envelopeHash !== envelope.envelopeHash) throw new ExecutionContractError(graphCode, "execution graph envelope identity is invalid");
  const draft = parseGraphDraft({ graphId: record.graphId, runId: record.runId, nodes: record.nodes, edges: record.edges }, envelope, false);
  const graphRevision = positiveInteger(record.graphRevision, graphCode, "execution graph revision is invalid");
  const graphHash = hashValue(record.graphHash, graphCode, "execution graph hash is invalid");
  const graph = {
    ...draft,
    envelopeHash: envelope.envelopeHash,
    graphRevision,
    graphHash,
  };
  assertGraphLimits(graph, envelope);
  assertReadinessConsistency(graph);
  const expectedHash = graphDigest(withoutGraphHash(graph));
  if (graphHash !== expectedHash) throw new ExecutionContractError(graphCode, "execution graph hash does not match its content");
  return structuredClone(graph);
}

export function readyExecutionNodes(graph: ExecutionGraph): readonly ExecutionNode[] {
  return graph.nodes.filter((node) => node.state === "READY");
}

export function transitionExecutionNode(graph: ExecutionGraph, transition: NodeTransition, envelope: ExecutionEnvelope): ExecutionGraph {
  const current = validateExecutionGraph(graph, envelope);
  const node = current.nodes.find((entry) => entry.nodeId === transition.nodeId);
  if (node === undefined || node.state !== transition.from || !transitions[transition.from].includes(transition.to)) {
    throw new ExecutionContractError(transitionCode, "execution node transition is invalid");
  }
  const nodes = current.nodes.map((entry) => entry.nodeId === transition.nodeId ? { ...entry, state: transition.to } : entry);
  const reconciled = transition.to === "SUCCEEDED" ? reconcileReadiness(nodes, current.edges, false) : nodes;
  const next = {
    graphId: current.graphId,
    runId: current.runId,
    nodes: reconciled,
    edges: current.edges,
    envelopeHash: current.envelopeHash,
    graphRevision: current.graphRevision,
  };
  assertGraphLimits(next, envelope);
  return withGraphHash(next);
}

export function applyExecutionGraphMutation(
  graph: ExecutionGraph,
  proposal: GraphMutationProposal,
  envelope: ExecutionEnvelope,
  acceptedEvidenceRefs: readonly string[],
): ExecutionGraph {
  const current = validateExecutionGraph(graph, envelope);
  const parsed = parseMutationProposal(proposal);
  if (parsed.expectedGraphRevision !== current.graphRevision) throw new ExecutionContractError(mutationCode, "execution graph revision is stale");
  if (parsed.evidenceRefs.some((reference) => !acceptedEvidenceRefs.includes(reference))) {
    throw new ExecutionContractError(mutationCode, "repair proposal cites unaccepted evidence");
  }

  const currentNodeIds = new Set(current.nodes.map((node) => node.nodeId));
  const currentEdgeIds = new Set(current.edges.map(edgeIdentity));
  if (parsed.nodes.some((node) => currentNodeIds.has(node.nodeId)) || new Set(parsed.nodes.map((node) => node.nodeId)).size !== parsed.nodes.length) {
    throw new ExecutionContractError(mutationCode, "repair proposal node identities are invalid");
  }
  if (parsed.edges.some((edge) => currentEdgeIds.has(edgeIdentity(edge))) || new Set(parsed.edges.map(edgeIdentity)).size !== parsed.edges.length) {
    throw new ExecutionContractError(mutationCode, "repair proposal edges are invalid");
  }

  const newNodeIds = new Set(parsed.nodes.map((node) => node.nodeId));
  for (const node of parsed.nodes) validateRepairNode(node, current, envelope);
  for (const edge of parsed.edges) validateRepairEdge(edge, current, newNodeIds);

  const candidate = {
    graphId: current.graphId,
    runId: current.runId,
    nodes: [...current.nodes, ...parsed.nodes],
    edges: [...current.edges, ...parsed.edges],
    envelopeHash: current.envelopeHash,
    graphRevision: current.graphRevision + 1,
  };
  const reconciled = reconcileReadiness(candidate.nodes, candidate.edges, true);
  const next = { ...candidate, nodes: reconciled };
  assertGraphLimits(next, envelope);
  return withGraphHash(next);
}

function parseGraphDraft(value: unknown, envelope: ExecutionEnvelope, requirePendingNodes: boolean): ExecutionGraphDraft {
  const record = plainRecord(value, graphCode, "execution graph draft must be a plain object");
  exactKeys(record, ["graphId", "runId", "nodes", "edges"], graphCode, "execution graph draft fields are invalid");
  const graphId = identifierValue(record.graphId, graphCode, "execution graph identifier is invalid");
  if (record.runId !== envelope.runId) throw new ExecutionContractError(graphCode, "execution graph run identity is invalid");
  const nodes = nodesValue(record.nodes, envelope, requirePendingNodes);
  const edges = edgesValue(record.edges, nodes);
  assertAcyclic(nodes, edges);
  const graph = { graphId, runId: envelope.runId, nodes, edges };
  assertGraphLimits({ ...graph, envelopeHash: envelope.envelopeHash, graphRevision: 1 }, envelope);
  return graph;
}

function nodesValue(value: unknown, envelope: ExecutionEnvelope, requirePendingNodes: boolean): readonly ExecutionNode[] {
  if (!Array.isArray(value) || value.length === 0) throw new ExecutionContractError(graphCode, "execution graph nodes must be a non-empty list");
  const nodeIds = new Set<string>();
  return value.map((entry) => {
    const record = plainRecord(entry, graphCode, "execution graph node must be a plain object");
    exactKeys(record, ["nodeId", "type", "required", "state", "objective", "role", "repairOf", "scope", "prohibitedActions", "contextRefs", "sourceIds", "toolScope", "acceptanceCriterionIds"], graphCode, "execution graph node fields are invalid");
    const nodeId = identifierValue(record.nodeId, graphCode, "execution node identifier is invalid");
    if (nodeIds.has(nodeId)) throw new ExecutionContractError(graphCode, "execution node identifiers must be unique");
    nodeIds.add(nodeId);
    const type = literal(record.type, ["AGENT_TASK", "DETERMINISTIC_CHECK", "HUMAN_CHECKPOINT", "SYNTHESIS"], graphCode, "execution node type is invalid");
    if (!envelope.allowedNodeTypes.includes(type)) throw new ExecutionContractError(graphCode, "execution node type is not allowed");
    const state = literal(record.state, ["PENDING", "READY", "RUNNING", "RESULT_RECEIVED", "SUCCEEDED", "REJECTED", "STOPPED", "UNKNOWN"], graphCode, "execution node state is invalid");
    if (requirePendingNodes && state !== "PENDING") throw new ExecutionContractError(graphCode, "initial execution nodes must be pending");
    const scope = stringList(record.scope, graphCode, "execution node scope is invalid", true);
    if (scope.some((entryScope) => !envelope.scope.some((envelopeScope) => withinScope(entryScope, envelopeScope)))) {
      throw new ExecutionContractError(graphCode, "execution node scope exceeds the envelope");
    }
    const sourceIds = stringList(record.sourceIds, graphCode, "execution node source identifiers are invalid", true);
    if (sourceIds.some((sourceId) => !envelope.sources.some((source) => source.sourceId === sourceId))) {
      throw new ExecutionContractError(graphCode, "execution node source identifier is invalid");
    }
    const toolScope = literalList(record.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"], graphCode, "execution node tool scope is invalid");
    if (toolScope.some((tool) => !envelope.toolScope.includes(tool))) throw new ExecutionContractError(graphCode, "execution node tool scope exceeds the envelope");
    const acceptanceCriterionIds = stringList(record.acceptanceCriterionIds, graphCode, "execution node acceptance criteria are invalid", true);
    if (acceptanceCriterionIds.some((criterionId) => !envelope.acceptanceCriteria.some((criterion) => criterion.criterionId === criterionId))) {
      throw new ExecutionContractError(graphCode, "execution node acceptance criterion is invalid");
    }
    const repairOf = nullableIdentifier(record.repairOf, graphCode, "execution node repair identity is invalid");
    if (requirePendingNodes && repairOf !== null) throw new ExecutionContractError(graphCode, "initial execution nodes cannot be repairs");
    return {
      nodeId,
      type,
      required: booleanValue(record.required, graphCode, "execution node required flag is invalid"),
      state,
      objective: nonEmptyString(record.objective, graphCode, "execution node objective is invalid"),
      role: nullableString(record.role, graphCode, "execution node role is invalid"),
      repairOf,
      scope,
      prohibitedActions: stringList(record.prohibitedActions, graphCode, "execution node prohibited actions are invalid", true),
      contextRefs: stringList(record.contextRefs, graphCode, "execution node context references are invalid", false),
      sourceIds,
      toolScope,
      acceptanceCriterionIds,
    };
  });
}

function edgesValue(value: unknown, nodes: readonly ExecutionNode[]): readonly ExecutionEdge[] {
  if (!Array.isArray(value)) throw new ExecutionContractError(graphCode, "execution graph edges must be a list");
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const edgeIds = new Set<string>();
  return value.map((entry) => {
    const record = plainRecord(entry, graphCode, "execution graph edge must be a plain object");
    exactKeys(record, ["fromNodeId", "toNodeId"], graphCode, "execution graph edge fields are invalid");
    const fromNodeId = identifierValue(record.fromNodeId, graphCode, "execution graph edge source is invalid");
    const toNodeId = identifierValue(record.toNodeId, graphCode, "execution graph edge target is invalid");
    const id = `${fromNodeId}->${toNodeId}`;
    if (!nodeIds.has(fromNodeId) || !nodeIds.has(toNodeId) || fromNodeId === toNodeId || edgeIds.has(id)) {
      throw new ExecutionContractError(graphCode, "execution graph edge is invalid");
    }
    edgeIds.add(id);
    return { fromNodeId, toNodeId };
  });
}

function parseMutationProposal(value: unknown): GraphMutationProposal {
  const record = plainRecord(value, mutationCode, "execution graph mutation must be a plain object");
  exactKeys(record, ["proposalId", "expectedGraphRevision", "reason", "evidenceRefs", "nodes", "edges"], mutationCode, "execution graph mutation fields are invalid");
  const nodes = mutationNodes(record.nodes);
  return {
    proposalId: identifierValue(record.proposalId, mutationCode, "execution graph mutation identifier is invalid"),
    expectedGraphRevision: positiveInteger(record.expectedGraphRevision, mutationCode, "execution graph mutation revision is invalid"),
    reason: nonEmptyString(record.reason, mutationCode, "execution graph mutation reason is invalid"),
    evidenceRefs: stringList(record.evidenceRefs, mutationCode, "execution graph mutation evidence references are invalid", true),
    nodes,
    edges: mutationEdges(record.edges, nodes),
  };
}

function mutationNodes(value: unknown): readonly ExecutionNode[] {
  if (!Array.isArray(value) || value.length === 0) throw new ExecutionContractError(mutationCode, "execution graph mutation must add nodes");
  return value.map((entry) => {
    const record = plainRecord(entry, mutationCode, "repair node must be a plain object");
    exactKeys(record, ["nodeId", "type", "required", "state", "objective", "role", "repairOf", "scope", "prohibitedActions", "contextRefs", "sourceIds", "toolScope", "acceptanceCriterionIds"], mutationCode, "repair node fields are invalid");
    return {
      nodeId: identifierValue(record.nodeId, mutationCode, "repair node identifier is invalid"),
      type: literal(record.type, ["AGENT_TASK", "DETERMINISTIC_CHECK", "HUMAN_CHECKPOINT", "SYNTHESIS"], mutationCode, "repair node type is invalid"),
      required: booleanValue(record.required, mutationCode, "repair node required flag is invalid"),
      state: literal(record.state, ["PENDING", "READY", "RUNNING", "RESULT_RECEIVED", "SUCCEEDED", "REJECTED", "STOPPED", "UNKNOWN"], mutationCode, "repair node state is invalid"),
      objective: nonEmptyString(record.objective, mutationCode, "repair node objective is invalid"),
      role: nullableString(record.role, mutationCode, "repair node role is invalid"),
      repairOf: nullableIdentifier(record.repairOf, mutationCode, "repair node repair identity is invalid"),
      scope: stringList(record.scope, mutationCode, "repair node scope is invalid", true),
      prohibitedActions: stringList(record.prohibitedActions, mutationCode, "repair node prohibited actions are invalid", true),
      contextRefs: stringList(record.contextRefs, mutationCode, "repair node context references are invalid", false),
      sourceIds: stringList(record.sourceIds, mutationCode, "repair node source identifiers are invalid", true),
      toolScope: literalList(record.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"], mutationCode, "repair node tool scope is invalid"),
      acceptanceCriterionIds: stringList(record.acceptanceCriterionIds, mutationCode, "repair node acceptance criteria are invalid", true),
    };
  });
}

function mutationEdges(value: unknown, nodes: readonly ExecutionNode[]): readonly ExecutionEdge[] {
  if (!Array.isArray(value) || value.length === 0) throw new ExecutionContractError(mutationCode, "execution graph mutation must add edges");
  return value.map((entry) => {
    const record = plainRecord(entry, mutationCode, "repair edge must be a plain object");
    exactKeys(record, ["fromNodeId", "toNodeId"], mutationCode, "repair edge fields are invalid");
    return {
      fromNodeId: identifierValue(record.fromNodeId, mutationCode, "repair edge source is invalid"),
      toNodeId: identifierValue(record.toNodeId, mutationCode, "repair edge target is invalid"),
    };
  });
}

function validateRepairNode(node: ExecutionNode, graph: ExecutionGraph, envelope: ExecutionEnvelope): void {
  if (node.state !== "PENDING" || node.type !== "AGENT_TASK" || node.repairOf === null) {
    throw new ExecutionContractError(mutationCode, "repair node must be a pending agent task with an origin");
  }
  const origin = graph.nodes.find((entry) => entry.nodeId === node.repairOf);
  if (origin === undefined || !terminalState(origin.state)) throw new ExecutionContractError(mutationCode, "repair origin must be terminal");
  if (!envelope.allowedNodeTypes.includes(node.type) || node.scope.some((scope) => !origin.scope.some((originScope) => withinScope(scope, originScope)))) {
    throw new ExecutionContractError(mutationCode, "repair scope is invalid");
  }
  if (node.sourceIds.some((sourceId) => !origin.sourceIds.includes(sourceId)) || node.toolScope.some((tool) => !origin.toolScope.includes(tool)) || node.acceptanceCriterionIds.some((criterion) => !origin.acceptanceCriterionIds.includes(criterion))) {
    throw new ExecutionContractError(mutationCode, "repair capability exceeds its origin");
  }
  if (origin.prohibitedActions.some((action) => !node.prohibitedActions.includes(action))) {
    throw new ExecutionContractError(mutationCode, "repair weakens prohibited actions");
  }
}

function validateRepairEdge(edge: ExecutionEdge, graph: ExecutionGraph, newNodeIds: ReadonlySet<string>): void {
  const existingNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const allNodeIds = new Set([...existingNodeIds, ...newNodeIds]);
  if (!allNodeIds.has(edge.fromNodeId) || !allNodeIds.has(edge.toNodeId) || edge.fromNodeId === edge.toNodeId || (!newNodeIds.has(edge.fromNodeId) && !newNodeIds.has(edge.toNodeId))) {
    throw new ExecutionContractError(mutationCode, "repair edge must connect a repair node");
  }
  const downstream = graph.nodes.find((node) => node.nodeId === edge.toNodeId);
  if (downstream !== undefined && downstream.state !== "PENDING" && downstream.state !== "READY") {
    throw new ExecutionContractError(mutationCode, "repair edge cannot change a running or terminal node");
  }
}

function assertAcyclic(nodes: readonly ExecutionNode[], edges: readonly ExecutionEdge[]): void {
  const incomingCounts = new Map(nodes.map((node) => [node.nodeId, 0]));
  const outgoing = new Map(nodes.map((node) => [node.nodeId, [] as string[]]));
  for (const edge of edges) {
    incomingCounts.set(edge.toNodeId, (incomingCounts.get(edge.toNodeId) ?? 0) + 1);
    outgoing.get(edge.fromNodeId)?.push(edge.toNodeId);
  }
  const queue = nodes.filter((node) => incomingCounts.get(node.nodeId) === 0).map((node) => node.nodeId);
  let visited = 0;
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === undefined) break;
    visited += 1;
    for (const childId of outgoing.get(nodeId) ?? []) {
      const nextCount = (incomingCounts.get(childId) ?? 0) - 1;
      incomingCounts.set(childId, nextCount);
      if (nextCount === 0) queue.push(childId);
    }
  }
  if (visited !== nodes.length) throw new ExecutionContractError(cycleCode, "execution graph contains a cycle");
}

function assertGraphLimits(graph: Omit<ExecutionGraph, "graphHash">, envelope: ExecutionEnvelope): void {
  if (graph.nodes.length > envelope.graphLimits.maxNodes) throw new ExecutionContractError(limitCode, "execution graph exceeds maximum node count");
  assertAcyclic(graph.nodes, graph.edges);
  const depth = graphDepth(graph.nodes, graph.edges);
  if (depth > envelope.graphLimits.maxDepth) throw new ExecutionContractError(limitCode, "execution graph exceeds maximum depth");
  const readyAgentCount = graph.nodes.filter((node) => node.type === "AGENT_TASK" && node.state === "READY").length;
  if (readyAgentCount > envelope.graphLimits.maxParallel) throw new ExecutionContractError(limitCode, "execution graph exceeds maximum parallel agent count");
  const repairCount = graph.nodes.filter((node) => node.repairOf !== null).length;
  if (repairCount > envelope.graphLimits.maxRepairNodes) throw new ExecutionContractError(limitCode, "execution graph exceeds maximum repair count");
}

function graphDepth(nodes: readonly ExecutionNode[], edges: readonly ExecutionEdge[]): number {
  const incoming = new Map(nodes.map((node) => [node.nodeId, [] as string[]]));
  for (const edge of edges) incoming.get(edge.toNodeId)?.push(edge.fromNodeId);
  const depths = new Map<string, number>();
  const calculate = (nodeId: string): number => {
    const known = depths.get(nodeId);
    if (known !== undefined) return known;
    const parents = incoming.get(nodeId) ?? [];
    const depth = parents.length === 0 ? 1 : Math.max(...parents.map(calculate)) + 1;
    depths.set(nodeId, depth);
    return depth;
  };
  return Math.max(...nodes.map((node) => calculate(node.nodeId)));
}

function reconcileReadiness(nodes: readonly ExecutionNode[], edges: readonly ExecutionEdge[], allowDemotion: boolean): readonly ExecutionNode[] {
  const stateById = new Map(nodes.map((node) => [node.nodeId, node.state]));
  const predecessors = predecessorsByNode(nodes, edges);
  const demoted = nodes.map((node) => {
    const satisfied = (predecessors.get(node.nodeId) ?? []).every((predecessorId) => stateById.get(predecessorId) === "SUCCEEDED");
    if (allowDemotion && node.state === "READY" && !satisfied) return { ...node, state: "PENDING" as const };
    return { ...node };
  });
  const demotedStateById = new Map(demoted.map((node) => [node.nodeId, node.state]));
  return demoted.map((node) => {
    const satisfied = (predecessors.get(node.nodeId) ?? []).every((predecessorId) => demotedStateById.get(predecessorId) === "SUCCEEDED");
    return node.state === "PENDING" && satisfied ? { ...node, state: "READY" as const } : node;
  });
}

function assertReadinessConsistency(graph: ExecutionGraph): void {
  const predecessors = predecessorsByNode(graph.nodes, graph.edges);
  const stateById = new Map(graph.nodes.map((node) => [node.nodeId, node.state]));
  for (const node of graph.nodes) {
    const satisfied = (predecessors.get(node.nodeId) ?? []).every((predecessorId) => stateById.get(predecessorId) === "SUCCEEDED");
    if (node.state === "PENDING" && satisfied) throw new ExecutionContractError(graphCode, "execution graph has an unpromoted ready node");
    if (node.state === "READY" && !satisfied) throw new ExecutionContractError(graphCode, "execution graph has a ready node with incomplete dependencies");
  }
}

function predecessorsByNode(nodes: readonly ExecutionNode[], edges: readonly ExecutionEdge[]): Map<string, readonly string[]> {
  const predecessors = new Map(nodes.map((node) => [node.nodeId, [] as string[]]));
  for (const edge of edges) predecessors.get(edge.toNodeId)?.push(edge.fromNodeId);
  return predecessors;
}

function withGraphHash(graph: Omit<ExecutionGraph, "graphHash">): ExecutionGraph {
  return {
    ...structuredClone(graph),
    graphHash: graphDigest(graph),
  };
}

function graphDigest(graph: Omit<ExecutionGraph, "graphHash">): string {
  return executionDigest(graph);
}

function withoutGraphHash(graph: ExecutionGraph): Omit<ExecutionGraph, "graphHash"> {
  const { graphHash: _graphHash, ...unhashed } = graph;
  return unhashed;
}

function edgeIdentity(edge: ExecutionEdge): string {
  return `${edge.fromNodeId}->${edge.toNodeId}`;
}

function withinScope(value: string, boundary: string): boolean {
  return value === boundary || value.startsWith(`${boundary}/`);
}

function terminalState(state: ExecutionNodeState): boolean {
  return state === "SUCCEEDED" || state === "REJECTED" || state === "STOPPED" || state === "UNKNOWN";
}

function plainRecord(value: unknown, code: string, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ExecutionContractError(code, message);
  }
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], code: string, message: string): void {
  const keys = Reflect.ownKeys(record);
  if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) {
    throw new ExecutionContractError(code, message);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) throw new ExecutionContractError(code, message);
  }
}

function identifierValue(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !identifierPattern.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function nullableIdentifier(value: unknown, code: string, message: string): string | null {
  if (value === null) return null;
  return identifierValue(value, code, message);
}

function nonEmptyString(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ExecutionContractError(code, message);
  return value;
}

function nullableString(value: unknown, code: string, message: string): string | null {
  if (value === null) return null;
  return nonEmptyString(value, code, message);
}

function booleanValue(value: unknown, code: string, message: string): boolean {
  if (typeof value !== "boolean") throw new ExecutionContractError(code, message);
  return value;
}

function positiveInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new ExecutionContractError(code, message);
  return value;
}

function hashValue(value: unknown, code: string, message: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new ExecutionContractError(code, message);
  return value;
}

function literal<T extends string>(value: unknown, values: readonly T[], code: string, message: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new ExecutionContractError(code, message);
  return value as T;
}

function literalList<T extends string>(value: unknown, values: readonly T[], code: string, message: string): readonly T[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || !values.includes(entry as T)) || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value as readonly T[];
}

function stringList(value: unknown, code: string, message: string, required: boolean): readonly string[] {
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((entry) => typeof entry !== "string" || entry.trim() === "") || new Set(value).size !== value.length) {
    throw new ExecutionContractError(code, message);
  }
  return value;
}

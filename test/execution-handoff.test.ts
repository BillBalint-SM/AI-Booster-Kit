import assert from "node:assert/strict";
import { test } from "node:test";

import { buildExecutionTaskPacket, parseExecutionResult, validateResultForNode } from "../src/execution/handoff.js";
import type { ExecutionResultEnvelope, ExecutionTaskPacket } from "../src/execution/types.js";
import { createExecutionGraph } from "../src/execution/graph.js";
import { createExecutionEnvelope } from "../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

test("execution handoff builds an exact ready-node task packet", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  const packet = buildExecutionTaskPacket(envelope, graph, "audit-controller", []);

  assert.equal(packet.runId, envelope.runId);
  assert.equal(packet.envelopeHash, envelope.envelopeHash);
  assert.equal(packet.graphRevision, graph.graphRevision);
  assert.equal(packet.expectedOutput, "RESULT_ENVELOPE_V1");
  assert.deepEqual(packet.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"]);
});

test("execution handoff accepts a supported claim with resolved repository evidence", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  const packet = buildExecutionTaskPacket(envelope, graph, "audit-controller", []);
  const result = parseExecutionResult(validWorkerResult(packet, envelope.sourceRevision), envelope.budget.maxResultBytes);

  assert.deepEqual(validateResultForNode(result, envelope, graph, "audit-controller"), result);
});

test("execution handoff rejects unsafe, stale, or scope-widened results", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  const packet = buildExecutionTaskPacket(envelope, graph, "audit-controller", []);
  const result = validWorkerResult(packet, envelope.sourceRevision);
  const repositoryEvidence = result.evidenceRefs[0];

  if (repositoryEvidence === undefined || repositoryEvidence.kind !== "REPOSITORY_FILE") throw new Error("test fixture requires repository evidence");

  assert.throws(() => parseExecutionResult({ ...result, transcript: "forbidden" }, envelope.budget.maxResultBytes), /EXECUTION_RESULT_FIELDS_INVALID/);
  assert.throws(() => validateResultForNode({ ...result, graphRevision: 0 }, envelope, graph, "audit-controller"), /EXECUTION_RESULT_STALE/);
  assert.throws(
    () => validateResultForNode({ ...result, evidenceRefs: [{ ...repositoryEvidence, locator: { path: "src/other.ts", lineStart: 1, lineEnd: 1 } }] }, envelope, graph, "audit-controller"),
    /EXECUTION_RESULT_SCOPE_VIOLATION/,
  );
});

test("execution handoff rejects an evidence accessor before evaluating its value", () => {
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  const packet = buildExecutionTaskPacket(envelope, graph, "audit-controller", []);
  const result = validWorkerResult(packet, envelope.sourceRevision);
  const evidence = result.evidenceRefs[0];
  if (evidence === undefined) throw new Error("test fixture requires evidence");
  let reads = 0;
  const unsafeEvidence = Object.defineProperty({ ...evidence }, "kind", { enumerable: true, get: () => { reads += 1; return "REPOSITORY_FILE"; } });

  assert.throws(() => parseExecutionResult({ ...result, evidenceRefs: [unsafeEvidence] }, envelope.budget.maxResultBytes));
  assert.equal(reads, 0);
});

function validWorkerResult(packet: ExecutionTaskPacket, sourceRevision: string): ExecutionResultEnvelope {
  return {
    resultVersion: "1.0",
    runId: packet.runId,
    taskId: packet.taskId,
    nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash,
    graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION",
    summary: "Controller contract evidence is available.",
    claims: [
      {
        claimId: "claim-controller",
        criterionId: "criterion-controller",
        statement: "Controller assets are traceable to repository evidence.",
        state: "SUPPORTED",
        evidenceRefs: ["evidence-controller-types"],
      },
    ],
    artifactRefs: [],
    evidenceRefs: [
      {
        evidenceId: "evidence-controller-types",
        kind: "REPOSITORY_FILE",
        sourceId: "repo",
        sourceRevision,
        locator: { path: "src/controller/types.ts", lineStart: 20, lineEnd: 30 },
        sha256: null,
      },
    ],
    unknowns: [],
    conflicts: [],
    followupRequest: null,
    observedLimits: [],
  };
}

import assert from "node:assert/strict";
import { test } from "node:test";

import { buildExecutionTaskPacket, parseExecutionResult } from "../src/execution/handoff.js";
import {
  commitAcceptedExecutionResult,
  commitExecutionGraphTransition,
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/storage.js";
import type { ExecutionMutationAuthority } from "../src/execution/persistence/mutations.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";

test("public execution storage returns a database locator, runtime binding, and fenced controller", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  const created = createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T20:00:00.000Z",
  });
  const loaded = loadTransactionalExecutionRun(fixture.session, created.runId);

  assert.equal(created.databasePath, fixture.session.databasePath);
  assert.equal(created.workspaceId, fixture.session.workspaceId);
  assert.equal(created.runId, fixture.envelope.runId);
  assert.equal(created.controllerId, "controller-primary-001");
  assert.equal(created.fencingToken, 1);
  assert.equal(created.runtimeReceiptId, fixture.session.runtimeReceipt.receiptId);
  assert.equal(loaded.checkpoint.lastEventHash, created.lastEventHash);
  assert.equal(loaded.events.length, 2);
});

test("public execution storage rejects duplicate run creation without a partial ledger", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  const request = {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T20:01:00.000Z",
  };
  createTransactionalExecutionRun(fixture.session, request);
  await assert.rejects(async () => createTransactionalExecutionRun(fixture.session, request), /TARGET_ALREADY_EXISTS/u);
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, 2);
});

test("public execution storage commits a result and its two ledger events once", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001", envelope: fixture.envelope, graph: fixture.graph,
    recordedAt: "2026-08-08T20:02:00.000Z",
  });
  let run = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const packet = buildExecutionTaskPacket(run.envelope, run.graph, "audit-controller", []);
  run = commitExecutionGraphTransition(fixture.session, {
    runId: run.runId, authority: authority(run), transition: { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
    evidenceRefs: [], taskId: packet.taskId, threadRef: null, reasonCode: null, recordedAt: "2026-08-08T20:02:01.000Z",
  });
  run = commitExecutionGraphTransition(fixture.session, {
    runId: run.runId, authority: authority(run), transition: { nodeId: "audit-controller", from: "DISPATCHING", to: "RUNNING" },
    evidenceRefs: [], taskId: packet.taskId, threadRef: "codex-agent:controller", reasonCode: null, recordedAt: "2026-08-08T20:02:02.000Z",
  });
  const result = parseExecutionResult({
    resultVersion: "2.0", runId: packet.runId, taskId: packet.taskId, nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash, graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION", reasonCode: null, summary: "Controller evidence was inspected.",
    claims: [{ claimId: "claim-controller", criterionId: "criterion-controller", statement: "Controller evidence is present.", state: "SUPPORTED", evidenceRefs: ["evidence-controller"] }],
    artifactRefs: [],
    evidenceRefs: [{ evidenceId: "evidence-controller", kind: "REPOSITORY_FILE", sourceId: "repo", sourceRevision: fixture.envelope.sourceRevision, locator: { path: "src/controller/types.ts", lineStart: 1, lineEnd: 2 }, sha256: null }],
    unknowns: [], conflicts: [], followupRequest: null, observedLimits: [],
  }, run.envelope.budget.maxResultBytes);
  const accepted = commitAcceptedExecutionResult(fixture.session, {
    runId: run.runId, authority: authority(run), result, threadRef: "codex-agent:controller", recordedAt: "2026-08-08T20:02:03.000Z",
  });
  assert.equal(accepted.run.events.length, 6);
  assert.equal(accepted.run.artifacts.length, 1);
  assert.equal(accepted.run.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "SUCCEEDED");
});

function authority(run: ReturnType<typeof loadTransactionalExecutionRun>): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId, fencingToken: run.fencingToken, runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash, expectedGraphRevision: run.graph.graphRevision,
  };
}

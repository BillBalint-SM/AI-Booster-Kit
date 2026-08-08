import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { buildExecutionTaskPacket } from "../src/execution/handoff.js";
import { evaluateExecutionResume } from "../src/execution/resume.js";
import { commitExecutionGraphTransition } from "../src/execution/persistence/mutations.js";
import type { ExecutionMutationAuthority } from "../src/execution/persistence/mutations.js";
import { createTransactionalExecutionRun, loadTransactionalExecutionRun } from "../src/execution/persistence/store.js";
import type { LoadedExecutionRun } from "../src/execution/types.js";
import { createCompletedExecutionRun } from "./helpers/completed-execution-run.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";

test("execution resume reads the transactional ledger and preserves an unknown active Codex thread", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001", envelope: fixture.envelope, graph: fixture.graph,
    recordedAt: "2026-08-08T20:10:00.000Z",
  });
  let run = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const packet = buildExecutionTaskPacket(run.envelope, run.graph, "audit-controller", []);
  run = commitExecutionGraphTransition(fixture.session, {
    runId: run.runId, authority: authority(run), transition: { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
    evidenceRefs: [], taskId: packet.taskId, threadRef: null, reasonCode: null, recordedAt: "2026-08-08T20:10:01.000Z",
  });
  run = commitExecutionGraphTransition(fixture.session, {
    runId: run.runId, authority: authority(run), transition: { nodeId: "audit-controller", from: "DISPATCHING", to: "RUNNING" },
    evidenceRefs: [], taskId: packet.taskId, threadRef: "codex-agent:controller", reasonCode: null, recordedAt: "2026-08-08T20:10:02.000Z",
  });
  assert.equal(evaluateExecutionResume(run, runtimeFor(run, [])).decision, "UNKNOWN");
  assert.equal(evaluateExecutionResume(run, runtimeFor(run, ["codex-agent:controller"])).decision, "RESUME");
  assert.equal(evaluateExecutionResume(run, { ...runtimeFor(run, []), sourceRevision: "b".repeat(40) }).decision, "STOPPED");
});

test("transactional finalization persists a supported handoff and rejects incomplete claims", async () => {
  const root = await mkdtemp(join(tmpdir(), "execution-finalized-"));
  try {
    const completed = await createCompletedExecutionRun(root, referenceEnvelopeInput, referenceGraphDraft);
    assert.equal(completed.finalHandoff?.state, "COMPLETE");
    assert.equal(completed.events.at(-1)?.eventType, "RUN_FINALIZED");
    const invalid = { ...completed.finalHandoff, claims: completed.finalHandoff?.claims.slice(1) };
    const { validateFinalExecutionHandoff } = await import("../src/execution/finalize.js");
    assert.throws(() => validateFinalExecutionHandoff(invalid, completed), /EXECUTION_ACCEPTANCE_INCOMPLETE|EXECUTION_FINAL_HANDOFF_INVALID/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runtimeFor(run: LoadedExecutionRun, availableThreadRefs: readonly string[]) {
  return { sourceRevision: run.envelope.sourceRevision, availableThreadRefs, activeThreadRefs: [], observedAt: "2026-08-08T20:11:00.000Z" };
}

function authority(run: LoadedExecutionRun): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId, fencingToken: run.fencingToken, runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash, expectedGraphRevision: run.graph.graphRevision,
  };
}

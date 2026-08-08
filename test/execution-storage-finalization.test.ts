import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { buildExecutionTaskPacket } from "../src/execution/handoff.js";
import {
  commitExecutionGraphTransition,
} from "../src/execution/persistence/mutations.js";
import type { ExecutionMutationAuthority } from "../src/execution/persistence/mutations.js";
import { commitAcceptedExecutionResult } from "../src/execution/persistence/results.js";
import {
  commitFinalExecutionHandoff,
  exportExecutionRunSnapshot,
} from "../src/execution/persistence/finalization.js";
import {
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import type {
  ExecutionResultEnvelope,
  ExecutionTaskPacket,
  FinalExecutionHandoff,
  TransactionalLoadedExecutionRun,
} from "../src/execution/types.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("finalization commits terminal event, JSON and Markdown artifacts, projection, quota, and reloadable view", async (context) => {
  const fixture = await completedRunFixture();
  context.after(fixture.cleanup);
  const handoff = completeHandoff(fixture.completed);
  const beforeEvents = fixture.completed.events.length;

  const committed = commitFinalExecutionHandoff(fixture.session, {
    runId: fixture.envelope.runId,
    authority: authorityFor(fixture.completed),
    handoff,
    recordedAt: "2026-08-08T16:20:00.000Z",
  });

  assert.equal(committed.events.length, beforeEvents + 1);
  assert.equal(committed.events.at(-1)?.eventType, "RUN_FINALIZED");
  assert.equal(committed.checkpoint.runState, "COMPLETE");
  assert.deepEqual(committed.finalHandoff, handoff);
  assert.deepEqual(
    committed.artifacts.slice(-2).map((artifact) => artifact.artifactId),
    ["final-handoff-json", "final-handoff-markdown"],
  );
  const reloaded = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.deepEqual(reloaded.finalHandoff, handoff);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    const rows = database.prepare<[string], { media_type: string; source_event_sequence: number }>(
      "SELECT media_type, source_event_sequence FROM artifacts WHERE run_id = ? AND node_id IS NULL ORDER BY artifact_id",
    ).all(fixture.envelope.runId);
    assert.deepEqual(rows.map((row) => row.source_event_sequence), [beforeEvents + 1, beforeEvents + 1]);
  });
});

test("invalid and duplicate finalization commit no second terminal prefix", async (context) => {
  const fixture = await completedRunFixture();
  context.after(fixture.cleanup);
  const handoff = completeHandoff(fixture.completed);
  const request = {
    runId: fixture.envelope.runId,
    authority: authorityFor(fixture.completed),
    handoff,
    recordedAt: "2026-08-08T16:21:00.000Z",
  };
  assert.throws(
    () => commitFinalExecutionHandoff(fixture.session, {
      ...request,
      handoff: { ...handoff, claims: handoff.claims.slice(1) },
    }),
    /EXECUTION_ACCEPTANCE_INCOMPLETE/u,
  );
  const committed = commitFinalExecutionHandoff(fixture.session, request);
  assert.throws(
    () => commitFinalExecutionHandoff(fixture.session, {
      ...request,
      authority: authorityFor(committed),
    }),
    /FINALIZATION_ALREADY_EXISTS|TERMINAL_RUN|TARGET_ALREADY_EXISTS/u,
  );
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, committed.events.length);
});

test("SQLite abort after final artifacts rolls back artifacts, event, projection, and quota", async (context) => {
  const fixture = await completedRunFixture();
  context.after(fixture.cleanup);
  const handoff = completeHandoff(fixture.completed);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.exec(`
      CREATE TRIGGER test_final_projection_abort
      BEFORE UPDATE ON run_projections
      BEGIN
        SELECT RAISE(ABORT, 'forced final projection failure');
      END;
    `);
  });
  assert.throws(
    () => commitFinalExecutionHandoff(fixture.session, {
      runId: fixture.envelope.runId,
      authority: authorityFor(fixture.completed),
      handoff,
      recordedAt: "2026-08-08T16:22:00.000Z",
    }),
    /EXECUTION_SQLITE_ERROR/u,
  );
  const preserved = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(preserved.events.length, fixture.completed.events.length);
  assert.equal(preserved.finalHandoff, null);
  assert.equal(preserved.artifacts.some((artifact) => artifact.artifactId.startsWith("final-handoff-")), false);
});

test("export is deterministic, snapshot-bound, non-mutating, and cannot overwrite", async (context) => {
  const fixture = await completedRunFixture();
  context.after(fixture.cleanup);
  const finalized = commitFinalExecutionHandoff(fixture.session, {
    runId: fixture.envelope.runId,
    authority: authorityFor(fixture.completed),
    handoff: completeHandoff(fixture.completed),
    recordedAt: "2026-08-08T16:23:00.000Z",
  });
  const databaseBefore = await fileDigest(fixture.session.databasePath);
  const firstDestination = join(fixture.root, "export-one");
  const secondDestination = join(fixture.root, "export-two");
  const common = {
    runId: fixture.envelope.runId,
    exportedAt: "2026-08-08T16:24:00.000Z",
  };
  const first = await exportExecutionRunSnapshot(fixture.session, { ...common, destinationDirectory: firstDestination });
  const second = await exportExecutionRunSnapshot(fixture.session, { ...common, destinationDirectory: secondDestination });

  assert.deepEqual(first, second);
  assert.equal(first.authority, "EXPORT_ONLY");
  assert.equal(first.workspaceId, fixture.session.workspaceId);
  assert.equal(first.runId, fixture.envelope.runId);
  assert.equal(first.ledgerHeadHash, finalized.checkpoint.lastEventHash);
  for (const file of first.files) {
    assert.deepEqual(await readFile(join(firstDestination, file.name)), await readFile(join(secondDestination, file.name)));
  }
  assert.equal(await fileDigest(fixture.session.databasePath), databaseBefore);
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, finalized.events.length);
  await assert.rejects(
    () => exportExecutionRunSnapshot(fixture.session, { ...common, destinationDirectory: firstDestination }),
    /TARGET_ALREADY_EXISTS/u,
  );
});

test("filesystem export failure leaves the committed run unchanged and returns no receipt", async (context) => {
  const fixture = await completedRunFixture();
  context.after(fixture.cleanup);
  const finalized = commitFinalExecutionHandoff(fixture.session, {
    runId: fixture.envelope.runId,
    authority: authorityFor(fixture.completed),
    handoff: completeHandoff(fixture.completed),
    recordedAt: "2026-08-08T16:25:00.000Z",
  });
  const blockingFile = join(fixture.root, "not-a-directory");
  await writeFile(blockingFile, "synthetic blocker", { flag: "wx" });
  const destination = join(blockingFile, "export");
  await assert.rejects(
    () => exportExecutionRunSnapshot(fixture.session, {
      runId: fixture.envelope.runId,
      destinationDirectory: destination,
      exportedAt: "2026-08-08T16:26:00.000Z",
    }),
    /EXPORT_FAILED|STORAGE_UNAVAILABLE/u,
  );
  await assert.rejects(() => access(destination));
  const preserved = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(preserved.events.length, finalized.events.length);
  assert.deepEqual(preserved.finalHandoff, finalized.finalHandoff);
});

async function completedRunFixture() {
  const fixture = await createTransactionalExecutionStoreFixture();
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T16:00:00.000Z",
  });
  let run = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  for (const [index, nodeId] of ["audit-controller", "audit-context", "checker", "synthesis"].entries()) {
    const packet = buildExecutionTaskPacket(run.envelope, run.graph, nodeId, []);
    run = commitExecutionGraphTransition(fixture.session, {
      runId: fixture.envelope.runId,
      authority: authorityFor(run),
      transition: { nodeId, from: "READY", to: "DISPATCHING" },
      evidenceRefs: [],
      taskId: packet.taskId,
      threadRef: null,
      reasonCode: null,
      recordedAt: `2026-08-08T16:0${index}:01.000Z`,
    });
    run = commitExecutionGraphTransition(fixture.session, {
      runId: fixture.envelope.runId,
      authority: authorityFor(run),
      transition: { nodeId, from: "DISPATCHING", to: "RUNNING" },
      evidenceRefs: [],
      taskId: packet.taskId,
      threadRef: `thread-${nodeId}`,
      reasonCode: null,
      recordedAt: `2026-08-08T16:0${index}:02.000Z`,
    });
    const result = resultFor(packet, run, nodeId);
    run = commitAcceptedExecutionResult(fixture.session, {
      runId: fixture.envelope.runId,
      authority: authorityFor(run),
      result,
      threadRef: `thread-${nodeId}`,
      recordedAt: `2026-08-08T16:0${index}:03.000Z`,
    }).run;
  }
  return { ...fixture, completed: run };
}

function resultFor(
  packet: ExecutionTaskPacket,
  run: TransactionalLoadedExecutionRun,
  nodeId: string,
): ExecutionResultEnvelope {
  const node = run.graph.nodes.find((entry) => entry.nodeId === nodeId);
  if (node === undefined) throw new Error("completed run fixture node is missing");
  const evidenceRefs = node.acceptanceCriterionIds.map((criterionId) => ({
    evidenceId: `evidence-${nodeId}-${criterionId.replace("criterion-", "")}`,
    kind: "REPOSITORY_FILE" as const,
    sourceId: "repo",
    sourceRevision: run.envelope.sourceRevision,
    locator: { path: `${node.scope[0]}/types.ts`, lineStart: 1, lineEnd: 1 },
    sha256: null,
  }));
  return {
    resultVersion: "2.0",
    runId: packet.runId,
    taskId: packet.taskId,
    nodeId,
    envelopeHash: packet.envelopeHash,
    graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION",
    reasonCode: null,
    summary: `Validated ${nodeId} evidence.`,
    claims: node.acceptanceCriterionIds.map((criterionId) => ({
      claimId: `claim-${nodeId}-${criterionId.replace("criterion-", "")}`,
      criterionId,
      statement: `Evidence supports ${criterionId}.`,
      state: "SUPPORTED" as const,
      evidenceRefs: [`evidence-${nodeId}-${criterionId.replace("criterion-", "")}`],
    })),
    artifactRefs: [],
    evidenceRefs,
    unknowns: [],
    conflicts: [],
    followupRequest: null,
    observedLimits: [],
  };
}

function completeHandoff(run: TransactionalLoadedExecutionRun): FinalExecutionHandoff {
  return {
    handoffVersion: "2.0",
    runId: run.envelope.runId,
    envelopeHash: run.envelope.envelopeHash,
    graphHash: run.graph.graphHash,
    state: "COMPLETE",
    summary: "The transactional reference execution completed with repository evidence.",
    claims: run.envelope.acceptanceCriteria.map((criterion) => ({
      claimId: `final-${criterion.criterionId.replace("criterion-", "")}`,
      criterionId: criterion.criterionId,
      statement: criterion.statement,
      state: "SUPPORTED",
      evidenceRefs: [evidenceForCriterion(run, criterion.criterionId)],
    })),
    evidenceRefs: run.evidenceRefs.map((evidence) => evidence.evidenceId),
    unknowns: [],
    limits: [],
    metrics: {
      elapsedMs: { state: "UNKNOWN", value: null },
      tokenUsage: { state: "UNKNOWN", value: null },
    },
    nextAction: "Review the exported final handoff.",
  };
}

function evidenceForCriterion(run: TransactionalLoadedExecutionRun, criterionId: string): string {
  const evidence = run.acceptedResults
    .flatMap((result) => result.claims)
    .find((claim) => claim.criterionId === criterionId)?.evidenceRefs[0];
  if (evidence === undefined) throw new Error("final handoff fixture evidence is missing");
  return evidence;
}

function authorityFor(run: TransactionalLoadedExecutionRun): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId,
    fencingToken: run.fencingToken,
    runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash,
    expectedGraphRevision: run.graph.graphRevision,
  };
}

async function fileDigest(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

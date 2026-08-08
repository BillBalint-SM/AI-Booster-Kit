import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { canonicalExecutionJson, executionDigest } from "../src/execution/identity.js";
import { currentExecutionProcessRuntimeObservation } from "../src/execution/runtime-receipt.js";
import {
  auditExecutionStorage,
  closeExecutionRecoverySession,
  openExecutionRecoverySession,
  rebuildExecutionProjections,
  reconcileExecutionControllerOwnership,
} from "../src/execution/persistence/recovery.js";
import {
  commitExecutionGraphTransition,
} from "../src/execution/persistence/mutations.js";
import {
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("recovery audit returns each closed disposition without changing database or logical digests", async (context) => {
  const cases = [
    { name: "healthy", expected: "HEALTHY" as const, mutate: (_path: string, _runId: string) => undefined, foreignOwner: false },
    { name: "projection", expected: "PROJECTION_REBUILD_REQUIRED" as const, mutate: projectionDivergence, foreignOwner: false },
    { name: "pending", expected: "PENDING_EFFECT_RECONCILIATION_REQUIRED" as const, mutate: pendingIntent, foreignOwner: false },
    { name: "ownership", expected: "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED" as const, mutate: (_path: string, _runId: string) => undefined, foreignOwner: true },
    { name: "corrupt", expected: "STORAGE_CORRUPT" as const, mutate: corruptArtifact, foreignOwner: false },
    { name: "integrity", expected: "STORAGE_CORRUPT" as const, mutate: integrityFailure, foreignOwner: false },
    { name: "workspace", expected: "STORAGE_CORRUPT" as const, mutate: foreignWorkspace, foreignOwner: false },
    { name: "unsupported", expected: "UNSUPPORTED_SCHEMA_OR_RUNTIME" as const, mutate: unsupportedSchema, foreignOwner: false },
  ];
  for (const recoveryCase of cases) {
    await context.test(recoveryCase.name, async (subcontext) => {
      const fixture = await createdRunFixture();
      subcontext.after(fixture.cleanup);
      recoveryCase.mutate(fixture.session.databasePath, fixture.envelope.runId);
      const recovery = await openExecutionRecoverySession(recoveryRequest(fixture, recoveryCase.foreignOwner));
      try {
        const audit = auditExecutionStorage(recovery);
        assert.equal(audit.disposition, recoveryCase.expected);
        assert.equal(audit.databaseSha256Before, audit.databaseSha256After);
        assert.equal(audit.logicalSha256Before, audit.logicalSha256After);
        assert.equal(audit.mutation, "NONE");
      } finally {
        closeExecutionRecoverySession(recovery);
      }
    });
  }
});

test("recovery path identity mismatch creates nothing and does not select another database", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const foreignWorkspace = `${fixture.workspaceRoot}-foreign`;
  await assert.rejects(
    () => openExecutionRecoverySession({
      ...recoveryRequest(fixture, false),
      workspaceRoot: foreignWorkspace,
    }),
    /EXECUTION_WORKSPACE_STORAGE_INVALID|EXECUTION_SQLITE_ERROR/u,
  );
});

test("recovery detects bad ledger, missing artifact, artifact digest mismatch, and unsupported stored runtime", async (context) => {
  const mutations = [badLedger, missingArtifact, corruptArtifact, unsupportedRuntimeReceipt];
  for (const mutate of mutations) {
    await context.test(mutate.name, async (subcontext) => {
      const fixture = await createdRunFixture();
      subcontext.after(fixture.cleanup);
      seedArtifact(fixture.session.databasePath, fixture.envelope.runId, fixture.session.runtimeReceipt.receiptId);
      mutate(fixture.session.databasePath, fixture.envelope.runId);
      const recovery = await openExecutionRecoverySession(recoveryRequest(fixture, false));
      try {
        const audit = auditExecutionStorage(recovery);
        assert.equal(
          audit.disposition,
          mutate === unsupportedRuntimeReceipt ? "UNSUPPORTED_SCHEMA_OR_RUNTIME" : "STORAGE_CORRUPT",
        );
      } finally {
        closeExecutionRecoverySession(recovery);
      }
    });
  }
});

test("projection rebuild consumes a matching audit and changes only derived state plus its receipt", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  projectionDivergence(fixture.session.databasePath, fixture.envelope.runId);
  const recovery = await openExecutionRecoverySession(recoveryRequest(fixture, false));
  const audit = auditExecutionStorage(recovery);
  closeExecutionRecoverySession(recovery);
  assert.equal(audit.disposition, "PROJECTION_REBUILD_REQUIRED");

  const receipt = rebuildExecutionProjections(fixture.session, {
    runId: fixture.envelope.runId,
    audit,
    recordedAt: "2026-08-08T17:10:00.000Z",
  });

  assert.equal(receipt.disposition, "PROJECTION_REBUILT");
  const loaded = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(loaded.checkpoint.runState, "READY");
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(database.prepare("SELECT count(*) AS count FROM recovery_audits").pluck().get(), 1);
    assert.equal(database.prepare("SELECT count(*) AS count FROM execution_events").pluck().get(), 2);
    assert.equal(database.prepare("SELECT count(*) AS count FROM artifacts").pluck().get(), 0);
  });
  assert.throws(
    () => rebuildExecutionProjections(fixture.session, {
      runId: fixture.envelope.runId,
      audit,
      recordedAt: "2026-08-08T17:10:01.000Z",
    }),
    /RECOVERY_IDENTITY_MISMATCH|TARGET_ALREADY_EXISTS/u,
  );
});

test("ownership reconciliation increments fencing once and permanently rejects the former authority", async (context) => {
  const fixture = await createdRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const recovery = await openExecutionRecoverySession(recoveryRequest(fixture, true));
  const audit = auditExecutionStorage(recovery);
  closeExecutionRecoverySession(recovery);
  assert.equal(audit.disposition, "CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED");

  const reconciled = reconcileExecutionControllerOwnership(fixture.session, {
    runId: fixture.envelope.runId,
    audit,
    controllerId: "controller-secondary-001",
    recordedAt: "2026-08-08T17:11:00.000Z",
  });
  assert.equal(reconciled.fencingToken, before.fencingToken + 1);
  assert.throws(
    () => commitExecutionGraphTransition(fixture.session, {
      runId: fixture.envelope.runId,
      authority: authorityFor(before),
      transition: { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
      evidenceRefs: [],
      taskId: "task-audit-controller",
      threadRef: null,
      reasonCode: null,
      recordedAt: "2026-08-08T17:11:01.000Z",
    }),
    /CONTROLLER_OWNERSHIP_RECONCILIATION_REQUIRED|STALE_FENCING_TOKEN/u,
  );
  const current = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const committed = commitExecutionGraphTransition(fixture.session, {
    runId: fixture.envelope.runId,
    authority: {
      controllerId: reconciled.controllerId,
      fencingToken: reconciled.fencingToken,
      runtimeReceiptId: fixture.session.runtimeReceipt.receiptId,
      expectedLedgerHead: current.checkpoint.lastEventHash,
      expectedGraphRevision: current.graph.graphRevision,
    },
    transition: { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
    evidenceRefs: [],
    taskId: "task-audit-controller",
    threadRef: null,
    reasonCode: null,
    recordedAt: "2026-08-08T17:11:02.000Z",
  });
  assert.equal(committed.events.length, 3);
});

async function createdRunFixture() {
  const fixture = await createTransactionalExecutionStoreFixture();
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T17:00:00.000Z",
  });
  return fixture;
}

function recoveryRequest(
  fixture: Awaited<ReturnType<typeof createdRunFixture>>,
  foreignOwner: boolean,
) {
  return {
    workspaceRoot: fixture.workspaceRoot,
    appDataRoot: fixture.appDataRoot,
    runtime: currentExecutionProcessRuntimeObservation(),
    controllerId: foreignOwner ? "controller-secondary-001" : "controller-primary-001",
    hostSessionId: foreignOwner ? "codex-foreign-session-001" : fixture.session.runtimeReceipt.hostSessionId,
    observedAt: "2026-08-08T17:05:00.000Z",
  };
}

function projectionDivergence(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    const row = database.prepare<[string], { checkpoint_json: string }>(
      "SELECT checkpoint_json FROM run_projections WHERE run_id = ?",
    ).get(runId);
    if (row === undefined) throw new Error("projection fixture is missing");
    const checkpoint = JSON.parse(row.checkpoint_json) as Record<string, unknown>;
    const impossible = { ...checkpoint, runState: "COMPLETE" };
    database.prepare("UPDATE run_projections SET checkpoint_json = ?, checkpoint_sha256 = ? WHERE run_id = ?").run(
      canonicalExecutionJson(impossible),
      executionDigest(impossible),
      runId,
    );
  });
}

function pendingIntent(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    const receipt = database.prepare<[string], { created_receipt_id: string }>("SELECT created_receipt_id FROM runs WHERE run_id = ?").get(runId);
    if (receipt === undefined) throw new Error("pending intent fixture run is missing");
    database.prepare(`
      INSERT INTO operation_intents (
        operation_id, run_id, operation_type, disposition, intent_event_sequence,
        receipt_json, receipt_sha256, runtime_receipt_id, fencing_token, created_at, updated_at
      ) VALUES (?, ?, ?, 'INTENDED', 2, NULL, NULL, ?, 1, ?, ?)
    `).run("operation-pending-001", runId, "SPAWN", receipt.created_receipt_id, "2026-08-08T17:01:00.000Z", "2026-08-08T17:01:00.000Z");
  });
}

function seedArtifact(databasePath: string, runId: string, receiptId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    const body = Buffer.from("synthetic artifact", "utf8");
    database.prepare(`
      INSERT OR IGNORE INTO artifacts (
        run_id, artifact_id, node_id, media_type, body, sha256, byte_length,
        source_event_sequence, runtime_receipt_id, fencing_token, created_at
      ) VALUES (?, 'synthetic-artifact', NULL, 'application/octet-stream', ?, ?, ?, 2, ?, 1, ?)
    `).run(runId, body, createHash("sha256").update(body).digest("hex"), body.byteLength, receiptId, "2026-08-08T17:01:00.000Z");
    database.prepare("UPDATE quota_usage SET artifact_bytes = ? WHERE run_id = ?").run(body.byteLength, runId);
  });
}

function corruptArtifact(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    const receipt = database.prepare<[string], { created_receipt_id: string }>("SELECT created_receipt_id FROM runs WHERE run_id = ?").get(runId);
    if (receipt === undefined) throw new Error("artifact corruption fixture run is missing");
    seedArtifact(databasePath, runId, receipt.created_receipt_id);
    database.prepare("UPDATE artifacts SET body = ? WHERE run_id = ? AND artifact_id = 'synthetic-artifact'").run(Buffer.from("corrupt", "utf8"), runId);
  });
}

function missingArtifact(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    database.prepare("DELETE FROM artifacts WHERE run_id = ? AND artifact_id = 'synthetic-artifact'").run(runId);
  });
}

function badLedger(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    database.exec("DROP TRIGGER execution_events_no_update");
    database.prepare("UPDATE execution_events SET event_hash = ? WHERE run_id = ? AND sequence = 2").run("f".repeat(64), runId);
  });
}

function unsupportedSchema(databasePath: string, _runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => { database.pragma("user_version = 999"); });
}

function integrityFailure(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    database.pragma("ignore_check_constraints = ON");
    database.prepare("UPDATE quota_usage SET event_count = -1 WHERE run_id = ?").run(runId);
  });
}

function foreignWorkspace(databasePath: string, _runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    database.prepare("UPDATE storage_metadata SET workspace_id = ? WHERE singleton = 1").run("0".repeat(32));
  });
}

function unsupportedRuntimeReceipt(databasePath: string, runId: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    database.exec("DROP TRIGGER runtime_receipts_no_update");
    const row = database.prepare<[string], { created_receipt_id: string }>("SELECT created_receipt_id FROM runs WHERE run_id = ?").get(runId);
    if (row === undefined) throw new Error("runtime receipt fixture is missing");
    const stored = database.prepare<[string], { canonical_json: string }>("SELECT canonical_json FROM runtime_receipts WHERE receipt_id = ?").get(row.created_receipt_id);
    if (stored === undefined) throw new Error("runtime receipt fixture row is missing");
    const receipt = JSON.parse(stored.canonical_json) as Record<string, unknown>;
    const node = receipt.node as Record<string, unknown>;
    const changed = { ...receipt, node: { ...node, version: "23.0.0", lts: false } };
    database.prepare("UPDATE runtime_receipts SET canonical_json = ?, receipt_sha256 = ? WHERE receipt_id = ?").run(
      canonicalExecutionJson(changed),
      executionDigest(changed),
      row.created_receipt_id,
    );
  });
}

function authorityFor(run: ReturnType<typeof loadTransactionalExecutionRun>) {
  return {
    controllerId: run.controllerId,
    fencingToken: run.fencingToken,
    runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash,
    expectedGraphRevision: run.graph.graphRevision,
  };
}

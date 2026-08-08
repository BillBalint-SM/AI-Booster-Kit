import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { test } from "node:test";

import { buildExecutionTaskPacket } from "../src/execution/handoff.js";
import { canonicalExecutionJson } from "../src/execution/identity.js";
import {
  commitExecutionGraphTransition,
} from "../src/execution/persistence/mutations.js";
import type { ExecutionMutationAuthority } from "../src/execution/persistence/mutations.js";
import {
  commitAcceptedExecutionResult,
  commitRejectedExecutionResult,
  commitTerminalExecutionResult,
} from "../src/execution/persistence/results.js";
import type {
  CommitAcceptedExecutionResultRequest,
  CommitTerminalExecutionResultRequest,
} from "../src/execution/persistence/results.js";
import {
  createTransactionalExecutionRun,
  loadTransactionalExecutionRun,
} from "../src/execution/persistence/store.js";
import type { ExecutionStoreSession } from "../src/execution/persistence/session.js";
import type { ExecutionStorageLimits } from "../src/execution/runtime-policy.js";
import type {
  ExecutionResultEnvelope,
  ExecutionTaskPacket,
} from "../src/execution/types.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("accepted result commits two events, canonical artifact, evidence, graph, quota, and lease", async (context) => {
  const fixture = await runningRunFixture();
  context.after(fixture.cleanup);
  const request = acceptedRequest(fixture);

  const committed = commitAcceptedExecutionResult(fixture.session, request);

  assert.equal(committed.run.events.length, 6);
  assert.deepEqual(committed.run.events.slice(-2).map((event) => event.eventType), ["NODE_RESULT_RECEIVED", "NODE_RESULT_ACCEPTED"]);
  assert.equal(committed.run.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "SUCCEEDED");
  assert.deepEqual(committed.run.checkpoint.acceptedEvidenceRefs, ["evidence-controller-types"]);
  assert.equal(committed.artifact.artifactId, "result-audit-controller");
  assert.equal(committed.artifact.sha256, createHash("sha256").update(canonicalExecutionJson(request.result)).digest("hex"));
  assert.deepEqual(committed.run.acceptedResults, [request.result]);
  assert.deepEqual(committed.run.evidenceRefs, request.result.evidenceRefs);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    const quota = database.prepare<[string], { event_count: number; artifact_bytes: number }>(
      "SELECT event_count, artifact_bytes FROM quota_usage WHERE run_id = ?",
    ).get(fixture.envelope.runId);
    assert.equal(quota?.event_count, 6);
    assert.equal(quota?.artifact_bytes, Buffer.byteLength(canonicalExecutionJson(request.result), "utf8"));
  });
});

test("STOPPED and UNKNOWN worker results become exact terminal node events", async (context) => {
  for (const status of ["STOPPED", "UNKNOWN"] as const) {
    await context.test(status, async (subcontext) => {
      const fixture = await runningRunFixture();
      subcontext.after(fixture.cleanup);
      const reasonCode = status === "STOPPED" ? "RESULT_STATUS_STOPPED" : "RESULT_STATUS_UNKNOWN";
      const request: CommitTerminalExecutionResultRequest = {
        ...acceptedRequest(fixture),
        result: { ...validResult(fixture.packet), status, reasonCode },
      };
      const committed = commitTerminalExecutionResult(fixture.session, request);
      assert.equal(committed.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, status);
      assert.deepEqual(
        committed.events.slice(-2).map((event) => event.eventType),
        status === "STOPPED" ? ["NODE_STOPPED", "RUN_STOPPED"] : ["NODE_UNKNOWN", "RUN_UNKNOWN"],
      );
      assert.equal(committed.events.at(-1)?.reasonCode, reasonCode);
      assert.equal(committed.checkpoint.runState, status);
      assert.deepEqual(committed.acceptedResults, []);
    });
  }
});

test("explicit rejection persists only the rejection event and projection", async (context) => {
  const fixture = await runningRunFixture();
  context.after(fixture.cleanup);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  const committed = commitRejectedExecutionResult(fixture.session, {
    runId: fixture.envelope.runId,
    authority: authorityFor(before),
    nodeId: "audit-controller",
    taskId: fixture.packet.taskId,
    threadRef: "thread-audit-controller",
    reasonCode: "CLAIM_UNSUPPORTED",
    recordedAt: "2026-08-08T15:03:00.000Z",
  });
  assert.equal(committed.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "REJECTED");
  assert.deepEqual(committed.events.slice(-2).map((event) => event.eventType), ["NODE_RESULT_REJECTED", "RUN_STOPPED"]);
  assert.equal(committed.checkpoint.runState, "STOPPED");
  assert.deepEqual(committed.artifacts, []);
});

test("duplicate result artifact and stale authority commit nothing", async (context) => {
  const fixture = await runningRunFixture();
  context.after(fixture.cleanup);
  const request = acceptedRequest(fixture);
  const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    const body = Buffer.from("x", "utf8");
    database.prepare(`
      INSERT INTO artifacts (
        run_id, artifact_id, node_id, media_type, body, sha256, byte_length,
        source_event_sequence, runtime_receipt_id, fencing_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fixture.envelope.runId,
      "result-audit-controller",
      "audit-controller",
      "application/octet-stream",
      body,
      createHash("sha256").update(body).digest("hex"),
      body.byteLength,
      4,
      fixture.session.runtimeReceipt.receiptId,
      before.fencingToken,
      "2026-08-08T15:03:30.000Z",
    );
    database.prepare("UPDATE quota_usage SET artifact_bytes = artifact_bytes + 1 WHERE run_id = ?").run(fixture.envelope.runId);
  });
  assert.throws(() => commitAcceptedExecutionResult(fixture.session, request), /TARGET_ALREADY_EXISTS/u);
  assert.throws(
    () => commitAcceptedExecutionResult(fixture.session, {
      ...request,
      authority: { ...request.authority, fencingToken: request.authority.fencingToken + 1 },
    }),
    /STALE_FENCING_TOKEN/u,
  );
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, 4);
});

test("SQLite abort after artifact insertion rolls back result, events, projection, and quota", async (context) => {
  const fixture = await runningRunFixture();
  context.after(fixture.cleanup);
  const request = acceptedRequest(fixture);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    database.exec(`
      CREATE TRIGGER test_result_projection_abort
      BEFORE UPDATE ON run_projections
      BEGIN
        SELECT RAISE(ABORT, 'forced result projection failure');
      END;
    `);
  });
  assert.throws(() => commitAcceptedExecutionResult(fixture.session, request), /EXECUTION_SQLITE_ERROR/u);
  const preserved = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  assert.equal(preserved.events.length, 4);
  assert.deepEqual(preserved.artifacts, []);
  assert.equal(preserved.graph.nodes.find((node) => node.nodeId === "audit-controller")?.state, "RUNNING");
});

test("forbidden result corpus is rejected before mutation without echoing content", async (context) => {
  const fixture = await runningRunFixture();
  context.after(fixture.cleanup);
  const corpus = [
    "access_token=synthetic-sensitive-marker",
    "password: synthetic-sensitive-marker",
    "cookie=synthetic-sensitive-marker",
    "authorization: Bearer synthetic-sensitive-marker",
    "raw prompt: synthetic-sensitive-marker",
    "raw transcript: synthetic-sensitive-marker",
    "hidden reasoning: synthetic-sensitive-marker",
    "{\"connector\":\"jira\",\"payload\":{\"marker\":\"synthetic-sensitive-marker\"}}",
    "PATH=C:\\synthetic-sensitive-marker\\bin; HOME=/synthetic-sensitive-marker",
    "C:\\Users\\synthetic-sensitive-marker\\private.txt",
    "synthetic-sensitive-marker@example.invalid",
  ];
  for (const summary of corpus) {
    const request = acceptedRequest(fixture);
    let error: unknown;
    try {
      commitAcceptedExecutionResult(fixture.session, { ...request, result: { ...request.result, summary } });
    } catch (caught) {
      error = caught;
    }
    assert.ok(error instanceof Error);
    assert.match(error.message, /CONTENT_FORBIDDEN|SENSITIVE_CONTENT/u);
    assert.equal(error.message.includes(summary), false);
    assert.equal(error.message.includes("synthetic-sensitive-marker"), false);
  }
  assert.equal(loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId).events.length, 4);
});

test("every result storage ceiling has baseline, exact-boundary, and one-unit-over behavior", async (context) => {
  const measuredFixture = await runningRunFixture();
  const measuredRequest = acceptedRequest(measuredFixture);
  const resultBytes = Buffer.byteLength(canonicalExecutionJson(measuredRequest.result), "utf8");
  const commandBytes = Buffer.byteLength(canonicalExecutionJson(measuredRequest), "utf8");
  const workspaceBytesBefore = statSync(measuredFixture.session.databasePath).size;
  commitAcceptedExecutionResult(measuredFixture.session, measuredRequest);
  const measured = withSqliteTestDatabase(measuredFixture.session.databasePath, (database) => database.prepare<
    [string],
    { event_count: number; ledger_bytes: number; artifact_bytes: number; last_transaction_bytes: number }
  >("SELECT event_count, ledger_bytes, artifact_bytes, last_transaction_bytes FROM quota_usage WHERE run_id = ?")
    .get(measuredFixture.envelope.runId));
  await measuredFixture.cleanup();
  if (measured === undefined) throw new Error("quota measurement fixture is missing");

  const ceilings: readonly [keyof ExecutionStorageLimits, number][] = [
    ["maxCommandInputBytes", commandBytes],
    ["maxResultEnvelopeBytes", resultBytes],
    ["maxArtifactBytes", resultBytes],
    ["maxTransactionPayloadBytes", measured.last_transaction_bytes],
    ["maxRunArtifactBytes", measured.artifact_bytes],
    ["maxLedgerBytes", measured.ledger_bytes],
    ["maxEventsPerRun", measured.event_count],
    ["maxWorkspaceBytes", workspaceBytesBefore + measured.last_transaction_bytes],
    ["maxCanonicalTextBytes", resultBytes],
    ["maxCanonicalBlobBytes", resultBytes],
  ];

  for (const [limit, exact] of ceilings) {
    await context.test(`${limit} exact`, async (subcontext) => {
      const fixture = await runningRunFixture();
      subcontext.after(fixture.cleanup);
      const request = acceptedRequest(fixture);
      const committed = commitAcceptedExecutionResult(sessionWithLimit(fixture.session, limit, exact), request);
      assert.equal(committed.run.events.length, 6);
    });
    await context.test(`${limit} over`, async (subcontext) => {
      const fixture = await runningRunFixture();
      subcontext.after(fixture.cleanup);
      const request = acceptedRequest(fixture);
      const before = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
      assert.throws(
        () => commitAcceptedExecutionResult(sessionWithLimit(fixture.session, limit, exact - 1), request),
        /RESULT_TOO_LARGE|ARTIFACT_TOO_LARGE|STORAGE_QUOTA_EXCEEDED/u,
      );
      const after = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
      assert.equal(after.events.length, before.events.length);
      assert.deepEqual(after.artifacts, before.artifacts);
      assert.equal(after.checkpoint.lastEventHash, before.checkpoint.lastEventHash);
    });
  }
});

async function runningRunFixture() {
  const fixture = await createTransactionalExecutionStoreFixture();
  const packet = buildExecutionTaskPacket(fixture.envelope, fixture.graph, "audit-controller", []);
  createTransactionalExecutionRun(fixture.session, {
    controllerId: "controller-primary-001",
    envelope: fixture.envelope,
    graph: fixture.graph,
    recordedAt: "2026-08-08T15:00:00.000Z",
  });
  let run = loadTransactionalExecutionRun(fixture.session, fixture.envelope.runId);
  run = commitExecutionGraphTransition(fixture.session, {
    runId: fixture.envelope.runId,
    authority: authorityFor(run),
    transition: { nodeId: "audit-controller", from: "READY", to: "DISPATCHING" },
    evidenceRefs: [],
    taskId: packet.taskId,
    threadRef: null,
    reasonCode: null,
    recordedAt: "2026-08-08T15:00:01.000Z",
  });
  run = commitExecutionGraphTransition(fixture.session, {
    runId: fixture.envelope.runId,
    authority: authorityFor(run),
    transition: { nodeId: "audit-controller", from: "DISPATCHING", to: "RUNNING" },
    evidenceRefs: [],
    taskId: packet.taskId,
    threadRef: "thread-audit-controller",
    reasonCode: null,
    recordedAt: "2026-08-08T15:00:02.000Z",
  });
  return { ...fixture, packet, running: run };
}

type RunningFixture = Awaited<ReturnType<typeof runningRunFixture>>;

function acceptedRequest(fixture: RunningFixture): CommitAcceptedExecutionResultRequest {
  return {
    runId: fixture.envelope.runId,
    authority: authorityFor(fixture.running),
    result: validResult(fixture.packet),
    threadRef: "thread-audit-controller",
    recordedAt: "2026-08-08T15:01:00.000Z",
  };
}

function authorityFor(run: ReturnType<typeof loadTransactionalExecutionRun>): ExecutionMutationAuthority {
  return {
    controllerId: run.controllerId,
    fencingToken: run.fencingToken,
    runtimeReceiptId: run.runtimeReceiptId,
    expectedLedgerHead: run.checkpoint.lastEventHash,
    expectedGraphRevision: run.graph.graphRevision,
  };
}

function validResult(packet: ExecutionTaskPacket): ExecutionResultEnvelope {
  return {
    resultVersion: "2.0",
    runId: packet.runId,
    taskId: packet.taskId,
    nodeId: packet.nodeId,
    envelopeHash: packet.envelopeHash,
    graphRevision: packet.graphRevision,
    status: "READY_FOR_VALIDATION",
    reasonCode: null,
    summary: "Controller contract evidence is available.",
    claims: [{
      claimId: "claim-controller",
      criterionId: "criterion-controller",
      statement: "Controller assets are traceable to repository evidence.",
      state: "SUPPORTED",
      evidenceRefs: ["evidence-controller-types"],
    }],
    artifactRefs: [],
    evidenceRefs: [{
      evidenceId: "evidence-controller-types",
      kind: "REPOSITORY_FILE",
      sourceId: "repo",
      sourceRevision: "a".repeat(40),
      locator: { path: "src/controller/types.ts", lineStart: 20, lineEnd: 30 },
      sha256: null,
    }],
    unknowns: [],
    conflicts: [],
    followupRequest: null,
    observedLimits: [],
  };
}

function sessionWithLimit(
  session: ExecutionStoreSession,
  limit: keyof ExecutionStorageLimits,
  value: number,
): ExecutionStoreSession {
  return {
    ...session,
    storagePolicy: {
      ...session.storagePolicy,
      limits: { ...session.storagePolicy.limits, [limit]: value },
    },
  };
}

import Database from "better-sqlite3";

interface CrashPayload {
  stage: "EVENT_INSERT" | "PROJECTION_UPDATE" | "ARTIFACT_INSERT" | "QUOTA_UPDATE" | "COMMIT";
  databasePath: string;
  runId: string;
  runtimeReceiptId: string;
  controllerId: string;
  fencingToken: number;
  event: {
    sequence: number;
    eventHash: string;
    previousEventHash: string;
    eventType: string;
    nodeId: string;
    canonicalJson: string;
    byteLength: number;
    recordedAt: string;
  };
  graphJson: string;
  graphSha256: string;
  checkpointJson: string;
  checkpointSha256: string;
  runState: string;
  graphRevision: number;
  artifactBodyBase64: string;
  artifactSha256: string;
  priorLedgerBytes: number;
  priorArtifactBytes: number;
}

process.send?.({ type: "READY" });
process.once("message", (message: unknown) => {
  if (!isStartMessage(message)) {
    process.exitCode = 2;
    return;
  }
  const payload = message.payload as CrashPayload;
  const database = new Database(payload.databasePath, { fileMustExist: true, timeout: 0 });
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = DELETE");
  database.pragma("synchronous = FULL");
  database.exec("BEGIN IMMEDIATE");
  database.prepare(`
    INSERT INTO execution_events (
      run_id, sequence, event_hash, previous_event_hash, event_type, node_id,
      canonical_json, byte_length, runtime_receipt_id, fencing_token, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.runId,
    payload.event.sequence,
    payload.event.eventHash,
    payload.event.previousEventHash,
    payload.event.eventType,
    payload.event.nodeId,
    payload.event.canonicalJson,
    payload.event.byteLength,
    payload.runtimeReceiptId,
    payload.fencingToken,
    payload.event.recordedAt,
  );
  crashAt(payload.stage, "EVENT_INSERT");
  database.prepare(`
    UPDATE run_projections
    SET graph_json = ?, graph_sha256 = ?, checkpoint_json = ?, checkpoint_sha256 = ?,
        derived_through_sequence = ?, derived_through_hash = ?, runtime_receipt_id = ?,
        fencing_token = ?, updated_at = ?
    WHERE run_id = ?
  `).run(
    payload.graphJson,
    payload.graphSha256,
    payload.checkpointJson,
    payload.checkpointSha256,
    payload.event.sequence,
    payload.event.eventHash,
    payload.runtimeReceiptId,
    payload.fencingToken,
    payload.event.recordedAt,
    payload.runId,
  );
  crashAt(payload.stage, "PROJECTION_UPDATE");
  const artifactBody = Buffer.from(payload.artifactBodyBase64, "base64");
  database.prepare(`
    INSERT INTO artifacts (
      run_id, artifact_id, node_id, media_type, body, sha256, byte_length,
      source_event_sequence, runtime_receipt_id, fencing_token, created_at
    ) VALUES (?, 'crash-boundary-artifact', ?, 'application/octet-stream', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.runId,
    payload.event.nodeId,
    artifactBody,
    payload.artifactSha256,
    artifactBody.byteLength,
    payload.event.sequence,
    payload.runtimeReceiptId,
    payload.fencingToken,
    payload.event.recordedAt,
  );
  crashAt(payload.stage, "ARTIFACT_INSERT");
  const lastTransactionBytes = payload.event.byteLength
    + Buffer.byteLength(payload.graphJson, "utf8")
    + Buffer.byteLength(payload.checkpointJson, "utf8")
    + artifactBody.byteLength;
  database.prepare(`
    UPDATE quota_usage
    SET event_count = ?, ledger_bytes = ?, artifact_bytes = ?,
        last_transaction_bytes = ?, updated_at = ?
    WHERE run_id = ?
  `).run(
    payload.event.sequence,
    payload.priorLedgerBytes + payload.event.byteLength,
    payload.priorArtifactBytes + artifactBody.byteLength,
    lastTransactionBytes,
    payload.event.recordedAt,
    payload.runId,
  );
  crashAt(payload.stage, "QUOTA_UPDATE");
  database.prepare(`
    UPDATE runs
    SET run_state = ?, ledger_head_sequence = ?, ledger_head_hash = ?,
        graph_revision = ?, updated_at = ?
    WHERE run_id = ?
  `).run(
    payload.runState,
    payload.event.sequence,
    payload.event.eventHash,
    payload.graphRevision,
    payload.event.recordedAt,
    payload.runId,
  );
  database.prepare(`
    UPDATE controller_leases
    SET last_mutation_at = ?
    WHERE run_id = ? AND controller_id = ? AND fencing_token = ?
  `).run(payload.event.recordedAt, payload.runId, payload.controllerId, payload.fencingToken);
  database.exec("COMMIT");
  crashAt(payload.stage, "COMMIT");
  process.exitCode = 3;
});

function crashAt(stage: CrashPayload["stage"], boundary: CrashPayload["stage"]): void {
  if (stage === boundary) process.kill(process.pid, "SIGKILL");
}

function isStartMessage(value: unknown): value is { type: "START"; payload: unknown } {
  return value !== null && typeof value === "object" && "type" in value && value.type === "START" && "payload" in value;
}

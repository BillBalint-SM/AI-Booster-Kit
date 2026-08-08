export const CURRENT_EXECUTION_STORAGE_SCHEMA_VERSION = 1 as const;

export const requiredExecutionTables = [
  "artifacts",
  "backup_receipts",
  "controller_leases",
  "execution_events",
  "import_receipts",
  "migration_receipts",
  "operation_intents",
  "quota_usage",
  "recovery_audits",
  "run_projections",
  "runs",
  "runtime_receipts",
  "storage_metadata",
] as const;

export const executionSchemaSql = `
CREATE TABLE storage_metadata (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  workspace_id TEXT NOT NULL UNIQUE,
  workspace_identity_sha256 TEXT NOT NULL CHECK (length(workspace_identity_sha256) = 64),
  runtime_policy_id TEXT NOT NULL,
  runtime_policy_sha256 TEXT NOT NULL CHECK (length(runtime_policy_sha256) = 64),
  storage_policy_id TEXT NOT NULL,
  storage_policy_sha256 TEXT NOT NULL CHECK (length(storage_policy_sha256) = 64),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE runtime_receipts (
  receipt_id TEXT PRIMARY KEY CHECK (length(receipt_id) = 64),
  session_id TEXT NOT NULL UNIQUE,
  lane TEXT NOT NULL CHECK (lane IN ('AUTHORITATIVE', 'CONFORMANCE_ONLY')),
  canonical_json TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  observed_at TEXT NOT NULL
) STRICT;

CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  envelope_json TEXT NOT NULL,
  envelope_sha256 TEXT NOT NULL CHECK (length(envelope_sha256) = 64),
  created_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  run_state TEXT NOT NULL,
  ledger_head_sequence INTEGER NOT NULL CHECK (ledger_head_sequence >= 0),
  ledger_head_hash TEXT,
  graph_revision INTEGER NOT NULL CHECK (graph_revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (ledger_head_hash IS NULL OR length(ledger_head_hash) = 64)
) STRICT;

CREATE TABLE controller_leases (
  run_id TEXT PRIMARY KEY REFERENCES runs(run_id),
  controller_id TEXT NOT NULL,
  fencing_token INTEGER NOT NULL CHECK (fencing_token >= 1),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  state TEXT NOT NULL CHECK (state IN ('ACTIVE', 'RECONCILIATION_REQUIRED')),
  acquired_at TEXT NOT NULL,
  last_mutation_at TEXT NOT NULL
) STRICT;

CREATE TABLE execution_events (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  event_hash TEXT NOT NULL CHECK (length(event_hash) = 64),
  previous_event_hash TEXT,
  event_type TEXT NOT NULL,
  node_id TEXT,
  canonical_json TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 1),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  fencing_token INTEGER NOT NULL CHECK (fencing_token >= 1),
  recorded_at TEXT NOT NULL,
  PRIMARY KEY (run_id, sequence),
  UNIQUE (run_id, event_hash),
  CHECK (previous_event_hash IS NULL OR length(previous_event_hash) = 64)
) STRICT;

CREATE TABLE run_projections (
  run_id TEXT PRIMARY KEY REFERENCES runs(run_id),
  graph_json TEXT NOT NULL,
  graph_sha256 TEXT NOT NULL CHECK (length(graph_sha256) = 64),
  checkpoint_json TEXT NOT NULL,
  checkpoint_sha256 TEXT NOT NULL CHECK (length(checkpoint_sha256) = 64),
  derived_through_sequence INTEGER NOT NULL CHECK (derived_through_sequence >= 1),
  derived_through_hash TEXT NOT NULL CHECK (length(derived_through_hash) = 64),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  fencing_token INTEGER NOT NULL CHECK (fencing_token >= 1),
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE artifacts (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  artifact_id TEXT NOT NULL,
  node_id TEXT,
  media_type TEXT NOT NULL,
  body BLOB NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  source_event_sequence INTEGER NOT NULL,
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  fencing_token INTEGER NOT NULL CHECK (fencing_token >= 1),
  created_at TEXT NOT NULL,
  PRIMARY KEY (run_id, artifact_id),
  FOREIGN KEY (run_id, source_event_sequence) REFERENCES execution_events(run_id, sequence)
) STRICT;

CREATE TABLE operation_intents (
  operation_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  operation_type TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK (disposition IN ('INTENDED', 'RECEIPTED', 'UNKNOWN')),
  intent_event_sequence INTEGER NOT NULL,
  receipt_json TEXT,
  receipt_sha256 TEXT,
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  fencing_token INTEGER NOT NULL CHECK (fencing_token >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (run_id, intent_event_sequence) REFERENCES execution_events(run_id, sequence),
  CHECK ((receipt_json IS NULL AND receipt_sha256 IS NULL) OR (receipt_json IS NOT NULL AND length(receipt_sha256) = 64))
) STRICT;

CREATE TABLE quota_usage (
  run_id TEXT PRIMARY KEY REFERENCES runs(run_id),
  event_count INTEGER NOT NULL CHECK (event_count >= 0),
  ledger_bytes INTEGER NOT NULL CHECK (ledger_bytes >= 0),
  artifact_bytes INTEGER NOT NULL CHECK (artifact_bytes >= 0),
  last_transaction_bytes INTEGER NOT NULL CHECK (last_transaction_bytes >= 0),
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE backup_receipts (
  backup_id TEXT PRIMARY KEY,
  destination_sha256 TEXT NOT NULL CHECK (length(destination_sha256) = 64),
  canonical_json TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  disposition TEXT NOT NULL CHECK (disposition IN ('VALID', 'INVALID')),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE migration_receipts (
  migration_id TEXT PRIMARY KEY,
  from_version INTEGER NOT NULL CHECK (from_version >= 1),
  to_version INTEGER NOT NULL CHECK (to_version > from_version),
  backup_id TEXT NOT NULL REFERENCES backup_receipts(backup_id),
  canonical_json TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  disposition TEXT NOT NULL CHECK (disposition IN ('SUCCEEDED', 'FAILED')),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE import_receipts (
  import_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES runs(run_id),
  source_identity_sha256 TEXT NOT NULL CHECK (length(source_identity_sha256) = 64),
  canonical_json TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE recovery_audits (
  audit_id TEXT PRIMARY KEY,
  disposition TEXT NOT NULL,
  database_sha256 TEXT NOT NULL CHECK (length(database_sha256) = 64),
  logical_sha256 TEXT NOT NULL CHECK (length(logical_sha256) = 64),
  canonical_json TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  runtime_receipt_id TEXT NOT NULL REFERENCES runtime_receipts(receipt_id),
  observed_at TEXT NOT NULL,
  consumed_at TEXT
) STRICT;

CREATE TRIGGER execution_events_no_update
BEFORE UPDATE ON execution_events
BEGIN
  SELECT RAISE(ABORT, 'execution events are append-only');
END;

CREATE TRIGGER execution_events_no_delete
BEFORE DELETE ON execution_events
BEGIN
  SELECT RAISE(ABORT, 'execution events are append-only');
END;

CREATE TRIGGER runtime_receipts_no_update
BEFORE UPDATE ON runtime_receipts
BEGIN
  SELECT RAISE(ABORT, 'runtime receipts are immutable');
END;

CREATE TRIGGER runtime_receipts_no_delete
BEFORE DELETE ON runtime_receipts
BEGIN
  SELECT RAISE(ABORT, 'runtime receipts are immutable');
END;

PRAGMA user_version = 1;
`;

export const executionPreparedSql = {
  selectStorageMetadata: "SELECT * FROM storage_metadata WHERE singleton = 1",
  selectRuntimeReceipt: "SELECT * FROM runtime_receipts WHERE receipt_id = ?",
  selectRun: "SELECT * FROM runs WHERE run_id = ?",
  selectProjection: "SELECT * FROM run_projections WHERE run_id = ?",
  selectEvents: "SELECT * FROM execution_events WHERE run_id = ? ORDER BY sequence",
  selectArtifacts: "SELECT * FROM artifacts WHERE run_id = ? ORDER BY artifact_id",
} as const;

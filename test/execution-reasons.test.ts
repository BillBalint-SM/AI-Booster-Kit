import assert from "node:assert/strict";
import { test } from "node:test";

import {
  executionReason,
  executionReasonCodes,
  executionReasonRegistry,
  parseExecutionReasonCode,
} from "../src/execution/reasons.js";

const expectedReasonCodes = [
  "COMMAND_ARGUMENTS_INVALID",
  "INPUT_JSON_INVALID",
  "ENVELOPE_INVALID",
  "GRAPH_INVALID",
  "TARGET_ALREADY_EXISTS",
  "SOURCE_REVISION_MISMATCH",
  "WORKTREE_DIRTY_IN_SCOPE",
  "WORKSPACE_IDENTITY_MISMATCH",
  "SOURCE_UNREADABLE",
  "HOST_PROFILE_UNSUPPORTED",
  "HOST_CAPABILITY_UNKNOWN",
  "HOST_INSTRUCTION_STATE_UNKNOWN",
  "AUTHORITY_NOT_PROVEN",
  "SPAWN_REJECTED",
  "SPAWN_FAILED_CONFIRMED",
  "SPAWN_OUTCOME_UNKNOWN",
  "AGENT_ID_MISSING",
  "AGENT_ID_MISMATCH",
  "WRONG_AGENT_ROUTE",
  "UNAUTHORIZED_DELEGATION",
  "DISPATCH_BUDGET_EXHAUSTED",
  "PARALLELISM_EXHAUSTED",
  "DISPATCH_IDENTITY_CONFLICT",
  "DISPATCH_OUTCOME_UNKNOWN",
  "DUPLICATE_DISPATCH",
  "LATE_RESULT",
  "DUPLICATE_RESULT",
  "RESULT_TOO_LARGE",
  "RESULT_JSON_INVALID",
  "RESULT_FIELDS_INVALID",
  "RESULT_FOREIGN",
  "RESULT_STALE",
  "RESULT_STATUS_STOPPED",
  "RESULT_STATUS_UNKNOWN",
  "RESULT_IDENTITY_UNRESOLVED",
  "RESULT_CONFLICT",
  "EVIDENCE_MISSING",
  "EVIDENCE_HASH_MISMATCH",
  "EVIDENCE_PATH_MISSING",
  "EVIDENCE_LINE_INVALID",
  "EVIDENCE_SCOPE_VIOLATION",
  "CLAIM_UNSUPPORTED",
  "CONTENT_FORBIDDEN",
  "WALL_CLOCK_EXPIRED",
  "WAIT_TIMEOUT_CONFIRMED_ACTIVE",
  "WAIT_TIMEOUT_THREAD_UNKNOWN",
  "REPAIR_BUDGET_EXHAUSTED",
  "NODE_BUDGET_EXHAUSTED",
  "REPAIR_SCOPE_VIOLATION",
  "USER_CANCEL_REQUESTED",
  "USER_CANCELLED_BEFORE_DISPATCH",
  "INTERRUPT_CONFIRMED",
  "INTERRUPT_FAILED",
  "INTERRUPT_OUTCOME_UNKNOWN",
  "LATE_RESULT_AFTER_CANCEL",
  "WRITER_CONFLICT",
  "PARTIAL_MUTATION",
  "LEDGER_CORRUPT",
  "SNAPSHOT_DIVERGED",
  "MANIFEST_DIVERGED",
  "PENDING_REPLACEMENT",
  "STORAGE_UNAVAILABLE",
  "PARTIAL_FINALIZATION",
  "TERMINAL_RUN",
  "ACTIVE_THREAD_MISSING",
  "RUNTIME_EVIDENCE_STALE",
  "RECOVERY_IDENTITY_MISMATCH",
  "NO_RESUMABLE_WORK",
  "CROSS_SESSION_THREAD_UNPROVEN",
  "FINALIZATION_PRECONDITION_FAILED",
  "FINALIZATION_ALREADY_EXISTS",
  "RUNS_NOT_COMPARABLE",
  "TERMINAL_LEDGER_MISSING",
  "PATH_ESCAPE",
  "SYMLINK_BOUNDARY",
  "SENSITIVE_CONTENT",
  "AUTHORITY_EXCEEDED",
  "PERMISSION_DENIED",
  "UNTRUSTED_INSTRUCTION",
  "UNSUPPORTED_SCHEMA_VERSION",
  "UNSUPPORTED_RUNTIME_VERSION",
  "OPERATOR_PROTOCOL_VIOLATION",
  "CLOCK_INVALID",
  "UNCLASSIFIED_PREPARATION_OUTCOME",
  "UNCLASSIFIED_DISPATCH_OUTCOME",
  "UNCLASSIFIED_RESULT_OUTCOME",
  "UNCLASSIFIED_FINALIZATION_OUTCOME",
] as const;

test("execution reason registry is closed and every definition is actionable", () => {
  assert.deepEqual(executionReasonCodes, expectedReasonCodes);
  assert.deepEqual(Object.keys(executionReasonRegistry), [...expectedReasonCodes]);

  const definitions = Object.values(executionReasonRegistry);
  assert.equal(definitions.length, new Set(definitions.map((entry) => entry.code)).size);
  for (const definition of definitions) {
    assert.notEqual(definition.phase, "");
    assert.notEqual(definition.subject, "");
    assert.notEqual(definition.determinacy, "");
    assert.notEqual(definition.disposition, "");
    assert.notEqual(definition.retryPolicy, "");
    assert.ok(Array.isArray(definition.requiredEvidenceFields));
    assert.ok(Array.isArray(definition.forbiddenEvidenceFields));
    assert.ok(Array.isArray(definition.allowedNodeStates));
    assert.ok(Array.isArray(definition.allowedRunStates));
    assert.notEqual(definition.operatorAction, "");
  }

  assert.equal(executionReason("RESULT_STATUS_STOPPED").disposition, "STOP_KNOWN");
  assert.equal(executionReason("RESULT_STATUS_UNKNOWN").disposition, "MARK_UNKNOWN");
  assert.equal(executionReason("COMMAND_ARGUMENTS_INVALID").disposition, "REJECT_INPUT");
  assert.throws(() => parseExecutionReasonCode("ARBITRARY_REASON"), /EXECUTION_REASON_CODE_INVALID/);
});

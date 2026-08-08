import assert from "node:assert/strict";
import { test } from "node:test";

import { createExecutionEvent, parseExecutionEvent } from "../src/execution/ledger.js";

const priorHash = "a".repeat(64);
const recordedAt = "2026-08-08T10:00:00.000Z";

test("execution ledger rejects an unregistered reason code", () => {
  assert.throws(
    () => createExecutionEvent(
      {
        runId: "run-codex-audit-multi",
        eventType: "NODE_STOPPED",
        nodeId: "audit-controller",
        beforeState: "RUNNING",
        afterState: "STOPPED",
        graphRevision: 1,
        evidenceRefs: [],
        taskId: "task-audit-controller",
        threadRef: "codex-agent:controller",
        reasonCode: "ARBITRARY_REASON" as never,
      },
      3,
      priorHash,
      recordedAt,
    ),
    /EXECUTION_REASON_CODE_INVALID/,
  );
});

test("execution ledger accepts the registered running-to-unknown node event", () => {
  const event = createExecutionEvent(
    {
      runId: "run-codex-audit-multi",
      eventType: "NODE_UNKNOWN",
      nodeId: "audit-controller",
      beforeState: "RUNNING",
      afterState: "UNKNOWN",
      graphRevision: 1,
      evidenceRefs: [],
      taskId: "task-audit-controller",
      threadRef: "codex-agent:controller",
      reasonCode: "RESULT_STATUS_UNKNOWN",
    },
    3,
    priorHash,
    recordedAt,
  );

  assert.equal(parseExecutionEvent(event).eventType, "NODE_UNKNOWN");
});

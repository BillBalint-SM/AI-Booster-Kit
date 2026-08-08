import assert from "node:assert/strict";
import { test } from "node:test";

import { executionReasonCodes } from "../src/execution/reasons.js";
import {
  assertExecutionNodeTransition,
  assertExecutionRunMutable,
  decideExecutionTransition,
  executionNodeStates,
  executionRunStates,
} from "../src/execution/semantics.js";

test("required worker stop and unknown can never become success", () => {
  assert.deepEqual(
    decideExecutionTransition({
      reasonCode: "RESULT_STATUS_STOPPED",
      nodeRequired: true,
      nodeState: "RUNNING",
      runState: "RUNNING",
    }),
    {
      outcome: "STOPPED",
      nextNodeState: "STOPPED",
      nextRunState: "STOPPED",
      mutation: "NODE_AND_RUN",
      reconciliationRequired: false,
    },
  );
  assert.deepEqual(
    decideExecutionTransition({
      reasonCode: "RESULT_STATUS_UNKNOWN",
      nodeRequired: true,
      nodeState: "RUNNING",
      runState: "RUNNING",
    }),
    {
      outcome: "UNKNOWN",
      nextNodeState: "UNKNOWN",
      nextRunState: "UNKNOWN",
      mutation: "NODE_AND_RUN",
      reconciliationRequired: true,
    },
  );
});

test("optional worker stop terminalizes only the node", () => {
  assert.deepEqual(
    decideExecutionTransition({
      reasonCode: "RESULT_STATUS_STOPPED",
      nodeRequired: false,
      nodeState: "RUNNING",
      runState: "RUNNING",
    }),
    {
      outcome: "STOPPED",
      nextNodeState: "STOPPED",
      nextRunState: "RUNNING",
      mutation: "NODE",
      reconciliationRequired: false,
    },
  );
});

test("terminal execution runs reject mutation without changing state", () => {
  for (const state of ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"] as const) {
    assert.throws(() => assertExecutionRunMutable(state), /TERMINAL_RUN/);
  }
  for (const state of ["PREPARED", "READY", "RUNNING", "WAITING_FOR_HUMAN"] as const) {
    assert.doesNotThrow(() => assertExecutionRunMutable(state));
  }
});

test("execution node transitions include dispatch intent and remain terminal once terminal", () => {
  assert.doesNotThrow(() => assertExecutionNodeTransition("READY", "DISPATCHING"));
  assert.doesNotThrow(() => assertExecutionNodeTransition("DISPATCHING", "RUNNING"));
  assert.doesNotThrow(() => assertExecutionNodeTransition("RUNNING", "UNKNOWN"));
  assert.throws(() => assertExecutionNodeTransition("UNKNOWN", "SUCCEEDED"), /OPERATOR_PROTOCOL_VIOLATION/);
});

test("execution transition reducer is total over registered reasons and states", () => {
  for (const reasonCode of executionReasonCodes) {
    for (const nodeState of [null, ...executionNodeStates]) {
      for (const runState of [null, ...executionRunStates]) {
        for (const nodeRequired of [null, false, true]) {
          try {
            const decision = decideExecutionTransition({ reasonCode, nodeRequired, nodeState, runState });
            assert.notEqual(decision.outcome, undefined);
            if (reasonCode === "RESULT_STATUS_STOPPED" || reasonCode === "RESULT_STATUS_UNKNOWN") {
              assert.notEqual(decision.nextNodeState, "SUCCEEDED");
            }
          } catch (error) {
            assert.match(String(error), /OPERATOR_PROTOCOL_VIOLATION|TERMINAL_RUN/);
          }
        }
      }
    }
  }
});

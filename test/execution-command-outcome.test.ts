import assert from "node:assert/strict";
import { test } from "node:test";

import { acceptedExecutionCommand, rejectedExecutionCommand } from "../src/execution/command-outcome.js";

test("command rejection never claims a persisted run state", () => {
  assert.deepEqual(rejectedExecutionCommand("COMMAND_ARGUMENTS_INVALID"), {
    operation: "REJECTED",
    mutation: "NONE",
    error: { code: "COMMAND_ARGUMENTS_INVALID" },
  });
  assert.deepEqual(acceptedExecutionCommand("READY", { runId: "run-command-outcome" }), {
    operation: "ACCEPTED",
    state: "READY",
    runId: "run-command-outcome",
  });
});

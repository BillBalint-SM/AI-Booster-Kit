import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { currentExecutionProcessRuntimeObservation } from "../src/execution/runtime-receipt.js";
import { closeExecutionStoreSession, openExecutionStoreSession } from "../src/execution/persistence/session.js";
import { readExecutionRecoverySnapshot } from "../src/execution/persistence/sqlite-adapter.js";

test("actual runtime lane matches the independently observed and persisted runtime receipt", async () => {
  const expected = expectedLane(process.env.EXECUTION_EXPECTED_RUNTIME_LANE);
  const root = await mkdtemp(join(tmpdir(), "execution-runtime-lane-"));
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "app-data");
  await mkdir(workspaceRoot);
  await mkdir(appDataRoot);
  try {
    const observation = currentExecutionProcessRuntimeObservation();
    const session = await openExecutionStoreSession({
      workspaceRoot,
      appDataRoot,
      runtime: observation,
      kernelRevision: "e".repeat(40),
      dependencyLockPath: resolve("package-lock.json"),
      sessionId: "runtime-lane-session-001",
      hostSessionId: "runtime-lane-host-001",
      observedAt: "2026-08-08T22:00:00.000Z",
    });
    try {
      const stored = readExecutionRecoverySnapshot(session.database).runtimeReceipts.find((receipt) => receipt.receipt_id === session.runtimeReceipt.receiptId);
      assert.notEqual(stored, undefined);
      assert.equal(session.runtimeReceipt.node.version, observation.nodeVersion);
      assert.equal(session.runtimeReceipt.node.lts, observation.ltsName);
      assert.equal(stored?.lane, session.runtimeReceipt.lane);
      if (expected !== null) assert.equal(session.runtimeReceipt.lane, expected);
    } finally {
      closeExecutionStoreSession(session);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function expectedLane(value: string | undefined): "AUTHORITATIVE" | "CONFORMANCE_ONLY" | null {
  if (value === undefined) return null;
  if (value === "AUTHORITATIVE" || value === "CONFORMANCE_ONLY") return value;
  throw new Error("EXECUTION_EXPECTED_RUNTIME_LANE must be AUTHORITATIVE or CONFORMANCE_ONLY when set");
}

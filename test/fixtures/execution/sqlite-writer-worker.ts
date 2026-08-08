import { commitExecutionGraphTransition } from "../../../src/execution/persistence/mutations.js";
import type { CommitExecutionGraphTransitionRequest } from "../../../src/execution/persistence/mutations.js";
import { openExistingExecutionSqliteDatabase } from "../../../src/execution/persistence/sqlite-adapter.js";
import type { ExecutionStoreSession } from "../../../src/execution/persistence/session.js";
import type { ExecutionRuntimeReceipt } from "../../../src/execution/runtime-receipt.js";
import type { ExecutionStoragePolicy } from "../../../src/execution/runtime-policy.js";

interface WorkerPayload {
  session: {
    workspaceId: string;
    workspaceIdentityDigest: string;
    databasePath: string;
    runtimeReceipt: ExecutionRuntimeReceipt;
    storagePolicy: ExecutionStoragePolicy;
  };
  request: CommitExecutionGraphTransitionRequest;
}

process.send?.({ type: "READY" });
process.once("message", (message: unknown) => {
  if (!isStartMessage(message)) {
    process.send?.({ type: "RESULT", ok: false, code: "INVALID_WORKER_MESSAGE" });
    process.exitCode = 1;
    return;
  }
  const payload = message.payload as WorkerPayload;
  const database = openExistingExecutionSqliteDatabase({
    databasePath: payload.session.databasePath,
    storagePolicy: payload.session.storagePolicy,
  });
  const session: ExecutionStoreSession = { ...payload.session, database };
  try {
    commitExecutionGraphTransition(session, payload.request);
    process.send?.({ type: "RESULT", ok: true });
  } catch (error) {
    process.send?.({ type: "RESULT", ok: false, code: contractCode(error) });
  } finally {
    database.close();
  }
});

function isStartMessage(value: unknown): value is { type: "START"; payload: unknown } {
  return value !== null && typeof value === "object" && "type" in value && value.type === "START" && "payload" in value;
}

function contractCode(error: unknown): string {
  if (error instanceof Error) return error.message.split(":", 1)[0] ?? "UNKNOWN";
  return "UNKNOWN";
}

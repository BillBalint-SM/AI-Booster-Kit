import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createExecutionGraph } from "../../src/execution/graph.js";
import { currentExecutionProcessRuntimeObservation } from "../../src/execution/runtime-receipt.js";
import {
  closeExecutionStoreSession,
  openExecutionStoreSession,
} from "../../src/execution/persistence/session.js";
import { createExecutionEnvelope } from "../../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./execution-fixtures.js";

export async function createTransactionalExecutionStoreFixture() {
  const root = await mkdtemp(join(tmpdir(), "transactional-execution-store-"));
  const workspaceRoot = join(root, "workspace");
  const appDataRoot = join(root, "app-data");
  await mkdir(workspaceRoot);
  await mkdir(appDataRoot);
  const session = await openExecutionStoreSession({
    workspaceRoot,
    appDataRoot,
    runtime: currentExecutionProcessRuntimeObservation(),
    kernelRevision: "d".repeat(40),
    dependencyLockPath: resolve("package-lock.json"),
    sessionId: "session-transactional-store-001",
    hostSessionId: "codex-session-transactional-store-001",
    observedAt: "2026-08-08T13:50:00.000Z",
  });
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);
  return {
    root,
    workspaceRoot,
    appDataRoot,
    session,
    envelope,
    graph,
    async cleanup() {
      closeExecutionStoreSession(session);
      await rm(root, { recursive: true, force: true });
    },
  };
}

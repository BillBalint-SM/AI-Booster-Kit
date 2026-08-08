import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createExecutionGraph } from "../../src/execution/graph.js";
import { currentExecutionProcessRuntimeObservation } from "../../src/execution/runtime-receipt.js";
import { createTransactionalExecutionRun, loadTransactionalExecutionRun } from "../../src/execution/persistence/store.js";
import {
  closeExecutionStoreSession,
  openExecutionStoreSession,
} from "../../src/execution/persistence/session.js";
import { createExecutionEnvelope } from "../../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./execution-fixtures.js";
import { createExecutionGitFixture } from "./execution-git-fixture.js";

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

export async function createBindingExecutionStoreFixture() {
  const gitFixture = await createExecutionGitFixture();
  const hostSessionId = "c".repeat(64);
  const session = await openExecutionStoreSession({
    workspaceRoot: gitFixture.workspaceRoot,
    appDataRoot: gitFixture.appDataRoot,
    runtime: currentExecutionProcessRuntimeObservation(),
    kernelRevision: gitFixture.revision,
    dependencyLockPath: resolve("package-lock.json"),
    sessionId: "session-binding-execution-001",
    hostSessionId,
    observedAt: "2026-08-08T22:20:00.000Z",
  });
  const envelope = createExecutionEnvelope({
    ...referenceEnvelopeInput,
    runId: "run-binding-execution",
    scope: ["src", "docs"],
    sourceRevision: gitFixture.revision,
    sources: [{ sourceId: "source-main", kind: "REPOSITORY", locator: "synthetic-workspace", sourceRevision: gitFixture.revision }],
  });
  const graph = createExecutionGraph({
    graphId: "graph-binding-execution",
    runId: envelope.runId,
    nodes: [
      {
        ...referenceGraphDraft.nodes[0]!,
        nodeId: "binding-agent",
        state: "PENDING",
        scope: ["src", "docs"],
        sourceIds: ["source-main"],
      },
      {
        ...referenceGraphDraft.nodes[0]!,
        nodeId: "binding-check",
        type: "DETERMINISTIC_CHECK",
        state: "PENDING",
        scope: ["src"],
        sourceIds: ["source-main"],
      },
    ],
    edges: [],
  }, envelope);
  createTransactionalExecutionRun(session, {
    controllerId: "controller-binding-001",
    envelope,
    graph,
    recordedAt: "2026-08-08T22:20:01.000Z",
  });
  return {
    ...gitFixture,
    session,
    run: loadTransactionalExecutionRun(session, envelope.runId),
    hostSessionId,
    async cleanup() {
      closeExecutionStoreSession(session);
      await gitFixture.cleanup();
    },
  };
}

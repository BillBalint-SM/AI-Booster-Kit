import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compareExecutionRuns } from "../src/execution/compare.js";
import type { ExecutionEnvelopeInput, ExecutionGraphDraft } from "../src/execution/types.js";
import { createCompletedExecutionRun } from "./helpers/completed-execution-run.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";

test("execution comparison compares supported evidence and agent overhead without fabricating host metrics", async () => {
  await withTemporaryDirectory(async (root) => {
    const singleRun = await createCompletedExecutionRun(root, singleEnvelopeInput(), singleGraphDraft());
    const multiRun = await createCompletedExecutionRun(root, multiEnvelopeInput(), multiGraphDraft());

    const report = compareExecutionRuns(singleRun, multiRun);

    assert.equal(report.comparable, true);
    assert.equal(report.goalIdentityMatch, true);
    assert.deepEqual(report.metrics.tokenUsage, { single: null, multi: null, state: "UNKNOWN" });
    assert.equal(report.metrics.dispatchCount.single, 0);
    assert.equal(report.metrics.dispatchCount.multi, 3);
  });
});

test("execution comparison rejects a changed source revision", async () => {
  await withTemporaryDirectory(async (root) => {
    const singleRun = await createCompletedExecutionRun(root, singleEnvelopeInput(), singleGraphDraft());
    const multiRun = await createCompletedExecutionRun(root, multiEnvelopeInput(), multiGraphDraft());

    assert.throws(() => compareExecutionRuns(singleRun, { ...multiRun, envelope: { ...multiRun.envelope, sourceRevision: "b".repeat(40) } }), /EXECUTION_RUNS_NOT_COMPARABLE/);
  });
});

function singleEnvelopeInput(): ExecutionEnvelopeInput {
  return { ...referenceEnvelopeInput, runId: "run-codex-audit-single" };
}

function multiEnvelopeInput(): ExecutionEnvelopeInput {
  return { ...referenceEnvelopeInput, runId: "run-codex-audit-multi2" };
}

function singleGraphDraft(): ExecutionGraphDraft {
  return {
    graphId: "graph-codex-audit-single",
    runId: "run-codex-audit-single",
    nodes: [
      {
        nodeId: "single-synthesis",
        type: "SYNTHESIS",
        required: true,
        state: "PENDING",
        objective: "Produce a single-task reference handoff from repository evidence.",
        role: "main-task-synthesis",
        repairOf: null,
        scope: [...referenceEnvelopeInput.scope],
        prohibitedActions: ["repository writes", "external sources", "agent spawning"],
        contextRefs: [],
        sourceIds: ["repo"],
        toolScope: ["FILESYSTEM_READ"],
        acceptanceCriterionIds: referenceEnvelopeInput.acceptanceCriteria.map((criterion) => criterion.criterionId),
      },
    ],
    edges: [],
  };
}

function multiGraphDraft(): ExecutionGraphDraft {
  return {
    ...referenceGraphDraft,
    graphId: "graph-codex-audit-multi2",
    runId: "run-codex-audit-multi2",
  };
}

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "ai-booster-execution-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

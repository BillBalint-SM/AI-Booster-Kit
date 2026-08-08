import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";

import { createExecutionGraph } from "../src/execution/graph.js";
import { createExecutionEnvelope } from "../src/execution/validation.js";
import type { ExecutionEnvelopeInput, ExecutionGraphDraft } from "../src/execution/types.js";

const scriptPath = resolve(process.cwd(), "scripts/create-codex-native-reference-preparation.mjs");
const sourceRevision = "b".repeat(40);

test("reference adapter: creates comparable single and multi preparations", () => {
  const single = runReferenceAdapter("SINGLE_AGENT", "run-reference-single", sourceRevision, "AI Booster Kit");
  const multi = runReferenceAdapter("MULTI_AGENT", "run-reference-multi", sourceRevision, "AI Booster Kit");

  const singleEnvelope = createExecutionEnvelope(single.envelope);
  const multiEnvelope = createExecutionEnvelope(multi.envelope);
  const singleGraph = createExecutionGraph(single.graph, singleEnvelope);
  const multiGraph = createExecutionGraph(multi.graph, multiEnvelope);

  assert.equal(singleGraph.nodes.length, 1);
  assert.equal(singleGraph.nodes[0]?.type, "SYNTHESIS");
  assert.deepEqual(
    multiGraph.nodes.map((node) => node.nodeId),
    ["audit-controller", "audit-context", "checker", "synthesis"],
  );
  assert.deepEqual(comparisonIdentity(singleEnvelope), comparisonIdentity(multiEnvelope));
  assert.deepEqual(singleEnvelope.authority, { repositoryWrite: "NONE", externalWrite: "NONE", agentExecution: "CODEX_NATIVE_ONLY" });
  assert.equal(singleEnvelope.contractVersion, "2.0");
  assert.equal(multiEnvelope.contractVersion, "2.0");
  assert.deepEqual(singleEnvelope.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"]);
  assert.equal(singleEnvelope.budget.maxDispatches, 0);
  assert.equal(multiEnvelope.budget.maxDispatches, 4);
});

test("reference adapter: requires exact arguments and emits no write authority", () => {
  const failed = spawnSync(process.execPath, [scriptPath, "--mode", "MULTI_AGENT"], { encoding: "utf8" });
  assert.notEqual(failed.status, 0);
  assert.equal(failed.stdout, "");
  assert.equal(failed.stderr, "");

  const prepared = runReferenceAdapter("MULTI_AGENT", "run-reference-multi", sourceRevision, "AI Booster Kit");
  assert.deepEqual(prepared.envelope.authority, { repositoryWrite: "NONE", externalWrite: "NONE", agentExecution: "CODEX_NATIVE_ONLY" });
  assert.deepEqual(prepared.envelope.toolScope, ["FILESYSTEM_READ", "LOCAL_SHELL_READ"]);
  assert.deepEqual(prepared.graph.nodes.map((node) => node.state), ["PENDING", "PENDING", "PENDING", "PENDING"]);
});

function runReferenceAdapter(
  mode: "SINGLE_AGENT" | "MULTI_AGENT",
  runId: string,
  revision: string,
  repositoryLocator: string,
): { envelope: ExecutionEnvelopeInput; graph: ExecutionGraphDraft } {
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--mode",
      mode,
      "--run-id",
      runId,
      "--source-revision",
      revision,
      "--repository-locator",
      repositoryLocator,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const lines = result.stdout.trim().split("\n");
  assert.equal(lines.length, 1);
  return JSON.parse(lines[0] ?? "") as { envelope: ExecutionEnvelopeInput; graph: ExecutionGraphDraft };
}

function comparisonIdentity(envelope: ReturnType<typeof createExecutionEnvelope>) {
  return {
    goal: envelope.goal,
    scope: envelope.scope,
    nonGoals: envelope.nonGoals,
    acceptanceCriteria: envelope.acceptanceCriteria,
    sourceRevision: envelope.sourceRevision,
    sources: envelope.sources,
    authority: envelope.authority,
    requiredEvidenceKinds: envelope.requiredEvidenceKinds,
  };
}

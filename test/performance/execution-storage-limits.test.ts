import assert from "node:assert/strict";
import { test } from "node:test";

import { createExecutionGraph } from "../../src/execution/graph.js";
import { canonicalExecutionJson } from "../../src/execution/identity.js";
import { executionPreparedSql, executionSchemaSql } from "../../src/execution/persistence/schema.js";
import { executionPersistencePolicy, parseExecutionPersistencePolicy } from "../../src/execution/runtime-policy.js";
import { createExecutionEnvelope } from "../../src/execution/validation.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "../helpers/execution-fixtures.js";

test("reference fixtures remain below one quarter of v1 storage limits", () => {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const envelope = createExecutionEnvelope(referenceEnvelopeInput);
  const graph = createExecutionGraph(referenceGraphDraft, envelope);

  assert.ok(Buffer.byteLength(canonicalExecutionJson(referenceEnvelopeInput)) <= policy.limits.maxCommandInputBytes / 4);
  assert.ok(Buffer.byteLength(canonicalExecutionJson(envelope)) <= policy.limits.maxCanonicalTextBytes / 4);
  assert.ok(Buffer.byteLength(canonicalExecutionJson(graph)) <= policy.limits.maxTransactionPayloadBytes / 4);
  assert.ok(Buffer.alloc(policy.limits.maxArtifactBytes / 4).byteLength <= policy.limits.maxArtifactBytes / 4);
});

test("all fixed schema and prepared SQL remain below the v1 SQL ceiling", () => {
  const policy = parseExecutionPersistencePolicy(executionPersistencePolicy).storagePolicy;
  const statements = [executionSchemaSql, ...Object.values(executionPreparedSql)];

  for (const statement of statements) {
    assert.ok(Buffer.byteLength(statement, "utf8") <= policy.limits.maxPreparedSqlBytes);
  }
});

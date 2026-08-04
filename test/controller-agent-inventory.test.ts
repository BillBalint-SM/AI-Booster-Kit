import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { AgentInventoryError, loadAgentInventory, parseAgentDefinition } from "../src/controller/agent-inventory.js";

const validDirectory = resolve("test/fixtures/agents/valid");
const duplicateDirectory = resolve("test/fixtures/agents/duplicate");

test("agent inventory: normalizes sorted metadata and source hashes", async () => {
  const inventory = await loadAgentInventory(validDirectory);

  assert.equal(inventory.sourceKind, "CODEX_GLOBAL_TOML");
  assert.equal(inventory.agentCount, 2);
  assert.deepEqual(inventory.agents.map((agent) => agent.agentId), ["alpha", "beta"]);
  assert.equal(inventory.agents[0]?.displayName, "Alpha Agent");
  assert.match(inventory.agents[0]?.sourceSha256 ?? "", /^[0-9a-f]{64}$/);
});

test("agent inventory: does not expose developer instructions", async () => {
  const inventory = await loadAgentInventory(validDirectory);
  const serialized = JSON.stringify(inventory);

  assert.equal(serialized.includes("Do not expose this fixture instruction"), false);
});

test("agent inventory: rejects missing required metadata", async () => {
  assert.throws(
    () => parseAgentDefinition('description = "Missing the required display name."\n', "C:/agents/missing-name.toml", "a".repeat(64)),
    (error: unknown) => error instanceof AgentInventoryError && /name/.test(error.message),
  );
});

test("agent inventory: rejects a malformed metadata assignment", async () => {
  assert.throws(
    () => parseAgentDefinition('name = "Malformed Agent\ndescription = "Broken"\n', "C:/agents/malformed.toml", "a".repeat(64)),
    (error: unknown) => error instanceof AgentInventoryError && /metadata/.test(error.message),
  );
});

test("agent inventory: rejects duplicate display names", async () => {
  await assert.rejects(
    loadAgentInventory(duplicateDirectory),
    (error: unknown) => error instanceof AgentInventoryError && /display name/.test(error.message),
  );
});

test("agent inventory: rejects an empty source directory", async () => {
  const emptyDirectory = await mkdtemp(join(tmpdir(), "ai-booster-empty-agents-"));

  await assert.rejects(
    loadAgentInventory(emptyDirectory),
    (error: unknown) => error instanceof AgentInventoryError && /no \.toml/.test(error.message),
  );
});

test("agent inventory: derives a stable ID from the source filename", () => {
  const definition = parseAgentDefinition(
    'name = "Source Agent"\ndescription = "A source-backed Agent."\n',
    "C:/agents/source-agent.toml",
    "a".repeat(64),
  );

  assert.equal(definition.agentId, "source-agent");
  assert.equal(definition.sourceSha256, "a".repeat(64));
});

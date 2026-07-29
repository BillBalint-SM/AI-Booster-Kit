import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createCanonicalEvent } from "../src/events/envelope.js";
import { OutboxStore } from "../src/events/outbox.js";
import { reconcileUnknownCompletion } from "../src/events/reconcile.js";

const eventInput = {
  executionSetId: "execution-set-1",
  artifactId: "artifact-1",
  correlationId: "correlation-1",
  source: {
    authority: "codex",
    canonicalId: "GDEAI-102",
    targetIdentity: "jira-project:GDEAI",
    requestedOperation: "transition_to_in_progress",
  },
  actor: "codex",
  eventType: "implementation_started",
  sourceRevision: "abc123",
  beforeState: "To Do",
  afterState: "In Progress",
  evidenceRefs: ["implementation-start-check-passed"],
};

test("events: creates a validated canonical envelope with derived fields", () => {
  const event = createCanonicalEvent(eventInput);

  assert.deepEqual(Object.keys(event).sort(), [
    "actor",
    "afterState",
    "artifactId",
    "beforeState",
    "correlationId",
    "eventType",
    "evidenceRefs",
    "executionSetId",
    "idempotencyKey",
    "source",
    "sourceRevision",
    "timestamp",
  ]);
  assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(createCanonicalEvent(eventInput).idempotencyKey, event.idempotencyKey);
});

test("events: distinguishes execution sets and transitions while excluding host authority from idempotency", () => {
  const event = createCanonicalEvent(eventInput);
  const differentExecutionSet = createCanonicalEvent({ ...eventInput, executionSetId: "execution-set-2" });
  const differentTransition = createCanonicalEvent({ ...eventInput, beforeState: "Review", afterState: "To Do" });
  const differentHost = createCanonicalEvent({ ...eventInput, source: { ...eventInput.source, authority: "cursor" } });

  assert.notEqual(event.idempotencyKey, differentExecutionSet.idempotencyKey);
  assert.notEqual(event.idempotencyKey, differentTransition.idempotencyKey);
  assert.equal(event.idempotencyKey, differentHost.idempotencyKey);
});

test("events: rejects missing authority evidence without exposing secret values", () => {
  assert.throws(
    () => createCanonicalEvent({ ...eventInput, evidenceRefs: [] }),
    /evidenceRefs must contain at least one reference/,
  );
  assert.throws(
    () => createCanonicalEvent({ ...eventInput, source: { ...eventInput.source, authority: "" } }),
    /source\.authority must be a non-empty string/,
  );
  assert.throws(
    () => createCanonicalEvent({ ...eventInput, apiToken: "secret-value" } as never),
    (error: unknown) => error instanceof Error && !error.message.includes("secret-value"),
  );
  assert.throws(
    () => createCanonicalEvent({ ...eventInput, source: undefined } as never),
    /source must be an object/,
  );
  assert.throws(
    () => createCanonicalEvent({ ...eventInput, evidenceRefs: [""] }),
    /evidenceRefs must contain only non-empty references/,
  );
});

test("events: appends immutable JSONL records and keeps duplicate events pending once", async () => {
  await withOutbox(async (outbox, dataDirectory) => {
    const event = createCanonicalEvent(eventInput);
    await outbox.append(event);
    await outbox.append(event);

    assert.deepEqual(await outbox.readPending(), [event]);
    const lines = (await readFile(join(dataDirectory, "outbox.jsonl"), "utf8")).trim().split("\n");
    assert.equal(lines.length, 1);

    const eventLine = (await readFile(join(dataDirectory, "outbox.jsonl"), "utf8")).trim();
    await outbox.markApplied(event.idempotencyKey, {
      state: "applied",
      correlationId: event.correlationId,
      evidenceRefs: ["jira-read-back"],
      errorCode: null,
    });
    assert.deepEqual(await outbox.readPending(), []);
    const persisted = (await readFile(join(dataDirectory, "outbox.jsonl"), "utf8")).trim();
    assert.equal(persisted.split("\n").length, 2);
    assert.ok(persisted.startsWith(eventLine));
  });
});

test("events: serializes concurrent regenerated replays and rejects conflicting duplicates", async () => {
  await withOutbox(async (outbox, dataDirectory) => {
    const event = createCanonicalEvent(eventInput);
    const regenerated = { ...event, timestamp: "2030-01-01T00:00:00.000Z" };
    await Promise.all([outbox.append(event), outbox.append(regenerated)]);

    assert.deepEqual(await outbox.readPending(), [event]);
    assert.equal((await readFile(join(dataDirectory, "outbox.jsonl"), "utf8")).trim().split("\n").length, 1);
    await assert.rejects(
      outbox.append({ ...event, correlationId: "other-correlation" }),
      /Conflicting canonical event already exists/,
    );
  });
});

test("events: validates result records and permits terminal resolution after unresolved history", async () => {
  await withOutbox(async (outbox, dataDirectory) => {
    const event = createCanonicalEvent(eventInput);
    await outbox.append(event);

    await assert.rejects(
      outbox.markApplied(event.idempotencyKey, {
        state: "applied",
        correlationId: "",
        evidenceRefs: [],
        errorCode: null,
        transientBody: "secret-value",
      } as never),
      (error: unknown) => error instanceof Error && /Sync result/.test(error.message) && !error.message.includes("secret-value"),
    );
    await assert.rejects(
      outbox.markApplied(event.idempotencyKey, {
        state: "unknown",
        correlationId: event.correlationId,
        evidenceRefs: ["timeout"],
        errorCode: "",
      }),
      /errorCode must be a non-empty string or null/,
    );
    await outbox.markApplied(event.idempotencyKey, {
      state: "unknown",
      correlationId: event.correlationId,
      evidenceRefs: ["timeout"],
      errorCode: "TIMEOUT",
    });
    await outbox.markApplied(event.idempotencyKey, {
      state: "stopped",
      correlationId: event.correlationId,
      evidenceRefs: ["sync-stop"],
      errorCode: "READ_BACK_REQUIRED",
    });
    assert.deepEqual(await outbox.readPending(), [event]);

    await outbox.markApplied(event.idempotencyKey, {
      state: "not_applied",
      correlationId: event.correlationId,
      evidenceRefs: ["read-back-not-applied"],
      errorCode: null,
    });
    assert.deepEqual(await outbox.readPending(), []);
    await assert.rejects(
      outbox.markApplied(event.idempotencyKey, {
        state: "applied",
        correlationId: event.correlationId,
        evidenceRefs: ["conflicting-read-back"],
        errorCode: null,
      }),
      /Conflicting terminal sync resolution/,
    );
  });
});

test("events: fails loudly for malformed prior evidence and retains unknown completion", async () => {
  await withOutbox(async (outbox, dataDirectory) => {
    await writeFile(join(dataDirectory, "outbox.jsonl"), "not-json\n", "utf8");
    await assert.rejects(outbox.readPending(), /Malformed outbox record at line 1/);
    await writeFile(join(dataDirectory, "outbox.jsonl"), "{\"recordType\":\"result\",\"idempotencyKey\":\"key\",\"result\":{\"state\":\"applied\",\"correlationId\":\"c\",\"evidenceRefs\":[],\"errorCode\":null}}\n", "utf8");
    await assert.rejects(outbox.readPending(), /Malformed outbox record at line 1/);
  });

  let readBackCalls = 0;
  const reconciliation = await reconcileUnknownCompletion({
    canonicalId: "GDEAI-102",
    idempotencyKey: "idempotency-key",
    readBack: async () => {
      readBackCalls += 1;
      return { canonicalId: "GDEAI-102", operationState: "unknown" };
    },
  });
  assert.equal(readBackCalls, 1);
  assert.deepEqual(reconciliation, {
    state: "unknown",
    idempotencyKey: "idempotency-key",
    syncStop: true,
  });
});

test("events: resolves only matching, unambiguous read-back states", async () => {
  const applied = await reconcileUnknownCompletion({
    canonicalId: "GDEAI-102",
    idempotencyKey: "idempotency-key",
    readBack: async () => ({
      canonicalId: "GDEAI-102",
      idempotencyKey: "idempotency-key",
      operationState: "applied",
    }),
  });
  const contradictory = await reconcileUnknownCompletion({
    canonicalId: "GDEAI-102",
    idempotencyKey: "idempotency-key",
    readBack: async () => ({
      canonicalId: "other-item",
      idempotencyKey: "idempotency-key",
      operationState: "not_applied",
    }),
  });
  const thrown = await reconcileUnknownCompletion({
    canonicalId: "GDEAI-102",
    idempotencyKey: "idempotency-key",
    readBack: async () => { throw new Error("timeout"); },
  });
  const malformed = await reconcileUnknownCompletion({
    canonicalId: "GDEAI-102",
    idempotencyKey: "idempotency-key",
    readBack: async () => ({ operationState: "applied" } as never),
  });

  assert.deepEqual(applied, { state: "applied", idempotencyKey: "idempotency-key", syncStop: false });
  assert.deepEqual(contradictory, { state: "unknown", idempotencyKey: "idempotency-key", syncStop: true });
  assert.deepEqual(thrown, { state: "unknown", idempotencyKey: "idempotency-key", syncStop: true });
  assert.deepEqual(malformed, { state: "unknown", idempotencyKey: "idempotency-key", syncStop: true });
});

async function withOutbox(
  callback: (outbox: OutboxStore, dataDirectory: string) => Promise<void>,
): Promise<void> {
  const dataDirectory = await mkdtemp(join(tmpdir(), "agent-sync-events-"));
  try {
    await callback(new OutboxStore(dataDirectory), dataDirectory);
  } finally {
    await rm(dataDirectory, { recursive: true, force: true });
  }
}

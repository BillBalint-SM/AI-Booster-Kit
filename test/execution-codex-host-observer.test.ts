import assert from "node:assert/strict";
import { test } from "node:test";

import { observeCodexHostSession } from "../src/execution/binding/codex-host-observer.js";

const threadId = "11111111-2222-4333-8444-555555555555";
const expectedSessionDigest = "a3c84fa3b1ac6935d23090caa53a392f6c4d858fc28595a49c88001215ca2c24";

test("Codex host observer domain-binds a canonical UUID without retaining the raw value", () => {
  const observedAt = "2026-08-08T21:30:00.000Z";
  const lower = observeCodexHostSession({ threadId, observedAt });
  const upper = observeCodexHostSession({ threadId: threadId.toUpperCase(), observedAt });

  assert.deepEqual(lower, {
    hostProfileId: "CODEX_APP_NATIVE_V1",
    hostSessionId: expectedSessionDigest,
    state: "OBSERVED",
    reasonCode: null,
    observedAt,
  });
  assert.deepEqual(upper, lower);
  assert.equal(JSON.stringify(lower).includes(threadId), false);
});

test("Codex host observer changes identity when the normalized task identity changes", () => {
  const first = observeCodexHostSession({ threadId, observedAt: "2026-08-08T21:30:00.000Z" });
  const second = observeCodexHostSession({
    threadId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    observedAt: "2026-08-08T21:30:00.000Z",
  });

  assert.notEqual(first.hostSessionId, second.hostSessionId);
});

test("Codex host observer preserves absent and malformed task identity as UNKNOWN", () => {
  for (const value of [undefined, "", "not-a-uuid", `${threadId}x`]) {
    assert.deepEqual(
      observeCodexHostSession({ threadId: value, observedAt: "2026-08-08T21:30:00.000Z" }),
      {
        hostProfileId: "CODEX_APP_NATIVE_V1",
        hostSessionId: null,
        state: "UNKNOWN",
        reasonCode: "HOST_SESSION_IDENTITY_UNKNOWN",
        observedAt: "2026-08-08T21:30:00.000Z",
      },
    );
  }
});

test("Codex host observer rejects a non-canonical observation time without echoing input", () => {
  assert.throws(
    () => observeCodexHostSession({ threadId, observedAt: "not-a-time" }),
    (error: unknown) => error instanceof Error
      && error.message.includes("EXECUTION_CODEX_HOST_OBSERVATION_INVALID")
      && !error.message.includes(threadId),
  );
});

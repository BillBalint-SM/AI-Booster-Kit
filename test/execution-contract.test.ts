import assert from "node:assert/strict";
import { test } from "node:test";

import { createExecutionEnvelope, parseExecutionEnvelope } from "../src/execution/validation.js";
import { referenceEnvelopeInput } from "./helpers/execution-fixtures.js";

test("execution envelope creates one stable read-only contract", () => {
  const created = createExecutionEnvelope(referenceEnvelopeInput);

  assert.match(created.envelopeHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(parseExecutionEnvelope(JSON.parse(JSON.stringify(created))), created);
  assert.equal(createExecutionEnvelope({ ...referenceEnvelopeInput }).envelopeHash, created.envelopeHash);
});

test("execution envelope rejects unsafe or widened input", () => {
  const created = createExecutionEnvelope(referenceEnvelopeInput);

  assert.throws(() => parseExecutionEnvelope({ ...created, transcript: "forbidden" }), /EXECUTION_ENVELOPE_FIELDS_INVALID/);
  assert.throws(() => createExecutionEnvelope({ ...referenceEnvelopeInput, goal: "token: do-not-store" }), /EXECUTION_CONTENT_FORBIDDEN/);
  assert.throws(
    () => createExecutionEnvelope({ ...referenceEnvelopeInput, authority: { ...referenceEnvelopeInput.authority, repositoryWrite: "WRITE" as never } }),
    /EXECUTION_AUTHORITY_INVALID/,
  );
  assert.throws(() => parseExecutionEnvelope({ ...created, envelopeHash: "0".repeat(64) }), /EXECUTION_ENVELOPE_HASH_MISMATCH/);
});

test("execution envelope rejects an accessor before evaluating nested untrusted input", () => {
  let reads = 0;
  const authority = Object.defineProperty(
    { externalWrite: "NONE", agentExecution: "CODEX_NATIVE_ONLY" },
    "repositoryWrite",
    { enumerable: true, get: () => { reads += 1; return "NONE"; } },
  );

  assert.throws(() => createExecutionEnvelope({ ...referenceEnvelopeInput, authority } as never));
  assert.equal(reads, 0);
});

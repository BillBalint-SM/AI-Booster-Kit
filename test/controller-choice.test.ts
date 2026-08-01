import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCheckpointChoice } from "../src/controller/choice.js";

const fingerprint = "a".repeat(64);
const signature = "b".repeat(64);

test("checkpoint choice: parses each explicit User path", () => {
  assert.deepEqual(parseCheckpointChoice({ choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: fingerprint, expectedRecipeSignature: signature }), {
    choice: "ACCEPT_RECOMMENDATION",
    expectedRequestFingerprint: fingerprint,
    expectedRecipeSignature: signature,
  });
  assert.deepEqual(parseCheckpointChoice({ choice: "REQUEST_ALTERNATIVE", expectedRequestFingerprint: fingerprint, expectedRecipeSignature: signature, rationale: "Use a research-oriented recipe." }), {
    choice: "REQUEST_ALTERNATIVE",
    expectedRequestFingerprint: fingerprint,
    expectedRecipeSignature: signature,
    rationale: "Use a research-oriented recipe.",
  });
  assert.deepEqual(parseCheckpointChoice({ choice: "CONTINUE_WITHOUT_AGENT", expectedRequestFingerprint: fingerprint, expectedRecipeSignature: signature }), {
    choice: "CONTINUE_WITHOUT_AGENT",
    expectedRequestFingerprint: fingerprint,
    expectedRecipeSignature: signature,
  });
});

test("checkpoint choice: rejects an alternative without a rationale", () => {
  assert.throws(
    () => parseCheckpointChoice({ choice: "REQUEST_ALTERNATIVE", expectedRequestFingerprint: fingerprint, expectedRecipeSignature: signature, rationale: "" }),
    /rationale must be a non-empty string/,
  );
});

test("checkpoint choice: rejects a false acknowledgement", () => {
  assert.throws(
    () => parseCheckpointChoice({ choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: fingerprint, expectedRecipeSignature: signature, acknowledgement: false }),
    /acknowledgement must be true/,
  );
});

test("checkpoint choice: rejects extra input without echoing its value", () => {
  assert.throws(
    () => parseCheckpointChoice({ choice: "CONTINUE_WITHOUT_AGENT", expectedRequestFingerprint: fingerprint, expectedRecipeSignature: signature, extra: "do-not-echo" }),
    (error: unknown) => error instanceof Error && /extra is not allowed/.test(error.message) && !error.message.includes("do-not-echo"),
  );
});

test("checkpoint choice: rejects non-canonical signature digests", () => {
  assert.throws(
    () => parseCheckpointChoice({ choice: "ACCEPT_RECOMMENDATION", expectedRequestFingerprint: "A".repeat(64), expectedRecipeSignature: signature }),
    /expectedRequestFingerprint must be a lowercase SHA-256 digest/,
  );
});

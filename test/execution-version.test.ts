import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertMutableExecutionContractVersion,
  classifyExecutionContractVersion,
} from "../src/execution/version.js";

test("execution version policy keeps v1 read-only and v2 mutable", () => {
  assert.equal(classifyExecutionContractVersion("1.0"), "LEGACY_READ_ONLY");
  assert.equal(classifyExecutionContractVersion("2.0"), "CURRENT_MUTABLE");
  assert.throws(
    () => assertMutableExecutionContractVersion("1.0"),
    /EXECUTION_LEGACY_CONTRACT_READ_ONLY/,
  );
  assert.doesNotThrow(() => assertMutableExecutionContractVersion("2.0"));
  assert.throws(
    () => classifyExecutionContractVersion("3.0"),
    /EXECUTION_CONTRACT_VERSION_UNSUPPORTED/,
  );
});

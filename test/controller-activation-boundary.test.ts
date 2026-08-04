import assert from "node:assert/strict";
import { test } from "node:test";

import { createActivationBoundaryPackage } from "../src/controller/activation-boundary.js";
import type { ActivationBoundaryInput, QuickTaskActivationPackage } from "../src/controller/types.js";

const basePackage: QuickTaskActivationPackage = {
  activationVersion: "1.0",
  state: "EPHEMERAL_PACKAGE_ISSUED",
  retention: "EPHEMERAL",
  profile: "planning",
  recipe: {
    recipeId: "quick-task-clarifier-validator",
    recipeVersion: "0.1.0",
    status: "READY_WITH_LIMIT",
  },
  intent: {
    state: "ACTIVATION_INTENT",
    requestFingerprint: "a".repeat(64),
    recipeSignature: "b".repeat(64),
  },
  agent: {
    role: "quick-task-clarifier-validator",
    mode: "assist",
    input: {
      goal: "Prepare the M2 activation boundary contract.",
      outcomeOwner: "controller-review",
      value: { state: "KNOWN", statement: "The controller remains host-agnostic." },
      context: { state: "CURRENT", reference: "workspace:ai-booster-kit" },
      relations: { state: "ABSENT", items: [] },
      dependencies: { state: "ABSENT", items: [] },
    },
    outputContract: {
      requiredSections: ["planning", "constraints", "evidence", "rollback"],
      unknownPolicy: "PRESERVE_AS_UNKNOWN",
      resultState: "NOT_STARTED",
    },
    instructions: ["Preserve scope."],
    stopConditions: ["Stop on scope expansion."],
    executionBoundary: "LOCAL_ONLY",
  },
  operations: {
    packageIssued: true,
    hostActivationPerformed: false,
    artifactGenerationPerformed: false,
    persistencePerformed: false,
  },
};

const validInput = {
  basePackage,
  context: { kind: "EPIC", contextId: "EPIC-1", sourceRevision: "revision-1" },
  retention: "TEAM",
  tuning: {
    state: "REQUESTED",
    change: "Use the bounded implementation role.",
    rationale: "The Epic contains code changes.",
  },
  setupSnapshot: {
    recipeId: "quick-task-clarifier-validator",
    recipeVersion: "0.1.0",
    variantId: "baseline",
    fingerprint: "setup-1",
  },
} as const satisfies ActivationBoundaryInput;

test("activation boundary: prepares a deterministic package from the closed M2 contract", () => {
  const first = createActivationBoundaryPackage(validInput);
  const second = createActivationBoundaryPackage(validInput);

  assert.equal(first.activationVersion, "2.0");
  assert.equal(first.state, "ACTIVATION_PACKAGE_PREPARED");
  assert.equal(first.packageId.length, 64);
  assert.match(first.packageId, /^[0-9a-f]{64}$/);
  assert.equal(first.packageId, second.packageId);
  assert.deepEqual(first, second);
  assert.deepEqual(first.context, validInput.context);
  assert.equal(first.retention, "TEAM");
  assert.deepEqual(first.tuning, validInput.tuning);
  assert.deepEqual(first.setupSnapshot, validInput.setupSnapshot);
  assert.deepEqual(first.rollback, {
    state: "AVAILABLE",
    restoreSetupFingerprint: "setup-1",
  });
  assert.deepEqual(first.operations, {
    packagePrepared: true,
    hostActivationPerformed: false,
    artifactGenerationPerformed: false,
    persistencePerformed: false,
  });
  assert.equal(first.basePackage.activationVersion, "1.0");
  assert.equal(first.basePackage.retention, "EPHEMERAL");
});

test("activation boundary: freezes only a cloned package and leaves caller input mutable", () => {
  const input = structuredClone(validInput) as unknown as ActivationBoundaryInput;

  const result = createActivationBoundaryPackage(input);

  assert.notEqual(result.basePackage, input.basePackage);
  assert.notEqual(result.context, input.context);
  assert.notEqual(result.tuning, input.tuning);
  assert.notEqual(result.setupSnapshot, input.setupSnapshot);
  assert.equal(Object.isFrozen(input.basePackage), false);
  assert.equal(Object.isFrozen(input.context), false);
  assert.equal(Object.isFrozen(input.tuning), false);
  assert.equal(Object.isFrozen(input.setupSnapshot), false);
  input.basePackage.agent.input.goal = "Caller-owned input remains mutable.";
  input.context.contextId = "EPIC-2";
  input.setupSnapshot.fingerprint = "setup-2";
  if (input.tuning.state === "REQUESTED") input.tuning.change = "Caller-owned tuning remains mutable.";
});

test("activation boundary: rejects malformed root input with safe stable errors and no mutation", () => {
  for (const input of [null, [], { ...validInput, unexpectedRootKey: "root-secret-value" }, { context: validInput.context }]) {
    assertActivationError(
      () => createActivationBoundaryPackage(input as unknown as ActivationBoundaryInput),
      "ACTIVATION_INPUT_INVALID",
      "root-secret-value",
    );
  }

  for (const missingKey of ["basePackage", "context", "retention", "tuning", "setupSnapshot"] as const) {
    const malformed = structuredClone(validInput) as unknown as Record<string, unknown>;
    delete malformed[missingKey];
    assertActivationError(
      () => createActivationBoundaryPackage(malformed as unknown as ActivationBoundaryInput),
      "ACTIVATION_INPUT_INVALID",
      "",
    );
    assert.equal(Object.isFrozen(malformed), false);
    if (Object.hasOwn(malformed, "context")) assert.equal(Object.isFrozen(malformed.context), false);
  }
});

test("activation boundary: does not expose secret-like unsupported keys or values", () => {
  const secretKey = "API_TOKEN_123";
  const secretValue = "super-secret-value";
  const context = {
    ...validInput.context,
    [secretKey]: secretValue,
  };

  assertActivationError(
    () => createActivationBoundaryPackage({ ...validInput, context } as unknown as ActivationBoundaryInput),
    "ACTIVATION_CONTEXT_INVALID",
    secretKey,
    secretValue,
  );
});

test("activation boundary: changes package identity when a valid base agent field changes", () => {
  const first = createActivationBoundaryPackage(validInput);
  const changedInstructions = createActivationBoundaryPackage({
    ...validInput,
    basePackage: {
      ...validInput.basePackage,
      agent: {
        ...validInput.basePackage.agent,
        instructions: ["Use the bounded implementation role."],
      },
    },
  });

  assert.notEqual(changedInstructions.packageId, first.packageId);
});

test("activation boundary: rejects sparse instructions without mutating the caller input", () => {
  const instructions = Array<string>(1);
  const input = {
    ...validInput,
    basePackage: {
      ...validInput.basePackage,
      agent: {
        ...validInput.basePackage.agent,
        instructions,
      },
    },
  };

  assertActivationError(
    () => createActivationBoundaryPackage(input),
    "ACTIVATION_BASE_PACKAGE_INVALID",
  );
  assert.equal(instructions.length, 1);
  assert.equal(Object.hasOwn(instructions, 0), false);
});

test("activation boundary: rejects sparse stop conditions without mutating the caller input", () => {
  const stopConditions = Array<string>(1);
  const input = {
    ...validInput,
    basePackage: {
      ...validInput.basePackage,
      agent: {
        ...validInput.basePackage.agent,
        stopConditions,
      },
    },
  };

  assertActivationError(
    () => createActivationBoundaryPackage(input),
    "ACTIVATION_BASE_PACKAGE_INVALID",
  );
  assert.equal(stopConditions.length, 1);
  assert.equal(Object.hasOwn(stopConditions, 0), false);
});

test("activation boundary: rejects non-canonical array properties before cloning the base package", () => {
  const instructions = ["Preserve scope."];
  Object.defineProperty(instructions, "01", {
    value: "must not bypass validation",
    enumerable: true,
    writable: true,
    configurable: true,
  });
  const input = {
    ...validInput,
    basePackage: {
      ...validInput.basePackage,
      agent: {
        ...validInput.basePackage.agent,
        instructions,
      },
    },
  };

  assertActivationError(
    () => createActivationBoundaryPackage(input),
    "ACTIVATION_BASE_PACKAGE_INVALID",
    "must not bypass validation",
  );
  assert.equal(Object.getOwnPropertyDescriptor(instructions, "01")?.value, "must not bypass validation");
  assert.equal(Object.isFrozen(instructions), false);
});

test("activation boundary: rejects nested non-enumerable required fields without mutation", () => {
  const context = { ...validInput.context };
  Object.defineProperty(context, "contextId", {
    value: "EPIC-1",
    enumerable: false,
    writable: true,
    configurable: true,
  });
  const input = { ...validInput, context };

  assertActivationError(
    () => createActivationBoundaryPackage(input),
    "ACTIVATION_CONTEXT_INVALID",
  );
  assert.equal(Object.getOwnPropertyDescriptor(context, "contextId")?.enumerable, false);
  assert.equal(Object.isFrozen(context), false);
});

test("activation boundary: rejects root non-enumerable required fields without mutation", () => {
  const input = { ...validInput } as Record<string, unknown>;
  Object.defineProperty(input, "retention", {
    value: "TEAM",
    enumerable: false,
    writable: true,
    configurable: true,
  });

  assertActivationError(
    () => createActivationBoundaryPackage(input as unknown as ActivationBoundaryInput),
    "ACTIVATION_INPUT_INVALID",
  );
  assert.equal(Object.getOwnPropertyDescriptor(input, "retention")?.enumerable, false);
  assert.equal(Object.isFrozen(input), false);
});

test("activation boundary: rejects root accessor fields without invoking getters", () => {
  let getterInvoked = false;
  const input = { ...validInput } as Record<string, unknown>;
  Object.defineProperty(input, "retention", {
    enumerable: true,
    configurable: true,
    get() {
      getterInvoked = true;
      throw new Error("untrusted getter must not run");
    },
  });

  assertActivationError(
    () => createActivationBoundaryPackage(input as unknown as ActivationBoundaryInput),
    "ACTIVATION_INPUT_INVALID",
    "untrusted getter must not run",
  );
  assert.equal(getterInvoked, false);
  assert.equal(Object.isFrozen(input), false);
});

test("activation boundary: rejects an empty context source revision", () => {
  assertActivationError(
    () => createActivationBoundaryPackage({ ...validInput, context: { ...validInput.context, sourceRevision: "" } }),
    "ACTIVATION_CONTEXT_INVALID",
    "",
  );
});

test("activation boundary: rejects an empty context identifier without echoing it", () => {
  const input = {
    ...validInput,
    context: { kind: "EPIC", contextId: "", sourceRevision: "revision-1" },
  } as const;

  assertActivationError(
    () => createActivationBoundaryPackage(input),
    "ACTIVATION_CONTEXT_INVALID",
    "",
  );
});

test("activation boundary: rejects an invalid retention choice", () => {
  const input = {
    ...validInput,
    retention: "PERSONAL-TEAM" as "PERSONAL-TEAM",
  };

  assertActivationError(
    () => createActivationBoundaryPackage(input as unknown as ActivationBoundaryInput),
    "ACTIVATION_RETENTION_INVALID",
    "PERSONAL-TEAM",
  );
});

test("activation boundary: rejects empty tuning fields and extra tuning keys", () => {
  assertActivationError(
    () =>
      createActivationBoundaryPackage({
        ...validInput,
        tuning: { state: "REQUESTED", change: "", rationale: "The Epic contains code changes." },
      }),
    "ACTIVATION_TUNING_INVALID",
    "",
  );

  assertActivationError(
    () =>
      createActivationBoundaryPackage({
        ...validInput,
        tuning: { state: "REQUESTED", change: "Use the bounded implementation role.", rationale: "", extra: "do-not-echo" } as unknown as ActivationBoundaryInput["tuning"],
      }),
    "ACTIVATION_TUNING_INVALID",
    "do-not-echo",
  );
});

test("activation boundary: rejects a missing setup fingerprint, a recipe mismatch, and a non-ephemeral base package", () => {
  assertActivationError(
    () =>
      createActivationBoundaryPackage({
        ...validInput,
        setupSnapshot: { recipeId: "quick-task-clarifier-validator", recipeVersion: "0.1.0", variantId: "baseline", fingerprint: "" },
      }),
    "ACTIVATION_SETUP_SNAPSHOT_INVALID",
    "",
  );

  assertActivationError(
    () =>
      createActivationBoundaryPackage({
        ...validInput,
        setupSnapshot: { recipeId: "other-recipe", recipeVersion: "0.1.0", variantId: "baseline", fingerprint: "setup-1" },
      }),
    "ACTIVATION_SETUP_RECIPE_MISMATCH",
    "other-recipe",
  );

  assertActivationError(
    () =>
      createActivationBoundaryPackage({
        ...validInput,
        basePackage: {
          ...validInput.basePackage,
          retention: "PERSONAL",
        } as unknown as QuickTaskActivationPackage,
      }),
    "ACTIVATION_BASE_PACKAGE_INVALID",
    "PERSONAL",
  );
});

function assertActivationError(fn: () => unknown, code: string, ...unsafeValues: readonly string[]): void {
  try {
    fn();
    assert.fail(`expected ${code}`);
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(error.message.startsWith(`${code}: `));
    for (const unsafeValue of unsafeValues) {
      if (unsafeValue !== "") assert.equal(error.message.includes(unsafeValue), false);
    }
  }
}

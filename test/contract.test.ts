import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compileNativeAdapter } from "../src/contract/compile.js";
import { ContractError } from "../src/contract/errors.js";
import {
  parseMarkdownContract,
  validateContractPath,
} from "../src/contract/markdown.js";

const validContract = `---
contractId: test-contract
contractVersion: 1.0.0
sourceRevision: revision-1
canonicalVocabulary:
  - milestone
  - epic
  - workItem
  - boardStatus
  - planningState
  - executionSet
  - attentionState
  - syncState
  - evidenceRefs
capabilities:
  - name: Canonical contract reading
    state: supported
    limitation: Local validation only.
---

# Team Contract

## Lifecycle

1. To Do
2. In Progress
3. Review
4. Ready for Deploy
5. Ready for Test
6. Testing
7. Done

## Stop protocol

Stop before any external action when target identity, authority, capability, or
evidence is unknown, ambiguous, unsupported, or stale. Preserve local evidence
and request an explicit, bounded decision instead of enabling execution.
`;

test("contract: parses declarative frontmatter and retains its Markdown body", () => {
  const contract = parseMarkdownContract(validContract, "fixtures/valid.md");

  assert.equal(contract.contractId, "test-contract");
  assert.equal(contract.contractVersion, "1.0.0");
  assert.equal(contract.sourceRevision, "revision-1");
  assert.deepEqual(contract.metadata.canonicalVocabulary, [
    "milestone",
    "epic",
    "workItem",
    "boardStatus",
    "planningState",
    "executionSet",
    "attentionState",
    "syncState",
    "evidenceRefs",
  ]);
  assert.match(contract.body, /# Team Contract/);
});

test("contract: declares the approval-gated sandbox readiness certificate", async () => {
  const sourcePath = join(process.cwd(), "contract", "team-contract.md");
  const contract = parseMarkdownContract(await readFile(sourcePath, "utf8"), sourcePath);
  const capabilities = contract.capabilities.filter(
    (capability) => capability.name === "Sandbox readiness certificate",
  );

  assert.equal(capabilities.length, 1);
  assert.deepEqual(capabilities[0], {
    name: "Sandbox readiness certificate",
    state: "requires_approval",
    limitation:
      "Accepts read-only normalized evidence only and does not activate connector synchronization or external writes.",
  });
  assert.equal(
    contract.capabilities.find(
      (capability) => capability.name === "Jira/Confluence/GitHub synchronization",
    )?.state,
    "unsupported",
  );
});

test("contract: rejects a document without frontmatter with its source path", () => {
  assert.throws(
    () => parseMarkdownContract("# Team Contract\n", "fixtures/no-frontmatter.md"),
    (error: unknown) =>
      error instanceof ContractError &&
      error.message.includes("fixtures/no-frontmatter.md") &&
      error.message.includes("frontmatter"),
  );
});

test("contract: rejects invalid YAML with the frontmatter location", () => {
  const invalidYaml = `---
contractId: [
---
# Team Contract
`;

  assert.throws(
    () => parseMarkdownContract(invalidYaml, "fixtures/invalid-yaml.md"),
    (error: unknown) =>
      error instanceof ContractError &&
      error.message.includes("fixtures/invalid-yaml.md") &&
      error.message.includes("frontmatter"),
  );
});

test("contract: rejects unsupported executable requests in the Capabilities section", () => {
  const executableCapability = `${validContract}\n## Capabilities\n\n- Enable an MCP server.\n`;

  assert.throws(
    () =>
      parseMarkdownContract(
        executableCapability,
        "fixtures/executable-capability.md",
      ),
    (error: unknown) =>
      error instanceof ContractError &&
      error.message.includes("fixtures/executable-capability.md") &&
      error.message.includes("Markdown section 'Capabilities'"),
  );
});

test("contract: rejects executable capability limitations and unknown metadata", () => {
  const executableLimitation = validContract.replace(
    "limitation: Local validation only.",
    "limitation: Enable an MCP server.",
  );
  const unknownCapabilityMetadata = validContract.replace(
    "limitation: Local validation only.",
    "limitation: Local validation only.\n    hostConfig: local-only",
  );

  for (const text of [executableLimitation, unknownCapabilityMetadata]) {
    assert.throws(
      () => parseMarkdownContract(text, "fixtures/invalid-capability.md"),
      (error: unknown) =>
        error instanceof ContractError &&
        error.message.includes("fixtures/invalid-capability.md") &&
        error.message.includes("frontmatter.capabilities[0]"),
    );
  }
});

test("contract: rejects duplicate capability declarations", () => {
  const duplicateCapabilities = validContract.replace(
    "---\n\n# Team Contract",
    `  - name: Canonical contract reading
    state: supported
    limitation: Duplicate declaration.
---

# Team Contract`,
  );

  assert.throws(
    () => parseMarkdownContract(duplicateCapabilities, "fixtures/duplicate.md"),
    (error: unknown) =>
      error instanceof ContractError &&
      error.message.includes("fixtures/duplicate.md") &&
      error.message.includes("frontmatter.capabilities[1].name"),
  );
});

test("contract: rejects missing or non-canonical lifecycle and stop semantics", async () => {
  const missingStop = validContract.replace(/## Stop protocol[\s\S]*$/, "");
  const wrongLifecycle = validContract.replace("2. In Progress", "2. Blocked");
  const wrongStop = validContract.replace(
    "Stop before any external action",
    "Continue with any external action",
  );
  const directory = await mkdtemp(join(tmpdir(), "contract-semantics-"));
  const sourcePath = join(directory, "invalid-contract.md");

  assert.throws(
    () => compileNativeAdapter(parseMarkdownContract(missingStop, sourcePath), "codex"),
    ContractError,
  );
  assert.throws(
    () => compileNativeAdapter(parseMarkdownContract(wrongStop, sourcePath), "codex"),
    ContractError,
  );
  await writeFile(sourcePath, wrongLifecycle, "utf8");
  const summary = await validateContractPath(sourcePath);

  assert.equal(summary.valid, false);
  assert.match(summary.errors[0] ?? "", /Lifecycle/);
});

test("contract: validates manually constructed projection input", () => {
  const contract = parseMarkdownContract(validContract, "fixtures/manual.md");
  const unsafeContract = {
    ...contract,
    capabilities: [
      {
        name: "Canonical contract reading",
        state: "supported" as const,
        limitation: "Enable an MCP server.",
      },
    ],
  };

  assert.throws(
    () => compileNativeAdapter(unsafeContract, "codex"),
    ContractError,
  );
});

test("contract: validates a contract path and compiles all native projections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "contract-test-"));
  const sourcePath = join(directory, "team-contract.md");
  await writeFile(sourcePath, validContract, "utf8");

  const summary = await validateContractPath(sourcePath);
  const contract = parseMarkdownContract(validContract, sourcePath);

  assert.deepEqual(summary, {
    valid: true,
    sourcePath,
    contractId: "test-contract",
    canonicalVocabulary: [
      "milestone",
      "epic",
      "workItem",
      "boardStatus",
      "planningState",
      "executionSet",
      "attentionState",
      "syncState",
      "evidenceRefs",
    ],
    errors: [],
  });

  for (const host of ["codex", "claude-code", "cursor"] as const) {
    const projection = compileNativeAdapter(contract, host);

    assert.equal(projection.sourceContractRevision, "revision-1");
    assert.equal(projection.targetHost, host);
    assert.match(projection.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(projection.content, /Milestone, Epic, Story, Task, Bug/);
    assert.match(projection.content, /To Do.*In Progress.*Review.*Ready for Deploy.*Ready for Test.*Testing.*Done/s);
    assert.match(projection.content, /Capability \| State \| Limitation/);
  }
});

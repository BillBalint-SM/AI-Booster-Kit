import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import { codexAdapter } from "../src/adapters/codex.js";
import { claudeCodeAdapter } from "../src/adapters/claude-code.js";
import { cursorAdapter } from "../src/adapters/cursor.js";
import { AdapterSafetyError } from "../src/adapters/types.js";
import { parseMarkdownContract } from "../src/contract/markdown.js";

const contractText = `---
contractId: adapter-test
contractVersion: 1.0.0
sourceRevision: adapter-revision
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
    limitation: Local contract parsing only.
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

Stop before any external action when target identity, authority, capability, or evidence is unknown, ambiguous, unsupported, or stale. Preserve local evidence and request an explicit, bounded decision instead of enabling execution.
`;

const contract = parseMarkdownContract(contractText, "fixtures/adapter.md");
const adapters = [codexAdapter, claudeCodeAdapter, cursorAdapter];

test("adapters: expose only the approved local projection, event, and capability methods", () => {
  for (const adapter of adapters) {
    assert.deepEqual(Object.keys(adapter).sort(), ["capabilityReport", "compile", "emitEvent"]);
    assert.equal("write" in adapter, false);
    assert.equal("sync" in adapter, false);
  }
});

test("adapters: compile the shared contract and declare host differences explicitly", () => {
  const projections = adapters.map((adapter) => adapter.compile(contract));

  assert.deepEqual(
    projections.map((projection) => projection.sourceContractRevision),
    ["adapter-revision", "adapter-revision", "adapter-revision"],
  );
  assert.deepEqual(
    projections.map((projection) => projection.targetHost),
    ["codex", "claude-code", "cursor"],
  );
  for (const projection of projections) {
    assert.match(projection.content, /To Do.*In Progress.*Review/s);
    assert.doesNotMatch(projection.content, /\b(?:Blocked|Rejected|Awaiting Clarification)\b/);
  }

  assert.equal(codexAdapter.capabilityReport().capabilities.localEventEmission, "supported_with_limits");
  for (const adapter of [claudeCodeAdapter, cursorAdapter]) {
    assert.equal(adapter.capabilityReport().capabilities.localEventEmission, "supported_with_limits");
    assert.equal(adapter.capabilityReport().capabilities.externalWrite, "unsupported");
  }
});

test("adapters: require runtime-validated implementation-start context and verified evidence", () => {
  const input = eventInput("implementation_started");
  const event = codexAdapter.emitEvent(input as never);

  assert.equal(event.eventType, "implementation_started");
  assert.equal(event.beforeState, "To Do");
  assert.equal(event.afterState, "In Progress");
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, implementationStart: null } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_CONTEXT_INVALID",
  );
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, implementationStart: { startCheck: null, executionSetId: "set-1" } } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_CONTEXT_INVALID",
  );
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, implementationStart: { startCheck: { ...startCheckInput(), finalization: { state: "draft", acceptanceDecision: "pending", evidenceRefs: ["planning chat"] } }, executionSetId: "set-1" } } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_CHECK_FAILED",
  );
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, evidenceRefs: ["implementation-started", "implementation-start-check-passed", "shell command output"], implementationStart: { startCheck: startCheckInput(), executionSetId: "set-1" } } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_EVIDENCE_REQUIRED",
  );
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, evidenceRefs: ["implementation-started", "implementation-start-check-passed", "milestone-finalization-record", "accepted-scope-record", "review transcript"], implementationStart: { startCheck: startCheckInput(), executionSetId: "set-1" } } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_EVIDENCE_REQUIRED",
  );
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, evidenceRefs: ["implementation-started", "implementation-start-check-passed", "milestone-finalization-record"], implementationStart: { startCheck: startCheckInput(), executionSetId: "different-set" } } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_CONTEXT_MISMATCH",
  );
  assert.throws(
    () => codexAdapter.emitEvent({ ...input, evidenceRefs: ["implementation-started", "implementation-start-check-passed", "fabricated-evidence"], implementationStart: { startCheck: startCheckInput(), executionSetId: "set-1" } } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_EVIDENCE_REQUIRED",
  );
  for (const untrustedEvidence of ["forged-evidence", "evidence:unknown", "planning text", "shell-output"]) {
    assert.throws(
      () => codexAdapter.emitEvent({ ...input, evidenceRefs: [...validStartEvidence(), untrustedEvidence] } as never),
      (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_EVIDENCE_REQUIRED",
      untrustedEvidence,
    );
  }
  assert.throws(
    () => codexAdapter.emitEvent({
      ...input,
      evidenceRefs: [...validStartEvidence(), "forged-finalization-record"],
      implementationStart: {
        startCheck: {
          ...startCheckInput(),
          finalization: { state: "finalized", acceptanceDecision: "accepted", evidenceRefs: ["forged-finalization-record"] },
        },
        executionSetId: "set-1",
      },
    } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "IMPLEMENTATION_START_EVIDENCE_REQUIRED",
  );
});

test("adapters: reject host mismatch without attempting local event emission", () => {
  assert.throws(
    () => codexAdapter.emitEvent({ ...eventInput("milestone_finalized"), host: "cursor" } as never),
    (error: unknown) => error instanceof AdapterSafetyError && error.code === "HOST_MISMATCH",
  );
});

test("adapters: static projections identify their source, location, capability state, and limitations without executable content", async () => {
  for (const host of ["codex", "claude-code", "cursor"] as const) {
    const document = await readFile(resolve(`contract/adapters/${host}.md`), "utf8");
    assert.match(document, /sourceContractRevision:/);
    assert.match(document, /Native projection location:/);
    assert.match(document, /Version context:/);
    assert.match(document, /Capability \| State \| Limitation/);
    assert.doesNotMatch(document, /\b(?:token|password|credential|api[_ -]?key)\b/i);
    assert.doesNotMatch(document, /\b(?:enable|install|run)\s+(?:an?\s+)?(?:MCP|plugin|hook|command)/i);
    if (host !== "codex") {
      assert.match(document, /\| Native adapter projection \| supported_with_limits \|/);
      assert.match(document, /\| Local conformance checks \| supported_with_limits \|/);
    }
  }
});

function eventInput(eventType: string) {
  return {
    host: "codex" as const,
    eventType,
    artifactId: "GDEAI-102",
    executionSetId: "set-1",
    milestoneId: "GDEAI-100",
    sourceRevision: "adapter-revision",
    actor: "local-agent",
    evidenceRefs: validStartEvidence(),
    implementationStart: {
      startCheck: startCheckInput(),
      executionSetId: "set-1",
    },
  } as Record<string, unknown>;
}

function validStartEvidence() {
  return ["implementation-started", "implementation-start-check-passed", "milestone-finalization-record", "accepted-scope-record"];
}

function startCheckInput() {
  return {
    milestoneId: "GDEAI-100",
    epicId: "GDEAI-101",
    workItemIds: ["GDEAI-102"],
    acceptanceCriteria: ["Adapter events remain local."],
    dependencyIds: [],
    repository: "example/agent-agnostic-sync-orchestrator",
    branchName: "feature/adapter-conformance",
    worktreePath: "C:/worktrees/agent-agnostic-sync-orchestrator",
    baseRevision: "abc123",
    actor: "local-agent",
    roadmapRevision: "adapter-revision",
    finalization: { state: "finalized" as const, acceptanceDecision: "accepted" as const, evidenceRefs: ["milestone-finalization-record"] },
    acceptedScope: { workItemIds: ["GDEAI-102"], acceptanceCriteria: ["Adapter events remain local."], evidenceRefs: ["accepted-scope-record"] },
    hierarchy: { epicParentMilestoneId: "GDEAI-100", workItemParentEpicIds: { "GDEAI-102": "GDEAI-101" } },
  };
}

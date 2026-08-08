import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { createExecutionHostReceipt } from "../src/execution/binding/host-receipt.js";
import { executionBindingPolicy, parseExecutionBindingPolicy } from "../src/execution/binding/policy.js";
import {
  assembleExecutionDispatchReadiness,
  parseExecutionDispatchReadinessReceipt,
} from "../src/execution/binding/readiness.js";
import { observeExecutionSource } from "../src/execution/binding/source-observer.js";
import type {
  HostAuthorityState,
  HostCapabilityId,
  HostCapabilityState,
  HostEvidenceReceipt,
  HostInstructionState,
  SourceBindingObservation,
} from "../src/execution/binding/types.js";
import { canonicalExecutionJson } from "../src/execution/identity.js";
import type { ExecutionRuntimeReceipt } from "../src/execution/runtime-receipt.js";
import type { TransactionalLoadedExecutionRun } from "../src/execution/types.js";
import { createBindingExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { cloneFixtureRepository, git } from "./helpers/execution-git-fixture.js";

const policy = parseExecutionBindingPolicy(executionBindingPolicy);
const observedAt = "2026-08-08T22:30:00.000Z";

test("dispatch readiness deterministically binds a real loaded run, task, host, and source without mutation", async (context) => {
  const fixture = await createBindingExecutionStoreFixture();
  context.after(fixture.cleanup);
  const source = await observeSource(fixture, fixture.workspaceRoot);
  const host = readyHostReceipt(fixture.run, fixture.hostSessionId);
  const databaseBefore = await readFile(fixture.session.databasePath);
  const statusBefore = await git(fixture.workspaceRoot, ["--no-optional-locks", "status", "--porcelain=v2", "-z"]);

  const first = assemble(fixture.run, fixture.session.runtimeReceipt, host, [source]);
  const second = assemble(fixture.run, fixture.session.runtimeReceipt, host, [source]);

  assert.deepEqual(second, first);
  assert.equal(first.state, "READY");
  assert.deepEqual(first.reasonCodes, []);
  assert.equal(first.runId, fixture.run.runId);
  assert.equal(first.nodeId, "binding-agent");
  assert.equal(first.envelopeHash, fixture.run.envelope.envelopeHash);
  assert.equal(first.graphRevision, fixture.run.graph.graphRevision);
  assert.equal(first.controllerId, fixture.run.controllerId);
  assert.equal(first.runtimeReceiptId, fixture.run.runtimeReceiptId);
  assert.equal(first.hostSessionId, fixture.hostSessionId);
  assert.deepEqual(first.sourceObservationIds, [source.observationId]);
  assert.deepEqual(first.sourceStateDigests, [source.sourceStateDigest]);
  assert.deepEqual(parseExecutionDispatchReadinessReceipt(first, policy), first);
  assert.deepEqual(await readFile(fixture.session.databasePath), databaseBefore);
  assert.equal(await git(fixture.workspaceRoot, ["--no-optional-locks", "status", "--porcelain=v2", "-z"]), statusBefore);
});

test("dispatch readiness rejects non-canonical run, task, host, and source preconditions without a receipt", async (context) => {
  const fixture = await createBindingExecutionStoreFixture();
  context.after(fixture.cleanup);
  const source = await observeSource(fixture, fixture.workspaceRoot);
  const host = readyHostReceipt(fixture.run, fixture.hostSessionId);
  const requests: Array<() => unknown> = [
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, host, [source], "missing-node"),
    () => assembleRequest(withNodeState(fixture.run, "binding-agent", "RUNNING"), fixture.session.runtimeReceipt, host, [source], "binding-agent"),
    () => assembleRequest({ ...fixture.run, checkpoint: { ...fixture.run.checkpoint, runState: "COMPLETE" } }, fixture.session.runtimeReceipt, host, [source], "binding-agent"),
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, host, [source], "binding-check"),
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, host, [], "binding-agent"),
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, host, [source, source], "binding-agent"),
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, host, [{ ...source, sourceId: "foreign-source" }], "binding-agent"),
    () => assembleRequest(fixture.run, { ...fixture.session.runtimeReceipt, receiptId: "a".repeat(64) }, host, [source], "binding-agent"),
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, { ...host, controllerId: "wrong-controller" }, [source], "binding-agent"),
    () => assembleRequest(fixture.run, fixture.session.runtimeReceipt, { ...host, runtimeReceiptId: "a".repeat(64) }, [source], "binding-agent"),
  ];
  for (const request of requests) assert.throws(request, /EXECUTION_DISPATCH_READINESS_INVALID|EXECUTION_(?:GRAPH|TASK)_INVALID/u);
});

test("dispatch readiness applies STOPPED over UNKNOWN over READY with complete sorted reasons", async (context) => {
  const fixture = await createBindingExecutionStoreFixture();
  context.after(fixture.cleanup);
  await writeFile(join(fixture.workspaceRoot, "src", "alpha.txt"), "dirty\n", "utf8");
  const dirty = await observeSource(fixture, fixture.workspaceRoot);
  const unsupported = hostReceipt(fixture.run, fixture.hostSessionId, "UNSUPPORTED", "PROVEN", "OBSERVED");
  const receipt = assemble(fixture.run, fixture.session.runtimeReceipt, unsupported, [dirty]);

  assert.equal(receipt.state, "STOPPED");
  assert.deepEqual(receipt.reasonCodes, ["HOST_CAPABILITY_UNSUPPORTED", "WORKTREE_DIRTY_IN_SCOPE"]);

  const unknownHost = hostReceipt(fixture.run, null, "UNKNOWN", "UNKNOWN", "UNKNOWN");
  const unreadable = await observeSource(fixture, join(fixture.root, "missing-readiness-workspace"));
  const unknown = assemble(fixture.run, fixture.session.runtimeReceipt, unknownHost, [unreadable]);
  assert.equal(unknown.state, "UNKNOWN");
  assert.deepEqual(unknown.reasonCodes, [
    "AUTHORITY_STATE_UNKNOWN",
    "HOST_CAPABILITY_UNKNOWN",
    "HOST_INSTRUCTION_STATE_UNKNOWN",
    "HOST_SESSION_IDENTITY_UNKNOWN",
    "SOURCE_UNREADABLE",
  ]);
});

test("dispatch readiness distinguishes real source revision, workspace, and unreadable outcomes", async (context) => {
  const fixture = await createBindingExecutionStoreFixture();
  context.after(fixture.cleanup);
  const host = readyHostReceipt(fixture.run, fixture.hostSessionId);

  await writeFile(join(fixture.workspaceRoot, "src", "alpha.txt"), "next\n", "utf8");
  await git(fixture.workspaceRoot, ["commit", "-am", "next revision"]);
  const revisionMismatch = await observeSource(fixture, fixture.workspaceRoot);
  assert.deepEqual(revisionMismatch.reasonCodes, ["SOURCE_REVISION_MISMATCH"]);
  assert.equal(assemble(fixture.run, fixture.session.runtimeReceipt, host, [revisionMismatch]).state, "STOPPED");

  const cloneRoot = await cloneFixtureRepository(fixture, "readiness-clone");
  await git(cloneRoot, ["checkout", fixture.revision]);
  const workspaceMismatch = await observeSource(fixture, cloneRoot);
  assert.deepEqual(workspaceMismatch.reasonCodes, ["WORKSPACE_IDENTITY_MISMATCH"]);
  assert.equal(assemble(fixture.run, fixture.session.runtimeReceipt, host, [workspaceMismatch]).state, "STOPPED");

  const unreadable = await observeSource(fixture, join(fixture.root, "missing-workspace"));
  assert.deepEqual(unreadable.reasonCodes, ["SOURCE_UNREADABLE"]);
  assert.equal(assemble(fixture.run, fixture.session.runtimeReceipt, host, [unreadable]).state, "UNKNOWN");
});

test("dispatch readiness maps every host certainty boundary and proven session mismatch", async (context) => {
  const fixture = await createBindingExecutionStoreFixture();
  context.after(fixture.cleanup);
  const source = await observeSource(fixture, fixture.workspaceRoot);
  const cases: [HostEvidenceReceipt, string, "STOPPED" | "UNKNOWN"][] = [
    [hostReceipt(fixture.run, fixture.hostSessionId, "SUPPORTED", "DENIED", "OBSERVED"), "AUTHORITY_NOT_PROVEN", "STOPPED"],
    [hostReceipt(fixture.run, fixture.hostSessionId, "SUPPORTED", "UNKNOWN", "OBSERVED"), "AUTHORITY_STATE_UNKNOWN", "UNKNOWN"],
    [hostReceipt(fixture.run, fixture.hostSessionId, "SUPPORTED", "PROVEN", "UNKNOWN"), "HOST_INSTRUCTION_STATE_UNKNOWN", "UNKNOWN"],
    [readyHostReceipt(fixture.run, null), "HOST_SESSION_IDENTITY_UNKNOWN", "UNKNOWN"],
    [readyHostReceipt(fixture.run, "d".repeat(64)), "HOST_SESSION_IDENTITY_MISMATCH", "STOPPED"],
  ];
  const unsupportedProfile = readyHostReceipt(fixture.run, fixture.hostSessionId);
  const profileReceipt = createExecutionHostReceipt({
    hostProfileId: "CLAUDE_CODE_NATIVE_V1",
    hostSessionId: unsupportedProfile.hostSessionId,
    capabilities: unsupportedProfile.capabilities,
    observedAt: unsupportedProfile.observedAt,
  }, { controllerId: fixture.run.controllerId, runtimeReceiptId: fixture.run.runtimeReceiptId }, policy);
  cases.push([profileReceipt, "HOST_PROFILE_UNSUPPORTED", "STOPPED"]);

  for (const [host, reason, state] of cases) {
    const receipt = assemble(fixture.run, fixture.session.runtimeReceipt, host, [source]);
    assert.equal(receipt.state, state, reason);
    assert.equal(receipt.reasonCodes.includes(reason as never), true, reason);
  }
});

test("readiness parser rejects state, identity, reason, ordering, field, and byte tampering", async (context) => {
  const fixture = await createBindingExecutionStoreFixture();
  context.after(fixture.cleanup);
  const source = await observeSource(fixture, fixture.workspaceRoot);
  const receipt = assemble(fixture.run, fixture.session.runtimeReceipt, readyHostReceipt(fixture.run, fixture.hostSessionId), [source]);
  const tampered: unknown[] = [
    { ...receipt, state: "STOPPED" },
    { ...receipt, runId: "other-run" },
    { ...receipt, reasonCodes: ["SOURCE_UNREADABLE"] },
    { ...receipt, sourceObservationIds: ["a".repeat(64), "b".repeat(64)] },
    { ...receipt, evidenceDigest: "a".repeat(64) },
    { ...receipt, receiptId: "b".repeat(64) },
    { ...receipt, unexpected: true },
  ];
  for (const value of tampered) {
    assert.throws(() => parseExecutionDispatchReadinessReceipt(value, policy), /EXECUTION_DISPATCH_READINESS_INVALID/u);
  }
  const oversized = { ...receipt, reasonCodes: Array.from({ length: policy.maxReadinessInputBytes }, () => "SOURCE_UNREADABLE") };
  assert.equal(Buffer.byteLength(canonicalExecutionJson(oversized), "utf8") > policy.maxReadinessInputBytes, true);
  assert.throws(() => parseExecutionDispatchReadinessReceipt(oversized, policy), /COMMAND_INPUT_TOO_LARGE/u);
});

function assemble(
  run: TransactionalLoadedExecutionRun,
  runtimeReceipt: ExecutionRuntimeReceipt,
  hostReceiptValue: HostEvidenceReceipt,
  sourceObservations: readonly SourceBindingObservation[],
) {
  return assembleRequest(run, runtimeReceipt, hostReceiptValue, sourceObservations, "binding-agent");
}

function assembleRequest(
  run: TransactionalLoadedExecutionRun,
  runtimeReceipt: ExecutionRuntimeReceipt,
  hostReceiptValue: HostEvidenceReceipt,
  sourceObservations: readonly SourceBindingObservation[],
  nodeId: string,
) {
  return assembleExecutionDispatchReadiness({
    run,
    runtimeReceipt,
    nodeId,
    hostReceipt: hostReceiptValue,
    sourceObservations,
    observedAt,
  }, policy);
}

async function observeSource(
  fixture: Awaited<ReturnType<typeof createBindingExecutionStoreFixture>>,
  workspaceRoot: string,
) {
  return observeExecutionSource({
    sourceId: "source-main",
    platform: process.platform,
    workspaceRoot,
    expectedSourceRevision: fixture.revision,
    auditedPaths: ["."],
    observedAt: "2026-08-08T22:25:00.000Z",
  }, { workspaceIdentityDigest: fixture.session.workspaceIdentityDigest }, policy);
}

function hostReceipt(
  run: TransactionalLoadedExecutionRun,
  hostSessionId: string | null,
  state: HostCapabilityState,
  authorityState: HostAuthorityState,
  instructionState: HostInstructionState,
): HostEvidenceReceipt {
  const evidenceCode = state === "SUPPORTED"
    ? "NATIVE_CAPABILITY_OBSERVED"
    : state === "UNSUPPORTED"
      ? "NATIVE_CAPABILITY_UNSUPPORTED"
      : "NATIVE_CAPABILITY_UNOBSERVABLE";
  return createExecutionHostReceipt({
    hostProfileId: "CODEX_APP_NATIVE_V1",
    hostSessionId,
    capabilities: policy.requiredHostCapabilities.map((capabilityId: HostCapabilityId) => ({
      capabilityId,
      state,
      authorityState,
      instructionState,
      evidenceCode,
    })),
    observedAt: "2026-08-08T22:26:00.000Z",
  }, { controllerId: run.controllerId, runtimeReceiptId: run.runtimeReceiptId }, policy);
}

function readyHostReceipt(
  run: TransactionalLoadedExecutionRun,
  hostSessionId: string | null,
): HostEvidenceReceipt {
  return hostReceipt(run, hostSessionId, "SUPPORTED", "PROVEN", "OBSERVED");
}

function withNodeState(
  run: TransactionalLoadedExecutionRun,
  nodeId: string,
  state: "RUNNING",
): TransactionalLoadedExecutionRun {
  return {
    ...run,
    graph: {
      ...run.graph,
      nodes: run.graph.nodes.map((node) => node.nodeId === nodeId ? { ...node, state } : node),
    },
  };
}

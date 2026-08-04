import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { ContractDocument } from "../src/contract/markdown.js";
import { ConnectorFailure, type ConnectorResult, type JiraProjectionIntent, type ReadBackState } from "../src/connectors/types.js";
import type { CanonicalEvent, CanonicalWorkArtifact, ChildWorkItem, Epic, ExecutionSet, Milestone } from "../src/domain/model.js";
import { createCanonicalEvent } from "../src/events/envelope.js";
import { OutboxStore } from "../src/events/outbox.js";
import { loadProjectProfile } from "../src/lifecycle/profile.js";
import { runImplementationStartCheck } from "../src/lifecycle/start-check.js";
import { finalizeMilestone } from "../src/planning/finalize.js";
import { SyncOrchestrator } from "../src/orchestrator/sync.js";
import { evaluateSessionResume } from "../src/context/resume.js";
import type { EpicContext, MilestoneContext, ResumeRuntime, SessionState } from "../src/context/types.js";

const profile = loadProjectProfile("test/fixtures/project-profile.json");
const target = {
  tenantUrl: "https://sandbox.example.test",
  jiraTenantId: "tenant-1",
  jiraProject: { key: "GDEAI", id: "project-1" },
  confluenceSpace: { key: "ENG", id: "space-1" },
  githubRepository: { owner: "example", name: "agent-sync", id: "repo-1" },
  environment: "sandbox" as const,
  allowlistPolicyId: "sandbox-policy",
  policyMutation: { mutationsAllowed: true },
};
const targetIdentity = "{\"version\":1,\"tenantUrl\":\"https://sandbox.example.test\",\"jiraTenantId\":\"tenant-1\",\"jiraProject\":{\"key\":\"GDEAI\",\"id\":\"project-1\"},\"confluenceSpace\":{\"key\":\"ENG\",\"id\":\"space-1\"},\"githubRepository\":{\"owner\":\"example\",\"name\":\"agent-sync\",\"id\":\"repo-1\"},\"environment\":\"sandbox\",\"allowlistPolicyId\":\"sandbox-policy\",\"mutationsAllowed\":true}";
const crossTenantTargetIdentity = "{\"version\":1,\"tenantUrl\":\"https://other.example.test\",\"jiraTenantId\":\"tenant-2\",\"jiraProject\":{\"key\":\"GDEAI\",\"id\":\"project-1\"},\"confluenceSpace\":{\"key\":\"ENG\",\"id\":\"space-1\"},\"githubRepository\":{\"owner\":\"example\",\"name\":\"agent-sync\",\"id\":\"repo-1\"},\"environment\":\"sandbox\",\"allowlistPolicyId\":\"sandbox-policy\",\"mutationsAllowed\":true}";

const contract: ContractDocument = {
  contractId: "team-contract",
  contractVersion: "1.0.0",
  sourceRevision: "revision-10",
  metadata: { contractId: "team-contract", contractVersion: "1.0.0", sourceRevision: "revision-10", canonicalVocabulary: ["milestone", "epic", "workItem", "boardStatus", "planningState", "executionSet", "attentionState", "syncState", "evidenceRefs"] },
  body: `## Lifecycle\n\n1. To Do\n2. In Progress\n3. Review\n4. Ready for Deploy\n5. Ready for Test\n6. Testing\n7. Done\n\n## Stop protocol\n\nStop before any external action when target identity, authority, capability, or evidence is unknown, ambiguous, unsupported, or stale. Preserve local evidence and request an explicit, bounded decision instead of enabling execution.`,
  capabilities: [],
};

const artifact: CanonicalWorkArtifact = {
  artifactId: "artifact-10", milestoneId: "milestone-10", vision: "Safe sync.", scope: ["orchestration"], nonGoals: ["live calls"], requirements: ["read-back"], implementationPlan: ["validate"], testPlan: ["e2e"], acceptanceCriteria: ["verified"], reviewPoints: ["outbox"], decisions: ["local only"], evidenceRefs: ["milestone-finalization-record"], unknowns: [], dependencies: ["contract:team-contract"], projectContext: "fixture", currentState: "Finalized",
};
const milestone: Milestone = { canonicalId: "milestone-10", summary: "Safe sync", description: artifact, parentCanonicalId: null, boardStatus: "To Do" };
const epics: Epic[] = [
  { canonicalId: "epic-10a", summary: "Jira", parentMilestoneId: milestone.canonicalId, boardStatus: "To Do" },
  { canonicalId: "epic-10b", summary: "Evidence", parentMilestoneId: milestone.canonicalId, boardStatus: "To Do" },
];
const children: ChildWorkItem[] = [
  { canonicalId: "story-10", type: "story", summary: "Start safely", parentEpicId: epics[0]!.canonicalId, boardStatus: "To Do", acceptanceCriteria: ["Start check passes."] },
  { canonicalId: "task-10", type: "task", summary: "Record audit", parentEpicId: epics[0]!.canonicalId, boardStatus: "To Do", acceptanceCriteria: ["Outbox remains immutable."] },
  { canonicalId: "bug-10", type: "bug", summary: "Stop unknown work", parentEpicId: epics[1]!.canonicalId, boardStatus: "To Do", acceptanceCriteria: ["Timeout stays pending."] },
];
const executionSet: ExecutionSet = { executionSetId: "execution-set-10", epicId: epics[0]!.canonicalId, workItemIds: ["story-10", "task-10"], owner: "engineering", agentHost: "codex", jiraProjectKey: "GDEAI", jiraBoardId: "42", branchName: "codex/task-10", worktreePath: "C:/worktrees/task-10", baseRevision: "abc123", affectedPaths: ["src/orchestrator"], dependencyIds: ["contract:team-contract"], acceptanceBoundary: ["Task 10"], targetEnvironment: "sandbox", pullRequestUrls: ["https://example.test/pr/10"] };

test("e2e: finalized hierarchy reaches verified In Progress through a local gateway and preserves planned and failed events", async () => {
  const finalization = finalizeMilestone({ milestone, canonicalWorkArtifact: artifact, epics, workItems: children, acceptanceDecision: "accepted", sourceContractRevision: "revision-10" });
  assert.equal(finalization.epics.length, 2);
  assert.equal(finalization.workItems.length, 3);
  assert.equal(executionSet.workItemIds.length, 2);
  assert.equal(runImplementationStartCheck(startCheckInput()).passed, true);

  await withOutbox(async (outbox, dataDirectory) => {
    const gateway = new MemoryJiraGateway("applied", async () => (await outbox.readPending()).some((pending) => pending.idempotencyKey === implementationStartedEvent().idempotencyKey));
    const orchestrator = createOrchestrator(outbox, gateway);
    const event = implementationStartedEvent();

    const planned = await orchestrator.handle(event, "dry_run");
    assert.equal(planned.state, "planned");
    assert.ok(planned.evidenceRefs.includes("planned:jira.update:story-10"));
    assert.equal(gateway.calls.length, 0);
    assert.equal((await outbox.readPending()).length, 1);

    const applied = await orchestrator.handle(event, "sandbox");
    assert.equal(applied.state, "applied");
    assert.equal(applied.errorCode, null);
    assert.equal(gateway.calls.length, 1);
    assert.equal(gateway.outboxWasPendingBeforeApply, true);
    assert.deepEqual(gateway.operations, ["apply", "read-back"]);
    assert.deepEqual(gateway.calls[0]?.requestedTransition, { from: "To Do", to: "In Progress" });
    assert.deepEqual(await outbox.readPending(), []);

    const replay = await orchestrator.handle(event, "sandbox");
    assert.deepEqual(replay, applied);
    assert.equal(gateway.calls.length, 1);
    assert.deepEqual(gateway.operations, ["apply", "read-back"]);

    const concurrentGateway = new MemoryJiraGateway("paused", async () => true);
    const concurrentOrchestrator = createOrchestrator(outbox, concurrentGateway);
    const concurrentReplayOrchestrator = createOrchestrator(new OutboxStore(dataDirectory), concurrentGateway);
    const concurrentEvent = concurrentEventForReplay();
    const first = concurrentOrchestrator.handle(concurrentEvent, "sandbox");
    await concurrentGateway.waitForApply();
    const second = concurrentReplayOrchestrator.handle(concurrentEvent, "sandbox");
    await Promise.resolve();
    assert.equal(concurrentGateway.calls.length, 1);
    concurrentGateway.releaseApply();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.deepEqual(secondResult, firstResult);
    assert.equal(concurrentGateway.calls.length, 1);

    const pendingGateway = new MemoryJiraGateway("paused", async () => true);
    const pendingOrchestrator = createOrchestrator(outbox, pendingGateway);
    const pendingReplayOrchestrator = createOrchestrator(new OutboxStore(dataDirectory), pendingGateway);
    const pendingEvent = pendingClaimEvent();
    const pendingFirst = pendingOrchestrator.handle(pendingEvent, "sandbox");
    await pendingGateway.waitForApply();
    const pendingSecond = await pendingReplayOrchestrator.handle(pendingEvent, "sandbox");
    assert.equal(pendingSecond.state, "unknown");
    assert.equal(pendingSecond.errorCode, "ACTIVE_CLAIM_READ_BACK_UNVERIFIED");
    assert.deepEqual(pendingGateway.operations, ["apply", "read-back"]);
    pendingGateway.releaseApply();
    assert.equal((await pendingFirst).state, "applied");

    const partial = await createOrchestrator(outbox, new MemoryJiraGateway("partial", async () => true)).handle(reviewEvent(), "sandbox");
    assert.equal(partial.state, "stopped");
    assert.equal(partial.errorCode, "PARTIAL_COMPLETION");
    assert.equal((await outbox.readPending()).map((pending) => pending.idempotencyKey).includes(reviewEvent().idempotencyKey), true);

    const unknown = await createOrchestrator(outbox, new MemoryJiraGateway("timeout", async () => true)).handle(timeoutEvent(), "sandbox");
    assert.equal(unknown.state, "unknown");
    assert.equal(unknown.errorCode, "TIMEOUT");
    assert.equal((await outbox.readPending()).map((pending) => pending.idempotencyKey).includes(timeoutEvent().idempotencyKey), true);

    for (const mismatchKind of ["target", "canonical", "external", "fields", "status", "transition"] as const) {
      const mismatchGateway = new MemoryJiraGateway(mismatchKind, async () => true);
      const mismatch = await createOrchestrator(outbox, mismatchGateway).handle(mismatchEvent(mismatchKind), "sandbox");
      assert.equal(mismatch.state, "stopped", mismatchKind);
      assert.equal(mismatch.errorCode, "READ_BACK_MISMATCH", mismatchKind);
      assert.deepEqual(mismatchGateway.operations, ["apply", "read-back"], mismatchKind);
      assert.equal((await outbox.readPending()).some((pending) => pending.idempotencyKey === mismatchEvent(mismatchKind).idempotencyKey), true, mismatchKind);
    }

    const targetGateway = new MemoryJiraGateway("applied", async () => true);
    const targetMismatch = await createOrchestrator(outbox, targetGateway).handle(targetMismatchEvent(), "sandbox");
    assert.equal(targetMismatch.state, "stopped");
    assert.equal(targetMismatch.errorCode, "TARGET_IDENTITY_MISMATCH");
    assert.deepEqual(targetGateway.operations, []);
    assert.equal((await outbox.readPending()).some((pending) => pending.idempotencyKey === targetMismatchEvent().idempotencyKey), false);

    const connectorTenantMismatch = await createOrchestrator(outbox, {
      targetTenantUrl: "https://other.example.test",
      applyProjection: async () => { throw new Error("connector must not be called"); },
      readBack: async () => { throw new Error("connector must not be called"); },
    }).handle(implementationStartedEvent(), "dry_run");
    assert.equal(connectorTenantMismatch.state, "stopped");
    assert.equal(connectorTenantMismatch.errorCode, "CONNECTOR_TENANT_MISMATCH");
    assert.equal((await outbox.readPending()).some((pending) => pending.idempotencyKey === implementationStartedEvent().idempotencyKey), false);

    const crossTenantGateway = new MemoryJiraGateway("applied", async () => true);
    const crossTenantMismatch = await createOrchestrator(outbox, crossTenantGateway).handle(crossTenantEvent(), "sandbox");
    assert.equal(crossTenantMismatch.errorCode, "TARGET_IDENTITY_MISMATCH");
    assert.deepEqual(crossTenantGateway.operations, []);

    const evidenceGateway = new MemoryJiraGateway("applied", async () => true);
    const unsafeEvidence = await createOrchestrator(outbox, evidenceGateway).handle(unsafeEvidenceEvent(), "dry_run");
    assert.equal(unsafeEvidence.state, "stopped");
    assert.equal(unsafeEvidence.errorCode, "EVIDENCE_UNSAFE");
    assert.doesNotMatch(JSON.stringify(unsafeEvidence), /raw transcript|token-value/i);
    assert.deepEqual(evidenceGateway.operations, []);
    assert.equal((await outbox.readPending()).some((pending) => pending.idempotencyKey === unsafeEvidenceEvent().idempotencyKey), false);
  });
});

test("e2e: CLI finalize and conformance are local, planned, and redact-safe", async () => {
  const finalize = await runCli(["finalize", "--input", "test/fixtures/valid-milestone.md", "--dry-run"]);
  assert.equal(finalize.exitCode, 0);
  assert.match(finalize.stdout, /"state":"planned"/);
  assert.doesNotMatch(`${finalize.stdout}${finalize.stderr}`, /authorization|token|password/i);

  await withEventFile(async (eventPath) => {
    const sync = await runCli(["sync", "--event", eventPath, "--dry-run"]);
    assert.equal(sync.exitCode, 0);
    assert.match(sync.stdout, /"state":"planned"/);
    assert.doesNotMatch(`${sync.stdout}${sync.stderr}`, /authorization|token|password/i);

    const unknown = await runCli(["sync", "--event", eventPath, "--local-result", "unknown"]);
    assert.equal(unknown.exitCode, 3);
    assert.match(unknown.stdout, /"state":"unknown"/);

    await writeFile(eventPath, JSON.stringify(unsafeEvidenceEvent()), "utf8");
    const rejected = await runCli(["sync", "--event", eventPath, "--dry-run"]);
    assert.equal(rejected.exitCode, 2);
    assert.doesNotMatch(`${rejected.stdout}${rejected.stderr}`, /raw transcript|token-value/i);
  });

  const conformance = await runCli(["conformance"]);
  assert.equal(conformance.exitCode, 0);
  assert.match(conformance.stdout, /codex/);
  assert.match(conformance.stdout, /claude-code/);
  assert.match(conformance.stdout, /cursor/);
});

function createOrchestrator(outbox: OutboxStore, jira: { targetTenantUrl: string; applyProjection(intent: JiraProjectionIntent): Promise<ConnectorResult>; readBack(canonicalId: string): Promise<ReadBackState>; }): SyncOrchestrator {
  return new SyncOrchestrator({
    contract,
    projectProfile: profile,
    target,
    allowlistRegistry: [{ policyId: "sandbox-policy", target, operations: [{ name: "jira.update", mutating: true }], allowedFields: ["summary", "status"], allowedTransitions: ["To Do->In Progress", "In Progress->Review"], allowedActorScopes: ["sandbox"], capabilities: [{ name: "jira.issue.write", proof: "local-fixture" }] }],
    outbox,
    jira,
    actorScope: "sandbox",
    capability: { name: "jira.issue.write", proof: "local-fixture" },
  });
}

function implementationStartedEvent(): CanonicalEvent {
  return event("implementation_started", "To Do", "In Progress", ["milestone-finalization-record", "accepted-scope-record", "implementation-start-check-passed", "implementation-started", "github:pr-10:verified"], targetIdentity);
}

function reviewEvent(): CanonicalEvent { return event("implementation_completed", "In Progress", "Review", ["implementation-complete", "github:pr-10:verified"], targetIdentity); }
function timeoutEvent(): CanonicalEvent { return event("implementation_started_timeout", "To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"], targetIdentity); }
function concurrentEventForReplay(): CanonicalEvent { return event("implementation_started_concurrent", "To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"], targetIdentity); }
function pendingClaimEvent(): CanonicalEvent { return event("implementation_started_pending_claim", "To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"], targetIdentity); }
function mismatchEvent(kind: string): CanonicalEvent { return event(`implementation_started_mismatch_${kind}`, "To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"], targetIdentity); }
function targetMismatchEvent(): CanonicalEvent { return event("implementation_started_target_mismatch", "To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"], "{\"version\":1,\"tenantUrl\":\"https://sandbox.example.test\",\"jiraTenantId\":\"tenant-1\",\"jiraProject\":{\"key\":\"OTHER\",\"id\":\"project-1\"},\"confluenceSpace\":{\"key\":\"ENG\",\"id\":\"space-1\"},\"githubRepository\":{\"owner\":\"example\",\"name\":\"agent-sync\",\"id\":\"repo-1\"},\"environment\":\"sandbox\",\"allowlistPolicyId\":\"sandbox-policy\",\"mutationsAllowed\":true}"); }
function crossTenantEvent(): CanonicalEvent { return event("implementation_started_cross_tenant", "To Do", "In Progress", ["implementation-start-check-passed", "implementation-started"], crossTenantTargetIdentity); }
function unsafeEvidenceEvent(): CanonicalEvent { return event("implementation_started_unsafe_evidence", "To Do", "In Progress", ["raw transcript token-value"], targetIdentity); }

function event(eventType: string, beforeState: string, afterState: string, evidenceRefs: string[], targetIdentity: string): CanonicalEvent {
  return createCanonicalEvent({ executionSetId: executionSet.executionSetId, artifactId: "story-10", correlationId: `${eventType}-correlation`, source: { authority: "codex", canonicalId: "story-10", targetIdentity, requestedOperation: "jira.update" }, actor: "codex", eventType, sourceRevision: "revision-10", beforeState, afterState, evidenceRefs });
}

function startCheckInput() {
  return { milestoneId: milestone.canonicalId, epicId: epics[0]!.canonicalId, workItemIds: executionSet.workItemIds, acceptanceCriteria: artifact.acceptanceCriteria, dependencyIds: executionSet.dependencyIds, repository: "example/agent-sync", branchName: executionSet.branchName, worktreePath: executionSet.worktreePath, baseRevision: executionSet.baseRevision, actor: "codex", roadmapRevision: "revision-10", finalization: { state: "finalized" as const, acceptanceDecision: "accepted" as const, evidenceRefs: ["milestone-finalization-record"] }, acceptedScope: { workItemIds: executionSet.workItemIds, acceptanceCriteria: artifact.acceptanceCriteria, evidenceRefs: ["accepted-scope-record"] }, hierarchy: { epicParentMilestoneId: milestone.canonicalId, workItemParentEpicIds: { "story-10": epics[0]!.canonicalId, "task-10": epics[0]!.canonicalId } } };
}

class MemoryJiraGateway {
  readonly targetTenantUrl = "https://sandbox.example.test";
  readonly calls: JiraProjectionIntent[] = [];
  readonly operations: string[] = [];
  outboxWasPendingBeforeApply: boolean | null = null;
  private releasePausedApply: (() => void) | null = null;
  private completed = false;
  private readonly applyStarted: Promise<void>;
  private signalApplyStarted: () => void = () => undefined;
  constructor(private readonly outcome: "applied" | "partial" | "timeout" | "paused" | "target" | "canonical" | "external" | "fields" | "status" | "transition", private readonly observeOutboxBeforeApply: () => Promise<boolean>) {
    this.applyStarted = new Promise<void>((resolve) => { this.signalApplyStarted = resolve; });
  }
  async applyProjection(intent: JiraProjectionIntent): Promise<ConnectorResult> {
    this.outboxWasPendingBeforeApply = await this.observeOutboxBeforeApply();
    this.operations.push("apply");
    this.calls.push(intent);
    this.signalApplyStarted();
    if (this.outcome === "partial") throw new ConnectorFailure("PARTIAL_COMPLETION", 207, { reason: "local fixture partial" });
    if (this.outcome === "timeout") throw new ConnectorFailure("TIMEOUT", null, { reason: "local fixture timeout" });
    if (this.outcome === "paused") await new Promise<void>((resolve) => { this.releasePausedApply = resolve; });
    this.completed = true;
    return { state: "applied", externalId: "GDEAI-10", correlationId: "local", readBackRequired: false };
  }
  async waitForApply(): Promise<void> { await this.applyStarted; }
  releaseApply(): void { if (this.releasePausedApply === null) throw new Error("paused apply is not ready"); this.releasePausedApply(); }
  async readBack(canonicalId: string): Promise<ReadBackState> {
    this.operations.push("read-back");
    const intent = this.calls.at(-1);
    if (intent === undefined) throw new Error("read-back requires a projection call");
    return {
      target: this.outcome === "target" ? crossTenantTargetIdentity : targetIdentity,
      canonicalId: this.outcome === "canonical" ? "other-canonical-id" : canonicalId,
      externalId: this.outcome === "external" ? "OTHER-10" : "GDEAI-10",
      fields: !this.completed ? { status: "To Do" } : this.outcome === "fields" ? { status: "In Progress", extra: "value" } : intent.fields,
      status: !this.completed ? "To Do" : this.outcome === "status" ? "Review" : "In Progress",
      version: "1",
      observedAt: "2026-07-29T12:00:00.000Z",
      parentCanonicalId: null,
      attachmentPaths: [],
      requestedTransition: this.outcome === "transition" ? { from: "In Progress", to: "Review" } : intent.requestedTransition,
    };
  }
}

async function withOutbox(callback: (outbox: OutboxStore, dataDirectory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "agent-sync-e2e-"));
  try { await callback(new OutboxStore(directory), directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

async function withEventFile(callback: (eventPath: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "agent-sync-cli-"));
  const eventPath = join(directory, "implementation-started.json");
  try {
    await writeFile(eventPath, JSON.stringify(implementationStartedEvent()), "utf8");
    await callback(eventPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["dist/cli.js", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

test("e2e: one Milestone context isolates parallel Epic developer resumes and revision changes stop both", () => {
  const m3Milestone: MilestoneContext = {
    contextVersion: "1.0", kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "m3-revision-1", owner: "product-owner", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", milestoneId: "milestone-m3", canonicalArtifactId: "artifact-m3", projectVision: "Portable resumable work.", roadmap: "M3", scope: ["session context"], nonGoals: ["host execution"], decisions: ["share Milestone decisions"], forecast: ["two isolated Epics"], evidenceRefs: ["decision:m3"], unknowns: [], dependencies: ["contract:team-contract"], epicIds: ["epic-a", "epic-b"],
  };
  const makeEpic = (id: string, workItemId: string): EpicContext => ({
    contextVersion: "1.0", kind: "EPIC", contextId: id, sourceRevision: "m3-revision-1", owner: "engineering", retention: "TEAM", state: "ACCEPTED", readScope: "FULL_MILESTONE", writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", epicId: id, milestoneId: "milestone-m3", outcome: `Deliver ${id}.`, featureValue: `Value ${id}.`, scope: [id], nonGoals: ["cross-Epic changes"], workItemIds: [workItemId], acceptanceCriteria: ["resume is isolated"], decisions: ["use current context"], evidenceRefs: ["test:m3-e2e"], unknowns: [], dependencies: ["milestone:milestone-m3"],
  });
  const epicA = makeEpic("epic-a", "story-a");
  const epicB = makeEpic("epic-b", "story-b");
  const runtime: ResumeRuntime = { repository: "BillBalint-SM/AI-Booster-Kit", branch: "dev-m3-session-state", worktree: "C:/worktrees/m3", baseRevision: "a3df0d99", currentSetupFingerprint: "setup-m3", evidenceRefs: ["decision:m3", "test:m3-e2e"] };
  const makeDeveloperSession = (sessionId: string, epic: EpicContext, workItemId: string): SessionState => ({
    sessionVersion: "1.0", sessionId, owner: "engineering", retention: "TEAM", readScope: "FULL_MILESTONE", executionScope: { kind: "EPIC", contextId: epic.contextId, workItemIds: [workItemId] }, writeAuthority: "ARTIFACT_OWNER_THROUGH_APPROVED_PR", contextReferences: [{ kind: "MILESTONE", contextId: "milestone-context-m3", sourceRevision: "m3-revision-1" }, { kind: "EPIC", contextId: epic.contextId, sourceRevision: "m3-revision-1" }], workItemIds: [workItemId], activationPackageId: "activation-m3", recipe: { recipeId: "bounded-implementation", recipeVersion: "0.1.0", variantId: "base" }, setupFingerprint: "setup-m3", status: "PAUSED", decisions: [], evidenceRefs: ["test:m3-e2e"], unknowns: [], deviations: [], dependencies: [], progress: [], nextAction: `Continue ${epic.contextId}.`, execution: { repository: "BillBalint-SM/AI-Booster-Kit", branch: "dev-m3-session-state", worktree: "C:/worktrees/m3", baseRevision: "a3df0d99" },
  });
  const developerA = makeDeveloperSession("session-a", epicA, "story-a");
  const developerB = makeDeveloperSession("session-b", epicB, "story-b");

  assert.equal(evaluateSessionResume(developerA, [m3Milestone, epicA, epicB], runtime).decision, "RESUME");
  assert.equal(evaluateSessionResume(developerB, [m3Milestone, epicA, epicB], runtime).decision, "RESUME");
  assert.equal(evaluateSessionResume(developerA, [m3Milestone, epicB], runtime).decision, "STOPPED");
  assert.equal(evaluateSessionResume(developerA, [{ ...m3Milestone, sourceRevision: "m3-revision-2" }, epicA, epicB], runtime).decision, "STOPPED");
  assert.equal(evaluateSessionResume(developerB, [{ ...m3Milestone, sourceRevision: "m3-revision-2" }, epicA, epicB], runtime).decision, "STOPPED");
  assert.deepEqual(m3Milestone.decisions, ["share Milestone decisions"]);
});

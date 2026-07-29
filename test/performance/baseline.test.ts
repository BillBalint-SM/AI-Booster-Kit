import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { test } from "node:test";

import { parseMarkdownContract, validateContractDocument, type ContractDocument } from "../../src/contract/markdown.js";
import { JiraGateway } from "../../src/connectors/jira.js";
import { ConnectorFailure, type ConnectorResult, type JiraProjectionIntent, type ReadBackState } from "../../src/connectors/types.js";
import type { CanonicalEvent, CanonicalWorkArtifact, ChildWorkItem, Epic, Milestone } from "../../src/domain/model.js";
import { createCanonicalEvent } from "../../src/events/envelope.js";
import { OutboxStore } from "../../src/events/outbox.js";
import { loadProjectProfile } from "../../src/lifecycle/profile.js";
import { finalizeMilestone } from "../../src/planning/finalize.js";
import { assertAllowlistedOperation } from "../../src/orchestrator/allowlist.js";
import { resolveTargetIdentity } from "../../src/orchestrator/identity.js";
import { resolvedTargetIdentity, SyncOrchestrator } from "../../src/orchestrator/sync.js";
import { startConnectorFixture } from "../fixtures/connector-server.js";

const localIterations = 30;
const orchestrationIterations = 10;
const fixtureReadBackIterations = 10;
const fixtureCredential = "baseline-fixture-credential";
const acceptedEvidenceRefs = ["milestone-finalization-record", "accepted-scope-record", "implementation-start-check-passed", "implementation-started", "github:pr-baseline:verified"];
const dryRunGateway = {
  targetTenantUrl: "https://sandbox.example.test",
  applyProjection: async (): Promise<ConnectorResult> => ({ state: "applied", externalId: "unused", correlationId: "unused", readBackRequired: false }),
  readBack: async (): Promise<ReadBackState> => { throw new Error("dry-run must not read back"); },
};

interface Measurement {
  samples: number;
  failures: number;
  medianMs: number;
  p95Ms: number;
  cpuUserMicros: number;
  cpuSystemMicros: number;
  failureClasses: Record<string, number>;
}

test("performance: records local V1 baseline and verifies security stop paths", async () => {
  const contractText = await readFile(resolve("contract/team-contract.md"), "utf8");
  const contract = parseMarkdownContract(contractText, "contract/team-contract.md");
  const dataDirectory = await mkdtemp(join(tmpdir(), "sync-baseline-"));
  const fixture = await startConnectorFixture();

  try {
    const parseValidation = await measure(localIterations, () => {
      const parsed = parseMarkdownContract(contractText, "contract/team-contract.md");
      validateContractDocument(parsed, "contract:team-contract");
    });
    const finalization = await measure(localIterations, () => {
      finalizeMilestone(finalizationInput());
    });
    const outbox = new OutboxStore(dataDirectory);
    const outboxAppend = await measure(localIterations, async (iteration) => {
      await outbox.append(eventFor(iteration, acceptedEvidenceRefs));
    });
    const dryRunDiagnostic = await createOrchestrator(contract, outbox, dryRunGateway).handle(eventFor(99, acceptedEvidenceRefs), "dry_run");
    assert.equal(dryRunDiagnostic.state, "planned");
    const dryRun = await measure(orchestrationIterations, async (iteration) => {
      const result = await createOrchestrator(contract, outbox, dryRunGateway).handle(eventFor(100 + iteration, acceptedEvidenceRefs), "dry_run");
      assert.equal(result.state, "planned");
    });
    const gateway = new JiraGateway({
      baseUrl: fixture.baseUrl("success"),
      targetTenantUrl: fixtureOrigin(fixture, "success"),
      credentialProvider: () => fixtureCredential,
      correlationId: "baseline-read-back",
      target: "local-target",
      timeoutMs: 1_000,
      projectKey: "GDEAI",
      allowedFields: ["status"],
    });
    await gateway.applyProjection({ canonicalId: "baseline-fixture", workItemType: "Story", parentCanonicalId: null, fields: { status: "To Do" }, attachmentPaths: [], requestedTransition: null });
    const fixtureReadBack = await measure(fixtureReadBackIterations, async () => {
      const readBack = await gateway.readBack("baseline-fixture");
      assert.equal(readBack.canonicalId, "baseline-fixture");
    });

    assertMeasurements({ parseValidation, finalization, outboxAppend, dryRun, fixtureReadBack });
    await assertSecurityPaths(fixture, contract, outbox);

    console.log(JSON.stringify({
      type: "sync-orchestrator-v1-baseline",
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        runtime: "node:test",
      },
      samples: {
        contractParseValidation: parseValidation.samples,
        finalization: finalization.samples,
        outboxAppend: outboxAppend.samples,
        dryRunOrchestration: dryRun.samples,
        fixtureReadBack: fixtureReadBack.samples,
      },
      responseClass: "local-127.0.0.1-fixture-success",
      measurements: { parseValidation, finalization, outboxAppend, dryRun, fixtureReadBack },
    }));
  } finally {
    await fixture.close();
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

async function measure(iterations: number, operation: (iteration: number) => void | Promise<void>): Promise<Measurement> {
  const samples: number[] = [];
  let failures = 0;
  const failureClasses: Record<string, number> = {};
  const cpuStart = process.cpuUsage();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const start = performance.now();
    try {
      await operation(iteration);
    } catch (error: unknown) {
      failures += 1;
      const failureClass = classifyFailure(error);
      failureClasses[failureClass] = (failureClasses[failureClass] ?? 0) + 1;
    }
    samples.push(performance.now() - start);
  }
  const cpu = process.cpuUsage(cpuStart);
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    samples: samples.length,
    failures,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    cpuUserMicros: cpu.user,
    cpuSystemMicros: cpu.system,
    failureClasses,
  };
}

function percentile(sorted: readonly number[], percentileValue: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index] ?? Number.NaN;
}

function assertMeasurements(measurements: Record<string, Measurement>): void {
  const requiredSamples = { parseValidation: localIterations, finalization: localIterations, outboxAppend: localIterations, dryRun: orchestrationIterations, fixtureReadBack: fixtureReadBackIterations };
  for (const [name, measurement] of Object.entries(measurements)) {
    assert.equal(measurement.samples, requiredSamples[name as keyof typeof requiredSamples]);
    assert.ok(Number.isFinite(measurement.medianMs));
    assert.ok(Number.isFinite(measurement.p95Ms));
    assert.ok(Number.isFinite(measurement.cpuUserMicros));
    assert.ok(Number.isFinite(measurement.cpuSystemMicros));
  }
}

function classifyFailure(error: unknown): string {
  if (error instanceof ConnectorFailure) return `connector:${error.code}`;
  if (error instanceof Error && error.name.trim() !== "") return `error:${error.name}`;
  return "error:non_error_throw";
}

async function assertSecurityPaths(
  fixture: Awaited<ReturnType<typeof startConnectorFixture>>,
  contract: ContractDocument,
  outbox: OutboxStore,
): Promise<void> {
  const providerFailure = new JiraGateway({
    baseUrl: fixture.baseUrl("success"), targetTenantUrl: fixtureOrigin(fixture, "success"), credentialProvider: () => { throw new Error("credential-provider-secret"); }, correlationId: "provider-failure", target: "local-target", timeoutMs: 1_000, projectKey: "GDEAI", allowedFields: ["status"],
  });
  await assert.rejects(providerFailure.readBack("baseline-provider"), (error: unknown) => {
    const rendered = JSON.stringify(error);
    return error instanceof ConnectorFailure && error.code === "INVALID_INTENT" && !rendered.includes("credential-provider-secret");
  });

  const unauthorized = new JiraGateway({
    baseUrl: fixture.baseUrl("unauthorized"), targetTenantUrl: fixtureOrigin(fixture, "unauthorized"), credentialProvider: () => fixtureCredential, correlationId: "redaction", target: "local-target", timeoutMs: 1_000, projectKey: "GDEAI", allowedFields: ["status"],
  });
  await assert.rejects(unauthorized.readBack("baseline-redaction"), (error: unknown) => {
    const rendered = JSON.stringify(error);
    return error instanceof ConnectorFailure && error.code === "UNAUTHORIZED" && !rendered.includes(fixtureCredential);
  });

  for (const tenantUrl of ["http://sandbox.example.test", "https://user:password@sandbox.example.test", "https://sandbox.example.test/path?query=value"]) {
    assert.throws(() => resolveTargetIdentity(targetInput(tenantUrl)), /credential-free HTTPS URL/);
  }

  const production = { ...target, environment: "production" as const };
  const productionDecision = assertAllowlistedOperation(allowlistInput(production, "jira.update"));
  assert.equal(productionDecision.allowed, false);
  assert.ok(productionDecision.reasons.includes("production_target_mutation"));
  for (const operation of ["jira.delete", "jira.permission.change", "jira.workflow.change"]) {
    const decision = assertAllowlistedOperation(allowlistInput(target, operation));
    assert.equal(decision.allowed, false);
    assert.ok(decision.reasons.includes(`forbidden_operation:${operation}`));
  }

  let connectorCalls = 0;
  const result = await createOrchestrator(contract, outbox, {
    targetTenantUrl: target.tenantUrl,
    applyProjection: async () => { connectorCalls += 1; throw new Error("connector must not be called"); },
    readBack: async () => { connectorCalls += 1; throw new Error("connector must not be called"); },
  }).handle(eventFor(999, ["raw transcript baseline-secret"]), "dry_run");
  assert.equal(result.state, "stopped");
  assert.equal(result.errorCode, "EVIDENCE_UNSAFE");
  assert.equal(connectorCalls, 0);
  assert.doesNotMatch(JSON.stringify(result), /raw transcript|baseline-secret/i);
}

const target = resolveTargetIdentity(targetInput("https://sandbox.example.test"));

function targetInput(tenantUrl: string) {
  const candidate = {
    tenantUrl, projectKey: "GDEAI", spaceKey: "ENG", repositoryOwner: "example", repositoryName: "agent-sync", jiraTenantId: "tenant-1", jiraProjectId: "project-1", confluenceSpaceId: "space-1", githubRepositoryId: "repo-1", environment: "sandbox" as const, allowlistPolicyId: "sandbox-policy", policyMutation: { mutationsAllowed: true },
  };
  return { tenantUrl, projectKey: "GDEAI", spaceKey: "ENG", repositoryOwner: "example", repositoryName: "agent-sync", candidates: [candidate] };
}

function allowlistInput(candidateTarget: typeof target, operation: string) {
  return {
    operation, target: candidateTarget, fields: ["status"], transition: { from: "To Do", to: "In Progress" }, actorScope: "sandbox", capability: { name: "jira.issue.write", proof: "baseline-proof" },
    policyRegistry: [{ policyId: "sandbox-policy", target: candidateTarget, operations: [{ name: "jira.update", mutating: true }], allowedFields: ["status"], allowedTransitions: ["To Do->In Progress"], allowedActorScopes: ["sandbox"], capabilities: [{ name: "jira.issue.write", proof: "baseline-proof" }] }],
  };
}

function createOrchestrator(contract: ContractDocument, outbox: OutboxStore, jira: { targetTenantUrl: string; applyProjection(intent: JiraProjectionIntent): Promise<ConnectorResult>; readBack(canonicalId: string): Promise<ReadBackState>; }): SyncOrchestrator {
  return new SyncOrchestrator({ contract, projectProfile: loadProjectProfile("test/fixtures/project-profile.json"), target, allowlistRegistry: allowlistInput(target, "jira.update").policyRegistry, outbox, jira, actorScope: "sandbox", capability: { name: "jira.issue.write", proof: "baseline-proof" } });
}

function fixtureOrigin(fixture: Awaited<ReturnType<typeof startConnectorFixture>>, scenario: string): string {
  return new URL(fixture.baseUrl(scenario)).origin;
}

function eventFor(iteration: number, evidenceRefs: string[]): CanonicalEvent {
  return createCanonicalEvent({ executionSetId: `execution-set-${iteration}`, artifactId: "artifact-baseline", correlationId: `baseline-${iteration}`, source: { authority: "codex", canonicalId: `story-${iteration}`, targetIdentity: resolvedTargetIdentity(target), requestedOperation: "jira.update" }, actor: "codex", eventType: "implementation_started", sourceRevision: `baseline-${iteration}`, beforeState: "To Do", afterState: "In Progress", evidenceRefs });
}

function finalizationInput() {
  const artifact: CanonicalWorkArtifact = { artifactId: "artifact-baseline", milestoneId: "milestone-baseline", vision: "Measure local finalization.", scope: ["baseline"], nonGoals: ["external writes"], requirements: ["deterministic"], implementationPlan: ["finalize"], testPlan: ["baseline"], acceptanceCriteria: ["returns projections"], reviewPoints: ["traceability"], decisions: ["local only"], evidenceRefs: [], unknowns: [], dependencies: ["contract:team-contract"], projectContext: "local fixture", currentState: "Finalized" };
  const milestone: Milestone = { canonicalId: "milestone-baseline", summary: "Baseline", description: artifact, parentCanonicalId: null, boardStatus: "To Do" };
  const epics: Epic[] = [{ canonicalId: "epic-baseline", summary: "Measure", parentMilestoneId: milestone.canonicalId, boardStatus: "To Do" }];
  const workItems: ChildWorkItem[] = [{ canonicalId: "story-baseline", type: "story", summary: "Measure baseline", parentEpicId: epics[0]!.canonicalId, boardStatus: "To Do", acceptanceCriteria: ["Measurements are recorded."] }];
  return { milestone, canonicalWorkArtifact: artifact, epics, workItems, acceptanceDecision: "accepted" as const, sourceContractRevision: "baseline-revision" };
}

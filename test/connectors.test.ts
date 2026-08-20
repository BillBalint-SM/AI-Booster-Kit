import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ConfluenceGateway } from "../src/connectors/confluence.js";
import { GitHubGateway } from "../src/connectors/github.js";
import { JiraGateway } from "../src/connectors/jira.js";
import { ConnectorFailure } from "../src/connectors/types.js";
import { startConnectorFixture, type ConnectorFixture } from "./fixtures/connector-server.js";

const credential = "local-fixture-credential";
// Normal fixture calls need scheduler headroom; only the never-responding scenario tests the short abort boundary.
const fixtureRequestTimeoutMs = 1_000;
const intentionalTimeoutMs = 100;
let fixture: ConnectorFixture;

before(async () => {
  fixture = await startConnectorFixture();
  assert.equal(new URL(fixture.baseUrl("success")).hostname, "127.0.0.1");
});

after(async () => {
  await fixture.close();
});

test("connectors: Jira projects only allowlisted fields through the local fixture and verifies read-back", async () => {
  const gateway = new JiraGateway({
    baseUrl: fixture.baseUrl("success"),
    targetTenantUrl: fixtureOrigin("success"),
    credentialProvider: () => credential,
    correlationId: "correlation-102",
    target: "local-target",
    projectKey: "GDEAI",
    allowedFields: ["summary", "description", "parent", "status"],
    timeoutMs: fixtureRequestTimeoutMs,
  });

  const result = await gateway.applyProjection({
    canonicalId: "GDEAI-102",
    workItemType: "Story",
    parentCanonicalId: "GDEAI-101",
    fields: { summary: "Projection", description: "Scoped description", parent: "GDEAI-101", status: "To Do" },
    attachmentPaths: ["artifact.md"],
    requestedTransition: null,
  });

  assert.deepEqual(result, { state: "applied", externalId: "JIRA-102", correlationId: "correlation-102", readBackRequired: false });
  const write = fixture.requests.at(-2);
  const readBack = fixture.requests.at(-1);
  assert.deepEqual(write, {
    method: "POST",
    path: "/success/jira/projects/GDEAI/projections",
    query: "",
    body: {
      canonicalId: "GDEAI-102",
      workItemType: "Story",
      parentCanonicalId: "GDEAI-101",
      fields: { summary: "Projection", description: "Scoped description", parent: "GDEAI-101", status: "To Do" },
      attachmentPaths: ["artifact.md"],
      requestedTransition: null,
    },
    correlationId: "correlation-102",
    authorizationPresent: true,
  });
  assert.equal(readBack?.method, "GET");
  assert.equal(readBack?.path, "/success/jira/projects/GDEAI/read-back/GDEAI-102");
  assert.ok(fixture.requests.every((request) => !JSON.stringify(request).includes(credential)));
});

test("connectors: Jira maps local authorization, conflict, rate, timeout, partial, malformed, and read-back failures without retries", async () => {
  const scenarios: Array<[string, string, number | null]> = [
    ["unauthorized", "UNAUTHORIZED", 401],
    ["forbidden", "FORBIDDEN", 403],
    ["missing", "NOT_FOUND", 404],
    ["conflict", "CONFLICT", 409],
    ["rate-limited", "RATE_LIMITED", 429],
    ["partial", "PARTIAL_COMPLETION", 207],
    ["malformed", "MALFORMED_RESPONSE", 200],
    ["timeout", "TIMEOUT", null],
    ["stale", "STALE_READ_BACK", null],
    ["target-mismatch", "TARGET_MISMATCH", null],
  ];
  for (const [scenario, code, status] of scenarios) {
    // A timed-out socket can reach the fixture after the caller rejects, so its request ledger must not leak into the next scenario.
    const scenarioFixture = scenario === "timeout" ? await startConnectorFixture() : fixture;
    try {
      const before = scenarioFixture.requests.length;
      const gateway = jiraGateway(scenario, scenarioFixture);
      await assert.rejects(
        gateway.applyProjection(jiraIntent()),
        (error: unknown) => error instanceof ConnectorFailure && error.code === code && error.status === status && !JSON.stringify(error).includes(credential),
      );
      const calls = scenarioFixture.requests.slice(before);
      if (scenario === "timeout") {
        assert.ok(calls.length <= 1, "timeout must not retry an unsafe outcome");
      } else {
        assert.equal(calls.length, ["stale", "target-mismatch"].includes(scenario) ? 2 : 1, `${scenario} must not retry an unsafe outcome`);
      }
    } finally {
      if (scenarioFixture !== fixture) await scenarioFixture.close();
    }
  }
});

test("connectors: redacts resolved credentials from response bodies, messages, and captured request evidence", async () => {
  await assert.rejects(
    jiraGateway("unauthorized").applyProjection(jiraIntent()),
    (error: unknown) => error instanceof ConnectorFailure &&
      error.code === "UNAUTHORIZED" &&
      !JSON.stringify(error.body).includes(credential) &&
      !error.message.includes(credential),
  );
  assert.ok(fixture.requests.every((request) => !JSON.stringify(request).includes(credential)));
});

test("connectors: validates malformed public options and credentials before requests", async () => {
  const malformedOptions = [
    { ...gatewayOptions("success"), baseUrl: "not a URL" },
    { ...gatewayOptions("success"), credentialProvider: undefined },
    { ...gatewayOptions("success"), timeoutMs: 0 },
    { ...gatewayOptions("success"), target: "" },
    { ...gatewayOptions("success"), correlationId: "" },
  ];
  for (const options of malformedOptions) {
    assert.throws(() => new JiraGateway({ ...options, projectKey: "GDEAI", allowedFields: ["summary"] } as never), isInvalidIntent);
  }
  assert.throws(() => new ConfluenceGateway({ ...gatewayOptions("success"), spaceId: "", pageId: "PAGE-8" } as never), isInvalidIntent);
  assert.throws(() => new GitHubGateway({ ...gatewayOptions("success"), repository: "example/repository/extra" } as never), isInvalidIntent);
  await assert.rejects(
    new JiraGateway({ ...jiraGatewayOptions("success"), credentialProvider: () => { throw new Error(credential); } }).applyProjection(jiraIntent()),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "INVALID_INTENT" && !error.message.includes(credential) && !JSON.stringify(error.body).includes(credential),
  );
  await assert.rejects(
    new JiraGateway({ ...jiraGatewayOptions("success"), credentialProvider: () => "" as never }).applyProjection(jiraIntent()),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "INVALID_INTENT",
  );
});

test("connectors: rejects a mismatched tenant origin before resolving credentials or fetching", () => {
  const before = fixture.requests.length;
  let credentialCalls = 0;
  assert.throws(
    () => new JiraGateway({
      ...jiraGatewayOptions("success"),
      targetTenantUrl: "https://sandbox.example.test",
      credentialProvider: () => { credentialCalls += 1; return credential; },
    }),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "TARGET_MISMATCH",
  );
  assert.equal(credentialCalls, 0);
  assert.equal(fixture.requests.length, before);
});

test("connectors: rejects extra or malformed public method input before HTTP", async () => {
  const before = fixture.requests.length;
  const malformedJira = [
    { ...jiraIntent(), unexpected: true },
    { ...jiraIntent(), fields: { summary: "x", status: "To Do", extra: "x" } },
    { ...jiraIntent(), fields: null },
    { ...jiraIntent(), parentCanonicalId: 42 },
    { ...jiraIntent(), attachmentPaths: ["artifact.txt"] },
    null,
  ];
  for (const intent of malformedJira) {
    await assert.rejects(jiraGateway("success").applyProjection(intent as never), isInvalidIntent);
  }
  await assert.rejects(
    new ConfluenceGateway({ ...gatewayOptions("success"), spaceId: "SPACE-8", pageId: "PAGE-8" }).applyProjection({ ...confluenceIntent(), unexpected: true } as never),
    isInvalidIntent,
  );
  await assert.rejects(
    new GitHubGateway({ ...gatewayOptions("success"), repository: "example/repository" }).readEvidence({ repository: "example/repository/extra", branch: "", pullRequest: 1 } as never),
    isInvalidIntent,
  );
  assert.equal(fixture.requests.length, before);
});

test("connectors: requires Jira parent, attachment, and transition read-back state", async () => {
  for (const scenario of ["stale-parent", "stale-attachments", "contradictory-transition"]) {
    await assert.rejects(
      jiraGateway(scenario).applyProjection({ ...jiraIntent(), requestedTransition: { from: "To Do", to: "In Progress" } }),
      (error: unknown) => error instanceof ConnectorFailure && error.code === "STALE_READ_BACK",
    );
  }
});

test("connectors: Jira rejects non-allowlisted fields and backward transitions before HTTP", async () => {
  const before = fixture.requests.length;
  await assert.rejects(
    jiraGateway("success").applyProjection({ ...jiraIntent(), fields: { rawTranscript: "private content" } }),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "INVALID_INTENT",
  );
  await assert.rejects(
    jiraGateway("success").applyProjection({ ...jiraIntent(), requestedTransition: { from: "Review", to: "In Progress" } }),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "INVALID_INTENT",
  );
  assert.equal(fixture.requests.length, before);
});

test("connectors: Confluence writes only the allowlisted roadmap page and requires versioned read-back", async () => {
  const intent = confluenceIntent();
  const gateway = new ConfluenceGateway({ ...gatewayOptions("success"), spaceId: "SPACE-8", pageId: "PAGE-8" });
  const successStart = fixture.requests.length;
  const result = await gateway.applyProjection(intent);
  assert.deepEqual(result, { state: "applied", externalId: "PAGE-8", correlationId: "correlation-102", readBackRequired: false });
  const successRequests = fixture.requests.slice(successStart);
  assert.deepEqual(successRequests, [
    {
      method: "POST",
      path: "/success/confluence/spaces/SPACE-8/pages/PAGE-8/projections",
      query: "",
      body: {
        canonicalMilestoneId: "MILESTONE-8",
        spaceId: "SPACE-8",
        pageId: "PAGE-8",
        body: "# Roadmap\n\nProjected content.",
        attachmentPaths: ["artifact.md"],
      },
      correlationId: "correlation-102",
      authorizationPresent: true,
    },
    {
      method: "GET",
      path: "/success/confluence/spaces/SPACE-8/pages/PAGE-8/read-back/MILESTONE-8",
      query: "",
      body: null,
      correlationId: "correlation-102",
      authorizationPresent: true,
    },
  ]);
  await assert.rejects(
    new ConfluenceGateway({ ...gatewayOptions("stale"), spaceId: "SPACE-8", pageId: "PAGE-8" }).applyProjection(intent),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "STALE_READ_BACK",
  );
  await assert.rejects(
    new ConfluenceGateway({ ...gatewayOptions("confluence-stale-status"), spaceId: "SPACE-8", pageId: "PAGE-8" }).applyProjection(intent),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "STALE_READ_BACK",
  );
  await assert.rejects(
    new ConfluenceGateway({ ...gatewayOptions("stale-content"), spaceId: "SPACE-8", pageId: "PAGE-8" }).applyProjection(intent),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "STALE_READ_BACK",
  );
  await assert.rejects(
    new ConfluenceGateway({ ...gatewayOptions("success"), spaceId: "SPACE-8", pageId: "PAGE-8" }).applyProjection({ ...intent, spaceId: "OTHER" }),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "INVALID_INTENT",
  );
});

test("connectors: GitHub reads evidence only from the named repository with one pull-request mapping", async () => {
  const reference = { repository: "example/repository", branch: "feature/GDEAI-102", pullRequest: 101 };
  const gateway = new GitHubGateway({ ...gatewayOptions("success"), repository: "example/repository" });
  const successStart = fixture.requests.length;
  assert.deepEqual(await gateway.readEvidence(reference), {
    repository: "example/repository",
    branch: "feature/GDEAI-102",
    pullRequest: 101,
    check: { name: "test", state: "success" },
    review: { state: "approved" },
    deployment: { state: "success" },
    verification: { state: "verified" },
  });
  assert.deepEqual(fixture.requests.slice(successStart), [
    {
      method: "GET",
      path: "/success/github/repos/example/repository/evidence",
      query: "?branch=feature%2FGDEAI-102&pullRequest=101",
      body: null,
      correlationId: "correlation-102",
      authorizationPresent: true,
    },
  ]);
  await assert.rejects(
    new GitHubGateway({ ...gatewayOptions("wrong-repository"), repository: "example/repository" }).readEvidence(reference),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "TARGET_MISMATCH",
  );
  await assert.rejects(
    new GitHubGateway({ ...gatewayOptions("wrong-branch"), repository: "example/repository" }).readEvidence(reference),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "TARGET_MISMATCH",
  );
  await assert.rejects(
    new GitHubGateway({ ...gatewayOptions("success"), repository: "example/repository" }).readEvidence({ ...reference, branch: "" }),
    isInvalidIntent,
  );
  await assert.rejects(
    new GitHubGateway({ ...gatewayOptions("ambiguous-pr"), repository: "example/repository" }).readEvidence(reference),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "AMBIGUOUS_MAPPING",
  );
  await assert.rejects(
    gateway.readEvidence({ ...reference, repository: "other/repository" }),
    (error: unknown) => error instanceof ConnectorFailure && error.code === "TARGET_MISMATCH",
  );
});

function gatewayOptions(scenario: string, scenarioFixture: ConnectorFixture = fixture) {
  return {
    baseUrl: scenarioFixture.baseUrl(scenario),
    targetTenantUrl: fixtureOrigin(scenario, scenarioFixture),
    credentialProvider: () => credential,
    correlationId: "correlation-102",
    target: "local-target",
    timeoutMs: scenario === "timeout" ? intentionalTimeoutMs : fixtureRequestTimeoutMs,
  };
}

function fixtureOrigin(scenario: string, scenarioFixture: ConnectorFixture = fixture): string {
  return new URL(scenarioFixture.baseUrl(scenario)).origin;
}

function jiraGateway(scenario: string, scenarioFixture: ConnectorFixture = fixture): JiraGateway {
  return new JiraGateway(jiraGatewayOptions(scenario, scenarioFixture));
}

function jiraGatewayOptions(scenario: string, scenarioFixture: ConnectorFixture = fixture) {
  return { ...gatewayOptions(scenario, scenarioFixture), projectKey: "GDEAI", allowedFields: ["summary", "description", "parent", "status"] };
}

function confluenceIntent() {
  return {
    canonicalMilestoneId: "MILESTONE-8",
    spaceId: "SPACE-8",
    pageId: "PAGE-8",
    body: "# Roadmap\n\nProjected content.",
    attachmentPaths: ["artifact.md"],
  };
}

function isInvalidIntent(error: unknown): boolean {
  return error instanceof ConnectorFailure && error.code === "INVALID_INTENT";
}

function jiraIntent() {
  return {
    canonicalId: "GDEAI-102",
    workItemType: "Story" as const,
    parentCanonicalId: "GDEAI-101",
    fields: { summary: "Projection", description: "Scoped description", parent: "GDEAI-101", status: "To Do" },
    attachmentPaths: ["artifact.md"],
    requestedTransition: null,
  };
}

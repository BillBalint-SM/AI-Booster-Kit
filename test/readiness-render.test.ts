import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateReadiness, type ReadinessCertificate } from "../src/readiness/evaluate.js";
import { parseG2asReadinessManifest } from "../src/readiness/manifest.js";
import { parseReadinessObservationBundle, type ReadinessObservationBundle } from "../src/readiness/observations.js";
import { readinessCapability } from "./readiness-capability.js";
import { renderCertificateJson, renderCertificateMarkdown } from "../src/readiness/render.js";

const manifest = parseG2asReadinessManifest({
  version: 1,
  tenantUrl: "https://pte-politechnika.atlassian.net",
  jira: { projectKey: "G2AS", issueKey: "G2AS-1", expectedStatus: "To Do" },
  confluence: { spaceKey: "G2AS", pageId: "31752193" },
  github: {
    repository: "BillBalint-SM/ultimate-longshot-gate2-sandbox",
    branch: "main",
    commit: "d0971f75c526250f9ee65b8b3b044a4788b31a46",
    fixturePaths: ["docs/fixtures/G2AS-1.md", "docs/fixtures/G2AS-1.json"],
  },
});

test("readiness renderer: produces equivalent safe JSON and Markdown for every fixture", async () => {
  for (const fixtureName of ["ready.json", "not-ready.json", "stopped.json"]) {
    const certificate = evaluateReadiness(manifest, await readBundle(fixtureName), readinessCapability);
    const json = renderCertificateJson(certificate);
    const markdown = renderCertificateMarkdown(certificate);
    const rendered = JSON.parse(json) as Record<string, unknown>;
    const checks = rendered.checks as Array<Record<string, unknown>>;

    assert.equal(rendered.decision, certificate.decision);
    assert.equal(rendered.correlationId, certificate.correlationId);
    assert.equal(rendered.externalWriteCount, 0);
    assert.deepEqual(rendered.remediation, certificate.remediation);
    assert.deepEqual(rendered.decisionOptions, certificate.decisionOptions);
    assert.deepEqual(checks.map((check) => check.state), certificate.checks.map((check) => check.state));
    assert.deepEqual(checks.map((check) => check.expectedFingerprint), certificate.checks.map((check) => check.expectedFingerprint));
    assert.deepEqual(checks.map((check) => check.observedFingerprint), certificate.checks.map((check) => check.observedFingerprint));
    assert.ok(checks.every((check) => !Object.hasOwn(check, "evidenceRefs")));
    assert.equal(json, renderCertificateJson(certificate));

    assert.match(markdown, /^# G2AS Sandbox Readiness Certificate$/m);
    assert.match(markdown, new RegExp(`Decision: ${certificate.decision}`));
    assert.match(markdown, new RegExp(`Correlation ID: ${certificate.correlationId}`));
    assert.match(markdown, new RegExp(`Target fingerprint: ${certificate.manifestFingerprint}`));
    assert.match(markdown, /External writes: 0/);
    assert.match(markdown, /^\| jira \|/m);
    assert.match(markdown, /^\| confluence \|/m);
    assert.match(markdown, /^\| github \|/m);
    assert.match(markdown, /^\| traceability \|/m);
    for (const check of certificate.checks) {
      const row = `| ${check.name} | ${check.state} | ${check.expectedFingerprint} | ${check.observedFingerprint} | ${check.readPath} | ${check.capabilityState} | ${check.diagnosticCode} | ${check.nextAction} |`;
      assert.match(markdown, new RegExp(`^${escapeRegularExpression(row)}$`, "m"));
    }
    for (const action of certificate.remediation) {
      assert.match(markdown, new RegExp(`^- ${escapeRegularExpression(action)}$`, "m"));
    }
    if (fixtureName === "ready.json") {
      assert.deepEqual(certificate.remediation, []);
      assert.match(markdown, /^- None\.$/m);
    }
    assert.match(markdown, new RegExp(`^${escapeRegularExpression(certificate.decisionOptions.join(", "))}$`, "m"));
    assert.doesNotMatch(markdown, /Bearer|fixture-secret|raw transcript|authorization|cookie|credential|password|token/i);
    assert.doesNotMatch(json, /Bearer|fixture-secret|raw transcript|authorization|cookie|credential|password|token/i);
    assert.doesNotMatch(markdown, /jira:issue:10002|confluence:page:31752193|github:commit:|traceability:chain:/);
    assert.doesNotMatch(json, /jira:issue:10002|confluence:page:31752193|github:commit:|traceability:chain:/);
  }
});

test("readiness renderer: rejects unsafe caller-supplied certificate text", async () => {
  const certificate = evaluateReadiness(manifest, await readBundle("ready.json"), readinessCapability);
  const unsafeCertificate: ReadinessCertificate = {
    ...certificate,
    correlationId: "raw transcript fixture-secret",
  };

  assert.throws(() => renderCertificateJson(unsafeCertificate), /unsafe certificate field/);
  assert.throws(() => renderCertificateMarkdown(unsafeCertificate), /unsafe certificate field/);
});

test("readiness renderer: rejects object values without coercion or toJSON", async () => {
  const certificate = evaluateReadiness(manifest, await readBundle("ready.json"), readinessCapability);
  const mutations: Array<(value: ReadinessCertificate, malicious: object) => ReadinessCertificate> = [
    (value, malicious) => ({ ...value, correlationId: malicious as never }),
    (value, malicious) => ({ ...value, runAt: malicious as never }),
    (value, malicious) => ({ ...value, manifestFingerprint: malicious as never }),
    (value, malicious) => ({
      ...value,
      checks: value.checks.map((check, index) => index === 0 ? { ...check, expectedFingerprint: malicious as never } : check) as ReadinessCertificate["checks"],
    }),
    (value, malicious) => ({
      ...value,
      checks: value.checks.map((check, index) => index === 0 ? { ...check, observedFingerprint: malicious as never } : check) as ReadinessCertificate["checks"],
    }),
  ];

  for (const mutate of mutations) {
    const sentinel = createMaliciousStringObject(certificate.manifestFingerprint);
    const unsafeCertificate = mutate(certificate, sentinel.value);

    assert.throws(() => renderCertificateJson(unsafeCertificate), /unsafe certificate field/);
    assert.throws(() => renderCertificateMarkdown(unsafeCertificate), /unsafe certificate field/);
    assert.equal(sentinel.stringCoercions, 0);
    assert.equal(sentinel.jsonSerializations, 0);
  }
});

async function readBundle(name: string): Promise<ReadinessObservationBundle> {
  const source = await readFile(`test/fixtures/readiness/${name}`, "utf8");
  return parseReadinessObservationBundle(JSON.parse(source));
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createMaliciousStringObject(displayValue: string): {
  value: object;
  stringCoercions: number;
  jsonSerializations: number;
} {
  const tracker = { stringCoercions: 0, jsonSerializations: 0 };
  const value = {
    [Symbol.toPrimitive](): string {
      tracker.stringCoercions += 1;
      return displayValue;
    },
    toString(): string {
      tracker.stringCoercions += 1;
      return displayValue;
    },
    toJSON(): string {
      tracker.jsonSerializations += 1;
      return "fixture-secret";
    },
  };

  return {
    value,
    get stringCoercions(): number {
      return tracker.stringCoercions;
    },
    get jsonSerializations(): number {
      return tracker.jsonSerializations;
    },
  };
}

import type { ReadinessCertificate, ReadinessCheck } from "./evaluate.js";
import type { CertificateDecision, CheckState, ReadPath, SourceName } from "./types.js";

interface SafeRenderedCheck {
  name: SourceName;
  state: CheckState;
  expectedFingerprint: string;
  observedFingerprint: string;
  readPath: ReadPath;
  capabilityState: "verified" | "unknown";
  diagnosticCode: ReadinessCheck["diagnosticCode"];
  nextAction: string;
}

interface SafeRenderedCertificate {
  certificateVersion: 1;
  decision: CertificateDecision;
  correlationId: string;
  runAt: string;
  targetFingerprint: string;
  externalWriteCount: 0;
  checks: [SafeRenderedCheck, SafeRenderedCheck, SafeRenderedCheck, SafeRenderedCheck];
  unchangedSystems: ["jira", "confluence", "github"];
  remediation: string[];
  decisionOptions: ["Stop"] | ["Continue", "Stop"];
}

const sourceNames: readonly SourceName[] = ["jira", "confluence", "github", "traceability"];
const decisions: readonly CertificateDecision[] = ["READY", "NOT READY", "STOPPED"];
const checkStates: readonly CheckState[] = ["verified", "unknown", "mismatch"];
const readPaths: readonly ReadPath[] = ["mcp", "tenant_aware_chrome"];
const capabilityStates = ["verified", "unknown"] as const;
const diagnosticCodes: readonly ReadinessCheck["diagnosticCode"][] = ["NONE", "CAPABILITY_UNKNOWN", "TARGET_MISMATCH", "TRACEABILITY_MISMATCH", "TIMEOUT_UNKNOWN", "SCOPE_UNVERIFIED"];
const fingerprintPattern = /^[a-f0-9]{64}$/;
const correlationIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const permittedActions = [
  "No action required.",
  "Re-read the fixed target and verify the exact target identifiers.",
  "Re-read the native Jira, Git, and Confluence traceability references.",
  "Verify the required read capability before continuing.",
  "Repeat the approved read and obtain a completed observation.",
  "Use an approved literal read path and verify its scope.",
  "Complete the required read and verify the expected target.",
] as const;

export function renderCertificateJson(certificate: ReadinessCertificate): string {
  return JSON.stringify(toSafeRenderedCertificate(certificate));
}

export function renderCertificateMarkdown(certificate: ReadinessCertificate): string {
  const rendered = toSafeRenderedCertificate(certificate);
  const remediation = rendered.remediation.length === 0
    ? "- None."
    : rendered.remediation.map((action) => `- ${action}`).join("\n");

  return [
    "# G2AS Sandbox Readiness Certificate",
    "",
    `Target fingerprint: ${rendered.targetFingerprint}`,
    `Decision: ${rendered.decision}`,
    `Correlation ID: ${rendered.correlationId}`,
    `Run timestamp: ${rendered.runAt}`,
    `External writes: ${rendered.externalWriteCount}`,
    "",
    "## Checks",
    "",
    "| Check | State | Expected fingerprint | Observed fingerprint | Read path | Capability | Diagnostic | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rendered.checks.map(renderCheckRow),
    "",
    "## Unchanged systems",
    "",
    rendered.unchangedSystems.join(", "),
    "",
    "## Remediation",
    "",
    remediation,
    "",
    "## Decision options",
    "",
    rendered.decisionOptions.join(", "),
    "",
  ].join("\n");
}

function toSafeRenderedCertificate(certificate: ReadinessCertificate): SafeRenderedCertificate {
  if (certificate.certificateVersion !== 1 || !decisions.includes(certificate.decision)) {
    rejectUnsafeCertificate();
  }

  requireCorrelationId(certificate.correlationId);
  requireIsoTimestamp(certificate.runAt);
  requireFingerprint(certificate.manifestFingerprint);

  if (certificate.externalWriteCount !== 0) {
    rejectUnsafeCertificate();
  }

  const checks = requireChecks(certificate.checks);
  const unchangedSystems = requireUnchangedSystems(certificate.unchangedSystems);
  const remediation = certificate.remediation.map(requirePermittedAction);
  const decisionOptions = requireDecisionOptions(certificate.decision, certificate.decisionOptions);

  return {
    certificateVersion: 1,
    decision: certificate.decision,
    correlationId: certificate.correlationId,
    runAt: certificate.runAt,
    targetFingerprint: certificate.manifestFingerprint,
    externalWriteCount: 0,
    checks,
    unchangedSystems,
    remediation,
    decisionOptions,
  };
}

function requireChecks(
  checks: ReadinessCertificate["checks"],
): SafeRenderedCertificate["checks"] {
  if (!Array.isArray(checks) || checks.length !== sourceNames.length) {
    rejectUnsafeCertificate();
  }

  const renderedChecks = checks.map((check, index) => {
    if (check.name !== sourceNames[index]) {
      rejectUnsafeCertificate();
    }

    return requireCheck(check);
  });

  return renderedChecks as SafeRenderedCertificate["checks"];
}

function requireCheck(check: ReadinessCheck): SafeRenderedCheck {
  if (
    !checkStates.includes(check.state) ||
    !readPaths.includes(check.readPath) ||
    !capabilityStates.includes(check.capabilityState) ||
    !diagnosticCodes.includes(check.diagnosticCode)
  ) {
    rejectUnsafeCertificate();
  }

  requireFingerprint(check.expectedFingerprint);
  requireFingerprint(check.observedFingerprint);
  requirePermittedAction(check.nextAction);

  return {
    name: check.name,
    state: check.state,
    expectedFingerprint: check.expectedFingerprint,
    observedFingerprint: check.observedFingerprint,
    readPath: check.readPath,
    capabilityState: check.capabilityState,
    diagnosticCode: check.diagnosticCode,
    nextAction: check.nextAction,
  };
}

function requireUnchangedSystems(
  unchangedSystems: ReadinessCertificate["unchangedSystems"],
): SafeRenderedCertificate["unchangedSystems"] {
  if (
    unchangedSystems.length !== 3 ||
    unchangedSystems[0] !== "jira" ||
    unchangedSystems[1] !== "confluence" ||
    unchangedSystems[2] !== "github"
  ) {
    rejectUnsafeCertificate();
  }

  return ["jira", "confluence", "github"];
}

function requireDecisionOptions(
  decision: CertificateDecision,
  decisionOptions: ReadinessCertificate["decisionOptions"],
): SafeRenderedCertificate["decisionOptions"] {
  if (decision === "READY" && decisionOptions.length === 2 && decisionOptions[0] === "Continue" && decisionOptions[1] === "Stop") {
    return ["Continue", "Stop"];
  }
  if (decision !== "READY" && decisionOptions.length === 1 && decisionOptions[0] === "Stop") {
    return ["Stop"];
  }

  rejectUnsafeCertificate();
}

function requireCorrelationId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !correlationIdPattern.test(value)) {
    rejectUnsafeCertificate();
  }
}

function requireIsoTimestamp(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !isoTimestampPattern.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    rejectUnsafeCertificate();
  }
}

function requireFingerprint(value: unknown): asserts value is string {
  if (typeof value !== "string" || !fingerprintPattern.test(value)) {
    rejectUnsafeCertificate();
  }
}

function requirePermittedAction(value: string): string {
  if (!permittedActions.includes(value as typeof permittedActions[number])) {
    rejectUnsafeCertificate();
  }

  return value;
}

function renderCheckRow(check: SafeRenderedCheck): string {
  return `| ${check.name} | ${check.state} | ${check.expectedFingerprint} | ${check.observedFingerprint} | ${check.readPath} | ${check.capabilityState} | ${check.diagnosticCode} | ${check.nextAction} |`;
}

function rejectUnsafeCertificate(): never {
  throw new Error("G2AS readiness rendering rejected: unsafe certificate field.");
}

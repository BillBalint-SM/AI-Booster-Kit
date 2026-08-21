import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("built flow CLI: composes one plan module as stdout-only JSON", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-flow-"));
  const input = join(root, "plan.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    selection: { kind: "module", module: "plan" },
    objective: "Create a bounded plan.",
    inputs: {
      "current-scope": "The local module composition interface.",
      constraints: ["No external action."],
      "open-questions": [],
    },
    unknowns: [],
  }), "utf8");

  const result = await runBuiltCli(["compose-flow", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(value.status, "READY");
  assert.equal(value.selection, "plan");
  assert.equal(value.executionPerformed, false);
});

test("built flow CLI: returns a visible stop and exit 2 for incomplete input", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-flow-"));
  const input = join(root, "implement.json");
  await writeFile(input, JSON.stringify({
    requestVersion: "1.0",
    selection: { kind: "module", module: "implement" },
    objective: "Implement a bounded change.",
    inputs: { repository: "AI Booster Kit", "repository-state": "VERIFIED" },
    unknowns: [],
  }), "utf8");

  const result = await runBuiltCli(["compose-flow", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 2);
  assert.equal(result.stderr, "");
  assert.equal(value.status, "STOPPED");
  assert.equal(value.nextAction, "PROVIDE_REQUIRED_INPUTS");
});

test("built flow CLI: rejects malformed JSON with the existing CLI error convention", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-flow-"));
  const input = join(root, "invalid.json");
  await writeFile(input, "{", "utf8");

  const result = await runBuiltCli(["compose-flow", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 3);
  assert.equal(value.decision, "STOPPED");
  assert.equal(value.error.code, "FLOW_INPUT_JSON_INVALID");
});

test("built flow CLI: assesses the next safe module without dispatch or persistence", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-flow-"));
  const input = join(root, "assessment.json");
  const request = defaultFlowRequest();
  await writeFile(input, JSON.stringify({ assessmentVersion: "1.0", request, receipts: [] }), "utf8");

  const result = await runBuiltCli(["assess-flow", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(value.status, "READY");
  assert.deepEqual(value.runnableStages, ["plan-1"]);
  assert.equal(value.executionPerformed, false);
  assert.match(value.packageId, /^sha256:[a-f0-9]{64}$/u);
});

test("built flow CLI: returns exit 2 with a reviewable UNKNOWN receipt handoff", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-booster-flow-"));
  const input = join(root, "assessment.json");
  const request = defaultFlowRequest();
  await writeFile(input, JSON.stringify({ assessmentVersion: "1.0", request, receipts: [] }), "utf8");
  const initial = JSON.parse((await runBuiltCli(["assess-flow", "--input", input])).stdout);
  const receipt = {
    receiptVersion: "1.0",
    receiptKind: "STAGE",
    packageId: initial.packageId,
    stageId: "plan-1",
    module: "plan",
    outcome: "UNKNOWN",
    artifacts: [],
    evidence: [],
    decisions: [],
    unknowns: ["The repository readback is unavailable."],
    limits: [],
    stopReasons: [],
    nextAction: "RETRY_READBACK_OR_STOP",
    readback: {
      state: "UNAVAILABLE",
      revision: null,
      observedAt: "2026-08-20T12:00:00.000Z",
    },
  };
  await writeFile(input, JSON.stringify({ assessmentVersion: "1.0", request, receipts: [receipt] }), "utf8");

  const result = await runBuiltCli(["assess-flow", "--input", input]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 2);
  assert.equal(result.stderr, "");
  assert.equal(value.status, "UNKNOWN");
  assert.equal(value.handoff.ready, true);
  assert.equal(value.nextAction, "RETRY_READBACK_OR_STOP");
});

test("built flow CLI: keeps the documented assessment examples executable and identity-aligned", async () => {
  const initialResult = await runBuiltCli(["assess-flow", "--input", "examples/flow/assess-default-change.json"]);
  const afterPlanResult = await runBuiltCli(["assess-flow", "--input", "examples/flow/assess-after-plan.json"]);
  const acceptedResult = await runBuiltCli(["assess-flow", "--input", "examples/flow/assess-after-plan-accepted.json"]);
  const completeResult = await runBuiltCli(["assess-flow", "--input", "examples/flow/assess-complete.json"]);
  const initial = JSON.parse(initialResult.stdout);
  const afterPlan = JSON.parse(afterPlanResult.stdout);
  const accepted = JSON.parse(acceptedResult.stdout);
  const complete = JSON.parse(completeResult.stdout);

  assert.equal(initialResult.code, 0);
  assert.equal(initial.status, "READY");
  assert.equal(afterPlanResult.code, 2);
  assert.equal(afterPlan.status, "WAITING_FOR_APPROVAL");
  assert.equal(acceptedResult.code, 0);
  assert.equal(accepted.status, "READY");
  assert.deepEqual(accepted.runnableStages, ["implement-2"]);
  assert.equal(completeResult.code, 0);
  assert.equal(complete.status, "COMPLETE");
  assert.deepEqual(complete.runnableStages, []);
  assert.equal(complete.handoff.ready, true);
  assert.equal(complete.nextAction, "PRESENT_HANDOFF_FOR_USER_ACCEPTANCE");
  assert.equal(afterPlan.packageId, initial.packageId);
  assert.equal(accepted.packageId, initial.packageId);
  assert.equal(complete.packageId, initial.packageId);
  assert.match(afterPlan.checkpoints[0]?.subjectReceiptId ?? "", /^sha256:[a-f0-9]{64}$/u);
  assert.equal(accepted.checkpoints[0]?.subjectReceiptId, afterPlan.checkpoints[0]?.subjectReceiptId);
  assert.equal(afterPlan.executionPerformed, false);
  assert.equal(accepted.executionPerformed, false);
  assert.equal(complete.executionPerformed, false);
});

test("built flow CLI: renders deterministic Markdown for complete, waiting, and foreign receipts", async () => {
  const cases = [
    [
      "examples/flow/assess-complete.json",
      0,
      ["Status: <code>COMPLETE</code>", "Evidence: <code>12</code>", "PRESENT_HANDOFF_FOR_USER_ACCEPTANCE"],
    ],
    [
      "examples/flow/assess-after-plan.json",
      2,
      ["Status: <code>WAITING_FOR_APPROVAL</code>", "USER_ACCEPTS_PLAN", "PENDING", "RECORD_CHECKPOINT:USER_ACCEPTS_PLAN"],
    ],
    [
      "examples/flow/assess-foreign-receipt.json",
      2,
      ["Status: <code>STOPPED</code>", "RECEIPT_PACKAGE_MISMATCH", "RECOMPOSE_AND_REISSUE_RECEIPT"],
    ],
  ] as const;

  for (const [input, expectedCode, expectedText] of cases) {
    const first = await runBuiltCli(["assess-flow", "--input", input, "--format", "markdown"]);
    const second = await runBuiltCli(["assess-flow", "--input", input, "--format", "markdown"]);

    assert.equal(first.code, expectedCode);
    assert.equal(first.stderr, "");
    assert.equal(first.stdout, second.stdout);
    assert.match(first.stdout, /INFORMATIONAL — HUMAN DECISION REQUIRED/u);
    for (const text of expectedText) assert.ok(first.stdout.includes(text), `${input} is missing ${text}`);
  }
});

test("built flow CLI: rejects an unsupported assessment output format", async () => {
  const result = await runBuiltCli([
    "assess-flow",
    "--input",
    "examples/flow/assess-complete.json",
    "--format",
    "html",
  ]);
  const value = JSON.parse(result.stdout);

  assert.equal(result.code, 4);
  assert.equal(result.stderr, "");
  assert.equal(value.error.code, "COMMAND_CONFIGURATION_INVALID");
});

function runBuiltCli(args: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [resolve("dist/cli.js"), ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => { resolveResult({ code, stdout, stderr }); });
  });
}

function defaultFlowRequest() {
  return {
    requestVersion: "1.0",
    selection: { kind: "flow", flow: "default-change" },
    objective: "Deliver a bounded local change with evidence.",
    inputs: {
      "current-scope": "Add receipt-backed Flow assurance.",
      constraints: ["No persistence, dispatch, or external action."],
      "open-questions": [],
      repository: "AI Booster Kit",
      "repository-state": "VERIFIED",
      "test-strategy": ["Exercise the public assessment seam."],
      "rollback-boundary": "Keep the change local, reversible, and uncommitted.",
      "known-limits": [],
    },
    unknowns: [],
  };
}

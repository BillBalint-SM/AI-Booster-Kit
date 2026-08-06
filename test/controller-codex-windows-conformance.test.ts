import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertSafeDiagnosticPath,
  buildCodexWindowsProbeArgs,
  parseCodexWindowsConfig,
  parseCodexJsonlProbe,
  parseWindowsProbeOutput,
  sanitizeSandboxLog,
  runCodexWindowsConformanceWithDependencies,
  type CodexWindowsConformanceDependencies,
} from "../src/controller/codex-windows-conformance.js";
import type { CodexProcessResult } from "../src/controller/codex-execution.js";

test("Windows conformance config parser: accepts only the supported sandbox values", () => {
  assert.deepEqual(
    parseCodexWindowsConfig(`
      approval_policy = "never"
      sandbox_mode = "danger-full-access"

      [windows]
      sandbox = "elevated"
    `),
    {
      sandbox: "elevated",
      approvalPolicy: "never",
      sandboxMode: "danger-full-access",
      unknowns: [],
    },
  );

  assert.equal(parseCodexWindowsConfig('[windows]\nsandbox = "unelevated"').sandbox, "unelevated");
  assert.equal(parseCodexWindowsConfig('[windows]\nsandbox = "unsupported"').sandbox, "UNKNOWN");
  assert.equal(parseCodexWindowsConfig('[windows]\nsandbox = "elevated"\nsandbox = "unelevated"').sandbox, "UNKNOWN");
  assert.equal(parseCodexWindowsConfig("approval_policy = \"never\"").sandbox, "UNKNOWN");
});

test("Windows conformance log sanitizer: keeps only safe normalized error facts", () => {
  const result = sanitizeSandboxLog(`
    [2026-08-05 13:15:40] setup refresh: processed 0 write roots; errors=[]
    [2026-08-05 13:15:40] hide users: failed to hide C:\\Users\\TestUser\\Default: SetFileAttributesW failed: 5
    [2026-08-05 13:15:41] runner: CreateProcessAsUserW failed: 5 secret=do-not-copy
    arbitrary transcript content must be dropped
  `);

  assert.deepEqual(result.errorClasses, ["SET_FILE_ATTRIBUTES_ACCESS_DENIED", "CREATE_PROCESS_AS_USER_FAILED"]);
  assert.equal(result.lines.some((line) => line.includes("<USER>")), true);
  assert.equal(result.lines.some((line) => line.includes("TestUser")), false);
  assert.equal(result.lines.some((line) => line.includes("do-not-copy")), false);
  assert.equal(result.lines.some((line) => line.includes("arbitrary transcript")), false);
});

test("Windows conformance probe parser: requires the exact bounded JSON shape", () => {
  assert.deepEqual(
    parseWindowsProbeOutput(JSON.stringify({
      sandboxAccountCount: 1,
      defaultProfile: { exists: true, aclReadable: true },
      errorClasses: [],
    })),
    {
      sandboxAccountCount: 1,
      defaultProfile: { exists: true, aclReadable: true },
      errorClasses: [],
    },
  );

  assert.throws(
    () => parseWindowsProbeOutput(JSON.stringify({
      sandboxAccountCount: 1,
      defaultProfile: { exists: true, aclReadable: true },
      errorClasses: [],
      rawUsers: ["must-not-be-accepted"],
    })),
    /CODEX_WINDOWS_PROBE_INVALID/,
  );
  assert.throws(() => parseWindowsProbeOutput("not-json"), /CODEX_WINDOWS_PROBE_INVALID/);
});

test("Windows conformance path guard: rejects sandbox secrets", () => {
  assert.throws(
    () => assertSafeDiagnosticPath("C:\\Users\\TestUser\\.codex\\.sandbox-secrets\\sandbox_users.json"),
    /CODEX_SECRET_PATH_FORBIDDEN/,
  );
});

test("Windows conformance profile builder: emits only fixed safe projections", () => {
  const workdir = "C:\\Users\\TestUser\\AppData\\Local\\Temp";
  const expectedPrefix = [
    "exec",
    "--cd", workdir,
    "--sandbox", "read-only",
    "--ephemeral",
    "--color", "never",
    "--json",
    "--skip-git-repo-check",
  ];

  assert.deepEqual(buildCodexWindowsProbeArgs("current", workdir).slice(0, expectedPrefix.length), expectedPrefix);
  assert.deepEqual(buildCodexWindowsProbeArgs("elevated", workdir).slice(expectedPrefix.length, expectedPrefix.length + 2), ["-c", "windows.sandbox=\"elevated\""]);
  assert.deepEqual(buildCodexWindowsProbeArgs("unelevated", workdir).slice(expectedPrefix.length, expectedPrefix.length + 2), ["-c", "windows.sandbox=\"unelevated\""]);
  assert.deepEqual(buildCodexWindowsProbeArgs("isolated", workdir).slice(expectedPrefix.length, expectedPrefix.length + 3), ["--ignore-user-config", "-c", "windows.sandbox=\"unelevated\""]);

  for (const profile of ["current", "elevated", "unelevated", "isolated"] as const) {
    const args = buildCodexWindowsProbeArgs(profile, workdir);
    assert.equal(args.some((value) => /\.(?:cmd|bat|ps1)$/iu.test(value)), false);
    assert.equal(args.includes("--dangerously-bypass-approvals-and-sandbox"), false);
    assert.equal(args.at(-1)?.includes("HOST_EXEC_OK"), true);
  }
});

test("Windows conformance JSONL classifier: requires the real command event and marker", () => {
  const success = JSON.stringify({
    type: "item.completed",
    item: {
      type: "command_execution",
      command: "pwsh.exe -NoProfile -Command node -e \\\"process.stdout.write('HOST_EXEC_OK')\\\"",
      aggregated_output: "HOST_EXEC_OK",
      exit_code: 0,
      status: "completed",
    },
  });
  const completed = parseCodexJsonlProbe("current", `${success}\n`, "", 0, "EXITED");
  assert.equal(completed.state, "PASS");
  assert.equal(completed.markerProduced, true);
  assert.equal(completed.commandEventObserved, true);

  const accessDenied = parseCodexJsonlProbe(
    "elevated",
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "pwsh.exe -NoProfile -Command node -e probe",
        aggregated_output: "windows sandbox: runner failed during SpawnChild: CreateProcessAsUserW failed: 5 (Access denied)",
        exit_code: -1,
        status: "failed",
      },
    }),
    "",
    0,
    "EXITED",
  );
  assert.equal(accessDenied.state, "BLOCKED");
  assert.equal(accessDenied.errorCode, "CREATE_PROCESS_AS_USER_FAILED");

  const c0070005 = parseCodexJsonlProbe(
    "unelevated",
    "",
    "windows sandbox: CreateProcessAsUserW failed: -1073283067 (0xC0070005)",
    1,
    "EXITED",
  );
  assert.equal(c0070005.state, "BLOCKED");
  assert.equal(c0070005.errorCode, "CREATE_PROCESS_AS_USER_FAILED");

  const modelOnly = parseCodexJsonlProbe(
    "isolated",
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "HOST_EXEC_OK" } }),
    "",
    0,
    "EXITED",
  );
  assert.equal(modelOnly.state, "STOPPED");
  assert.equal(modelOnly.markerProduced, false);

  const wrongCommand = parseCodexJsonlProbe(
    "current",
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "pwsh.exe -NoProfile -Command Write-Output HOST_EXEC_OK",
        aggregated_output: "HOST_EXEC_OK",
        exit_code: 0,
        status: "completed",
      },
    }),
    "",
    0,
    "EXITED",
  );
  assert.equal(wrongCommand.state, "STOPPED");

  assert.equal(parseCodexJsonlProbe("current", "not-json", "", 0, "EXITED").state, "STOPPED");
  assert.equal(parseCodexJsonlProbe("current", "", "", null, "TIMED_OUT").state, "STOPPED");
  assert.equal(parseCodexJsonlProbe("current", success, "", 7, "EXITED").state, "STOPPED");
  assert.equal(parseCodexJsonlProbe("current", "", "", 0, "OUTPUT_TOO_LARGE").state, "STOPPED");
});

test("Windows conformance assembly: only a complete audit plus a real marker can complete", async () => {
  const result = await runCodexWindowsConformanceWithDependencies(
    {
      workdir: "C:\\Users\\TestUser\\AppData\\Local\\Temp",
      timeoutMs: 1_000,
      profile: "current",
      codexCommand: "codex.exe",
      codexHome: "C:\\Users\\TestUser\\.codex",
    },
    fakeDependencies({ smoke: "PASS" }),
  );

  assert.equal(result.state, "COMPLETED");
  assert.equal(result.audit.state, "PASS");
  assert.equal(result.smoke.state, "PASS");
});

test("Windows conformance audit: PowerShell probe reads the hidden Default profile", async () => {
  let probeScript = "";
  const dependencies = fakeDependencies({ smoke: "PASS" });
  const guardedDependencies: CodexWindowsConformanceDependencies = {
    ...dependencies,
    runProcess: async (command: string, args: readonly string[], workdir: string, timeoutMs: number) => {
      const lastArgument = args.at(-1) ?? "";
      if (command === "pwsh.exe" && lastArgument.includes("Get-LocalUser")) probeScript = lastArgument;
      return dependencies.runProcess(command, args, workdir, timeoutMs);
    },
  };

  const result = await runCodexWindowsConformanceWithDependencies(
    {
      workdir: "C:\\Users\\TestUser\\AppData\\Local\\Temp",
      timeoutMs: 1_000,
      profile: "current",
      codexCommand: "codex.exe",
      codexHome: "C:\\Users\\TestUser\\.codex",
    },
    guardedDependencies,
  );

  assert.equal(result.audit.state, "PASS");
  assert.equal(probeScript.includes("Get-Item -LiteralPath 'C:\\Users\\Default' -Force"), true);
});

test("Windows conformance assembly: native sandbox failure becomes a host blocker", async () => {
  const result = await runCodexWindowsConformanceWithDependencies(
    {
      workdir: "C:\\Users\\TestUser\\AppData\\Local\\Temp",
      timeoutMs: 1_000,
      profile: "elevated",
      codexCommand: "codex.exe",
      codexHome: "C:\\Users\\TestUser\\.codex",
    },
    fakeDependencies({ smoke: "BLOCKED" }),
  );

  assert.equal(result.state, "BLOCKED");
  assert.equal(result.smoke.errorCode, "CREATE_PROCESS_AS_USER_FAILED");
  assert.match(result.recommendation, /host|sandbox|administrator/iu);
});

test("Windows conformance assembly: unknown audit cannot be promoted by a model-only success", async () => {
  const result = await runCodexWindowsConformanceWithDependencies(
    {
      workdir: "C:\\Users\\TestUser\\AppData\\Local\\Temp",
      timeoutMs: 1_000,
      profile: "isolated",
      codexCommand: "codex.exe",
      codexHome: "C:\\Users\\TestUser\\.codex",
    },
    fakeDependencies({ smoke: "PASS", denyConfig: true, denyPowerShell: true }),
  );

  assert.equal(result.state, "STOPPED");
  assert.equal(result.audit.state, "UNKNOWN");
  assert.equal(result.smoke.state, "PASS");
});

test("Windows conformance assembly: secret paths are rejected before any read", async () => {
  let readCount = 0;
  const dependencies = fakeDependencies({ smoke: "PASS" });
  const originalReadText = dependencies.readText;
  const guardedDependencies: CodexWindowsConformanceDependencies = {
    ...dependencies,
    readText: async (path: string) => {
      readCount += 1;
      return originalReadText(path);
    },
  };

  await assert.rejects(
    () => runCodexWindowsConformanceWithDependencies(
      {
        workdir: "C:\\Users\\TestUser\\AppData\\Local\\Temp",
        timeoutMs: 1_000,
        profile: "current",
        codexCommand: "codex.exe",
        codexHome: "C:\\Users\\TestUser\\.codex\\.sandbox-secrets",
      },
      guardedDependencies,
    ),
    /CODEX_SECRET_PATH_FORBIDDEN/,
  );
  assert.equal(readCount, 0);
});

function fakeDependencies(options: { smoke: "PASS" | "BLOCKED"; denyConfig?: boolean; denyPowerShell?: boolean }): CodexWindowsConformanceDependencies {
  return {
    platform: "win32",
    architecture: "x64",
    nodeVersion: "v26.4.0",
    readText: async (path: string) => {
      if (options.denyConfig === true && path.endsWith("config.toml")) throw new Error("access denied");
      if (path.endsWith("config.toml")) return "approval_policy = \"never\"\n[windows]\nsandbox = \"elevated\"\n";
      return "[2026-08-05] setup refresh: processed 0 write roots; errors=[]\n";
    },
    listSandboxLogs: async () => [{ path: "C:\\Users\\TestUser\\.codex\\.sandbox\\sandbox.log", modifiedAtMs: 1 }],
    runProcess: async (_command: string, args: readonly string[]): Promise<CodexProcessResult> => {
      const lastArgument = args.at(-1) ?? "";
      if (args.includes("--version")) return exited("codex-cli 0.146.0\n");
      if (lastArgument.includes("PSVersion")) {
        if (options.denyPowerShell === true) return { kind: "SPAWN_ERROR", exitCode: null, stdout: "", stderr: "access denied" };
        return exited("7.6.4\n");
      }
      if (lastArgument.includes("Get-LocalUser")) {
        if (options.denyPowerShell === true) return { kind: "SPAWN_ERROR", exitCode: null, stdout: "", stderr: "access denied" };
        return exited(JSON.stringify({ sandboxAccountCount: 1, defaultProfile: { exists: true, aclReadable: true }, errorClasses: [] }));
      }
      if (options.smoke === "BLOCKED") {
        return exited(JSON.stringify({
          type: "item.completed",
          item: {
            type: "command_execution",
            command: "pwsh.exe -NoProfile -Command node -e probe",
            aggregated_output: "CreateProcessAsUserW failed: 5",
            exit_code: -1,
            status: "failed",
          },
        }));
      }
      return exited(JSON.stringify({
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "pwsh.exe -NoProfile -Command node -e probe",
          aggregated_output: "HOST_EXEC_OK",
          exit_code: 0,
          status: "completed",
        },
      }));
    },
  };
}

function exited(stdout: string): CodexProcessResult {
  return { kind: "EXITED", exitCode: 0, stdout, stderr: "" };
}

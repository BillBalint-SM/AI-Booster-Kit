import { spawn as nativeSpawn } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import { arch, homedir, platform } from "node:os";
import { basename, join, resolve } from "node:path";

import {
  resolveCodexCommand,
  runCodexProcess,
  type CodexCommandSpec,
  type CodexProcessKind,
  type CodexProcessResult,
} from "./codex-execution.js";

export type CodexWindowsProbeProfile = "current" | "elevated" | "unelevated" | "isolated";
export type CodexWindowsAuditState = "PASS" | "UNKNOWN";
export type CodexWindowsSmokeState = "PASS" | "BLOCKED" | "STOPPED";
export type CodexWindowsConformanceState = "COMPLETED" | "BLOCKED" | "STOPPED";

export interface CodexWindowsConfigFacts {
  readonly sandbox: "elevated" | "unelevated" | "UNKNOWN";
  readonly approvalPolicy: string | null;
  readonly sandboxMode: string | null;
  readonly unknowns: readonly string[];
}

export interface SanitizedSandboxLog {
  readonly lines: readonly string[];
  readonly errorClasses: readonly string[];
}

export interface WindowsProbeFacts {
  readonly sandboxAccountCount: number;
  readonly defaultProfile: {
    readonly exists: boolean;
    readonly aclReadable: boolean;
  };
  readonly errorClasses: readonly string[];
}

export interface CodexWindowsHostAudit {
  readonly state: CodexWindowsAuditState;
  readonly platform: string;
  readonly architecture: string;
  readonly nodeVersion: string;
  readonly powershellVersion: string | null;
  readonly codexVersion: string | null;
  readonly effectiveSandbox: "elevated" | "unelevated" | "UNKNOWN";
  readonly helperPaths: readonly string[];
  readonly errorClasses: readonly string[];
  readonly unknowns: readonly string[];
}

export interface CodexWindowsSmokeResult {
  readonly state: CodexWindowsSmokeState;
  readonly profile: CodexWindowsProbeProfile;
  readonly markerProduced: boolean;
  readonly commandEventObserved: boolean;
  readonly processKind: CodexProcessKind;
  readonly exitCode: number | null;
  readonly errorCode: string | null;
  readonly evidence: readonly string[];
}

export interface CodexWindowsConformanceRequest {
  readonly workdir: string;
  readonly timeoutMs: number;
  readonly profile: CodexWindowsProbeProfile;
  readonly codexCommand?: string;
  readonly codexHome?: string;
}

export interface CodexWindowsConformanceResult {
  readonly state: CodexWindowsConformanceState;
  readonly host: "windows";
  readonly profile: CodexWindowsProbeProfile;
  readonly audit: CodexWindowsHostAudit;
  readonly smoke: CodexWindowsSmokeResult;
  readonly recommendation: string;
}

export interface CodexWindowsLogEntry {
  readonly path: string;
  readonly modifiedAtMs: number;
}

export type CodexWindowsProcessRunner = (
  command: string,
  args: readonly string[],
  workdir: string,
  timeoutMs: number,
) => Promise<CodexProcessResult>;

export interface CodexWindowsConformanceDependencies {
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
  readonly nodeVersion: string;
  readonly readText: (path: string) => Promise<string>;
  readonly listSandboxLogs: (directory: string) => Promise<readonly CodexWindowsLogEntry[]>;
  readonly runProcess: CodexWindowsProcessRunner;
}

export class CodexWindowsConformanceError extends Error {
  public constructor(readonly code: string, message: string) {
    super(`${code}: ${message}.`);
    this.name = "CodexWindowsConformanceError";
  }
}

export const CODEX_WINDOWS_PROBE_PROMPT = `Bounded Windows host conformance probe. Use the shell tool exactly once to run:
node -e "process.stdout.write('HOST_EXEC_OK')"
Do not read or write files, use the network, use connectors, or run another command.
Return whether the marker was produced and the process error class if it was not.`;
export const CODEX_WINDOWS_MAX_TIMEOUT_MS = 10 * 60 * 1000;

const POWERSHELL_COMMAND = "pwsh.exe";
const POWERSHELL_VERSION_ARGS = ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"] as const;
const POWERSHELL_PROBE_SCRIPT = "$accountCount = @(Get-LocalUser -ErrorAction Stop | Where-Object { $_.Name -like 'CodexSandbox*' }).Count; $default = Get-Item -LiteralPath 'C:\\Users\\Default' -Force -ErrorAction Stop; $acl = Get-Acl -LiteralPath 'C:\\Users\\Default' -ErrorAction Stop; [pscustomobject]@{ sandboxAccountCount = $accountCount; defaultProfile = @{ exists = ($null -ne $default); aclReadable = ($null -ne $acl) }; errorClasses = @() } | ConvertTo-Json -Compress";
const POWERSHELL_PROBE_ARGS = ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", POWERSHELL_PROBE_SCRIPT] as const;

export async function runCodexWindowsConformance(request: CodexWindowsConformanceRequest): Promise<CodexWindowsConformanceResult> {
  return runCodexWindowsConformanceWithDependencies(request, createRuntimeDependencies());
}

export async function runCodexWindowsConformanceWithDependencies(
  request: CodexWindowsConformanceRequest,
  dependencies: CodexWindowsConformanceDependencies,
): Promise<CodexWindowsConformanceResult> {
  assertSafeDiagnosticPath(request.workdir);
  const codexHome = request.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), ".codex");
  assertSafeDiagnosticPath(codexHome);
  const codex = await resolveCodexCommand(request.codexCommand);
  const audit = await collectHostAudit(request, codexHome, codex, dependencies);
  const smoke = await runConformanceSmoke(request, codex, dependencies);

  if (smoke.state === "BLOCKED") {
    return {
      state: "BLOCKED",
      host: "windows",
      profile: request.profile,
      audit,
      smoke,
      recommendation: "Repair the native Windows Codex sandbox or escalate the sanitized host evidence to an administrator/OpenAI support; keep project policy unchanged.",
    };
  }
  if (smoke.state !== "PASS" || audit.state !== "PASS") {
    return {
      state: "STOPPED",
      host: "windows",
      profile: request.profile,
      audit,
      smoke,
      recommendation: "Keep native activation stopped until the host audit and real child-process conformance evidence are complete.",
    };
  }
  return {
    state: "COMPLETED",
    host: "windows",
    profile: request.profile,
    audit,
    smoke,
    recommendation: "Native Windows Codex child-process conformance passed; the bounded activation slice may proceed.",
  };
}

export function parseCodexWindowsConfig(source: string): CodexWindowsConfigFacts {
  const lines = source.split(/\r?\n/u);
  let section: string | null = null;
  const sandboxValues: string[] = [];
  const approvalValues: string[] = [];
  const sandboxModeValues: string[] = [];

  for (const line of lines) {
    const sectionMatch = /^\s*\[([^\]]+)\]\s*$/u.exec(line);
    if (sectionMatch !== null) {
      const sectionValue = sectionMatch[1];
      if (sectionValue === undefined) continue;
      section = sectionValue.trim();
      continue;
    }
    const assignment = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(["'])(.*?)\2\s*$/u.exec(line);
    if (assignment === null) continue;
    const key = assignment[1];
    const value = assignment[3];
    if (key === undefined || value === undefined) continue;
    if (section === "windows" && key === "sandbox") sandboxValues.push(value);
    if (section === null && key === "approval_policy") approvalValues.push(value);
    if (section === null && key === "sandbox_mode") sandboxModeValues.push(value);
  }

  const unknowns: string[] = [];
  let sandbox: CodexWindowsConfigFacts["sandbox"] = "UNKNOWN";
  const sandboxValue = sandboxValues[0];
  if (sandboxValues.length !== 1 || (sandboxValue !== "elevated" && sandboxValue !== "unelevated")) {
    unknowns.push("WINDOWS_SANDBOX_UNKNOWN");
  } else {
    sandbox = sandboxValue;
  }

  return {
    sandbox,
    approvalPolicy: approvalValues.length === 1 ? (approvalValues[0] ?? null) : null,
    sandboxMode: sandboxModeValues.length === 1 ? (sandboxModeValues[0] ?? null) : null,
    unknowns,
  };
}

export function sanitizeSandboxLog(source: string): SanitizedSandboxLog {
  const lines: string[] = [];
  const errorClasses: string[] = [];
  const seenErrors = new Set<string>();

  for (const line of source.split(/\r?\n/u)) {
    if (!/(?:setup refresh|read ACL|SetFileAttributesW failed|CreateProcessAsUserW failed)/iu.test(line)) continue;
    const errorClass = sandboxLogErrorClass(line);
    if (errorClass !== null && !seenErrors.has(errorClass)) {
      seenErrors.add(errorClass);
      errorClasses.push(errorClass);
    }
    lines.push(redactSandboxLine(line));
  }

  return { lines, errorClasses };
}

export function parseWindowsProbeOutput(source: string): WindowsProbeFacts {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new CodexWindowsConformanceError("CODEX_WINDOWS_PROBE_INVALID", "the PowerShell probe output is not valid JSON");
  }

  if (!isRecord(value) || !hasExactKeys(value, ["sandboxAccountCount", "defaultProfile", "errorClasses"])) {
    throw new CodexWindowsConformanceError("CODEX_WINDOWS_PROBE_INVALID", "the PowerShell probe output has unsupported fields");
  }
  const sandboxAccountCount = value.sandboxAccountCount;
  if (typeof sandboxAccountCount !== "number" || !Number.isInteger(sandboxAccountCount) || sandboxAccountCount < 0) {
    throw new CodexWindowsConformanceError("CODEX_WINDOWS_PROBE_INVALID", "sandboxAccountCount is invalid");
  }
  const defaultProfile = value.defaultProfile;
  if (!isRecord(defaultProfile) || !hasExactKeys(defaultProfile, ["exists", "aclReadable"])) {
    throw new CodexWindowsConformanceError("CODEX_WINDOWS_PROBE_INVALID", "defaultProfile is invalid");
  }
  const defaultProfileExists = defaultProfile.exists;
  const defaultProfileAclReadable = defaultProfile.aclReadable;
  if (typeof defaultProfileExists !== "boolean" || typeof defaultProfileAclReadable !== "boolean") {
    throw new CodexWindowsConformanceError("CODEX_WINDOWS_PROBE_INVALID", "defaultProfile flags are invalid");
  }
  const errorClasses = value.errorClasses;
  if (!Array.isArray(errorClasses) || errorClasses.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new CodexWindowsConformanceError("CODEX_WINDOWS_PROBE_INVALID", "errorClasses is invalid");
  }

  return {
    sandboxAccountCount,
    defaultProfile: {
      exists: defaultProfileExists,
      aclReadable: defaultProfileAclReadable,
    },
    errorClasses: [...errorClasses],
  };
}

export function assertSafeDiagnosticPath(path: string): void {
  const normalized = resolve(path);
  if (/(?:^|[\\/])\.sandbox-secrets(?:[\\/]|$)/iu.test(normalized)) {
    throw new CodexWindowsConformanceError("CODEX_SECRET_PATH_FORBIDDEN", "diagnostics must not read the sandbox secrets directory");
  }
}

export function buildCodexWindowsProbeArgs(profile: CodexWindowsProbeProfile, workdir: string): readonly string[] {
  if (workdir.trim() === "" || workdir.includes("\0")) {
    throw new CodexWindowsConformanceError("CODEX_WORKDIR_INVALID", "the conformance working directory must be explicit");
  }

  const profileArgs = profile === "current"
    ? []
    : profile === "elevated"
      ? ["-c", "windows.sandbox=\"elevated\""]
      : profile === "unelevated"
        ? ["-c", "windows.sandbox=\"unelevated\""]
        : ["--ignore-user-config", "-c", "windows.sandbox=\"unelevated\""];

  return [
    "exec",
    "--cd", workdir,
    "--sandbox", "read-only",
    "--ephemeral",
    "--color", "never",
    "--json",
    "--skip-git-repo-check",
    ...profileArgs,
    CODEX_WINDOWS_PROBE_PROMPT,
  ];
}

export function parseCodexJsonlProbe(
  profile: CodexWindowsProbeProfile,
  stdout: string,
  stderr: string,
  exitCode: number | null,
  kind: CodexProcessKind,
): CodexWindowsSmokeResult {
  const hostError = hostErrorClass(`${stdout}\n${stderr}`);
  if (hostError !== null) return smokeResult(profile, "BLOCKED", false, false, kind, exitCode, hostError, ["native-sandbox-error-observed"]);
  if (kind !== "EXITED") return smokeResult(profile, "STOPPED", false, false, kind, exitCode, processKindError(kind), ["native-process-did-not-exit-normally"]);

  const commandEvents: Array<{ command: string; output: string; exitCode: number | null }> = [];
  for (const line of stdout.split(/\r?\n/u)) {
    if (line.trim() === "") continue;
    let event: unknown;
    try {
      event = JSON.parse(line) as unknown;
    } catch {
      return smokeResult(profile, "STOPPED", false, false, kind, exitCode, "CODEX_JSONL_INVALID", ["jsonl-event-invalid"]);
    }
    if (!isRecord(event) || event.type !== "item.completed" || !isRecord(event.item) || event.item.type !== "command_execution") continue;
    const command = typeof event.item.command === "string" ? event.item.command : "";
    const output = typeof event.item.aggregated_output === "string" ? event.item.aggregated_output : "";
    const commandExitCode = typeof event.item.exit_code === "number" ? event.item.exit_code : null;
    commandEvents.push({ command, output, exitCode: commandExitCode });
  }

  if (commandEvents.length === 0) {
    return smokeResult(profile, "STOPPED", false, false, kind, exitCode, "CODEX_COMMAND_EVENT_MISSING", ["command-execution-event-missing"]);
  }

  const commandEvent = commandEvents[commandEvents.length - 1];
  if (commandEvent === undefined) {
    return smokeResult(profile, "STOPPED", false, false, kind, exitCode, "CODEX_COMMAND_EVENT_MISSING", ["command-execution-event-missing"]);
  }
  const markerProduced = commandEvent.output.includes("HOST_EXEC_OK");
  const requestedCommand = /\bnode(?:\.exe)?\s+-e\b/iu.test(commandEvent.command);
  if (!requestedCommand) {
    return smokeResult(profile, "STOPPED", markerProduced, true, kind, exitCode, "CODEX_TARGET_COMMAND_NOT_CONFIRMED", ["unexpected-command-event"]);
  }
  if (!markerProduced || commandEvent.exitCode !== 0 || exitCode !== 0) {
    return smokeResult(profile, "STOPPED", markerProduced, true, kind, exitCode, "CODEX_TARGET_COMMAND_FAILED", ["target-command-marker-not-confirmed"]);
  }
  return smokeResult(profile, "PASS", true, true, kind, exitCode, null, ["target-command-marker-confirmed"]);
}

async function collectHostAudit(
  request: CodexWindowsConformanceRequest,
  codexHome: string,
  codex: CodexCommandSpec,
  dependencies: CodexWindowsConformanceDependencies,
): Promise<CodexWindowsHostAudit> {
  const unknowns: string[] = [];
  const errorClasses: string[] = [];
  let config: CodexWindowsConfigFacts = {
    sandbox: "UNKNOWN",
    approvalPolicy: null,
    sandboxMode: null,
    unknowns: ["CONFIG_UNREADABLE"],
  };
  try {
    config = parseCodexWindowsConfig(await dependencies.readText(join(codexHome, "config.toml")));
    unknowns.push(...config.unknowns);
  } catch {
    unknowns.push("CONFIG_UNREADABLE");
  }

  try {
    const logEntries = [...await dependencies.listSandboxLogs(join(codexHome, ".sandbox"))]
      .sort((first, second) => second.modifiedAtMs - first.modifiedAtMs);
    const latest = logEntries[0];
    if (latest === undefined) {
      unknowns.push("SANDBOX_LOG_MISSING");
    } else {
      assertSafeDiagnosticPath(latest.path);
      const log = sanitizeSandboxLog(await dependencies.readText(latest.path));
      errorClasses.push(...log.errorClasses);
    }
  } catch {
    unknowns.push("SANDBOX_LOG_UNREADABLE");
  }

  const powershell = await dependencies.runProcess(POWERSHELL_COMMAND, POWERSHELL_VERSION_ARGS, request.workdir, request.timeoutMs);
  const powershellVersion = powershell.kind === "EXITED" && powershell.exitCode === 0
    ? firstOutputLine(powershell.stdout)
    : null;
  if (powershellVersion === null) unknowns.push("POWERSHELL_VERSION_UNKNOWN");

  const probe = await dependencies.runProcess(POWERSHELL_COMMAND, POWERSHELL_PROBE_ARGS, request.workdir, request.timeoutMs);
  if (probe.kind !== "EXITED" || probe.exitCode !== 0) {
    unknowns.push("WINDOWS_PROBE_UNAVAILABLE");
  } else {
    try {
      const facts = parseWindowsProbeOutput(probe.stdout);
      errorClasses.push(...facts.errorClasses);
    } catch {
      unknowns.push("WINDOWS_PROBE_INVALID");
    }
  }

  const codexVersionResult = await dependencies.runProcess(
    codex.executable,
    [...codex.prefixArgs, "--version"],
    request.workdir,
    request.timeoutMs,
  );
  const codexVersion = codexVersionResult.kind === "EXITED" && codexVersionResult.exitCode === 0
    ? firstOutputLine(codexVersionResult.stdout)
    : null;
  if (codexVersion === null) unknowns.push("CODEX_VERSION_UNKNOWN");
  if (dependencies.platform !== "win32") unknowns.push("WINDOWS_PLATFORM_REQUIRED");

  return {
    state: unknowns.length === 0 ? "PASS" : "UNKNOWN",
    platform: dependencies.platform,
    architecture: dependencies.architecture,
    nodeVersion: dependencies.nodeVersion,
    powershellVersion,
    codexVersion,
    effectiveSandbox: config.sandbox,
    helperPaths: [basename(codex.executable)],
    errorClasses: [...new Set(errorClasses)],
    unknowns: [...new Set(unknowns)],
  };
}

async function runConformanceSmoke(
  request: CodexWindowsConformanceRequest,
  codex: CodexCommandSpec,
  dependencies: CodexWindowsConformanceDependencies,
): Promise<CodexWindowsSmokeResult> {
  const processResult = await dependencies.runProcess(
    codex.executable,
    [...codex.prefixArgs, ...buildCodexWindowsProbeArgs(request.profile, request.workdir)],
    request.workdir,
    request.timeoutMs,
  );
  return parseCodexJsonlProbe(request.profile, processResult.stdout, processResult.stderr, processResult.exitCode, processResult.kind);
}

function createRuntimeDependencies(): CodexWindowsConformanceDependencies {
  return {
    platform: platform(),
    architecture: arch(),
    nodeVersion: process.version,
    readText: async (path: string) => {
      assertSafeDiagnosticPath(path);
      return readFile(path, "utf8");
    },
    listSandboxLogs: async (directory: string) => {
      assertSafeDiagnosticPath(directory);
      const entries = await readdir(directory, { withFileTypes: true });
      const results: CodexWindowsLogEntry[] = [];
      for (const entry of entries) {
        if (!entry.isFile() || !/^sandbox\..+\.log$/u.test(entry.name)) continue;
        const path = join(directory, entry.name);
        assertSafeDiagnosticPath(path);
        const metadata = await lstat(path);
        if (metadata.isSymbolicLink()) continue;
        results.push({ path, modifiedAtMs: metadata.mtimeMs });
      }
      return results;
    },
    runProcess: (command, args, workdir, timeoutMs) => runCodexProcess(command, args, workdir, timeoutMs, nativeSpawn),
  };
}

function firstOutputLine(value: string): string | null {
  const line = value.split(/\r?\n/u).map((item) => item.trim()).find((item) => item !== "");
  return line ?? null;
}

function sandboxLogErrorClass(line: string): string | null {
  if (/SetFileAttributesW failed:\s*5/iu.test(line)) return "SET_FILE_ATTRIBUTES_ACCESS_DENIED";
  if (/CreateProcessAsUserW failed/iu.test(line)) return "CREATE_PROCESS_AS_USER_FAILED";
  return null;
}

function redactSandboxLine(line: string): string {
  return line
    .replace(/C:\\Users\\[^\\\s"']+/giu, "C:\\Users\\<USER>")
    .replace(/C:\\Program Files\\WindowsApps\\[^\s"']+/giu, "<CODEX_WINDOWS_APPS>")
    .replace(/\b(?:secret|token|password|cookie|authorization)\s*=\s*[^\s]+/giu, "<REDACTED>");
}

function hostErrorClass(value: string): string | null {
  if (/CreateProcessAsUserW failed/iu.test(value)) return "CREATE_PROCESS_AS_USER_FAILED";
  if (/windows sandbox[^\r\n]*(?:failed|error)/iu.test(value)) return "WINDOWS_SANDBOX_RUNNER_FAILED";
  return null;
}

function processKindError(kind: CodexProcessKind): string {
  if (kind === "SPAWN_ERROR") return "CODEX_COMMAND_UNAVAILABLE";
  if (kind === "TIMED_OUT") return "CODEX_EXECUTION_TIMED_OUT";
  if (kind === "OUTPUT_TOO_LARGE") return "CODEX_OUTPUT_TOO_LARGE";
  return "CODEX_PROCESS_FAILED";
}

function smokeResult(
  profile: CodexWindowsProbeProfile,
  state: CodexWindowsSmokeState,
  markerProduced: boolean,
  commandEventObserved: boolean,
  processKind: CodexProcessKind,
  exitCode: number | null,
  errorCode: string | null,
  evidence: readonly string[],
): CodexWindowsSmokeResult {
  return { state, profile, markerProduced, commandEventObserved, processKind, exitCode, errorCode, evidence };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

import { spawn } from "node:child_process";

export interface RunBoundedProcessRequest {
  executable: string;
  args: readonly string[];
  environment: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
}

export type BoundedProcessResult =
  | { state: "SUCCEEDED"; stdout: Buffer; stderr: Buffer; exitCode: 0; terminated: true }
  | {
      state: "FAILED";
      failure: "OUTPUT_LIMIT" | "TIMEOUT" | "NON_ZERO_EXIT" | "SPAWN_FAILURE";
      exitCode: number | null;
      terminated: true;
    };

export function runBoundedProcess(request: RunBoundedProcessRequest): Promise<BoundedProcessResult> {
  if (!Number.isSafeInteger(request.timeoutMs) || request.timeoutMs <= 0) {
    throw new TypeError("bounded process timeout must be a positive safe integer");
  }
  if (!Number.isSafeInteger(request.maxOutputBytes) || request.maxOutputBytes <= 0) {
    throw new TypeError("bounded process output limit must be a positive safe integer");
  }
  return new Promise((resolve) => {
    const child = spawn(request.executable, [...request.args], {
      env: request.environment,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let failure: "OUTPUT_LIMIT" | "TIMEOUT" | "SPAWN_FAILURE" | null = null;
    let settled = false;

    const timer = setTimeout(() => {
      if (failure === null) failure = "TIMEOUT";
      child.kill();
    }, request.timeoutMs);

    const capture = (target: Buffer[], stream: "stdout" | "stderr", chunk: Buffer): void => {
      if (failure !== null) return;
      if (stream === "stdout") stdoutBytes += chunk.length;
      else stderrBytes += chunk.length;
      const bytes = stream === "stdout" ? stdoutBytes : stderrBytes;
      if (bytes > request.maxOutputBytes) {
        failure = "OUTPUT_LIMIT";
        child.kill();
        return;
      }
      target.push(Buffer.from(chunk));
    };

    child.stdout.on("data", (chunk: Buffer) => capture(stdout, "stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => capture(stderr, "stderr", chunk));
    child.once("error", () => {
      failure = "SPAWN_FAILURE";
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (failure !== null) {
        resolve({ state: "FAILED", failure, exitCode: null, terminated: true });
      } else if (code !== 0) {
        resolve({ state: "FAILED", failure: "NON_ZERO_EXIT", exitCode: code, terminated: true });
      } else {
        resolve({
          state: "SUCCEEDED",
          stdout: Buffer.concat(stdout, stdoutBytes),
          stderr: Buffer.concat(stderr, stderrBytes),
          exitCode: 0,
          terminated: true,
        });
      }
    });
  });
}

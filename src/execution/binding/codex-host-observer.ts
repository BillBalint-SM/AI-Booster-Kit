import { createHash } from "node:crypto";

import { ExecutionContractError } from "../types.js";
import type { CodexHostSessionObservation } from "./types.js";

const invalidCode = "EXECUTION_CODEX_HOST_OBSERVATION_INVALID";
const sessionDomain = "execution-codex-host-session-v1\0";

export function observeCodexHostSession(request: {
  threadId: string | undefined;
  observedAt: string;
}): CodexHostSessionObservation {
  if (!isCanonicalInstant(request.observedAt)) {
    throw new ExecutionContractError(invalidCode, "Codex host observation time is invalid");
  }
  const normalized = normalizedUuid(request.threadId);
  if (normalized === null) {
    return {
      hostProfileId: "CODEX_APP_NATIVE_V1",
      hostSessionId: null,
      state: "UNKNOWN",
      reasonCode: "HOST_SESSION_IDENTITY_UNKNOWN",
      observedAt: request.observedAt,
    };
  }
  return {
    hostProfileId: "CODEX_APP_NATIVE_V1",
    hostSessionId: createHash("sha256").update(`${sessionDomain}${normalized}`, "utf8").digest("hex"),
    state: "OBSERVED",
    reasonCode: null,
    observedAt: request.observedAt,
  };
}

export function currentCodexHostSessionObservation(observedAt: string): CodexHostSessionObservation {
  return observeCodexHostSession({ threadId: process.env.CODEX_THREAD_ID, observedAt });
}

function normalizedUuid(value: string | undefined): string | null {
  if (value === undefined) return null;
  const normalized = value.toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)
    ? normalized
    : null;
}

function isCanonicalInstant(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

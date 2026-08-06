import { win32 } from "node:path";

import type { OwnerIdentityPathResult } from "./types.js";

export interface OwnerIdentityPathInput {
  platform: string;
  env: Readonly<Record<string, string | undefined>>;
}

export function resolveUserLocalPath(input: OwnerIdentityPathInput): OwnerIdentityPathResult {
  if (input.platform !== "win32") {
    return { status: "UNAVAILABLE", reason: "OWNER_IDENTITY_HOST_UNSUPPORTED" };
  }

  const localAppData = input.env.LOCALAPPDATA;
  if (typeof localAppData !== "string" || localAppData.trim() === "" || localAppData.includes("\0") || !win32.isAbsolute(localAppData)) {
    return { status: "UNAVAILABLE", reason: "OWNER_IDENTITY_LOCAL_PATH_MISSING" };
  }

  return {
    status: "AVAILABLE",
    path: win32.join(localAppData, "AI Booster Kit", "owner-identity.json"),
  };
}

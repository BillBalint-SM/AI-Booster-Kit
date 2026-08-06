import { ensureOwnerIdentity } from "../owner-identity/state.js";
import type { OwnerIdentityPrompt, OwnerIdentityState, OwnerIdentityStorage } from "../owner-identity/types.js";

export type OwnerIdentityBootstrapResult = OwnerIdentityState | { status: "SKIPPED" };

export async function bootstrapOwnerIdentity(argv: readonly string[], storage: OwnerIdentityStorage, prompt: OwnerIdentityPrompt): Promise<OwnerIdentityBootstrapResult> {
  if (!isNormalPlatformStart(argv)) return { status: "SKIPPED" };
  return ensureOwnerIdentity(storage, prompt);
}

function isNormalPlatformStart(argv: readonly string[]): boolean {
  return argv.length === 3 && argv[0] === "recommend-formation" && argv[1] === "--input" && argv[2] !== undefined && argv[2].trim() !== "";
}

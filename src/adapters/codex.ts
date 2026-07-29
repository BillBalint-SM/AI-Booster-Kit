import { compileNativeAdapter } from "../contract/compile.js";
import { createLocalHostAdapter } from "./types.js";

export const codexAdapter = createLocalHostAdapter(
  {
    host: "codex",
    versionContext: "V1 local event and projection adapter",
    localEventEmission: "supported_with_limits",
    limitations: ["Emits canonical local events only.", "Does not execute external writes."],
    nativeProjectionLocation: "contract/adapters/codex.md",
  },
  compileNativeAdapter,
);

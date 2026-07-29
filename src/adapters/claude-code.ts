import { compileNativeAdapter } from "../contract/compile.js";
import { createLocalHostAdapter } from "./types.js";

export const claudeCodeAdapter = createLocalHostAdapter(
  {
    host: "claude-code",
    versionContext: "V1 validation and projection adapter",
    localEventEmission: "supported_with_limits",
    limitations: ["Produces deterministic local canonical events for conformance only.", "Live host capability is unverified and external writes are unsupported."],
    nativeProjectionLocation: "contract/adapters/claude-code.md",
  },
  compileNativeAdapter,
);

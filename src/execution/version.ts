import { ExecutionContractError } from "./types.js";

export const CURRENT_EXECUTION_CONTRACT_VERSION = "2.0" as const;
export const LEGACY_EXECUTION_CONTRACT_VERSION = "1.0" as const;

export type ExecutionContractVersion =
  | typeof LEGACY_EXECUTION_CONTRACT_VERSION
  | typeof CURRENT_EXECUTION_CONTRACT_VERSION;

export type ExecutionVersionDisposition =
  | "LEGACY_READ_ONLY"
  | "CURRENT_MUTABLE";

export function classifyExecutionContractVersion(value: unknown): ExecutionVersionDisposition {
  if (value === LEGACY_EXECUTION_CONTRACT_VERSION) return "LEGACY_READ_ONLY";
  if (value === CURRENT_EXECUTION_CONTRACT_VERSION) return "CURRENT_MUTABLE";
  throw new ExecutionContractError(
    "EXECUTION_CONTRACT_VERSION_UNSUPPORTED",
    "execution contract version is unsupported",
  );
}

export function assertMutableExecutionContractVersion(value: unknown): void {
  const disposition = classifyExecutionContractVersion(value);
  if (disposition === "LEGACY_READ_ONLY") {
    throw new ExecutionContractError(
      "EXECUTION_LEGACY_CONTRACT_READ_ONLY",
      "execution contract version 1.0 is historical read-only state",
    );
  }
}

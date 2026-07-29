export type ExternalOperationState = "applied" | "not_applied" | "unknown";

export interface ReadBackState {
  canonicalId: string;
  idempotencyKey?: string;
  operationState: ExternalOperationState;
}

export interface ReconciliationInput {
  canonicalId: string;
  idempotencyKey: string;
  readBack: () => Promise<ReadBackState>;
}

export interface ReconciliationResult {
  state: ExternalOperationState;
  idempotencyKey: string;
  syncStop: boolean;
}

export async function reconcileUnknownCompletion(
  input: ReconciliationInput,
): Promise<ReconciliationResult> {
  try {
    const readBack = await input.readBack();
    if (readBack.canonicalId !== input.canonicalId || readBack.idempotencyKey !== input.idempotencyKey) {
      return unknownResult(input.idempotencyKey);
    }
    if (readBack.operationState === "applied" || readBack.operationState === "not_applied") {
      return { state: readBack.operationState, idempotencyKey: input.idempotencyKey, syncStop: false };
    }
    return unknownResult(input.idempotencyKey);
  } catch {
    return unknownResult(input.idempotencyKey);
  }
}

function unknownResult(idempotencyKey: string): ReconciliationResult {
  return { state: "unknown", idempotencyKey, syncStop: true };
}

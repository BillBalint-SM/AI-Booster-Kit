import { TextDecoder } from "node:util";

import { ExecutionContractError } from "./types.js";

export async function readBoundedJsonInput(
  input: NodeJS.ReadableStream,
  maxBytes: number,
): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new ExecutionContractError("EXECUTION_INPUT_JSON_INVALID", "execution input byte limit is invalid");
  }
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    for await (const chunk of input) {
      const bytes = Buffer.from(chunk);
      totalBytes += bytes.length;
      if (totalBytes > maxBytes) {
        destroyInput(input);
        throw new ExecutionContractError("COMMAND_INPUT_TOO_LARGE", "execution input exceeds its byte limit");
      }
      chunks.push(bytes);
    }
  } catch (error) {
    if (error instanceof ExecutionContractError) throw error;
    throw new ExecutionContractError("EXECUTION_INPUT_JSON_INVALID", "execution input stream could not be read");
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, totalBytes));
    return JSON.parse(source) as unknown;
  } catch {
    throw new ExecutionContractError("EXECUTION_INPUT_JSON_INVALID", "execution input is not valid UTF-8 JSON");
  }
}

function destroyInput(input: NodeJS.ReadableStream): void {
  if ("destroy" in input && typeof input.destroy === "function") input.destroy();
  else if ("pause" in input && typeof input.pause === "function") input.pause();
}

#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { BoosterCompassError, projectDeliveryCompass } from "./booster-compass.mjs";

const args = process.argv.slice(2);

if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
  process.stdout.write("Usage: node scripts/booster.mjs (--input <path> | --stdin)\n");
} else {
  try {
    const inputSource = await readInput(args);
    const registrySource = await readFile(new URL("../registry/skill-registry.json", import.meta.url), "utf8");
    const input = parseJson(inputSource, "BOOSTER_INPUT_JSON_INVALID");
    const registry = parseJson(registrySource, "BOOSTER_REGISTRY_JSON_INVALID");
    const result = projectDeliveryCompass(input, registry);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === "READY" || result.status === "COMPLETE" ? 0 : 2;
  } catch (error) {
    const normalized = normalizeError(error);
    process.stdout.write(`${JSON.stringify({
      decision: "STOPPED",
      impact: "UNKNOWN",
      requiresAcknowledgement: false,
      error: { code: normalized.code, message: normalized.message },
    })}\n`);
    process.exitCode = normalized.exitCode;
  }
}

async function readInput(args) {
  if (args.length === 1 && args[0] === "--stdin") return readStdin();
  if (args.length === 2 && args[0] === "--input") {
    try {
      return await readFile(args[1], "utf8");
    } catch (error) {
      if (isSystemError(error)) throw localError("BOOSTER_INPUT_PATH_UNREADABLE", "The explicit Booster request path could not be read", 4);
      throw error;
    }
  }
  throw localError("COMMAND_CONFIGURATION_INVALID", "booster requires --input <path> or --stdin", 4);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function parseJson(source, code) {
  try {
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof SyntaxError) throw localError(code, "The supplied Booster JSON is invalid", 3);
    throw error;
  }
}

function normalizeError(error) {
  if (error instanceof BoosterCompassError) return { code: error.code, message: error.message, exitCode: 3 };
  if (error && typeof error === "object" && error.localBoosterError === true) return error;
  throw error;
}

function localError(code, message, exitCode) {
  return { localBoosterError: true, code, message, exitCode };
}

function isSystemError(error) {
  return typeof error === "object" && error !== null && "code" in error;
}

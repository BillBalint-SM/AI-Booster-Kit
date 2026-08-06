import { EMPTY_OWNER_ACTOR } from "./types.js";
import type { OwnerAliasInvalidReason, OwnerIdentityPrompt, OwnerIdentityState, OwnerIdentityStorage, OwnerIdentityWriteResult } from "./types.js";
import { validateOwnerAlias } from "./validation.js";

export async function ensureOwnerIdentity(storage: OwnerIdentityStorage, prompt: OwnerIdentityPrompt): Promise<OwnerIdentityState> {
  const current = await storage.read();
  if (current.status === "SET") return { status: "SET", actor: current.profile.ownerAlias, prompted: false };
  if (current.status === "UNAVAILABLE") {
    return { status: "UNAVAILABLE", actor: EMPTY_OWNER_ACTOR, prompted: false, reason: current.reason };
  }
  const prompted = await collectPrompt(prompt);
  if (prompted.status === "EMPTY") return { status: "EMPTY", actor: EMPTY_OWNER_ACTOR, prompted: true };
  if (prompted.status === "INVALID") return { status: "INVALID", actor: EMPTY_OWNER_ACTOR, prompted: true, reason: prompted.reason };
  if (prompted.status === "UNAVAILABLE") return { status: "UNAVAILABLE", actor: EMPTY_OWNER_ACTOR, prompted: true, reason: prompted.reason };
  return stateFromWrite(await storage.save(prompted.ownerAlias), EMPTY_OWNER_ACTOR);
}

export async function reconfigureOwner(storage: OwnerIdentityStorage, prompt: OwnerIdentityPrompt): Promise<OwnerIdentityState> {
  const current = await storage.read();
  if (current.status === "UNAVAILABLE") {
    return { status: "UNAVAILABLE", actor: EMPTY_OWNER_ACTOR, prompted: false, reason: current.reason };
  }
  const currentActor = current.status === "SET" ? current.profile.ownerAlias : EMPTY_OWNER_ACTOR;
  const prompted = await collectPrompt(prompt);
  if (prompted.status === "EMPTY") return { status: "EMPTY", actor: currentActor, prompted: true };
  if (prompted.status === "INVALID") return { status: "INVALID", actor: currentActor, prompted: true, reason: prompted.reason };
  if (prompted.status === "UNAVAILABLE") return { status: "UNAVAILABLE", actor: currentActor, prompted: true, reason: prompted.reason };
  return stateFromWrite(await storage.replace(prompted.ownerAlias), currentActor);
}

export function toAttributionActor(state: OwnerIdentityState): string {
  return state.actor;
}

export function withOwnerIdentityActor<T extends { actor: string }>(input: T, state: OwnerIdentityState): T {
  return { ...input, actor: toAttributionActor(state) };
}

type CollectedPrompt =
  | { status: "VALID"; ownerAlias: string }
  | { status: "EMPTY" }
  | { status: "INVALID"; reason: OwnerAliasInvalidReason }
  | { status: "UNAVAILABLE"; reason: "OWNER_IDENTITY_PROMPT_UNAVAILABLE" };

async function collectPrompt(prompt: OwnerIdentityPrompt): Promise<CollectedPrompt> {
  let input: string | null;
  try {
    input = await prompt();
  } catch {
    return { status: "UNAVAILABLE", reason: "OWNER_IDENTITY_PROMPT_UNAVAILABLE" };
  }

  if (input === null || input.trim() === "") return { status: "EMPTY" };
  const validation = validateOwnerAlias(input);
  if (validation.status === "INVALID") return validation;
  return validation;
}

function stateFromWrite(result: OwnerIdentityWriteResult, currentActor: string): OwnerIdentityState {
  if (result.status === "SET") return { status: "SET", actor: result.profile.ownerAlias, prompted: true };
  if (result.status === "INVALID") return { status: "INVALID", actor: currentActor, prompted: true, reason: result.reason };
  if (result.status === "CONFLICT") return { status: "CONFLICT", actor: currentActor, prompted: true, reason: result.reason };
  return { status: "UNAVAILABLE", actor: currentActor, prompted: true, reason: result.reason };
}

import { ContextError } from "./types.js";
import { validateMilestoneContext } from "./validation.js";
import type { EpicContext, MilestoneContext } from "./types.js";

export type HandoffStatus = "READY_FOR_FAN_IN" | "BLOCKED" | "STOPPED";

export interface ParallelizationContract {
  milestoneId: string;
  sourceRevision: string;
  integrationOwner: string;
  reviewOwner: string;
  integrationDoD: readonly string[];
  rollbackPlan: readonly string[];
  epicIds: readonly string[];
}

export interface HandoffPacket {
  epicId: string;
  sourceRevision: string;
  owner: string;
  status: HandoffStatus;
  deliveredOutput: readonly string[];
  acceptanceResults: readonly string[];
  evidenceRefs: readonly string[];
  unknowns: readonly string[];
  conflicts: readonly string[];
  nextAction: string;
}

export function validateTeamDeliveryFanIn(
  contract: ParallelizationContract,
  packets: readonly HandoffPacket[],
  milestone: MilestoneContext,
  epics: readonly EpicContext[],
): void {
  validateMilestoneContext(milestone, epics);
  requiredString(contract.milestoneId, "fan-in Milestone");
  requiredString(contract.sourceRevision, "fan-in source revision");
  requiredString(contract.integrationOwner, "fan-in integration owner");
  requiredString(contract.reviewOwner, "fan-in review owner");
  nonEmptyUniqueStrings(contract.integrationDoD, "fan-in integration DoD");
  nonEmptyUniqueStrings(contract.rollbackPlan, "fan-in rollback plan");
  nonEmptyUniqueStrings(contract.epicIds, "fan-in Epic IDs");

  if (contract.milestoneId !== milestone.milestoneId) throw new ContextError("fan-in Milestone does not match the context bundle");
  if (contract.sourceRevision !== milestone.sourceRevision) throw new ContextError("fan-in source revision does not match the Milestone context");
  if (!sameSet(contract.epicIds, milestone.epicIds)) throw new ContextError("fan-in Epic IDs do not match the Milestone context");
  if (packets.length !== contract.epicIds.length) throw new ContextError("fan-in must contain exactly one handoff packet per Epic");

  const knownEpicIds = new Set(contract.epicIds);
  const packetEpicIds = packets.map((packet) => packet.epicId);
  if (!sameSet(packetEpicIds, contract.epicIds)) throw new ContextError("fan-in handoff packets contain a missing or foreign Epic");

  for (const packet of packets) validateHandoffPacket(packet, contract, knownEpicIds);
}

function validateHandoffPacket(packet: HandoffPacket, contract: ParallelizationContract, knownEpicIds: ReadonlySet<string>): void {
  requiredString(packet.epicId, "handoff Epic");
  requiredString(packet.sourceRevision, "handoff source revision");
  requiredString(packet.owner, "handoff owner");
  requiredString(packet.nextAction, "handoff next action");
  nonEmptyUniqueStrings(packet.deliveredOutput, "handoff delivered output");
  nonEmptyUniqueStrings(packet.acceptanceResults, "handoff acceptance results");
  nonEmptyUniqueStrings(packet.evidenceRefs, "handoff evidence references");
  uniqueStrings(packet.unknowns, "handoff unknowns");
  uniqueStrings(packet.conflicts, "handoff conflicts");
  if (!knownEpicIds.has(packet.epicId)) throw new ContextError("handoff packet references a foreign Epic");
  if (packet.sourceRevision !== contract.sourceRevision) throw new ContextError("handoff source revision does not match the fan-in contract");
  if (packet.status !== "READY_FOR_FAN_IN") throw new ContextError("blocked or stopped handoff cannot enter fan-in");
  if (packet.unknowns.length > 0) throw new ContextError("handoff with unresolved unknowns cannot enter fan-in");
  if (packet.conflicts.length > 0) throw new ContextError("handoff with unresolved conflicts cannot enter fan-in");
}

function requiredString(value: string, label: string): void {
  if (typeof value !== "string" || value.trim() === "") throw new ContextError(`${label} must be non-empty`);
}

function nonEmptyUniqueStrings(values: readonly string[], label: string): void {
  if (values.length === 0) throw new ContextError(`${label} must contain at least one item`);
  uniqueStrings(values, label);
}

function uniqueStrings(values: readonly string[], label: string): void {
  if (values.some((value) => typeof value !== "string" || value.trim() === "") || new Set(values).size !== values.length) {
    throw new ContextError(`${label} must contain unique non-empty strings`);
  }
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && new Set(left).size === left.length && left.every((value) => right.includes(value));
}

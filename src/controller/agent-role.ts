import { readFile } from "node:fs/promises";

import { parseDocument } from "yaml";

import type { AgentDefinition, AgentInventory } from "./agent-inventory.js";

export type RoleCatalogStatus = "READY_WITH_LIMIT";
export type RoleAssignmentMode = "lead" | "contributor" | "reviewer" | "fallback";
export type RoleWriteScope = "NONE" | "ROLE_ARTIFACT";
export type ContextLayer = "IDENTITY" | "ROLE" | "TASK" | "EVIDENCE" | "HANDOFF";
export type ProjectionStatus = "READY" | "NOT_READY";

export interface RoleContextContract {
  layers: readonly ContextLayer[];
  isolated: boolean;
  sharedArtifacts: readonly string[];
}

export interface RoleHandoffContract {
  produces: string;
  acceptsFrom: readonly string[];
  requiredEvidence: readonly string[];
  stopConditions: readonly string[];
}

export interface RoleDefinition {
  roleId: string;
  displayName: string;
  purpose: string;
  requiredCapabilities: readonly string[];
  contextContract: RoleContextContract;
  handoffContract: RoleHandoffContract;
}

export interface RoleAssignment {
  roleId: string;
  agentId: string;
  mode: RoleAssignmentMode;
  contextKey: string;
  writeScope: RoleWriteScope;
}

export interface RoleCatalog {
  catalogId: "agent-role-library";
  catalogVersion: "1.0.0";
  status: RoleCatalogStatus;
  roles: readonly RoleDefinition[];
  assignments: readonly RoleAssignment[];
}

export interface MultiRoleAgentFinding {
  agentId: string;
  roleIds: readonly string[];
}

export interface RoleCoverageFinding {
  roleId: string;
  agentIds: readonly string[];
  leadAgentId: string | null;
  assignmentCount: number;
}

export interface AgentRoleCoverageReport {
  status: ProjectionStatus;
  agentCount: number;
  roleCount: number;
  assignmentCount: number;
  roleCoverage: readonly RoleCoverageFinding[];
  multiRoleAgents: readonly MultiRoleAgentFinding[];
  unassignedAgentIds: readonly string[];
  missingAgentIds: readonly string[];
  unknownRoleIds: readonly string[];
  uncoveredRoleIds: readonly string[];
  duplicateAssignments: readonly string[];
  leadConflicts: readonly string[];
  contextViolations: readonly string[];
  handoffViolations: readonly string[];
  sharedWriteViolations: readonly string[];
}

export interface FormationBindingInput {
  formationId: string;
  agentBindings: readonly {
    roleId: string;
    agentId: string;
    mode: RoleAssignmentMode;
    contextKey: string;
  }[];
}

export interface ProjectedFormationBinding {
  roleId: string;
  agentId: string;
  mode: RoleAssignmentMode;
  contextKey: string;
  sourcePath: string;
  sourceSha256: string;
}

export interface FormationProjection {
  status: ProjectionStatus;
  formationId: string;
  bindings: readonly ProjectedFormationBinding[];
  missingAgentIds: readonly string[];
  unknownRoleIds: readonly string[];
  unmappedBindingKeys: readonly string[];
  contextViolations: readonly string[];
}

export class AgentRoleCatalogError extends Error {
  public constructor(field: string, message: string) {
    super(`Agent Role catalog rejected: ${field} ${message}.`);
    this.name = "AgentRoleCatalogError";
  }
}

const catalogKeys = ["catalogId", "catalogVersion", "status", "roles", "assignments"] as const;
const roleKeys = ["roleId", "displayName", "purpose", "requiredCapabilities", "contextContract", "handoffContract"] as const;
const contextKeys = ["layers", "isolated", "sharedArtifacts"] as const;
const handoffKeys = ["produces", "acceptsFrom", "requiredEvidence", "stopConditions"] as const;
const assignmentKeys = ["roleId", "agentId", "mode", "contextKey", "writeScope"] as const;
const requiredLayers: readonly ContextLayer[] = ["IDENTITY", "ROLE", "TASK", "EVIDENCE", "HANDOFF"];

export async function loadRoleCatalog(sourcePath: string): Promise<RoleCatalog> {
  let source: string;
  try {
    source = await readFile(sourcePath, "utf8");
  } catch {
    throw new AgentRoleCatalogError(sourcePath, "could not be read");
  }
  return parseRoleCatalog(source, sourcePath);
}

export function parseRoleCatalog(source: string, sourcePath: string): RoleCatalog {
  const frontmatter = extractFrontmatter(source, sourcePath);
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) throw new AgentRoleCatalogError("frontmatter", "contains invalid YAML metadata");
  const metadata = requireRecord(document.toJS(), "frontmatter");
  requireExactKeys(metadata, catalogKeys, "frontmatter");
  requireLiteral(metadata, "catalogId", "agent-role-library", "frontmatter.catalogId");
  requireLiteral(metadata, "catalogVersion", "1.0.0", "frontmatter.catalogVersion");
  requireLiteral(metadata, "status", "READY_WITH_LIMIT", "frontmatter.status");

  const roles = requireNonEmptyList(metadata.roles, "frontmatter.roles").map((value, index) => parseRole(value, index));
  const assignments = requireNonEmptyList(metadata.assignments, "frontmatter.assignments").map((value, index) => parseAssignment(value, index));
  const roleIds = new Set<string>();
  for (const [index, role] of roles.entries()) {
    if (roleIds.has(role.roleId)) throw new AgentRoleCatalogError(`roles[${index}].roleId`, `duplicates ${role.roleId}`);
    roleIds.add(role.roleId);
  }
  return { catalogId: "agent-role-library", catalogVersion: "1.0.0", status: "READY_WITH_LIMIT", roles, assignments };
}

export function analyzeAgentRoleCoverage(inventory: AgentInventory, catalog: RoleCatalog): AgentRoleCoverageReport {
  const agentIds = new Set(inventory.agents.map((agent) => agent.agentId));
  const roleIds = new Set(catalog.roles.map((role) => role.roleId));
  const missingAgentIds = uniqueSorted(catalog.assignments.filter((assignment) => !agentIds.has(assignment.agentId)).map((assignment) => assignment.agentId));
  const unknownRoleIds = uniqueSorted(catalog.assignments.filter((assignment) => !roleIds.has(assignment.roleId)).map((assignment) => assignment.roleId));
  const duplicateAssignments: string[] = [];
  const assignmentKeys = new Set<string>();
  const contextRolesByAgent = new Map<string, Map<string, Set<string>>>();
  for (const assignment of catalog.assignments) {
    const assignmentKey = `${assignment.roleId}|${assignment.agentId}|${assignment.contextKey}`;
    if (assignmentKeys.has(assignmentKey)) duplicateAssignments.push(assignmentKey);
    assignmentKeys.add(assignmentKey);
    const contextRoles = contextRolesByAgent.get(assignment.agentId) ?? new Map<string, Set<string>>();
    const roles = contextRoles.get(assignment.contextKey) ?? new Set<string>();
    roles.add(assignment.roleId);
    contextRoles.set(assignment.contextKey, roles);
    contextRolesByAgent.set(assignment.agentId, contextRoles);
  }

  const contextViolations = uniqueSorted([...contextRolesByAgent.entries()].flatMap(([agentId, contexts]) => [...contexts.entries()]
    .filter(([, roles]) => roles.size > 1)
    .map(([contextKey, roles]) => `${agentId}:${contextKey}:${[...roles].sort().join(",")}`)));

  const roleCoverage = catalog.roles.map((role) => {
    const assignments = catalog.assignments.filter((assignment) => assignment.roleId === role.roleId);
    const leads = assignments.filter((assignment) => assignment.mode === "lead");
    return {
      roleId: role.roleId,
      agentIds: uniqueSorted(assignments.map((assignment) => assignment.agentId)),
      leadAgentId: leads.length === 1 ? leads[0]!.agentId : null,
      assignmentCount: assignments.length,
    };
  });
  const uncoveredRoleIds = roleCoverage.filter((coverage) => coverage.assignmentCount === 0).map((coverage) => coverage.roleId);
  const leadConflicts = roleCoverage.filter((coverage) => coverage.assignmentCount > 0 && coverage.leadAgentId === null).map((coverage) => `${coverage.roleId}:requires exactly one lead`);
  const multiRoleAgents = uniqueSorted(inventory.agents.map((agent) => agent.agentId).filter((agentId) => new Set(catalog.assignments.filter((assignment) => assignment.agentId === agentId).map((assignment) => assignment.roleId)).size > 1)).map((agentId) => ({
    agentId,
    roleIds: uniqueSorted(catalog.assignments.filter((assignment) => assignment.agentId === agentId).map((assignment) => assignment.roleId)),
  }));
  const unassignedAgentIds = uniqueSorted(inventory.agents.filter((agent) => !catalog.assignments.some((assignment) => assignment.agentId === agent.agentId)).map((agent) => agent.agentId));
  const handoffViolations = uniqueSorted(catalog.roles.flatMap((role) => role.handoffContract.acceptsFrom.filter((sourceRoleId) => !roleIds.has(sourceRoleId)).map((sourceRoleId) => `${role.roleId}:unknown handoff source ${sourceRoleId}`)));
  const sharedWriteViolations = uniqueSorted(catalog.roles.flatMap((role) => {
    const assignments = catalog.assignments.filter((assignment) => assignment.roleId === role.roleId);
    return assignments.some((assignment) => assignment.writeScope === "ROLE_ARTIFACT") && assignments.filter((assignment) => assignment.mode === "lead").length !== 1
      ? [`${role.roleId}:ROLE_ARTIFACT requires exactly one lead`]
      : [];
  }));

  return {
    status: missingAgentIds.length === 0 && unknownRoleIds.length === 0 && uncoveredRoleIds.length === 0 && duplicateAssignments.length === 0 && leadConflicts.length === 0 && contextViolations.length === 0 && handoffViolations.length === 0 && sharedWriteViolations.length === 0 && unassignedAgentIds.length === 0 ? "READY" : "NOT_READY",
    agentCount: inventory.agentCount,
    roleCount: catalog.roles.length,
    assignmentCount: catalog.assignments.length,
    roleCoverage,
    multiRoleAgents,
    unassignedAgentIds,
    missingAgentIds,
    unknownRoleIds,
    uncoveredRoleIds,
    duplicateAssignments: uniqueSorted(duplicateAssignments),
    leadConflicts: uniqueSorted(leadConflicts),
    contextViolations,
    handoffViolations,
    sharedWriteViolations,
  };
}

export function projectFormation(inventory: AgentInventory, catalog: RoleCatalog, formation: FormationBindingInput): FormationProjection {
  const agentById = new Map(inventory.agents.map((agent) => [agent.agentId, agent]));
  const roleIds = new Set(catalog.roles.map((role) => role.roleId));
  const missingAgentIds = uniqueSorted(formation.agentBindings.filter((binding) => !agentById.has(binding.agentId)).map((binding) => binding.agentId));
  const unknownRoleIds = uniqueSorted(formation.agentBindings.filter((binding) => !roleIds.has(binding.roleId)).map((binding) => binding.roleId));
  const catalogAgentRoleKeys = new Set(catalog.assignments.map((assignment) => `${assignment.roleId}|${assignment.agentId}`));
  const unmappedBindingKeys = uniqueSorted(formation.agentBindings.filter((binding) => !catalogAgentRoleKeys.has(`${binding.roleId}|${binding.agentId}`)).map((binding) => `${binding.roleId}|${binding.agentId}`));
  const contextRolesByAgent = new Map<string, Map<string, Set<string>>>();
  const contextViolations: string[] = [];
  const bindings: ProjectedFormationBinding[] = [];
  for (const binding of formation.agentBindings) {
    const contexts = contextRolesByAgent.get(binding.agentId) ?? new Map<string, Set<string>>();
    const roles = contexts.get(binding.contextKey) ?? new Set<string>();
    roles.add(binding.roleId);
    contexts.set(binding.contextKey, roles);
    contextRolesByAgent.set(binding.agentId, contexts);
    if (roles.size > 1) contextViolations.push(`${binding.agentId}:${binding.contextKey}:${[...roles].sort().join(",")}`);
    if (roles.size === 1 && formation.agentBindings.filter((candidate) => candidate.agentId === binding.agentId && candidate.contextKey === binding.contextKey).length > 1) {
      contextViolations.push(`${binding.agentId}:${binding.contextKey}`);
    }
    const agent = agentById.get(binding.agentId);
    if (agent !== undefined) bindings.push({ ...binding, sourcePath: agent.sourcePath, sourceSha256: agent.sourceSha256 });
  }
  return {
    status: missingAgentIds.length === 0 && unknownRoleIds.length === 0 && unmappedBindingKeys.length === 0 && contextViolations.length === 0 ? "READY" : "NOT_READY",
    formationId: formation.formationId,
    bindings,
    missingAgentIds,
    unknownRoleIds,
    unmappedBindingKeys,
    contextViolations: uniqueSorted(contextViolations),
  };
}

function parseRole(value: unknown, index: number): RoleDefinition {
  const field = `roles[${index}]`;
  const role = requireRecord(value, field);
  requireExactKeys(role, roleKeys, field);
  const context = requireRecord(role.contextContract, `${field}.contextContract`);
  requireExactKeys(context, contextKeys, `${field}.contextContract`);
  const handoff = requireRecord(role.handoffContract, `${field}.handoffContract`);
  requireExactKeys(handoff, handoffKeys, `${field}.handoffContract`);
  const layers = requireEnumList(context.layers, requiredLayers, `${field}.contextContract.layers`, "a supported context layer") as ContextLayer[];
  if (requiredLayers.some((layer) => !layers.includes(layer))) throw new AgentRoleCatalogError(`${field}.contextContract.layers`, "must include IDENTITY, ROLE, TASK, EVIDENCE, and HANDOFF");
  if (typeof context.isolated !== "boolean") throw new AgentRoleCatalogError(`${field}.contextContract.isolated`, "must be a boolean");
  return {
    roleId: requireNonEmptyString(role.roleId, `${field}.roleId`),
    displayName: requireNonEmptyString(role.displayName, `${field}.displayName`),
    purpose: requireNonEmptyString(role.purpose, `${field}.purpose`),
    requiredCapabilities: requireNonEmptyStringList(role.requiredCapabilities, `${field}.requiredCapabilities`),
    contextContract: {
      layers,
      isolated: context.isolated,
      sharedArtifacts: requireNonEmptyStringList(context.sharedArtifacts, `${field}.contextContract.sharedArtifacts`),
    },
    handoffContract: {
      produces: requireNonEmptyString(handoff.produces, `${field}.handoffContract.produces`),
      acceptsFrom: requireStringList(handoff.acceptsFrom, `${field}.handoffContract.acceptsFrom`),
      requiredEvidence: requireNonEmptyStringList(handoff.requiredEvidence, `${field}.handoffContract.requiredEvidence`),
      stopConditions: requireNonEmptyStringList(handoff.stopConditions, `${field}.handoffContract.stopConditions`),
    },
  };
}

function parseAssignment(value: unknown, index: number): RoleAssignment {
  const field = `assignments[${index}]`;
  const assignment = requireRecord(value, field);
  requireExactKeys(assignment, assignmentKeys, field);
  return {
    roleId: requireNonEmptyString(assignment.roleId, `${field}.roleId`),
    agentId: requireNonEmptyString(assignment.agentId, `${field}.agentId`),
    mode: requireEnum(assignment.mode, ["lead", "contributor", "reviewer", "fallback"], `${field}.mode`, "lead, contributor, reviewer, or fallback") as RoleAssignmentMode,
    contextKey: requireNonEmptyString(assignment.contextKey, `${field}.contextKey`),
    writeScope: requireEnum(assignment.writeScope, ["NONE", "ROLE_ARTIFACT"], `${field}.writeScope`, "NONE or ROLE_ARTIFACT") as RoleWriteScope,
  };
}

function extractFrontmatter(source: string, sourcePath: string): string {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (match?.[1] === undefined) throw new AgentRoleCatalogError(sourcePath, "must start with one frontmatter block");
  return match[1];
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new AgentRoleCatalogError(field, "must be a plain mapping");
  return value as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], field: string): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string" || !expected.includes(key)) throw new AgentRoleCatalogError(`${field}.${String(key)}`, "is not allowed");
  }
  for (const key of expected) if (!Object.hasOwn(record, key)) throw new AgentRoleCatalogError(`${field}.${key}`, "is required");
}

function requireNonEmptyList(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new AgentRoleCatalogError(field, "must be a non-empty list");
  return value;
}

function requireNonEmptyStringList(value: unknown, field: string): readonly string[] {
  const list = requireNonEmptyList(value, field);
  if (list.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) throw new AgentRoleCatalogError(field, "must contain only non-empty strings");
  return list as string[];
}

function requireStringList(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) throw new AgentRoleCatalogError(field, "must contain only strings");
  return value as string[];
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new AgentRoleCatalogError(field, "must be a non-empty string");
  return value;
}

function requireEnum(value: unknown, allowed: readonly string[], field: string, description: string): string {
  if (typeof value !== "string" || !allowed.includes(value)) throw new AgentRoleCatalogError(field, `must be ${description}`);
  return value;
}

function requireEnumList(value: unknown, allowed: readonly string[], field: string, description: string): readonly string[] {
  const list = requireNonEmptyStringList(value, field);
  if (list.some((entry) => !allowed.includes(entry))) throw new AgentRoleCatalogError(field, `must contain only ${description} values`);
  return list;
}

function requireLiteral(record: Record<string, unknown>, field: string, expected: string, location: string): void {
  if (record[field] !== expected) throw new AgentRoleCatalogError(location, `must be ${expected}`);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

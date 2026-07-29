import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { type CanonicalEvent, validateCanonicalEvent } from "./envelope.js";

export type SyncState = "planned" | "applied" | "not_applied" | "stopped" | "unknown";

export interface SyncResult {
  state: SyncState;
  correlationId: string;
  evidenceRefs: string[];
  errorCode: string | null;
}

interface EventRecord { recordType: "event"; event: CanonicalEvent; }
interface ResultRecord { recordType: "result"; idempotencyKey: string; result: SyncResult; }
interface ClaimRecord { recordType: "claim"; idempotencyKey: string; event: CanonicalEvent; claimedAt: string; }
type OutboxRecord = EventRecord | ResultRecord | ClaimRecord;

export type DurableClaimResult<T> =
  | { state: "executed"; value: T }
  | { state: "recorded"; result: SyncResult }
  | { state: "pending"; eventRecorded: boolean };

const resultKeys = ["state", "correlationId", "evidenceRefs", "errorCode"] as const;
const eventRecordKeys = ["recordType", "event"] as const;
const resultRecordKeys = ["recordType", "idempotencyKey", "result"] as const;
const claimRecordKeys = ["recordType", "idempotencyKey", "event", "claimedAt"] as const;
const terminalStates = new Set<SyncState>(["applied", "not_applied"]);

export function validateSyncResult(result: unknown): SyncResult {
  assertExactRecord(result, resultKeys, "Sync result");
  const candidate = result as Record<string, unknown>;
  if (!isSyncState(candidate.state)) {
    throw new Error("Sync result state must be an allowed value.");
  }
  if (!isNonEmptyString(candidate.correlationId)) {
    throw new Error("Sync result correlationId must be a non-empty string.");
  }
  if (!Array.isArray(candidate.evidenceRefs) || candidate.evidenceRefs.length === 0 || !candidate.evidenceRefs.every(isNonEmptyString)) {
    throw new Error("Sync result evidenceRefs must contain only non-empty references.");
  }
  if (candidate.errorCode !== null && !isNonEmptyString(candidate.errorCode)) {
    throw new Error("Sync result errorCode must be a non-empty string or null.");
  }
  return result as unknown as SyncResult;
}

export class OutboxStore {
  private static readonly operationTails = new Map<string, Promise<void>>();
  private readonly filePath: string;

  public constructor(dataDirectory: string) { this.filePath = join(dataDirectory, "outbox.jsonl"); }

  public async append(event: CanonicalEvent): Promise<void> {
    validateCanonicalEvent(event);
    await this.withSerializedOperation(async () => {
      const records = await this.readRecords();
      const existing = records.find((record): record is EventRecord => record.recordType === "event" && record.event.idempotencyKey === event.idempotencyKey);
      if (existing === undefined) {
        await this.appendRecord({ recordType: "event", event });
        return;
      }
      if (!sameStableEvent(existing.event, event)) {
        throw new Error("Conflicting canonical event already exists for this idempotency key.");
      }
    });
  }

  public async readPending(): Promise<CanonicalEvent[]> {
    const records = await this.readRecords();
    const resolvedKeys = new Set(records.filter((record): record is ResultRecord => record.recordType === "result" && terminalStates.has(record.result.state)).map((record) => record.idempotencyKey));
    const pendingByKey = new Map<string, CanonicalEvent>();
    for (const record of records) {
      if (record.recordType === "event" && !resolvedKeys.has(record.event.idempotencyKey)) {
        if (!pendingByKey.has(record.event.idempotencyKey)) pendingByKey.set(record.event.idempotencyKey, record.event);
      }
    }
    return [...pendingByKey.values()];
  }

  public async readLatestResult(idempotencyKey: string): Promise<SyncResult | null> {
    if (!isNonEmptyString(idempotencyKey)) throw new Error("idempotencyKey must be a non-empty string.");
    const records = await this.readRecords();
    const result = [...records].reverse().find((record): record is ResultRecord => record.recordType === "result" && record.idempotencyKey === idempotencyKey);
    return result?.result ?? null;
  }

  public async withDurableClaim<T>(event: CanonicalEvent, operation: () => Promise<T>): Promise<DurableClaimResult<T>> {
    validateCanonicalEvent(event);
    const existingResult = await this.readLatestResult(event.idempotencyKey);
    if (existingResult !== null) return { state: "recorded", result: existingResult };
    const claimPath = this.claimPath(event.idempotencyKey);
    const stagingPath = this.stagingClaimPath(claimPath);
    await mkdir(dirname(claimPath), { recursive: true });
    if (await pathExists(claimPath)) return this.waitForClaimResult(event.idempotencyKey, claimPath);
    try {
      await mkdir(stagingPath);
    } catch (error) {
      if (!isExistingPathError(error)) throw error;
      return this.waitForClaimPublication(event.idempotencyKey, claimPath, stagingPath);
    }

    let resolved = false;
    let published = false;
    try {
      const resultAfterStaging = await this.readLatestResult(event.idempotencyKey);
      if (resultAfterStaging !== null) {
        resolved = true;
        return { state: "recorded", result: resultAfterStaging };
      }
      await writeFile(join(stagingPath, "claim.json"), JSON.stringify({ idempotencyKey: event.idempotencyKey, correlationId: event.correlationId }), "utf8");
      await this.appendClaimedEvent(event);
      try {
        await rename(stagingPath, claimPath);
        published = true;
      } catch (error) {
        if (!isExistingPathError(error) && !(isPermissionError(error) && await pathExists(claimPath))) throw error;
        resolved = true;
        return this.waitForClaimResult(event.idempotencyKey, claimPath);
      }
      const value = await operation();
      resolved = true;
      return { state: "executed", value };
    } finally {
      if (resolved) await rm(published ? claimPath : stagingPath, { recursive: true, force: true });
    }
  }

  public async markApplied(idempotencyKey: string, result: SyncResult): Promise<void> {
    if (!isNonEmptyString(idempotencyKey)) {
      throw new Error("idempotencyKey must be a non-empty string.");
    }
    validateSyncResult(result);
    await this.withSerializedOperation(async () => {
      const records = await this.readRecords();
      const event = records.find((record): record is EventRecord => record.recordType === "event" && record.event.idempotencyKey === idempotencyKey);
      if (event === undefined) throw new Error("Cannot record a sync result for an unknown idempotency key.");
      if (event.event.correlationId !== result.correlationId) throw new Error("Sync result correlationId does not match the canonical event.");
      const previous = records.filter((record): record is ResultRecord => record.recordType === "result" && record.idempotencyKey === idempotencyKey);
      if (previous.some((record) => sameResult(record.result, result))) return;
      if (previous.some((record) => terminalStates.has(record.result.state))) throw new Error("Conflicting terminal sync resolution for this idempotency key.");
      await this.appendRecord({ recordType: "result", idempotencyKey, result });
    });
  }

  private async withSerializedOperation(operation: () => Promise<void>): Promise<void> {
    const previous = OutboxStore.operationTails.get(this.filePath) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => { release = resolve; });
    OutboxStore.operationTails.set(this.filePath, current);
    await previous;
    try { await operation(); } finally {
      release();
      if (OutboxStore.operationTails.get(this.filePath) === current) OutboxStore.operationTails.delete(this.filePath);
    }
  }

  private async readRecords(): Promise<OutboxRecord[]> {
    try {
      const records = (await readFile(this.filePath, "utf8")).split("\n").filter((line) => line.length > 0).map(parseRecord);
      assertRecordHistory(records);
      return records;
    } catch (error: unknown) {
      if (isMissingFileError(error)) return [];
      throw error;
    }
  }

  private async appendRecord(record: OutboxRecord): Promise<void> {
    validateOutboxRecord(record);
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  private async appendClaimedEvent(event: CanonicalEvent): Promise<void> {
    await this.withSerializedOperation(async () => {
      const records = await this.readRecords();
      const existing = records.find((record): record is EventRecord => record.recordType === "event" && record.event.idempotencyKey === event.idempotencyKey);
      if (existing !== undefined && !sameStableEvent(existing.event, event)) throw new Error("Conflicting canonical event already exists for this idempotency key.");
      if (existing === undefined) await this.appendRecord({ recordType: "event", event });
      await this.appendRecord({ recordType: "claim", idempotencyKey: event.idempotencyKey, event, claimedAt: new Date().toISOString() });
    });
  }

  private async waitForClaimResult(idempotencyKey: string, claimPath: string): Promise<DurableClaimResult<never>> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await this.readLatestResult(idempotencyKey);
      if (result !== null) return { state: "recorded", result };
      if (!(await pathExists(claimPath))) return { state: "pending", eventRecorded: true };
      await waitForClaimPoll();
    }
    const result = await this.readLatestResult(idempotencyKey);
    return result === null ? { state: "pending", eventRecorded: true } : { state: "recorded", result };
  }

  private async waitForClaimPublication(idempotencyKey: string, claimPath: string, stagingPath: string): Promise<DurableClaimResult<never>> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await this.readLatestResult(idempotencyKey);
      if (result !== null) return { state: "recorded", result };
      if (await pathExists(claimPath)) return this.waitForClaimResult(idempotencyKey, claimPath);
      if (!(await pathExists(stagingPath))) return { state: "pending", eventRecorded: false };
      await waitForClaimPoll();
    }
    const result = await this.readLatestResult(idempotencyKey);
    return result === null ? { state: "pending", eventRecorded: false } : { state: "recorded", result };
  }

  private claimPath(idempotencyKey: string): string {
    const digest = createHash("sha256").update(idempotencyKey).digest("hex");
    return join(dirname(this.filePath), ".outbox-claims", digest);
  }

  private stagingClaimPath(claimPath: string): string {
    return join(dirname(claimPath), `.${basename(claimPath)}.initializing`);
  }
}

function parseRecord(line: string, index: number): OutboxRecord {
  try { const record = JSON.parse(line) as unknown; return validateOutboxRecord(record); }
  catch { throw new Error(`Malformed outbox record at line ${index + 1}.`); }
}

function validateOutboxRecord(record: unknown): OutboxRecord {
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new Error("Invalid outbox record.");
  const candidate = record as Record<string, unknown>;
  if (candidate.recordType === "event") {
    assertExactRecord(candidate, eventRecordKeys, "Event record");
    return { recordType: "event", event: validateCanonicalEvent(candidate.event) };
  }
  if (candidate.recordType === "result") {
    assertExactRecord(candidate, resultRecordKeys, "Result record");
    if (!isNonEmptyString(candidate.idempotencyKey)) throw new Error("Result record idempotencyKey must be a non-empty string.");
    return { recordType: "result", idempotencyKey: candidate.idempotencyKey, result: validateSyncResult(candidate.result) };
  }
  if (candidate.recordType === "claim") {
    assertExactRecord(candidate, claimRecordKeys, "Claim record");
    if (!isNonEmptyString(candidate.idempotencyKey) || !isNonEmptyString(candidate.claimedAt) || Number.isNaN(Date.parse(candidate.claimedAt))) throw new Error("Invalid claim record.");
    const event = validateCanonicalEvent(candidate.event);
    if (event.idempotencyKey !== candidate.idempotencyKey) throw new Error("Claim record idempotencyKey does not match its event.");
    return { recordType: "claim", idempotencyKey: candidate.idempotencyKey, event, claimedAt: candidate.claimedAt };
  }
  throw new Error("Invalid outbox record type.");
}

function assertRecordHistory(records: OutboxRecord[]): void {
  const events = new Map<string, CanonicalEvent>();
  const results = new Map<string, SyncResult[]>();
  for (const record of records) {
    if (record.recordType === "event") {
      const existing = events.get(record.event.idempotencyKey);
      if (existing !== undefined && !sameStableEvent(existing, record.event)) throw new Error("Conflicting canonical event record.");
      events.set(record.event.idempotencyKey, existing ?? record.event);
      continue;
    }
    if (record.recordType === "claim") {
      const event = events.get(record.idempotencyKey);
      if (event === undefined || !sameStableEvent(event, record.event)) throw new Error("Conflicting claim event identity in outbox record.");
      continue;
    }
    const event = events.get(record.idempotencyKey);
    if (event === undefined || event.correlationId !== record.result.correlationId) throw new Error("Conflicting result identity in outbox record.");
    const prior = results.get(record.idempotencyKey) ?? [];
    if (!prior.some((value) => sameResult(value, record.result)) && prior.some((value) => terminalStates.has(value.state))) throw new Error("Conflicting terminal sync resolution in outbox record.");
    results.set(record.idempotencyKey, [...prior, record.result]);
  }
}

function sameStableEvent(left: CanonicalEvent, right: CanonicalEvent): boolean {
  const { timestamp: _leftTimestamp, ...leftStable } = left;
  const { timestamp: _rightTimestamp, ...rightStable } = right;
  return stableSerialize(leftStable) === stableSerialize(rightStable);
}
function sameResult(left: SyncResult, right: SyncResult): boolean { return stableSerialize(left) === stableSerialize(right); }
function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function assertExactRecord(value: unknown, keys: readonly string[], name: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(`${name} must contain exactly the approved fields.`);
}
function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isSyncState(value: unknown): value is SyncState { return value === "planned" || value === "applied" || value === "not_applied" || value === "stopped" || value === "unknown"; }
function isMissingFileError(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT"; }
function isExistingPathError(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST"; }
function isPermissionError(error: unknown): error is NodeJS.ErrnoException { return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "EPERM"; }
async function pathExists(path: string): Promise<boolean> { try { await stat(path); return true; } catch (error) { if (isMissingFileError(error)) return false; throw error; } }
async function waitForClaimPoll(): Promise<void> { await new Promise<void>((resolve) => { setTimeout(resolve, 20); }); }

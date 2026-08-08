import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";

import { canonicalExecutionJson, executionDigest } from "../src/execution/identity.js";
import { readLegacyExecutionRun } from "../src/execution/legacy-storage.js";
import { importLegacyExecutionRun } from "../src/execution/persistence/legacy-import.js";
import { loadTransactionalExecutionRun } from "../src/execution/persistence/store.js";
import type { ExecutionStoreSession } from "../src/execution/persistence/session.js";
import {
  createCompletedLegacyExecutionRun,
  createMinimalLegacyExecutionRun,
} from "./helpers/legacy-execution-fixture.js";
import { referenceEnvelopeInput, referenceGraphDraft } from "./helpers/execution-fixtures.js";
import { createTransactionalExecutionStoreFixture } from "./helpers/transactional-execution-store.js";
import { withSqliteTestDatabase } from "./helpers/sqlite-test-harness.js";

test("a complete immutable legacy run imports once with source and destination receipts", async (context) => {
  const fixture = await createTransactionalExecutionStoreFixture();
  context.after(fixture.cleanup);
  const legacyRoot = await mkdtemp(join(tmpdir(), "execution-legacy-valid-"));
  context.after(() => rm(legacyRoot, { recursive: true, force: true }));
  const legacy = await createCompletedLegacyExecutionRun(legacyRoot, referenceEnvelopeInput, referenceGraphDraft);
  const source = await readLegacyExecutionRun(legacy.runDirectory);
  const before = await snapshotTree(legacy.runDirectory);

  const receipt = await importLegacyExecutionRun(fixture.session, {
    runDirectory: legacy.runDirectory,
    expectedSourceIdentitySha256: source.sourceIdentitySha256,
    controllerId: "legacy-import-controller-001",
    observedAt: "2026-08-08T18:20:00.000Z",
  });
  assert.equal(receipt.disposition, "IMPORTED");
  assert.equal(receipt.sourceRunId, source.envelope.runId);
  assert.equal(receipt.importedEventCount, source.events.length);
  assert.equal(receipt.importedArtifactCount, source.artifacts.length);
  assert.deepEqual(await snapshotTree(legacy.runDirectory), before);

  const imported = loadTransactionalExecutionRun(fixture.session, source.envelope.runId);
  assert.equal(imported.checkpoint.lastEventHash, source.checkpoint.lastEventHash);
  assert.deepEqual(sortedArtifacts(imported.artifacts), sortedArtifacts(source.artifacts));
  assert.deepEqual(imported.finalHandoff, source.finalHandoff);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(database.prepare("SELECT count(*) FROM import_receipts").pluck().get(), 1);
    assert.equal(database.prepare("SELECT count(*) FROM runs").pluck().get(), 1);
  });

  await assert.rejects(
    () => importLegacyExecutionRun(fixture.session, {
      runDirectory: legacy.runDirectory,
      expectedSourceIdentitySha256: source.sourceIdentitySha256,
      controllerId: "legacy-import-controller-001",
      observedAt: "2026-08-08T18:20:01.000Z",
    }),
    /LEGACY_IMPORT_INVALID/u,
  );
  assert.deepEqual(await snapshotTree(legacy.runDirectory), before);
  withSqliteTestDatabase(fixture.session.databasePath, (database) => {
    assert.equal(database.prepare("SELECT count(*) FROM import_receipts").pluck().get(), 1);
    assert.equal(database.prepare("SELECT count(*) FROM runs").pluck().get(), 1);
  });
});

test("legacy import rejects malformed, divergent, untracked, escaping, symlinked, and corrupt sources without changing them", async (context) => {
  const cases: readonly { name: string; mutate: (runDirectory: string) => Promise<void> }[] = [
    { name: "malformed-json", mutate: async (run) => writeFile(join(run, "envelope.json"), "{\n") },
    { name: "invalid-event-chain", mutate: async (run) => mutateEvents(run, (events) => { events[1] = { ...events[1], previousEventHash: "0".repeat(64) }; }) },
    { name: "projection-mismatch", mutate: async (run) => mutateJson(join(run, "checkpoint.json"), (value) => ({ ...value, graphHash: "0".repeat(64) })) },
    { name: "artifact-mismatch", mutate: async (run) => { const artifact = await firstArtifactPath(run); await writeFile(artifact, `${await readFile(artifact, "utf8")}x`); } },
    { name: "untracked-file", mutate: async (run) => writeFile(join(run, "untracked.json"), "{}\n", { flag: "wx" }) },
    { name: "path-escape", mutate: async (run) => mutateJson(join(run, "artifacts", "manifest.json"), () => ({ manifestVersion: "1.0", artifacts: [{ artifactId: "../escape", nodeId: null, sha256: "0".repeat(64) }] })) },
    { name: "symlink", mutate: async (run) => replaceEnvelopeWithSymlink(run) },
  ];
  for (const invalidCase of cases) {
    await context.test(invalidCase.name, async (subcontext) => {
      const fixture = await createTransactionalExecutionStoreFixture();
      subcontext.after(fixture.cleanup);
      const legacyRoot = await mkdtemp(join(tmpdir(), `execution-legacy-${invalidCase.name}-`));
      subcontext.after(() => rm(legacyRoot, { recursive: true, force: true }));
      const legacy = await createCompletedLegacyExecutionRun(legacyRoot, referenceEnvelopeInput, referenceGraphDraft);
      await invalidCase.mutate(legacy.runDirectory);
      const before = await snapshotTree(legacy.runDirectory);
      await assert.rejects(
        () => importLegacyExecutionRun(fixture.session, {
          runDirectory: legacy.runDirectory,
          expectedSourceIdentitySha256: "0".repeat(64),
          controllerId: "legacy-import-controller-001",
          observedAt: "2026-08-08T18:21:00.000Z",
        }),
        /LEGACY_IMPORT_INVALID/u,
      );
      assert.deepEqual(await snapshotTree(legacy.runDirectory), before);
      assertEmptyDestination(fixture.session);
    });
  }
});

test("legacy import rejects identity, content, quota, and injected transaction failures atomically", async (context) => {
  const cases: readonly {
    name: string;
    prepare: (runDirectory: string, session: ExecutionStoreSession) => Promise<{ expectedIdentity: string; session: ExecutionStoreSession }>;
    inject?: (databasePath: string) => void;
  }[] = [
    { name: "source-identity", prepare: async (run, session) => ({ expectedIdentity: "0".repeat(64), session }) },
    { name: "forbidden-content", prepare: async (run, session) => { await injectForbiddenEnvelope(run); return { expectedIdentity: "0".repeat(64), session }; } },
    { name: "quota", prepare: async (run, session) => { const source = await readLegacyExecutionRun(run); return { expectedIdentity: source.sourceIdentitySha256, session: { ...session, storagePolicy: { ...session.storagePolicy, limits: { ...session.storagePolicy.limits, maxEventsPerRun: 1 } } } }; } },
    { name: "transaction", prepare: async (run, session) => { const source = await readLegacyExecutionRun(run); return { expectedIdentity: source.sourceIdentitySha256, session }; }, inject: installImportAbort },
  ];
  for (const failureCase of cases) {
    await context.test(failureCase.name, async (subcontext) => {
      const fixture = await createTransactionalExecutionStoreFixture();
      subcontext.after(fixture.cleanup);
      const legacyRoot = await mkdtemp(join(tmpdir(), `execution-legacy-${failureCase.name}-`));
      subcontext.after(() => rm(legacyRoot, { recursive: true, force: true }));
      const created = await createMinimalLegacyRun(legacyRoot);
      const prepared = await failureCase.prepare(created.runDirectory, fixture.session);
      failureCase.inject?.(fixture.session.databasePath);
      const before = await snapshotTree(created.runDirectory);
      await assert.rejects(
        () => importLegacyExecutionRun(prepared.session, {
          runDirectory: created.runDirectory,
          expectedSourceIdentitySha256: prepared.expectedIdentity,
          controllerId: "legacy-import-controller-001",
          observedAt: "2026-08-08T18:22:00.000Z",
        }),
        /LEGACY_IMPORT_INVALID|EXECUTION_CONTENT_FORBIDDEN/u,
      );
      assert.deepEqual(await snapshotTree(created.runDirectory), before);
      assertEmptyDestination(fixture.session);
    });
  }
});

async function createMinimalLegacyRun(root: string) {
  return createMinimalLegacyExecutionRun(root, referenceEnvelopeInput, referenceGraphDraft);
}

async function mutateJson(path: string, mutation: (value: Record<string, unknown>) => unknown): Promise<void> {
  const value = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  await writeFile(path, `${canonicalExecutionJson(mutation(value))}\n`);
}

async function mutateEvents(runDirectory: string, mutation: (events: Record<string, unknown>[]) => void): Promise<void> {
  const path = join(runDirectory, "events.jsonl");
  const events = (await readFile(path, "utf8")).trimEnd().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
  mutation(events);
  await writeFile(path, `${events.map(canonicalExecutionJson).join("\n")}\n`);
}

async function firstArtifactPath(runDirectory: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(runDirectory, "artifacts", "manifest.json"), "utf8")) as { artifacts: { artifactId: string }[] };
  const artifactId = manifest.artifacts[0]?.artifactId;
  if (artifactId === undefined) throw new Error("completed legacy fixture must contain artifacts");
  return join(runDirectory, "artifacts", artifactId === "final-handoff-json" ? "final-handoff.json" : artifactId === "final-handoff-markdown" ? "final-handoff.md" : `${artifactId}.json`);
}

async function replaceEnvelopeWithSymlink(runDirectory: string): Promise<void> {
  const envelopePath = join(runDirectory, "envelope.json");
  const target = join(runDirectory, "envelope-target.json");
  await writeFile(target, await readFile(envelopePath));
  await rm(envelopePath);
  await symlink(target, envelopePath, "file");
}

async function injectForbiddenEnvelope(runDirectory: string): Promise<void> {
  const path = join(runDirectory, "envelope.json");
  const envelope = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  const body: Record<string, unknown> = { ...envelope, goal: "token: synthetic-forbidden-marker" };
  delete body.envelopeHash;
  await writeFile(path, `${canonicalExecutionJson({ ...body, envelopeHash: executionDigest(body) })}\n`);
}

function installImportAbort(databasePath: string): void {
  withSqliteTestDatabase(databasePath, (database) => {
    database.exec("CREATE TRIGGER fail_import_receipt BEFORE INSERT ON import_receipts BEGIN SELECT RAISE(ABORT, 'synthetic import abort'); END");
  });
}

function assertEmptyDestination(session: ExecutionStoreSession): void {
  withSqliteTestDatabase(session.databasePath, (database) => {
    assert.equal(database.prepare("SELECT count(*) FROM runs").pluck().get(), 0);
    assert.equal(database.prepare("SELECT count(*) FROM import_receipts").pluck().get(), 0);
  });
}

function sortedArtifacts(artifacts: readonly { artifactId: string; nodeId: string | null; sha256: string }[]) {
  return [...artifacts].sort((left, right) => left.artifactId.localeCompare(right.artifactId));
}

async function snapshotTree(root: string): Promise<readonly string[]> {
  const entries: string[] = [];
  async function visit(path: string): Promise<void> {
    const details = await lstat(path);
    const name = relative(root, path).replaceAll("\\", "/") || ".";
    if (details.isSymbolicLink()) {
      entries.push(`${name}|link|${await readlink(path)}`);
      return;
    }
    if (details.isDirectory()) {
      entries.push(`${name}|directory`);
      for (const child of (await readdir(path)).sort()) await visit(join(path, child));
      return;
    }
    const body = await readFile(path);
    entries.push(`${name}|file|${body.byteLength}|${createHash("sha256").update(body).digest("hex")}`);
  }
  await visit(root);
  return entries;
}

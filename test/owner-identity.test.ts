import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { test } from "node:test";

import { resolveUserLocalPath } from "../src/owner-identity/path.js";
import { createFileOwnerIdentityStorage } from "../src/owner-identity/storage.js";
import { ensureOwnerIdentity, reconfigureOwner, toAttributionActor, withOwnerIdentityActor } from "../src/owner-identity/state.js";
import { validateOwnerAlias } from "../src/owner-identity/validation.js";

test("owner identity path: resolves the exact Windows LOCALAPPDATA target and marks unsupported hosts unavailable", () => {
  const windows = resolveUserLocalPath({
    platform: "win32",
    env: { LOCALAPPDATA: "C:\\Users\\Synthetic\\AppData\\Local" },
  });
  const unsupported = resolveUserLocalPath({
    platform: "linux",
    env: { LOCALAPPDATA: "/tmp/synthetic-localappdata" },
  });
  const missing = resolveUserLocalPath({
    platform: "win32",
    env: {},
  });

  assert.deepEqual(windows, {
    status: "AVAILABLE",
    path: win32.join("C:\\Users\\Synthetic\\AppData\\Local", "AI Booster Kit", "owner-identity.json"),
  });
  assert.equal(unsupported.status, "UNAVAILABLE");
  assert.equal(missing.status, "UNAVAILABLE");
});

test("owner identity validation: trims valid Unicode aliases and rejects unsafe values without echo", () => {
  const valid = validateOwnerAlias("  Árvíztűrő Tükörfúrógép  ");
  const secondValid = validateOwnerAlias("Jane_Doe-β");
  const rejected = [
    "Alias empty",
    "dev@example.com",
    "192.168.10.44",
    "../secrets",
    "C:\\Users\\owner",
    "ghp_example_token_value",
    "line\nbreak",
    "tab\tvalue",
  ].map((value) => ({ value, result: validateOwnerAlias(value) }));

  assert.deepEqual(valid, { status: "VALID", ownerAlias: "Árvíztűrő Tükörfúrógép" });
  assert.deepEqual(secondValid, { status: "VALID", ownerAlias: "Jane_Doe-β" });
  for (const candidate of rejected) {
    assert.equal(candidate.result.status, "INVALID");
    assert.equal(JSON.stringify(candidate.result).includes(candidate.value), false);
  }
});

test("owner identity bootstrap: prompts once on a missing profile, saves valid input, and reuses the next start without prompting", async () => {
  await withTemporaryDirectory(async (root) => {
    const storage = createFileOwnerIdentityStorage(join(root, "AI Booster Kit", "owner-identity.json"));
    let prompts = 0;

    const first = await ensureOwnerIdentity(storage, async () => {
      prompts += 1;
      return "Árvíztűrő Tükörfúrógép";
    });

    assert.equal(first.status, "SET");
    assert.equal(first.actor, "Árvíztűrő Tükörfúrógép");
    assert.equal(first.prompted, true);
    assert.equal(prompts, 1);
    assert.deepEqual(await storage.read(), {
      status: "SET",
      profile: { version: 1, ownerAlias: "Árvíztűrő Tükörfúrógép" },
    });

    const second = await ensureOwnerIdentity(storage, async () => {
      throw new Error("prompt should not run when a valid profile already exists");
    });

    assert.equal(second.status, "SET");
    assert.equal(second.actor, "Árvíztűrő Tükörfúrógép");
    assert.equal(second.prompted, false);
  });
});

test("owner identity bootstrap: cancel or empty input returns EMPTY, uses Alias empty, and does not persist an empty profile", async () => {
  await withTemporaryDirectory(async (root) => {
    const cancelledStorage = createFileOwnerIdentityStorage(join(root, "cancelled", "AI Booster Kit", "owner-identity.json"));
    const emptyStorage = createFileOwnerIdentityStorage(join(root, "empty", "AI Booster Kit", "owner-identity.json"));

    const cancelled = await ensureOwnerIdentity(cancelledStorage, async () => null);
    const empty = await ensureOwnerIdentity(emptyStorage, async () => "   ");

    assert.equal(cancelled.status, "EMPTY");
    assert.equal(cancelled.actor, "Alias empty");
    assert.equal(cancelled.prompted, true);
    assert.equal(empty.status, "EMPTY");
    assert.equal(empty.actor, "Alias empty");
    assert.equal(empty.prompted, true);
    assert.deepEqual(await cancelledStorage.read(), { status: "MISSING" });
    assert.deepEqual(await emptyStorage.read(), { status: "MISSING" });
  });
});

test("owner identity storage: malformed and unknown-version files are preserved, reported invalid, and re-prompted", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = join(root, "AI Booster Kit", "owner-identity.json");
    const storage = createFileOwnerIdentityStorage(target);
    await mkdir(join(root, "AI Booster Kit"), { recursive: true });
    await writeFile(target, "{\"version\":1", "utf8");

    assert.deepEqual(await storage.read(), { status: "INVALID", reason: "OWNER_IDENTITY_JSON_INVALID" });
    const malformed = await ensureOwnerIdentity(storage, async () => "   ");
    assert.equal(malformed.status, "EMPTY");
    assert.equal(await readFile(target, "utf8"), "{\"version\":1");

    await writeFile(target, `${JSON.stringify({ version: 2, ownerAlias: "Legacy Alias" })}\n`, "utf8");
    assert.deepEqual(await storage.read(), { status: "INVALID", reason: "OWNER_IDENTITY_VERSION_UNSUPPORTED" });

    const rewritten = await ensureOwnerIdentity(storage, async () => "Új Tulajdonos");
    assert.equal(rewritten.status, "SET");
    assert.equal(rewritten.actor, "Új Tulajdonos");
    assert.deepEqual(await storage.read(), {
      status: "SET",
      profile: { version: 1, ownerAlias: "Új Tulajdonos" },
    });
  });
});

test("owner identity storage: same concurrent valid save reuses and different concurrent save conflicts", async () => {
  await withTemporaryDirectory(async (root) => {
    const sameStorage = createFileOwnerIdentityStorage(join(root, "same", "AI Booster Kit", "owner-identity.json"));
    const [sameLeft, sameRight] = await Promise.all([
      sameStorage.save("Reuse Alias"),
      sameStorage.save("Reuse Alias"),
    ]);

    assert.deepEqual([sameLeft.status, sameRight.status], ["SET", "SET"]);
    assert.equal([sameLeft.persistencePerformed, sameRight.persistencePerformed].filter(Boolean).length, 1);
    assert.deepEqual(await sameStorage.read(), {
      status: "SET",
      profile: { version: 1, ownerAlias: "Reuse Alias" },
    });

    const conflictStorage = createFileOwnerIdentityStorage(join(root, "conflict", "AI Booster Kit", "owner-identity.json"));
    const [first, second] = await Promise.all([
      conflictStorage.save("Alpha Alias"),
      conflictStorage.save("Beta Alias"),
    ]);
    const persisted = JSON.parse(await readFile(join(root, "conflict", "AI Booster Kit", "owner-identity.json"), "utf8")) as { version: number; ownerAlias: string };
    const expectedAlias = first.status === "SET" ? "Alpha Alias" : "Beta Alias";
    const rejectedAlias = first.status === "CONFLICT" ? "Alpha Alias" : "Beta Alias";

    assert.equal([first.status, second.status].filter((status) => status === "SET").length, 1);
    assert.equal([first.status, second.status].filter((status) => status === "CONFLICT").length, 1);
    assert.deepEqual(persisted, { version: 1, ownerAlias: expectedAlias });
    assert.notEqual(persisted.ownerAlias, rejectedAlias);
  });
});

test("owner identity reconfigure: changes only future state and failed reconfigure preserves the previous profile", async () => {
  await withTemporaryDirectory(async (root) => {
    const storage = createFileOwnerIdentityStorage(join(root, "AI Booster Kit", "owner-identity.json"));

    await ensureOwnerIdentity(storage, async () => "Initial Alias");
    const changed = await reconfigureOwner(storage, async () => "Updated Alias");

    assert.equal(changed.status, "SET");
    assert.equal(changed.actor, "Updated Alias");
    assert.deepEqual(await storage.read(), {
      status: "SET",
      profile: { version: 1, ownerAlias: "Updated Alias" },
    });

    const failed = await reconfigureOwner(storage, async () => "owner@example.com");

    assert.equal(failed.status, "INVALID");
    assert.equal(failed.actor, "Updated Alias");
    assert.deepEqual(await storage.read(), {
      status: "SET",
      profile: { version: 1, ownerAlias: "Updated Alias" },
    });
    assert.equal((await ensureOwnerIdentity(storage, async () => "Should Not Prompt")).prompted, false);
  });
});

test("owner identity availability: directory, symlink, and unavailable targets remain UNAVAILABLE with no fallback write", async () => {
  await withTemporaryDirectory(async (root) => {
    const directoryTarget = join(root, "directory-target");
    await mkdir(directoryTarget);
    const linkType = process.platform === "win32" ? "junction" : "dir";
    const symlinkTarget = join(root, "symlink-target");
    await symlink(directoryTarget, symlinkTarget, linkType);

    const directoryStorage = createFileOwnerIdentityStorage(directoryTarget);
    const symlinkStorage = createFileOwnerIdentityStorage(symlinkTarget);

    const directoryState = await ensureOwnerIdentity(directoryStorage, async () => {
      throw new Error("directory target should not prompt");
    });
    const symlinkState = await ensureOwnerIdentity(symlinkStorage, async () => {
      throw new Error("symlink target should not prompt");
    });
    const unavailable = resolveUserLocalPath({ platform: "darwin", env: {} });

    assert.equal(directoryState.status, "UNAVAILABLE");
    assert.equal(directoryState.actor, "Alias empty");
    assert.equal(symlinkState.status, "UNAVAILABLE");
    assert.equal(symlinkState.actor, "Alias empty");
    assert.equal(unavailable.status, "UNAVAILABLE");
    assert.deepEqual((await readdir(root)).sort(), ["directory-target", "symlink-target"]);
  });
});

test("owner identity attribution: exposes the alias snapshot or Alias empty", async () => {
  await withTemporaryDirectory(async (root) => {
    const storage = createFileOwnerIdentityStorage(join(root, "AI Booster Kit", "owner-identity.json"));
    const missing = await ensureOwnerIdentity(storage, async () => null);
    await reconfigureOwner(storage, async () => "Snapshot Alias");
    const current = await ensureOwnerIdentity(storage, async () => "Should Not Prompt");

    assert.equal(toAttributionActor(missing), "Alias empty");
    assert.equal(toAttributionActor(current), "Snapshot Alias");
  });
});

test("owner identity attribution helper: returns an actor snapshot and does not silently mutate the original input", async () => {
  await withTemporaryDirectory(async (root) => {
    const storage = createFileOwnerIdentityStorage(join(root, "AI Booster Kit", "owner-identity.json"));
    const emptyState = await ensureOwnerIdentity(storage, async () => null);
    await reconfigureOwner(storage, async () => "Snapshot Alias");
    const setState = await ensureOwnerIdentity(storage, async () => "Should Not Prompt");
    const original = {
      actor: "Original Actor",
      eventType: "implementation_started",
      metadata: { stable: true },
    };

    const emptyResult = withOwnerIdentityActor(original, emptyState);
    const setResult = withOwnerIdentityActor(original, setState);

    assert.deepEqual(emptyResult, {
      actor: "Alias empty",
      eventType: "implementation_started",
      metadata: { stable: true },
    });
    assert.deepEqual(setResult, {
      actor: "Snapshot Alias",
      eventType: "implementation_started",
      metadata: { stable: true },
    });
    assert.deepEqual(original, {
      actor: "Original Actor",
      eventType: "implementation_started",
      metadata: { stable: true },
    });
  });
});

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "owner-identity-red-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

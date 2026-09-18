import { test } from "node:test";
import assert from "node:assert/strict";
import { BlobStore, type BlobClient } from "../src/blobStore.js";
import type { GameState } from "../src/schemas.js";

function fakeClient(): BlobClient & { blobs: Map<string, string>; bytes: Map<string, Buffer> } {
  const blobs = new Map<string, string>();
  const bytes = new Map<string, Buffer>();
  return {
    blobs, bytes,
    async put(pathname, body) { blobs.set(pathname, body); },
    async get(pathname) { return blobs.get(pathname) ?? null; },
    async putBytes(pathname, body) { bytes.set(pathname, body); },
    async getBytes(pathname) { return bytes.get(pathname) ?? null; },
    async list(prefix) { return [...blobs.keys()].filter((k) => k.startsWith(prefix)); },
    async del(pathname) { blobs.delete(pathname); bytes.delete(pathname); },
  };
}

const game = (id: string, updatedAt: string) => ({ id, updatedAt, character: { name: id } }) as unknown as GameState;

test("BlobStore round-trips games as private JSON blobs under the prefix", async () => {
  const client = fakeClient();
  const store = new BlobStore(client, "games");
  await store.save(game("abc-1", "2026-01-02T00:00:00Z"));
  await store.save(game("abc-2", "2026-01-03T00:00:00Z"));
  assert.deepEqual([...client.blobs.keys()].sort(), ["games/abc-1.json", "games/abc-2.json"]);
  assert.equal((await store.get("abc-1"))?.id, "abc-1");
  assert.equal(await store.get("missing"), null);
  const listed = await store.list();
  assert.deepEqual(listed.map((g) => g.id), ["abc-2", "abc-1"], "newest first");
  assert.equal(await store.delete("abc-1"), true);
  assert.equal(await store.delete("abc-1"), false);
  assert.equal(await store.get("abc-1"), null);
});

test("BlobStore keeps painted portraits beside the save and removes them with it", async () => {
  const client = fakeClient();
  const store = new BlobStore(client, "games");
  await store.save(game("abc-1", "2026-01-02T00:00:00Z"));
  await store.putImage("abc-1", Buffer.from("jpeg"));
  assert.equal((await store.getImage("abc-1"))?.toString(), "jpeg");
  assert.equal(await store.getImage("nope"), null);
  await store.delete("abc-1");
  assert.equal(client.bytes.has("portraits/abc-1.jpg"), false);
});

test("BlobStore refuses ids that could escape the prefix", async () => {
  const store = new BlobStore(fakeClient(), "games");
  assert.equal(await store.get("../secrets"), null);
  assert.equal(await store.delete("../secrets"), false);
  await assert.rejects(store.save(game("../x", "2026-01-01T00:00:00Z")));
});

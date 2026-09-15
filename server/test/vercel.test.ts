import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp, chooseStore } from "../src/bootstrap.js";
import { BlobStore } from "../src/blobStore.js";
import { FileStore, MemoryStore } from "../src/store.js";

test("chooseStore picks Blob on Vercel with a token, memory without, files locally", () => {
  assert.ok(chooseStore({ BLOB_READ_WRITE_TOKEN: "x" }) instanceof BlobStore);
  assert.ok(chooseStore({ VERCEL: "1" }) instanceof MemoryStore);
  assert.ok(chooseStore({ DATA_DIR: "/tmp/never-used" }) instanceof FileStore);
});

test("the Vercel handler serves the same routes as the local server", async () => {
  const { app } = buildApp({ DM_MOCK: "1", VERCEL: "1" });
  const { handle } = await import("hono/vercel");
  const handler = handle(app);

  const health = await handler(new Request("https://example.vercel.app/health"));
  assert.equal(health.status, 200);

  const created = await handler(new Request("https://example.vercel.app/api/games", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ background: "A goblin accountant who cooks the books for a dragon." }),
  }));
  assert.equal(created.status, 201);
  const body = await created.json() as any;
  assert.equal(body.game.status, "forged");

  const missing = await handler(new Request("https://example.vercel.app/nope"));
  assert.equal(missing.status, 404);
});

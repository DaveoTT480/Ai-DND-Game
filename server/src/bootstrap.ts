import path from "node:path";
import { createApp } from "./app.js";
import { BlobStore } from "./blobStore.js";
import { ClaudeDungeonMaster, type DungeonMaster } from "./dm.js";
import { GameEngine } from "./engine.js";
import { chooseImageProvider } from "./images.js";
import { MockDungeonMaster } from "./mockDM.js";
import { FileStore, MemoryStore, type GameStore } from "./store.js";

/**
 * Wires the Hono app from environment variables. Shared by the local Node
 * server (src/index.ts) and the Vercel function (api/index.ts).
 */
export function buildApp(env: NodeJS.ProcessEnv = process.env, defaultDataDir?: string) {
  const mock = env.DM_MOCK === "1";
  const dm: DungeonMaster = mock ? new MockDungeonMaster() : new ClaudeDungeonMaster();
  const onVercel = Boolean(env.VERCEL);
  const dailyCallLimit = env.DM_DAILY_CALL_LIMIT !== undefined ? Number(env.DM_DAILY_CALL_LIMIT) : onVercel ? 300 : 0;
  const engine = new GameEngine({ dm, store: chooseStore(env, defaultDataDir), dailyCallLimit, images: chooseImageProvider(env) });
  const app = createApp({
    engine,
    apiToken: env.GAME_API_TOKEN || null,
    // Anything reachable from the internet must have a token; local runs may skip it.
    requireToken: onVercel || env.REQUIRE_API_TOKEN === "1",
  });
  return { app, mock };
}

export function chooseStore(env: NodeJS.ProcessEnv, defaultDataDir?: string): GameStore {
  if (env.BLOB_READ_WRITE_TOKEN) return new BlobStore();
  if (env.VERCEL) {
    // No blob store attached: games survive only while this instance is warm.
    console.warn("Running on Vercel without BLOB_READ_WRITE_TOKEN. Saved adventures will not persist; attach a Blob store.");
    return new MemoryStore();
  }
  return new FileStore(env.DATA_DIR ?? defaultDataDir ?? path.join(process.cwd(), "data"));
}

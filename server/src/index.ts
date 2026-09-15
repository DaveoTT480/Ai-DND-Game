import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { ClaudeDungeonMaster } from "./dm.js";
import { GameEngine } from "./engine.js";
import { MockDungeonMaster } from "./mockDM.js";
import { FileStore } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8787);
const mock = process.env.DM_MOCK === "1";
const dataDir = process.env.DATA_DIR ?? path.join(here, "..", "data");

if (!mock && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn("No ANTHROPIC_API_KEY set. The SDK will look for an `ant auth login` profile; set DM_MOCK=1 to run without a model.");
}

const dm = mock ? new MockDungeonMaster() : new ClaudeDungeonMaster();
const engine = new GameEngine({ dm, store: new FileStore(dataDir) });
const app = createApp({ engine, apiToken: process.env.GAME_API_TOKEN || null });

// A tiny browser client for play-testing the server without Xcode.
app.use("/*", serveStatic({ root: path.relative(process.cwd(), path.join(here, "..", "public")) || "public" }));

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Old Tavern server listening on http://localhost:${info.port} (${mock ? "mock" : process.env.DM_MODEL ?? "claude-opus-5"} DM)`);
});

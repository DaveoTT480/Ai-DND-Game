import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./bootstrap.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8787);

if (process.env.DM_MOCK !== "1" && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn("No ANTHROPIC_API_KEY set. The SDK will look for an `ant auth login` profile; set DM_MOCK=1 to run without a model.");
}

const { app, mock } = buildApp(process.env, path.join(here, "..", "data"));

// A tiny browser client for play-testing the server without Xcode.
app.use("/*", serveStatic({ root: path.relative(process.cwd(), path.join(here, "..", "public")) || "public" }));

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Old Tavern server listening on http://localhost:${info.port} (${mock ? "mock" : process.env.DM_MODEL ?? "claude-opus-5"} DM)`);
});

import { Hono } from "hono";
import { cors } from "hono/cors";
import { DungeonMasterError } from "./dm.js";
import { GameEngine, GameError } from "./engine.js";
import { toSnapshot, toSummary } from "./schemas.js";

export interface AppOptions {
  engine: GameEngine;
  apiToken?: string | null;
}

export function createApp({ engine, apiToken }: AppOptions) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true }));

  const api = new Hono();

  if (apiToken) {
    api.use("*", async (c, next) => {
      const header = c.req.header("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (token !== apiToken) return c.json({ error: "Unauthorized" }, 401);
      await next();
    });
  }

  api.get("/games", async (c) => {
    const games = await engine.listGames();
    return c.json({ games: games.map(toSummary) });
  });

  api.post("/games", async (c) => {
    const body = await readJson(c.req.raw);
    const game = await engine.createGame({
      background: str(body.background) ?? "",
      tone: str(body.tone),
      name: str(body.name),
    });
    return c.json({ game: toSnapshot(game) }, 201);
  });

  api.get("/games/:id", async (c) => {
    const game = await engine.getGame(c.req.param("id"));
    return c.json({ game: toSnapshot(game) });
  });

  api.post("/games/:id/start", async (c) => {
    const body = await readJson(c.req.raw);
    const game = await engine.startGame(c.req.param("id"), {
      scenarioId: str(body.scenarioId),
      customScenario: str(body.customScenario),
    });
    return c.json({ game: toSnapshot(game), scene: game.turns.at(-1)!.scene });
  });

  api.post("/games/:id/turn", async (c) => {
    const body = await readJson(c.req.raw);
    const game = await engine.takeTurn(c.req.param("id"), {
      choiceId: str(body.choiceId),
      freeText: str(body.freeText),
    });
    return c.json({ game: toSnapshot(game), scene: game.turns.at(-1)!.scene });
  });

  api.delete("/games/:id", async (c) => {
    await engine.deleteGame(c.req.param("id"));
    return c.json({ ok: true });
  });

  app.route("/api", api);

  app.onError((err, c) => {
    if (err instanceof GameError || err instanceof DungeonMasterError) {
      return c.json({ error: err.message }, err.status as 400);
    }
    console.error(err);
    return c.json({ error: "Something went wrong in the tavern." }, 500);
  });

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  return app;
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new GameError("Request body must be JSON.");
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

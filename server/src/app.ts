import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { DungeonMasterError } from "./dm.js";
import { eraCatalogue } from "./eras.js";
import { GameEngine, GameError } from "./engine.js";
import { toSnapshot, toSummary } from "./schemas.js";

export interface AppOptions {
  engine: GameEngine;
  apiToken?: string | null;
  /**
   * When true and no apiToken is configured, every /api request is refused.
   * Set on Vercel so a forgotten token can never expose the model to the internet.
   */
  requireToken?: boolean;
}

function tokensMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp({ engine, apiToken, requireToken = false }: AppOptions) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true }));

  const api = new Hono();

  if (requireToken && !apiToken) {
    api.use("*", async (c) =>
      c.json({ error: "This server has no GAME_API_TOKEN configured, so it refuses all requests. Set one in the environment." }, 503),
    );
  } else if (apiToken) {
    api.use("*", async (c, next) => {
      const header = c.req.header("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (!tokensMatch(token, apiToken)) return c.json({ error: "Unauthorized" }, 401);
      await next();
    });
  }

  api.get("/usage", async (c) => c.json(await engine.usageToday()));

  api.get("/eras", (c) => c.json({ eras: eraCatalogue() }));

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
      eraId: str(body.eraId),
      customEra: str(body.customEra),
    });
    return c.json({ game: toSnapshot(game) }, 201);
  });

  api.get("/games/:id", async (c) => {
    const game = await engine.getGame(c.req.param("id"));
    return c.json({ game: toSnapshot(game) });
  });

  api.get("/games/:id/portrait", async (c) => {
    const bytes = await engine.portraitImage(c.req.param("id"));
    if (!bytes) return c.json({ error: "No painted portrait for this tale." }, 404);
    return new Response(new Uint8Array(bytes), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } });
  });

  api.post("/games/:id/portrait", async (c) => {
    const painted = await engine.paintPortrait(c.req.param("id"));
    if (!painted) return c.json({ error: "No painter is available. Set OPENAI_API_KEY on the server, or try again later." }, 503);
    const game = await engine.getGame(c.req.param("id"));
    return c.json({ game: toSnapshot(game) });
  });

  api.post("/games/:id/reroll", async (c) => {
    const game = await engine.rerollScenarios(c.req.param("id"));
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

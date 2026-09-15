import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { GameEngine } from "../src/engine.js";
import { MockDungeonMaster } from "../src/mockDM.js";
import { MemoryStore } from "../src/store.js";

function makeApp(apiToken: string | null = null) {
  const engine = new GameEngine({ dm: new MockDungeonMaster(), store: new MemoryStore(), roll: () => 15 });
  return createApp({ engine, apiToken });
}

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

test("full play loop over HTTP", async () => {
  const app = makeApp();

  const created = await app.request("/api/games", json({ background: "A wandering monk who cannot remember her vows.", tone: "grimdark" }));
  assert.equal(created.status, 201);
  const { game } = await created.json() as any;
  assert.equal(game.status, "forged");
  assert.equal(game.background, undefined, "raw background is not echoed to clients");
  assert.equal(game.scenarios.length, 3);

  const started = await app.request(`/api/games/${game.id}/start`, json({ scenarioId: game.scenarios[1].id }));
  assert.equal(started.status, 200);
  const startBody = await started.json() as any;
  assert.equal(startBody.game.status, "playing");
  assert.equal(startBody.scene.choices.length, 3);

  const turn = await app.request(`/api/games/${game.id}/turn`, json({ choiceId: "c" }));
  assert.equal(turn.status, 200);
  const turnBody = await turn.json() as any;
  assert.equal(turnBody.game.turns.length, 2);
  assert.ok(turnBody.scene.diceResult, "a checked choice yields a dice result");

  const free = await app.request(`/api/games/${game.id}/turn`, json({ freeText: "I whistle for my horse." }));
  assert.equal(free.status, 200);

  const list = await app.request("/api/games");
  const listBody = await list.json() as any;
  assert.equal(listBody.games.length, 1);
  assert.equal(listBody.games[0].turnCount, 3);

  const fetched = await app.request(`/api/games/${game.id}`);
  assert.equal(fetched.status, 200);

  const deleted = await app.request(`/api/games/${game.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.equal((await app.request(`/api/games/${game.id}`)).status, 404);
});

test("validation errors come back as 400 JSON", async () => {
  const app = makeApp();
  const res = await app.request("/api/games", json({ background: "no" }));
  assert.equal(res.status, 400);
  const body = await res.json() as any;
  assert.match(body.error, /at least a sentence/);

  const bad = await app.request("/api/games", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" });
  assert.equal(bad.status, 400);
});

test("bearer token protects the API when configured", async () => {
  const app = makeApp("secret-token");
  assert.equal((await app.request("/api/games")).status, 401);
  assert.equal((await app.request("/api/games", { headers: { authorization: "Bearer nope" } })).status, 401);
  assert.equal((await app.request("/api/games", { headers: { authorization: "Bearer secret-token" } })).status, 200);
  assert.equal((await app.request("/health")).status, 200, "health stays open");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { GameEngine, GameError, compactScene, levelForXp } from "../src/engine.js";
import { MockDungeonMaster } from "../src/mockDM.js";
import { MemoryStore } from "../src/store.js";
import type { DungeonMaster, ForgeRequest, NarrateRequest } from "../src/dm.js";

function makeEngine(rolls: number[] = [], dm: DungeonMaster = new MockDungeonMaster()) {
  const queue = [...rolls];
  return new GameEngine({ dm, store: new MemoryStore(), roll: () => queue.shift() ?? 10 });
}

test("createGame forges a character from a background and offers scenarios", async () => {
  const engine = makeEngine();
  const game = await engine.createGame({ background: "A dock rat with a silver locket and a debt.", name: "Wren" });
  assert.equal(game.status, "forged");
  assert.equal(game.character.name, "Wren");
  assert.equal(game.hp, game.character.maxHp);
  assert.equal(game.scenarios.length, 3);
  assert.equal(game.turns.length, 0);
});

test("createGame rejects empty or oversized backgrounds", async () => {
  const engine = makeEngine();
  await assert.rejects(engine.createGame({ background: "short" }), GameError);
  await assert.rejects(engine.createGame({ background: "x".repeat(5000) }), GameError);
});

test("a configured image provider paints a portrait at forge time; none means none", async () => {
  const prompts: string[] = [];
  const images = { async generate(prompt: string) { prompts.push(prompt); return Buffer.from("fake-jpeg"); } };
  const store = new MemoryStore();
  const engine = new GameEngine({ dm: new MockDungeonMaster(), store, images });
  const game = await engine.createGame({ background: "A dock rat with a silver locket and a debt.", eraId: "rome" });
  assert.equal(game.portraitImage, true);
  assert.equal((await engine.portraitImage(game.id))?.toString(), "fake-jpeg");
  assert.match(prompts[0]!, /Imperial Rome/);
  assert.match(prompts[0]!, /Oil painting/);
  assert.match(prompts[0]!, /hood/);

  const plain = new GameEngine({ dm: new MockDungeonMaster(), store: new MemoryStore() });
  const g2 = await plain.createGame({ background: "A dock rat with a silver locket and a debt." });
  assert.equal(g2.portraitImage, false);
  assert.equal(await plain.portraitImage(g2.id), null);
});

test("the forge carries a portrait and scenes carry loot", async () => {
  const engine = makeEngine();
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  assert.equal(created.character.portrait.headwear, "hood");
  const game = await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  assert.equal(game.turns[0]!.scene.loot[0]!.name, "Mattock's ledger");
});

test("startGame opens the first scene and applies its state change", async () => {
  const engine = makeEngine();
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  const game = await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  assert.equal(game.status, "playing");
  assert.equal(game.scenario?.id, "debt-of-ash");
  assert.equal(game.turns.length, 1);
  assert.equal(game.turns[0]!.action.kind, "start");
  assert.equal(game.quests.length, 1);
  assert.ok(game.inventory.some((i) => i.name === "Mattock's token"));
  assert.equal(game.npcsMet[0]?.name, "Old Mattock");
  assert.equal(game.location, "the Old Tavern, back room");
});

test("startGame accepts a custom scenario and refuses to start twice", async () => {
  const engine = makeEngine();
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  const game = await engine.startGame(created.id, { customScenario: "I wake up in a burning library with no memory." });
  assert.equal(game.scenario?.id, "custom");
  assert.match(game.scenario!.synopsis, /burning library/);
  await assert.rejects(engine.startGame(created.id, { scenarioId: "debt-of-ash" }), (e: GameError) => e.status === 409);
});

test("choosing an option with a check rolls server-side and the DM honours it", async () => {
  // Rolls: opening fate die, then the Stealth check roll.
  const engine = makeEngine([10, 12]);
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  const game = await engine.takeTurn(created.id, { choiceId: "b" });
  const turn = game.turns.at(-1)!;
  assert.equal(turn.action.kind, "choice");
  assert.equal(turn.fateRoll, 12);
  assert.ok(turn.scene.diceResult);
  // DEX 16 (+3) with Stealth proficiency (+2) = +5 -> 17 vs DC 13
  assert.equal(turn.scene.diceResult!.total, 17);
  assert.equal(turn.scene.diceResult!.success, true);
  assert.equal(game.xp, 10);
});

test("free-text actions are accepted and stale choice ids are rejected", async () => {
  const engine = makeEngine();
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  const game = await engine.takeTurn(created.id, { freeText: "I flip the table and bolt for the window." });
  assert.equal(game.turns.at(-1)!.action.kind, "freeText");
  await assert.rejects(engine.takeTurn(created.id, { choiceId: "zzz" }), GameError);
  await assert.rejects(engine.takeTurn(created.id, { freeText: "   " }), GameError);
});

test("hp is clamped and death ends the game even if the DM forgets", async () => {
  const dm = new MockDungeonMaster();
  const original = dm.narrate.bind(dm);
  dm.narrate = async (req: NarrateRequest) => {
    const scene = await original(req);
    scene.stateChange.hpDelta = -99;
    scene.ending = null;
    return scene;
  };
  const engine = makeEngine([], dm);
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  const game = await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  assert.equal(game.hp, 0);
  assert.equal(game.status, "ended");
  assert.equal(game.turns[0]!.scene.ending?.victory, false);
  assert.equal(game.turns[0]!.scene.choices.length, 0);
  await assert.rejects(engine.takeTurn(created.id, { freeText: "I get up." }), (e: GameError) => e.status === 409);
});

test("levelling up raises max hp once xp crosses the threshold", async () => {
  const dm = new MockDungeonMaster();
  const original = dm.narrate.bind(dm);
  dm.narrate = async (req: NarrateRequest) => {
    const scene = await original(req);
    scene.stateChange.xpGained = 300;
    return scene;
  };
  const engine = makeEngine([], dm);
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  const game = await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  assert.equal(game.level, 2);
  assert.equal(game.character.maxHp, 16);
  assert.equal(levelForXp(0, 1), 1);
  assert.equal(levelForXp(299, 1), 1);
  assert.equal(levelForXp(900, 1), 3);
});

test("older turns are folded into recaps so the prompt stays bounded", async () => {
  const seen: NarrateRequest[] = [];
  const dm = new MockDungeonMaster();
  const original = dm.narrate.bind(dm);
  dm.narrate = async (req: NarrateRequest) => {
    seen.push(req);
    const scene = await original(req);
    scene.ending = null;
    scene.stateChange.hpDelta = 0;
    return scene;
  };
  const engine = makeEngine([], dm);
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt." });
  await engine.startGame(created.id, { scenarioId: "debt-of-ash" });
  for (let i = 0; i < 18; i++) await engine.takeTurn(created.id, { choiceId: "a" });
  const last = seen.at(-1)!;
  // 14 verbatim turns * 2 messages + the new action = 29
  assert.equal(last.messages.length, 29);
  const finalText = last.messages.at(-1)!.content as string;
  assert.match(finalText, /Story so far/);
  assert.match(finalText, /Old Mattock called in the debt/);
  assert.equal(last.messages[0]!.role, "user");
});

test("eras: the chosen era briefs the forge and the Dungeon Master, and old saves default to fantasy", async () => {
  const seen: { forge: ForgeRequest[]; narrate: NarrateRequest[] } = { forge: [], narrate: [] };
  const dm = new MockDungeonMaster();
  const of = dm.forge.bind(dm), on = dm.narrate.bind(dm);
  dm.forge = async (r) => { seen.forge.push(r); return of(r); };
  dm.narrate = async (r) => { seen.narrate.push(r); return on(r); };
  const store = new MemoryStore();
  const engine = new GameEngine({ dm, store });
  const game = await engine.createGame({ background: "A Gaulish slave who reads his master's letters.", eraId: "rome" });
  assert.equal(game.era.name, "Imperial Rome");
  assert.equal(game.era.currency, "denarii");
  assert.equal(game.research.length, 3);
  assert.match(seen.forge[0]!.user, /Catiline/);
  assert.match(seen.forge[0]!.user, /Cicero/);
  await engine.startGame(game.id, { scenarioId: "debt-of-ash" });
  assert.match(seen.narrate[0]!.system, /Historical faithfulness/);
  assert.match(seen.narrate[0]!.system, /denarii/);
  assert.match(seen.narrate[0]!.messages[0]!.content as string, /Money: \d+ denarii/);

  const custom = await engine.createGame({ background: "A Medici bank clerk who knows too much.", eraId: "custom", customEra: "Florence in 1494" });
  assert.equal(custom.era.name, "Florence in 1494");
  assert.match(seen.forge[1]!.user, /Florence in 1494/);
  await assert.rejects(engine.createGame({ background: "Someone somewhere sometime.", eraId: "custom", customEra: "" }), GameError);

  const legacy = await engine.createGame({ background: "A plain old hero from before eras existed." });
  delete (legacy as any).era;
  delete (legacy as any).research;
  delete (legacy as any).character.portrait;
  await store.save(legacy);
  const loaded = await engine.getGame(legacy.id);
  assert.equal(loaded.era.id, "classic-fantasy");
  assert.deepEqual(loaded.research, []);
  assert.equal(loaded.character.portrait.symbol, "\u2694\uFE0F");
});

test("rerolling scenarios offers three new tales and remembers the ones passed on", async () => {
  const seen: ForgeRequest[] = [];
  const dm = new MockDungeonMaster();
  const orig = dm.reroll.bind(dm);
  dm.reroll = async (r) => { seen.push(r); return orig(r); };
  const engine = makeEngine([], dm);
  const created = await engine.createGame({ background: "A dock rat with a silver locket and a debt.", eraId: "rome" });
  const firstIds = created.scenarios.map((s) => s.id);
  const once = await engine.rerollScenarios(created.id);
  assert.equal(once.scenarios.length, 3);
  assert.ok(once.scenarios.every((s) => !firstIds.includes(s.id)));
  assert.equal(once.passedScenarios.length, 3);
  assert.match(once.passedScenarios[0]!, /Debt of Ash/);
  assert.match(seen[0]!.user, /Debt of Ash/);
  assert.match(seen[0]!.user, /Cicero/);
  const twice = await engine.rerollScenarios(created.id);
  assert.equal(twice.passedScenarios.length, 6);
  assert.match(seen[1]!.user, /Salt and Iron 1/);
  // The new tales can be started.
  const started = await engine.startGame(created.id, { scenarioId: twice.scenarios[0]!.id });
  assert.equal(started.status, "playing");
  await assert.rejects(engine.rerollScenarios(created.id), (e: GameError) => e.status === 409);
});

test("compactScene keeps narration, dice and choices", () => {
  const text = compactScene({
    chapterTitle: "T", narration: "N", diceResult: null, npcs: [],
    choices: [{ id: "a", label: "Go", hint: "", check: null }],
    stateChange: { hpDelta: 0, goldDelta: 0, xpGained: 0, itemsGained: [], itemsLost: [], questUpdates: [], location: "", statusEffects: [] },
    loot: [], recap: "r", mood: "calm", ending: null,
  });
  assert.match(text, /\[T\]/);
  assert.match(text, /a\) Go/);
});

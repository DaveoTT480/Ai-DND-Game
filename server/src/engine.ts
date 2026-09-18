import { randomUUID } from "node:crypto";
import type { DMMessage, DungeonMaster } from "./dm.js";
import { DungeonMasterError } from "./dm.js";
import { resolveCheck, rollDie, type RollFn } from "./dice.js";
import { resolveEra } from "./eras.js";
import { FORGE_SYSTEM, REROLL_SYSTEM, actionUserMessage, dmSystemPrompt, forgeUserMessage, openingUserMessage, rerollUserMessage } from "./prompts.js";
import { DEFAULT_PORTRAIT, type GameState, type Item, type PlayerAction, type Scene, type ScenarioOption, type Turn } from "./schemas.js";
import type { GameStore } from "./store.js";

export class GameError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
    this.name = "GameError";
  }
}

/** How many recent turns are replayed verbatim; older ones become one-line recaps. */
const VERBATIM_TURNS = 14;
const MAX_BACKGROUND_CHARS = 4000;
const MAX_ACTION_CHARS = 600;

export interface EngineOptions {
  dm: DungeonMaster;
  store: GameStore;
  roll?: RollFn;
  now?: () => Date;
  /** Maximum Dungeon Master calls per UTC day across all games; 0 or undefined means unlimited. */
  dailyCallLimit?: number;
}

export interface NewGameInput {
  background: string;
  tone?: string;
  name?: string;
  eraId?: string;
  customEra?: string;
}

export interface StartInput {
  scenarioId?: string;
  customScenario?: string;
}

export interface TurnInput {
  choiceId?: string;
  freeText?: string;
}

export function xpForLevel(level: number): number {
  // Gentle curve: 300, 900, 1800, 3000 ...
  return 300 * ((level - 1) * level) / 2;
}

export function levelForXp(xp: number, startingLevel: number): number {
  let level = startingLevel;
  while (level < 20 && xp >= xpForLevel(level + 1) - xpForLevel(startingLevel)) level += 1;
  return level;
}

export class GameEngine {
  private readonly dm: DungeonMaster;
  private readonly store: GameStore;
  private readonly roll: RollFn;
  private readonly now: () => Date;
  private readonly dailyCallLimit: number;

  constructor(opts: EngineOptions) {
    this.dm = opts.dm;
    this.store = opts.store;
    this.roll = opts.roll ?? rollDie;
    this.now = opts.now ?? (() => new Date());
    this.dailyCallLimit = Math.max(0, Math.floor(opts.dailyCallLimit ?? 0));
  }

  /**
   * Spend guard: every call to the model counts against a per-day cap kept in
   * the store, so a leaked token or a runaway client cannot burn through API
   * credit. The count is best-effort (concurrent turns may race), which is
   * fine for a ceiling.
   */
  private async spendOneCall(): Promise<void> {
    if (!this.dailyCallLimit) return;
    const key = `calls-${this.now().toISOString().slice(0, 10)}`;
    const used = Number((await this.store.getMeta(key)) ?? "0") || 0;
    if (used >= this.dailyCallLimit) {
      throw new GameError("The tavern has closed for the night: today's story budget is spent. Come back tomorrow.", 429);
    }
    await this.store.setMeta(key, String(used + 1));
  }

  /** How many model calls have been made today and how many remain. */
  async usageToday(): Promise<{ used: number; limit: number | null }> {
    const key = `calls-${this.now().toISOString().slice(0, 10)}`;
    const used = Number((await this.store.getMeta(key)) ?? "0") || 0;
    return { used, limit: this.dailyCallLimit || null };
  }

  async createGame(input: NewGameInput): Promise<GameState> {
    const background = (input.background ?? "").trim();
    if (background.length < 10) throw new GameError("Describe your character in at least a sentence.");
    if (background.length > MAX_BACKGROUND_CHARS) throw new GameError(`Keep the description under ${MAX_BACKGROUND_CHARS} characters.`);
    const tone = (input.tone ?? "").trim() || "classic fantasy";
    const name = (input.name ?? "").trim() || null;

    await this.spendOneCall();
    const era = resolveEra(input.eraId, input.customEra);
    if (era.id === "custom" && era.custom.length < 3) throw new GameError("Name the time and place of your tale.");

    const forged = await this.dm.forge({ system: FORGE_SYSTEM, user: forgeUserMessage(background, tone, name, era) });
    const character = forged.character;
    if (forged.scenarios.length === 0) throw new DungeonMasterError("The Dungeon Master offered no scenarios. Try again.");
    const ts = this.now().toISOString();
    const game: GameState = {
      id: randomUUID(),
      createdAt: ts,
      updatedAt: ts,
      status: "forged",
      tone,
      background,
      era,
      research: forged.research.filter(Boolean).slice(0, 6),
      character,
      scenarios: forged.scenarios,
      passedScenarios: [],
      scenario: null,
      hp: character.maxHp,
      gold: character.gold,
      xp: 0,
      level: character.level,
      inventory: character.inventory.map((i) => ({ ...i })),
      quests: [],
      statusEffects: [],
      location: "",
      npcsMet: [],
      turns: [],
    };
    await this.store.save(game);
    return game;
  }

  /** Replace the three offered scenarios with three new ones the player has not seen. */
  async rerollScenarios(id: string): Promise<GameState> {
    const game = await this.load(id);
    if (game.status !== "forged") throw new GameError("This adventure has already begun.", 409);
    const passed = game.scenarios.map((s) => `${s.title}: ${s.tagline}`);
    game.passedScenarios = game.passedScenarios.concat(passed).slice(-12);
    await this.spendOneCall();
    const result = await this.dm.reroll({ system: REROLL_SYSTEM, user: rerollUserMessage(game) });
    if (result.scenarios.length === 0) throw new DungeonMasterError("The Dungeon Master offered no scenarios. Try again.");
    // Fresh ids so a stale tap can never start an old tale.
    const stamp = Date.now().toString(36).slice(-4);
    game.scenarios = result.scenarios.slice(0, 3).map((s) => ({ ...s, id: `${s.id}-${stamp}` }));
    game.updatedAt = this.now().toISOString();
    await this.store.save(game);
    return game;
  }

  async startGame(id: string, input: StartInput): Promise<GameState> {
    const game = await this.load(id);
    if (game.status !== "forged") throw new GameError("This adventure has already begun.", 409);

    let scenario: ScenarioOption | undefined;
    if (input.customScenario?.trim()) {
      const text = input.customScenario.trim();
      if (text.length > 1500) throw new GameError("Keep your scenario under 1500 characters.");
      scenario = {
        id: "custom",
        title: "Your Own Tale",
        tagline: text.split(/[.!?]/)[0]?.slice(0, 120) ?? "A tale of your own making",
        synopsis: text,
        setting: "as the player describes",
        tone: game.tone,
        openingLocation: "wherever the player's description begins",
      };
    } else {
      scenario = game.scenarios.find((s) => s.id === input.scenarioId);
      if (!scenario) throw new GameError("Pick one of the offered scenarios or write your own.");
    }

    game.scenario = scenario;
    game.location = scenario.openingLocation;
    game.status = "playing";
    const fateRoll = this.roll(20);
    const messages: DMMessage[] = [{ role: "user", content: openingUserMessage(game, fateRoll) }];
    await this.spendOneCall();
    const scene = await this.dm.narrate({ system: this.systemFor(game), messages });
    this.applyScene(game, { kind: "start", text: "Begin the adventure", choiceId: null }, fateRoll, scene);
    await this.store.save(game);
    return game;
  }

  async takeTurn(id: string, input: TurnInput): Promise<GameState> {
    const game = await this.load(id);
    if (game.status === "forged") throw new GameError("Choose a scenario before acting.", 409);
    if (game.status === "ended") throw new GameError("This tale has ended. Start a new adventure.", 409);

    const last = game.turns.at(-1);
    if (!last) throw new GameError("No scene to act on.", 409);

    let action: PlayerAction;
    let resolved: string | null = null;
    const fateRoll = this.roll(20);

    if (input.choiceId) {
      const choice = last.scene.choices.find((c) => c.id === input.choiceId);
      if (!choice) throw new GameError("That option is no longer available.");
      action = { kind: "choice", text: choice.label, choiceId: choice.id };
      if (choice.check) resolved = resolveCheck(game.character, game.level, choice.check, fateRoll).summary;
    } else {
      const text = (input.freeText ?? "").trim();
      if (!text) throw new GameError("Say what you do, or pick an option.");
      if (text.length > MAX_ACTION_CHARS) throw new GameError(`Keep your action under ${MAX_ACTION_CHARS} characters.`);
      action = { kind: "freeText", text, choiceId: null };
    }

    const messages = this.historyMessages(game);
    const olderRecaps = game.turns.slice(0, Math.max(0, game.turns.length - VERBATIM_TURNS)).map((t) => t.scene.recap);
    messages.push({
      role: "user",
      content: actionUserMessage(game, action.text, action.kind === "choice" ? "choice" : "freeText", fateRoll, resolved, olderRecaps),
    });

    await this.spendOneCall();
    const scene = await this.dm.narrate({ system: this.systemFor(game), messages });
    this.applyScene(game, action, fateRoll, scene);
    await this.store.save(game);
    return game;
  }

  async getGame(id: string): Promise<GameState> {
    return this.load(id);
  }

  async listGames(): Promise<GameState[]> {
    return this.store.list();
  }

  async deleteGame(id: string): Promise<void> {
    if (!(await this.store.delete(id))) throw new GameError("No such adventure.", 404);
  }

  // ---------------------------------------------------------------------

  private async load(id: string): Promise<GameState> {
    const game = await this.store.get(id);
    if (!game) throw new GameError("No such adventure.", 404);
    // Saves from before eras existed default to classic fantasy.
    if (!game.era) game.era = resolveEra("classic-fantasy", "");
    if (!Array.isArray(game.research)) game.research = [];
    if (!Array.isArray(game.passedScenarios)) game.passedScenarios = [];
    if (!game.character.portrait) game.character.portrait = { ...DEFAULT_PORTRAIT };
    for (const t of game.turns) if (!Array.isArray(t.scene.loot)) t.scene.loot = [];
    return game;
  }

  private systemFor(game: GameState): string {
    if (!game.scenario) throw new GameError("No scenario chosen.", 409);
    return dmSystemPrompt(game.character, game.scenario, game.tone, game.era, game.research);
  }

  /**
   * Rebuild the conversation for the model. The opening user message is
   * constant, and each past turn is replayed as (user action, assistant scene)
   * so the prefix stays byte-stable for prompt caching. Only the most recent
   * turns are replayed verbatim; the rest are summarised in the final message.
   */
  private historyMessages(game: GameState): DMMessage[] {
    const messages: DMMessage[] = [];
    const recent = game.turns.slice(-VERBATIM_TURNS);
    for (const turn of recent) {
      if (turn.action.kind === "start") {
        messages.push({ role: "user", content: `Begin the adventure. Fate die: ${turn.fateRoll}.` });
      } else {
        messages.push({
          role: "user",
          content: turn.action.kind === "choice" ? `The player chooses: ${turn.action.text}` : `The player says: "${turn.action.text}"`,
        });
      }
      messages.push({ role: "assistant", content: compactScene(turn.scene) });
    }
    if (messages.length === 0) {
      messages.push({ role: "user", content: "Begin the adventure." });
    }
    return messages;
  }

  private applyScene(game: GameState, action: PlayerAction, fateRoll: number, scene: Scene): void {
    const change = scene.stateChange;
    game.hp = Math.max(0, Math.min(game.character.maxHp, game.hp + change.hpDelta));
    game.gold = Math.max(0, game.gold + change.goldDelta);
    game.xp += Math.max(0, change.xpGained);

    const newLevel = levelForXp(game.xp, game.character.level);
    if (newLevel > game.level) {
      const gained = newLevel - game.level;
      game.level = newLevel;
      game.character.level = newLevel;
      game.character.maxHp += 6 * gained;
      game.hp = Math.min(game.character.maxHp, game.hp + 6 * gained);
    }

    for (const item of change.itemsGained) addItem(game.inventory, item);
    for (const name of change.itemsLost) removeItem(game.inventory, name);

    for (const q of change.questUpdates) {
      const trimmed = q.trim();
      if (trimmed && !game.quests.includes(trimmed)) game.quests.push(trimmed);
    }
    if (game.quests.length > 12) game.quests = game.quests.slice(-12);

    game.statusEffects = change.statusEffects.map((s) => s.trim()).filter(Boolean);
    if (change.location.trim()) game.location = change.location.trim();

    for (const npc of scene.npcs) {
      const existing = game.npcsMet.find((n) => n.name.toLowerCase() === npc.name.toLowerCase());
      if (existing) Object.assign(existing, npc);
      else game.npcsMet.push(npc);
    }

    // A dead hero ends the tale even if the model forgot to say so.
    if (game.hp <= 0 && !scene.ending) {
      scene.ending = {
        victory: false,
        epilogue: `${game.character.name}'s story ends here, in ${game.location || "a place far from home"}. The tavern will remember the name.`,
      };
    }
    if (scene.ending) {
      scene.choices = [];
      game.status = "ended";
    }

    const turn: Turn = {
      index: game.turns.length,
      action,
      fateRoll,
      scene,
      createdAt: this.now().toISOString(),
    };
    game.turns.push(turn);
    game.updatedAt = turn.createdAt;
  }
}

function addItem(inventory: Item[], item: Item): void {
  const existing = inventory.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
  if (existing) existing.quantity += Math.max(1, item.quantity);
  else inventory.push({ ...item, quantity: Math.max(1, item.quantity) });
}

function removeItem(inventory: Item[], name: string): void {
  const idx = inventory.findIndex((i) => i.name.toLowerCase() === name.trim().toLowerCase());
  if (idx === -1) return;
  const item = inventory[idx]!;
  if (item.quantity > 1) item.quantity -= 1;
  else inventory.splice(idx, 1);
}

/** What the model sees of its own past turns: enough to stay consistent, not the whole JSON. */
export function compactScene(scene: Scene): string {
  const parts = [`[${scene.chapterTitle}]`, scene.narration];
  if (scene.diceResult) parts.push(`(${scene.diceResult.summary})`);
  if (scene.choices.length) parts.push(`Choices offered: ${scene.choices.map((c) => `${c.id}) ${c.label}`).join("; ")}`);
  if (scene.ending) parts.push(`THE END. ${scene.ending.epilogue}`);
  return parts.join("\n\n");
}

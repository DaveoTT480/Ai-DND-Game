import { z } from "zod";
import type { EraRef } from "./eras.js";

/**
 * Structured-output schemas shared between the Dungeon Master (Claude) and the
 * game engine. Every field is required (structured outputs reject optional
 * keys) - use `.nullable()` where a value may be absent.
 *
 * The iOS app's Models.swift mirrors these shapes exactly.
 */

export const Ability = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
export type Ability = z.infer<typeof Ability>;

export const AbilityScores = z.object({
  STR: z.number().int(),
  DEX: z.number().int(),
  CON: z.number().int(),
  INT: z.number().int(),
  WIS: z.number().int(),
  CHA: z.number().int(),
});
export type AbilityScores = z.infer<typeof AbilityScores>;

export const Item = z.object({
  name: z.string(),
  quantity: z.number().int(),
  description: z.string(),
});
export type Item = z.infer<typeof Item>;

export const Portrait = z.object({
  skin: z.enum(["light", "fair", "tan", "olive", "brown", "dark"]),
  hair: z.enum(["black", "brown", "blond", "red", "grey", "white", "none"]),
  hairStyle: z.enum(["short", "long", "braided", "curly", "topknot", "bald"]),
  facialHair: z.enum(["none", "stubble", "moustache", "beard", "fullbeard"]),
  eyes: z.enum(["brown", "blue", "green", "grey", "hazel", "dark"]),
  headwear: z.enum(["none", "hood", "helmet", "crown", "hat", "turban", "headscarf", "cap", "laurel", "veil"]),
  clothing: z.enum(["crimson", "forest", "navy", "umber", "ochre", "black", "grey", "white", "purple", "teal", "olive", "sand"]),
  symbol: z.string().describe("One emoji for the hero's trade or defining object"),
  age: z.enum(["young", "adult", "old"]),
  scar: z.boolean(),
});
export type Portrait = z.infer<typeof Portrait>;

export const DEFAULT_PORTRAIT: Portrait = { skin: "tan", hair: "brown", hairStyle: "short", facialHair: "none", eyes: "brown", headwear: "none", clothing: "umber", symbol: "\u2694\uFE0F", age: "adult", scar: false };

export const CharacterSheet = z.object({
  name: z.string(),
  race: z.string(),
  characterClass: z.string(),
  level: z.number().int(),
  maxHp: z.number().int(),
  armorClass: z.number().int(),
  abilities: AbilityScores,
  proficientSkills: z.array(z.string()).describe("D&D skill names the character is proficient in, e.g. Stealth, Persuasion, Arcana"),
  traits: z.array(z.string()).describe("3-5 short personality traits, quirks or flaws"),
  inventory: z.array(Item),
  gold: z.number().int(),
  appearance: z.string().describe("One or two sentences"),
  portrait: Portrait.describe("The hero's look in fixed choices, agreeing with the appearance text and the era"),
  backstory: z.string().describe("A polished 2-3 paragraph backstory expanded from the player's description, in third person"),
  motivation: z.string().describe("One sentence: what drives this character right now"),
});
export type CharacterSheet = z.infer<typeof CharacterSheet>;

export const ScenarioOption = z.object({
  id: z.string().describe("short slug, e.g. 'debt-of-ash'"),
  title: z.string(),
  tagline: z.string().describe("One evocative sentence"),
  synopsis: z.string().describe("2-4 sentences describing the hook, without spoiling the resolution"),
  setting: z.string().describe("Where the story begins, e.g. 'the fog-bound port of Greyhallow'"),
  tone: z.string(),
  openingLocation: z.string().describe("The specific place the first scene opens in"),
});
export type ScenarioOption = z.infer<typeof ScenarioOption>;

export const ScenarioList = z.object({
  scenarios: z.array(ScenarioOption).describe("Exactly three new, distinct starting scenarios"),
});
export type ScenarioList = z.infer<typeof ScenarioList>;

export const ForgeResult = z.object({
  character: CharacterSheet,
  research: z.array(z.string()).describe("4 to 6 lines: one real person, place or event of the era each, why it matters that year, how it could touch this hero"),
  scenarios: z.array(ScenarioOption).describe("Exactly three distinct starting scenarios"),
});
export type ForgeResult = z.infer<typeof ForgeResult>;

export const SkillCheck = z.object({
  ability: Ability,
  skill: z.string().nullable().describe("A D&D skill name if one applies, otherwise null"),
  dc: z.number().int().describe("Difficulty class: 10 easy, 13 moderate, 16 hard, 20 very hard"),
});
export type SkillCheck = z.infer<typeof SkillCheck>;

export const Choice = z.object({
  id: z.string().describe("short id like 'a', 'b', 'c', 'd'"),
  label: z.string().describe("Imperative, max 60 characters, no trailing period"),
  hint: z.string().describe("Max 90 characters: what this might cost or gain"),
  check: SkillCheck.nullable(),
});
export type Choice = z.infer<typeof Choice>;

export const Attitude = z.enum(["friendly", "neutral", "suspicious", "hostile"]);

export const NPC = z.object({
  name: z.string(),
  role: z.string().describe("e.g. 'one-eyed innkeeper'"),
  description: z.string().describe("One sentence"),
  attitude: Attitude,
  real: z.boolean().describe("true when this is a documented historical person, false when invented"),
});
export type NPC = z.infer<typeof NPC>;

export const DiceResult = z.object({
  ability: Ability,
  skill: z.string().nullable(),
  dc: z.number().int(),
  roll: z.number().int().describe("The raw d20 result"),
  modifier: z.number().int(),
  total: z.number().int(),
  success: z.boolean(),
  summary: z.string().describe("e.g. 'Stealth check: 14 + 3 = 17 vs DC 15 - success'"),
});
export type DiceResult = z.infer<typeof DiceResult>;

export const StateChange = z.object({
  hpDelta: z.number().int().describe("Negative for damage, positive for healing, 0 if nothing"),
  goldDelta: z.number().int(),
  xpGained: z.number().int().describe("0-50 for minor beats, 100+ for major victories"),
  itemsGained: z.array(Item),
  itemsLost: z.array(z.string()).describe("Names of items removed from the inventory"),
  questUpdates: z.array(z.string()).describe("New or updated quest-log lines, each a short sentence"),
  location: z.string().describe("Where the character is at the end of this scene"),
  statusEffects: z.array(z.string()).describe("Current conditions, e.g. 'poisoned', 'wanted in Greyhallow'. Send the full current list."),
});
export type StateChange = z.infer<typeof StateChange>;

export const Mood = z.enum(["calm", "tense", "mysterious", "combat", "triumphant", "grim", "festive"]);
export type Mood = z.infer<typeof Mood>;

export const Ending = z.object({
  victory: z.boolean(),
  epilogue: z.string().describe("2-3 paragraphs closing the tale"),
});

export const Scene = z.object({
  chapterTitle: z.string().describe("Short title for this beat, max 40 characters"),
  narration: z.string().describe("Markdown narration in second person, present tense. 120-260 words."),
  diceResult: DiceResult.nullable().describe("Only when a check was resolved this turn"),
  npcs: z.array(NPC).describe("Characters introduced this scene, or whose attitude changed. Empty if none."),
  choices: z.array(Choice).describe("3 or 4 options. Empty only when the adventure has ended."),
  stateChange: StateChange,
  loot: z.array(Item).describe("Up to 3 objects present in this scene the hero could pick up right now; empty when none"),
  recap: z.string().describe("One sentence summarising what happened this turn, for the story log"),
  mood: Mood,
  ending: Ending.nullable().describe("Set only when the adventure concludes (victory, death, or a satisfying resolution)"),
});
export type Scene = z.infer<typeof Scene>;

// ---------------------------------------------------------------------------
// Persisted game state (server-side only; the API exposes a snapshot of it).
// ---------------------------------------------------------------------------

export type PlayerActionKind = "start" | "choice" | "freeText";

export interface PlayerAction {
  kind: PlayerActionKind;
  text: string;
  choiceId: string | null;
}

export interface Turn {
  index: number;
  action: PlayerAction;
  fateRoll: number;
  scene: Scene;
  createdAt: string;
}

export type GameStatus = "forged" | "playing" | "ended";

export interface GameState {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: GameStatus;
  tone: string;
  background: string;
  era: EraRef;
  research: string[];
  character: CharacterSheet;
  scenarios: ScenarioOption[];
  /** Titles and taglines the player passed on, so rerolls stay fresh. */
  passedScenarios: string[];
  scenario: ScenarioOption | null;
  hp: number;
  gold: number;
  xp: number;
  level: number;
  inventory: Item[];
  quests: string[];
  statusEffects: string[];
  location: string;
  npcsMet: NPC[];
  turns: Turn[];
}

/** What the client receives after every action. */
export interface GameSnapshot {
  id: string;
  status: GameStatus;
  tone: string;
  createdAt: string;
  updatedAt: string;
  era: EraRef;
  research: string[];
  character: CharacterSheet;
  scenarios: ScenarioOption[];
  scenario: ScenarioOption | null;
  hp: number;
  gold: number;
  xp: number;
  level: number;
  inventory: Item[];
  quests: string[];
  statusEffects: string[];
  location: string;
  npcsMet: NPC[];
  turns: Turn[];
}

export interface GameSummary {
  id: string;
  status: GameStatus;
  characterName: string;
  characterClass: string;
  race: string;
  level: number;
  eraName: string;
  portrait: Portrait;
  scenarioTitle: string | null;
  location: string;
  turnCount: number;
  updatedAt: string;
}

export function toSnapshot(game: GameState): GameSnapshot {
  const { background: _background, ...rest } = game;
  return rest;
}

export function toSummary(game: GameState): GameSummary {
  return {
    id: game.id,
    status: game.status,
    characterName: game.character.name,
    characterClass: game.character.characterClass,
    race: game.character.race,
    level: game.level,
    eraName: game.era.name,
    portrait: game.character.portrait ?? DEFAULT_PORTRAIT,
    scenarioTitle: game.scenario?.title ?? null,
    location: game.location,
    turnCount: game.turns.length,
    updatedAt: game.updatedAt,
  };
}

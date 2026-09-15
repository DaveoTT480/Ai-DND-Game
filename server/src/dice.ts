import { randomInt } from "node:crypto";
import type { Ability, CharacterSheet, DiceResult, SkillCheck } from "./schemas.js";

export type RollFn = (sides: number) => number;

/** Cryptographically fair die: returns 1..sides. */
export const rollDie: RollFn = (sides) => randomInt(1, sides + 1);

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(level, 1) - 1) / 4);
}

export function checkModifier(character: CharacterSheet, level: number, ability: Ability, skill: string | null): number {
  let mod = abilityModifier(character.abilities[ability]);
  if (skill) {
    const proficient = character.proficientSkills.some((s) => s.trim().toLowerCase() === skill.trim().toLowerCase());
    if (proficient) mod += proficiencyBonus(level);
  }
  return mod;
}

/** Resolve a declared skill check with a fresh (or supplied) d20. */
export function resolveCheck(
  character: CharacterSheet,
  level: number,
  check: SkillCheck,
  roll: number,
): DiceResult {
  const modifier = checkModifier(character, level, check.ability, check.skill);
  const total = roll + modifier;
  // Natural 20 always succeeds, natural 1 always fails - classic table rule.
  const success = roll === 20 ? true : roll === 1 ? false : total >= check.dc;
  const label = check.skill ? `${check.skill} (${check.ability})` : check.ability;
  const sign = modifier >= 0 ? "+" : "-";
  const summary = `${label} check: ${roll} ${sign} ${Math.abs(modifier)} = ${total} vs DC ${check.dc} - ${
    roll === 20 ? "natural 20, critical success" : roll === 1 ? "natural 1, critical failure" : success ? "success" : "failure"
  }`;
  return { ability: check.ability, skill: check.skill, dc: check.dc, roll, modifier, total, success, summary };
}

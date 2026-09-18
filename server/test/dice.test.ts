import { test } from "node:test";
import assert from "node:assert/strict";
import { abilityModifier, checkModifier, proficiencyBonus, resolveCheck } from "../src/dice.js";
import { DEFAULT_PORTRAIT, type CharacterSheet } from "../src/schemas.js";

const hero: CharacterSheet = {
  name: "Test", race: "Elf", characterClass: "Ranger", level: 1, maxHp: 11, armorClass: 14,
  abilities: { STR: 8, DEX: 16, CON: 12, INT: 10, WIS: 14, CHA: 9 },
  proficientSkills: ["Stealth", "Survival"], traits: [], inventory: [], gold: 0,
  appearance: "", portrait: DEFAULT_PORTRAIT, backstory: "", motivation: "",
};

test("ability modifiers follow 5e", () => {
  assert.equal(abilityModifier(8), -1);
  assert.equal(abilityModifier(10), 0);
  assert.equal(abilityModifier(11), 0);
  assert.equal(abilityModifier(16), 3);
  assert.equal(abilityModifier(17), 3);
});

test("proficiency bonus scales with level", () => {
  assert.equal(proficiencyBonus(1), 2);
  assert.equal(proficiencyBonus(4), 2);
  assert.equal(proficiencyBonus(5), 3);
  assert.equal(proficiencyBonus(9), 4);
});

test("proficient skills add the bonus, case-insensitively", () => {
  assert.equal(checkModifier(hero, 1, "DEX", "stealth"), 5);
  assert.equal(checkModifier(hero, 1, "DEX", "Acrobatics"), 3);
  assert.equal(checkModifier(hero, 1, "STR", null), -1);
});

test("resolveCheck compares total to DC with crit rules", () => {
  const ok = resolveCheck(hero, 1, { ability: "DEX", skill: "Stealth", dc: 15 }, 10);
  assert.equal(ok.total, 15);
  assert.equal(ok.success, true);
  assert.match(ok.summary, /Stealth \(DEX\) check: 10 \+ 5 = 15 vs DC 15 - success/);

  const fail = resolveCheck(hero, 1, { ability: "STR", skill: null, dc: 10 }, 9);
  assert.equal(fail.total, 8);
  assert.equal(fail.success, false);
  assert.match(fail.summary, /9 - 1 = 8/);

  assert.equal(resolveCheck(hero, 1, { ability: "STR", skill: null, dc: 30 }, 20).success, true);
  assert.equal(resolveCheck(hero, 1, { ability: "DEX", skill: "Stealth", dc: 2 }, 1).success, false);
});

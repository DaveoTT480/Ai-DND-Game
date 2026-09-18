import type { DungeonMaster, ForgeRequest, NarrateRequest } from "./dm.js";
import type { ImageProvider } from "./images.js";

/** A one-pixel JPEG so mock mode exercises the whole portrait pipeline without an image key. */
export const mockImages: ImageProvider = {
  async generate() {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  },
};
import type { ForgeResult, ScenarioList, Scene } from "./schemas.js";

/**
 * A scripted Dungeon Master for tests and for running the app without an API
 * key (DM_MOCK=1). It is deliberately dull; it exists to exercise the engine
 * and the client, not to entertain.
 */
export class MockDungeonMaster implements DungeonMaster {
  turns = 0;

  async forge(req: ForgeRequest): Promise<ForgeResult> {
    const nameMatch = /called: (.+)$/m.exec(req.user);
    const name = nameMatch?.[1]?.trim() || "Wren Ashcombe";
    return {
      character: {
        name,
        race: "Human",
        characterClass: "Rogue",
        level: 1,
        maxHp: 10,
        armorClass: 13,
        abilities: { STR: 10, DEX: 16, CON: 12, INT: 13, WIS: 11, CHA: 14 },
        proficientSkills: ["Stealth", "Sleight of Hand", "Persuasion"],
        traits: ["Never forgets a face", "Laughs at the wrong moments", "Owes money to the wrong people"],
        inventory: [
          { name: "Dagger", quantity: 2, description: "Plain steel, well kept" },
          { name: "Thieves' tools", quantity: 1, description: "A roll of picks and a tension wrench" },
          { name: "Mother's locket", quantity: 1, description: "Tarnished silver, empty inside" },
        ],
        gold: 12,
        appearance: "Wiry, quick-eyed, with a scar through one eyebrow.",
        portrait: { skin: "tan", hair: "black", hairStyle: "short", facialHair: "stubble", eyes: "dark", headwear: "hood", clothing: "forest", symbol: "\u{1F5E1}\uFE0F", age: "young", scar: true },
        backstory: `${name} grew up on the docks of Greyhallow, running errands for smugglers before learning that the best way out of debt is to be too useful to kill.\n\nThe locket is the only thing left from a mother who vanished on a ship that never came back.`,
        motivation: "Find the ship that took her mother, and settle a debt before it settles them.",
      },
      research: [
        "Old Mattock's ledger names half the harbour council; the harbourmaster's office keeps the only copy.",
        "The Greyhallow fog hides the smugglers' cut at the north quay, where the ship that took her mother once moored.",
        "Lady Vell's wedding is the social event of the season, and her ring is said to open a vault beneath the chapel.",
      ],
      scenarios: [
        {
          id: "debt-of-ash",
          title: "Debt of Ash",
          tagline: "The man you owe has finally called in the favour.",
          synopsis: "Old Mattock wants a ledger stolen from the harbourmaster's office tonight. Refuse and your name goes on his wall. Succeed and you might learn what really happened to the ship.",
          setting: "the fog-bound port of Greyhallow",
          tone: "classic fantasy",
          openingLocation: "the back room of the Old Tavern",
        },
        {
          id: "the-hollow-road",
          title: "The Hollow Road",
          tagline: "A caravan needs a guard who can also pick a lock.",
          synopsis: "A merchant caravan leaves for the mountain pass at dawn. Something has been emptying wagons on the road without opening them.",
          setting: "the Hollow Road through the Kestrel Pass",
          tone: "classic fantasy",
          openingLocation: "the caravan yard at dawn",
        },
        {
          id: "the-wedding-heist",
          title: "The Wedding Heist",
          tagline: "Everyone is invited. Only you are there to steal the ring.",
          synopsis: "Lady Vell's wedding is the social event of the season, and her ring is said to open a vault beneath the chapel.",
          setting: "the marble hill-town of Ostermere",
          tone: "classic fantasy",
          openingLocation: "the chapel steps as the bells begin",
        },
      ],
    };
  }

  rerolls = 0;

  async reroll(_req: ForgeRequest): Promise<ScenarioList> {
    this.rerolls += 1;
    const n = this.rerolls;
    return {
      scenarios: [
        { id: `salt-and-iron-${n}`, title: `Salt and Iron ${n}`, tagline: "The garrison is hiring, and not asking questions.", synopsis: "A border fort needs hands before the thaw. Its captain needs someone deniable.", setting: "the Kestrel Pass", tone: "classic fantasy", openingLocation: "the fort's muster yard" },
        { id: `the-drowned-choir-${n}`, title: `The Drowned Choir ${n}`, tagline: "Something sings under the harbour at low tide.", synopsis: "Fishermen have stopped going out. The harbourmaster is paying for answers.", setting: "Greyhallow's harbour", tone: "classic fantasy", openingLocation: "the harbour steps at dawn" },
        { id: `a-name-for-sale-${n}`, title: `A Name for Sale ${n}`, tagline: "A dead noble's heir is needed. You'll do.", synopsis: "A lawyer wants an impostor for one week and one funeral.", setting: "the hill-town of Ostermere", tone: "classic fantasy", openingLocation: "a lawyer's office above a bakery" },
      ],
    };
  }

  async narrate(req: NarrateRequest): Promise<Scene> {
    this.turns += 1;
    const last = req.messages.at(-1);
    const lastText = typeof last?.content === "string" ? last.content : "";
    const isOpening = lastText.startsWith("Begin the adventure");
    const rolled = /already rolled for this choice: (.+?)\. Honour/.exec(lastText);
    const fate = Number(/Fate die for this turn: (\d+)/.exec(lastText)?.[1] ?? 10);
    const hpMatch = /Hit points: (\d+)\/(\d+)/.exec(lastText);
    const hp = hpMatch ? Number(hpMatch[1]) : 10;

    let diceResult: Scene["diceResult"] = null;
    if (rolled) {
      const m = /check: (\d+) ([+-]) (\d+) = (\d+) vs DC (\d+) - (.+)$/.exec(rolled[1]);
      if (m) {
        const roll = Number(m[1]);
        const modifier = Number(m[3]) * (m[2] === "-" ? -1 : 1);
        diceResult = {
          ability: "DEX",
          skill: "Stealth",
          dc: Number(m[5]),
          roll,
          modifier,
          total: Number(m[4]),
          success: m[6].includes("success"),
          summary: rolled[1],
        };
      }
    }

    const hurt = !isOpening && !diceResult && fate < 8;
    const ending = hp + (hurt ? -4 : 0) <= 0 || this.turns >= 40
      ? { victory: hp > 0, epilogue: "And so the tale ends, as tales do, with the tavern fire burning low." }
      : null;

    return {
      chapterTitle: isOpening ? "The Back Room" : `Turn ${this.turns}`,
      narration: isOpening
        ? "Smoke hangs under the low beams of the Old Tavern's back room. Old Mattock counts coins without looking up. \"You know why you're here,\" he says."
        : `You act. ${diceResult ? diceResult.summary + "." : "The fate die shows " + fate + "."} The room holds its breath.`,
      diceResult,
      npcs: isOpening ? [{ name: "Old Mattock", role: "moneylender", description: "A heavy man with delicate hands.", attitude: "suspicious", real: false }] : [],
      choices: ending
        ? []
        : [
            { id: "a", label: "Agree to the job", hint: "Keeps you alive for now", check: null },
            { id: "b", label: "Slip out the back", hint: "Stealth check, DC 13", check: { ability: "DEX", skill: "Stealth", dc: 13 } },
            { id: "c", label: "Bargain for more coin", hint: "Persuasion check, DC 15", check: { ability: "CHA", skill: "Persuasion", dc: 15 } },
          ],
      stateChange: {
        hpDelta: hurt ? -4 : 0,
        goldDelta: isOpening ? 0 : 1,
        xpGained: isOpening ? 0 : 10,
        itemsGained: isOpening ? [{ name: "Mattock's token", quantity: 1, description: "A copper coin with a hole punched through" }] : [],
        itemsLost: [],
        questUpdates: isOpening ? ["Steal the harbourmaster's ledger for Old Mattock"] : [],
        location: isOpening ? "the Old Tavern, back room" : "the Old Tavern",
        statusEffects: [],
      },
      loot: isOpening ? [{ name: "Mattock's ledger", quantity: 1, description: "Heavy, leather, damning." }] : [],
      recap: isOpening ? "Old Mattock called in the debt and demanded the ledger." : `Turn ${this.turns} passed.`,
      mood: isOpening ? "tense" : "calm",
      ending,
    };
  }
}

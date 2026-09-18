import Foundation

// These types mirror server/src/schemas.ts exactly. Keep them in sync.

enum Ability: String, Codable, CaseIterable, Hashable {
    case STR, DEX, CON, INT, WIS, CHA

    var longName: String {
        switch self {
        case .STR: "Strength"
        case .DEX: "Dexterity"
        case .CON: "Constitution"
        case .INT: "Intelligence"
        case .WIS: "Wisdom"
        case .CHA: "Charisma"
        }
    }
}

struct AbilityScores: Codable, Hashable {
    var STR: Int
    var DEX: Int
    var CON: Int
    var INT: Int
    var WIS: Int
    var CHA: Int

    func score(_ ability: Ability) -> Int {
        switch ability {
        case .STR: STR
        case .DEX: DEX
        case .CON: CON
        case .INT: INT
        case .WIS: WIS
        case .CHA: CHA
        }
    }

    static func modifier(for score: Int) -> Int {
        Int((Double(score - 10) / 2).rounded(.down))
    }
}

struct Item: Codable, Hashable, Identifiable {
    var id: String { name }
    var name: String
    var quantity: Int
    var description: String
}

/// The hero's look in fixed choices; PortraitView draws it.
struct Portrait: Codable, Hashable {
    var skin: String
    var hair: String
    var hairStyle: String
    var facialHair: String
    var eyes: String
    var headwear: String
    var clothing: String
    var symbol: String
    var age: String
    var scar: Bool

    static let fallback = Portrait(skin: "tan", hair: "brown", hairStyle: "short", facialHair: "none", eyes: "brown", headwear: "none", clothing: "umber", symbol: "\u{2694}\u{FE0F}", age: "adult", scar: false)
}

struct CharacterSheet: Codable, Hashable {
    var name: String
    var race: String
    var characterClass: String
    var level: Int
    var maxHp: Int
    var armorClass: Int
    var abilities: AbilityScores
    var proficientSkills: [String]
    var traits: [String]
    var inventory: [Item]
    var gold: Int
    var appearance: String
    var portrait: Portrait?
    var backstory: String
    var motivation: String

    var look: Portrait { portrait ?? .fallback }
}

struct ScenarioOption: Codable, Hashable, Identifiable {
    var id: String
    var title: String
    var tagline: String
    var synopsis: String
    var setting: String
    var tone: String
    var openingLocation: String
}

struct SkillCheck: Codable, Hashable {
    var ability: Ability
    var skill: String?
    var dc: Int

    var label: String { "\(skill ?? ability.longName) DC \(dc)" }
}

struct Choice: Codable, Hashable, Identifiable {
    var id: String
    var label: String
    var hint: String
    var check: SkillCheck?
}

enum Attitude: String, Codable, Hashable {
    case friendly, neutral, suspicious, hostile

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = Attitude(rawValue: raw) ?? .neutral
    }
}

struct NPC: Codable, Hashable, Identifiable {
    var id: String { name }
    var name: String
    var role: String
    var description: String
    var attitude: Attitude
    var real: Bool?

    var isHistorical: Bool { real ?? false }
}

/// An era from the server's catalogue (GET /api/eras).
struct Era: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var when: String
    var currency: String
    var historical: Bool
    var blurb: String
    var examples: [String]
}

/// What a game remembers about its era.
struct EraRef: Codable, Hashable {
    var id: String
    var name: String
    var when: String
    var currency: String
    var historical: Bool
    var custom: String?

    static let classic = EraRef(id: "classic-fantasy", name: "Classic Fantasy", when: "An age of kingdoms and magic", currency: "gold", historical: false, custom: "")

    /// "deben of copper" -> "deben", for tight status bars.
    var shortCurrency: String { currency.components(separatedBy: " of ").first ?? currency }
}

struct DiceResult: Codable, Hashable {
    var ability: Ability
    var skill: String?
    var dc: Int
    var roll: Int
    var modifier: Int
    var total: Int
    var success: Bool
    var summary: String
}

struct StateChange: Codable, Hashable {
    var hpDelta: Int
    var goldDelta: Int
    var xpGained: Int
    var itemsGained: [Item]
    var itemsLost: [String]
    var questUpdates: [String]
    var location: String
    var statusEffects: [String]
}

enum Mood: String, Codable, Hashable {
    case calm, tense, mysterious, combat, triumphant, grim, festive

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = Mood(rawValue: raw) ?? .calm
    }
}

struct Ending: Codable, Hashable {
    var victory: Bool
    var epilogue: String
}

/// One beat of the story, as written by the Dungeon Master.
/// (Named StoryScene because SwiftUI already owns `Scene`.)
struct StoryScene: Codable, Hashable {
    var chapterTitle: String
    var narration: String
    var diceResult: DiceResult?
    var npcs: [NPC]
    var choices: [Choice]
    var stateChange: StateChange
    var loot: [Item]?
    var recap: String
    var mood: Mood
    var ending: Ending?

    var lootItems: [Item] { loot ?? [] }
}

enum ActionKind: String, Codable, Hashable {
    case start, choice, freeText
}

struct PlayerAction: Codable, Hashable {
    var kind: ActionKind
    var text: String
    var choiceId: String?
}

struct Turn: Codable, Hashable, Identifiable {
    var id: Int { index }
    var index: Int
    var action: PlayerAction
    var fateRoll: Int
    var scene: StoryScene
    var createdAt: String
}

enum GameStatus: String, Codable, Hashable {
    case forged, playing, ended
}

struct GameSnapshot: Codable, Hashable, Identifiable {
    var id: String
    var status: GameStatus
    var tone: String
    var createdAt: String
    var updatedAt: String
    var era: EraRef?
    var research: [String]?
    var character: CharacterSheet
    var scenarios: [ScenarioOption]
    var passedScenarios: [String]?
    var portraitImage: Bool?
    var scenario: ScenarioOption?
    var hp: Int
    var gold: Int
    var xp: Int
    var level: Int
    var inventory: [Item]
    var quests: [String]
    var statusEffects: [String]
    var location: String
    var npcsMet: [NPC]
    var turns: [Turn]

    var latestScene: StoryScene? { turns.last?.scene }
    var eraRef: EraRef { era ?? .classic }
    var researchNotes: [String] { research ?? [] }
}

struct GameSummary: Codable, Hashable, Identifiable {
    var id: String
    var status: GameStatus
    var characterName: String
    var characterClass: String
    var race: String
    var level: Int
    var eraName: String?
    var portrait: Portrait?
    var portraitImage: Bool?
    var scenarioTitle: String?
    var location: String
    var turnCount: Int
    var updatedAt: String
}

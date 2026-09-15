import SwiftUI

/// The live character sheet: stats, gear, quests and the people met along the way.
struct CharacterSheetView: View {
    let game: GameSnapshot
    @Environment(\.dismiss) private var dismiss

    private var c: CharacterSheet { game.character }

    var body: some View {
        NavigationStack {
            ZStack {
                TavernBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        vitals
                        abilities
                        if !c.proficientSkills.isEmpty { chips(title: "Proficient skills", items: c.proficientSkills, color: Theme.ember) }
                        if !c.traits.isEmpty { chips(title: "Traits", items: c.traits, color: Theme.muted) }
                        if !game.statusEffects.isEmpty { chips(title: "Conditions", items: game.statusEffects, color: Theme.blood) }
                        inventory
                        quests
                        people
                        backstory
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Character sheet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Theme.ember)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(c.name)
                .font(Theme.display(30, weight: .bold))
                .foregroundStyle(Theme.parchment)
            Text("\(c.race) \(c.characterClass), level \(game.level)")
                .font(Theme.body)
                .foregroundStyle(Theme.ember)
            Text(c.appearance)
                .font(Theme.small)
                .foregroundStyle(Theme.muted)
        }
    }

    private var vitals: some View {
        HStack(spacing: 10) {
            VitalTile(title: "Hit points", value: "\(game.hp)/\(c.maxHp)", icon: "heart.fill", color: game.hp * 3 <= c.maxHp ? Theme.blood : Theme.moss)
            VitalTile(title: "Armour", value: "\(c.armorClass)", icon: "shield.fill", color: Theme.muted)
            VitalTile(title: "Gold", value: "\(game.gold)", icon: "circle.hexagongrid.fill", color: Theme.gold)
            VitalTile(title: "XP", value: "\(game.xp)", icon: "star.fill", color: Theme.ember)
        }
    }

    private var abilities: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "Abilities")
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(Ability.allCases, id: \.self) { ability in
                    let score = c.abilities.score(ability)
                    let mod = AbilityScores.modifier(for: score)
                    VStack(spacing: 2) {
                        Text(ability.longName)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.muted)
                        Text("\(score)")
                            .font(Theme.display(24))
                            .foregroundStyle(Theme.parchment)
                        Text(mod >= 0 ? "+\(mod)" : "\(mod)")
                            .font(Theme.small)
                            .foregroundStyle(Theme.ember)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
    }

    private func chips(title: String, items: [String], color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: title)
            FlowLayout(spacing: 6) {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .font(Theme.small)
                        .foregroundStyle(Theme.parchment)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(color.opacity(0.18), in: Capsule())
                        .overlay(Capsule().stroke(color.opacity(0.5), lineWidth: 1))
                }
            }
        }
    }

    private var inventory: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "Inventory")
            if game.inventory.isEmpty {
                Text("Empty pockets.").font(Theme.small).foregroundStyle(Theme.muted)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(game.inventory) { item in
                        HStack(alignment: .top) {
                            Text(item.quantity > 1 ? "\(item.name) x\(item.quantity)" : item.name)
                                .font(Theme.body)
                                .foregroundStyle(Theme.parchment)
                            Spacer()
                            Text(item.description)
                                .font(Theme.small)
                                .foregroundStyle(Theme.muted)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
                .tavernCard()
            }
        }
    }

    private var quests: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "Quest log")
            if game.quests.isEmpty {
                Text("Nothing written yet.").font(Theme.small).foregroundStyle(Theme.muted)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(game.quests, id: \.self) { quest in
                        Label(quest, systemImage: "scroll")
                            .font(Theme.body)
                            .foregroundStyle(Theme.parchment)
                    }
                }
                .tavernCard()
            }
        }
    }

    private var people: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "People met")
            if game.npcsMet.isEmpty {
                Text("No one yet.").font(Theme.small).foregroundStyle(Theme.muted)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(game.npcsMet) { npc in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(npc.name).font(Theme.display(16)).foregroundStyle(Theme.parchment)
                                Text(npc.attitude.rawValue)
                                    .font(Theme.caption)
                                    .foregroundStyle(Theme.color(for: npc.attitude))
                            }
                            Text("\(npc.role). \(npc.description)")
                                .font(Theme.small)
                                .foregroundStyle(Theme.muted)
                        }
                    }
                }
                .tavernCard()
            }
        }
    }

    private var backstory: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "Backstory")
            Text(c.backstory)
                .font(Theme.body)
                .foregroundStyle(Theme.parchment.opacity(0.9))
                .lineSpacing(4)
            Text(c.motivation)
                .font(Theme.small.italic())
                .foregroundStyle(Theme.ember)
        }
    }
}

struct VitalTile: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon).foregroundStyle(color)
            Text(value).font(Theme.display(17)).foregroundStyle(Theme.parchment)
            Text(title).font(Theme.caption).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

/// Wraps chips onto multiple lines.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width == .infinity ? x : width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

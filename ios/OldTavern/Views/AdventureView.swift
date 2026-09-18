import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

@Observable
final class AdventureModel {
    var game: GameSnapshot
    var isBusy = false
    var errorMessage: String?
    var draft = ""

    init(game: GameSnapshot) {
        self.game = game
    }

    var latestScene: StoryScene? { game.latestScene }
    var isOver: Bool { game.status == .ended }

    @MainActor
    func choose(_ choice: Choice, using client: APIClient) async {
        let id = game.id
        await perform { try await client.takeTurn(id: id, choiceId: choice.id, freeText: nil) }
    }

    @MainActor
    func act(text: String, using client: APIClient) async {
        let id = game.id
        await perform { try await client.takeTurn(id: id, choiceId: nil, freeText: text) }
    }

    @MainActor
    func act(using client: APIClient) async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        let id = game.id
        if await perform({ try await client.takeTurn(id: id, choiceId: nil, freeText: text) }) {
            draft = ""
        }
    }

    @MainActor
    @discardableResult
    private func perform(_ operation: () async throws -> GameSnapshot) async -> Bool {
        guard !isBusy else { return false }
        isBusy = true
        defer { isBusy = false }
        do {
            game = try await operation()
            errorMessage = nil
            #if canImport(UIKit)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            #endif
            return true
        } catch {
            errorMessage = error.localizedDescription
            #if canImport(UIKit)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            #endif
            return false
        }
    }
}

/// The story itself: the Dungeon Master's scenes, your choices, your own ideas.
struct AdventureView: View {
    @Environment(AppSettings.self) private var settings
    @Binding var path: [Route]
    @State private var model: AdventureModel
    @State private var showSheet = false
    @State private var showInventory = false
    @FocusState private var inputFocused: Bool

    init(game: GameSnapshot, path: Binding<[Route]>) {
        _path = path
        _model = State(initialValue: AdventureModel(game: game))
    }

    private var canSend: Bool {
        !model.isBusy && !model.isOver && !model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        ZStack {
            TavernBackground()
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let scenario = model.game.scenario {
                            ScenarioBanner(scenario: scenario)
                        }
                        ForEach(model.game.turns) { turn in
                            TurnView(turn: turn, currency: model.game.eraRef.shortCurrency)
                                .id(turn.id)
                        }
                        if !model.isBusy && !model.isOver, let loot = model.latestScene?.lootItems, !loot.isEmpty {
                            lootBlock(loot)
                        }
                        if model.isBusy {
                            ThinkingCard()
                        } else if let scene = model.latestScene, !scene.choices.isEmpty {
                            choicesBlock(scene.choices)
                        }
                        if model.isOver && !model.isBusy {
                            endBlock
                        }
                        Color.clear.frame(height: 1).id("bottom")
                    }
                    .padding(16)
                }
                .scrollDismissesKeyboard(.interactively)
                .onAppear { proxy.scrollTo("bottom", anchor: .bottom) }
                .onChange(of: model.game.turns.count) { _, _ in
                    withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                }
                .onChange(of: model.isBusy) { _, _ in
                    withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                }
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) { statusBar }
        .safeAreaInset(edge: .bottom, spacing: 0) { inputBar }
        .navigationTitle(model.game.scenario?.title ?? "Adventure")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.wood, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showSheet = true
                } label: {
                    Image(systemName: "person.text.rectangle")
                        .foregroundStyle(Theme.ember)
                }
            }
        }
        .sheet(isPresented: $showSheet) {
            CharacterSheetView(game: model.game)
        }
        .sheet(isPresented: $showInventory) {
            InventoryView(game: model.game) { text in
                showInventory = false
                model.draft = ""
                Task { await model.act(text: text, using: settings.client) }
            }
        }
        .alert("The Dungeon Master frowns", isPresented: Binding(
            get: { model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.errorMessage ?? "")
        }
    }

    // MARK: - Pieces

    private var statusBar: some View {
        let game = model.game
        let lowHp = game.hp * 3 <= game.character.maxHp
        return HStack(spacing: 14) {
            HeroPortraitView(gameId: game.id, hasImage: game.portraitImage ?? false, portrait: game.character.look, size: 28, ring: lowHp ? Theme.blood : Theme.ember)
            HStack(spacing: 5) {
                Image(systemName: "heart.fill").foregroundStyle(lowHp ? Theme.blood : Theme.moss)
                Text("\(game.hp)/\(game.character.maxHp)")
            }
            HStack(spacing: 5) {
                Image(systemName: "circle.hexagongrid.fill").foregroundStyle(Theme.gold)
                Text("\(game.gold)")
                Text(game.eraRef.shortCurrency)
                    .foregroundStyle(Theme.muted)
            }
            Text("Lv \(game.level)")
                .foregroundStyle(Theme.muted)
            Spacer(minLength: 8)
            HStack(spacing: 4) {
                Image(systemName: "mappin").foregroundStyle(Theme.muted)
                Text(game.location.isEmpty ? "Somewhere" : game.location)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
            .layoutPriority(-1)
        }
        .font(Theme.small)
        .foregroundStyle(Theme.parchment)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(Theme.wood.opacity(0.97))
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.woodBorder).frame(height: 1) }
        .contentShape(Rectangle())
        .onTapGesture { showSheet = true }
    }

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 8) {
            Button {
                showInventory = true
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bag.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Theme.parchment)
                        .frame(width: 44, height: 44)
                        .background(Theme.woodLight, in: Circle())
                        .overlay(Circle().stroke(Theme.woodBorder, lineWidth: 1))
                    let count = model.game.inventory.reduce(0) { $0 + max(1, $1.quantity) }
                    if count > 0 {
                        Text("\(count)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Theme.wood)
                            .padding(.horizontal, 5)
                            .frame(minWidth: 18, minHeight: 18)
                            .background(Theme.ember, in: Capsule())
                            .offset(x: 4, y: -4)
                    }
                }
            }
            .padding(.bottom, 1)
            TextField(model.isOver ? "The tale has ended" : "Or do something else...", text: $model.draft, axis: .vertical)
                .lineLimit(1...4)
                .font(Theme.body)
                .foregroundStyle(Theme.parchment)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
                .focused($inputFocused)
                .disabled(model.isOver || model.isBusy)
            Button {
                send()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 34))
                    .foregroundStyle(canSend ? Theme.ember : Theme.muted)
            }
            .disabled(!canSend)
            .padding(.bottom, 2)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Theme.wood.opacity(0.97))
        .overlay(alignment: .top) { Rectangle().fill(Theme.woodBorder).frame(height: 1) }
    }

    private func choicesBlock(_ choices: [Choice]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "What do you do?")
            ForEach(choices) { choice in
                ChoiceButton(choice: choice) {
                    inputFocused = false
                    Task { await model.choose(choice, using: settings.client) }
                }
            }
        }
        .padding(.top, 4)
    }

    private func lootBlock(_ loot: [Item]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(text: "Things you could take")
            FlowLayout(spacing: 6) {
                ForEach(Array(loot.enumerated()), id: \.offset) { _, item in
                    Button {
                        inputFocused = false
                        Task { await model.act(text: "I pick up the \(item.name).", using: settings.client) }
                    } label: {
                        HStack(spacing: 6) {
                            Text("+").foregroundStyle(Theme.gold).fontWeight(.bold)
                            Text(item.quantity > 1 ? "\(item.name) x\(item.quantity)" : item.name)
                        }
                        .font(Theme.small)
                        .foregroundStyle(Theme.parchment)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Theme.wood, in: Capsule())
                        .overlay(Capsule().stroke(Theme.gold, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var endBlock: some View {
        VStack(spacing: 10) {
            Button {
                path.removeAll()
            } label: {
                Label("Return to the tavern", systemImage: "flame")
            }
            .buttonStyle(QuietButtonStyle())
            Button {
                path = [.forge]
            } label: {
                Label("Begin a new adventure", systemImage: "hammer.fill")
            }
            .buttonStyle(EmberButtonStyle())
        }
        .padding(.top, 8)
    }

    private func send() {
        inputFocused = false
        Task { await model.act(using: settings.client) }
    }
}

struct ScenarioBanner: View {
    let scenario: ScenarioOption

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(scenario.tagline)
                .font(Theme.body.italic())
                .foregroundStyle(Theme.ember)
            Text(scenario.setting)
                .font(Theme.small)
                .foregroundStyle(Theme.muted)
        }
        .padding(.bottom, 4)
    }
}

struct TurnView: View {
    let turn: Turn
    var currency: String = "gold"

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if turn.action.kind != .start {
                PlayerBubble(action: turn.action)
            }
            SceneCard(scene: turn.scene, currency: currency)
        }
    }
}

struct PlayerBubble: View {
    let action: PlayerAction

    var body: some View {
        HStack {
            Spacer(minLength: 40)
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: action.kind == .choice ? "hand.point.right.fill" : "quote.opening")
                    .font(.caption)
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 3)
                Text(action.text)
                    .font(Theme.body.italic())
                    .foregroundStyle(Theme.parchment)
            }
            .padding(12)
            .background(Theme.ember.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Theme.ember.opacity(0.4), lineWidth: 1))
        }
    }
}

struct SceneCard: View {
    let scene: StoryScene
    var currency: String = "gold"

    private var moodColor: Color { Theme.color(for: scene.mood) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(scene.chapterTitle)
                    .font(Theme.display(21))
                    .foregroundStyle(Theme.parchment)
                Spacer()
                Text(scene.mood.rawValue)
                    .font(Theme.caption)
                    .foregroundStyle(moodColor)
            }

            if let dice = scene.diceResult {
                DiceBadge(result: dice)
            }

            NarrationText(markdown: scene.narration)

            if !scene.npcs.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(Array(scene.npcs.enumerated()), id: \.offset) { _, npc in
                        HStack(spacing: 4) {
                            Circle().fill(Theme.color(for: npc.attitude)).frame(width: 6, height: 6)
                            Text("\(npc.name), \(npc.role)")
                            if npc.isHistorical {
                                Text("\u{2726} historical")
                                    .foregroundStyle(Theme.gold)
                            }
                        }
                        .font(Theme.caption)
                        .foregroundStyle(Theme.parchment)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Theme.wood, in: Capsule())
                        .overlay(Capsule().stroke(Theme.woodBorder, lineWidth: 1))
                    }
                }
            }

            if !changeLines.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(Array(changeLines.enumerated()), id: \.offset) { _, line in
                        Label(line.text, systemImage: line.icon)
                            .font(Theme.small)
                            .foregroundStyle(line.color)
                    }
                }
            }

            if let ending = scene.ending {
                Divider().overlay(Theme.woodBorder)
                Text(ending.victory ? "Victory" : "The End")
                    .font(Theme.display(24, weight: .bold))
                    .foregroundStyle(ending.victory ? Theme.gold : Theme.muted)
                NarrationText(markdown: ending.epilogue)
            }
        }
        .tavernCard(accent: moodColor.opacity(0.5))
    }

    private struct ChangeLine: Hashable {
        let text: String
        let icon: String
        let color: Color
    }

    private var changeLines: [ChangeLine] {
        let change = scene.stateChange
        var lines: [ChangeLine] = []
        if change.hpDelta < 0 { lines.append(.init(text: "\(change.hpDelta) hit points", icon: "heart.slash", color: Theme.blood)) }
        if change.hpDelta > 0 { lines.append(.init(text: "+\(change.hpDelta) hit points", icon: "heart.fill", color: Theme.moss)) }
        if change.goldDelta != 0 {
            lines.append(.init(text: "\(change.goldDelta > 0 ? "+" : "")\(change.goldDelta) \(currency)", icon: "circle.hexagongrid.fill", color: Theme.gold))
        }
        if change.xpGained > 0 { lines.append(.init(text: "+\(change.xpGained) xp", icon: "star.fill", color: Theme.ember)) }
        for item in change.itemsGained {
            lines.append(.init(text: "Gained \(item.quantity > 1 ? "\(item.name) x\(item.quantity)" : item.name)", icon: "bag.fill", color: Theme.parchment))
        }
        for name in change.itemsLost {
            lines.append(.init(text: "Lost \(name)", icon: "bag", color: Theme.muted))
        }
        for quest in change.questUpdates {
            lines.append(.init(text: quest, icon: "scroll", color: Theme.muted))
        }
        return lines
    }
}

struct DiceBadge: View {
    let result: DiceResult
    @State private var shown: Int?

    private var color: Color { result.success ? Theme.moss : Theme.blood }

    private var verdict: String {
        if result.roll == 20 { return "Critical!" }
        if result.roll == 1 { return "Fumble!" }
        return result.success ? "Success" : "Failure"
    }

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous).fill(Theme.wood)
                Text("\(shown ?? result.roll)")
                    .font(Theme.display(20, weight: .bold))
                    .foregroundStyle(Theme.parchment)
                    .contentTransition(.numericText())
            }
            .frame(width: 42, height: 42)
            .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).stroke(color, lineWidth: 1.5))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(result.skill ?? result.ability.longName) check")
                    .font(Theme.small)
                    .foregroundStyle(Theme.parchment)
                Text("\(result.roll) \(result.modifier >= 0 ? "+" : "-") \(abs(result.modifier)) = \(result.total) vs DC \(result.dc)")
                    .font(Theme.caption)
                    .foregroundStyle(Theme.muted)
            }
            Spacer()
            Text(verdict)
                .font(Theme.display(15))
                .foregroundStyle(color)
        }
        .padding(10)
        .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .task {
            for _ in 0..<6 {
                withAnimation(.easeOut(duration: 0.07)) { shown = Int.random(in: 1...20) }
                try? await Task.sleep(for: .milliseconds(70))
            }
            withAnimation { shown = result.roll }
        }
    }
}

struct ChoiceButton: View {
    let choice: Choice
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(choice.label)
                        .font(Theme.display(16, weight: .medium))
                        .foregroundStyle(Theme.parchment)
                        .multilineTextAlignment(.leading)
                    if !choice.hint.isEmpty {
                        Text(choice.hint)
                            .font(Theme.small)
                            .foregroundStyle(Theme.muted)
                            .multilineTextAlignment(.leading)
                    }
                }
                Spacer(minLength: 6)
                if let check = choice.check {
                    VStack(spacing: 2) {
                        Image(systemName: "dice.fill")
                        Text(check.label)
                            .multilineTextAlignment(.trailing)
                    }
                    .font(Theme.caption)
                    .foregroundStyle(Theme.ember)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct ThinkingCard: View {
    @State private var line = ThinkingCard.lines[0]

    static let lines = [
        "The Dungeon Master is thinking...",
        "Dice clatter behind the screen...",
        "Somewhere, a plot thickens...",
        "The candle gutters. The story turns...",
    ]

    var body: some View {
        HStack(spacing: 12) {
            ProgressView().tint(Theme.ember)
            Text(line)
                .font(Theme.body.italic())
                .foregroundStyle(Theme.muted)
                .contentTransition(.opacity)
        }
        .tavernCard()
        .task {
            var index = 0
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(4))
                index = (index + 1) % ThinkingCard.lines.count
                withAnimation { line = ThinkingCard.lines[index] }
            }
        }
    }
}

/// What the hero carries, what lies nearby, and what to do with it.
struct InventoryView: View {
    let game: GameSnapshot
    let onAction: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    private var loot: [Item] { game.status == .ended ? [] : (game.latestScene?.lootItems ?? []) }

    var body: some View {
        NavigationStack {
            ZStack {
                TavernBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("\(game.character.name) carries \(game.inventory.reduce(0) { $0 + max(1, $1.quantity) }) things and \(game.gold) \(game.eraRef.shortCurrency).")
                            .font(Theme.small)
                            .foregroundStyle(Theme.muted)
                        if !loot.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                SectionHeader(text: "Nearby")
                                ForEach(Array(loot.enumerated()), id: \.offset) { _, item in
                                    HStack(alignment: .top) {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(item.quantity > 1 ? "\(item.name) x\(item.quantity)" : item.name)
                                                .font(Theme.body)
                                                .foregroundStyle(Theme.parchment)
                                            if !item.description.isEmpty {
                                                Text(item.description).font(Theme.small).foregroundStyle(Theme.muted)
                                            }
                                        }
                                        Spacer()
                                        Button("Take") { onAction("I pick up the \(item.name).") }
                                            .font(Theme.small)
                                            .foregroundStyle(Theme.gold)
                                    }
                                }
                            }
                            .tavernCard(accent: Theme.gold.opacity(0.6))
                        }
                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeader(text: "Carried")
                            if game.inventory.isEmpty {
                                Text("Empty pockets. Things you pick up in the world appear here.")
                                    .font(Theme.small)
                                    .foregroundStyle(Theme.muted)
                            }
                            ForEach(Array(game.inventory.enumerated()), id: \.offset) { _, item in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(item.quantity > 1 ? "\(item.name) x\(item.quantity)" : item.name)
                                        .font(Theme.display(18))
                                        .foregroundStyle(Theme.parchment)
                                    if !item.description.isEmpty {
                                        Text(item.description).font(Theme.small).foregroundStyle(Theme.muted)
                                    }
                                    if game.status != .ended {
                                        HStack(spacing: 6) {
                                            inventoryButton("Use") { onAction("I use my \(item.name).") }
                                            inventoryButton("Examine") { onAction("I take a closer look at my \(item.name).") }
                                            inventoryButton("Drop", color: Theme.blood) { onAction("I drop my \(item.name) and leave it behind.") }
                                        }
                                    }
                                }
                                .padding(.vertical, 6)
                                Divider().overlay(Theme.woodBorder)
                            }
                        }
                        .tavernCard()
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Inventory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundStyle(Theme.ember)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func inventoryButton(_ title: String, color: Color = Theme.parchment, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(Theme.small)
                .foregroundStyle(color)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Theme.wood, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

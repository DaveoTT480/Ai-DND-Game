import SwiftUI

enum Route: Hashable {
    case forge
    case pick(GameSnapshot)
    case play(GameSnapshot)
}

/// The hearth of the app: start a new tale or pick up a saved one.
struct TavernHomeView: View {
    @Environment(AppSettings.self) private var settings

    @State private var path: [Route] = []
    @State private var games: [GameSummary] = []
    @State private var isLoading = false
    @State private var loadError: String?
    @State private var openError: String?
    @State private var deleteError: String?
    @State private var showSettings = false

    var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                TavernBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        header
                        Button {
                            path.append(.forge)
                        } label: {
                            Label("Begin a new adventure", systemImage: "flame.fill")
                        }
                        .buttonStyle(EmberButtonStyle())

                        savedTales
                    }
                    .padding(20)
                }
                .refreshable { await load() }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(Theme.muted)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .forge:
                    ForgeCharacterView(path: $path)
                case .pick(let game):
                    ScenarioPickerView(game: game, path: $path)
                case .play(let game):
                    AdventureView(game: game, path: $path)
                }
            }
            .sheet(isPresented: $showSettings, onDismiss: { Task { await load() } }) {
                SettingsView()
            }
            .task { await load() }
            .onChange(of: path.count) { _, count in
                if count == 0 { Task { await load() } }
            }
            .alert("Could not open that tale", isPresented: Binding(get: { openError != nil }, set: { if !$0 { openError = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(openError ?? "")
            }
            .alert("Could not delete that tale", isPresented: Binding(get: { deleteError != nil }, set: { if !$0 { deleteError = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(deleteError ?? "")
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("The Old Tavern")
                .font(Theme.display(38, weight: .bold))
                .foregroundStyle(Theme.parchment)
            Text("Pull up a chair by the fire. Every tale starts with who you are.")
                .font(Theme.body)
                .foregroundStyle(Theme.muted)
        }
        .padding(.top, 12)
    }

    @ViewBuilder
    private var savedTales: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(text: "Saved tales")

            if let loadError {
                VStack(alignment: .leading, spacing: 8) {
                    Text(loadError)
                        .font(Theme.small)
                        .foregroundStyle(Theme.blood)
                    Button("Open settings") { showSettings = true }
                        .font(Theme.small)
                        .foregroundStyle(Theme.ember)
                }
                .tavernCard()
            } else if isLoading && games.isEmpty {
                HStack {
                    ProgressView().tint(Theme.ember)
                    Text("Dusting off the ledgers...")
                        .font(Theme.small)
                        .foregroundStyle(Theme.muted)
                }
                .tavernCard()
            } else if games.isEmpty {
                Text("No tales yet. The bard is waiting for a hero.")
                    .font(Theme.small)
                    .foregroundStyle(Theme.muted)
                    .tavernCard()
            } else {
                ForEach(games) { game in
                    Button {
                        Task { await open(game) }
                    } label: {
                        SavedGameRow(game: game)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            Task { await delete(game) }
                        } label: {
                            Label("Delete tale", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }

    @MainActor
    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            games = try await settings.client.listGames()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    @MainActor
    private func open(_ summary: GameSummary) async {
        do {
            let game = try await settings.client.getGame(id: summary.id)
            path.append(game.status == .forged ? .pick(game) : .play(game))
        } catch {
            openError = error.localizedDescription
        }
    }

    @MainActor
    private func delete(_ summary: GameSummary) async {
        do {
            try await settings.client.deleteGame(id: summary.id)
            games.removeAll { $0.id == summary.id }
        } catch {
            deleteError = error.localizedDescription
        }
    }
}

struct SavedGameRow: View {
    let game: GameSummary

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if let portrait = game.portrait {
                HeroPortraitView(gameId: game.id, hasImage: game.portraitImage ?? false, portrait: portrait, size: 48, ring: iconColor)
            } else {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(iconColor)
                    .frame(width: 32)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(game.characterName)
                    .font(Theme.display(18))
                    .foregroundStyle(Theme.parchment)
                Text(game.eraName.map { "\(game.race) \(game.characterClass), level \(game.level) \u{00B7} \($0)" } ?? "\(game.race) \(game.characterClass), level \(game.level)")
                    .font(Theme.small)
                    .foregroundStyle(Theme.muted)
                Text(subtitle)
                    .font(Theme.small)
                    .foregroundStyle(Theme.ember)
                    .lineLimit(2)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(Theme.muted)
        }
        .tavernCard()
    }

    private var icon: String {
        switch game.status {
        case .forged: "scroll"
        case .playing: "book.pages"
        case .ended: "checkmark.seal"
        }
    }

    private var iconColor: Color {
        switch game.status {
        case .forged: Theme.muted
        case .playing: Theme.ember
        case .ended: Theme.gold
        }
    }

    private var subtitle: String {
        switch game.status {
        case .forged: "Ready to choose a tale"
        case .playing: "\(game.scenarioTitle ?? "An adventure") - \(game.location), turn \(game.turnCount)"
        case .ended: "\(game.scenarioTitle ?? "An adventure") - concluded after \(game.turnCount) turns"
        }
    }
}

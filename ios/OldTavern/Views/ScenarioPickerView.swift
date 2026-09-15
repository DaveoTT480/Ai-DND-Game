import SwiftUI

/// Meet the hero the Keeper forged, then choose (or write) the tale.
struct ScenarioPickerView: View {
    @Environment(AppSettings.self) private var settings
    let game: GameSnapshot
    @Binding var path: [Route]

    @State private var customScenario = ""
    @State private var isStarting = false
    @State private var startingId: String?
    @State private var errorMessage: String?
    @State private var showSheet = false

    var body: some View {
        ZStack {
            TavernBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    heroCard

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(text: "Choose your tale")
                        ForEach(game.scenarios) { scenario in
                            ScenarioCard(scenario: scenario, isStarting: startingId == scenario.id) {
                                Task { await start(scenarioId: scenario.id, custom: nil) }
                            }
                            .disabled(isStarting)
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(text: "Or write your own")
                        ParchmentEditor(placeholder: "I wake in a burning library with no memory of how I got here...", text: $customScenario, minHeight: 100)
                        Button {
                            Task { await start(scenarioId: nil, custom: customScenario) }
                        } label: {
                            if startingId == "custom" {
                                ProgressView().tint(Theme.parchment)
                            } else {
                                Label("Begin my own tale", systemImage: "pencil.and.scribble")
                            }
                        }
                        .buttonStyle(QuietButtonStyle())
                        .disabled(isStarting || customScenario.trimmingCharacters(in: .whitespaces).count < 10)
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.small)
                            .foregroundStyle(Theme.blood)
                            .tavernCard(accent: Theme.blood)
                    }
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle(game.character.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .sheet(isPresented: $showSheet) {
            CharacterSheetView(game: game)
        }
    }

    private var heroCard: some View {
        let c = game.character
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(c.name)
                        .font(Theme.display(28, weight: .bold))
                        .foregroundStyle(Theme.parchment)
                    Text("\(c.race) \(c.characterClass), level \(c.level)")
                        .font(Theme.small)
                        .foregroundStyle(Theme.ember)
                }
                Spacer()
                Button {
                    showSheet = true
                } label: {
                    Label("Sheet", systemImage: "person.text.rectangle")
                        .font(Theme.small)
                        .foregroundStyle(Theme.ember)
                }
            }

            HStack(spacing: 6) {
                ForEach(Ability.allCases, id: \.self) { ability in
                    VStack(spacing: 2) {
                        Text(ability.rawValue)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.muted)
                        Text("\(c.abilities.score(ability))")
                            .font(Theme.display(16))
                            .foregroundStyle(Theme.parchment)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(Theme.wood, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }

            Text(c.appearance)
                .font(Theme.body)
                .foregroundStyle(Theme.parchment)
            Text(c.backstory)
                .font(Theme.body)
                .foregroundStyle(Theme.parchment.opacity(0.9))
                .lineSpacing(4)
            Text(c.motivation)
                .font(Theme.small.italic())
                .foregroundStyle(Theme.ember)
        }
        .tavernCard(accent: Theme.ember.opacity(0.6))
    }

    @MainActor
    private func start(scenarioId: String?, custom: String?) async {
        isStarting = true
        startingId = scenarioId ?? "custom"
        errorMessage = nil
        defer {
            isStarting = false
            startingId = nil
        }
        do {
            let started = try await settings.client.startGame(id: game.id, scenarioId: scenarioId, customScenario: custom)
            // Replace the forge and picker screens with the adventure so Back returns to the tavern.
            path = [.play(started)]
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ScenarioCard: View {
    let scenario: ScenarioOption
    let isStarting: Bool
    let begin: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(scenario.title)
                .font(Theme.display(21))
                .foregroundStyle(Theme.parchment)
            Text(scenario.tagline)
                .font(Theme.body.italic())
                .foregroundStyle(Theme.ember)
            Text(scenario.synopsis)
                .font(Theme.body)
                .foregroundStyle(Theme.parchment.opacity(0.9))
                .lineSpacing(3)
            Label(scenario.setting, systemImage: "map")
                .font(Theme.small)
                .foregroundStyle(Theme.muted)
            Button(action: begin) {
                if isStarting {
                    ProgressView().tint(Theme.wood)
                } else {
                    Text("Begin this tale")
                }
            }
            .buttonStyle(EmberButtonStyle())
        }
        .tavernCard()
    }
}

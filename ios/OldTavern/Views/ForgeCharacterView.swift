import SwiftUI

/// Where a few sentences become a hero.
struct ForgeCharacterView: View {
    @Environment(AppSettings.self) private var settings
    @Binding var path: [Route]

    @State private var name = ""
    @State private var background = ""
    @State private var tone: Tone = .classic
    @State private var customTone = ""
    @State private var isForging = false
    @State private var errorMessage: String?
    @State private var forgingLine = ForgeCharacterView.forgingLines[0]
    @FocusState private var editorFocused: Bool

    enum Tone: String, CaseIterable, Identifiable {
        case classic = "classic fantasy"
        case grimdark = "grimdark"
        case comedy = "lighthearted comedy"
        case horror = "gothic horror"
        case seas = "swashbuckling high seas"
        case steampunk = "steampunk mystery"
        case custom = "custom"

        var id: String { rawValue }

        var label: String {
            switch self {
            case .classic: "Classic fantasy"
            case .grimdark: "Grimdark"
            case .comedy: "Comedy"
            case .horror: "Gothic horror"
            case .seas: "High seas"
            case .steampunk: "Steampunk"
            case .custom: "Custom..."
            }
        }
    }

    static let forgingLines = [
        "The Keeper sharpens a quill...",
        "Rolling for your strengths...",
        "Consulting the notice board...",
        "Writing your name in the ledger...",
        "Three tales are being chosen for you...",
    ]

    static let examples = [
        "A retired ship's cook with a cursed ladle and a grudge against the Admiralty. Cheerful, overweight, deadly with a cleaver.",
        "A young half-elf scholar who stole a forbidden book from her academy and is now hunted by her own professors. Brilliant, nervous, allergic to horses.",
        "A dwarven blacksmith who lost his forge to a dragon and swore never to make another weapon. He carries a hammer anyway.",
        "A street magician from the capital who can do one real spell and pretends the rest are also real. Charming, broke, owes money to a tiefling loan shark.",
        "An old knight, once famous, now forgotten, looking for one last deed worth a song. Her armour still fits. Mostly.",
    ]

    private var effectiveTone: String {
        tone == .custom ? customTone.trimmingCharacters(in: .whitespacesAndNewlines) : tone.rawValue
    }

    private var canForge: Bool {
        background.trimmingCharacters(in: .whitespacesAndNewlines).count >= 10 && !effectiveTone.isEmpty && !isForging
    }

    var body: some View {
        ZStack {
            TavernBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Who walks in?")
                            .font(Theme.display(32, weight: .bold))
                            .foregroundStyle(Theme.parchment)
                        Text("Describe your character in your own words: their past, their trade, their flaws, what they carry. The Keeper turns it into a full character sheet and three adventures made for them.")
                            .font(Theme.body)
                            .foregroundStyle(Theme.muted)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        SectionHeader(text: "Name (optional)")
                        TextField("Leave blank and one will be chosen", text: $name)
                            .font(Theme.body)
                            .foregroundStyle(Theme.parchment)
                            .padding(12)
                            .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
                            .autocorrectionDisabled()
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        SectionHeader(text: "Background")
                        ParchmentEditor(placeholder: "A retired ship's cook with a cursed ladle...", text: $background, minHeight: 160)
                            .focused($editorFocused)
                        Button {
                            background = ForgeCharacterView.examples.randomElement() ?? ""
                            editorFocused = false
                        } label: {
                            Label("Surprise me with an example", systemImage: "sparkles")
                                .font(Theme.small)
                                .foregroundStyle(Theme.ember)
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        SectionHeader(text: "Tone of the tale")
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Tone.allCases) { option in
                                    Button {
                                        tone = option
                                    } label: {
                                        Text(option.label)
                                            .font(Theme.small)
                                            .foregroundStyle(tone == option ? Theme.wood : Theme.parchment)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(tone == option ? Theme.ember : Theme.woodLight, in: Capsule())
                                            .overlay(Capsule().stroke(Theme.woodBorder, lineWidth: tone == option ? 0 : 1))
                                    }
                                }
                            }
                        }
                        if tone == .custom {
                            TextField("e.g. cozy mystery, cosmic horror, heist caper", text: $customTone)
                                .font(Theme.body)
                                .foregroundStyle(Theme.parchment)
                                .padding(12)
                                .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.small)
                            .foregroundStyle(Theme.blood)
                            .tavernCard(accent: Theme.blood)
                    }

                    Button {
                        Task { await forge() }
                    } label: {
                        Label("Forge my hero", systemImage: "hammer.fill")
                    }
                    .buttonStyle(EmberButtonStyle())
                    .disabled(!canForge)
                    .opacity(canForge ? 1 : 0.5)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)

            if isForging {
                forgingOverlay
            }
        }
        .navigationTitle("New adventure")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private var forgingOverlay: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView()
                    .tint(Theme.ember)
                    .scaleEffect(1.4)
                Text(forgingLine)
                    .font(Theme.display(18, weight: .medium))
                    .foregroundStyle(Theme.parchment)
                    .multilineTextAlignment(.center)
                    .contentTransition(.opacity)
                Text("This takes a little while. Good heroes always do.")
                    .font(Theme.small)
                    .foregroundStyle(Theme.muted)
            }
            .padding(28)
            .tavernCard(accent: Theme.ember)
            .padding(32)
        }
        .task {
            var index = 0
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(3))
                index = (index + 1) % ForgeCharacterView.forgingLines.count
                withAnimation { forgingLine = ForgeCharacterView.forgingLines[index] }
            }
        }
    }

    private func forge() async {
        editorFocused = false
        isForging = true
        errorMessage = nil
        defer { isForging = false }
        do {
            let game = try await settings.client.createGame(
                background: background.trimmingCharacters(in: .whitespacesAndNewlines),
                tone: effectiveTone,
                name: name.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            path.append(.pick(game))
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

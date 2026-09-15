import SwiftUI

struct SettingsView: View {
    @Environment(AppSettings.self) private var settings
    @Environment(\.dismiss) private var dismiss
    @State private var testResult: String?
    @State private var isTesting = false

    var body: some View {
        @Bindable var settings = settings
        NavigationStack {
            Form {
                Section {
                    TextField("http://192.168.1.20:8787", text: $settings.serverURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Optional bearer token", text: $settings.apiToken)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("Game server")
                } footer: {
                    Text("Run the server from the repo's server folder. In the iOS Simulator, http://localhost:8787 works. On a real iPhone, use your Mac's local network address (plain http is allowed on the local network). A server deployed elsewhere must use https. The token must match GAME_API_TOKEN on the server if you set one.")
                }

                Section {
                    Button {
                        Task { await test() }
                    } label: {
                        HStack {
                            Text("Test connection")
                            Spacer()
                            if isTesting { ProgressView() }
                        }
                    }
                    if let testResult {
                        Text(testResult)
                            .font(.footnote)
                    }
                }

                Section {
                    Text("Old Tavern is a solo, AI-narrated adventure in the spirit of tabletop Dungeons & Dragons. Your character, the people you meet and the road ahead are written as you play.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("About")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        settings.save()
                        dismiss()
                    }
                }
            }
            .onChange(of: settings.serverURL) { _, _ in settings.save() }
            .onChange(of: settings.apiToken) { _, _ in settings.save() }
        }
        .preferredColorScheme(.dark)
    }

    @MainActor
    private func test() async {
        isTesting = true
        defer { isTesting = false }
        do {
            let ok = try await settings.client.health()
            testResult = ok ? "The tavern door is open." : "The server answered, but not as expected."
        } catch {
            testResult = "No answer: \(error.localizedDescription)"
        }
    }
}

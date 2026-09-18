import SwiftUI

@main
struct OldTavernApp: App {
    @State private var settings = AppSettings()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .preferredColorScheme(.dark)
                .tint(Theme.ember)
        }
    }
}

/// Picks the play surface. "Play in Claude" wraps the artifact and needs no keys;
/// "Own game server" is the native client for the repo's server.
struct RootView: View {
    @Environment(AppSettings.self) private var settings

    var body: some View {
        switch settings.playMode {
        case .claude:
            NavigationStack {
                ClaudeTavernView()
                    .navigationBarTitleDisplayMode(.inline)
            }
        case .server:
            TavernHomeView()
        }
    }
}

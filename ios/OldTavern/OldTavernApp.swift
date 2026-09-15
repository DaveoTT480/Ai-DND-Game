import SwiftUI

@main
struct OldTavernApp: App {
    @State private var settings = AppSettings()

    var body: some Scene {
        WindowGroup {
            TavernHomeView()
                .environment(settings)
                .preferredColorScheme(.dark)
                .tint(Theme.ember)
        }
    }
}

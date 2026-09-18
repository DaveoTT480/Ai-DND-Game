import Foundation
import Observation

/// How the app reaches the Dungeon Master.
enum PlayMode: String, CaseIterable, Identifiable {
    /// Through the claude.ai Artifact, on the player's own Claude subscription. No keys.
    case claude
    /// Through the repo's game server, which needs an Anthropic API key.
    case server

    var id: String { rawValue }

    var title: String {
        switch self {
        case .claude: "Play in Claude"
        case .server: "Own game server"
        }
    }
}

@Observable
final class AppSettings {
    static let defaultServerURL = "http://localhost:8787"
    /// The published tavern artifact. Change it in Settings if you publish your own copy.
    static let defaultArtifactURL = "https://claude.ai/artifact/EkQVuXbU3EEc51Pps6S7P2"

    var playMode: PlayMode
    var artifactURL: String
    var serverURL: String
    var apiToken: String

    private enum Keys {
        static let playMode = "playMode"
        static let artifactURL = "artifactURL"
        static let serverURL = "serverURL"
        static let apiToken = "apiToken"
    }

    init() {
        let defaults = UserDefaults.standard
        playMode = PlayMode(rawValue: defaults.string(forKey: Keys.playMode) ?? "") ?? .claude
        artifactURL = defaults.string(forKey: Keys.artifactURL) ?? Self.defaultArtifactURL
        serverURL = defaults.string(forKey: Keys.serverURL) ?? Self.defaultServerURL
        apiToken = defaults.string(forKey: Keys.apiToken) ?? ""
    }

    func save() {
        let defaults = UserDefaults.standard
        defaults.set(playMode.rawValue, forKey: Keys.playMode)
        defaults.set(artifactURL, forKey: Keys.artifactURL)
        defaults.set(serverURL, forKey: Keys.serverURL)
        defaults.set(apiToken, forKey: Keys.apiToken)
    }

    var client: APIClient {
        var trimmed = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty, !trimmed.lowercased().hasPrefix("http://"), !trimmed.lowercased().hasPrefix("https://") {
            trimmed = "http://" + trimmed
        }
        let url = URL(string: trimmed) ?? URL(string: Self.defaultServerURL)!
        return APIClient(baseURL: url, token: apiToken.trimmingCharacters(in: .whitespacesAndNewlines))
    }
}

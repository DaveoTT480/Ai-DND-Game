import Foundation
import Observation

@Observable
final class AppSettings {
    static let defaultServerURL = "http://localhost:8787"

    var serverURL: String
    var apiToken: String

    private enum Keys {
        static let serverURL = "serverURL"
        static let apiToken = "apiToken"
    }

    init() {
        let defaults = UserDefaults.standard
        serverURL = defaults.string(forKey: Keys.serverURL) ?? Self.defaultServerURL
        apiToken = defaults.string(forKey: Keys.apiToken) ?? ""
    }

    func save() {
        let defaults = UserDefaults.standard
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

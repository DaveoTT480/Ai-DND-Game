import Foundation

struct APIError: LocalizedError {
    let message: String
    let status: Int

    var errorDescription: String? { message }
}

/// Thin async client for the Old Tavern server (see server/src/app.ts).
struct APIClient {
    var baseURL: URL
    var token: String

    private struct GameEnvelope: Decodable { let game: GameSnapshot }
    private struct ListEnvelope: Decodable { let games: [GameSummary] }
    private struct ErasEnvelope: Decodable { let eras: [Era] }
    private struct ErrorEnvelope: Decodable { let error: String }

    func health() async throws -> Bool {
        let (_, response) = try await URLSession.shared.data(for: makeRequest(path: "/health", method: "GET", body: nil, timeout: 10))
        return (response as? HTTPURLResponse)?.statusCode == 200
    }

    func listGames() async throws -> [GameSummary] {
        let envelope: ListEnvelope = try await request(path: "/api/games")
        return envelope.games
    }

    func getGame(id: String) async throws -> GameSnapshot {
        let envelope: GameEnvelope = try await request(path: "/api/games/\(id)")
        return envelope.game
    }

    /// Painted portrait bytes for a game, or nil when the server has none.
    func portraitData(id: String) async -> Data? {
        guard let request = try? makeRequest(path: "/api/games/\(id)/portrait", method: "GET", body: nil, timeout: 30) else { return nil }
        guard let result = try? await URLSession.shared.data(for: request), (result.1 as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return result.0
    }

    func listEras() async throws -> [Era] {
        let envelope: ErasEnvelope = try await request(path: "/api/eras")
        return envelope.eras
    }

    func createGame(background: String, tone: String, name: String, eraId: String, customEra: String) async throws -> GameSnapshot {
        let envelope: GameEnvelope = try await request(
            path: "/api/games",
            method: "POST",
            body: ["background": background, "tone": tone, "name": name, "eraId": eraId, "customEra": customEra]
        )
        return envelope.game
    }

    /// Ask the server to paint (or repaint) the portrait now.
    func paintPortrait(id: String) async throws -> GameSnapshot {
        let envelope: GameEnvelope = try await request(path: "/api/games/\(id)/portrait", method: "POST", body: [:])
        return envelope.game
    }

    func rerollScenarios(id: String) async throws -> GameSnapshot {
        let envelope: GameEnvelope = try await request(path: "/api/games/\(id)/reroll", method: "POST", body: [:])
        return envelope.game
    }

    func startGame(id: String, scenarioId: String?, customScenario: String?) async throws -> GameSnapshot {
        let envelope: GameEnvelope = try await request(
            path: "/api/games/\(id)/start",
            method: "POST",
            body: ["scenarioId": scenarioId, "customScenario": customScenario]
        )
        return envelope.game
    }

    func takeTurn(id: String, choiceId: String?, freeText: String?) async throws -> GameSnapshot {
        let envelope: GameEnvelope = try await request(
            path: "/api/games/\(id)/turn",
            method: "POST",
            body: ["choiceId": choiceId, "freeText": freeText]
        )
        return envelope.game
    }

    func deleteGame(id: String) async throws {
        struct OK: Decodable { let ok: Bool }
        let _: OK = try await request(path: "/api/games/\(id)", method: "DELETE")
    }

    // MARK: - Plumbing

    private func makeRequest(path: String, method: String, body: [String: String?]?, timeout: TimeInterval) throws -> URLRequest {
        // Join so that a base with a path prefix (https://host/tavern) is preserved.
        var base = baseURL.absoluteString
        if !base.hasSuffix("/") { base += "/" }
        let relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        guard let baseWithSlash = URL(string: base), let url = URL(string: relative, relativeTo: baseWithSlash)?.absoluteURL else {
            throw APIError(message: "Bad server URL. Check Settings.", status: 0)
        }
        var request = URLRequest(url: url, timeoutInterval: timeout)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let compact = body.compactMapValues { $0 }
            request.httpBody = try JSONSerialization.data(withJSONObject: compact)
        }
        return request
    }

    private func request<T: Decodable>(path: String, method: String = "GET", body: [String: String?]? = nil) async throws -> T {
        // Story turns can take a while: the Dungeon Master is thinking.
        let request = try makeRequest(path: path, method: method, body: body, timeout: 180)
        let result: (Data, URLResponse)
        do {
            result = try await URLSession.shared.data(for: request)
        } catch {
            throw APIError(message: "Could not reach the tavern server. Is it running, and is the address right in Settings?", status: 0)
        }
        let (data, response) = result
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode(ErrorEnvelope.self, from: data))?.error ?? "Server error \(status)"
            throw APIError(message: message, status: status)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError(message: "The server's answer could not be read: \(error.localizedDescription)", status: status)
        }
    }
}

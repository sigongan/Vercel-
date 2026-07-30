import Foundation

/// Typed client for the Next.js API that already backs the web app. Every
/// route is unchanged from what the website calls — the native app just
/// authenticates with a bearer token instead of cookies.
///
/// Deliberately not a singleton: the base URL and auth store are injected so
/// tests and previews can point at a stub without touching global state.
actor APIClient {
    private let baseURL: URL
    private let auth: AuthStore
    private let session: URLSession

    init(baseURL: URL, auth: AuthStore, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.auth = auth
        self.session = session
    }

    // MARK: - Errors

    enum APIError: LocalizedError {
        case notSignedIn
        case quotaExceeded
        case rateLimited
        case proRequired
        case server(status: Int, message: String?)
        case decoding(underlying: Error)

        var errorDescription: String? {
            switch self {
            case .notSignedIn:
                return "You need to be signed in to do that."
            case .quotaExceeded:
                return "You've used all your free extractions this month."
            case .rateLimited:
                return "Too many requests — give it a moment and try again."
            case .proRequired:
                return "Saving recipes to your account is a Pro feature."
            case let .server(status, message):
                return message ?? "The server returned an error (\(status))."
            case .decoding:
                return "The server sent something this version of the app doesn't understand."
            }
        }
    }

    // MARK: - Responses

    struct Me: Codable, Sendable {
        var signedIn: Bool
        var email: String?
        var name: String?
        var credits: Int?
        var freeUsedThisPeriod: Int?
        var plan: String?

        var isPro: Bool { plan == "pro" }

        enum CodingKeys: String, CodingKey {
            case signedIn, email, name, credits, plan
            case freeUsedThisPeriod = "free_used_this_period"
        }
    }

    struct SavedRecipesResponse: Codable, Sendable {
        var signedIn: Bool
        var plan: String?
        var recipes: [SavedRecipe]?
    }

    private struct ExtractSuccess: Codable { let recipe: Recipe }
    private struct ErrorBody: Codable { let error: String?; let code: String? }

    // MARK: - Auth
    //
    // Sign-in lives here rather than being called directly from the view
    // because this is what owns `baseURL` — one place decides which server the
    // app talks to, and sign-in is not an exception to that.

    func signInWithApple(
        identityToken: String,
        rawNonce: String,
        fullName: PersonNameComponents?
    ) async throws -> AppleAuth.SignInResult {
        try await AppleAuth.signIn(
            identityToken: identityToken,
            rawNonce: rawNonce,
            fullName: fullName,
            baseURL: baseURL
        )
    }

    /// Hands Apple's signed transaction to the server for the verification
    /// that actually grants Pro — StoreKit's own on-device check
    /// (`VerificationResult`) is necessary but never sufficient here.
    func verifyPurchase(signedTransaction: String) async throws {
        var req = request(path: "/api/apple/verify-purchase")
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["signedTransaction": signedTransaction])
        _ = try await raw(req)
    }

    /// Tells the server to revoke a session.
    ///
    /// Takes the token explicitly rather than reading it from the auth store,
    /// because the app clears its local copy *first* — a user who taps sign
    /// out must end up signed out even with no signal. Reading the store here
    /// would find it already empty and send an unauthenticated request, which
    /// the server would cheerfully answer "signed out" to while leaving the
    /// session very much alive.
    func signOut(token: String) async throws {
        var req = request(path: "/api/auth/signout")
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        // Deliberately not via `raw`, which would layer the store's (now
        // absent) token over the one passed in.
        _ = try await session.data(for: req)
    }

    // MARK: - Endpoints

    func me() async throws -> Me {
        try await send(request(path: "/api/me"))
    }

    func savedRecipes() async throws -> SavedRecipesResponse {
        try await send(request(path: "/api/recipes"))
    }

    func deleteSavedRecipe(id: String) async throws {
        var req = request(path: "/api/recipes/\(id)")
        req.httpMethod = "DELETE"
        _ = try await raw(req)
    }

    /// Permanently deletes the account and everything attached to it.
    /// Required by guideline 5.1.1(v) — POST, not DELETE, to match the route.
    func deleteAccount() async throws {
        var req = request(path: "/api/account/delete")
        req.httpMethod = "POST"
        _ = try await raw(req)
    }

    /// Saves a recipe to the account. The route requires a Pro plan and
    /// answers 402 otherwise, which surfaces as `.proRequired`.
    func saveRecipe(_ recipe: Recipe) async throws {
        var req = request(path: "/api/recipes")
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONCoding.encoder.encode(["recipe": recipe])
        _ = try await raw(req)
    }

    /// Extracts from a link or pasted text. `lang` is the recipe's output
    /// language, matching the web app's language picker.
    func extract(kind: ExtractKind, lang: String) async throws -> Recipe {
        var req = request(path: "/api/extract-recipe")
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(kind.payload(lang: lang))
        let result: ExtractSuccess = try await send(req)
        return result.recipe
    }

    /// Extracts from a photo, screenshot, or PDF. Multipart rather than JSON
    /// because the route reads it with `formData()`.
    func extract(fileData: Data, filename: String, mimeType: String, lang: String) async throws -> Recipe {
        let boundary = "avocato.\(UUID().uuidString)"
        var req = request(path: "/api/extract-recipe")
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        func append(_ string: String) { body.append(Data(string.utf8)) }

        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(fileData)
        append("\r\n--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"lang\"\r\n\r\n")
        append("\(lang)\r\n")
        append("--\(boundary)--\r\n")

        req.httpBody = body
        let result: ExtractSuccess = try await send(req)
        return result.recipe
    }

    enum ExtractKind: Sendable {
        case url(String)
        case text(String)
        /// "What can I make with what's in my fridge" mode.
        case pantry(String)

        fileprivate func payload(lang: String) -> [String: String] {
            switch self {
            case let .url(value): return ["kind": "url", "url": value, "lang": lang]
            case let .text(value): return ["kind": "text", "text": value, "lang": lang]
            case let .pantry(value): return ["kind": "pantry", "text": value, "lang": lang]
            }
        }
    }

    // MARK: - Plumbing

    private func request(path: String) -> URLRequest {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        return req
    }

    private func authorized(_ request: URLRequest) async -> URLRequest {
        var req = request
        if let token = await auth.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return req
    }

    private func raw(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: await authorized(request))
        guard let http = response as? HTTPURLResponse else {
            return data
        }

        guard (200..<300).contains(http.statusCode) else {
            let body = try? JSONDecoder().decode(ErrorBody.self, from: data)
            switch body?.code {
            case "AUTH_REQUIRED": throw APIError.notSignedIn
            case "QUOTA_EXCEEDED": throw APIError.quotaExceeded
            case "RATE_LIMITED": throw APIError.rateLimited
            default:
                // Routes outside the extraction pipeline answer with a plain
                // message and no code, so fall back to the status.
                switch http.statusCode {
                case 401: throw APIError.notSignedIn
                case 402: throw APIError.proRequired
                default: throw APIError.server(status: http.statusCode, message: body?.error)
                }
            }
        }

        return data
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data = try await raw(request)
        do {
            return try JSONCoding.decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(underlying: error)
        }
    }
}

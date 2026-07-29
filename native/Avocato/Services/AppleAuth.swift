import AuthenticationServices
import CryptoKit
import Foundation

/// Sign in with Apple, exchanged for a Supabase session.
///
/// Apple hands back an identity token; Supabase's GoTrue accepts that
/// directly via `grant_type=id_token`, so there's no server round-trip of our
/// own to write — the app talks to Supabase, gets access/refresh tokens, and
/// from then on every API call carries the bearer token that
/// `getSupabaseUser()` (lib/supabase/server.ts) already understands.
///
/// Apple never provides a profile photo through this API — only name and
/// email, and the name only on the *first* authorization for a given Apple
/// ID. That's why the profile avatar is a colored initial and not a picture.
enum AppleAuth {
    enum AuthError: LocalizedError {
        case missingConfiguration
        case missingIdentityToken
        case exchangeFailed(String)

        var errorDescription: String? {
            switch self {
            case .missingConfiguration:
                return "Sign-in isn't configured in this build."
            case .missingIdentityToken:
                return "Apple didn't return a sign-in token. Please try again."
            case let .exchangeFailed(message):
                return message
            }
        }
    }

    // MARK: - Nonce
    //
    // Supabase requires the nonce for the id_token grant, and it guards
    // against a stolen Apple token being replayed: the hash goes to Apple
    // inside the signed token, the raw value goes to Supabase, and Supabase
    // checks they match. Generate one per sign-in attempt, never reuse.

    static func makeNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        for _ in 0..<length {
            // SystemRandomNumberGenerator is cryptographically secure on
            // Apple platforms, which matters here — a predictable nonce
            // defeats the point of having one.
            result.append(charset.randomElement()!)
        }
        return result
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }

    // MARK: - Exchange

    private struct TokenResponse: Decodable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
        }
    }

    private struct ErrorResponse: Decodable {
        let error: String?
        let errorDescription: String?
        let message: String?

        enum CodingKeys: String, CodingKey {
            case error
            case errorDescription = "error_description"
            case message
        }
    }

    /// Trades Apple's identity token for a Supabase session.
    static func exchange(identityToken: String, rawNonce: String) async throws -> AuthStore.Session {
        guard
            let base = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
            let anonKey = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String,
            let url = URL(string: "\(base)/auth/v1/token?grant_type=id_token")
        else { throw AuthError.missingConfiguration }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "provider": "apple",
            "id_token": identityToken,
            "nonce": rawNonce,
        ])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw AuthError.exchangeFailed(
                body?.errorDescription ?? body?.message ?? body?.error ?? "Sign-in failed. Please try again."
            )
        }

        let token = try JSONDecoder().decode(TokenResponse.self, from: data)
        return AuthStore.Session(
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: Date().addingTimeInterval(TimeInterval(token.expiresIn))
        )
    }

    /// Pulls the identity token out of a completed authorization.
    static func identityToken(from authorization: ASAuthorization) throws -> String {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let token = String(data: tokenData, encoding: .utf8)
        else { throw AuthError.missingIdentityToken }
        return token
    }
}

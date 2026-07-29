import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

/// Sign in with Apple, exchanged for a session on our own server.
///
/// The app never talks to an identity provider other than Apple. Apple hands
/// back a signed identity token; we post it to `/api/auth/apple`, which
/// verifies it against Apple's public keys and returns a session token of
/// ours. Apple's token is proof of identity for that one request and is never
/// stored on either side.
///
/// Apple never provides a profile photo through this API — only name and
/// email, and both only on the *first* authorization for a given Apple ID.
/// That is why the profile avatar is a coloured initial and not a picture, and
/// why the name is passed along on that first sign-in: it is the only chance
/// to record it.
enum AppleAuth {
    enum AuthError: LocalizedError {
        case missingIdentityToken
        case signInFailed(String)

        var errorDescription: String? {
            switch self {
            case .missingIdentityToken:
                return "Apple didn't return a sign-in token. Please try again."
            case let .signInFailed(message):
                return message
            }
        }
    }

    // MARK: - Nonce
    //
    // Binds the identity token to this one sign-in attempt. The SHA-256 goes
    // to Apple, which embeds it in the signed token; the raw value goes to our
    // server, which hashes it and checks the two match. A token captured
    // elsewhere therefore cannot be replayed against us. Generate one per
    // attempt, never reuse.

    static func makeNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        for _ in 0..<length {
            // SystemRandomNumberGenerator is cryptographically secure on Apple
            // platforms, which matters here — a predictable nonce defeats the
            // entire point of having one.
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

    struct SignInResult: Sendable {
        let session: AuthStore.Session
        let email: String?
        let name: String?
        let isNewAccount: Bool
    }

    private struct SignInResponse: Decodable {
        struct User: Decodable {
            let id: String
            let email: String?
            let name: String?
        }

        let token: String
        let expiresAt: Date
        let user: User
        let isNewAccount: Bool
    }

    private struct ErrorResponse: Decodable {
        let error: String?
        let code: String?
    }

    /// Trades Apple's identity token for one of ours.
    ///
    /// `fullName` is only non-nil on a user's very first authorization; it is
    /// passed straight through so the server can record it then, because Apple
    /// will never send it again.
    static func signIn(
        identityToken: String,
        rawNonce: String,
        fullName: PersonNameComponents?,
        baseURL: URL
    ) async throws -> SignInResult {
        var request = URLRequest(url: baseURL.appendingPathComponent("/api/auth/apple"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        var body: [String: Any] = [
            "identityToken": identityToken,
            "rawNonce": rawNonce,
            "clientName": deviceDescription,
        ]
        if let fullName {
            var name: [String: String] = [:]
            if let given = fullName.givenName { name["givenName"] = given }
            if let family = fullName.familyName { name["familyName"] = family }
            if !name.isEmpty { body["fullName"] = name }
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw AuthError.signInFailed(body?.error ?? "Sign-in failed. Please try again.")
        }

        let decoded = try JSONCoding.decoder.decode(SignInResponse.self, from: data)

        return SignInResult(
            session: AuthStore.Session(token: decoded.token, expiresAt: decoded.expiresAt),
            email: decoded.user.email,
            name: decoded.user.name,
            isNewAccount: decoded.isNewAccount
        )
    }

    /// Labels the session in the user's "signed-in devices" list. Descriptive
    /// only — the server never makes a decision based on it.
    private static var deviceDescription: String {
        UIDevice.current.model
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

    /// The name Apple supplies alongside the token, on first authorization only.
    static func fullName(from authorization: ASAuthorization) -> PersonNameComponents? {
        (authorization.credential as? ASAuthorizationAppleIDCredential)?.fullName
    }
}

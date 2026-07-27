import Foundation
import Security

/// Holds the Supabase session for the native app.
///
/// The web app keeps its session in cookies; there is no cookie jar to share
/// with URLSession here, so the native client is token-based and sends
/// `Authorization: Bearer <accessToken>` instead. The server accepts both —
/// see `getSupabaseUser()` in lib/supabase/server.ts.
///
/// Tokens live in the Keychain, not UserDefaults: a refresh token is a
/// long-lived credential, and UserDefaults is plaintext in the app container.
/// `kSecAttrAccessibleAfterFirstUnlock` lets a background refresh work while
/// the phone is locked, without syncing the credential to other devices.
@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var session: Session?

    var accessToken: String? { session?.accessToken }
    var isSignedIn: Bool { session != nil }

    private let service = "app.avocato.ios.session"
    private let account = "supabase"

    struct Session: Codable, Sendable {
        var accessToken: String
        var refreshToken: String
        /// Absolute expiry, not a duration — a duration decoded from disk on
        /// next launch would be measured from the wrong starting point.
        var expiresAt: Date

        /// Treated as expired a minute early so a request doesn't start with a
        /// token that lapses mid-flight.
        var isExpired: Bool { Date() >= expiresAt.addingTimeInterval(-60) }
    }

    init() {
        session = loadFromKeychain()
    }

    func save(_ session: Session) {
        self.session = session
        guard let data = try? JSONEncoder().encode(session) else { return }

        // SecItemAdd fails with errSecDuplicateItem rather than overwriting,
        // so clear first — this runs on every token refresh, not just sign-in.
        SecItemDelete(baseQuery() as CFDictionary)
        var attributes = baseQuery()
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    func signOut() {
        session = nil
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    private func loadFromKeychain() -> Session? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let session = try? JSONDecoder().decode(Session.self, from: data)
        else { return nil }

        return session
    }
}

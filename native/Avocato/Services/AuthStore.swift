import Combine
import Foundation
import Security

/// Holds the session token for the native app.
///
/// The token is issued by our own `/api/auth/apple` endpoint and sent as
/// `Authorization: Bearer <token>` on every request. It is opaque — the app
/// cannot read anything out of it, and does not need to. Expiry is the
/// server's business; the app just holds the token until the server stops
/// accepting it.
///
/// Stored in the Keychain rather than UserDefaults, which is plaintext in the
/// app container. `kSecAttrAccessibleAfterFirstUnlock` keeps it readable while
/// the phone is locked (so a background refresh works) without syncing the
/// credential to the user's other devices.
@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var session: Session?

    var accessToken: String? { session?.token }
    var isSignedIn: Bool { session != nil }

    private let service = "app.avocato.ios.session"
    /// Changed from "supabase" when the app stopped using Supabase Auth. The
    /// new name means any token left over from that system is simply never
    /// read — it belongs to a different server and would only ever be
    /// rejected, so there is nothing to migrate.
    private let account = "avocato.session"

    struct Session: Codable, Sendable {
        var token: String

        /// Absolute expiry, not a duration — a duration decoded from disk on
        /// the next launch would be measured from the wrong starting point.
        ///
        /// Advisory only. The server slides this forward as the app is used,
        /// so the stored value is a floor rather than a deadline; it exists so
        /// the app can show a sign-in screen instead of firing off a request
        /// it already knows will fail.
        var expiresAt: Date

        var isExpired: Bool { Date() >= expiresAt }
    }

    init() {
        session = loadFromKeychain()
    }

    func save(_ session: Session) {
        self.session = session
        guard let data = try? JSONEncoder().encode(session) else { return }

        // SecItemAdd fails with errSecDuplicateItem rather than overwriting,
        // so clear first.
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

        // A stored session past its expiry is worth discarding here rather
        // than carrying to the first request that will be rejected anyway.
        guard !session.isExpired else {
            SecItemDelete(baseQuery() as CFDictionary)
            return nil
        }

        return session
    }
}

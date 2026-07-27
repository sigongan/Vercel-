import SwiftUI

/// Entry point for the native app.
///
/// This is the replacement for the Capacitor shell: the UI is SwiftUI, and
/// the Next.js deployment is now purely a backend (plus the marketing site).
/// The app talks to it over the same REST routes the website uses, with a
/// bearer token instead of cookies.
@main
struct AvocatoApp: App {
    @StateObject private var auth = AuthStore()

    /// Set in Info.plist so debug builds can point at a local `next dev`
    /// without touching code. Falls back to production.
    private static var apiBaseURL: URL {
        let configured = Bundle.main.object(forInfoDictionaryKey: "AvocatoAPIBaseURL") as? String
        return URL(string: configured ?? "") ?? URL(string: "https://avocato.app")!
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(auth)
                .environment(\.apiClient, APIClient(baseURL: Self.apiBaseURL, auth: auth))
                .tint(Palette.accent)
        }
    }
}

private struct APIClientKey: EnvironmentKey {
    /// Optional, and nil by default, because the obvious alternative —
    /// building a throwaway client here — would have to construct an
    /// `AuthStore`, which is `@MainActor`-isolated and cannot be created from
    /// this nonisolated static context. A view that needs the client unwraps
    /// it; previews simply get nil.
    static let defaultValue: APIClient? = nil
}

extension EnvironmentValues {
    var apiClient: APIClient? {
        get { self[APIClientKey.self] }
        set { self[APIClientKey.self] = newValue }
    }
}

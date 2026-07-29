import SwiftUI

/// Entry point for the native app.
///
/// This is the replacement for the Capacitor shell: the UI is SwiftUI, and
/// the Next.js deployment is now purely a backend (plus the marketing site).
/// The app talks to it over the same REST routes the website uses, with a
/// bearer token instead of cookies.
@main
struct AvocatoApp: App {
    @StateObject private var auth: AuthStore
    /// One shared instance for the whole app — Extract writes to it, Library
    /// and Home read from it. A per-screen instance would mean an extraction
    /// on the Extract tab never showed up anywhere else until the next
    /// server round trip.
    @StateObject private var repository: RecipeRepository
    private let apiClient: APIClient

    /// Built in `init()`, not as property defaults, because `repository`
    /// depends on `apiClient` depending on `auth` — property initializers
    /// run in declaration order with no guaranteed access to sibling values,
    /// `init` does.
    init() {
        let auth = AuthStore()
        let client = APIClient(baseURL: Self.apiBaseURL, auth: auth)
        _auth = StateObject(wrappedValue: auth)
        _repository = StateObject(wrappedValue: RecipeRepository(api: client))
        self.apiClient = client
    }

    /// Set in Info.plist so debug builds can point at a local `next dev`
    /// without touching code.
    ///
    /// The fallback is the live Vercel deployment, not the `avocato.app`
    /// domain named in capacitor.config.ts — that domain is reserved but not
    /// yet connected, so pointing here would silently fail every request.
    /// Swap this the same day the custom domain goes live.
    private static var apiBaseURL: URL {
        let configured = Bundle.main.object(forInfoDictionaryKey: "AvocatoAPIBaseURL") as? String
        return URL(string: configured ?? "") ?? URL(string: "https://vercel-ecru-iota-55.vercel.app")!
    }

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(auth)
                .environmentObject(repository)
                .environment(\.apiClient, apiClient)
                .tint(Palette.accent)
                // Offline-first: whatever's already on disk renders before
                // any network request is even sent.
                .task { await repository.loadFromDisk() }
        }
    }
}

/// Owns the brief launch-to-tabs handoff. A separate `View` rather than
/// putting `@State` directly on `AvocatoApp` — `@State` is designed for the
/// view identity/lifecycle system, and `App` conformers sit outside that;
/// giving the state a real View to live on is the supported shape.
private struct AppRootView: View {
    @State private var showLaunch = true

    var body: some View {
        ZStack {
            RootTabView()
            if showLaunch {
                LaunchView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
                withAnimation(.easeOut(duration: 0.35)) {
                    showLaunch = false
                }
            }
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

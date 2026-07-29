import Combine
import Foundation

/// Offline-first source of truth for the recipe screens.
///
/// The rule everywhere here: **disk first, network second.** Views get
/// whatever is already on the device immediately, then a refresh happens
/// behind them. A failed request never blanks the screen — it just leaves the
/// last known copy in place and flips `isOffline` so the UI can say so.
///
/// This is why the recipe list has no spinner-on-launch: there is nothing to
/// wait for. The network is an update, not a prerequisite.
@MainActor
final class RecipeRepository: ObservableObject {
    /// Account recipes, from disk until a refresh replaces them.
    @Published private(set) var saved: [SavedRecipe] = []
    /// Extractions made on this device. Local-only — these never had a server
    /// copy, so the on-disk file is the only copy.
    @Published private(set) var recent: [RecipeStore.RecentRecipe] = []
    /// True when the last refresh couldn't reach the server. What's on screen
    /// is still real, just possibly stale.
    @Published private(set) var isOffline = false

    private let api: APIClient
    private let store: RecipeStore

    init(api: APIClient, store: RecipeStore = RecipeStore()) {
        self.api = api
        self.store = store
    }

    /// Populates from disk. Cheap and offline-safe — call it before the first
    /// render, not after.
    func loadFromDisk() async {
        saved = await store.savedRecipes()
        recent = await store.recentRecipes()
    }

    /// Refreshes account recipes from the server, keeping the cached copy if
    /// the request fails.
    func refreshSaved() async {
        do {
            let response = try await api.savedRecipes()
            isOffline = false

            // Only overwrite the cache for a signed-in response. Signed out,
            // the server legitimately returns nothing — treating that as
            // "the account has no recipes" would wipe the offline copy of a
            // session that's merely expired, and the user would open the app
            // in a kitchen to an empty library.
            guard response.signedIn else { return }

            let fresh = response.recipes ?? []
            await store.replaceSaved(with: fresh)
            saved = fresh
        } catch is CancellationError {
            // View went away mid-flight; not an offline signal.
        } catch {
            isOffline = true
        }
    }

    /// Records an extraction locally so it survives a relaunch even though it
    /// was never saved to an account.
    func rememberExtraction(_ recipe: Recipe) async {
        await store.addRecent(recipe)
        recent = await store.recentRecipes()
    }

    func removeRecent(id: String) async {
        await store.removeRecent(id: id)
        recent = await store.recentRecipes()
    }

    /// Deletes an account recipe, updating the local copy only once the
    /// server has accepted it — an optimistic removal that then failed would
    /// leave the recipe gone locally but alive on every other device.
    func deleteSaved(id: String) async throws {
        try await api.deleteSavedRecipe(id: id)
        saved.removeAll { $0.id == id }
        await store.replaceSaved(with: saved)
    }

    /// Drops every locally held recipe. Runs on sign-out and behind the
    /// "clear on-device data" setting.
    func clearLocalData() async {
        await store.clear()
        saved = []
        recent = []
    }
}

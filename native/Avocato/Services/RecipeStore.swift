import Foundation

/// On-disk store for recipes, so the app opens and works with no network.
///
/// This is the thing the Capacitor build could never do. There, the whole UI
/// was a remote URL: with no connection the web view had nothing to load, so
/// recipes already sitting in localStorage on the user's own phone were
/// unreachable. A recipe app that goes blank in a kitchen with bad wifi is
/// worse than a screenshot.
///
/// Files rather than SwiftData: the models are already `Codable`, the working
/// set is dozens of recipes rather than thousands, and there are no queries to
/// speak of — a store this size gets nothing from a database except schema
/// migrations to get wrong later.
///
/// Written to Application Support, **not** Caches. The system evicts Caches
/// under disk pressure, which for locally-extracted recipes that were never
/// sent to a server would mean silently deleting the user's own data.
actor RecipeStore {
    /// A recipe extracted on this device. Mirrors the web app's
    /// `lib/recentRecipes.ts`, which keeps the last fifty locally so closing
    /// the app doesn't lose an extraction that was never saved to an account.
    struct RecentRecipe: Codable, Identifiable, Hashable, Sendable {
        var id: String
        var savedAt: Date
        var recipe: Recipe
    }

    /// Matches the web app's cap. Old entries fall off the end rather than
    /// growing the file without limit.
    private static let recentLimit = 50

    private let directory: URL
    private let savedURL: URL
    private let recentURL: URL

    private var saved: [SavedRecipe]?
    private var recent: [RecentRecipe]?

    init(directory: URL? = nil) {
        let base = directory ?? FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Avocato", isDirectory: true)
        self.directory = base
        self.savedURL = base.appendingPathComponent("saved-recipes.json")
        self.recentURL = base.appendingPathComponent("recent-recipes.json")
    }

    // MARK: - Reading

    /// Recipes saved to the account, as of the last successful sync. Returns
    /// what's on disk without touching the network — callers render this
    /// first and refresh behind it.
    func savedRecipes() -> [SavedRecipe] {
        if let saved { return saved }
        let loaded: [SavedRecipe] = load(from: savedURL) ?? []
        saved = loaded
        return loaded
    }

    func recentRecipes() -> [RecentRecipe] {
        if let recent { return recent }
        let loaded: [RecentRecipe] = load(from: recentURL) ?? []
        recent = loaded
        return loaded
    }

    // MARK: - Writing

    /// Replaces the cached account recipes after a successful fetch. Only
    /// called with a real server response — never with an empty list produced
    /// by a failed request, which would erase the offline copy at exactly the
    /// moment it's needed.
    func replaceSaved(with recipes: [SavedRecipe]) {
        saved = recipes
        write(recipes, to: savedURL)
    }

    /// Records a freshly extracted recipe. Newest first, de-duplicated by id
    /// so re-opening one doesn't stack copies.
    func addRecent(_ recipe: Recipe, id: String = UUID().uuidString) {
        var list = recentRecipes()
        list.removeAll { $0.id == id }
        list.insert(RecentRecipe(id: id, savedAt: Date(), recipe: recipe), at: 0)
        if list.count > Self.recentLimit {
            list = Array(list.prefix(Self.recentLimit))
        }
        recent = list
        write(list, to: recentURL)
    }

    func removeRecent(id: String) {
        var list = recentRecipes()
        list.removeAll { $0.id == id }
        recent = list
        write(list, to: recentURL)
    }

    /// Clears everything this store owns — backs the "clear on-device data"
    /// setting, and runs on sign-out so a shared phone doesn't leak one
    /// account's recipes to the next person.
    func clear() {
        saved = nil
        recent = nil
        try? FileManager.default.removeItem(at: savedURL)
        try? FileManager.default.removeItem(at: recentURL)
    }

    // MARK: - Disk

    private func load<T: Decodable>(from url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        // A decode failure here means the file predates a model change or was
        // truncated. Returning nil falls back to an empty list and the next
        // write repairs it — better than trapping on launch.
        return try? JSONCoding.decoder.decode(T.self, from: data)
    }

    private func write<T: Encodable>(_ value: T, to url: URL) {
        guard let data = try? JSONCoding.encoder.encode(value) else { return }

        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        // Atomic: a crash or a kill mid-write leaves the previous file intact
        // rather than a half-written one that fails to decode next launch.
        try? data.write(to: url, options: .atomic)
    }
}

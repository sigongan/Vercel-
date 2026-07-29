import Foundation

/// Swift mirror of `lib/types/recipe.ts`. The API is the single source of
/// truth for this shape — when that file changes, this one has to follow, or
/// decoding silently drops fields.
///
/// Everything optional on the TypeScript side is optional here too. The AI
/// genuinely omits fields (a recipe scraped from a video often has no prep
/// time, no servings, no nutrition), so optionality is the real contract, not
/// defensive coding.
///
/// Every type below is `nonisolated`: they're plain `Sendable` values meant
/// to cross actor boundaries freely (decoded on `RecipeStore`'s own actor,
/// rendered on the main actor, cached to disk on yet another). A project
/// built with Xcode's "Default Actor Isolation: Main Actor" setting would
/// otherwise implicitly pin them to the main actor, which contradicts that
/// design and breaks anything decoding them off the main thread.

nonisolated enum SourceType: String, Codable, Sendable {
    case image
    case pdf
    case videoFile = "video-file"
    case youtube
    case instagram
    case tiktok
    case url
    case text

    /// Unknown values decode rather than throw: the server can add a source
    /// type in a deploy that ships before the app update that knows about it,
    /// and a whole recipe failing to decode over one tag would be worse than
    /// showing a generic label.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = SourceType(rawValue: raw) ?? .text
    }
}

nonisolated enum Confidence: String, Codable, Sendable {
    case high, medium, low

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = Confidence(rawValue: raw) ?? .medium
    }
}

nonisolated struct Ingredient: Codable, Hashable, Sendable {
    var name: String
    var amount: String?
    /// Set when the source gave no amount and the AI estimated one. The UI
    /// marks these so a cook knows which numbers to trust.
    var estimated: Bool?
}

nonisolated struct RecipeStep: Codable, Hashable, Sendable {
    var order: Int
    var instruction: String
}

/// A component that is itself a mini-recipe — frangipane inside an almond
/// croissant, a curry paste, a marinade. It appears in the parent ingredient
/// list as one line that isn't cookable on its own, so it carries its own
/// ingredients and steps.
nonisolated struct SubRecipe: Codable, Hashable, Sendable, Identifiable {
    /// Sub-recipes are named for the ingredient line they came from, and that
    /// name is only meant to be unique within one recipe's own list — never
    /// persisted or compared across recipes. Fine as an `Identifiable` id for
    /// the same reason: it only has to be stable for one sheet presentation.
    var id: String { name }
    /// Matches the parent ingredient's name exactly so the two read together.
    var name: String
    var yield: String?
    var ingredients: [Ingredient]
    var steps: [RecipeStep]
    /// Set when the source only named the component and the AI reconstructed
    /// it from culinary knowledge.
    var estimated: Bool?
}

/// AI-estimated, per serving. Always approximate — show with a disclaimer.
nonisolated struct Nutrition: Codable, Hashable, Sendable {
    var calories: String?
    var protein: String?
    var carbs: String?
    var fat: String?
}

nonisolated struct Recipe: Codable, Hashable, Sendable {
    var title: String
    var description: String?
    var servings: String?
    var prepTime: String?
    var cookTime: String?
    var ingredients: [Ingredient]
    var steps: [RecipeStep]
    /// Ingredients that have to be made rather than bought.
    var subRecipes: [SubRecipe]?
    var tags: [String]
    var sourceType: SourceType
    var sourceURL: String?
    var confidence: Confidence?
    var notes: String?
    var nutrition: Nutrition?

    enum CodingKeys: String, CodingKey {
        case title, description, servings, prepTime, cookTime
        case ingredients, steps, subRecipes, tags, sourceType
        // The only key whose Swift name differs from the wire format —
        // `sourceUrl` in TypeScript, `sourceURL` here to match Swift's
        // capitalization convention for initialisms.
        case sourceURL = "sourceUrl"
        case confidence, notes, nutrition
    }
}

/// A recipe as stored in `saved_recipes` and returned by `GET /api/recipes`.
nonisolated struct SavedRecipe: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var title: String
    var recipe: Recipe
    var collection: String?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, recipe, collection
        case createdAt = "created_at"
    }
}

import SwiftUI

/// A freshly extracted (or saved) recipe: title, metadata, ingredients,
/// steps, and any components it depends on. This is the app's actual
/// product — the screen most worth getting right visually.
struct RecipeDetailView: View {
    let recipe: Recipe
    var onSave: (() -> Void)?

    @State private var openSubRecipe: SubRecipe?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                if !metaChips.isEmpty { metaRow }
                if let description = recipe.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(Palette.secondary)
                }
                ingredientsSection
                if let subRecipes = recipe.subRecipes, !subRecipes.isEmpty {
                    subRecipesSection(subRecipes)
                }
                stepsSection
                if let nutrition = recipe.nutrition { nutritionSection(nutrition) }
            }
            .padding(20)
        }
        .background(Palette.cream.ignoresSafeArea())
        .sheet(item: $openSubRecipe) { sub in
            SubRecipeDetailSheet(sub: sub)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                Text(recipe.title)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Palette.ink)
                Spacer()
                if let onSave {
                    Button(action: onSave) {
                        Image(systemName: "bookmark")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Palette.accent)
                    }
                    .minimumTapTarget()
                }
            }
            if let confidence = recipe.confidence, confidence == .low {
                Label("This one's a rough extraction — worth double-checking.", systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
    }

    // MARK: - Meta chips (servings / prep / cook)

    private var metaChips: [(icon: String, label: String)] {
        var chips: [(String, String)] = []
        if let servings = recipe.servings, !servings.isEmpty { chips.append(("person.2", servings)) }
        if let prep = recipe.prepTime, !prep.isEmpty { chips.append(("timer", "Prep \(prep)")) }
        if let cook = recipe.cookTime, !cook.isEmpty { chips.append(("flame", "Cook \(cook)")) }
        return chips
    }

    private var metaRow: some View {
        HStack(spacing: 10) {
            ForEach(metaChips, id: \.label) { chip in
                Label(chip.label, systemImage: chip.icon)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Palette.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(Palette.accentTint, in: Capsule())
            }
        }
    }

    // MARK: - Ingredients

    private var ingredientsSection: some View {
        SectionCard(title: "Ingredients") {
            VStack(spacing: 0) {
                ForEach(Array(recipe.ingredients.enumerated()), id: \.offset) { index, ingredient in
                    if index > 0 { Divider().overlay(Palette.border) }
                    HStack(alignment: .firstTextBaseline) {
                        Text(ingredient.name)
                            .font(.subheadline)
                            .foregroundStyle(Palette.ink)
                        Spacer()
                        if let amount = ingredient.amount, !amount.isEmpty {
                            HStack(spacing: 4) {
                                Text(amount)
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(Palette.secondary)
                                // Estimated amounts are flagged rather than
                                // presented as fact — the source didn't give
                                // one, the AI filled a reasonable gap.
                                if ingredient.estimated == true {
                                    Image(systemName: "sparkles")
                                        .font(.caption2)
                                        .foregroundStyle(Palette.accent)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 10)
                }
            }
        }
    }

    // MARK: - Sub-recipes

    private func subRecipesSection(_ subRecipes: [SubRecipe]) -> some View {
        SectionCard(title: "Make these first") {
            VStack(spacing: 10) {
                ForEach(subRecipes, id: \.name) { sub in
                    Button {
                        openSubRecipe = sub
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(sub.name)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Palette.ink)
                                if let yield = sub.yield {
                                    Text(yield)
                                        .font(.caption)
                                        .foregroundStyle(Palette.muted)
                                }
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Palette.muted)
                        }
                        .padding(14)
                        .background(Palette.card, in: RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Steps

    private var stepsSection: some View {
        SectionCard(title: "Steps") {
            VStack(alignment: .leading, spacing: 16) {
                ForEach(recipe.steps, id: \.order) { step in
                    HStack(alignment: .top, spacing: 12) {
                        Text("\(step.order)")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 24, height: 24)
                            .background(Palette.ctaGradient, in: Circle())
                        Text(step.instruction)
                            .font(.subheadline)
                            .foregroundStyle(Palette.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    // MARK: - Nutrition

    private func nutritionSection(_ nutrition: Nutrition) -> some View {
        let facts: [(String, String)] = [
            nutrition.calories.map { ("Calories", $0) },
            nutrition.protein.map { ("Protein", $0) },
            nutrition.carbs.map { ("Carbs", $0) },
            nutrition.fat.map { ("Fat", $0) },
        ].compactMap { $0 }

        guard !facts.isEmpty else { return AnyView(EmptyView()) }

        return AnyView(
            SectionCard(title: "Nutrition (estimated, per serving)") {
                HStack(spacing: 0) {
                    ForEach(facts, id: \.0) { fact in
                        VStack(spacing: 4) {
                            Text(fact.1)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Palette.ink)
                            Text(fact.0)
                                .font(.caption2)
                                .foregroundStyle(Palette.muted)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        )
    }
}

/// A titled white card on the cream background — the one repeating shape
/// every section on this screen uses, so the page reads as one system
/// instead of a stack of one-off layouts.
private struct SectionCard<Content: View>: View {
    let title: String
    let content: Content

    /// `@ViewBuilder` has to live on this initializer's parameter, not on
    /// the stored property above — a plain stored property has no body for
    /// the builder to transform, so the trailing-closure call sites below
    /// (`SectionCard(title: "…") { … }`) need this to type-check at all.
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(0.6)
                .foregroundStyle(Palette.muted)
            content
        }
        .padding(16)
        .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Palette.border, lineWidth: 1))
    }
}

/// The full component recipe, over the top of whatever screen opened it.
private struct SubRecipeDetailSheet: View {
    let sub: SubRecipe
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if sub.estimated == true {
                        Label("The source only named this — this is the AI's closest version.", systemImage: "sparkles")
                            .font(.caption)
                            .foregroundStyle(Palette.accent)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("INGREDIENTS")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Palette.muted)
                        ForEach(Array(sub.ingredients.enumerated()), id: \.offset) { _, ing in
                            HStack {
                                Text(ing.name)
                                Spacer()
                                if let amount = ing.amount { Text(amount).foregroundStyle(Palette.secondary) }
                            }
                            .font(.subheadline)
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("STEPS")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Palette.muted)
                        ForEach(sub.steps, id: \.order) { step in
                            Text("\(step.order). \(step.instruction)")
                                .font(.subheadline)
                                .foregroundStyle(Palette.ink)
                        }
                    }
                }
                .padding(20)
            }
            .background(Palette.cream.ignoresSafeArea())
            .navigationTitle(sub.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    RecipeDetailView(recipe: .preview)
}

#if DEBUG
extension Recipe {
    /// Fixture for previews only — exercises every optional section
    /// (sub-recipes, nutrition, meta chips) so a broken layout shows up in
    /// the canvas instead of only on a real extraction.
    static let preview = Recipe(
        title: "Almond Croissants",
        description: "Bakery-style almond croissants made from day-old croissants — better than the day they were baked.",
        servings: "6",
        prepTime: "20 min",
        cookTime: "18 min",
        ingredients: [
            Ingredient(name: "Day-old croissants", amount: "6", estimated: nil),
            Ingredient(name: "Frangipane (almond cream filling)", amount: "250 g", estimated: nil),
            Ingredient(name: "Simple syrup", amount: "150 ml", estimated: nil),
            Ingredient(name: "Flaked almonds", amount: "40 g", estimated: true),
        ],
        steps: [
            RecipeStep(order: 1, instruction: "Heat the oven to 180C and line a tray with baking paper."),
            RecipeStep(order: 2, instruction: "Brush each split croissant generously with the simple syrup."),
            RecipeStep(order: 3, instruction: "Spread the frangipane inside each croissant and close them."),
            RecipeStep(order: 4, instruction: "Scatter flaked almonds over the top and bake for 15-18 minutes."),
        ],
        subRecipes: [
            SubRecipe(
                name: "Frangipane (almond cream filling)",
                yield: "about 250 g",
                ingredients: [
                    Ingredient(name: "Butter, softened", amount: "100 g", estimated: nil),
                    Ingredient(name: "Caster sugar", amount: "100 g", estimated: nil),
                    Ingredient(name: "Ground almonds", amount: "100 g", estimated: nil),
                    Ingredient(name: "Egg", amount: "1", estimated: nil),
                ],
                steps: [
                    RecipeStep(order: 1, instruction: "Beat the butter and sugar until pale and fluffy."),
                    RecipeStep(order: 2, instruction: "Beat in the egg, then fold through the ground almonds."),
                ],
                estimated: true
            ),
        ],
        tags: ["pastry", "breakfast"],
        sourceType: .url,
        sourceURL: "https://example.com/almond-croissants",
        confidence: .high,
        notes: nil,
        nutrition: Nutrition(calories: "420 kcal", protein: "9 g", carbs: "38 g", fat: "26 g")
    )
}
#endif

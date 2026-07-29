import SwiftUI

/// The first screen after launch: who you are, one obvious thing to do, and
/// what you extracted recently.
///
/// Everything here comes off disk, so it renders with no network — the only
/// request is the name lookup, and its absence just means the generic
/// greeting instead of a broken screen.
struct HomeView: View {
    /// Switches to the Extract tab. Passed in from `RootTabView` rather than
    /// pushing a second copy of Extract onto Home's own stack, so there's one
    /// Extract screen in the app, not two that can hold different state.
    let onStartExtracting: () -> Void

    @Environment(\.apiClient) private var apiClient
    @EnvironmentObject private var repository: RecipeRepository
    @State private var displayName: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    header
                    extractCard
                    recentSection
                }
                .padding(20)
            }
            .background(Palette.cream.ignoresSafeArea())
            .task { await loadName() }
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            AvocadoMark(size: 30)
            Text(displayName.map { "Hi \($0)!" } ?? "Avocato")
                .font(.appTitle(24))
                .foregroundStyle(Palette.ink)
            Spacer()
        }
    }

    /// The one primary action on the screen. Deliberately the only button
    /// here — Home's job is to get you into an extraction, not to present a
    /// menu.
    private var extractCard: some View {
        Button(action: onStartExtracting) {
            HStack(spacing: 14) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 26))
                    .foregroundStyle(.white)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Extract a recipe")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("From a link, or your own notes")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.85))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.9))
            }
            .padding(18)
            .background(Palette.ctaGradient, in: RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(.plain)
    }

    private var recentSection: some View {
        VStack(spacing: 10) {
            SectionHeader(title: "Recent")

            if repository.recent.isEmpty {
                EmptyStateView(
                    icon: "sparkles",
                    title: "No recipes yet",
                    message: "Paste a link from TikTok, YouTube, or any recipe site and Avocato turns it into a clean recipe.",
                    actionTitle: "Extract your first recipe",
                    action: onStartExtracting
                )
            } else {
                // Home is a summary, not the full list — Library holds
                // everything.
                ForEach(repository.recent.prefix(5)) { item in
                    NavigationLink {
                        RecipeDetailView(recipe: item.recipe)
                    } label: {
                        RecipeRow(title: item.recipe.title, subtitle: item.savedAt.relativeDescription)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func loadName() async {
        guard let apiClient else { return }
        // Signed out is the normal case, not an error — the greeting simply
        // stays generic.
        guard let me = try? await apiClient.me(), me.signedIn else {
            displayName = nil
            return
        }
        displayName = me.name ?? me.email?.split(separator: "@").first.map(String.init)?.capitalized
    }
}

#Preview {
    let auth = AuthStore()
    let client = APIClient(baseURL: URL(string: "https://vercel-ecru-iota-55.vercel.app")!, auth: auth)
    return HomeView(onStartExtracting: {})
        .environmentObject(RecipeRepository(api: client))
}

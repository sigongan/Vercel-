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
                    HomeHeroBanner()
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

/// A looping before/after banner: a cluttered source page cross-fades into a
/// tidy recipe card, so the app demonstrates what it does visually instead of
/// leaning on the tagline text alone. Ported from the web app's HomeHero.tsx.
private struct HomeHeroBanner: View {
    @State private var showClean = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                MessyPanel()
                    .opacity(showClean ? 0 : 1)
                    .scaleEffect(showClean ? 0.97 : 1)
                CleanPanel()
                    .opacity(showClean ? 1 : 0)
                    .scaleEffect(showClean ? 1 : 0.97)
            }
            .frame(height: 120)

            Text("Turn anything into a recipe")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.ink)
                .padding(.top, 14)
            Text("A video, a photo, a link, or whatever's in your kitchen.")
                .font(.caption)
                .foregroundStyle(Palette.secondary)
        }
        .padding(18)
        .background(
            LinearGradient(colors: [Palette.card, Palette.accentTint], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 24)
        )
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Palette.border, lineWidth: 1))
        // Mirrors the web's 5s CSS keyframe loop (hold, cross-fade, hold,
        // cross-fade back) with a repeating async sleep rather than a
        // continuous animation, since there's no autoreverse timeline that
        // holds at both ends the way the CSS one does.
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2.5))
                withAnimation(.easeInOut(duration: 0.6)) { showClean.toggle() }
            }
        }
    }
}

private struct MessyPanel: View {
    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10)
                .fill(Palette.border)
                .frame(width: 60, height: 60)

            VStack(alignment: .leading, spacing: 6) {
                Text("AD")
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(0.4)
                    .foregroundStyle(Palette.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Palette.border, in: RoundedRectangle(cornerRadius: 3))

                bar(width: 0.85)
                bar(width: 0.95)
                bar(width: 0.55)
                bar(width: 0.7)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card.opacity(0.8), in: RoundedRectangle(cornerRadius: 16))
    }

    private func bar(width: CGFloat) -> some View {
        GeometryReader { geo in
            Capsule()
                .fill(Palette.border)
                .frame(width: geo.size.width * width, height: 8)
        }
        .frame(height: 8)
    }
}

private struct CleanPanel: View {
    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10)
                .fill(LinearGradient(colors: [Color(hex: 0xE6F3C5), Color(hex: 0xC4E484)], startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 60, height: 60)

            VStack(alignment: .leading, spacing: 8) {
                Capsule()
                    .fill(Palette.ink)
                    .frame(width: 100, height: 10)

                IngredientLine(width: 0.9)
                IngredientLine(width: 0.75)
                IngredientLine(width: 0.6)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: Palette.accent.opacity(0.15), radius: 10, y: 4)
    }
}

private struct IngredientLine: View {
    let width: CGFloat

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                Circle().fill(Palette.accent)
                Image(systemName: "checkmark")
                    .font(.system(size: 7, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 12, height: 12)

            GeometryReader { geo in
                Capsule()
                    .fill(Palette.border)
                    .frame(width: geo.size.width * width, height: 6)
            }
            .frame(height: 6)
        }
    }
}

#Preview {
    let auth = AuthStore()
    let client = APIClient(baseURL: URL(string: "https://vercel-ecru-iota-55.vercel.app")!, auth: auth)
    return HomeView(onStartExtracting: {})
        .environmentObject(RecipeRepository(api: client))
}

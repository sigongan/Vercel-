import SwiftUI

/// Everything the user has: recipes extracted on this device, and recipes
/// saved to their account.
///
/// Reads from `RecipeRepository`, which is disk-first — so this screen has no
/// loading spinner on open. There's nothing to wait for; whatever is on the
/// device paints immediately and the server refresh happens behind it.
struct LibraryView: View {
    @EnvironmentObject private var repository: RecipeRepository

    private enum Tab: String, CaseIterable {
        case recent = "Recent"
        case saved = "Saved"
    }

    @State private var tab: Tab = .recent

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Picker("Section", selection: $tab) {
                        ForEach(Tab.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    .pickerStyle(.segmented)

                    if repository.isOffline && tab == .saved {
                        OfflineBanner()
                    }

                    switch tab {
                    case .recent: recentList
                    case .saved: savedList
                    }
                }
                .padding(20)
            }
            .background(Palette.cream.ignoresSafeArea())
            .navigationTitle("Library")
            // Pull-to-refresh only makes sense for the account list; the
            // recent list is local and always current by definition.
            .refreshable { await repository.refreshSaved() }
            .task { await repository.refreshSaved() }
        }
    }

    private var recentList: some View {
        Group {
            if repository.recent.isEmpty {
                EmptyStateView(
                    icon: "clock",
                    title: "Nothing extracted yet",
                    message: "Recipes you extract on this phone show up here — and they stay available offline."
                )
            } else {
                ForEach(repository.recent) { item in
                    NavigationLink {
                        RecipeDetailView(recipe: item.recipe)
                    } label: {
                        RecipeRow(title: item.recipe.title, subtitle: item.savedAt.relativeDescription)
                    }
                    .buttonStyle(.plain)
                    // Swipe-to-delete is the expected gesture for a list row
                    // on iOS; a visible delete button on every row would be
                    // noise on a screen meant for browsing.
                    .swipeActions {
                        Button(role: .destructive) {
                            Task { await repository.removeRecent(id: item.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }

    private var savedList: some View {
        Group {
            if repository.saved.isEmpty {
                EmptyStateView(
                    icon: "bookmark",
                    title: "No saved recipes",
                    message: "Sign in and save a recipe to keep it across your devices."
                )
            } else {
                ForEach(repository.saved) { item in
                    NavigationLink {
                        RecipeDetailView(recipe: item.recipe)
                    } label: {
                        RecipeRow(title: item.title, subtitle: item.collection)
                    }
                    .buttonStyle(.plain)
                    .swipeActions {
                        Button(role: .destructive) {
                            Task { try? await repository.deleteSaved(id: item.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }
}

extension Date {
    /// "2 hours ago" — matches how the web app labels the same list
    /// (lib/timeAgo.ts), and localizes itself for free.
    var relativeDescription: String {
        RelativeDateTimeFormatter.shared.localizedString(for: self, relativeTo: Date())
    }
}

extension RelativeDateTimeFormatter {
    /// Formatters are expensive to build and this one is used per row.
    static let shared: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .full
        return f
    }()
}

#Preview {
    let auth = AuthStore()
    let client = APIClient(baseURL: URL(string: "https://vercel-ecru-iota-55.vercel.app")!, auth: auth)
    return LibraryView()
        .environmentObject(RecipeRepository(api: client))
}

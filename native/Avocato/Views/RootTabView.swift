import SwiftUI

/// The five main sections, matching the web app's bottom tab bar.
///
/// This is a real `TabView`, not a web element styled to look like one. That
/// distinction is the whole point of the native rewrite: the tab bar keeps
/// system behaviour for free — it stays put during scroll, respects the safe
/// area and Dynamic Type, adapts to the platform's own look, and reads
/// correctly to VoiceOver — none of which the CSS version got without being
/// fought into place.
struct RootTabView: View {
    @State private var selection: Tab = .home

    enum Tab: Hashable {
        case home, search, extract, library, profile
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }
                .tag(Tab.home)

            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
                .tag(Tab.search)

            ExtractView()
                .tabItem { Label("Extract", systemImage: "plus.circle") }
                .tag(Tab.extract)

            LibraryView()
                .tabItem { Label("Library", systemImage: "bookmark") }
                .tag(Tab.library)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person") }
                .tag(Tab.profile)
        }
    }
}

// MARK: - Placeholders
//
// Screens are ported one at a time; these keep the tab bar buildable and
// navigable in the meantime. Each is replaced by a real view in its own
// change — they are scaffolding, and none of them should survive to a
// submitted build. An app full of "coming soon" screens is its own rejection
// under guideline 2.1.

struct HomeView: View {
    var body: some View { PlaceholderScreen(title: "Home") }
}

struct SearchView: View {
    var body: some View { PlaceholderScreen(title: "Search") }
}

struct ExtractView: View {
    var body: some View { PlaceholderScreen(title: "Extract") }
}

struct LibraryView: View {
    var body: some View { PlaceholderScreen(title: "Library") }
}

struct ProfileView: View {
    var body: some View { PlaceholderScreen(title: "Profile") }
}

private struct PlaceholderScreen: View {
    let title: String

    var body: some View {
        NavigationStack {
            ZStack {
                Palette.cream.ignoresSafeArea()
                Text("\(title) — not ported yet")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
            }
            .navigationTitle(title)
        }
    }
}

#Preview {
    RootTabView()
}

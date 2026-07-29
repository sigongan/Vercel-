import SwiftUI

/// The four main sections.
///
/// A real `TabView`, not a web element styled to look like one — that
/// distinction is the point of the native rewrite. The tab bar keeps system
/// behaviour for free: it stays put during scroll, respects the safe area and
/// Dynamic Type, adapts to the platform's own look, and reads correctly to
/// VoiceOver, none of which the CSS version got without being fought into
/// place.
///
/// Search (Recipe Scout) is deliberately absent. It's out of scope, and
/// shipping it as an empty tab would be worse than not shipping it — an app
/// with a "coming soon" tab is a guideline 2.1 rejection.
struct RootTabView: View {
    @State private var selection: Tab = .home

    enum Tab: Hashable {
        case home, extract, library, profile
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView(onStartExtracting: { selection = .extract })
                .tabItem { Label("Home", systemImage: "house") }
                .tag(Tab.home)

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

#Preview {
    RootTabView()
}

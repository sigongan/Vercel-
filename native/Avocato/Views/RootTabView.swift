import SwiftUI
import UIKit

/// The four main sections, behind a custom floating tab bar.
///
/// This keeps a real `TabView` underneath — SwiftUI still owns each screen's
/// lifecycle and state, so switching tabs and back doesn't reset scroll
/// position or in-progress state the way rebuilding the content in a plain
/// `switch` would. Only the *chrome* is custom: the system tab bar is
/// hidden, and `CustomTabBar` below replaces it, bound to the same
/// selection.
///
/// Search (Recipe Scout) is deliberately absent — out of scope, and an empty
/// tab is its own guideline 2.1 rejection.
struct RootTabView: View {
    @State private var selection: Tab = .home

    enum Tab: CaseIterable, Hashable {
        case home, extract, library, profile

        var title: String {
            switch self {
            case .home: "Home"
            case .extract: "Extract"
            case .library: "Library"
            case .profile: "Profile"
            }
        }

        func icon(active: Bool) -> String {
            switch self {
            case .home: active ? "house.fill" : "house"
            case .extract: active ? "plus.circle.fill" : "plus.circle"
            case .library: active ? "bookmark.fill" : "bookmark"
            case .profile: active ? "person.fill" : "person"
            }
        }
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView(onStartExtracting: { selection = .extract }).tag(Tab.home)
            ExtractView().tag(Tab.extract)
            LibraryView().tag(Tab.library)
            ProfileView().tag(Tab.profile)
        }
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom) {
            CustomTabBar(selection: $selection)
        }
    }
}

/// The floating capsule itself. A `matchedGeometryEffect`-driven pill slides
/// between tabs rather than fading in place — the same "picked out by a
/// solid highlight that glides" feel as the reference bank app, not a
/// same-spot opacity blink.
private struct CustomTabBar: View {
    @Binding var selection: RootTabView.Tab
    @Namespace private var pillNamespace

    var body: some View {
        HStack(spacing: 0) {
            ForEach(RootTabView.Tab.allCases, id: \.self) { tab in
                let isActive = selection == tab
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.78)) {
                        selection = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        ZStack {
                            if isActive {
                                Circle()
                                    .fill(Palette.accentTint)
                                    .matchedGeometryEffect(id: "activePill", in: pillNamespace)
                            }
                            Image(systemName: tab.icon(active: isActive))
                                .font(.system(size: 20))
                                .foregroundStyle(isActive ? Palette.accent : Palette.secondary)
                        }
                        .frame(width: 32, height: 32)

                        Text(tab.title)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(isActive ? Palette.accent : Palette.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    // Full label+icon column is tappable, not just the
                    // 32pt icon circle — comfortably past Apple's 44pt
                    // minimum in both directions.
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.regularMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .stroke(Palette.border, lineWidth: 1)
                )
                // Green-tinted shadow rather than plain black — the same
                // touch the web bar uses to feel like it belongs to this
                // app rather than a generic card.
                .shadow(color: Palette.accent.opacity(0.22), radius: 16, y: 8)
        )
        .padding(.horizontal, 16)
    }
}

#Preview {
    RootTabView()
}

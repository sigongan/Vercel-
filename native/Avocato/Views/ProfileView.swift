import AuthenticationServices
import SwiftUI

/// Identity and plan, plus quick links out to the rest of the account
/// surface (saved recipes, invite, settings). Legal links, data controls,
/// and sign-out/delete live one level deeper in `SettingsView` — same split
/// as the web app's Profile/Settings pages.
struct ProfileView: View {
    @Environment(\.apiClient) private var apiClient
    @EnvironmentObject private var auth: AuthStore
    @EnvironmentObject private var repository: RecipeRepository

    @State private var me: APIClient.Me?
    @State private var currentNonce: String?
    @State private var errorMessage: String?
    @State private var isSigningIn = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    accountCard

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    quickLinksSection
                }
                .padding(20)
            }
            .background(Palette.cream.ignoresSafeArea())
            .navigationTitle("Profile")
            .task { await loadMe() }
        }
    }

    // MARK: - Account

    @ViewBuilder
    private var accountCard: some View {
        if auth.isSignedIn {
            VStack(spacing: 14) {
                HStack(spacing: 14) {
                    // Apple never returns a profile photo — only name and
                    // email — so this is an initial, not a picture that
                    // failed to load.
                    Text(initial)
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: 56, height: 56)
                        .background(Palette.ctaGradient, in: Circle())

                    VStack(alignment: .leading, spacing: 3) {
                        Text(me?.name ?? "Signed in")
                            .font(.headline)
                            .foregroundStyle(Palette.ink)
                        if let email = me?.email {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(Palette.muted)
                        }
                        Text(usageSummary)
                            .font(.caption)
                            .foregroundStyle(Palette.muted)
                    }
                    Spacer()
                }

                Divider().overlay(Palette.border)

                Label(me?.isPro == true ? "Pro" : "Free", systemImage: me?.isPro == true ? "star.fill" : "star")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Palette.accent)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(16)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Palette.border, lineWidth: 1))
        } else {
            VStack(spacing: 12) {
                Text("Save recipes across devices")
                    .font(.headline)
                    .foregroundStyle(Palette.ink)
                Text("Extraction works without an account. Sign in to keep your recipes in sync.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.secondary)
                    .multilineTextAlignment(.center)

                SignInWithAppleButton(.signIn) { request in
                    let nonce = AppleAuth.makeNonce()
                    currentNonce = nonce
                    request.requestedScopes = [.fullName, .email]
                    // Apple receives the hash; Supabase gets the raw value
                    // and checks they match.
                    request.nonce = AppleAuth.sha256(nonce)
                } onCompletion: { result in
                    handleAppleResult(result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: Layout.minTapTarget)
                .clipShape(Capsule())
                .disabled(isSigningIn)
                .opacity(isSigningIn ? 0.5 : 1)
            }
            .padding(20)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Palette.border, lineWidth: 1))
        }
    }

    private var initial: String {
        let source = me?.name ?? me?.email ?? "?"
        return String(source.prefix(1)).uppercased()
    }

    /// Matches web's freeRemaining/credits copy (see lib/billingConstants.ts
    /// for the shared `5` free-per-month figure).
    private var usageSummary: String {
        guard let me else { return "" }
        if me.isPro { return "Pro" }
        let freeRemaining = max(0, 5 - (me.freeUsedThisPeriod ?? 0))
        if freeRemaining > 0 {
            return "\(freeRemaining) free extraction\(freeRemaining == 1 ? "" : "s") left this month"
        }
        let credits = me.credits ?? 0
        return "\(credits) credit\(credits == 1 ? "" : "s")"
    }

    // MARK: - Quick links

    private var quickLinksSection: some View {
        VStack(spacing: 0) {
            NavigationLink {
                SavedRecipesListView()
            } label: {
                QuickLinkRow(icon: "bookmark.fill", title: "Saved recipes")
            }
            .buttonStyle(.plain)

            Divider().overlay(Palette.border).padding(.leading, 50)

            ShareLink(item: inviteURL, message: Text(inviteMessage)) {
                QuickLinkRow(icon: "person.2.fill", title: "Invite friends")
            }
            .buttonStyle(.plain)

            Divider().overlay(Palette.border).padding(.leading, 50)

            NavigationLink {
                SettingsView()
            } label: {
                QuickLinkRow(icon: "gearshape.fill", title: "Settings")
            }
            .buttonStyle(.plain)
        }
        .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Palette.border, lineWidth: 1))
    }

    private var inviteURL: URL {
        URL(string: "https://vercel-ecru-iota-55.vercel.app")!
    }

    private var inviteMessage: String {
        "Avocato turns any recipe video, photo, or link into a clean, cookable recipe. Try it:"
    }

    // MARK: - Actions

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case let .success(authorization):
            guard let nonce = currentNonce else {
                errorMessage = "Sign-in expired. Please try again."
                return
            }
            guard let apiClient else {
                errorMessage = "Not connected."
                return
            }
            isSigningIn = true
            errorMessage = nil
            Task {
                do {
                    let token = try AppleAuth.identityToken(from: authorization)
                    let result = try await apiClient.signInWithApple(
                        identityToken: token,
                        rawNonce: nonce,
                        // Apple only supplies the name on the very first
                        // authorization, so it has to be forwarded now or it
                        // is lost for good.
                        fullName: AppleAuth.fullName(from: authorization)
                    )
                    auth.save(result.session)
                    await loadMe()
                    await repository.refreshSaved()
                } catch {
                    errorMessage = error.localizedDescription
                }
                isSigningIn = false
                currentNonce = nil
            }
        case let .failure(error):
            // Tapping Cancel on Apple's sheet lands here too — that's not an
            // error worth showing.
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func loadMe() async {
        guard let apiClient else { return }
        me = try? await apiClient.me()
    }
}

private struct QuickLinkRow: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Palette.accent)
                .frame(width: 22)
            Text(title)
                .font(.subheadline)
                .foregroundStyle(Palette.ink)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Palette.muted)
        }
        .padding(14)
        .contentShape(Rectangle())
    }
}

/// A focused view onto `repository.saved`, reached from Profile's "Saved
/// recipes" row. Library's own Recent/Saved picker stays the full-featured
/// home for this list — this is a shortcut, not a second data source.
private struct SavedRecipesListView: View {
    @EnvironmentObject private var repository: RecipeRepository

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if repository.saved.isEmpty {
                    EmptyStateView(
                        icon: "bookmark",
                        title: "No saved recipes",
                        message: "Recipes you save from Extract show up here."
                    )
                } else {
                    ForEach(repository.saved) { item in
                        NavigationLink {
                            RecipeDetailView(recipe: item.recipe)
                        } label: {
                            RecipeRow(title: item.title, subtitle: item.collection)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(20)
        }
        .background(Palette.cream.ignoresSafeArea())
        .navigationTitle("Saved")
        .navigationBarTitleDisplayMode(.inline)
        .task { await repository.refreshSaved() }
    }
}

#Preview {
    let auth = AuthStore()
    let client = APIClient(baseURL: URL(string: "https://vercel-ecru-iota-55.vercel.app")!, auth: auth)
    return ProfileView()
        .environmentObject(auth)
        .environmentObject(RecipeRepository(api: client))
}

import StoreKit
import SwiftUI

/// Preferences, on-device data controls, account actions, and the legal/
/// version footer — ported from the web app's SettingsFields.tsx. Reached
/// from Profile's "Settings" row, one level below the tab bar rather than
/// living on it, same as the web app.
struct SettingsView: View {
    @Environment(\.apiClient) private var apiClient
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var auth: AuthStore
    @EnvironmentObject private var repository: RecipeRepository
    @EnvironmentObject private var purchases: PurchaseStore

    @State private var me: APIClient.Me?

    /// Read directly by `ExtractView` too — a shared `UserDefaults` key is
    /// simpler than threading a language store through the environment for
    /// one preference, and both sides stay in sync for free.
    @AppStorage("preferredLanguage") private var languageCode: String = "en"

    @State private var confirmClear = false
    @State private var cleared = false
    @State private var confirmDelete = false
    @State private var isDeleting = false
    @State private var errorMessage: String?

    @State private var nameDraft = ""
    @State private var isSavingName = false

    static let languages: [(code: String, name: String)] = [
        ("en", "English"), ("de", "Deutsch"), ("it", "Italiano"),
        ("es", "Español"), ("fr", "Français"), ("pt", "Português"),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                preferencesSection
                if auth.isSignedIn { subscriptionSection }
                dataSection
                if auth.isSignedIn { accountSection }
                aboutSection

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .padding(20)
        }
        .background(Palette.cream.ignoresSafeArea())
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadMe() }
    }

    private func loadMe() async {
        guard let apiClient else { return }
        me = try? await apiClient.me()
        nameDraft = me?.name ?? ""
    }

    // MARK: - Preferences

    private var preferencesSection: some View {
        SettingsSection(title: "Preferences") {
            Menu {
                ForEach(Self.languages, id: \.code) { lang in
                    Button {
                        languageCode = lang.code
                    } label: {
                        if languageCode == lang.code {
                            Label(lang.name, systemImage: "checkmark")
                        } else {
                            Text(lang.name)
                        }
                    }
                }
            } label: {
                HStack {
                    Text("Language")
                        .font(.subheadline)
                        .foregroundStyle(Palette.ink)
                    Spacer()
                    Text(currentLanguageName)
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Palette.muted)
                }
                .padding(.vertical, 14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var currentLanguageName: String {
        Self.languages.first { $0.code == languageCode }?.name ?? "English"
    }

    // MARK: - Subscription

    /// Server truth (`me?.isPro`) or-ed with this session's own purchase
    /// result. The two can disagree right after a purchase — the server
    /// snapshot in `me` is from before it happened — so either being true is
    /// enough to show Pro rather than waiting on a refetch to agree.
    private var isCurrentlyPro: Bool {
        me?.isPro == true || purchases.isPro
    }

    private var subscriptionSection: some View {
        SettingsSection(title: "Subscription") {
            if isCurrentlyPro {
                Label("Pro", systemImage: "star.fill")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Palette.accent)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    if let product = purchases.product {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(product.displayName)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Palette.ink)
                            Text(subscriptionPriceLine(for: product))
                                .font(.caption)
                                .foregroundStyle(Palette.muted)
                        }

                        Button {
                            Task { await purchases.purchase() }
                        } label: {
                            Text(purchases.isPurchasing ? "Purchasing…" : "Subscribe")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Palette.ctaGradient, in: Capsule())
                                .opacity(purchases.isPurchasing ? 0.6 : 1)
                        }
                        .buttonStyle(.plain)
                        .disabled(purchases.isPurchasing)
                    } else {
                        Text("Loading subscription info…")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }

                    Button("Restore Purchases") {
                        Task { await purchases.restore() }
                    }
                    .font(.footnote)
                    .foregroundStyle(Palette.secondary)
                    .disabled(purchases.isPurchasing)
                }
                .padding(.vertical, 14)
            }

            if let purchaseError = purchases.errorMessage {
                Text(purchaseError)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .padding(.bottom, 12)
            }
        }
    }

    private func subscriptionPriceLine(for product: Product) -> String {
        guard let period = product.subscription?.subscriptionPeriod else {
            return product.displayPrice
        }
        return "\(product.displayPrice) / \(period.unit.settingsLabel)"
    }

    // MARK: - Data

    private var dataSection: some View {
        SettingsSection(title: "Data") {
            Button(action: clearData) {
                Text(cleared ? "Cleared" : confirmClear ? "Tap again to confirm" : "Clear on-device data")
                    .font(.subheadline)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private func clearData() {
        guard confirmClear else {
            confirmClear = true
            return
        }
        Task {
            await repository.clearLocalData()
            confirmClear = false
            cleared = true
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        SettingsSection(title: "Account") {
            VStack(alignment: .leading, spacing: 8) {
                Text("Name")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Palette.muted)

                HStack(spacing: 10) {
                    TextField("Your name", text: $nameDraft)
                        .font(.subheadline)
                        .foregroundStyle(Palette.ink)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .submitLabel(.done)
                        .onSubmit(saveName)

                    if nameChanged {
                        Button(action: saveName) {
                            Text(isSavingName ? "Saving…" : "Save")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Palette.ctaGradient, in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .disabled(isSavingName || nameDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
                // Apple sends a real name only on an account's very first
                // authorization, and plenty of people decline to share it at
                // all — this is that fallback, not a rarely-touched extra.
                Text("Shown when Apple doesn't share a name, or if you'd rather use something else.")
                    .font(.caption2)
                    .foregroundStyle(Palette.muted)
            }
            .padding(.vertical, 14)

            Divider().overlay(Palette.border)

            Button(action: signOut) {
                Text("Sign out")
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Divider().overlay(Palette.border)

            Button(action: deleteAccount) {
                Text(isDeleting ? "Deleting…" : confirmDelete ? "Tap again to permanently delete" : "Delete account")
                    .font(.subheadline)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(isDeleting)
        }
    }

    private var nameChanged: Bool {
        nameDraft.trimmingCharacters(in: .whitespacesAndNewlines) != (me?.name ?? "")
    }

    private func saveName() {
        let trimmed = nameDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let apiClient else { return }
        isSavingName = true
        errorMessage = nil
        Task {
            do {
                try await apiClient.updateDisplayName(trimmed)
                me?.name = trimmed
                nameDraft = trimmed
            } catch {
                errorMessage = error.localizedDescription
            }
            isSavingName = false
        }
    }

    /// Signs out here first, then tells the server.
    ///
    /// The local state is cleared before the request and regardless of how it
    /// goes: someone who taps sign out — on a train, in a kitchen with no
    /// signal — must end up signed out. The server call is what makes the
    /// token stop working everywhere else, and if it fails the session simply
    /// expires on its own schedule instead.
    private func signOut() {
        let client = apiClient
        // Captured before the local clear, because that is what the server
        // needs to identify which session to revoke.
        let token = auth.accessToken

        auth.signOut()
        dismiss()

        Task {
            await repository.clearLocalData()
            if let token { try? await client?.signOut(token: token) }
        }
    }

    /// Required by guideline 5.1.1(v): an app that can create an account must
    /// offer deletion inside the app, not by email.
    private func deleteAccount() {
        guard confirmDelete else {
            confirmDelete = true
            return
        }
        guard let apiClient else { return }
        isDeleting = true
        errorMessage = nil
        Task {
            do {
                try await apiClient.deleteAccount()
                auth.signOut()
                await repository.clearLocalData()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                confirmDelete = false
            }
            isDeleting = false
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        SettingsSection(title: "About") {
            LegalLinkRow(title: "Terms of Service", url: "https://vercel-ecru-iota-55.vercel.app/terms")
            Divider().overlay(Palette.border)
            LegalLinkRow(title: "Privacy Policy", url: "https://vercel-ecru-iota-55.vercel.app/privacy")
            Divider().overlay(Palette.border)
            HStack {
                Text("Version").font(.subheadline).foregroundStyle(Palette.ink)
                Spacer()
                Text(appVersion).font(.subheadline).foregroundStyle(Palette.muted)
            }
            .padding(.vertical, 14)
        }
    }

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }
}

/// A plain uppercase section label above a bordered card of rows — matches
/// the grouping web's SettingsFields uses, in the native app's own card
/// styling rather than web's borderless hairline list.
private struct SettingsSection<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(0.4)
                .foregroundStyle(Palette.muted)

            VStack(spacing: 0) { content }
                .padding(.horizontal, 14)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.border, lineWidth: 1))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private extension Product.SubscriptionPeriod.Unit {
    var settingsLabel: String {
        switch self {
        case .day: "day"
        case .week: "week"
        case .month: "month"
        case .year: "year"
        @unknown default: "period"
        }
    }
}

private struct LegalLinkRow: View {
    let title: String
    let url: String

    var body: some View {
        Link(destination: URL(string: url) ?? URL(string: "https://example.com")!) {
            HStack {
                Text(title).font(.subheadline).foregroundStyle(Palette.ink)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Palette.muted)
            }
            .padding(.vertical, 14)
        }
    }
}

#Preview {
    let auth = AuthStore()
    let client = APIClient(baseURL: URL(string: "https://vercel-ecru-iota-55.vercel.app")!, auth: auth)
    return NavigationStack {
        SettingsView()
    }
    .environmentObject(auth)
    .environmentObject(RecipeRepository(api: client))
    .environmentObject(PurchaseStore(apiClient: client))
}

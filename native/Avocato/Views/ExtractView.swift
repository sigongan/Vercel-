import SwiftUI

/// Turn a link or pasted text into a recipe. Works signed out — extraction
/// has no auth requirement (see app/api/extract-recipe/route.ts), so this
/// screen doesn't wait on Sign in with Apple to be useful.
struct ExtractView: View {
    @Environment(\.apiClient) private var apiClient
    @EnvironmentObject private var repository: RecipeRepository

    private enum Mode: String, CaseIterable { case link = "Link", text = "Text" }

    @State private var mode: Mode = .link
    @State private var input = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var result: Recipe?
    @State private var saveMessage: String?

    private var canSubmit: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    header

                    Picker("Source", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    .pickerStyle(.segmented)

                    inputField

                    Button(action: submit) {
                        HStack {
                            if isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Get my recipe").font(.subheadline.weight(.semibold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .foregroundStyle(.white)
                        .background(Palette.ctaGradient, in: Capsule())
                        .opacity(canSubmit ? 1 : 0.4)
                    }
                    .disabled(!canSubmit)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(20)
            }
            .background(Palette.cream.ignoresSafeArea())
            .navigationTitle("Extract")
            .navigationDestination(item: $result) { recipe in
                RecipeDetailView(recipe: recipe) { save(recipe) }
                    .alert(
                        saveMessage ?? "",
                        isPresented: Binding(
                            get: { saveMessage != nil },
                            set: { if !$0 { saveMessage = nil } }
                        )
                    ) {
                        Button("OK", role: .cancel) {}
                    }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                AvocadoMark(size: 24)
                Text("Turn anything into a recipe")
                    .font(.appTitle(20))
                    .foregroundStyle(Palette.ink)
            }
            Text("A link from TikTok, YouTube, or any recipe site — or your own notes.")
                .font(.footnote)
                .foregroundStyle(Palette.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var inputField: some View {
        switch mode {
        case .link:
            TextField("Paste a link…", text: $input)
                .textFieldStyle(.plain)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                .padding(14)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.border, lineWidth: 1))
        case .text:
            TextEditor(text: $input)
                .frame(minHeight: 140)
                .scrollContentBackground(.hidden)
                .padding(10)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.border, lineWidth: 1))
        }
    }

    /// Saves to the account. Every outcome — including "you need Pro" and
    /// "you need to sign in" — is reported, because a bookmark button that
    /// silently does nothing is worse than one that explains itself.
    private func save(_ recipe: Recipe) {
        guard let apiClient else { return }
        Task {
            do {
                try await apiClient.saveRecipe(recipe)
                await repository.refreshSaved()
                saveMessage = "Saved to your library."
            } catch {
                saveMessage = (error as? APIClient.APIError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func submit() {
        guard let apiClient else {
            errorMessage = "Not connected."
            return
        }
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        errorMessage = nil
        isLoading = true

        Task {
            do {
                let kind: APIClient.ExtractKind = (mode == .link) ? .url(trimmed) : .text(trimmed)
                // "en" for now — the native app doesn't have a language
                // picker yet, unlike the web app's six. Wire this to the
                // device locale (or a real setting) once that exists.
                let recipe = try await apiClient.extract(kind: kind, lang: "en")
                await repository.rememberExtraction(recipe)
                isLoading = false
                result = recipe
            } catch {
                isLoading = false
                errorMessage = (error as? APIClient.APIError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}

#Preview {
    let auth = AuthStore()
    let client = APIClient(baseURL: URL(string: "https://vercel-ecru-iota-55.vercel.app")!, auth: auth)
    return ExtractView()
        .environmentObject(RecipeRepository(api: client))
}

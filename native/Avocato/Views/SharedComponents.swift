import SwiftUI

/// One recipe in a list. Home and Library both show recipes, and a shared row
/// is what keeps them looking like the same app rather than two screens that
/// happen to list similar things.
struct RecipeRow: View {
    let title: String
    var subtitle: String?

    var body: some View {
        HStack(spacing: 12) {
            // Stand-in for a photo. Extraction doesn't return images, so
            // rather than leave a grey box, the mark makes the row feel
            // deliberate.
            AvocadoMark(size: 26)
                .frame(width: 44, height: 44)
                .background(Palette.accentTint, in: RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Palette.muted)
                }
            }

            Spacer(minLength: 8)

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Palette.muted)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .background(Palette.card, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.border, lineWidth: 1))
    }
}

/// An empty list with somewhere to go. A bare "nothing here yet" line leaves
/// the user to work out the next step themselves; every empty state in the
/// app offers the action that fills it.
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(Palette.muted)
            Text(title)
                .font(.headline)
                .foregroundStyle(Palette.ink)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Palette.secondary)
                .multilineTextAlignment(.center)
            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 22)
                        .padding(.vertical, 12)
                        .background(Palette.ctaGradient, in: Capsule())
                }
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 24)
    }
}

/// Shown when the last refresh couldn't reach the server. What's on screen is
/// still real — it came off disk — just possibly out of date, and saying so is
/// better than a silent stale list or an error that blanks the page.
struct OfflineBanner: View {
    var body: some View {
        Label("Offline — showing saved recipes", systemImage: "wifi.slash")
            .font(.caption.weight(.medium))
            .foregroundStyle(Palette.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Palette.accentTint, in: RoundedRectangle(cornerRadius: 12))
    }
}

/// Section heading used above lists on Home and Library.
struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.6)
            .foregroundStyle(Palette.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

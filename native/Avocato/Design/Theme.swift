import SwiftUI

/// The app's colors, ported from the web build's Tailwind values so the two
/// stay recognizably the same product.
///
/// The contrast ratios noted below were measured against the backgrounds
/// these colors actually sit on, and every text color here clears WCAG AA
/// (4.5:1 for body, 3:1 for large/bold). They are not arbitrary — the earlier
/// palette failed at 2.57:1 and small copy was genuinely hard to read. Keep
/// new colors at or above these ratios rather than eyeballing them.
enum Palette {
    // Surfaces
    static let cream = Color(hex: 0xFAFAF7)
    static let creamDark = Color(hex: 0x1C1917)
    static let card = Color.white
    static let cardDark = Color(hex: 0x292524)
    static let border = Color(hex: 0xE2E6D9)
    static let borderDark = Color(hex: 0x44403C)
    /// Soft accent tint behind selected tab icons and icon chips.
    static let accentTint = Color(hex: 0xF2F7E8)

    // Text
    /// Headings and primary copy. 14.25:1 on cream.
    static let ink = Color(hex: 0x232920)
    /// Body and secondary copy. 5.83:1 on cream.
    static let secondary = Color(hex: 0x5D6551)
    /// Hints, empty states, placeholders. 4.85:1 on cream.
    static let muted = Color(hex: 0x6A7160)
    /// Same role as `muted`, on the dark background. 6.52:1 there.
    static let mutedDark = Color(hex: 0x9AA093)

    // Accent
    /// Primary accent. 4.78:1 as text on cream, 4.99:1 behind white text —
    /// this is why it is the darker green and not the brighter #61A00E,
    /// which only reached 3.07:1.
    static let accent = Color(hex: 0x4D7C0F)
    /// Deep end of the primary button gradient. 4.88:1 behind white text.
    static let accentDeep = Color(hex: 0x5E7A33)

    /// Gradient used by every primary button.
    static let ctaGradient = LinearGradient(
        colors: [accent, accentDeep],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

/// Apple's minimum comfortable hit target. Controls smaller than this get an
/// invisible padded tap area rather than being drawn larger.
enum Layout {
    static let minTapTarget: CGFloat = 44
}

extension Color {
    /// `Color(hex: 0x4D7C0F)` reads closer to the CSS the web app uses than
    /// spelling out three Doubles.
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

extension View {
    /// Expands a small control's touch area to Apple's 44pt minimum without
    /// changing how big it looks.
    func minimumTapTarget() -> some View {
        frame(minWidth: Layout.minTapTarget, minHeight: Layout.minTapTarget)
            .contentShape(Rectangle())
    }
}

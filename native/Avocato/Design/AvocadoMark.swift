import SwiftUI

/// The app's hand-drawn avocado mark — an exact port of `lib/avocadoMark.tsx`'s
/// SVG paths (100x100 viewBox) so the native app's mark matches the web app's,
/// not just approximates it. Four layers: skin outline, flesh, pit, and the
/// small glint on the pit.
struct AvocadoMark: View {
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            AvocadoSkinShape().fill(Color(hex: 0x3f6212))
            AvocadoFleshShape().fill(Color(hex: 0xd9f99d))
            AvocadoPitShape().fill(Color(hex: 0x854d0e))
            AvocadoGlintShape().fill(Color(hex: 0xa16207))
        }
        .frame(width: size, height: size)
    }
}

/// Maps a point in the SVG's 100x100 coordinate space into whatever rect
/// SwiftUI hands the shape — the same trick as viewBox scaling, done by hand
/// since `Shape.path(in:)` has no viewBox concept of its own.
private func svgPoint(_ x: CGFloat, _ y: CGFloat, in rect: CGRect) -> CGPoint {
    CGPoint(x: rect.minX + x / 100 * rect.width, y: rect.minY + y / 100 * rect.height)
}

private struct AvocadoSkinShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { svgPoint(x, y, in: rect) }
        p.move(to: pt(50, 8))
        p.addCurve(to: pt(65.5, 31), control1: pt(59, 8), control2: pt(64, 20))
        p.addCurve(to: pt(81, 66), control1: pt(78, 39), control2: pt(83, 54))
        p.addCurve(to: pt(50, 94), control1: pt(78, 85), control2: pt(63, 94))
        p.addCurve(to: pt(19, 66), control1: pt(37, 94), control2: pt(22, 85))
        p.addCurve(to: pt(34.5, 31), control1: pt(17, 54), control2: pt(22, 39))
        p.addCurve(to: pt(50, 8), control1: pt(36, 20), control2: pt(41, 8))
        p.closeSubpath()
        return p
    }
}

private struct AvocadoFleshShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { svgPoint(x, y, in: rect) }
        p.move(to: pt(50, 16))
        p.addCurve(to: pt(62.5, 35.5), control1: pt(57, 16), control2: pt(61, 26))
        p.addCurve(to: pt(75.5, 65), control1: pt(73, 42.5), control2: pt(77.5, 55))
        p.addCurve(to: pt(50, 88), control1: pt(73, 81), control2: pt(60.5, 88))
        p.addCurve(to: pt(24.5, 65), control1: pt(39.5, 88), control2: pt(27, 81))
        p.addCurve(to: pt(37.5, 35.5), control1: pt(22.5, 55), control2: pt(27, 42.5))
        p.addCurve(to: pt(50, 16), control1: pt(39, 26), control2: pt(43, 16))
        p.closeSubpath()
        return p
    }
}

private struct AvocadoPitShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let center = svgPoint(50, 63, in: rect)
        let r = 13.5 / 100 * rect.width
        p.addEllipse(in: CGRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2))
        return p
    }
}

private struct AvocadoGlintShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let center = svgPoint(45.5, 58.5, in: rect)
        let r = 4.0 / 100 * rect.width
        p.addEllipse(in: CGRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2))
        return p
    }
}

#Preview {
    AvocadoMark(size: 80)
}

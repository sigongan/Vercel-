import SwiftUI

/// Shown for a moment right when the app opens, before handing off to
/// `RootTabView`. Purely a branded first impression — nothing here waits on
/// data or auth, so a slow network never makes this linger; that work
/// happens on the real screens once they're on screen.
struct LaunchView: View {
    @State private var scale: CGFloat = 0.6
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            // Soft, low-saturation diagonal — a bolder green read as loud on
            // a full-bleed screen at this size, so this is gentler than the
            // gradient used elsewhere (e.g. the loading screen).
            LinearGradient(
                colors: [Palette.cream, Color(hex: 0xD9EDC0)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            AvocadoMark(size: 110)
                .scaleEffect(scale)
                .opacity(opacity)
        }
        .onAppear {
            // Two-part spring so it reads as a bounce, not a plain scale-in:
            // overshoot past full size, then settle back — the same shape as
            // the loading-screen animation the web app uses, so the two
            // moments feel like one consistent brand.
            withAnimation(.spring(response: 0.55, dampingFraction: 0.55)) {
                scale = 1.08
                opacity = 1
            }
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7).delay(0.35)) {
                scale = 1.0
            }
        }
    }
}

#Preview {
    LaunchView()
}

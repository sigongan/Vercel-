import SwiftUI
import WidgetKit

/// Entry point for the CookTimerWidget extension target. Replaces the
/// template WidgetBundle Xcode generates — this extension only ships the
/// Cook Mode Live Activity (home-screen widgets can be added here later).
@main
struct CookTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        CookTimerLiveActivity()
    }
}

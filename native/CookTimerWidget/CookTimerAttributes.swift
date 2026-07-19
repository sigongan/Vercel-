import ActivityKit
import Foundation

/// Shared data model for the Cook Mode Live Activity (Dynamic Island +
/// lock screen timer). This file must be a member of BOTH the App target
/// and the CookTimerWidget target — ActivityKit matches the activity
/// between app and widget by this type.
/// See docs/ios-live-activities.md for setup.
@available(iOS 16.2, *)
struct CookTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// When the running timer hits zero. The widget renders
        /// Text(timerInterval:) against this, so iOS animates the countdown
        /// itself — no updates needed while it runs.
        var endDate: Date
        var paused: Bool
        /// Meaningful while paused (endDate stops being true then).
        var remainingSeconds: Int
        var stepNumber: Int
        var totalSteps: Int
        var stepText: String
    }

    /// Fixed for the lifetime of one activity.
    var recipeTitle: String
}

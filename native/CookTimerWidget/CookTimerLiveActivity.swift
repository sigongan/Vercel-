import ActivityKit
import SwiftUI
import WidgetKit

/// The Cook Mode step timer, rendered by iOS in the Dynamic Island and on
/// the lock screen while a step timer is running — so the cook can leave
/// the phone locked (wet hands!) and still watch the countdown.
/// Colors follow the app's Cook Mode palette (deep brown / cream / peach).
struct CookTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CookTimerAttributes.self) { context in
            // Lock screen / notification banner presentation.
            LockScreenCookView(context: context)
                .activityBackgroundTint(Palette.brown)
                .activitySystemActionForegroundColor(Palette.cream)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "frying.pan")
                        .font(.title2)
                        .foregroundStyle(Palette.peach)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    CountdownText(state: context.state)
                        .font(.title2.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.peach)
                        .frame(maxWidth: 72)
                        .padding(.trailing, 6)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.recipeTitle)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Palette.cream)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Step \(context.state.stepNumber)/\(context.state.totalSteps)")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(Palette.peach)
                        Text(context.state.stepText)
                            .font(.caption)
                            .foregroundStyle(Palette.cream.opacity(0.85))
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 6)
                }
            } compactLeading: {
                Image(systemName: "frying.pan")
                    .foregroundStyle(Palette.peach)
            } compactTrailing: {
                CountdownText(state: context.state)
                    .monospacedDigit()
                    .foregroundStyle(Palette.peach)
                    .frame(maxWidth: 48)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(Palette.peach)
            }
        }
    }
}

private enum Palette {
    static let brown = Color(red: 0.141, green: 0.102, blue: 0.086) // #241a16
    static let cream = Color(red: 0.992, green: 0.953, blue: 0.925) // #fdf3ec
    static let peach = Color(red: 0.953, green: 0.643, blue: 0.502) // #f3a480
}

/// Live countdown while running (iOS animates it for free), static
/// remaining time while paused.
private struct CountdownText: View {
    let state: CookTimerAttributes.ContentState

    var body: some View {
        if state.paused {
            Text(clock(state.remainingSeconds))
        } else {
            Text(timerInterval: Date()...max(Date(), state.endDate), countsDown: true)
        }
    }

    private func clock(_ totalSeconds: Int) -> String {
        let m = totalSeconds / 60
        let s = totalSeconds % 60
        return String(format: "%d:%02d", m, s)
    }
}

private struct LockScreenCookView: View {
    let context: ActivityViewContext<CookTimerAttributes>

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "frying.pan")
                .font(.title)
                .foregroundStyle(Palette.peach)

            VStack(alignment: .leading, spacing: 3) {
                Text(context.attributes.recipeTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.cream)
                    .lineLimit(1)
                Text("Step \(context.state.stepNumber)/\(context.state.totalSteps) · \(context.state.stepText)")
                    .font(.caption)
                    .foregroundStyle(Palette.cream.opacity(0.75))
                    .lineLimit(2)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                CountdownText(state: context.state)
                    .font(.title2.weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.peach)
                if context.state.paused {
                    Image(systemName: "pause.fill")
                        .font(.caption2)
                        .foregroundStyle(Palette.cream.opacity(0.6))
                }
            }
        }
        .padding(16)
    }
}

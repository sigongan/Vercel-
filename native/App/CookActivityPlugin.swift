import ActivityKit
import Capacitor
import Foundation

/// Capacitor bridge for the Cook Mode Live Activity. The web app calls
/// CookActivity.sync(...) when a step timer starts/pauses/resumes and
/// CookActivity.end() when the timer finishes or Cook Mode closes; this
/// starts or updates the ActivityKit activity the CookTimerWidget
/// extension renders in the Dynamic Island / lock screen.
///
/// Member of the App target only (NOT the widget target). Registered in
/// AvocatoViewController.swift — see docs/ios-live-activities.md.
@objc(CookActivityPlugin)
public class CookActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CookActivityPlugin"
    public let jsName = "CookActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            return call.resolve()
        }

        let remaining = call.getInt("remainingSeconds") ?? 0
        let state = CookTimerAttributes.ContentState(
            endDate: Date().addingTimeInterval(TimeInterval(remaining)),
            paused: call.getBool("paused") ?? false,
            remainingSeconds: remaining,
            stepNumber: call.getInt("stepNumber") ?? 1,
            totalSteps: call.getInt("totalSteps") ?? 1,
            stepText: call.getString("stepText") ?? ""
        )

        Task {
            if let activity = Activity<CookTimerAttributes>.activities.first {
                await activity.update(ActivityContent(state: state, staleDate: nil))
            } else if ActivityAuthorizationInfo().areActivitiesEnabled {
                _ = try? Activity.request(
                    attributes: CookTimerAttributes(recipeTitle: call.getString("recipeTitle") ?? ""),
                    content: ActivityContent(state: state, staleDate: nil)
                )
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            return call.resolve()
        }

        Task {
            for activity in Activity<CookTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}

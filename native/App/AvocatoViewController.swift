import Capacitor
import UIKit

/// Capacitor's documented hook for registering custom in-app plugins and
/// native launch behavior (capacitorjs.com/docs/ios/custom-code).
/// Main.storyboard's view controller must have its Custom Class set to
/// AvocatoViewController for any of this to run — see
/// docs/ios-animated-splash.md step 3.
class AvocatoViewController: CAPBridgeViewController {

    private var splash: AnimatedSplashView?
    private var splashShownAt = Date()

    override func viewDidLoad() {
        super.viewDidLoad()

        // Animated splash from the first frame, covering the webview while
        // the remote web app loads. The OS launch screen has to be static
        // (Apple requirement) — this takes over the moment the app runs.
        let splash = AnimatedSplashView(frame: view.bounds)
        splash.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(splash)
        self.splash = splash
        splashShownAt = Date()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(webReady),
            name: .avocatoWebReady,
            object: nil
        )

        // Failsafe: never trap the user behind the splash — if the web app
        // hasn't signaled readiness in 8s (offline, server trouble), reveal
        // the webview and let its own error states take over.
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
            self?.dismissSplash()
        }
    }

    @objc private func webReady() {
        // Let a few full bounces play so fast loads don't feel like a
        // glitchy flash of avocado.
        let minimum: TimeInterval = 1.8
        let elapsed = Date().timeIntervalSince(splashShownAt)
        let delay = max(0, minimum - elapsed)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.dismissSplash()
        }
    }

    private func dismissSplash() {
        guard let splash = splash else { return }
        self.splash = nil
        UIView.animate(withDuration: 0.35, animations: {
            splash.alpha = 0
        }) { _ in
            splash.removeFromSuperview()
        }
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SplashReadyPlugin())
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
        // Registered by the Live Activities setup — uncomment after adding
        // CookActivityPlugin.swift and CookTimerAttributes.swift to the App
        // target (docs/ios-live-activities.md):
        // bridge?.registerPluginInstance(CookActivityPlugin())
    }
}

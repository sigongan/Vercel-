import Capacitor
import UIKit

/// Capacitor's documented hook for registering custom in-app plugins
/// (capacitorjs.com/docs/ios/custom-code). Main.storyboard's view
/// controller must have its Custom Class set to AvocatoViewController for
/// this to run — see docs/ios-live-activities.md step 4.
class AvocatoViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CookActivityPlugin())
    }
}

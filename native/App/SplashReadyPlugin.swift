import Capacitor
import Foundation

extension Notification.Name {
    static let avocatoWebReady = Notification.Name("AvocatoWebReady")
}

/// One-method bridge the web app calls the moment it has rendered, so
/// AvocatoViewController knows it can fade out the native animated splash.
/// Registered in AvocatoViewController.capacitorDidLoad.
@objc(SplashReadyPlugin)
public class SplashReadyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SplashReadyPlugin"
    public let jsName = "SplashReady"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "ready", returnType: CAPPluginReturnPromise)
    ]

    @objc func ready(_ call: CAPPluginCall) {
        NotificationCenter.default.post(name: .avocatoWebReady, object: nil)
        call.resolve()
    }
}

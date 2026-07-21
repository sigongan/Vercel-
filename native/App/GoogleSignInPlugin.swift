import Foundation
import Capacitor
import GoogleSignIn

/// Fully native Google sign-in via Google's official iOS SDK: presents the
/// system account sheet directly over the app — no browser, no visible
/// URLs. The resulting ID token is handed to the web layer, which exchanges
/// it for a Supabase session via signInWithIdToken (see signInWithProvider
/// in lib/auth.ts).
///
/// Requires (docs/ios-native-signin.md):
/// - the GoogleSignIn-iOS package added via Swift Package Manager
/// - an iOS-type OAuth client in Google Cloud (Bundle ID app.avocato.ios),
///   whose reversed client ID is registered as a URL Type on the App target
/// - that iOS client ID appended to the Supabase Google provider's Client
///   IDs, with "Skip nonce checks" enabled (the iOS SDK doesn't support
///   custom nonces)
///
/// This file only compiles once the GoogleSignIn package is added. It is
/// registered conditionally (NSClassFromString in AvocatoViewController), so
/// a build without this file still works — the Google button then falls
/// back to the browser-based flow.
@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleSignInPlugin"
    public let jsName = "GoogleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        // The SDK's return leg (com.googleusercontent.apps.* URL scheme)
        // arrives through Capacitor's open-URL notification; hand it to the
        // SDK so the sign-in continuation completes.
        NotificationCenter.default.addObserver(forName: .capacitorOpenURL, object: nil, queue: .main) { note in
            guard let info = note.object as? [String: Any], let url = info["url"] as? URL else { return }
            _ = GIDSignIn.sharedInstance.handle(url)
        }
    }

    @objc func signIn(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId"), !clientId.isEmpty else {
            call.reject("Missing Google iOS client ID")
            return
        }
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller to present from")
                return
            }
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
            GIDSignIn.sharedInstance.signIn(withPresenting: presenter) { result, error in
                if let error = error as NSError? {
                    // -5 == GIDSignInError canceled (stable across SDK
                    // versions; the Swift symbol for it has moved around).
                    if error.code == -5 {
                        call.resolve(["status": "cancelled"])
                        return
                    }
                    call.reject("Google sign-in failed: \(error.localizedDescription)")
                    return
                }
                guard let idToken = result?.user.idToken?.tokenString else {
                    call.reject("Google returned no ID token")
                    return
                }
                var payload: [String: Any] = ["status": "success", "idToken": idToken]
                if let profile = result?.user.profile {
                    let display = profile.name
                    if !display.isEmpty { payload["fullName"] = display }
                }
                call.resolve(payload)
            }
        }
    }
}

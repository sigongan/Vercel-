import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

/// Fully native "Sign in with Apple": presents the system Face ID sheet
/// directly over the app — no browser, no visible URLs. The resulting
/// identity token is handed to the web layer, which exchanges it for a
/// Supabase session via signInWithIdToken (see signInWithProvider in
/// lib/auth.ts).
///
/// Requires the "Sign in with Apple" capability on the App target, and the
/// app's Bundle ID (app.avocato.ios) listed in the Supabase Apple
/// provider's Client IDs — the token's audience is the Bundle ID here, not
/// the Services ID the website flow uses.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    // The delegate must outlive performRequests(); released on completion.
    private var inFlight: SignInDelegate?

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Supabase compares SHA256(rawNonce it receives) against the
            // nonce claim Apple embeds in the token — standard replay
            // protection for the ID-token exchange.
            let rawNonce = Self.randomNonce()

            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = Self.sha256(rawNonce)

            let delegate = SignInDelegate(
                call: call,
                rawNonce: rawNonce,
                window: self.bridge?.viewController?.view.window
            ) { [weak self] in
                self?.inFlight = nil
            }
            self.inFlight = delegate

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            controller.performRequests()
        }
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        if status != errSecSuccess {
            // SecRandom essentially never fails; arc4random is a fine fallback.
            bytes = (0..<length).map { _ in UInt8(arc4random_uniform(256)) }
        }
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

private class SignInDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private let call: CAPPluginCall
    private let rawNonce: String
    private weak var window: UIWindow?
    private let done: () -> Void

    init(call: CAPPluginCall, rawNonce: String, window: UIWindow?, done: @escaping () -> Void) {
        self.call = call
        self.rawNonce = rawNonce
        self.window = window
        self.done = done
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { done() }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            call.reject("Apple returned no identity token")
            return
        }
        var result: [String: Any] = [
            "status": "success",
            "identityToken": token,
            "nonce": rawNonce,
        ]
        // Apple only provides the name on the very first authorization for
        // this Apple ID — the web layer stores it in user metadata then.
        if let name = credential.fullName {
            let display = [name.givenName, name.familyName].compactMap { $0 }.joined(separator: " ")
            if !display.isEmpty { result["fullName"] = display }
        }
        call.resolve(result)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { done() }
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.resolve(["status": "cancelled"])
            return
        }
        call.reject("Sign in with Apple failed: \(error.localizedDescription)")
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        window ?? ASPresentationAnchor()
    }
}

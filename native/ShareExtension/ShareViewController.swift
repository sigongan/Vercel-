import UIKit
import SwiftUI
import UniformTypeIdentifiers

/// "Share → Avocato" from TikTok/YouTube/Safari/anywhere. Grabs the shared
/// link (or plain text containing one), hands it to the main app via a
/// Universal Link (a real https:// URL on our own domain, resolved by iOS
/// itself rather than a custom URL scheme), and dismisses itself — the app
/// then lands on /?url=<link>, which auto-starts recipe extraction.
///
/// Universal Links instead of a custom avocato:// scheme: custom-scheme
/// handoff from a Share Extension proved unreliable in testing (intermittent
/// "flashes and nothing happens"), which matches widely-reported iOS
/// behavior. Universal Links are Apple's actual recommended mechanism for
/// this — the same one Safari's "Open in App" banner and Messages/Mail
/// links use — and degrade gracefully to opening Safari on the real page
/// if the domain association (see app/.well-known/apple-app-site-association)
/// isn't set up right, instead of a hard "can't open page" failure.
///
/// This file replaces the ShareViewController.swift that Xcode generates
/// when you add a Share Extension target. See docs/ios-share-extension.md.
class ShareViewController: UIViewController {

    /// Must match capacitor.config.ts's server.url.
    private static let host = "vercel-ecru-iota-55.vercel.app"

    // MARK: branded hand-off screen
    //
    // The default extension template leaves `view` empty (plain system
    // background), which briefly flashes white/black between "share sheet
    // closes" and "app's own AnimatedSplashView takes over" — the jarring
    // cut this class exists to remove. Painting the exact same gradient +
    // still avocado here (no bounce; this view rarely survives long enough
    // for the animation to read as anything but a flicker) makes that
    // hand-off look like one continuous screen instead of two.

    private let gradientLayer = CAGradientLayer()
    private let avocado = CALayer()

    override func viewDidLoad() {
        super.viewDidLoad()

        gradientLayer.colors = [
            UIColor(red: 0.980, green: 0.980, blue: 0.969, alpha: 1).cgColor, // #FAFAF7
            UIColor(red: 0.769, green: 0.894, blue: 0.518, alpha: 1).cgColor, // #C4E484
        ]
        gradientLayer.startPoint = CGPoint(x: 0, y: 0)
        gradientLayer.endPoint = CGPoint(x: 1, y: 1)
        view.layer.addSublayer(gradientLayer)

        buildAvocado()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        gradientLayer.frame = view.bounds
        avocado.position = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
    }

    private func buildAvocado() {
        avocado.bounds = CGRect(x: 0, y: 0, width: 100, height: 100)
        let scale: CGFloat = 96 / 100
        avocado.transform = CATransform3DMakeScale(scale, scale, 1)

        let skin = CAShapeLayer()
        skin.path = skinPath().cgPath
        skin.fillColor = UIColor(red: 0.247, green: 0.384, blue: 0.071, alpha: 1).cgColor // #3f6212

        let flesh = CAShapeLayer()
        flesh.path = fleshPath().cgPath
        flesh.fillColor = UIColor(red: 0.851, green: 0.976, blue: 0.616, alpha: 1).cgColor // #d9f99d

        let pit = CAShapeLayer()
        pit.path = UIBezierPath(ovalIn: CGRect(x: 50 - 13.5, y: 63 - 13.5, width: 27, height: 27)).cgPath
        pit.fillColor = UIColor(red: 0.522, green: 0.302, blue: 0.055, alpha: 1).cgColor // #854d0e

        let glint = CAShapeLayer()
        glint.path = UIBezierPath(ovalIn: CGRect(x: 45.5 - 4, y: 58.5 - 4, width: 8, height: 8)).cgPath
        glint.fillColor = UIColor(red: 0.631, green: 0.384, blue: 0.027, alpha: 1).cgColor // #a16207

        avocado.addSublayer(skin)
        avocado.addSublayer(flesh)
        avocado.addSublayer(pit)
        avocado.addSublayer(glint)
        view.layer.addSublayer(avocado)
    }

    // Same geometry as AnimatedSplashView/the web AvocadoMark SVG, 100×100 space.
    private func skinPath() -> UIBezierPath {
        let p = UIBezierPath()
        p.move(to: CGPoint(x: 50, y: 8))
        p.addCurve(to: CGPoint(x: 65.5, y: 31), controlPoint1: CGPoint(x: 59, y: 8), controlPoint2: CGPoint(x: 64, y: 20))
        p.addCurve(to: CGPoint(x: 81, y: 66), controlPoint1: CGPoint(x: 78, y: 39), controlPoint2: CGPoint(x: 83, y: 54))
        p.addCurve(to: CGPoint(x: 50, y: 94), controlPoint1: CGPoint(x: 78, y: 85), controlPoint2: CGPoint(x: 63, y: 94))
        p.addCurve(to: CGPoint(x: 19, y: 66), controlPoint1: CGPoint(x: 37, y: 94), controlPoint2: CGPoint(x: 22, y: 85))
        p.addCurve(to: CGPoint(x: 34.5, y: 31), controlPoint1: CGPoint(x: 17, y: 54), controlPoint2: CGPoint(x: 22, y: 39))
        p.addCurve(to: CGPoint(x: 50, y: 8), controlPoint1: CGPoint(x: 36, y: 20), controlPoint2: CGPoint(x: 41, y: 8))
        p.close()
        return p
    }

    private func fleshPath() -> UIBezierPath {
        let p = UIBezierPath()
        p.move(to: CGPoint(x: 50, y: 16))
        p.addCurve(to: CGPoint(x: 62.5, y: 35.5), controlPoint1: CGPoint(x: 57, y: 16), controlPoint2: CGPoint(x: 61, y: 26))
        p.addCurve(to: CGPoint(x: 75.5, y: 65), controlPoint1: CGPoint(x: 73, y: 42.5), controlPoint2: CGPoint(x: 77.5, y: 55))
        p.addCurve(to: CGPoint(x: 50, y: 88), controlPoint1: CGPoint(x: 73, y: 81), controlPoint2: CGPoint(x: 60.5, y: 88))
        p.addCurve(to: CGPoint(x: 24.5, y: 65), controlPoint1: CGPoint(x: 39.5, y: 88), controlPoint2: CGPoint(x: 27, y: 81))
        p.addCurve(to: CGPoint(x: 37.5, y: 35.5), controlPoint1: CGPoint(x: 22.5, y: 55), controlPoint2: CGPoint(x: 27, y: 42.5))
        p.addCurve(to: CGPoint(x: 50, y: 16), controlPoint1: CGPoint(x: 39, y: 26), controlPoint2: CGPoint(x: 43, y: 16))
        p.close()
        return p
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = item.attachments, !attachments.isEmpty else {
            return complete()
        }

        // Prefer a real URL attachment; TikTok sometimes shares the link as
        // plain text instead, so fall back to that.
        if let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
                if let url = data as? URL {
                    self?.openInAvocato(url.absoluteString)
                } else if let data = data as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                    self?.openInAvocato(url.absoluteString)
                } else {
                    self?.complete()
                }
            }
        } else if let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, _ in
                if let text = data as? String {
                    self?.openInAvocato(text)
                } else {
                    self?.complete()
                }
            }
        } else {
            complete()
        }
    }

    private func openInAvocato(_ shared: String) {
        // TikTok/Instagram sometimes share a caption + link as plain text
        // instead of a proper URL attachment — pull just the link out, since
        // the server rejects anything that isn't a clean URL outright.
        let link = firstURL(in: shared) ?? shared

        // Safety net FIRST, and unconditionally: put the link on the
        // pasteboard. UIPasteboard always works from extensions (unlike the
        // app-open APIs below, which iOS treats as best-effort from a share
        // extension and which have proven intermittent on device). If the
        // auto-open doesn't fire, the link is still on the clipboard for the
        // user to paste into the Link tab manually — the share is never
        // just lost. (The app no longer reads this proactively: that used
        // to trigger iOS's "would like to paste" prompt on every foreground.)
        UIPasteboard.general.string = link

        let encoded = link.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? link
        guard let schemeURL = URL(string: "avocato://share?url=\(encoded)"),
              let universalURL = URL(string: "https://\(Self.host)/?url=\(encoded)") else {
            return complete()
        }

        DispatchQueue.main.async {
            self.openUniversalLink(universalURL) { [weak self] opened in
                guard let self = self else { return }
                if opened {
                    // iOS has confirmed the Universal Link resolved to the
                    // app — complete immediately instead of always padding
                    // with a fixed delay, which made every share feel
                    // sluggish even on the common, working path.
                    self.complete()
                } else {
                    // Universal Link didn't resolve (domain association not
                    // live, or Safari opened instead) — fall back to the
                    // custom scheme, which still needs the settle delay
                    // since it's the flakier, best-effort path.
                    let action = EnvironmentValues().openURL
                    action(schemeURL)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        self.complete()
                    }
                }
            }
        }
    }

    private func firstURL(in text: String) -> String? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return nil
        }
        let range = NSRange(text.startIndex..., in: text)
        return detector.firstMatch(in: text, options: [], range: range)?.url?.absoluteString
    }

    /// UIApplication.shared.open(_:) is unavailable at compile time inside
    /// extension targets, which is why this needs workarounds at all.
    /// Tries the https:// Universal Link first — Apple's actual recommended
    /// mechanism, reliable now that the domain association (Team ID in
    /// app/.well-known/apple-app-site-association + the Associated Domains
    /// capability in Xcode) is live — and reports back whether it opened so
    /// the caller can complete immediately on success instead of always
    /// padding with a fixed delay.
    private func openUniversalLink(_ universalURL: URL, completion: @escaping (Bool) -> Void) {
        extensionContext?.open(universalURL, completionHandler: completion)
    }

    private func complete() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}

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
///
/// TEMPORARY: every step below has a print() for debugging the "flashes and
/// nothing happens" issue. Once the handoff works reliably, these can come
/// out — see docs/ios-share-extension.md's troubleshooting section.
class ShareViewController: UIViewController {

    /// Must match capacitor.config.ts's server.url.
    private static let host = "vercel-ecru-iota-55.vercel.app"

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        print("Avocato: viewDidAppear")

        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = item.attachments, !attachments.isEmpty else {
            print("Avocato: no attachments found")
            return complete()
        }
        print("Avocato: found \(attachments.count) attachment(s)")

        // Prefer a real URL attachment; TikTok sometimes shares the link as
        // plain text instead, so fall back to that.
        if let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            print("Avocato: loading URL attachment")
            provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, error in
                if let error = error {
                    print("Avocato: URL attachment load error: \(error)")
                }
                if let url = data as? URL {
                    print("Avocato: got URL: \(url.absoluteString)")
                    self?.openInAvocato(url.absoluteString)
                } else if let data = data as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                    print("Avocato: got URL from Data: \(url.absoluteString)")
                    self?.openInAvocato(url.absoluteString)
                } else {
                    print("Avocato: URL attachment had no usable data (type: \(type(of: data)))")
                    self?.complete()
                }
            }
        } else if let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            print("Avocato: loading plain text attachment")
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, error in
                if let error = error {
                    print("Avocato: text attachment load error: \(error)")
                }
                if let text = data as? String {
                    print("Avocato: got text: \(text)")
                    self?.openInAvocato(text)
                } else {
                    print("Avocato: text attachment had no usable data")
                    self?.complete()
                }
            }
        } else {
            print("Avocato: no URL or text attachment among: \(attachments.map { $0.registeredTypeIdentifiers })")
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
        // auto-open doesn't fire, the app's existing clipboard banner offers
        // one-tap extraction the moment the user opens Avocato — the share
        // is never just lost.
        UIPasteboard.general.string = link

        let encoded = link.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? link
        guard let schemeURL = URL(string: "avocato://share?url=\(encoded)"),
              let universalURL = URL(string: "https://\(Self.host)/?url=\(encoded)") else {
            print("Avocato: failed to build handoff URLs from: \(link)")
            return complete()
        }
        print("Avocato: opening \(schemeURL.absoluteString)")

        DispatchQueue.main.async {
            self.openURL(scheme: schemeURL, universal: universalURL)
            // Don't tear the extension down in the same runloop tick as the
            // open call — on recent iOS that can cancel the still-pending
            // app launch, which reads as "tapped Avocato, nothing happened".
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                print("Avocato: completing request")
                self.complete()
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
    /// Fires both known handoff paths:
    /// - SwiftUI's OpenURLAction (read off a fresh EnvironmentValues, no
    ///   View needed) with the custom avocato:// scheme — works today
    ///   without any domain setup, but iOS treats it as best-effort from a
    ///   share extension (intermittent on device).
    /// - extensionContext.open with the https:// Universal Link — becomes
    ///   the reliable path once the domain association is live (Team ID in
    ///   app/.well-known/apple-app-site-association + the Associated
    ///   Domains capability in Xcode); until then it just reports false
    ///   and does nothing, so it's safe to always attempt.
    private func openURL(scheme schemeURL: URL, universal universalURL: URL) {
        extensionContext?.open(universalURL) { success in
            print("Avocato: extensionContext.open(universal) success=\(success)")
        }

        print("Avocato: calling EnvironmentValues openURL action with custom scheme")
        let action = EnvironmentValues().openURL
        action(schemeURL)
    }

    private func complete() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}

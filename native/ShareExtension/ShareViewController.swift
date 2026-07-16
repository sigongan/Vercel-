import UIKit
import UniformTypeIdentifiers

/// "Share → Avocato" from TikTok/YouTube/Safari/anywhere. Grabs the shared
/// link (or plain text containing one), hands it to the main app via the
/// avocato:// URL scheme, and dismisses itself — the app then lands on
/// /?url=<link>, which auto-starts recipe extraction.
///
/// This file replaces the ShareViewController.swift that Xcode generates
/// when you add a Share Extension target. See docs/ios-share-extension.md.
class ShareViewController: UIViewController {

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
                    // Some hosts hand the URL over as raw data instead.
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
        let encoded = link.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? link
        guard let url = URL(string: "avocato://share?url=\(encoded)") else { return complete() }

        DispatchQueue.main.async {
            self.openURL(url)
            // Don't tear the extension down in the same runloop tick as the
            // open call — on recent iOS that can cancel the still-pending
            // app launch, which reads as "tapped Avocato, nothing happened".
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
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

    /// Extensions can't use UIApplication.shared, so this tries the two
    /// known handoff paths in order:
    /// 1. extensionContext.open — the official API; not guaranteed for
    ///    share extensions but works on many iOS versions.
    /// 2. Walking the responder chain to the hosting UIApplication and
    ///    calling openURL: on it — the long-standing fallback pattern.
    private func openURL(_ url: URL) {
        extensionContext?.open(url) { [weak self] success in
            if !success {
                DispatchQueue.main.async {
                    self?.openURLViaResponderChain(url)
                }
            }
        }
    }

    private func openURLViaResponderChain(_ url: URL) {
        let selector = sel_registerName("openURL:")
        var responder: UIResponder? = self
        while let current = responder {
            if current.responds(to: selector) {
                current.perform(selector, with: url)
                return
            }
            responder = current.next
        }
    }

    private func complete() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}

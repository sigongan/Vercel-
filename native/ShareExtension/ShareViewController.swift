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
        let encoded = shared.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? shared
        guard let url = URL(string: "avocato://share?url=\(encoded)") else { return complete() }
        DispatchQueue.main.async {
            self.openURLViaResponderChain(url)
            self.complete()
        }
    }

    /// Extensions can't use UIApplication.shared, but the hosting app's
    /// UIApplication instance is reachable through the responder chain —
    /// the long-standing pattern share extensions use to open their app.
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

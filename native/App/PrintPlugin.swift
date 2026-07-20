import Capacitor
import UIKit

/// window.print() is a no-op inside a bare WKWebView (no default print
/// support, unlike mobile Safari) — this bridges to the real thing using
/// UIPrintInteractionController against the webview's own print formatter,
/// so the printed page matches exactly what's on screen (including the
/// print CSS in globals.css / print-area fitting from lib/printFit.ts,
/// applied by the JS side just before calling this). Registered in
/// AvocatoViewController.capacitorDidLoad.
@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "PrintPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    @objc func print(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else {
                call.reject("No webview available to print")
                return
            }

            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.outputType = .general
            printInfo.jobName = "Avocato Recipe"

            let controller = UIPrintInteractionController.shared
            controller.printInfo = printInfo
            controller.printFormatter = webView.viewPrintFormatter()

            controller.present(animated: true) { _, completed, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }
        }
    }
}

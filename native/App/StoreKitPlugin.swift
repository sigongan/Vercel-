import Capacitor
import StoreKit

/// Bridges StoreKit 2 to the web layer for the Pro subscription. The plugin
/// only ever hands the *signed* transaction (JWS) back to JS — it never
/// tells the server "trust me, they paid." lib/apple/verifyTransaction.ts
/// re-verifies that signature against Apple's own certificate before
/// granting Pro, so nothing here needs to be trusted on its own.
/// Registered in AvocatoViewController.capacitorDidLoad, same as the other
/// plugins — see docs/ios-storekit-setup.md for the Xcode wiring steps.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    @objc func getProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }
                call.resolve([
                    "id": product.id,
                    "displayName": product.displayName,
                    "description": product.description,
                    "displayPrice": product.displayPrice
                ])
            } catch {
                call.reject("Failed to fetch product", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve([
                            "status": "success",
                            "jwsRepresentation": verification.jwsRepresentation
                        ])
                    case .unverified:
                        call.reject("StoreKit could not verify this purchase on-device")
                    }
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    // Ask to Buy / parental approval — resolves later via
                    // Transaction.updates, which this plugin doesn't listen
                    // to yet. The web side treats "pending" as "not yet
                    // Pro"; restore() picks it up once approved.
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed", nil, error)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                for await result in Transaction.currentEntitlements {
                    guard case .verified(let transaction) = result else { continue }
                    call.resolve([
                        "status": "restored",
                        "productId": transaction.productID,
                        "jwsRepresentation": result.jwsRepresentation
                    ])
                    return
                }
                call.resolve(["status": "empty"])
            } catch {
                call.reject("Restore failed", nil, error)
            }
        }
    }
}

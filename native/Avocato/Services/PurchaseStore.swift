import Foundation
import StoreKit

/// The Pro subscription, sold exclusively through Apple's own payment system.
///
/// Apple requires In-App Purchase for anything unlocking functionality inside
/// the app (guideline 3.1.1) — Stripe or Apple Pay are not options here, this
/// is not a choice among several payment providers. StoreKit 2's `Product`
/// and `Transaction` types are Apple's, not a wrapper of Apple's: no
/// third-party SDK sits between this code and App Store Connect.
///
/// The server never takes this app's word for a purchase. Every path below —
/// a fresh purchase, a restore, an out-of-band renewal — ends by handing the
/// *signed* transaction (the JWS Apple attached to it) to
/// `/api/apple/verify-purchase`, which re-derives the facts from that
/// signature itself. Nothing here needs to be trusted on its own; it is
/// evidence, not an assertion.
@MainActor
final class PurchaseStore: ObservableObject {
    @Published private(set) var product: Product?
    @Published private(set) var isPro = false
    @Published private(set) var isPurchasing = false
    @Published var errorMessage: String?

    private let apiClient: APIClient
    private var updatesTask: Task<Void, Never>?

    /// Set in Info.plist rather than hardcoded: it names a product created in
    /// App Store Connect, which happens after this code is written, and must
    /// match Vercel's `APPLE_PRO_PRODUCT_ID` exactly. A build-time constant
    /// here would mean a wrong guess fails silently ("product not found")
    /// with nothing to grep for; a missing Info.plist entry fails loudly.
    private static var productId: String? {
        Bundle.main.object(forInfoDictionaryKey: "AppleProProductId") as? String
    }

    init(apiClient: APIClient) {
        self.apiClient = apiClient
        // Started once, at launch, for the lifetime of the app. This is what
        // catches a subscription approved later — Ask to Buy, a renewal, a
        // purchase restored from a family member — that StoreKit reports
        // outside the moment someone tapped Subscribe. The old Capacitor
        // plugin this replaces never listened here, which was a known,
        // written-down gap; this is where it gets closed.
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.process(update)
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    func loadProduct() async {
        guard let productId = Self.productId else {
            errorMessage = "Subscriptions aren't configured in this build."
            return
        }
        do {
            product = try await Product.products(for: [productId]).first
        } catch {
            errorMessage = "Could not load subscription info. Check your connection and try again."
        }
    }

    /// Starts a purchase. Returns once StoreKit has an answer — not once the
    /// server has confirmed it, since `.pending` (Ask to Buy) may never
    /// resolve in this session at all.
    func purchase() async {
        guard let product else { return }
        isPurchasing = true
        errorMessage = nil
        defer { isPurchasing = false }

        do {
            switch try await product.purchase() {
            case let .success(verification):
                await process(verification)
            case .userCancelled:
                break
            case .pending:
                errorMessage = "Waiting for approval — this may need a parent or guardian."
            @unknown default:
                errorMessage = "Something unexpected happened. Please try again."
            }
        } catch {
            errorMessage = "Purchase failed. Please try again."
        }
    }

    /// Re-syncs with the App Store and re-sends every current entitlement to
    /// the server. Covers a reinstall, a new device, and a subscription
    /// bought under a different Apple ID on the same family-sharing plan.
    func restore() async {
        isPurchasing = true
        errorMessage = nil
        defer { isPurchasing = false }

        do {
            try await AppStore.sync()
        } catch {
            errorMessage = "Could not reach the App Store. Please try again."
            return
        }

        // Tracks "did StoreKit hand us a real entitlement", independent of
        // whether the server confirmed it — conflating the two here was a
        // real bug: a found-but-unconfirmed entitlement would fall through
        // to "no previous purchase found for this Apple ID", which is simply
        // false and would send a paying user down the wrong troubleshooting
        // path entirely.
        var foundAny = false
        for await entitlement in Transaction.currentEntitlements {
            if await process(entitlement) { foundAny = true }
        }

        if !foundAny {
            errorMessage = "No previous purchase found for this Apple ID."
        }
        // Otherwise `process` already set `isPro` on success or a specific
        // `errorMessage` on a server-side confirmation failure.
    }

    /// Verifies the transaction is StoreKit's own (not just well-formed JSON
    /// someone handed the app) and sends its signature to the server for the
    /// verification that actually matters. Returns whether a genuine
    /// transaction was found and finished — true even if the server
    /// confirmation itself failed, which is what `restore()` needs to tell
    /// "nothing to restore" apart from "found one, couldn't confirm it".
    @discardableResult
    private func process(_ result: VerificationResult<Transaction>) async -> Bool {
        guard case let .verified(transaction) = result else {
            // StoreKit itself couldn't verify this on-device — a jailbroken
            // device or a tampered receipt. Not sent to the server at all;
            // there is nothing here worth spending a network round trip on.
            errorMessage = "This purchase could not be verified on this device."
            return false
        }

        do {
            try await apiClient.verifyPurchase(signedTransaction: result.jwsRepresentation)
            isPro = true
        } catch {
            // The purchase is real on Apple's side even if our server
            // couldn't record it just now — StoreKit will hand it to
            // `Transaction.updates` again, and Restore Purchases is always
            // available as a manual retry. Finishing it below is still
            // correct: an unfinished transaction would otherwise queue
            // forever and re-prompt on every launch.
            errorMessage = "Purchase succeeded but couldn't be confirmed with the server. Try Restore Purchases in a moment."
        }

        await transaction.finish()
        return true
    }
}

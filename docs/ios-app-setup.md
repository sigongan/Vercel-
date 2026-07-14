# Avocato iOS app — Mac-side setup

Everything that can be prepared without a Mac is already done and pushed
(Capacitor config, app icon/splash source images, native plugin wiring).
This is the part that has to run on your Mac, in order.

## Fast path: one script

If you just want this done with minimal typing, open **Terminal** (Cmd+Space,
type "Terminal") and paste this single line:

```bash
curl -fsSL https://raw.githubusercontent.com/sigongan/Vercel-/claude/recipe-extraction-tool-hui8ci/scripts/setup-ios.sh | bash
```

It clones the project to `~/Desktop/avocato-app`, installs everything,
generates the app icons, sets up the iOS project, and opens Xcode for you.
It'll ask for your Mac password once (for CocoaPods, if not already
installed). When Xcode opens, skip to **step 4** below (Signing & Capabilities).

If you'd rather run each command yourself and see what's happening, or the
script hits an error, follow the manual steps below instead.

## 0. Prerequisites

- **Xcode** installed from the Mac App Store (free, but a large download — start it early)
- **Node.js** installed (same version family as this project; `node -v` to check, 18+ is fine)
- **CocoaPods**: `sudo gem install cocoapods` (Capacitor's iOS platform uses it to manage dependencies)
- Your **Apple Developer Program** membership active ($99/yr, already done)

## 1. Pull the latest code

```bash
git clone https://github.com/sigongan/Vercel-.git avocato
cd avocato
git checkout claude/recipe-extraction-tool-hui8ci
npm install
```

## 2. Generate all the icon/splash sizes from the source images

The source images are already in `resources/icon.png` (1024×1024) and
`resources/splash.png` (2732×2732). This one command reads those and
generates every size Xcode's asset catalog needs:

```bash
npx @capacitor/assets generate --ios
```

## 3. Add the iOS platform

```bash
npx cap add ios
npx cap sync ios
```

This creates an `ios/` folder — a real Xcode project. Commit it:

```bash
git add ios resources capacitor.config.ts
git commit -m "Add iOS platform"
git push
```

## 4. Open it in Xcode

```bash
npx cap open ios
```

In Xcode:

1. Click the **App** project in the left sidebar → **Signing & Capabilities** tab
2. Under **Team**, select your Apple Developer account (sign in via Xcode → Settings → Accounts if it's not listed yet)
3. Xcode should auto-generate a provisioning profile once a team is selected — if it shows a red error instead, check that **Bundle Identifier** reads `app.avocato.ios` and isn't already taken by another app in your account (change it in `capacitor.config.ts`'s `appId` and re-run `npx cap sync ios` if you need a different one)

## 5. Run it

- Plug in your iPhone (or use a Simulator from the device dropdown at the top of Xcode)
- Press the ▶ Run button
- The app should launch showing the Avocato site, full-screen, no browser bar

If anything looks wrong (blank screen, network error), the most common cause is `capacitor.config.ts`'s `server.url` — confirm the production site loads fine in Safari first at the same URL.

## 6. Before submitting to the App Store

- **Swap the domain**: once your custom domain is live, update `server.url` in `capacitor.config.ts` to it, run `npx cap sync ios`, commit, and rebuild in Xcode. Submitting with the `vercel-ecru-iota-55.vercel.app` URL works but looks unprofessional in review and isn't stable long-term.
- **Screenshots**: Apple requires screenshots for the largest iPhone size at minimum. Run the app on an iPhone 15 Pro Max simulator and use Xcode's screenshot tool (Cmd+S in the simulator window).
- **App Store Connect listing**: create the app at [appstoreconnect.apple.com](https://appstoreconnect.apple.com), matching bundle ID `app.avocato.ios`. You'll need: a short/full description, keywords, a support URL (once the domain exists), and a privacy policy URL (`/privacy` on the live site already works for this).
- **Payment note**: this build does not add Apple in-app purchase — Pro subscriptions still go through the Stripe checkout already in the web app, opened in the system browser. This is allowed for a "reader"-style app in most cases, but if Apple's review flags it, the fallback is either removing purchase mentions from the app entirely (subscribe only via the website) or adding StoreKit in-app purchase — a separate follow-up if it comes up.
- **Review notes**: mention in App Store Connect's review notes that account creation uses a magic-link email (reviewers sometimes get stuck if they don't have inbox access during review) — provide a working test login if you have one, or explain the flow clearly.

## What's already done (don't redo these)

- `capacitor.config.ts` — points the app at the live site, sets the status bar background
- `resources/icon.png`, `resources/splash.png` — source art for step 2 above
- `lib/nativeApp.ts` + `components/NativeAppInit.tsx` — status bar styling and splash screen dismissal, wired into every page automatically
- `components/CookMode.tsx` — already calls the native keep-awake plugin when running as the app, on top of the existing web Wake Lock fallback
- Safe-area padding for Cook Mode's fixed header/footer, so it doesn't sit under the iPhone notch/home indicator

# "Share → Avocato" (iOS share sheet) — Mac-side setup

The goal: watching a recipe on TikTok/YouTube → tap **Share** → tap
**Avocato** → the app opens and starts extracting the recipe automatically.

The web and Capacitor sides are already done and deployed:
- `/?url=<link>` on the site auto-fills the Link tab and starts extraction
- The app listens for `avocato://share?url=<link>` and navigates there
  (`lib/nativeApp.ts` → `registerNativeShareListener`)

What's left needs Xcode. Two parts, ~10 minutes.

## Part 1 — Give the app its `avocato://` URL scheme

1. Open the project (`npx cap open ios` from the project folder, or open
   `ios/App/App.xcworkspace`)
2. Click the blue **App** project in the left sidebar → under **TARGETS**
   click **App**
3. Click the **Info** tab (next to Signing & Capabilities)
4. Scroll to the bottom, find **URL Types**, click the **+**
5. Fill in:
   - **Identifier**: `app.avocato.ios`
   - **URL Schemes**: `avocato`
6. That's it for part 1. (Quick test: build & run once, then open Safari on
   the iPhone and go to `avocato://share` — the app should open.)

## Part 2 — Add the Share Extension

1. Menu bar: **File → New → Target…**
2. In the sheet, search for **Share Extension** (iOS section) → **Next**
3. Fill in:
   - **Product Name**: `Share to Avocato` (this is the name shown in the share sheet)
   - **Team**: same team as the app
   - Language: **Swift**
4. **Finish**. If a dialog asks to "Activate 'Share to Avocato' scheme" →
   click **Cancel** (keep the App scheme active).
5. Xcode created a folder called **Share to Avocato** in the sidebar with a
   `ShareViewController.swift` inside. **Replace that file's entire
   contents** with the contents of `native/ShareExtension/ShareViewController.swift`
   from this repo (open it, select-all, paste).
6. Also in that folder, click the extension's **Info.plist** →
   expand **NSExtension → NSExtensionAttributes → NSExtensionActivationRule**.
   Change its type from String to **Dictionary**, then add these two keys
   inside it (both type Number):
   - `NSExtensionActivationSupportsWebURLWithMaxCount` = `1`
   - `NSExtensionActivationSupportsText` = `1`
7. There is one generated file we don't want: if the target was created with
   a `MainInterface.storyboard` and its Info.plist points at it
   (`NSExtensionMainStoryboard`), delete that Info.plist entry and add
   `NSExtensionPrincipalClass` (String) = `$(PRODUCT_MODULE_NAME).ShareViewController`
   instead, then delete the storyboard file. (If Xcode generated the target
   without a storyboard, skip this step.)
8. Select the **Share to Avocato** target → **Signing & Capabilities** →
   make sure the same **Team** is selected (bundle id will be
   `app.avocato.ios.Share-to-Avocato` or similar — fine).
9. Build & run the **App** scheme on your iPhone again.

## Test it

1. Open TikTok or YouTube, find any cooking video
2. Tap **Share** → scroll the bottom row of app icons → tap **More** if
   needed → **Share to Avocato** (you can enable/favorite it in that list
   the first time)
3. The extension flashes briefly, Avocato opens, and extraction starts on
   its own with the video's link filled in

## Troubleshooting

- **Avocato doesn't appear in the share sheet**: it only shows when sharing
  a *link or text* (not a photo). Also check the extension target actually
  built — it should be listed under TARGETS.
- **Tapping it does nothing / app doesn't open**: Part 1's URL scheme is
  missing or misspelled — it must be exactly `avocato`.
- **App opens but doesn't start extracting**: the app build is older than
  the deployed site. The site side updates automatically (remote-URL app),
  but force-quit and reopen the app once to pick up a fresh page load.

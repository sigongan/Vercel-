# "Share → Avocato" (iOS share sheet) — Mac-side setup

The goal: watching a recipe on TikTok/YouTube → tap **Share** → tap
**Avocato** → the app opens and starts extracting the recipe automatically.

**Important limitation**: some apps (YouTube's iOS app being the biggest
one) use their own custom share sheet instead of the system one — no
third-party extension, ours included, can appear there no matter how it's
configured. That's an Apple platform restriction, not something fixable on
our end. For those apps, the workaround is manual: copy the link (e.g.
YouTube's own "Copy link" button), switch to Avocato, open the **Link**
tab, and paste normally (long-press → Paste). We used to auto-detect this
via a background clipboard check, but that made iOS show its "Avocato
would like to paste from your other device" permission prompt every time
the app came to the foreground — too naggy, so it's been removed. A manual
paste never triggers that system prompt.

The web and Capacitor sides of the *share sheet* (Part 1/2 below) are
already done and deployed:
- `/?url=<link>` on the site auto-fills the Link tab and starts extraction
- The app listens for the Universal Link and navigates there
  (`lib/nativeApp.ts` → `registerNativeShareListener`)

**Why Universal Links, not a custom `avocato://` scheme**: the extension
originally opened a custom scheme, but the handoff from a Share Extension
to the containing app proved unreliable that way (intermittent "flashes and
nothing happens" — a widely-reported iOS quirk, not something wrong with
our setup). Universal Links are Apple's actual recommended mechanism for
this exact handoff — the same one Safari's "Open in App" banner and
Messages/Mail links use — and they degrade gracefully to opening Safari on
the real page instead of a hard failure if the domain association isn't
configured right. Three parts now, ~15 minutes.

## Part 1 — Associated Domains (Universal Links)

1. Find your **Team ID** (10 characters, e.g. `A1B2C3D4E5`): Xcode → App
   target → **Signing & Capabilities** tab → shown next to **Team**, or
   under your name at [developer.apple.com/account](https://developer.apple.com/account)
   → **Membership details**.
2. Tell me that Team ID — I'll fill it into
   `app/.well-known/apple-app-site-association` (already scaffolded, just
   has a placeholder) and push it. This file has to be live on the site
   before Part 2 will actually work.
3. In Xcode: App target → **Signing & Capabilities** → **+ Capability** →
   **Associated Domains** → **+** → add:
   ```
   applinks:vercel-ecru-iota-55.vercel.app
   ```
4. Build & run once. (There's no quick Safari test for this one the way
   the old URL scheme had — Universal Link association takes a short time
   for iOS to verify after the AASA file goes live, and is easiest to just
   test end-to-end in Part 2's test steps below.)

## Part 2 — Give the app its `avocato://` URL scheme too (fallback)

Keeping this as a backup in case Universal Link resolution is ever slow to
kick in (e.g. right after Part 1's file first goes live).

1. Open the project (`npx cap open ios` from the project folder, or open
   `ios/App/App.xcworkspace`)
2. Click the blue **App** project in the left sidebar → under **TARGETS**
   click **App**
3. Click the **Info** tab (next to Signing & Capabilities)
4. Scroll to the bottom, find **URL Types**, click the **+**
5. Fill in:
   - **Identifier**: `app.avocato.ios`
   - **URL Schemes**: `avocato`
6. That's it for part 2. (Quick test: build & run once, then open Safari on
   the iPhone and go to `avocato://share` — the app should open, though
   nothing in the app currently opens this scheme directly anymore — this
   is just kept registered as a fallback.)

## Part 3 — Add the Share Extension

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
- **Tapping it does nothing / app doesn't open**: most likely the Team ID in
  the AASA file (Part 1) isn't set yet, or the Associated Domains capability
  wasn't added — double check both. It can also take iOS a little while to
  verify a freshly-published AASA file the very first time.
- **App opens but doesn't start extracting**: the app build is older than
  the deployed site. The site side updates automatically (remote-URL app),
  but force-quit and reopen the app once to pick up a fresh page load.


import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Avocato ships as a "remote URL" Capacitor app: the native shell loads the
 * live production site directly (same as opening it in Safari), rather than
 * bundling a static export. The app has server-rendered pages, API routes,
 * cookie-based auth, and Stripe — none of which survive `next export` — so
 * bundling isn't an option here. This pattern is what a Capacitor wrapper is
 * really for: native capabilities (share extension, keep-awake, status bar)
 * around a web app that keeps deploying normally to Vercel. Every `git push`
 * updates the app instantly, no App Store review needed for content changes.
 *
 * Swap `server.url` for the custom domain once one is connected — before
 * submitting to the App Store, since Apple expects a stable production URL.
 */
const config: CapacitorConfig = {
  appId: "app.avocato.ios",
  appName: "Avocato",
  webDir: "public",
  server: {
    url: "https://vercel-ecru-iota-55.vercel.app",
    // Cookie-based Supabase auth needs the WKWebView to treat this like a
    // normal HTTPS navigation, not a sandboxed local file origin.
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#FAFAF7",
  },
  plugins: {
    SplashScreen: {
      // This splash — the static avocado from resources/splash.png — is what
      // covers the gap between the app process starting and the remote web
      // app finishing its load. It used to be switched off entirely
      // (launchShowDuration 0) on the assumption that AnimatedSplashView
      // covered that window, but that view only exists in builds where the
      // native/App Swift files were added by hand; without them the webview
      // sat blank and white for about a second on every launch.
      //
      // autoHide stays on as a safety net: NativeAppInit calls
      // SplashScreen.hide() the moment the app is ready (usually well under
      // a second, which is what actually dismisses this), and the duration
      // below is only the ceiling for when that call never comes — a failed
      // load, no network — so a broken launch can't strand anyone on a
      // frozen splash.
      launchShowDuration: 3000,
      launchAutoHide: true,
      // Cross-fade into the app instead of cutting to it.
      launchFadeOutDuration: 250,
      backgroundColor: "#FAFAF7",
      showSpinner: false,
    },
  },
};

export default config;

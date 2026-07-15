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
    backgroundColor: "#fdf3ec",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden manually once the first page finishes loading — see lib/nativeApp.ts
      backgroundColor: "#fdf3ec",
    },
  },
};

export default config;

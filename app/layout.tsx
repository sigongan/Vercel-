import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE_EN, SITE_URL } from "@/lib/siteConfig";
import { NativeAppInit } from "@/components/NativeAppInit";
import { SignInGate } from "@/components/SignInGate";
import { BottomTabBar } from "@/components/BottomTabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Recipe Extractor`, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE_EN,
  openGraph: {
    title: `${SITE_NAME} — Recipe Extractor`,
    description: SITE_TAGLINE_EN,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Recipe Extractor`,
    description: SITE_TAGLINE_EN,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
};

// Caps zoom so a small-font input (e.g. the notes textarea) can't trigger
// iOS Safari's focus auto-zoom and leave the app stuck zoomed in.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          // Runs before hydration so the saved theme applies on first paint
          // instead of flashing the default and then switching.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("avocato:theme");var r=document.documentElement;if(t==="dark")r.classList.add("dark");else if(t==="pink")r.setAttribute("data-theme","pink");}catch(e){}})();`,
          }}
        />
        {/* Static (non-React) boot splash for the native iOS shell. Present
            in every response — server rendering can't know whether the
            request is from the native app or the website — but hidden by
            default so web visitors never see it. The script right after it
            is the only thing that can reveal it, and it runs synchronously
            before first paint (same trick as the theme script above), which
            is what makes this flash-free: waiting for NativeAppInit's React
            effect to decide native-vs-web is too late, since by then the
            browser has already painted a raw, unstyled frame. */}
        <div
          id="native-boot-splash"
          aria-hidden
          style={{ display: "none" }}
          className="fixed inset-0 z-[999] flex-col items-center justify-center gap-4 bg-[#FAFAF7]"
        >
          <svg width={64} height={64} viewBox="0 0 100 100">
            <path
              d="M50 8 C59 8 64 20 65.5 31 C78 39 83 54 81 66 C78 85 63 94 50 94 C37 94 22 85 19 66 C17 54 22 39 34.5 31 C36 20 41 8 50 8 Z"
              fill="#3f6212"
            />
            <path
              d="M50 16 C57 16 61 26 62.5 35.5 C73 42.5 77.5 55 75.5 65 C73 81 60.5 88 50 88 C39.5 88 27 81 24.5 65 C22.5 55 27 42.5 37.5 35.5 C39 26 43 16 50 16 Z"
              fill="#d9f99d"
            />
            <circle cx="50" cy="63" r="13.5" fill="#854d0e" />
            <circle cx="45.5" cy="58.5" r="4" fill="#a16207" />
          </svg>
          <p className="mt-2 text-[15px] font-medium text-[#5D6551]">Warming up the kitchen…</p>
        </div>
        <script
          // Reveals the boot splash the instant we know this is the native
          // app — before React, before hydration, before the browser's
          // first paint. window.Capacitor is injected by the native shell
          // ahead of any page script, so it's already there by now.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){var el=document.getElementById("native-boot-splash");if(el)el.style.display="flex";}}catch(e){}})();`,
          }}
        />
        <NativeAppInit />
        <SignInGate />
        {children}
        <BottomTabBar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

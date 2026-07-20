import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
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

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          // Runs before hydration so the saved theme applies on first paint
          // instead of flashing the default and then switching.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("avocato:theme");var r=document.documentElement;if(t==="dark")r.classList.add("dark");else if(t==="pink")r.setAttribute("data-theme","pink");}catch(e){}})();`,
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

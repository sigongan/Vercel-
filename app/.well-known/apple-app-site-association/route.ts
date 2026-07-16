import { NextResponse } from "next/server";

/**
 * Universal Links config — lets iOS treat links on this domain as belonging
 * to the Avocato app instead of always opening Safari. This is what makes
 * the Share Extension's app-open handoff reliable: extensionContext.open()
 * with a real https:// URL on a domain with a verified AASA file uses
 * Apple's actual Universal Link resolution instead of the flaky custom
 * URL-scheme handoff extensions otherwise have to rely on.
 *
 * TEAM_ID below is a placeholder — replace it with the 10-character Apple
 * Developer Team ID (Xcode → App target → Signing & Capabilities → Team,
 * or developer.apple.com → Membership) before this takes effect. iOS won't
 * associate the domain with the app until this is a real Team ID and the
 * "Associated Domains" capability (applinks:vercel-ecru-iota-55.vercel.app)
 * is added to the App target in Xcode.
 */
const TEAM_ID = "TEAM_ID_PLACEHOLDER";
const APP_ID = "app.avocato.ios";

export async function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${TEAM_ID}.${APP_ID}`,
            paths: ["/*"],
          },
        ],
      },
    },
    { headers: { "Content-Type": "application/json" } },
  );
}

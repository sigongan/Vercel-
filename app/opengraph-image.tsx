import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE_EN } from "@/lib/siteConfig";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#fafaf9",
          backgroundImage:
            "radial-gradient(60% 60% at 50% 0%, rgba(234,88,12,0.12), transparent 70%)",
        }}
      >
        <div style={{ fontSize: 140, lineHeight: 1, display: "flex" }}>🥑</div>
        <div style={{ fontSize: 84, fontWeight: 600, color: "#1c1917", display: "flex" }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 32, color: "#57534e", display: "flex", maxWidth: 820, textAlign: "center" }}>
          {SITE_TAGLINE_EN}
        </div>
      </div>
    ),
    { ...size }
  );
}

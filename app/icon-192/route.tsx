import { ImageResponse } from "next/og";
import { AvocadoMark } from "@/lib/avocadoMark";

export const dynamic = "force-static";

// PWA install icon (manifest.ts) — launcher size.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(145deg, #E6F3C5, #C4E484)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 42,
        }}
      >
        <AvocadoMark size={132} />
      </div>
    ),
    { width: 192, height: 192 }
  );
}

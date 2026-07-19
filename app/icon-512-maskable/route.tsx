import { ImageResponse } from "next/og";
import { AvocadoMark } from "@/lib/avocadoMark";

export const dynamic = "force-static";

// Maskable PWA icon: full-bleed background (the launcher crops its own
// shape), mark kept inside the ~80% safe zone.
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
        }}
      >
        <AvocadoMark size={300} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}

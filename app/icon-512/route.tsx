import { ImageResponse } from "next/og";
import { AvocadoMark } from "@/lib/avocadoMark";

export const dynamic = "force-static";

// PWA install icon (manifest.ts), large size.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1c1917",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 112,
        }}
      >
        <AvocadoMark size={352} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}

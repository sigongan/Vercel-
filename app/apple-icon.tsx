import { ImageResponse } from "next/og";
import { AvocadoMark } from "@/lib/avocadoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(145deg, #f7dcc8, #f3c9ae)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AvocadoMark size={124} />
      </div>
    ),
    { ...size }
  );
}

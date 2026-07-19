import { ImageResponse } from "next/og";
import { AvocadoMark } from "@/lib/avocadoMark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(145deg, #D9E7CC, #C2D9B0)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
        }}
      >
        <AvocadoMark size={22} />
      </div>
    ),
    { ...size }
  );
}

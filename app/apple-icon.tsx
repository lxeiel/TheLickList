import { ImageResponse } from "next/og";

// The home-screen icon on iPhones: the same "L." as app/icon.svg, drawn on
// the 64-unit grid and scaled up. Square, since iOS rounds the corners.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const unit = size.width / 64;
const box = (x: number, y: number, w: number, h: number) => ({
  position: "absolute" as const,
  left: x * unit,
  top: y * unit,
  width: w * unit,
  height: h * unit,
});

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#161616" }}>
        <div style={{ ...box(17, 12, 13, 38), background: "#EDEDED" }} />
        <div style={{ ...box(17, 38, 27, 12), background: "#EDEDED" }} />
        <div style={{ ...box(45.5, 39, 11, 11), borderRadius: "50%", background: "#59C0A2" }} />
      </div>
    ),
    size,
  );
}

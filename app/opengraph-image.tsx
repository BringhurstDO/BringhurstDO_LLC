import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "BringhurstDO LLC social preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background:
            "linear-gradient(135deg, #0b1b26 0%, #12313a 52%, #1f4651 100%)",
          color: "#f8fbfc",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 22%, rgba(102,203,234,0.24), transparent 34%), radial-gradient(circle at 80% 18%, rgba(36,125,138,0.24), transparent 30%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              border: "1px solid rgba(189,239,255,0.45)",
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 18,
              letterSpacing: 1.2,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#bdefff",
              background: "rgba(8, 27, 38, 0.45)",
            }}
          >
            BringhurstDO LLC
          </div>

          <div
            style={{
              fontSize: 70,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.8,
              maxWidth: 960,
            }}
          >
            Engineering documentation for high-stakes work.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 30,
              opacity: 0.9,
            }}
          >
            Clinical | Industrial | Learning
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              borderRadius: 999,
              background: "rgba(248,251,252,0.16)",
              padding: "10px 18px",
            }}
          >
            bringhurstdo.com
          </div>
        </div>
      </div>
    ),
    size
  );
}

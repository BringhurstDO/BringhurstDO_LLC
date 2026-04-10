import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "BringhurstDO LLC";
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
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #f4f7f8 0%, #eef3f5 52%, #dde7ea 100%)",
          color: "#12313a",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(36,125,138,0.15), transparent 32%), radial-gradient(circle at 80% 20%, rgba(88,107,118,0.12), transparent 24%), radial-gradient(circle at 50% 90%, rgba(36,125,138,0.09), transparent 28%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: "56px 64px 0",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 28,
              background: "rgba(255,255,255,0.86)",
              border: "1px solid rgba(36,125,138,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(18,49,58,0.12)",
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 20,
                background:
                  "linear-gradient(180deg, rgba(36,125,138,1), rgba(88,107,118,1))",
                clipPath:
                  "polygon(50% 6%, 93% 28%, 93% 72%, 50% 94%, 7% 72%, 7% 28%)",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, letterSpacing: 2, opacity: 0.72 }}>
              BringhurstDO LLC
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              Clinical, industrial,
              <br />
              and learning tools.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "0 64px 56px",
            position: "relative",
          }}
        >
          <div style={{ maxWidth: 720, fontSize: 30, lineHeight: 1.4, opacity: 0.84 }}>
            Engineering documentation for the high-stakes practitioner.
            Designed for clarity, speed, and trust.
          </div>
          <div
            style={{
              padding: "14px 20px",
              borderRadius: 999,
              background: "rgba(18,49,58,0.92)",
              color: "#f4f7f8",
              fontSize: 24,
              fontWeight: 700,
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

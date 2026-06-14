import {
  brandLogoPath,
  defaultDescription,
  siteName,
} from "@/utils/site-metadata";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = `${siteName} — Topic to post-ready carousel slides`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadInterFont(weight: 400 | 600 | 700) {
  return readFile(
    join(process.cwd(), "app/fonts", `inter-${weight}.ttf`),
  );
}

export default async function Image() {
  const [fontRegular, fontSemibold, fontBold, logoData] = await Promise.all([
    loadInterFont(400),
    loadInterFont(600),
    loadInterFont(700),
    readFile(join(process.cwd(), brandLogoPath)),
  ]);

  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(249,115,22,0.22) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(234,88,12,0.12) 0%, transparent 40%)",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            style={{ objectFit: "contain" }}
          />
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#f4f4f5",
              letterSpacing: "-0.02em",
            }}
          >
            {siteName}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#f97316",
            }}
          >
            Carousel content in minutes
          </p>
          <h1
            style={{
              margin: 0,
              maxWidth: 900,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#f4f4f5",
            }}
          >
            Turn a topic into post-ready slides
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 780,
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.45,
              color: "#a1a1aa",
            }}
          >
            {defaultDescription}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {["Slide copy", "AI visuals", "Captions"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid #3f3f46",
                  backgroundColor: "rgba(24,24,27,0.85)",
                  color: "#d4d4d8",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  width: index === 1 ? 92 : 76,
                  height: index === 1 ? 118 : 98,
                  borderRadius: 14,
                  border: "2px solid",
                  borderColor: index === 1 ? "#f97316" : "#3f3f46",
                  backgroundColor: "#18181b",
                  opacity: index === 0 ? 0.55 : index === 2 ? 0.75 : 1,
                  transform: `translateY(${index === 1 ? 0 : 8}px)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fontSemibold, weight: 600, style: "normal" },
        { name: "Inter", data: fontBold, weight: 700, style: "normal" },
      ],
    },
  );
}

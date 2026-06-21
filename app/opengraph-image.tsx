import {
  brandLogoPath,
  defaultDescription,
  siteName,
} from "@/utils/site-metadata";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = `${siteName} — Carousel slides & AI-narrated video`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const heroPosterPath = "public/marketing/hero-poster.webp";

async function loadInterFont(weight: 400 | 600 | 700) {
  return readFile(
    join(process.cwd(), "app/fonts", `inter-${weight}.ttf`),
  );
}

export default async function Image() {
  const [fontRegular, fontSemibold, fontBold, logoData, heroPosterData] =
    await Promise.all([
      loadInterFont(400),
      loadInterFont(600),
      loadInterFont(700),
      readFile(join(process.cwd(), brandLogoPath)),
      readFile(join(process.cwd(), heroPosterPath)),
    ]);

  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;
  const heroPosterSrc = `data:image/webp;base64,${heroPosterData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(249,115,22,0.22) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(234,88,12,0.12) 0%, transparent 40%)",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "58%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={logoSrc}
              alt=""
              width={44}
              height={44}
              style={{ objectFit: "contain" }}
            />
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#f4f4f5",
                letterSpacing: "-0.02em",
              }}
            >
              {siteName}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#f97316",
              }}
            >
              Carousel & video in minutes
            </p>
            <h1
              style={{
                margin: 0,
                maxWidth: 620,
                fontSize: 54,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                color: "#f4f4f5",
              }}
            >
              Slides, narration & Reel-ready video
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: 560,
                fontSize: 24,
                fontWeight: 400,
                lineHeight: 1.45,
                color: "#a1a1aa",
              }}
            >
              {defaultDescription}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {["Slides", "AI voice", "Video"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid #3f3f46",
                  backgroundColor: "rgba(24,24,27,0.85)",
                  color: "#d4d4d8",
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 250,
              padding: 10,
              borderRadius: 36,
              border: "3px solid #3f3f46",
              backgroundColor: "#18181b",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 8,
                borderRadius: 999,
                backgroundColor: "#27272a",
                marginBottom: 10,
              }}
            />
            <div
              style={{
                display: "flex",
                width: "100%",
                height: 430,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: "#09090b",
              }}
            >
              <img
                src={heroPosterSrc}
                alt=""
                width={230}
                height={430}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            </div>
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

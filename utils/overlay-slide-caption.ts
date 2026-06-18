import sharp from "sharp";
import { wrapCaptionText } from "@/utils/build-caption-srt";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCaptionSvg(
  text: string,
  width: number,
  height: number,
): string {
  const wrapped = wrapCaptionText(text, 34);
  const lines = wrapped.split("\n").filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  const fontSize = height >= 1800 ? 36 : 32;
  const lineHeight = Math.round(fontSize * 1.35);
  const paddingX = 40;
  const paddingY = 20;
  const textBlockHeight = lines.length * lineHeight;
  const barTop = Math.round(height * 0.72) - paddingY;
  const barHeight = height - barTop;

  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<tspan x="50%" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const textY = barTop + paddingY + fontSize;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${barTop}" width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.62)"/>
  <text x="50%" y="${textY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" stroke="#000000" stroke-width="2" paint-order="stroke">
    ${tspans}
  </text>
</svg>`;
}

export async function overlayCaptionOnSlideImage(
  imageBuffer: Buffer,
  captionText: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const trimmed = captionText.trim();
  if (!trimmed) {
    return imageBuffer;
  }

  const svg = buildCaptionSvg(trimmed, width, height);
  if (!svg) {
    return imageBuffer;
  }

  const normalized = await sharp(imageBuffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 94 })
    .toBuffer();

  return sharp(normalized)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 94 })
    .toBuffer();
}

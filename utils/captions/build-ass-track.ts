import { createHash } from "node:crypto";
import type { WordTiming } from "@/utils/tts/types";

export const BURN_CAPTION_STYLE_V1 = {
  version: "v1.3",
  fontName: "Inter",
  fontSizeRatio: 0.065,
  marginVRatio: 0.18,
  primaryColor: "&H00FFFFFF",
  highlightColor: "&H0000A5FF",
  bold: true,
  wordsPerChunk: 3,
  /** ASS numpad alignment — 2 = bottom center (Reels-style lower third). */
  alignment: 2,
  /** Outline width in pixels — thick for legibility on busy slides. */
  outline: 6,
  /** Drop shadow depth in pixels (BorderStyle 1). */
  shadow: 4,
  /** Scrim: lower band opacity (bottom half of caption region). */
  scrimOpacityStrong: 0.34,
  /** Scrim: upper band opacity (fade toward slide content). */
  scrimOpacitySoft: 0.14,
} as const;

export interface BurnCaptionLayout {
  width: number;
  height: number;
  fontSize: number;
  marginV: number;
  scrimTop: number;
  scrimHeight: number;
}

/** Caption anchor + scrim region derived from the same ratios as the ASS style. */
export function getBurnCaptionLayout(
  width: number,
  height: number,
  style: typeof BURN_CAPTION_STYLE_V1 = BURN_CAPTION_STYLE_V1,
): BurnCaptionLayout {
  const fontSize = Math.round(height * style.fontSizeRatio);
  const marginV = Math.round(height * style.marginVRatio);
  const textBlockHeight = Math.round(fontSize * 2.8);
  const padding = Math.round(fontSize * 0.6);
  const scrimHeight = marginV + textBlockHeight + padding;

  return {
    width,
    height,
    fontSize,
    marginV,
    scrimTop: Math.max(0, height - scrimHeight),
    scrimHeight,
  };
}

export function parseAssPlayResolution(assContent: string): {
  width: number;
  height: number;
} {
  const playResX = assContent.match(/^PlayResX:\s*(\d+)/m);
  const playResY = assContent.match(/^PlayResY:\s*(\d+)/m);

  if (!playResX?.[1] || !playResY?.[1]) {
    throw new Error("ASS track is missing PlayResX/PlayResY");
  }

  return {
    width: Number(playResX[1]),
    height: Number(playResY[1]),
  };
}

/**
 * Two-band scrim (soft top, strong bottom) aligned to the ASS caption region.
 * Returns drawbox filters only — combine with ass= in the same FFmpeg -vf chain.
 */
export function buildBurnCaptionScrimFilters(
  layout: BurnCaptionLayout,
  style: typeof BURN_CAPTION_STYLE_V1 = BURN_CAPTION_STYLE_V1,
): string {
  const { width, scrimTop, scrimHeight } = layout;
  const lowerHeight = Math.max(1, Math.round(scrimHeight / 2));
  const upperHeight = Math.max(1, scrimHeight - lowerHeight);
  const upperTop = scrimTop;
  const lowerTop = scrimTop + upperHeight;

  const upperScrim = `drawbox=x=0:y=${upperTop}:w=${width}:h=${upperHeight}:color=black@${style.scrimOpacitySoft}:t=fill`;
  const lowerScrim = `drawbox=x=0:y=${lowerTop}:w=${width}:h=${lowerHeight}:color=black@${style.scrimOpacityStrong}:t=fill`;

  return `${upperScrim},${lowerScrim}`;
}

export interface BuildAssTrackInput {
  words: WordTiming[];
  width: number;
  height: number;
  style?: typeof BURN_CAPTION_STYLE_V1;
}

function formatAssTimestamp(seconds: number): string {
  const totalCs = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(totalCs / 360_000);
  const minutes = Math.floor((totalCs % 360_000) / 6_000);
  const secs = Math.floor((totalCs % 6_000) / 100);
  const cs = totalCs % 100;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function chunkWords(words: WordTiming[], chunkSize: number): WordTiming[][] {
  const chunks: WordTiming[][] = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    chunks.push(words.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildChunkLine(
  chunk: WordTiming[],
  activeWord: WordTiming,
  style: typeof BURN_CAPTION_STYLE_V1,
): string {
  return chunk
    .map((word) => {
      const escaped = escapeAssText(word.word);
      if (word.word === activeWord.word && word.startSeconds === activeWord.startSeconds) {
        return `{\\1c&H00A5FF&}${escaped}{\\1c&HFFFFFF&}`;
      }

      return escaped;
    })
    .join(" ");
}

export function buildAssCacheKey(
  narrationFingerprint: string,
  aspectRatio: string,
  styleVersion: string,
): string {
  return createHash("sha256")
    .update(`${narrationFingerprint}:${aspectRatio}:${styleVersion}`)
    .digest("hex");
}

export function buildAssTrack(input: BuildAssTrackInput): string {
  const style = input.style ?? BURN_CAPTION_STYLE_V1;
  const fontSize = Math.round(input.height * style.fontSizeRatio);
  const marginV = Math.round(input.height * style.marginVRatio);
  const bold = style.bold ? -1 : 0;
  const chunks = chunkWords(input.words, style.wordsPerChunk);

  if (input.words.length === 0) {
    throw new Error("Cannot build ASS track without word timings");
  }

  const header = [
    "[Script Info]",
    "Title: SlidePress Burn Captions",
    "ScriptType: v4.00+",
    `PlayResX: ${input.width}`,
    `PlayResY: ${input.height}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${style.fontName},${fontSize},${style.primaryColor},${style.highlightColor},&H00000000,&H96000000,${bold},0,0,0,100,100,0,0,1,${style.outline},${style.shadow},${style.alignment},40,40,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];

  for (const chunk of chunks) {
    for (const activeWord of chunk) {
      const start = formatAssTimestamp(activeWord.startSeconds);
      const end = formatAssTimestamp(activeWord.endSeconds);
      const text = buildChunkLine(chunk, activeWord, style);
      events.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`);
    }
  }

  return `${header.join("\n")}\n${events.join("\n")}\n`;
}

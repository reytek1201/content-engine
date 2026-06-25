import { createHash } from "node:crypto";
import type { WordTiming } from "@/utils/tts/types";

export const BURN_CAPTION_STYLE_V1 = {
  version: "v1",
  fontName: "Arial",
  fontSizeRatio: 0.065,
  marginVRatio: 0.38,
  primaryColor: "&H00FFFFFF",
  highlightColor: "&H0000A5FF",
  bold: true,
  wordsPerChunk: 3,
} as const;

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
        return `{\\1c${style.highlightColor}}${escaped}{\\1c${style.primaryColor}}`;
      }

      return escaped;
    })
    .join(" ");
}

export function buildAssCacheKey(
  narrationFingerprint: string,
  styleVersion: string,
): string {
  return createHash("sha256")
    .update(`${narrationFingerprint}:${styleVersion}`)
    .digest("hex");
}

export function buildAssTrack(input: BuildAssTrackInput): string {
  const style = input.style ?? BURN_CAPTION_STYLE_V1;
  const fontSize = Math.round(input.height * style.fontSizeRatio);
  const marginV = Math.round(input.height * style.marginVRatio);
  const bold = style.bold ? -1 : 0;
  const chunks = chunkWords(input.words, style.wordsPerChunk);

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
    `Style: Default,${style.fontName},${fontSize},${style.primaryColor},${style.highlightColor},&H00000000,&H64000000,${bold},0,0,0,100,100,0,0,1,2,0,5,40,40,${marginV},1`,
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

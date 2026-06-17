import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import {
  buildCaptionSrt,
  type CaptionSegment,
} from "@/utils/build-caption-srt";

const execFileAsync = promisify(execFile);

function escapeSubtitlesPath(filePath: string): string {
  return filePath
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

export async function burnCaptionsOnVideo(
  videoBuffer: Buffer,
  segments: CaptionSegment[],
): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error("FFmpeg is not available for caption burn-in");
  }

  const srt = buildCaptionSrt(segments);
  if (!srt.trim()) {
    return videoBuffer;
  }

  const dir = await mkdtemp(join(tmpdir(), "slidepress-captions-"));

  try {
    const inputPath = join(dir, "input.mp4");
    const srtPath = join(dir, "captions.srt");
    const outputPath = join(dir, "output.mp4");

    await writeFile(inputPath, videoBuffer);
    await writeFile(srtPath, srt, "utf8");

    const subtitleFilter = `subtitles='${escapeSubtitlesPath(srtPath)}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=48'`;

    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-vf",
      subtitleFilter,
      "-c:a",
      "copy",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function fetchVideoBuffer(videoUrl: string): Promise<Buffer> {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error("Failed to download video for caption burn-in");
  }

  return Buffer.from(await response.arrayBuffer());
}

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AspectRatio } from "@/types/campaign";
import { requireFfmpegPath } from "@/utils/ffmpeg";
import { VIDEO_EXPORT_FPS } from "@/utils/fal-video";
import { getVideoDimensions } from "@/utils/video-dimensions";

const execFileAsync = promisify(execFile);

export const VIDEO_CROSSFADE_SECONDS = 0.45;

export interface SlideClipInput {
  imageUrl: string;
  durationSeconds: number;
  captionText?: string;
}

export interface ComposeSlideVideoOptions {
  aspectRatio: AspectRatio;
  crossfadeSeconds?: number;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download slide image for video compose");
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildStaticSlideFilter(width: number, height: number): string {
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    `fps=${VIDEO_EXPORT_FPS}`,
    "format=yuv420p",
  ].join(",");
}

async function renderSlideClip(
  imagePath: string,
  outputPath: string,
  durationSeconds: number,
  width: number,
  height: number,
): Promise<void> {
  const vf = buildStaticSlideFilter(width, height);

  await execFileAsync(requireFfmpegPath(), [
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-vf",
    vf,
    "-t",
    String(durationSeconds),
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
}

function buildXfadeFilterChain(
  clipCount: number,
  durations: number[],
  crossfadeSeconds: number,
): string {
  if (clipCount < 2) {
    throw new Error("xfade requires at least two clips");
  }

  const filters: string[] = [];
  let previousLabel = "0:v";
  let offset = durations[0]! - crossfadeSeconds;

  for (let index = 1; index < clipCount; index++) {
    const outputLabel = index === clipCount - 1 ? "outv" : `v${index}`;
    filters.push(
      `[${previousLabel}][${index}:v]xfade=transition=fade:duration=${crossfadeSeconds}:offset=${offset.toFixed(3)}[${outputLabel}]`,
    );
    previousLabel = outputLabel;
    offset += durations[index]! - crossfadeSeconds;
  }

  return filters.join(";");
}

async function concatClipsSimple(
  clipPaths: string[],
  outputPath: string,
): Promise<void> {
  const listPath = outputPath.replace(/\.mp4$/, "-concat.txt");
  const listLines = clipPaths.map(
    (clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`,
  );

  await writeFile(listPath, `${listLines.join("\n")}\n`);

  await execFileAsync(requireFfmpegPath(), [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath,
  ]);
}

async function concatClipsWithCrossfade(
  clipPaths: string[],
  durations: number[],
  outputPath: string,
  crossfadeSeconds: number,
): Promise<void> {
  const args = ["-y"];

  for (const clipPath of clipPaths) {
    args.push("-i", clipPath);
  }

  const filter = buildXfadeFilterChain(
    clipPaths.length,
    durations,
    crossfadeSeconds,
  );

  args.push(
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  );

  await execFileAsync(requireFfmpegPath(), args);
}

export async function composeSlidesToVideo(
  slides: SlideClipInput[],
  options: ComposeSlideVideoOptions,
): Promise<Buffer> {
  if (slides.length === 0) {
    throw new Error("No slides provided for video compose");
  }

  const crossfadeSeconds = options.crossfadeSeconds ?? VIDEO_CROSSFADE_SECONDS;
  const { width, height } = getVideoDimensions(options.aspectRatio);
  const dir = await mkdtemp(join(tmpdir(), "slidepress-compose-"));

  try {
    const clipPaths: string[] = [];
    const durations: number[] = [];

    for (let index = 0; index < slides.length; index++) {
      const slide = slides[index]!;
      const imageBuffer = await downloadImage(slide.imageUrl);
      const imagePath = join(dir, `slide-${index}.jpg`);
      const clipPath = join(dir, `clip-${index}.mp4`);

      await writeFile(imagePath, imageBuffer);
      await renderSlideClip(
        imagePath,
        clipPath,
        slide.durationSeconds,
        width,
        height,
      );

      clipPaths.push(clipPath);
      durations.push(slide.durationSeconds);
    }

    const outputPath = join(dir, "composed.mp4");

    if (clipPaths.length === 1 || crossfadeSeconds <= 0) {
      await concatClipsSimple(clipPaths, outputPath);
    } else {
      try {
        await concatClipsWithCrossfade(
          clipPaths,
          durations,
          outputPath,
          crossfadeSeconds,
        );
      } catch {
        await concatClipsSimple(clipPaths, outputPath);
      }
    }

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

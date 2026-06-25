import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { VideoDimensions } from "@/utils/video-dimensions";
import { requireFfmpegPath } from "@/utils/ffmpeg";

const execFileAsync = promisify(execFile);

export async function burnCaptionsIntoVideo(
  videoBuffer: Buffer,
  assContent: string,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "slidepress-burn-captions-"));

  try {
    const inputPath = join(dir, "input.mp4");
    const assPath = join(dir, "captions.ass");
    const outputPath = join(dir, "output.mp4");

    await writeFile(inputPath, videoBuffer);
    await writeFile(assPath, assContent, "utf8");

    const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "'\\''");

    await execFileAsync(requireFfmpegPath(), [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `ass='${escapedAssPath}'`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function logBurnCaptionsStage(
  exportId: string,
  stage: "alignment" | "ass_generation" | "ffmpeg_burn",
  details: Record<string, unknown>,
): void {
  console.info("[video-export] burn_captions", {
    exportId,
    stage,
    ...details,
  });
}

export type { VideoDimensions };

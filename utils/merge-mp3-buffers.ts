import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { requireFfmpegPath } from "@/utils/ffmpeg";
import { parseBuffer } from "music-metadata";

const execFileAsync = promisify(execFile);

export async function getMp3DurationSeconds(buffer: Buffer): Promise<number> {
  const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
  const duration = metadata.format.duration;

  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not determine MP3 duration");
  }

  return duration;
}

export async function concatMp3Buffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error("No audio buffers to merge");
  }

  if (buffers.length === 1) {
    return buffers[0]!;
  }

  const ffmpegPath = requireFfmpegPath();

  const dir = await mkdtemp(join(tmpdir(), "slidepress-mp3-"));

  try {
    const listLines: string[] = [];

    for (let index = 0; index < buffers.length; index++) {
      const partPath = join(dir, `part-${index}.mp3`);
      await writeFile(partPath, buffers[index]!);
      listLines.push(`file '${partPath.replace(/'/g, "'\\''")}'`);
    }

    const listPath = join(dir, "concat.txt");
    await writeFile(listPath, `${listLines.join("\n")}\n`);
    const outputPath = join(dir, "merged.mp3");

    await execFileAsync(ffmpegPath, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

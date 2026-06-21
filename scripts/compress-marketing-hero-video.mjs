import { execFile } from "node:child_process";
import { rename, stat } from "node:fs/promises";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const inputPath = join(process.cwd(), "public/marketing/slidepress-hero.mp4");
const tempPath = join(process.cwd(), "public/marketing/slidepress-hero.tmp.mp4");

async function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

if (!ffmpegPath) {
  console.error("ffmpeg-static binary not found");
  process.exit(1);
}

const before = await stat(inputPath);

await execFileAsync(ffmpegPath, [
  "-i",
  inputPath,
  "-vcodec",
  "libx264",
  "-crf",
  "28",
  "-preset",
  "medium",
  "-movflags",
  "+faststart",
  "-an",
  "-y",
  tempPath,
]);

await rename(tempPath, inputPath);

const after = await stat(inputPath);
console.log(
  `Compressed slidepress-hero.mp4: ${await formatBytes(before.size)} → ${await formatBytes(after.size)}`,
);

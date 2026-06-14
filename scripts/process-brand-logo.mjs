import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const brandLogoPath = "public/brand/logo.png";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const logoPath = join(rootDir, brandLogoPath);

function isBackgroundPixel(red, green, blue) {
  const channelSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

  if (red > 248 && green > 248 && blue > 248) {
    return true;
  }

  if (channelSpread < 18) {
    if (red >= 165 && red <= 235) {
      return true;
    }

    if (red >= 95 && red <= 145) {
      return true;
    }
  }

  return false;
}

async function processBrandLogo() {
  const { data, info } = await sharp(await readFile(logoPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x += 1) {
    queue.push([x, 0], [x, height - 1]);
  }

  for (let y = 0; y < height; y += 1) {
    queue.push([0, y], [width - 1, y]);
  }

  while (queue.length > 0) {
    const next = queue.pop();
    if (!next) {
      continue;
    }

    const [x, y] = next;
    if (x < 0 || y < 0 || x >= width || y >= height) {
      continue;
    }

    const visitIndex = y * width + x;
    if (visited[visitIndex]) {
      continue;
    }

    const pixelIndex = visitIndex * channels;
    const red = data[pixelIndex];
    const green = data[pixelIndex + 1];
    const blue = data[pixelIndex + 2];

    if (!isBackgroundPixel(red, green, blue)) {
      continue;
    }

    visited[visitIndex] = 1;
    data[pixelIndex + 3] = 0;

    queue.push(
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    );
  }

  for (let pass = 0; pass < 12; pass += 1) {
    let changed = false;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixelIndex = (y * width + x) * channels;
        if (data[pixelIndex + 3] === 0) {
          continue;
        }

        const red = data[pixelIndex];
        const green = data[pixelIndex + 1];
        const blue = data[pixelIndex + 2];
        const channelSpread =
          Math.max(red, green, blue) - Math.min(red, green, blue);
        const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
        const isLightFringe = luminance > 205 && channelSpread < 48;

        if (!isLightFringe) {
          continue;
        }

        const touchesTransparent = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ].some(([neighborX, neighborY]) => {
          if (
            neighborX < 0 ||
            neighborY < 0 ||
            neighborX >= width ||
            neighborY >= height
          ) {
            return true;
          }

          return data[(neighborY * width + neighborX) * channels + 3] === 0;
        });

        if (touchesTransparent) {
          data[pixelIndex + 3] = 0;
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  const output = await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .trim()
    .png()
    .toBuffer();

  await writeFile(logoPath, output);
  console.log(`Processed ${brandLogoPath} with alpha transparency.`);
}

processBrandLogo().catch((error) => {
  console.error(error);
  process.exit(1);
});

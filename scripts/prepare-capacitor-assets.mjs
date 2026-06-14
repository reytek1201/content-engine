import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BRAND_BACKGROUND = "#09090b";
const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;
const ICON_LOGO_SCALE = 0.72;
const SPLASH_LOGO_SCALE = 0.28;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const logoPath = join(rootDir, "public/brand/logo.png");
const assetsDir = join(rootDir, "assets");

async function composeOnCanvas({
  canvasSize,
  logoScale,
  outputPath,
  background,
  logoOnly = false,
}) {
  const logoBuffer = await readFile(logoPath);
  const logo = sharp(logoBuffer).ensureAlpha();
  const metadata = await logo.metadata();
  const logoWidth = metadata.width ?? ICON_SIZE;
  const logoHeight = metadata.height ?? ICON_SIZE;

  const targetLogoWidth = Math.round(canvasSize * logoScale);
  const resizedLogo = await logo
    .resize({
      width: targetLogoWidth,
      height: targetLogoWidth,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resizedLogo).metadata();
  const placedWidth = resizedMeta.width ?? targetLogoWidth;
  const placedHeight = resizedMeta.height ?? targetLogoWidth;
  const left = Math.round((canvasSize - placedWidth) / 2);
  const top = Math.round((canvasSize - placedHeight) / 2);

  if (logoOnly) {
    const foreground = await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedLogo, left, top }])
      .png()
      .toBuffer();

    await writeFile(outputPath, foreground);
    return;
  }

  const output = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: BRAND_BACKGROUND,
    },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();

  await writeFile(outputPath, output);
}

async function prepareCapacitorAssets() {
  await mkdir(assetsDir, { recursive: true });

  await composeOnCanvas({
    canvasSize: ICON_SIZE,
    logoScale: ICON_LOGO_SCALE,
    outputPath: join(assetsDir, "icon-only.png"),
    background: BRAND_BACKGROUND,
  });

  await composeOnCanvas({
    canvasSize: ICON_SIZE,
    logoScale: ICON_LOGO_SCALE,
    outputPath: join(assetsDir, "icon-foreground.png"),
    background: BRAND_BACKGROUND,
    logoOnly: true,
  });

  await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: BRAND_BACKGROUND,
    },
  })
    .png()
    .toFile(join(assetsDir, "icon-background.png"));

  for (const filename of ["splash.png", "splash-dark.png"]) {
    await composeOnCanvas({
      canvasSize: SPLASH_SIZE,
      logoScale: SPLASH_LOGO_SCALE,
      outputPath: join(assetsDir, filename),
      background: BRAND_BACKGROUND,
    });
  }

  console.log("Prepared Capacitor source assets in assets/");
  console.log(`  icon-only.png          ${ICON_SIZE}x${ICON_SIZE}`);
  console.log(`  icon-foreground.png    ${ICON_SIZE}x${ICON_SIZE}`);
  console.log(`  icon-background.png    ${ICON_SIZE}x${ICON_SIZE}`);
  console.log(`  splash.png             ${SPLASH_SIZE}x${SPLASH_SIZE}`);
  console.log(`  splash-dark.png        ${SPLASH_SIZE}x${SPLASH_SIZE}`);
}

prepareCapacitorAssets().catch((error) => {
  console.error(error);
  process.exit(1);
});

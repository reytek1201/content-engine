import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { slideImageFilename } from "@/utils/download-slide";
import { isNativeAppRuntime } from "@/utils/is-native-app";

const SLIDEPRESS_ALBUM_NAME = "SlidePress";

export interface SaveAllSlidesResult {
  savedCount: number;
  totalCount: number;
  failedCount: number;
}

export interface SlideImageRef {
  image_url: string | null;
  slide_index: number;
}

async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch slide image");
  }

  return response.blob();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Failed to read image data"));
        return;
      }

      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };

    reader.onerror = () => reject(new Error("Failed to read image data"));
    reader.readAsDataURL(blob);
  });
}

async function writeImageToCache(
  imageUrl: string,
  filename: string,
): Promise<string> {
  const rawBlob = await fetchImageBlob(imageUrl);

  let blob: Blob;
  try {
    const { compressImageBlob } = await import("@/utils/compress-image");
    blob = await compressImageBlob(rawBlob);
  } catch {
    blob = rawBlob;
  }

  const base64 = await blobToBase64(blob);
  const safeName = filename.replace(/\.[^.]+$/, "");
  const path = `${safeName}.jpg`;

  const written = await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
  });

  return written.uri;
}

async function writeBlobToCache(blob: Blob, filename: string): Promise<string> {
  const base64 = await blobToBase64(blob);
  const safeName = filename.replace(/\.[^.]+$/, "") || "campaign";
  const path = `${safeName}.zip`;

  const written = await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
  });

  return written.uri;
}

export function canUseNativeSlideExport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isNativeAppRuntime()) {
    return false;
  }

  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

export async function saveSlideImageToPhotos(
  imageUrl: string,
  filename: string,
  albumIdentifier?: string,
): Promise<void> {
  if (!canUseNativeSlideExport()) {
    throw new Error("Save to Photos is only available in the mobile app");
  }

  const localUri = await writeImageToCache(imageUrl, filename);

  await Media.savePhoto({
    path: localUri,
    fileName: filename.replace(/\.[^.]+$/, ""),
    ...(albumIdentifier ? { albumIdentifier } : {}),
  });
}

async function getOrCreateSlidePressAlbumIdentifier(): Promise<string | undefined> {
  try {
    const { albums } = await Media.getAlbums();
    const existing = albums.find((album) => album.name === SLIDEPRESS_ALBUM_NAME);

    if (existing?.identifier) {
      return existing.identifier;
    }

    await Media.createAlbum({ name: SLIDEPRESS_ALBUM_NAME });
    const { albums: refreshed } = await Media.getAlbums();
    return refreshed.find((album) => album.name === SLIDEPRESS_ALBUM_NAME)
      ?.identifier;
  } catch {
    return undefined;
  }
}

export async function saveAllSlidesToPhotos(
  slides: SlideImageRef[],
  onProgress?: (saved: number, total: number) => void,
): Promise<SaveAllSlidesResult> {
  if (!canUseNativeSlideExport()) {
    throw new Error("Save to Photos is only available in the mobile app");
  }

  const slidesWithImages = [...slides]
    .filter((slide) => slide.image_url)
    .sort((left, right) => left.slide_index - right.slide_index);

  const totalCount = slidesWithImages.length;

  if (totalCount === 0) {
    throw new Error("No slide images to save");
  }

  const albumIdentifier = await getOrCreateSlidePressAlbumIdentifier();
  let savedCount = 0;
  let failedCount = 0;

  onProgress?.(0, totalCount);

  // Save up to 3 images concurrently to stay within iOS memory limits
  const CONCURRENCY = 3;

  for (let i = 0; i < slidesWithImages.length; i += CONCURRENCY) {
    const batch = slidesWithImages.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch
        .filter((slide) => slide.image_url)
        .map((slide) =>
          saveSlideImageToPhotos(
            slide.image_url!,
            slideImageFilename(slide.slide_index),
            albumIdentifier,
          ),
        ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        savedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    onProgress?.(savedCount, totalCount);
  }

  if (savedCount === 0) {
    throw new Error("Could not save any slide images to Photos");
  }

  return { savedCount, totalCount, failedCount };
}

export async function shareSlideImage(
  imageUrl: string,
  filename: string,
  title = "SlidePress slide",
): Promise<void> {
  if (!canUseNativeSlideExport()) {
    throw new Error("Share is only available in the mobile app");
  }

  const fileUri = await writeImageToCache(imageUrl, filename);

  await Share.share({
    title,
    dialogTitle: title,
    files: [fileUri],
  });
}

export async function shareCampaignZip(
  zipBlob: Blob,
  filename: string,
): Promise<void> {
  if (!canUseNativeSlideExport()) {
    throw new Error("Share is only available in the mobile app");
  }

  const fileUri = await writeBlobToCache(zipBlob, filename);

  await Share.share({
    title: "SlidePress campaign",
    dialogTitle: "Save campaign zip",
    files: [fileUri],
  });
}

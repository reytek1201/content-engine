import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNativeAppRuntime } from "@/utils/is-native-app";

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  return "png";
}

async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch slide image");
  }

  return response.blob();
}

async function writeImageToCache(
  imageUrl: string,
  filename: string,
): Promise<string> {
  const blob = await fetchImageBlob(imageUrl);
  const mimeType = blob.type || "image/png";
  const base64 = await blobToBase64(blob);
  const safeName = filename.replace(/\.[^.]+$/, "");
  const path = `${safeName}.${extensionForMimeType(mimeType)}`;

  const written = await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
  });

  return written.uri;
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
): Promise<void> {
  if (!canUseNativeSlideExport()) {
    throw new Error("Save to Photos is only available in the mobile app");
  }

  await Media.savePhoto({
    path: imageUrl,
    fileName: filename.replace(/\.[^.]+$/, ""),
  });
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

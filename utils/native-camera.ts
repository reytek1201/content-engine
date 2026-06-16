import { Camera } from "@capacitor/camera";
import { isNativeAppRuntime } from "@/utils/is-native-app";

export type CameraSource = "camera" | "photos";

export interface NativeCameraResult {
  blob: Blob;
  mimeType: string;
  filename: string;
}

function webPathToBlob(webPath: string, mimeType: string): Promise<Blob> {
  return fetch(webPath).then((r) => {
    if (!r.ok) throw new Error("Could not read camera result");
    return r.blob();
  }).then((blob) => new Blob([blob], { type: mimeType }));
}

export async function captureReferencePhoto(
  source: CameraSource,
): Promise<NativeCameraResult | null> {
  if (!isNativeAppRuntime()) {
    return null;
  }

  if (source === "camera") {
    const result = await Camera.takePhoto({
      quality: 90,
      correctOrientation: true,
      editable: "in-app",
    });

    if (!result.webPath) {
      return null;
    }

    const mimeType = "image/jpeg";
    const blob = await webPathToBlob(result.webPath, mimeType);
    return { blob, mimeType, filename: "photo.jpg" };
  }

  const result = await Camera.chooseFromGallery({
    quality: 90,
    correctOrientation: true,
  });

  const first = result.results[0];

  if (!first?.webPath) {
    return null;
  }

  const mimeType = "image/jpeg";
  const blob = await webPathToBlob(first.webPath, mimeType);
  return { blob, mimeType, filename: "photo.jpg" };
}

export async function captureProductPhotoForVision(): Promise<{
  base64: string;
  mimeType: string;
} | null> {
  if (!isNativeAppRuntime()) {
    return null;
  }

  const result = await Camera.takePhoto({
    quality: 85,
    correctOrientation: true,
  });

  if (!result.webPath) {
    return null;
  }

  const blob = await webPathToBlob(result.webPath, "image/jpeg");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      resolve({ base64, mimeType: "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Failed to read photo"));
    reader.readAsDataURL(blob);
  });
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

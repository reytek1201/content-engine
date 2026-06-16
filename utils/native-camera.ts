import {
  Camera,
  CameraResultType,
  CameraSource as CapCameraSource,
} from "@capacitor/camera";
import { isNativeAppRuntime } from "@/utils/is-native-app";

export type CameraSource = "camera" | "photos";

export interface NativeCameraResult {
  blob: Blob;
  mimeType: string;
  filename: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

export async function captureReferencePhoto(
  source: CameraSource,
): Promise<NativeCameraResult | null> {
  if (!isNativeAppRuntime()) {
    return null;
  }

  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Base64,
    source:
      source === "camera"
        ? CapCameraSource.Camera
        : CapCameraSource.Photos,
    allowEditing: source === "camera",
    correctOrientation: true,
  });

  if (!photo.base64String) {
    return null;
  }

  const mimeType = "image/jpeg";
  const blob = base64ToBlob(photo.base64String, mimeType);
  return { blob, mimeType, filename: "photo.jpg" };
}

export async function captureProductPhotoForVision(): Promise<{
  base64: string;
  mimeType: string;
} | null> {
  if (!isNativeAppRuntime()) {
    return null;
  }

  const photo = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.Base64,
    source: CapCameraSource.Camera,
    allowEditing: false,
    correctOrientation: true,
  });

  if (!photo.base64String) {
    return null;
  }

  return { base64: photo.base64String, mimeType: "image/jpeg" };
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

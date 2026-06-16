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

const JPEG_MIME = "image/jpeg";

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function isUserCancelledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("cancel") ||
    normalized.includes("dismiss") ||
    normalized.includes("user denied")
  );
}

async function captureBase64FromSource(
  source: CapCameraSource,
  quality: number,
): Promise<string | null> {
  const photo = await Camera.getPhoto({
    quality,
    resultType: CameraResultType.Base64,
    source,
    allowEditing: false,
    correctOrientation: true,
  });

  return photo.base64String ?? null;
}

async function openPhotoEditor(inputBase64: string): Promise<string | null> {
  try {
    const edited = await Camera.editPhoto({
      inputImage: inputBase64,
    });

    return edited.outputImage || inputBase64;
  } catch (error) {
    if (isUserCancelledError(error)) {
      return null;
    }

    throw error;
  }
}

export async function captureReferencePhoto(
  source: CameraSource,
): Promise<NativeCameraResult | null> {
  if (!isNativeAppRuntime()) {
    return null;
  }

  const capSource =
    source === "camera" ? CapCameraSource.Camera : CapCameraSource.Photos;

  const capturedBase64 = await captureBase64FromSource(capSource, 90);

  if (!capturedBase64) {
    return null;
  }

  const finalBase64 =
    source === "camera"
      ? await openPhotoEditor(capturedBase64)
      : capturedBase64;

  if (!finalBase64) {
    return null;
  }

  const blob = base64ToBlob(finalBase64, JPEG_MIME);
  return { blob, mimeType: JPEG_MIME, filename: "photo.jpg" };
}

export async function captureProductPhotoForVision(): Promise<{
  base64: string;
  mimeType: string;
} | null> {
  if (!isNativeAppRuntime()) {
    return null;
  }

  const base64 = await captureBase64FromSource(CapCameraSource.Camera, 85);

  if (!base64) {
    return null;
  }

  return { base64, mimeType: JPEG_MIME };
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

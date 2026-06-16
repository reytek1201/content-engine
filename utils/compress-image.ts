/**
 * Client-side image compression via Canvas API.
 * Not suitable for server/Node contexts — only import from browser code.
 */

const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 0.85;

/**
 * Compress an image Blob to JPEG at JPEG_QUALITY, capped at MAX_DIMENSION on
 * the longest side. Returns a new JPEG Blob (or the original if the canvas
 * API is unavailable).
 */
export function compressImageBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressed) => {
          if (!compressed) {
            resolve(blob);
            return;
          }

          resolve(compressed);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

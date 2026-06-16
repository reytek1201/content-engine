export async function downloadSlideImage(
  imageUrl: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();
    const { compressImageBlob } = await import("@/utils/compress-image");
    const compressed = await compressImageBlob(blob);
    const jpgFilename = filename.replace(/\.[^.]+$/, ".jpg");
    triggerBlobDownload(compressed, jpgFilename);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slideImageFilename(slideIndex: number): string {
  return `slide-${String(slideIndex + 1).padStart(2, "0")}.jpg`;
}

import { fetchWithRetry } from "@/utils/fetch-with-retry";
import { readJsonResponse } from "@/utils/read-json-response";
import {
  mapPipelineStageToUiStage,
  VIDEO_EXPORT_POLL_TIMEOUT_MS,
  type VideoExportUiStage,
} from "@/utils/video-export-stages";

interface ExportStatusPayload {
  success?: boolean;
  export?: {
    status?: string;
    stage?: string | null;
    outputUrl?: string | null;
    errorMessage?: string | null;
  };
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchExportStatus(
  exportId: string,
): Promise<ExportStatusPayload & { responseOk: boolean }> {
  const response = await fetchWithRetry(`/api/exports/${exportId}`, {
    cache: "no-store",
    attempts: 3,
    retryDelayMs: 500,
  });

  const data = await readJsonResponse<ExportStatusPayload>(response);

  return {
    ...data,
    responseOk: response.ok,
  };
}

function resolveCompletedOutputUrl(
  data: ExportStatusPayload,
  onStageChange: (stage: VideoExportUiStage) => void,
): string | null {
  if (!data.success || !data.export) {
    return null;
  }

  if (data.export.stage) {
    onStageChange(mapPipelineStageToUiStage(data.export.stage));
  }

  if (data.export.status === "completed" && data.export.outputUrl) {
    return data.export.outputUrl;
  }

  if (data.export.status === "failed") {
    throw new Error(data.export.errorMessage ?? "Video export failed");
  }

  return null;
}

/** Poll until a video export completes, tolerating transient network errors. */
export async function pollVideoExport(
  exportId: string,
  onStageChange: (stage: VideoExportUiStage) => void,
): Promise<string> {
  const startedAt = Date.now();
  let consecutiveFetchErrors = 0;

  while (Date.now() - startedAt < VIDEO_EXPORT_POLL_TIMEOUT_MS) {
    await sleep(2000);

    try {
      const data = await fetchExportStatus(exportId);
      consecutiveFetchErrors = 0;

      if (!data.responseOk || !data.success || !data.export) {
        throw new Error(data.error ?? "Failed to check video export status");
      }

      const outputUrl = resolveCompletedOutputUrl(data, onStageChange);
      if (outputUrl) {
        return outputUrl;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Video export failed" ||
          error.message.endsWith("Video export failed"))
      ) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.message !== "Failed to check video export status" &&
        !error.message.includes("Network request failed") &&
        error.name !== "AbortError"
      ) {
        throw error;
      }

      consecutiveFetchErrors += 1;

      if (consecutiveFetchErrors >= 6) {
        const recoveredUrl = await tryRecoverCompletedExport(
          exportId,
          onStageChange,
        );

        if (recoveredUrl) {
          return recoveredUrl;
        }

        throw new Error(
          "Lost connection while checking export status. Your video may still be rendering — check Publish for a download link or wait for the notification.",
        );
      }
    }
  }

  const recoveredUrl = await tryRecoverCompletedExport(exportId, onStageChange);
  if (recoveredUrl) {
    return recoveredUrl;
  }

  throw new Error(
    "Video export is taking longer than expected. Check Publish for a download link or wait for the notification.",
  );
}

/** One-shot status check used after timeouts or background resume. */
export async function tryRecoverCompletedExport(
  exportId: string,
  onStageChange: (stage: VideoExportUiStage) => void,
): Promise<string | null> {
  try {
    const data = await fetchExportStatus(exportId);
    return resolveCompletedOutputUrl(data, onStageChange);
  } catch {
    return null;
  }
}

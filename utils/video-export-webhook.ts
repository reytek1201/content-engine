import { createAdminClient } from "@/utils/supabase/admin";
import {
  extractVideoUrlFromWebhook,
  parseVideoExportMetadata,
  type FalVideoWebhookPayload,
} from "@/utils/fal-video";
import {
  handleImagesToVideoComplete,
  handleMergeAudioComplete,
} from "@/utils/advance-video-export";

export async function handleVideoExportWebhook(
  body: FalVideoWebhookPayload,
  appBaseUrl: string,
): Promise<{ handled: string; status: number }> {
  const supabase = createAdminClient();

  const { data: exportRow, error: exportError } = await supabase
    .from("exports")
    .select("id, status, metadata, output_url")
    .eq("fal_request_id", body.request_id)
    .eq("export_type", "video")
    .maybeSingle();

  if (exportError || !exportRow) {
    return { handled: "export_not_found", status: 404 };
  }

  if (exportRow.status === "completed" && exportRow.output_url) {
    return { handled: "duplicate", status: 200 };
  }

  const metadata = parseVideoExportMetadata(exportRow.metadata);

  if (!metadata) {
    await supabase
      .from("exports")
      .update({
        status: "failed",
        error_message: "Invalid video export metadata",
      })
      .eq("id", exportRow.id);

    return { handled: "invalid_metadata", status: 422 };
  }

  if (body.status === "ERROR") {
    await supabase
      .from("exports")
      .update({
        status: "failed",
        error_message: body.error ?? "Fal video export failed",
      })
      .eq("id", exportRow.id);

    return { handled: "error", status: 200 };
  }

  const videoUrl = extractVideoUrlFromWebhook(body);

  if (!videoUrl) {
    await supabase
      .from("exports")
      .update({
        status: "failed",
        error_message: "Fal webhook did not include a video URL",
      })
      .eq("id", exportRow.id);

    return { handled: "missing_video_url", status: 422 };
  }

  if (metadata.stage === "images_to_video") {
    await handleImagesToVideoComplete(
      exportRow.id,
      metadata,
      videoUrl,
      appBaseUrl,
      true,
    );

    return { handled: "merge_queued", status: 200 };
  }

  if (metadata.stage === "merge_audio") {
    await handleMergeAudioComplete(exportRow.id, metadata, videoUrl, true);

    return { handled: "completed", status: 200 };
  }

  return { handled: "ignored", status: 200 };
}
